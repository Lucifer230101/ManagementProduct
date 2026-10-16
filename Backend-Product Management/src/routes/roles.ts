import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router=Router(); router.use(authenticate);
router.get('/permissions',requirePermission('roles.view'),async(req,res,next)=>{
  try { const r=await pool.query('SELECT id,code,module,description FROM permissions ORDER BY module,code'); success(res,r.rows); }catch(e){next(e);}
});
router.get('/',requirePermission('roles.view'),async(req,res,next)=>{
  try { const r=await pool.query(`SELECT r.id,r.name,r.description,r.is_system AS "isSystem",
    COALESCE(json_agg(p.code) FILTER(WHERE p.code IS NOT NULL),'[]') AS permissions
    FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
    WHERE r.shop_id=$1 GROUP BY r.id ORDER BY r.name`,[req.auth!.shopId]); success(res,r.rows); }catch(e){next(e);}
});
router.post('/',requirePermission('roles.manage'),validateBody(z.object({
  name:z.string().trim().min(2).max(80),description:z.string().max(500).optional(),
  permissions:z.array(z.string()).max(100).default([])
})),async(req,res,next)=>{
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const role=await client.query('INSERT INTO roles(shop_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,is_system',[req.auth!.shopId,req.body.name,req.body.description ?? null]);
    const permissionRows=await client.query('SELECT id,code FROM permissions WHERE code=ANY($1::text[])',[req.body.permissions]);
    if(permissionRows.rowCount!==req.body.permissions.length)throw new HttpError(400,'One or more permission codes are invalid');
    for(const p of permissionRows.rows) await client.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)',[role.rows[0].id,p.id]);
    await client.query('COMMIT');
    await audit(req.auth!.shopId,req.auth!.id,'role.create','role',role.rows[0].id,undefined,{...role.rows[0],permissions:req.body.permissions});
    success(res,{...role.rows[0],permissions:req.body.permissions},'Role created',201);
  }catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}
});
export default router;