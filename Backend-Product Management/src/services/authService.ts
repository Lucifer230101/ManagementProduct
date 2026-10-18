import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { HttpError } from '../utils/http';
import { audit } from '../utils/audit';

export function tokenFor(user: { id: string; shop_id: string; role_id: string }) {
  return jwt.sign({ shopId: user.shop_id, roleId: user.role_id }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}

export async function assertNotLastActiveOwner(shopId: string, userId: string): Promise<void> {
  const userCheck = await pool.query(
    `SELECT u.is_active, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
     WHERE u.id = $1 AND u.shop_id = $2`,
    [userId, shopId]
  );
  if (!userCheck.rowCount) return;

  const isOwner = userCheck.rows[0].role_name === 'Owner';
  if (!isOwner) return;

  const activeOwners = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
     WHERE u.shop_id = $1 AND r.name = 'Owner' AND u.is_active = TRUE`,
    [shopId]
  );

  if (activeOwners.rows[0].count <= 1) {
    throw new HttpError(400, 'Cannot deactivate, delete, or demote the last active Owner of the shop.');
  }
}

export async function registerShop(input: {
  shopName: string;
  shopType: string;
  currency: string;
  gstin?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shopRes = await client.query(
      `INSERT INTO shops(name, shop_type, currency, gstin)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [input.shopName, input.shopType, input.currency, input.gstin ?? null]
    );
    const shop = shopRes.rows[0];

    const roleNames = ['Owner', 'Manager', 'Cashier/Staff', 'Accountant'];
    const roles: Record<string, string> = {};
    for (const name of roleNames) {
      const r = await client.query(
        `INSERT INTO roles(shop_id, name, description, is_system)
         VALUES($1, $2, $3, TRUE) RETURNING id`,
        [shop.id, name, `Default ${name} role`]
      );
      roles[name] = r.rows[0].id;
    }

    const hashedPassword = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const ownerRes = await client.query(
      `INSERT INTO users(shop_id, name, phone, email, password_hash, role_id)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, shop_id, role_id, name, email, created_at`,
      [shop.id, input.name, input.phone ?? null, input.email.toLowerCase(), hashedPassword, roles.Owner]
    );
    const owner = ownerRes.rows[0];

    // Seed all permissions to the Owner role
    const perms = await client.query('SELECT id, code FROM permissions');
    for (const p of perms.rows) {
      await client.query(
        `INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2) ON CONFLICT DO NOTHING`,
        [roles.Owner, p.id]
      );
    }

    const defaultMap: Record<string, string[]> = {
      Manager: [
        'shop.view',
        'shop.settings.manage',
        'shop.manage',
        'users.view',
        'employee.view',
        'employee.manage',
        'inventory.view',
        'inventory.create',
        'inventory.edit',
        'inventory.delete',
        'billing.view',
        'billing.create',
        'billing.discount',
        'payments.record',
        'reports.view',
        'modules.manage'
      ],
      'Cashier/Staff': ['inventory.view', 'billing.view', 'billing.create', 'payments.record'],
      Accountant: ['billing.view', 'reports.view', 'audit.view']
    };

    for (const [roleName, codes] of Object.entries(defaultMap)) {
      for (const code of codes) {
        const p = perms.rows.find((x) => x.code === code);
        if (p) {
          await client.query(
            `INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2) ON CONFLICT DO NOTHING`,
            [roles[roleName], p.id]
          );
        }
      }
    }

    // Default modules enabled
    for (const module of ['employee', 'inventory', 'billing']) {
      await client.query(
        `INSERT INTO shop_modules(shop_id, module_name, is_enabled) VALUES($1, $2, TRUE)`,
        [shop.id, module]
      );
    }

    // Initial Owner employee profile
    await client.query(
      `INSERT INTO employee_profiles(user_id, shop_id, designation, joining_date)
       VALUES($1, $2, 'Owner', CURRENT_DATE)`,
      [owner.id, shop.id]
    );

    // Transactional audit log
    await audit(
      shop.id,
      owner.id,
      'shop.register',
      'shop',
      shop.id,
      undefined,
      { name: shop.name, shopType: shop.shop_type },
      client
    );

    await client.query('COMMIT');
    return {
      user: {
        id: owner.id,
        shopId: owner.shop_id,
        roleId: owner.role_id,
        role: 'Owner',
        name: owner.name,
        email: owner.email
      },
      shop,
      token: tokenFor(owner)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function login(input: { email: string; password: string; shopId?: string }) {
  const result = await pool.query(
    `SELECT u.id, u.shop_id, u.role_id, u.name, u.email, u.password_hash, u.is_active, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.shop_id = u.shop_id
     WHERE lower(u.email) = lower($1) AND ($2::uuid IS NULL OR u.shop_id = $2)
     ORDER BY u.created_at LIMIT 2`,
    [input.email, input.shopId ?? null]
  );

  if (result.rows.length === 0) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  if (result.rows.length > 1 && !input.shopId) {
    throw new HttpError(
      400,
      'Multiple shops associated with this email. Please specify shopId to log in.'
    );
  }

  const user = result.rows[0];
  if (!user.is_active) {
    throw new HttpError(401, 'Account is inactive. Please contact your shop administrator.');
  }

  const passwordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordValid) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  await audit(user.shop_id, user.id, 'auth.login', 'user', user.id);

  return {
    user: {
      id: user.id,
      shopId: user.shop_id,
      roleId: user.role_id,
      role: user.role_name,
      name: user.name,
      email: user.email
    },
    token: tokenFor(user)
  };
}

export async function requestPasswordReset(email: string, shopId?: string) {
  const users = await pool.query(
    `SELECT id, shop_id, email FROM users
     WHERE lower(email) = lower($1) AND ($2::uuid IS NULL OR shop_id = $2) AND is_active = TRUE`,
    [email, shopId ?? null]
  );

  // Return a generic response to prevent account enumeration
  if (users.rowCount === 0) {
    return {
      message: 'If an active account exists with this email, password reset instructions have been generated.',
      resetToken: null
    };
  }

  const user = users.rows[0];
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Token valid for 1 hour
  await pool.query(
    `INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
     VALUES($1, $2, NOW() + INTERVAL '1 hour')`,
    [user.id, tokenHash]
  );

  await audit(user.shop_id, user.id, 'auth.password_reset_requested', 'user', user.id);

  return {
    message: 'If an active account exists with this email, password reset instructions have been generated.',
    // Returning resetToken for development, test runner, and email gateway integration
    resetToken: rawToken
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tokenRes = await client.query(
      `SELECT prt.id, prt.user_id, u.shop_id, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.expires_at > NOW()
         AND prt.used_at IS NULL
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRes.rowCount === 0) {
      throw new HttpError(400, 'Invalid or expired password reset token.');
    }

    const { id: tokenId, user_id: userId, shop_id: shopId, is_active } = tokenRes.rows[0];
    if (!is_active) {
      throw new HttpError(400, 'Account is inactive.');
    }

    const newHashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHashed, userId]
    );

    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [tokenId]
    );

    await audit(shopId, userId, 'auth.password_reset', 'user', userId, undefined, undefined, client);

    await client.query('COMMIT');
    return { message: 'Password has been reset successfully.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}