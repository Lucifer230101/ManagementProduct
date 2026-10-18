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

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(5000).default(''),
  price: z.coerce.number().finite().min(0),
  categoryId: z.string().uuid().nullable().optional(),
  category: z.string().trim().max(100).optional(),
  stock: z.coerce.number().finite().min(0).default(0),
  imageUrl: z.string().url().nullable().optional()
});

function mapProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    categoryId: row.category_id ?? null,
    category: row.category_name ?? row.legacy_category ?? '',
    stock: Number(row.stock),
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const selectSql = `SELECT p.*, c.name AS category_name FROM products p
 LEFT JOIN categories c ON c.id = p.category_id AND c.shop_id = p.shop_id`;

router.get('/', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '10'), 10) || 10));
    const search = String(req.query.search ?? '').trim();

    const count = await pool.query(
      "SELECT COUNT(*)::int AS total FROM products WHERE shop_id = $1 AND ($2 = '' OR name ILIKE $3)",
      [req.auth!.shopId, search, `%${search}%`]
    );

    const rows = await pool.query(
      `${selectSql} WHERE p.shop_id = $1 AND ($2 = '' OR p.name ILIKE $3)
       ORDER BY p.created_at DESC LIMIT $4 OFFSET $5`,
      [req.auth!.shopId, search, `%${search}%`, limit, (page - 1) * limit]
    );

    res.json({
      success: true,
      message: 'Products retrieved',
      data: rows.rows.map(mapProduct),
      total: count.rows[0].total,
      page,
      limit
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const productId = getParam(req, 'id');
    const result = await pool.query(`${selectSql} WHERE p.shop_id = $1 AND p.id = $2`, [req.auth!.shopId, productId]);
    if (!result.rowCount) throw new HttpError(404, 'Product not found');
    success(res, mapProduct(result.rows[0]));
  } catch (e) {
    next(e);
  }
});

router.post('/', requirePermission('inventory.create'), validateBody(productSchema), async (req, res, next) => {
  try {
    const body = req.body;
    let categoryId = body.categoryId ?? null;

    if (!categoryId && body.category) {
      const cat = await pool.query(
        `INSERT INTO categories(shop_id, name) VALUES($1, $2)
         ON CONFLICT(shop_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [req.auth!.shopId, body.category]
      );
      categoryId = cat.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO products(shop_id, name, description, price, category_id, stock, image_url)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.auth!.shopId, body.name, body.description, body.price, categoryId, body.stock, body.imageUrl ?? null]
    );

    await audit(req.auth!.shopId, req.auth!.id, 'product.create', 'product', result.rows[0].id, undefined, result.rows[0]);
    const row = await pool.query(`${selectSql} WHERE p.id = $1 AND p.shop_id = $2`, [result.rows[0].id, req.auth!.shopId]);
    success(res, mapProduct(row.rows[0]), 'Product created', 201);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requirePermission('inventory.edit'), validateBody(productSchema.partial()), async (req, res, next) => {
  try {
    const productId = getParam(req, 'id');
    const old = await pool.query('SELECT * FROM products WHERE id = $1 AND shop_id = $2', [productId, req.auth!.shopId]);
    if (!old.rowCount) throw new HttpError(404, 'Product not found');

    const body = req.body;
    let categoryId = body.categoryId;
    if (categoryId === undefined && body.category) {
      const cat = await pool.query(
        `INSERT INTO categories(shop_id, name) VALUES($1, $2)
         ON CONFLICT(shop_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [req.auth!.shopId, body.category]
      );
      categoryId = cat.rows[0].id;
    }

    const fields: { [key: string]: string } = {
      name: 'name',
      description: 'description',
      price: 'price',
      categoryId: 'category_id',
      stock: 'stock',
      imageUrl: 'image_url'
    };

    const values: any[] = [productId, req.auth!.shopId];
    const sets: string[] = [];

    for (const [key, column] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        values.push(body[key]);
        sets.push(`${column} = $${values.length}`);
      }
    }

    if (body.category !== undefined && body.categoryId === undefined && categoryId !== undefined) {
      const idx = sets.findIndex((s) => s.startsWith('category_id ='));
      if (idx < 0) {
        values.push(categoryId);
        sets.push(`category_id = $${values.length}`);
      }
    }

    if (!sets.length) {
      const r = await pool.query(`${selectSql} WHERE p.id = $1 AND p.shop_id = $2`, [productId, req.auth!.shopId]);
      return success(res, mapProduct(r.rows[0]));
    }

    sets.push('updated_at = NOW()');
    await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = $1 AND shop_id = $2`, values);

    const updated = await pool.query(`${selectSql} WHERE p.id = $1 AND p.shop_id = $2`, [productId, req.auth!.shopId]);
    await audit(req.auth!.shopId, req.auth!.id, 'product.update', 'product', productId, old.rows[0], updated.rows[0]);
    success(res, mapProduct(updated.rows[0]), 'Product updated');
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requirePermission('inventory.delete'), async (req, res, next) => {
  try {
    const productId = getParam(req, 'id');
    const old = await pool.query('DELETE FROM products WHERE id = $1 AND shop_id = $2 RETURNING *', [
      productId,
      req.auth!.shopId
    ]);
    if (!old.rowCount) throw new HttpError(404, 'Product not found');

    await audit(req.auth!.shopId, req.auth!.id, 'product.delete', 'product', productId, old.rows[0], undefined);
    success(res, null, 'Product deleted');
  } catch (e) {
    next(e);
  }
});

export default router;