import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { cleanDatabase, pool, randomString } from './helpers';

describe('RBAC and Roles Management Suite', () => {
  let ownerToken = '';
  let managerToken = '';
  let cashierToken = '';
  let accountantToken = '';
  let shopId = '';
  let ownerId = '';
  let managerId = '';
  let cashierId = '';
  let cashierRoleId = '';
  let customRoleId = '';

  beforeAll(async () => {
    await cleanDatabase();

    // Register Shop
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'SuperMart Electronics',
        shopType: 'electronics',
        currency: 'INR',
        name: 'Owner Alice',
        email: `alice_${randomString()}@supermart.com`,
        password: 'Password123!'
      })
      .expect(201);

    ownerToken = regRes.body.data.token;
    shopId = regRes.body.data.shop.id;
    ownerId = regRes.body.data.user.id;

    // Get Roles
    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const roles = rolesRes.body.data;
    const managerRole = roles.find((r: any) => r.name === 'Manager');
    const cashierRole = roles.find((r: any) => r.name === 'Cashier/Staff');
    const accountantRole = roles.find((r: any) => r.name === 'Accountant');
    cashierRoleId = cashierRole.id;

    // Create Manager User
    const mRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Bob Manager',
        email: `bob_${randomString()}@supermart.com`,
        password: 'Password123!',
        roleId: managerRole.id
      })
      .expect(201);
    managerId = mRes.body.data.id;

    // Create Cashier User
    const cRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Charlie Cashier',
        email: `charlie_${randomString()}@supermart.com`,
        password: 'Password123!',
        roleId: cashierRole.id
      })
      .expect(201);
    cashierId = cRes.body.data.id;

    // Create Accountant User
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'David Accountant',
        email: `david_${randomString()}@supermart.com`,
        password: 'Password123!',
        roleId: accountantRole.id
      })
      .expect(201);

    // Login Manager
    const mLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mRes.body.data.email, password: 'Password123!' });
    managerToken = mLogin.body.data.token;

    // Login Cashier
    const cLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: cRes.body.data.email, password: 'Password123!' });
    cashierToken = cLogin.body.data.token;

    // Login Accountant
    const aLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `david_${randomString()}@supermart.com`.toLowerCase(), password: 'Password123!', shopId });
    // In case email generation differs, fetch from DB
    const accRow = await pool.query(`SELECT email FROM users WHERE name = 'David Accountant'`);
    const aLoginReal = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: accRow.rows[0].email, password: 'Password123!' });
    accountantToken = aLoginReal.body.data.token;
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  it('1. Owner has full access to roles, users, and audit logs', async () => {
    const roles = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(roles.body.data.length).toBeGreaterThanOrEqual(4);

    const audit = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(audit.body.data.length).toBeGreaterThan(0);
  });

  it('2. Cashier/Staff cannot view audit logs or manage users (returns 403 Forbidden)', async () => {
    await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Unauthorized User',
        email: 'unauth@test.com',
        password: 'Password123!',
        roleId: cashierRoleId
      })
      .expect(403);
  });

  it('3. Accountant can view audit logs but cannot create users (returns 403)', async () => {
    await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${accountantToken}`)
      .expect(200);

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        name: 'Unauthorized User',
        email: 'unauth2@test.com',
        password: 'Password123!',
        roleId: cashierRoleId
      })
      .expect(403);
  });

  it('4. Custom role creation with valid permissions succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Inventory Supervisor',
        description: 'Manages products and stock',
        permissions: ['inventory.view', 'inventory.create', 'inventory.edit']
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Inventory Supervisor');
    expect(res.body.data.permissions).toEqual(
      expect.arrayContaining(['inventory.view', 'inventory.create', 'inventory.edit'])
    );
    customRoleId = res.body.data.id;
  });

  it('5. Attempts to assign nonexistent permission codes fail with 400', async () => {
    const res = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Hacker Role',
        permissions: ['invalid.permission.code', 'billing.create']
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('One or more permission codes are invalid');
  });

  it('6. Modifying custom role permissions via PUT /roles/:id/permissions succeeds', async () => {
    const res = await request(app)
      .put(`/api/v1/roles/${customRoleId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        permissions: ['inventory.view', 'inventory.edit', 'billing.view']
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.permissions).toEqual(['inventory.view', 'inventory.edit', 'billing.view']);
  });

  it('7. Modifying Owner role permissions is strictly blocked', async () => {
    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const ownerRole = rolesRes.body.data.find((r: any) => r.name === 'Owner');

    await request(app)
      .put(`/api/v1/roles/${ownerRole.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ permissions: ['inventory.view'] })
      .expect(400);
  });

  it('8. Deleting system role is rejected with 400', async () => {
    await request(app)
      .delete(`/api/v1/roles/${cashierRoleId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('9. Deleting a role currently assigned to active users is rejected with 400', async () => {
    // Assign customRoleId to cashier user first
    await request(app)
      .patch(`/api/v1/users/${cashierId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: customRoleId })
      .expect(200);

    // Try deleting customRoleId
    const res = await request(app)
      .delete(`/api/v1/roles/${customRoleId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);

    expect(res.body.message).toContain('Cannot delete role because users are currently assigned to it');
  });

  it('10. Deleting an unassigned custom role succeeds', async () => {
    // Create an unassigned custom role
    const rRes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Temporary Intern Role',
        permissions: ['inventory.view']
      })
      .expect(201);

    const tempId = rRes.body.data.id;

    await request(app)
      .delete(`/api/v1/roles/${tempId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // Verify it is gone
    await request(app)
      .get(`/api/v1/roles/${tempId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});

