import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { HttpError } from '../utils/http';
import { audit } from '../utils/audit';

function tokenFor(user: { id: string; shop_id: string; role_id: string }) {
  return jwt.sign({ shopId: user.shop_id, roleId: user.role_id }, env.JWT_SECRET, {
    subject: user.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}
export async function registerShop(input: {
  shopName: string; shopType: string; currency: string; gstin?: string;
  name: string; email: string; phone?: string; password: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const shopRes = await client.query(
      `INSERT INTO shops(name,shop_type,currency,gstin) VALUES($1,$2,$3,$4) RETURNING *`,
      [input.shopName,input.shopType,input.currency,input.gstin ?? null]
    );
    const shop = shopRes.rows[0];
    const roleNames = ['Owner','Manager','Cashier/Staff','Accountant'];
    const roles: Record<string,string> = {};
    for (const name of roleNames) {
      const r = await client.query(
        `INSERT INTO roles(shop_id,name,description,is_system) VALUES($1,$2,$3,TRUE) RETURNING id`,
        [shop.id,name,`Default ${name} role`]
      );
      roles[name] = r.rows[0].id;
    }
    const owner = await client.query(
      `INSERT INTO users(shop_id,name,phone,email,password_hash,role_id)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id,shop_id,role_id,name,email`,
      [shop.id,input.name,input.phone ?? null,input.email.toLowerCase(),
       await bcrypt.hash(input.password,env.BCRYPT_ROUNDS),roles.Owner]
    );
    const perms = await client.query('SELECT id,code FROM permissions');
    const ownerPermIds = perms.rows.map((p) => p.id);
    for (const permissionId of ownerPermIds) {
      await client.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[roles.Owner,permissionId]);
    }
    const defaultMap: Record<string,string[]> = {
      Manager: ['shop.view','users.view','employee.view','employee.manage','inventory.view','inventory.create','inventory.edit','inventory.delete','billing.view','billing.create','billing.discount','payments.record','reports.view'],
      'Cashier/Staff': ['inventory.view','billing.view','billing.create','payments.record'],
      Accountant: ['billing.view','reports.view','audit.view']
    };
    for (const [roleName,codes] of Object.entries(defaultMap)) {
      for (const code of codes) {
        const p = perms.rows.find((x) => x.code === code);
        if (p) await client.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[roles[roleName],p.id]);
      }
    }
    for (const module of ['employee','inventory','billing']) {
      await client.query('INSERT INTO shop_modules(shop_id,module_name,is_enabled) VALUES($1,$2,TRUE)',[shop.id,module]);
    }
    await client.query(
      `INSERT INTO employee_profiles(user_id,shop_id,designation,joining_date)
       VALUES($1,$2,'Owner',CURRENT_DATE)`,[owner.rows[0].id,shop.id]
    );
    await client.query('COMMIT');
    await audit(shop.id,owner.rows[0].id,'shop.register','shop',shop.id,undefined,{name:shop.name,shopType:shop.shop_type});
    return { user: owner.rows[0], shop, token: tokenFor(owner.rows[0]) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export async function login(input: { email: string; password: string; shopId?: string }) {
  const result = await pool.query(
    `SELECT u.id,u.shop_id,u.role_id,u.name,u.email,u.password_hash,u.is_active
     FROM users u WHERE lower(u.email)=lower($1) AND ($2::uuid IS NULL OR u.shop_id=$2)
     ORDER BY u.created_at LIMIT 2`,
    [input.email,input.shopId ?? null]
  );
  if (result.rows.length !== 1) throw new HttpError(401,'Invalid email, password, or shop identifier.');
  const user = result.rows[0];
  if (!user.is_active || !(await bcrypt.compare(input.password,user.password_hash))) {
    throw new HttpError(401,'Invalid email or password.');
  }
  await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1',[user.id]);
  const role = await pool.query('SELECT name FROM roles WHERE id=$1 AND shop_id=$2',[user.role_id,user.shop_id]);
  return {
    user: { id:user.id,shopId:user.shop_id,roleId:user.role_id,role:role.rows[0]?.name,name:user.name,email:user.email },
    token: tokenFor(user)
  };
}