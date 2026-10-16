import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

async function main() {
  const sqlPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database schema applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exit(1); });