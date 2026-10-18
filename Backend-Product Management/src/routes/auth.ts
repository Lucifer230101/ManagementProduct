import { Router } from 'express';
import { z } from 'zod';
import { registerShop, login, requestPasswordReset, resetPassword } from '../services/authService';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { pool } from '../db/pool';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router = Router();

const registerSchema = z.object({
  shopName: z.string().trim().min(2).max(160),
  shopType: z.enum(['grocery', 'clothing', 'pharmacy', 'electronics', 'hardware', 'stationery', 'general']).default('general'),
  currency: z.string().length(3).default('INR'),
  gstin: z.string().trim().max(20).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(72)
});

const handleRegister = async (req: any, res: any, next: any) => {
  try {
    const result = await registerShop(req.body);
    success(res, result, 'Shop registered successfully', 201);
  } catch (e) {
    next(e);
  }
};

router.post('/register', validateBody(registerSchema), handleRegister);
router.post('/register-shop', validateBody(registerSchema), handleRegister);

router.post(
  '/login',
  validateBody(
    z.object({
      email: z.string().email(),
      password: z.string().min(1).max(72),
      shopId: z.string().uuid().optional()
    })
  ),
  async (req, res, next) => {
    try {
      const result = await login(req.body);
      success(res, result, 'Login successful');
    } catch (e) {
      next(e);
    }
  }
);

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await audit(req.auth!.shopId, req.auth!.id, 'auth.logout', 'user', req.auth!.id);
    success(res, { message: 'Logged out successfully' }, 'Logged out successfully');
  } catch (e) {
    next(e);
  }
});

router.post(
  '/password/forgot',
  validateBody(
    z.object({
      email: z.string().email(),
      shopId: z.string().uuid().optional()
    })
  ),
  async (req, res, next) => {
    try {
      const result = await requestPasswordReset(req.body.email, req.body.shopId);
      success(res, result, result.message);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/password/reset',
  validateBody(
    z.object({
      token: z.string().min(10),
      newPassword: z.string().min(8).max(72)
    })
  ),
  async (req, res, next) => {
    try {
      const result = await resetPassword(req.body.token, req.body.newPassword);
      success(res, result, result.message);
    } catch (e) {
      next(e);
    }
  }
);

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.shop_id AS "shopId",
              r.name AS role, r.is_system AS "isSystem",
              s.name AS "shopName", s.shop_type AS "shopType", s.currency, s.gstin
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
       JOIN shops s ON s.id = u.shop_id
       WHERE u.id = $1 AND u.shop_id = $2`,
      [req.auth!.id, req.auth!.shopId]
    );

    if (!result.rowCount) throw new HttpError(404, 'User not found');
    success(res, result.rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;