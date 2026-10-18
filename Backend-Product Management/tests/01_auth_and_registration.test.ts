import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { cleanDatabase, pool, randomString } from './helpers';

describe('Auth and Registration Suite', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  const testShop = {
    shopName: 'Metro Kirana Store',
    shopType: 'grocery',
    currency: 'INR',
    gstin: '07AAAAA0000A1Z5',
    name: 'Saurav Sharma',
    email: `owner_${randomString()}@example.com`,
    phone: '+919876543210',
    password: 'SecurePassword123!'
  };

  let ownerToken = '';
  let shopId = '';
  let ownerId = '';

  it('1. Registers a new shop and initializes owner, default roles, permissions, and modules', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testShop)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.shop.name).toBe(testShop.shopName);
    expect(res.body.data.user.role).toBe('Owner');
    expect(res.body.data.user.email).toBe(testShop.email.toLowerCase());

    ownerToken = res.body.data.token;
    shopId = res.body.data.shop.id;
    ownerId = res.body.data.user.id;

    // Verify password is not returned in response
    expect((res.body.data.user as any).password).toBeUndefined();
    expect((res.body.data.user as any).password_hash).toBeUndefined();

    // Verify password is encrypted with bcrypt in DB
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [ownerId]);
    expect(dbUser.rows[0].password_hash.startsWith('$2')).toBe(true);
    expect(dbUser.rows[0].password_hash).not.toBe(testShop.password);

    // Verify default roles created: Owner, Manager, Cashier/Staff, Accountant
    const roles = await pool.query('SELECT name, is_system FROM roles WHERE shop_id = $1 ORDER BY name', [shopId]);
    const roleNames = roles.rows.map((r) => r.name);
    expect(roleNames).toContain('Owner');
    expect(roleNames).toContain('Manager');
    expect(roleNames).toContain('Cashier/Staff');
    expect(roleNames).toContain('Accountant');

    // Verify default modules created
    const modules = await pool.query('SELECT module_name, is_enabled FROM shop_modules WHERE shop_id = $1', [shopId]);
    expect(modules.rowCount).toBe(3);
  });

  it('2. Backwards-compatible /api/v1/auth/register-shop alias functions identically', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-shop')
      .send({
        shopName: 'Alias Pharmacy',
        shopType: 'pharmacy',
        currency: 'INR',
        name: 'Doctor A',
        email: `doc_${randomString()}@example.com`,
        password: 'Password12345!'
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.shop.name).toBe('Alias Pharmacy');
  });

  it('3. Successfully logs in with valid credentials and updates last_login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testShop.email,
        password: testShop.password
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testShop.email.toLowerCase());

    const userInDb = await pool.query('SELECT last_login FROM users WHERE id = $1', [ownerId]);
    expect(userInDb.rows[0].last_login).not.toBeNull();
  });

  it('4. Rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testShop.email,
        password: 'WrongPassword999!'
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('5. Rejects unauthenticated access to protected /auth/me', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('6. Allows authenticated access to /auth/me with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ownerId);
    expect(res.body.data.shopId).toBe(shopId);
    expect(res.body.data.role).toBe('Owner');
  });

  it('7. Handles password reset request and token generation (/password/forgot)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: testShop.email })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.resetToken).toBeDefined();

    const resetToken = res.body.data.resetToken;

    // Reset password using the generated token
    const newPassword = 'BrandNewPassword999!';
    const resetRes = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({
        token: resetToken,
        newPassword
      })
      .expect(200);

    expect(resetRes.body.success).toBe(true);

    // Verify login with new password works
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testShop.email,
        password: newPassword
      })
      .expect(200);

    // Verify reusing the same token is rejected
    await request(app)
      .post('/api/v1/auth/password/reset')
      .send({
        token: resetToken,
        newPassword: 'AnotherPassword123!'
      })
      .expect(400);
  });

  it('8. Logs out user successfully and records audit log', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify audit log exists
    const logs = await pool.query(
      `SELECT * FROM audit_logs WHERE shop_id = $1 AND action = 'auth.logout'`,
      [shopId]
    );
    expect(logs.rowCount).toBeGreaterThanOrEqual(1);
  });

  it('9. Health checks return 200 with DB status', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');

    const rootRes = await request(app).get('/health').expect(200);
    expect(rootRes.body.success).toBe(true);
    expect(rootRes.body.data.database).toBe('connected');
  });
});

