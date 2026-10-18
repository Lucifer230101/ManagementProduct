import { pool } from './pool';
import type { Pool } from 'pg';

export const permissionsCatalogue = [
  ['shop.view', 'core', 'View shop settings'],
  ['shop.settings.manage', 'core', 'Manage shop settings and configuration'],
  ['shop.manage', 'core', 'Manage shop settings'],
  ['users.view', 'core', 'View users'],
  ['users.manage', 'core', 'Invite and manage users'],
  ['roles.view', 'core', 'View roles and permissions'],
  ['roles.manage', 'core', 'Manage roles and permissions'],
  ['modules.manage', 'core', 'Enable or disable shop modules'],
  ['employee.view', 'employee', 'View employee profiles'],
  ['employee.manage', 'employee', 'Manage employee profiles'],
  ['inventory.view', 'inventory', 'View products and stock'],
  ['inventory.create', 'inventory', 'Create products'],
  ['inventory.edit', 'inventory', 'Edit products and stock'],
  ['inventory.delete', 'inventory', 'Delete products'],
  ['billing.view', 'billing', 'View bills and invoices'],
  ['billing.create', 'billing', 'Create bills and invoices'],
  ['billing.discount', 'billing', 'Apply bill discounts'],
  ['billing.refund', 'billing', 'Process returns and credit notes'],
  ['payments.record', 'billing', 'Record customer payments'],
  ['reports.view', 'reports', 'View business reports'],
  ['audit.view', 'core', 'View audit logs']
] as const;

export async function runSeed(poolInstance: Pool = pool, closePool = false) {
  const client = await poolInstance.connect();
  try {
    await client.query('BEGIN');
    for (const [code, module, description] of permissionsCatalogue) {
      await client.query(
        `INSERT INTO permissions(code, module, description) VALUES($1, $2, $3)
         ON CONFLICT(code) DO UPDATE SET module = EXCLUDED.module, description = EXCLUDED.description`,
        [code, module, description]
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${permissionsCatalogue.length} permissions.`);
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

if (process.argv[1]?.includes('seed')) {
  runSeed(pool, true).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}