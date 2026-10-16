import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { success, HttpError } from '../utils/http';
import { audit } from '../utils/audit';

const router=Router(); router.use(authenticate);
const schema=z.object({name:z.string().trim().min(1).max(100),description:z.string().max(1000).optional()});
router.get('/',requirePermission('inventory.view'),async(req,res,next)=>{
  try { const r=await pool.query('SELECT id,name,description,created_at AS "createdAt",updated_at AS "updatedAt" FROM categories WHERE shop_id=$1 ORDER BY name',[req.auth!.shopId]); success(res,r.rows); }catch(e){next(e);}
});
router.post('/',requirePermission('inventory.create'),validateBody(schema),async(req,res,next)=>{
  try { const r=await pool.query('INSERT INTO categories(shop_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,created_at AS "createdAt",updated_at AS "updatedAt"',[req.auth!.shopId,req.body.name,req.body.description ?? null]); await audit(req.auth!.shopId,req.auth!.id,'category.create','category',r.rows[0].id,undefined,r.rows[0]); success(res,r.rows[0],'Category created',201); }catch(e){next(e);}
});
router.put('/:id',requirePermission('inventory.edit'),validateBody(schema.partial()),async(req,res,next)=>{
  try { const old=await pool.query('SELECT * FROM categories WHERE id=$1 AND shop_id=$2',[req.params.id,req.auth!.shopId]); if(!old.rowCount)throw new HttpError(404,'Category not found');
    const name=req.body.name ?? old.rows[0].name, description=req.body.description ?? old.rows[0].description;
    const r=await pool.query('UPDATE categories SET name=$1,description=$2,updated_at=NOW() WHERE id=$3 AND shop_id=$4 RETURNING id,name,description,created_at AS "createdAt",updated_at AS "updatedAt"',[name,description,req.params.id,req.auth!.shopId]);
    await audit(req.auth!.shopId,req.auth!.id,'category.update','category',req.params.id,old.rows[0],r.rows[0]); success(res,r.rows[0],'Category updated');
  }catch(e){next(e);}
});
router.delete('/:id',requirePermission('inventory.delete'),async(req,res,next)=>{
  const client=await pool.connect(); try { await client.query('BEGIN'); const r=await client.query('DELETE FROM categories WHERE id=$1 AND shop_id=$2 RETURNING *',[req.params.id,req.auth!.shopId]); if(!r.rowCount)throw new HttpError(404,'Category not found'); await client.query('UPDATE products SET category_id=NULL,updated_at=NOW() WHERE category_id=$1 AND shop_id=$2',[req.params.id,req.auth!.shopId]); await client.query('COMMIT'); await audit(req.auth!.shopId,req.auth!.id,'category.delete','category',req.params.id,r.rows[0]); success(res,null,'Category deleted'); }catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}
});
export default router;