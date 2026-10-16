import { pool } from './pool';

const permissions = [
  ['shop.view','core','View shop settings'], ['shop.manage','core','Manage shop settings'],
  ['users.view','core','View users'], ['users.manage','core','Invite and manage users'],
  ['roles.view','core','View roles and permissions'], ['roles.manage','core','Manage roles and permissions'],
  ['employee.view','employee','View employee profiles'], ['employee.manage','employee','Manage employee profiles'],
  ['inventory.view','inventory','View products and stock'], ['inventory.create','inventory','Create products'],
  ['inventory.edit','inventory','Edit products and stock'], ['inventory.delete','inventory','Delete products'],
  ['billing.view','billing','View bills'], ['billing.create','billing','Create bills'],
  ['billing.discount','billing','Apply bill discounts'], ['billing.refund','billing','Process returns and credit notes'],
  ['payments.record','billing','Record payments'], ['reports.view','reports','View reports'],
  ['audit.view','core','View audit logs']
] as const;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [code, module, description] of permissions) {
      await client.query(
        `INSERT INTO permissions(code,module,description) VALUES($1,$2,$3)
         ON CONFLICT(code) DO UPDATE SET module=EXCLUDED.module, description=EXCLUDED.description`,
        [code,module,description]
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${permissions.length} permissions.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}
main().catch((error) => { console.error(error); process.exit(1); });