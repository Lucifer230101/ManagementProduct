import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { success, HttpError, getParam } from '../utils/http';

const router = Router();
router.use(authenticate);

// GET /audit-logs
router.get('/', requirePermission('audit.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '25'), 10) || 25));
    const action = String(req.query.action ?? '').trim();
    const entity = String(req.query.entity ?? '').trim();

    const [count, rows] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM audit_logs
         WHERE shop_id = $1
           AND ($2 = '' OR action ILIKE $3)
           AND ($4 = '' OR entity ILIKE $5)`,
        [req.auth!.shopId, action, `%${action}%`, entity, `%${entity}%`]
      ),
      pool.query(
        `SELECT a.id, a.action, a.entity, a.entity_id AS "entityId",
                a.old_value AS "oldValue", a.new_value AS "newValue",
                a.created_at AS "createdAt", u.name AS "userName", u.email AS "userEmail"
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id AND u.shop_id = a.shop_id
         WHERE a.shop_id = $1
           AND ($2 = '' OR a.action ILIKE $3)
           AND ($4 = '' OR a.entity ILIKE $5)
         ORDER BY a.created_at DESC
         LIMIT $6 OFFSET $7`,
        [req.auth!.shopId, action, `%${action}%`, entity, `%${entity}%`, limit, (page - 1) * limit]
      )
    ]);

    res.json({
      success: true,
      message: 'Audit logs retrieved',
      data: rows.rows,
      total: count.rows[0].total,
      page,
      limit
    });
  } catch (e) {
    next(e);
  }
});

// GET /audit-logs/:id
router.get('/:id', requirePermission('audit.view'), async (req, res, next) => {
  try {
    const auditId = getParam(req, 'id');
    const result = await pool.query(
      `SELECT a.id, a.shop_id AS "shopId", a.user_id AS "userId",
              a.action, a.entity, a.entity_id AS "entityId",
              a.old_value AS "oldValue", a.new_value AS "newValue",
              a.created_at AS "createdAt", u.name AS "userName", u.email AS "userEmail"
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id AND u.shop_id = a.shop_id
       WHERE a.id = $1 AND a.shop_id = $2`,
      [auditId, req.auth!.shopId]
    );

    if (!result.rowCount) throw new HttpError(404, 'Audit log entry not found');
    success(res, result.rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;