import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { cleanDatabase, pool, randomString } from './helpers';

describe('Multi-Tenant Data Isolation Suite', () => {
  let shopAToken = '';
  let shopAId = '';
  let shopAUserId = '';
  let shopARoleId = '';

  let shopBToken = '';
  let shopBId = '';
  let shopBUserId = '';
  let shopBRoleId = '';
  let shopBAuditId = '';

  beforeAll(async () => {
    await cleanDatabase();

    // 1. Register Shop A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Alpha Kirana',
        shopType: 'grocery',
        currency: 'INR',
        name: 'Owner Alpha',
        email: `alpha_${randomString()}@example.com`,
        password: 'Password123!'
      })
      .expect(201);

    shopAToken = resA.body.data.token;
    shopAId = resA.body.data.shop.id;
    shopAUserId = resA.body.data.user.id;

    // Get Shop A custom role
    const roleARes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        name: 'Alpha Custom Role',
        permissions: ['inventory.view']
      })
      .expect(201);
    shopARoleId = roleARes.body.data.id;

    // 2. Register Shop B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Beta Electronics',
        shopType: 'electronics',
        currency: 'INR',
        name: 'Owner Beta',
        email: `beta_${randomString()}@example.com`,
        password: 'Password123!'
      })
      .expect(201);

    shopBToken = resB.body.data.token;
    shopBId = resB.body.data.shop.id;
    shopBUserId = resB.body.data.user.id;

    // Get Shop B custom role
    const roleBRes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${shopBToken}`)
      .send({
        name: 'Beta Custom Role',
        permissions: ['billing.view']
      })
      .expect(201);
    shopBRoleId = roleBRes.body.data.id;

    // Fetch an audit log ID belonging to Shop B
    const auditB = await pool.query('SELECT id FROM audit_logs WHERE shop_id = $1 LIMIT 1', [shopBId]);
    shopBAuditId = auditB.rows[0].id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  it('1. Shop A owner cannot view Shop B user details (returns 404)', async () => {
    await request(app)
      .get(`/api/v1/users/${shopBUserId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(404);
  });

  it('2. Shop A owner cannot update Shop B user details (returns 404)', async () => {
    await request(app)
      .patch(`/api/v1/users/${shopBUserId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({ name: 'Hacked Name' })
      .expect(404);

    // Verify Shop B user was NOT modified in DB
    const u = await pool.query('SELECT name FROM users WHERE id = $1', [shopBUserId]);
    expect(u.rows[0].name).toBe('Owner Beta');
  });

  it('3. Shop A owner cannot toggle Shop B user active status (returns 404)', async () => {
    await request(app)
      .patch(`/api/v1/users/${shopBUserId}/status`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({ isActive: false })
      .expect(404);

    const u = await pool.query('SELECT is_active FROM users WHERE id = $1', [shopBUserId]);
    expect(u.rows[0].is_active).toBe(true);
  });

  it('4. Shop A owner cannot view Shop B custom role (returns 404)', async () => {
    await request(app)
      .get(`/api/v1/roles/${shopBRoleId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(404);
  });

  it('5. Cross-shop role assignment is strictly rejected (returns 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${shopAUserId}/role`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({ roleId: shopBRoleId })
      .expect(400);

    expect(res.body.message).toContain('Selected role does not belong to this shop');
  });

  it('6. Shop A owner cannot delete Shop B role (returns 404)', async () => {
    await request(app)
      .delete(`/api/v1/roles/${shopBRoleId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(404);

    // Verify role still exists in Shop B
    const r = await pool.query('SELECT id FROM roles WHERE id = $1', [shopBRoleId]);
    expect(r.rowCount).toBe(1);
  });

  it('7. Shop A owner cannot view Shop B employee profile (returns 404)', async () => {
    await request(app)
      .get(`/api/v1/employees/${shopBUserId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(404);
  });

  it('8. Shop A owner cannot modify Shop B employee profile (returns 404)', async () => {
    await request(app)
      .put(`/api/v1/employees/${shopBUserId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({ designation: 'Malicious Change' })
      .expect(404);
  });

  it('9. Shop A owner cannot view Shop B audit log entry (returns 404)', async () => {
    await request(app)
      .get(`/api/v1/audit-logs/${shopBAuditId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(404);
  });

  it('10. User listing in Shop A does not leak Shop B users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(200);

    const userIds = res.body.data.map((u: any) => u.id);
    expect(userIds).toContain(shopAUserId);
    expect(userIds).not.toContain(shopBUserId);
  });

  it('11. Roles listing in Shop A does not leak Shop B roles', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${shopAToken}`)
      .expect(200);

    const roleIds = res.body.data.map((r: any) => r.id);
    expect(roleIds).toContain(shopARoleId);
    expect(roleIds).not.toContain(shopBRoleId);
  });
});

