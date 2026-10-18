import { pool } from '../src/db/pool';

export async function cleanDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        password_reset_tokens,
        audit_logs,
        employee_profiles,
        products,
        categories,
        shop_modules,
        role_permissions,
        users,
        roles,
        shops
      CASCADE;
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function randomString(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}

export { pool };

