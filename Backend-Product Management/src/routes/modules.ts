import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError, getParam } from '../utils/http';
import { audit } from '../utils/audit';

const router = Router();
router.use(authenticate);

const ALLOWED_MODULES = ['employee', 'inventory', 'billing'] as const;

// GET /modules
router.get('/', requirePermission('shop.view'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT module_name AS "moduleName", is_enabled AS "isEnabled"
       FROM shop_modules WHERE shop_id = $1 ORDER BY module_name`,
      [req.auth!.shopId]
    );
    success(res, r.rows);
  } catch (e) {
    next(e);
  }
});

// GET /modules/enabled
router.get('/enabled', requirePermission('shop.view'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT module_name AS "moduleName", is_enabled AS "isEnabled"
       FROM shop_modules WHERE shop_id = $1 AND is_enabled = TRUE ORDER BY module_name`,
      [req.auth!.shopId]
    );
    success(res, r.rows);
  } catch (e) {
    next(e);
  }
});

const toggleSchema = z.object({ isEnabled: z.boolean() });

const handleToggle = async (req: any, res: any, next: any) => {
  try {
    const rawModuleName = getParam(req, 'moduleName');
    if (!ALLOWED_MODULES.includes(rawModuleName as any)) {
      throw new HttpError(400, `Unknown module. Allowed modules: ${ALLOWED_MODULES.join(', ')}`);
    }

    const old = await pool.query(
      'SELECT module_name AS "moduleName", is_enabled AS "isEnabled" FROM shop_modules WHERE shop_id = $1 AND module_name = $2',
      [req.auth!.shopId, rawModuleName]
    );

    const r = await pool.query(
      `INSERT INTO shop_modules(shop_id, module_name, is_enabled) VALUES($1, $2, $3)
       ON CONFLICT(shop_id, module_name) DO UPDATE SET is_enabled = EXCLUDED.is_enabled
       RETURNING module_name AS "moduleName", is_enabled AS "isEnabled"`,
      [req.auth!.shopId, rawModuleName, req.body.isEnabled]
    );

    await audit(req.auth!.shopId, req.auth!.id, 'module.toggle', 'shop_module', rawModuleName, old.rows[0], r.rows[0]);
    success(res, r.rows[0], `Module ${rawModuleName} ${req.body.isEnabled ? 'enabled' : 'disabled'} successfully`);
  } catch (e) {
    next(e);
  }
};

router.put('/:moduleName', requirePermission('modules.manage', 'shop.settings.manage', 'shop.manage'), validateBody(toggleSchema), handleToggle);
router.patch('/:moduleName', requirePermission('modules.manage', 'shop.settings.manage', 'shop.manage'), validateBody(toggleSchema), handleToggle);

export default router;