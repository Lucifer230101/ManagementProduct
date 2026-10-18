import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError, getParam } from '../utils/http';
import { audit } from '../utils/audit';
import { assertNotLastActiveOwner } from '../services/authService';
import { env } from '../config/env';

const router = Router();
router.use(authenticate);

// GET /users
router.get('/', requirePermission('users.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const search = String(req.query.search ?? '').trim();
    const isActiveFilter = req.query.isActive !== undefined ? req.query.isActive === 'true' : null;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       WHERE u.shop_id = $1
         AND ($2 = '' OR u.name ILIKE $3 OR u.email ILIKE $3)
         AND ($4::boolean IS NULL OR u.is_active = $4)`,
      [req.auth!.shopId, search, `%${search}%`, isActiveFilter]
    );

    const rowsRes = await pool.query(
      `SELECT u.id, u.shop_id AS "shopId", u.name, u.email, u.phone,
              u.role_id AS "roleId", r.name AS role, r.is_system AS "isSystemRole",
              u.is_active AS "isActive", u.last_login AS "lastLogin", u.created_at AS "createdAt"
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
       WHERE u.shop_id = $1
         AND ($2 = '' OR u.name ILIKE $3 OR u.email ILIKE $3)
         AND ($4::boolean IS NULL OR u.is_active = $4)
       ORDER BY u.created_at DESC
       LIMIT $5 OFFSET $6`,
      [req.auth!.shopId, search, `%${search}%`, isActiveFilter, limit, (page - 1) * limit]
    );

    res.json({
      success: true,
      message: 'Users retrieved',
      data: rowsRes.rows,
      total: countRes.rows[0].total,
      page,
      limit
    });
  } catch (e) {
    next(e);
  }
});

// GET /users/:id
router.get('/:id', requirePermission('users.view'), async (req, res, next) => {
  try {
    const userId = getParam(req, 'id');
    const result = await pool.query(
      `SELECT u.id, u.shop_id AS "shopId", u.name, u.email, u.phone,
              u.role_id AS "roleId", r.name AS role, r.is_system AS "isSystemRole",
              u.is_active AS "isActive", u.last_login AS "lastLogin", u.created_at AS "createdAt"
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
       WHERE u.id = $1 AND u.shop_id = $2`,
      [userId, req.auth!.shopId]
    );

    if (!result.rowCount) throw new HttpError(404, 'User not found');
    success(res, result.rows[0]);
  } catch (e) {
    next(e);
  }
});

// POST /users
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(72),
  roleId: z.string().uuid()
});

router.post('/', requirePermission('users.manage'), validateBody(createUserSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, email, phone, password, roleId } = req.body;

    // Verify role belongs to this shop
    const roleRes = await client.query(
      'SELECT id, name FROM roles WHERE id = $1 AND shop_id = $2',
      [roleId, req.auth!.shopId]
    );
    if (!roleRes.rowCount) throw new HttpError(400, 'Selected role does not belong to this shop');

    // Only owners can assign the Owner role
    if (roleRes.rows[0].name === 'Owner' && !req.auth!.isOwner) {
      throw new HttpError(403, 'Only shop Owners can assign the Owner role');
    }

    // Verify email is not already taken in this shop
    const existing = await client.query(
      'SELECT id FROM users WHERE shop_id = $1 AND lower(email) = lower($2)',
      [req.auth!.shopId, email]
    );
    if (existing.rowCount) throw new HttpError(409, 'A user with this email already exists in this shop');

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const userRes = await client.query(
      `INSERT INTO users(shop_id, name, email, phone, password_hash, role_id)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, shop_id AS "shopId", name, email, phone, role_id AS "roleId", is_active AS "isActive", created_at AS "createdAt"`,
      [req.auth!.shopId, name, email.toLowerCase(), phone ?? null, hashedPassword, roleId]
    );
    const newUser = userRes.rows[0];

    // Initialize employee profile placeholder
    await client.query(
      `INSERT INTO employee_profiles(user_id, shop_id, designation, joining_date)
       VALUES($1, $2, $3, CURRENT_DATE)
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id, req.auth!.shopId, roleRes.rows[0].name]
    );

    await audit(
      req.auth!.shopId,
      req.auth!.id,
      'user.create',
      'user',
      newUser.id,
      undefined,
      { id: newUser.id, name: newUser.name, email: newUser.email, role: roleRes.rows[0].name },
      client
    );

    await client.query('COMMIT');
    success(res, { ...newUser, role: roleRes.rows[0].name }, 'User created successfully', 201);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// PATCH /users/:id
