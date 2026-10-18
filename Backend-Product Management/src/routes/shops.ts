import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router = Router();
router.use(authenticate);

const updateShopSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  shopType: z.enum(['grocery', 'clothing', 'pharmacy', 'electronics', 'hardware', 'stationery', 'general']).optional(),
  gstin: z.string().trim().max(20).nullable().optional(),
  currency: z.string().length(3).optional()
});

router.get('/current', requirePermission('shop.view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, shop_type AS "shopType", gstin, currency, created_at AS "createdAt"
       FROM shops WHERE id = $1`,
      [req.auth!.shopId]
    );

    if (!result.rowCount) throw new HttpError(404, 'Shop not found');
    success(res, result.rows[0]);
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/current',
  requirePermission('shop.settings.manage', 'shop.manage'),
  validateBody(updateShopSchema),
  async (req, res, next) => {
    try {
      const current = await pool.query('SELECT * FROM shops WHERE id = $1', [req.auth!.shopId]);
      if (!current.rowCount) throw new HttpError(404, 'Shop not found');

      const body = req.body;
      const fields: Record<string, string> = {
        name: 'name',
        shopType: 'shop_type',
        gstin: 'gstin',
        currency: 'currency'
      };

      const sets: string[] = [];
      const values: any[] = [req.auth!.shopId];

      for (const [key, column] of Object.entries(fields)) {
        if (body[key] !== undefined) {
          values.push(body[key]);
          sets.push(`${column} = $${values.length}`);
        }
      }

      if (sets.length === 0) {
        return success(res, current.rows[0], 'No changes requested');
      }

      const updated = await pool.query(
        `UPDATE shops SET ${sets.join(', ')} WHERE id = $1
         RETURNING id, name, shop_type AS "shopType", gstin, currency, created_at AS "createdAt"`,
        values
      );

      await audit(req.auth!.shopId, req.auth!.id, 'shop.update', 'shop', req.auth!.shopId, current.rows[0], updated.rows[0]);
      success(res, updated.rows[0], 'Shop details updated successfully');
    } catch (e) {
      next(e);
    }
  }
);

export default router;

