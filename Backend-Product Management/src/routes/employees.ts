import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router=Router();router.use(authenticate);
router.get('/',requirePermission('employee.view'),async(req,res,next)=>{
  try { const r=await pool.query(`SELECT u.id,u.name,u.email,u.phone,u.is_active AS "isActive",u.created_at AS "createdAt",
    ep.designation,ep.joining_date AS "joiningDate",ep.salary,ep.address,ep.emergency_contact AS "emergencyContact",ro.name AS role
    FROM users u JOIN roles ro ON ro.id=u.role_id AND ro.shop_id=u.shop_id LEFT JOIN employee_profiles ep ON ep.user_id=u.id AND ep.shop_id=u.shop_id
    WHERE u.shop_id=$1 ORDER BY u.created_at DESC`,[req.auth!.shopId]);success(res,r.rows); }catch(e){next(e);}
});
router.post('/',requirePermission('employee.manage'),validateBody(z.object({
  name:z.string().trim().min(2).max(120),email:z.string().email(),phone:z.string().max(30).optional(),
  password:z.string().min(12).max(72),roleId:z.string().uuid(),
  designation:z.string().max(100).optional(),joiningDate:z.string().date().optional(),
  salary:z.coerce.number().min(0).optional(),address:z.string().max(2000).optional(),emergencyContact:z.string().max(50).optional()
})),async(req,res,next)=>{
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const role=await client.query('SELECT id FROM roles WHERE id=$1 AND shop_id=$2',[req.body.roleId,req.auth!.shopId]);
    if(!role.rowCount)throw new HttpError(400,'Role does not belong to this shop');
    const bcrypt=(await import('bcryptjs')).default;
    const {name,email,phone,password,roleId,...profile}=req.body;
    const u=await client.query(`INSERT INTO users(shop_id,name,email,phone,password_hash,role_id) VALUES($1,$2,$3,$4,$5,$6)
      RETURNING id,name,email,phone,is_active AS "isActive"`,[req.auth!.shopId,name,email.toLowerCase(),phone ?? null,await bcrypt.hash(password,12),roleId]);
    await client.query(`INSERT INTO employee_profiles(user_id,shop_id,designation,joining_date,salary,address,emergency_contact)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,[u.rows[0].id,req.auth!.shopId,profile.designation ?? null,profile.joiningDate ?? null,profile.salary ?? null,profile.address ?? null,profile.emergencyContact ?? null]);
    await client.query('COMMIT');await audit(req.auth!.shopId,req.auth!.id,'employee.create','user',u.rows[0].id,undefined,u.rows[0]);success(res,u.rows[0],'Employee created',201);
  }catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}
});
router.patch('/:userId',requirePermission('employee.manage'),validateBody(z.object({
  isActive:z.boolean().optional(),designation:z.string().max(100).nullable().optional(),
  joiningDate:z.string().date().nullable().optional(),salary:z.coerce.number().min(0).nullable().optional(),
  address:z.string().max(2000).nullable().optional(),emergencyContact:z.string().max(50).nullable().optional()
})),async(req,res,next)=>{
  try {
    if(req.params.userId===req.auth!.id && req.body.isActive===false)throw new HttpError(400,'You cannot deactivate your own account');
    const old=await pool.query('SELECT * FROM users WHERE id=$1 AND shop_id=$2',[req.params.userId,req.auth!.shopId]);if(!old.rowCount)throw new HttpError(404,'Employee not found');
    if(req.body.isActive!==undefined)await pool.query('UPDATE users SET is_active=$1 WHERE id=$2 AND shop_id=$3',[req.body.isActive,req.params.userId,req.auth!.shopId]);
    const fields:{[k:string]:string}={designation:'designation',joiningDate:'joining_date',salary:'salary',address:'address',emergencyContact:'emergency_contact'};
    const vals:any[]=[req.params.userId,req.auth!.shopId],sets:string[]=[];
    for(const [key,col] of Object.entries(fields))if(req.body[key]!==undefined){vals.push(req.body[key]);sets.push(`${col}=$${vals.length}`);}
    if(sets.length){sets.push('updated_at=NOW()');await pool.query(`INSERT INTO employee_profiles(user_id,shop_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING`,[req.params.userId,req.auth!.shopId]);await pool.query(`UPDATE employee_profiles SET ${sets.join(',')} WHERE user_id=$1 AND shop_id=$2`,vals);}
    const fresh=await pool.query(`SELECT u.id,u.name,u.email,u.phone,u.is_active AS "isActive",ep.designation,ep.joining_date AS "joiningDate",ep.salary,ep.address,ep.emergency_contact AS "emergencyContact"
      FROM users u LEFT JOIN employee_profiles ep ON ep.user_id=u.id AND ep.shop_id=u.shop_id WHERE u.id=$1 AND u.shop_id=$2`,[req.params.userId,req.auth!.shopId]);
    await audit(req.auth!.shopId,req.auth!.id,'employee.update','user',req.params.userId,old.rows[0],fresh.rows[0]);success(res,fresh.rows[0],'Employee updated');
  }catch(e){next(e);}
});
export default router;