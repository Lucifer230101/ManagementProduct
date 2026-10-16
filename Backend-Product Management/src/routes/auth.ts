import { Router } from 'express';
import { z } from 'zod';
import { registerShop, login } from '../services/authService';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { pool } from '../db/pool';
import { success, HttpError } from '../utils/http';

const router = Router();
const registerSchema = z.object({
  shopName:z.string().trim().min(2).max(160), shopType:z.enum(['grocery','clothing','pharmacy','electronics','hardware','stationery','general']).default('general'),
  currency:z.string().length(3).default('INR'), gstin:z.string().trim().max(20).optional(),
  name:z.string().trim().min(2).max(120), email:z.string().email().max(254),
  phone:z.string().trim().max(30).optional(), password:z.string().min(12).max(72)
});
router.post('/register-shop',validateBody(registerSchema),async(req,res,next)=>{
  try { const result=await registerShop(req.body); success(res,result,'Shop registered successfully',201); } catch(e){next(e);}
});
router.post('/login',validateBody(z.object({
  email:z.string().email(), password:z.string().min(1).max(72), shopId:z.string().uuid().optional()
})),async(req,res,next)=>{
  try { success(res,await login(req.body),'Login successful'); } catch(e){next(e);}
});
router.get('/me',authenticate,async(req,res,next)=>{
  try {
    const result=await pool.query(
      `SELECT u.id,u.name,u.email,u.phone,u.shop_id AS "shopId",r.name AS role,s.name AS "shopName",s.shop_type AS "shopType"
       FROM users u JOIN roles r ON r.id=u.role_id AND r.shop_id=u.shop_id
       JOIN shops s ON s.id=u.shop_id WHERE u.id=$1 AND u.shop_id=$2`,
      [req.auth!.id,req.auth!.shopId]);
    if(!result.rowCount) throw new HttpError(404,'User not found');
    success(res,result.rows[0]);
  }catch(e){next(e);}
});
export default router;