import { pool } from '../db/pool';
export async function audit(
  shopId: string, userId: string | null, action: string, entity: string,
  entityId?: string | null, oldValue?: unknown, newValue?: unknown
) {
  await pool.query(
    `INSERT INTO audit_logs(shop_id,user_id,action,entity,entity_id,old_value,new_value)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
    [shopId,userId,action,entity,entityId ?? null,
     oldValue === undefined ? null : JSON.stringify(oldValue),
     newValue === undefined ? null : JSON.stringify(newValue)]
  );
}