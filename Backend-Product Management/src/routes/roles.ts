import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError, getParam } from '../utils/http';
import { audit } from '../utils/audit';

const router = Router();
router.use(authenticate);

// GET /roles/permissions
router.get('/permissions', requirePermission('roles.view'), async (_req, res, next) => {
  try {
    const r = await pool.query('SELECT id, code, module, description FROM permissions ORDER BY module, code');
    success(res, r.rows);
  } catch (e) {
    next(e);
  }
});

// GET /roles
router.get('/', requirePermission('roles.view'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT r.id, r.name, r.description, r.is_system AS "isSystem", r.created_at AS "createdAt",
              COALESCE(json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.shop_id = $1
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.name`,
      [req.auth!.shopId]
    );
    success(res, r.rows);
  } catch (e) {
    next(e);
  }
});

// GET /roles/:id
router.get('/:id', requirePermission('roles.view'), async (req, res, next) => {
  try {
    const roleId = getParam(req, 'id');
    const r = await pool.query(
      `SELECT r.id, r.name, r.description, r.is_system AS "isSystem", r.created_at AS "createdAt",
              COALESCE(json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.id = $1 AND r.shop_id = $2
       GROUP BY r.id`,
      [roleId, req.auth!.shopId]
    );

    if (!r.rowCount) throw new HttpError(404, 'Role not found');
    success(res, r.rows[0]);
  } catch (e) {
    next(e);
  }
});

// POST /roles
const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).max(100).default([])
});

router.post('/', requirePermission('roles.manage'), validateBody(createRoleSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Prevent duplicate role name in this shop
    const existing = await client.query('SELECT id FROM roles WHERE shop_id = $1 AND lower(name) = lower($2)', [
      req.auth!.shopId,
      req.body.name
    ]);
    if (existing.rowCount) throw new HttpError(409, 'A role with this name already exists in this shop');

    const role = await client.query(
      `INSERT INTO roles(shop_id, name, description, is_system)
       VALUES($1, $2, $3, FALSE)
       RETURNING id, name, description, is_system AS "isSystem", created_at AS "createdAt"`,
      [req.auth!.shopId, req.body.name, req.body.description ?? null]
    );

    if (req.body.permissions.length > 0) {
      const permissionRows = await client.query(
        'SELECT id, code FROM permissions WHERE code = ANY($1::text[])',
        [req.body.permissions]
      );
      if (permissionRows.rowCount !== req.body.permissions.length) {
        throw new HttpError(400, 'One or more permission codes are invalid');
      }

      for (const p of permissionRows.rows) {
        await client.query(
          'INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2)',
          [role.rows[0].id, p.id]
        );
      }
    }

    await audit(
      req.auth!.shopId,
      req.auth!.id,
      'role.create',
      'role',
      role.rows[0].id,
      undefined,
      { ...role.rows[0], permissions: req.body.permissions },
      client
    );

    await client.query('COMMIT');
    success(res, { ...role.rows[0], permissions: req.body.permissions }, 'Role created', 201);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// PATCH /roles/:id
const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional()
});

router.patch('/:id', requirePermission('roles.manage'), validateBody(updateRoleSchema), async (req, res, next) => {
  try {
    const roleId = getParam(req, 'id');
    const role = await pool.query('SELECT * FROM roles WHERE id = $1 AND shop_id = $2', [roleId, req.auth!.shopId]);
    if (!role.rowCount) throw new HttpError(404, 'Role not found');

    if (role.rows[0].is_system && req.body.name && req.body.name !== role.rows[0].name) {
      throw new HttpError(400, 'Cannot rename system role');
    }

    const body = req.body;
    const values: any[] = [roleId, req.auth!.shopId];
    const sets: string[] = [];

    if (body.name !== undefined) {
      values.push(body.name);
      sets.push(`name = $${values.length}`);
    }
    if (body.description !== undefined) {
      values.push(body.description);
      sets.push(`description = $${values.length}`);
    }

    if (!sets.length) return success(res, role.rows[0], 'No changes requested');

    const updated = await pool.query(
      `UPDATE roles SET ${sets.join(', ')} WHERE id = $1 AND shop_id = $2
       RETURNING id, name, description, is_system AS "isSystem"`,
      values
    );

    await audit(req.auth!.shopId, req.auth!.id, 'role.update', 'role', roleId, role.rows[0], updated.rows[0]);
    success(res, updated.rows[0], 'Role updated');
  } catch (e) {
    next(e);
  }
});

// PUT /roles/:id/permissions
router.put(
  '/:id/permissions',
  requirePermission('roles.manage'),
  validateBody(z.object({ permissions: z.array(z.string()).max(100) })),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const roleId = getParam(req, 'id');

      const role = await client.query('SELECT * FROM roles WHERE id = $1 AND shop_id = $2', [roleId, req.auth!.shopId]);
      if (!role.rowCount) throw new HttpError(404, 'Role not found');

      if (role.rows[0].name === 'Owner') {
        throw new HttpError(400, 'Owner role permissions are fixed and cannot be modified');
      }

      const permissionRows = await client.query(
        'SELECT id, code FROM permissions WHERE code = ANY($1::text[])',
        [req.body.permissions]
      );
      if (req.body.permissions.length > 0 && permissionRows.rowCount !== req.body.permissions.length) {
        throw new HttpError(400, 'One or more permission codes are invalid');
      }

      const oldPerms = await client.query(
        `SELECT p.code FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [roleId]
      );

      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      for (const p of permissionRows.rows) {
        await client.query('INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2)', [roleId, p.id]);
      }

      await audit(
        req.auth!.shopId,
        req.auth!.id,
        'role.permissions_update',
        'role',
        roleId,
        { permissions: oldPerms.rows.map((x) => x.code) },
        { permissions: req.body.permissions },
        client
      );

      await client.query('COMMIT');
      success(
        res,
        { id: role.rows[0].id, name: role.rows[0].name, permissions: req.body.permissions },
        'Role permissions updated'
      );
    } catch (e) {
      await client.query('ROLLBACK');
      next(e);
    } finally {
      client.release();
    }
  }
);

// DELETE /roles/:id
router.delete('/:id', requirePermission('roles.manage'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleId = getParam(req, 'id');

    const role = await client.query('SELECT * FROM roles WHERE id = $1 AND shop_id = $2', [roleId, req.auth!.shopId]);
    if (!role.rowCount) throw new HttpError(404, 'Role not found');

    if (role.rows[0].is_system) {
      throw new HttpError(400, 'Cannot delete system roles');
    }

    // Check if any user is currently assigned this role
    const assigned = await client.query('SELECT id FROM users WHERE role_id = $1 AND shop_id = $2 LIMIT 1', [
      roleId,
      req.auth!.shopId
    ]);
    if (assigned.rowCount) {
      throw new HttpError(400, 'Cannot delete role because users are currently assigned to it. Reassign users first.');
    }

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    await client.query('DELETE FROM roles WHERE id = $1 AND shop_id = $2', [roleId, req.auth!.shopId]);

    await audit(req.auth!.shopId, req.auth!.id, 'role.delete', 'role', roleId, role.rows[0], undefined, client);

    await client.query('COMMIT');
    success(res, null, 'Role deleted successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

export default router;