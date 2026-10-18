import type { PoolClient } from 'pg';
import { pool } from '../db/pool';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'token_hash',
  'tokenHash',
  'jwt',
  'secret'
]);

function sanitizeAuditData(data: unknown): unknown {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeAuditData);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeAuditData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function audit(
  shopId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | string[] | null,
  oldValue?: unknown,
  newValue?: unknown,
  client?: PoolClient
): Promise<void> {
  const runner = client ?? pool;
  const normalizedEntityId = Array.isArray(entityId) ? entityId.join(',') : (entityId ?? null);
  const sanitizedOld = oldValue === undefined ? null : JSON.stringify(sanitizeAuditData(oldValue));
  const sanitizedNew = newValue === undefined ? null : JSON.stringify(sanitizeAuditData(newValue));

  await runner.query(
    `INSERT INTO audit_logs(shop_id, user_id, action, entity, entity_id, old_value, new_value)
     VALUES($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [shopId, userId, action, entity, normalizedEntityId, sanitizedOld, sanitizedNew]
  );
}