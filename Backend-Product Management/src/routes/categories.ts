import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission, requireModule } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError, getParam } from '../utils/http';
import { audit } from '../utils/audit';

const router = Router();
router.use(authenticate);
router.use(requireModule('inventory'));

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional()
});

router.get('/', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const r = await pool.query(
      'SELECT id, name, description, created_at AS "createdAt", updated_at AS "updatedAt" FROM categories WHERE shop_id = $1 ORDER BY name',
      [req.auth!.shopId]
    );
    success(res, r.rows);
  } catch (e) {
    next(e);
  }
});

router.post('/', requirePermission('inventory.create'), validateBody(schema), async (req, res, next) => {
  try {
    const r = await pool.query(
      'INSERT INTO categories(shop_id, name, description) VALUES($1, $2, $3) RETURNING id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"',
      [req.auth!.shopId, req.body.name, req.body.description ?? null]
    );
    await audit(req.auth!.shopId, req.auth!.id, 'category.create', 'category', r.rows[0].id, undefined, r.rows[0]);
    success(res, r.rows[0], 'Category created', 201);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requirePermission('inventory.edit'), validateBody(schema.partial()), async (req, res, next) => {
  try {
    const categoryId = getParam(req, 'id');
    const old = await pool.query('SELECT * FROM categories WHERE id = $1 AND shop_id = $2', [categoryId, req.auth!.shopId]);
    if (!old.rowCount) throw new HttpError(404, 'Category not found');

    const name = req.body.name ?? old.rows[0].name;
    const description = req.body.description ?? old.rows[0].description;

    const r = await pool.query(
      'UPDATE categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND shop_id = $4 RETURNING id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"',
      [name, description, categoryId, req.auth!.shopId]
    );
    await audit(req.auth!.shopId, req.auth!.id, 'category.update', 'category', categoryId, old.rows[0], r.rows[0]);
    success(res, r.rows[0], 'Category updated');
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requirePermission('inventory.delete'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categoryId = getParam(req, 'id');

    const r = await client.query('DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING *', [categoryId, req.auth!.shopId]);
    if (!r.rowCount) throw new HttpError(404, 'Category not found');

    await client.query('UPDATE products SET category_id = NULL, updated_at = NOW() WHERE category_id = $1 AND shop_id = $2', [
      categoryId,
      req.auth!.shopId
    ]);

    await audit(req.auth!.shopId, req.auth!.id, 'category.delete', 'category', categoryId, r.rows[0], undefined, client);
    await client.query('COMMIT');
    success(res, null, 'Category deleted');
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

export default router;