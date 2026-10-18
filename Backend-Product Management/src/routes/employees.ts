import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { authenticate, requirePermission, requireModule } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError, getParam } from '../utils/http';
import { audit } from '../utils/audit';
import { assertNotLastActiveOwner } from '../services/authService';
import { env } from '../config/env';

const router = Router();
router.use(authenticate);
router.use(requireModule('employee'));

function maskSalary(row: any, callerId: string, isOwnerOrManager: boolean) {
  if (isOwnerOrManager || row.id === callerId) {
    return { ...row, salary: row.salary !== null && row.salary !== undefined ? Number(row.salary) : null };
  }
  const { salary: _salary, ...rest } = row;
  return { ...rest, salary: null };
}

// GET /employees
router.get('/', requirePermission('employee.view'), async (req, res, next) => {
  try {
    const isOwnerOrManager = req.auth!.isOwner || req.auth!.roleName === 'Manager';
    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active AS "isActive", u.created_at AS "createdAt",
              ep.designation, ep.joining_date AS "joiningDate", ep.salary, ep.address,
              ep.emergency_contact AS "emergencyContact", ro.name AS role, ro.id AS "roleId"
       FROM users u
       JOIN roles ro ON ro.id = u.role_id AND ro.shop_id = u.shop_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.shop_id = u.shop_id
       WHERE u.shop_id = $1
       ORDER BY u.created_at DESC`,
      [req.auth!.shopId]
    );

    const data = r.rows.map((row) => maskSalary(row, req.auth!.id, isOwnerOrManager));
    success(res, data);
  } catch (e) {
    next(e);
  }
});

// GET /employees/:userId
router.get('/:userId', requirePermission('employee.view'), async (req, res, next) => {
  try {
    const userId = getParam(req, 'userId');
    const isOwnerOrManager = req.auth!.isOwner || req.auth!.roleName === 'Manager';

    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active AS "isActive", u.created_at AS "createdAt",
              ep.designation, ep.joining_date AS "joiningDate", ep.salary, ep.address,
              ep.emergency_contact AS "emergencyContact", ro.name AS role, ro.id AS "roleId"
       FROM users u
       JOIN roles ro ON ro.id = u.role_id AND ro.shop_id = u.shop_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.shop_id = u.shop_id
       WHERE u.id = $1 AND u.shop_id = $2`,
      [userId, req.auth!.shopId]
    );

    if (!r.rowCount) throw new HttpError(404, 'Employee not found');
    success(res, maskSalary(r.rows[0], req.auth!.id, isOwnerOrManager));
  } catch (e) {
    next(e);
  }
});

// POST /employees
const createEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  password: z.string().min(8).max(72),
  roleId: z.string().uuid(),
  designation: z.string().max(100).optional(),
  joiningDate: z.string().date().optional(),
  salary: z.coerce.number().min(0).optional(),
  address: z.string().max(2000).optional(),
  emergencyContact: z.string().max(50).optional()
});

