import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router=Router();router.use(authenticate);
router.get('/',requirePermission('shop.view'),async(req,res,next)=>{
  try { const r=await pool.query('SELECT module_name AS "moduleName",is_enabled AS "isEnabled" FROM shop_modules WHERE shop_id=$1 ORDER BY module_name',[req.auth!.shopId]);success(res,r.rows); }catch(e){next(e);}
});
router.patch('/:moduleName',requirePermission('shop.manage'),validateBody(z.object({isEnabled:z.boolean()})),async(req,res,next)=>{
  try {
    const allowed=['employee','inventory','billing'];
    if(!allowed.includes(req.params.moduleName))throw new HttpError(400,'Unknown module');
    const old=await pool.query('SELECT * FROM shop_modules WHERE shop_id=$1 AND module_name=$2',[req.auth!.shopId,req.params.moduleName]);
    const r=await pool.query(`INSERT INTO shop_modules(shop_id,module_name,is_enabled) VALUES($1,$2,$3)
      ON CONFLICT(shop_id,module_name) DO UPDATE SET is_enabled=EXCLUDED.is_enabled RETURNING module_name AS "moduleName",is_enabled AS "isEnabled"`,
      [req.auth!.shopId,req.params.moduleName,req.body.isEnabled]);
    await audit(req.auth!.shopId,req.auth!.id,'module.toggle','shop_module',req.params.moduleName,old.rows[0],r.rows[0]);success(res,r.rows[0],'Module updated');
  }catch(e){next(e);}
});
export default router;