import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { success } from '../utils/http';
const router=Router();router.use(authenticate);
router.get('/',requirePermission('audit.view'),async(req,res,next)=>{
  try {const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||25));
    const [count,rows]=await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM audit_logs WHERE shop_id=$1',[req.auth!.shopId]),
      pool.query(`SELECT a.id,a.action,a.entity,a.entity_id AS "entityId",a.old_value AS "oldValue",a.new_value AS "newValue",a.created_at AS "createdAt",u.name AS "userName"
        FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id AND u.shop_id=a.shop_id WHERE a.shop_id=$1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,[req.auth!.shopId,limit,(page-1)*limit])
    ]);res.json({success:true,message:'Audit logs retrieved',data:rows.rows,total:count.rows[0].total,page,limit});
  }catch(e){next(e);}
});
export default router;