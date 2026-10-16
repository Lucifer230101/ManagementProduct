import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { success } from '../utils/http';
const router=Router();
router.use(authenticate);
router.get('/',requirePermission('roles.view'),async(_req,res,next)=>{
  try { const r=await pool.query('SELECT id,code,module,description FROM permissions ORDER BY module,code'); success(res,r.rows); } catch(e){next(e);}
});
export default router;
