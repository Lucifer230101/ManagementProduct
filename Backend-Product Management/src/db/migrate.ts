import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';
import type { Pool } from 'pg';

export async function runMigration(poolInstance: Pool = pool, closePool = false) {
  const sqlPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await poolInstance.connect();
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
    if (closePool) {
      await poolInstance.end();
    }
  }
}

if (process.argv[1]?.includes('migrate')) {
  runMigration(pool, true).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}