router.post('/', requirePermission('employee.manage'), validateBody(createEmployeeSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const role = await client.query('SELECT id, name FROM roles WHERE id = $1 AND shop_id = $2', [
      req.body.roleId,
      req.auth!.shopId
    ]);
    if (!role.rowCount) throw new HttpError(400, 'Role does not belong to this shop');
    if (role.rows[0].name === 'Owner' && !req.auth!.isOwner) {
      throw new HttpError(403, 'Only Owners can create users with the Owner role');
    }

    const { name, email, phone, password, roleId, ...profile } = req.body;
    const existing = await client.query('SELECT id FROM users WHERE shop_id = $1 AND lower(email) = lower($2)', [
      req.auth!.shopId,
      email
    ]);
    if (existing.rowCount) throw new HttpError(409, 'User with this email already exists in this shop');

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const u = await client.query(
      `INSERT INTO users(shop_id, name, email, phone, password_hash, role_id)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, is_active AS "isActive", created_at AS "createdAt"`,
      [req.auth!.shopId, name, email.toLowerCase(), phone ?? null, hashedPassword, roleId]
    );
    const userId = u.rows[0].id;

    await client.query(
      `INSERT INTO employee_profiles(user_id, shop_id, designation, joining_date, salary, address, emergency_contact)
       VALUES($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        req.auth!.shopId,
        profile.designation ?? null,
        profile.joiningDate ?? null,
        profile.salary ?? null,
        profile.address ?? null,
        profile.emergencyContact ?? null
      ]
    );

    await audit(
      req.auth!.shopId,
      req.auth!.id,
      'employee.create',
      'user',
      userId,
      undefined,
      { id: userId, name, email, designation: profile.designation },
      client
    );

    await client.query('COMMIT');
    success(res, { ...u.rows[0], role: role.rows[0].name, ...profile }, 'Employee created', 201);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// PUT /employees/:userId & PATCH /employees/:userId
const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().uuid().optional(),
  designation: z.string().max(100).nullable().optional(),
  joiningDate: z.string().date().nullable().optional(),
  salary: z.coerce.number().min(0).nullable().optional(),
  address: z.string().max(2000).nullable().optional(),
  emergencyContact: z.string().max(50).nullable().optional()
});

const handleUpdateEmployee = async (req: any, res: any, next: any) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = getParam(req, 'userId');

    const old = await client.query('SELECT * FROM users WHERE id = $1 AND shop_id = $2', [userId, req.auth!.shopId]);
    if (!old.rowCount) throw new HttpError(404, 'Employee not found');

    if (req.body.isActive === false) {
      if (userId === req.auth!.id) throw new HttpError(400, 'You cannot deactivate your own account');
      await assertNotLastActiveOwner(req.auth!.shopId, userId);
    }

    if (req.body.roleId) {
      const role = await client.query('SELECT id, name FROM roles WHERE id = $1 AND shop_id = $2', [
        req.body.roleId,
        req.auth!.shopId
      ]);
      if (!role.rowCount) throw new HttpError(400, 'Role does not belong to this shop');
      if (role.rows[0].name === 'Owner' && !req.auth!.isOwner) {
        throw new HttpError(403, 'Only Owners can assign the Owner role');
      }
      if (role.rows[0].name !== 'Owner') {
        await assertNotLastActiveOwner(req.auth!.shopId, userId);
      }
    }

    // Update user record if user fields are present
    const userUpdates: string[] = [];
    const userVals: any[] = [userId, req.auth!.shopId];
    if (req.body.name !== undefined) {
      userVals.push(req.body.name);
      userUpdates.push(`name = $${userVals.length}`);
    }
    if (req.body.phone !== undefined) {
      userVals.push(req.body.phone);
      userUpdates.push(`phone = $${userVals.length}`);
    }
    if (req.body.isActive !== undefined) {
      userVals.push(req.body.isActive);
      userUpdates.push(`is_active = $${userVals.length}`);
    }
    if (req.body.roleId !== undefined) {
      userVals.push(req.body.roleId);
      userUpdates.push(`role_id = $${userVals.length}`);
    }

    if (userUpdates.length > 0) {
      await client.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $1 AND shop_id = $2`,
        userVals
      );
    }

    // Update profile
    const profileFields: Record<string, string> = {
      designation: 'designation',
      joiningDate: 'joining_date',
      salary: 'salary',
      address: 'address',
      emergencyContact: 'emergency_contact'
    };
    const profVals: any[] = [userId, req.auth!.shopId];
    const profSets: string[] = [];

    for (const [key, col] of Object.entries(profileFields)) {
      if (req.body[key] !== undefined) {
        profVals.push(req.body[key]);
        profSets.push(`${col} = $${profVals.length}`);
      }
    }

    if (profSets.length > 0) {
      profSets.push('updated_at = NOW()');
      await client.query(
        `INSERT INTO employee_profiles(user_id, shop_id) VALUES($1, $2) ON CONFLICT(user_id) DO NOTHING`,
        [userId, req.auth!.shopId]
      );
      await client.query(
        `UPDATE employee_profiles SET ${profSets.join(', ')} WHERE user_id = $1 AND shop_id = $2`,
        profVals
      );
    }

    const fresh = await client.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active AS "isActive",
              ep.designation, ep.joining_date AS "joiningDate", ep.salary, ep.address,
              ep.emergency_contact AS "emergencyContact", ro.name AS role, ro.id AS "roleId"
       FROM users u
       JOIN roles ro ON ro.id = u.role_id AND ro.shop_id = u.shop_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.shop_id = u.shop_id
       WHERE u.id = $1 AND u.shop_id = $2`,
      [userId, req.auth!.shopId]
    );

    await audit(req.auth!.shopId, req.auth!.id, 'employee.update', 'user', userId, old.rows[0], fresh.rows[0], client);

    await client.query('COMMIT');
    const isOwnerOrManager = req.auth!.isOwner || req.auth!.roleName === 'Manager';
    success(res, maskSalary(fresh.rows[0], req.auth!.id, isOwnerOrManager), 'Employee updated');
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

router.put('/:userId', requirePermission('employee.manage'), validateBody(updateEmployeeSchema), handleUpdateEmployee);
router.patch('/:userId', requirePermission('employee.manage'), validateBody(updateEmployeeSchema), handleUpdateEmployee);

export default router;