const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().email().max(254).optional()
});

router.patch('/:id', requirePermission('users.manage'), validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const userId = getParam(req, 'id');
    const old = await pool.query('SELECT * FROM users WHERE id = $1 AND shop_id = $2', [userId, req.auth!.shopId]);
    if (!old.rowCount) throw new HttpError(404, 'User not found');

    const body = req.body;
    const fields: Record<string, string> = { name: 'name', phone: 'phone', email: 'email' };
    const values: any[] = [userId, req.auth!.shopId];
    const sets: string[] = [];

    for (const [key, col] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        values.push(key === 'email' ? body[key].toLowerCase() : body[key]);
        sets.push(`${col} = $${values.length}`);
      }
    }

    if (!sets.length) return success(res, old.rows[0], 'No changes requested');

    const updated = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $1 AND shop_id = $2
       RETURNING id, shop_id AS "shopId", name, email, phone, role_id AS "roleId", is_active AS "isActive"`,
      values
    );

    await audit(req.auth!.shopId, req.auth!.id, 'user.update', 'user', userId, old.rows[0], updated.rows[0]);
    success(res, updated.rows[0], 'User updated successfully');
  } catch (e) {
    next(e);
  }
});

// PATCH /users/:id/status
router.patch(
  '/:id/status',
  requirePermission('users.manage'),
  validateBody(z.object({ isActive: z.boolean() })),
  async (req, res, next) => {
    try {
      const userId = getParam(req, 'id');
      const { isActive } = req.body;

      if (!isActive) {
        if (userId === req.auth!.id) {
          throw new HttpError(400, 'You cannot deactivate your own account.');
        }
        await assertNotLastActiveOwner(req.auth!.shopId, userId);
      }

      const old = await pool.query('SELECT * FROM users WHERE id = $1 AND shop_id = $2', [userId, req.auth!.shopId]);
      if (!old.rowCount) throw new HttpError(404, 'User not found');

      const updated = await pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2 AND shop_id = $3
         RETURNING id, shop_id AS "shopId", name, email, is_active AS "isActive"`,
        [isActive, userId, req.auth!.shopId]
      );

      await audit(req.auth!.shopId, req.auth!.id, 'user.status_change', 'user', userId, old.rows[0], updated.rows[0]);
      success(res, updated.rows[0], `User account ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (e) {
      next(e);
    }
  }
);

// PATCH /users/:id/role
router.patch(
  '/:id/role',
  requirePermission('users.manage'),
  validateBody(z.object({ roleId: z.string().uuid() })),
  async (req, res, next) => {
    try {
      const userId = getParam(req, 'id');
      const { roleId } = req.body;

      const targetRole = await pool.query('SELECT id, name FROM roles WHERE id = $1 AND shop_id = $2', [
        roleId,
        req.auth!.shopId
      ]);
      if (!targetRole.rowCount) throw new HttpError(400, 'Selected role does not belong to this shop');

      if (targetRole.rows[0].name === 'Owner' && !req.auth!.isOwner) {
        throw new HttpError(403, 'Only shop Owners can assign the Owner role');
      }

      // Check if current user is an owner being demoted
      if (targetRole.rows[0].name !== 'Owner') {
        await assertNotLastActiveOwner(req.auth!.shopId, userId);
      }

      const old = await pool.query('SELECT * FROM users WHERE id = $1 AND shop_id = $2', [userId, req.auth!.shopId]);
      if (!old.rowCount) throw new HttpError(404, 'User not found');

      const updated = await pool.query(
        `UPDATE users SET role_id = $1 WHERE id = $2 AND shop_id = $3
         RETURNING id, shop_id AS "shopId", name, email, role_id AS "roleId", is_active AS "isActive"`,
        [roleId, userId, req.auth!.shopId]
      );

      await audit(req.auth!.shopId, req.auth!.id, 'user.role_change', 'user', userId, old.rows[0], {
        ...updated.rows[0],
        newRole: targetRole.rows[0].name
      });
      success(res, { ...updated.rows[0], role: targetRole.rows[0].name }, 'User role updated successfully');
    } catch (e) {
      next(e);
    }
  }
);

export default router;

