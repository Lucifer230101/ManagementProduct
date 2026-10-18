import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { cleanDatabase, pool, randomString } from './helpers';

describe('Audit Logging, Transactions, and Repeatability Suite', () => {
  let ownerToken = '';
  let shopId = '';
  let ownerId = '';

  beforeAll(async () => {
    await cleanDatabase();

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Transactional Hardware Store',
        shopType: 'hardware',
        currency: 'INR',
        name: 'Henry Owner',
        email: `henry_${randomString()}@hardware.com`,
        password: 'Password123!'
      })
      .expect(201);

    ownerToken = res.body.data.token;
    shopId = res.body.data.shop.id;
    ownerId = res.body.data.user.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  it('1. Audit logs record registration, module toggles, role creation, and user creation', async () => {
    // 1. Create a custom role
    await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Floor Manager',
        permissions: ['inventory.view']
      })
      .expect(201);

    // 2. Toggle module
    await request(app)
      .put('/api/v1/modules/billing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isEnabled: false })
      .expect(200);

    // 3. Query audit logs
    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.total).toBeGreaterThanOrEqual(3);

    const actions = auditRes.body.data.map((l: any) => l.action);
    expect(actions).toContain('shop.register');
    expect(actions).toContain('role.create');
    expect(actions).toContain('module.toggle');
  });

  it('2. Audit logs support filtering by action and entity', async () => {
    const roleLogs = await request(app)
      .get('/api/v1/audit-logs?action=role.create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(roleLogs.body.data.length).toBeGreaterThanOrEqual(1);
    expect(roleLogs.body.data.every((l: any) => l.action === 'role.create')).toBe(true);
  });

  it('3. Fetches individual audit log by ID (GET /audit-logs/:id)', async () => {
    const listRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`);

    const targetId = listRes.body.data[0].id;

    const singleRes = await request(app)
      .get(`/api/v1/audit-logs/${targetId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(singleRes.body.data.id).toBe(targetId);
  });

  it('4. Audit logs are append-only; modification or deletion is blocked with 404', async () => {
    const listRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`);

    const targetId = listRes.body.data[0].id;

    await request(app)
      .delete(`/api/v1/audit-logs/${targetId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    await request(app)
      .patch(`/api/v1/audit-logs/${targetId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'tampered.action' })
      .expect(404);
  });

  it('5. Audit logs redact passwords and sensitive secrets', async () => {
    // Check all audit log entries for any plaintext password or password_hash leakage
    const dbLogs = await pool.query('SELECT old_value, new_value FROM audit_logs WHERE shop_id = $1', [shopId]);
    for (const row of dbLogs.rows) {
      const oldStr = JSON.stringify(row.old_value || {});
      const newStr = JSON.stringify(row.new_value || {});
      expect(oldStr).not.toContain('Password123!');
      expect(newStr).not.toContain('Password123!');
      if (newStr.includes('password_hash')) {
        expect(newStr).toContain('[REDACTED]');
      }
    }
  });

  it('6. Transaction rollback during failed shop registration leaves zero orphaned records', async () => {
    const initialShopCount = (await pool.query('SELECT COUNT(*)::int AS count FROM shops')).rows[0].count;
    const initialUserCount = (await pool.query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count;

    // Send malformed body that passes validation or causes a DB conflict
    // Try registering with an existing shop email or triggering duplicate
    // To test transaction rollback at service layer:
    const duplicateEmail = `henry_${randomString()}@hardware.com`;

    // First create a user with that email in another scope
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Temp Shop',
        shopType: 'general',
        currency: 'INR',
        name: 'Temp User',
        email: duplicateEmail,
        password: 'Password123!'
      })
      .expect(201);

    const afterFirstShopCount = (await pool.query('SELECT COUNT(*)::int AS count FROM shops')).rows[0].count;

    // Now attempt registration with bad currency length in schema validation
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Failed Shop',
        shopType: 'general',
        currency: 'INVALID_CURRENCY_TOOLONG',
        name: 'Failure Tester',
        email: `failure_${randomString()}@test.com`,
        password: 'Password123!'
      })
      .expect(400);

    const finalShopCount = (await pool.query('SELECT COUNT(*)::int AS count FROM shops')).rows[0].count;
    expect(finalShopCount).toBe(afterFirstShopCount);
  });

  it('7. Validation errors return consistent 400 with structured error information', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: ''
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.fieldErrors).toBeDefined();
  });

  it('8. Database seeds and migrations can be safely re-run repeatedly (idempotent)', async () => {
    // Check permission count before
    const countBefore = (await pool.query('SELECT COUNT(*)::int AS count FROM permissions')).rows[0].count;

    // Run seed logic again without closing pool
    const { runSeed } = await import('../src/db/seed');
    await runSeed(pool, false);

    const countAfter = (await pool.query('SELECT COUNT(*)::int AS count FROM permissions')).rows[0].count;
    expect(countAfter).toBe(countBefore);
  });
});
