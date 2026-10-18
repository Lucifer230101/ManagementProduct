import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { cleanDatabase, pool, randomString } from './helpers';

describe('Modules and Employee Profiles Suite', () => {
  let ownerToken = '';
  let cashierToken = '';
  let shopId = '';
  let ownerId = '';
  let cashierId = '';

  beforeAll(async () => {
    await cleanDatabase();

    // Register Shop
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        shopName: 'Green Grocery',
        shopType: 'grocery',
        currency: 'INR',
        name: 'George Owner',
        email: `george_${randomString()}@grocery.com`,
        password: 'Password123!'
      })
      .expect(201);

    ownerToken = res.body.data.token;
    shopId = res.body.data.shop.id;
    ownerId = res.body.data.user.id;

    // Get Cashier role
    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${ownerToken}`);
    const cashierRole = rolesRes.body.data.find((r: any) => r.name === 'Cashier/Staff');

    // Create Cashier Employee with salary
    const empRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'John Cashier',
        email: `john_${randomString()}@grocery.com`,
        password: 'Password123!',
        roleId: cashierRole.id,
        designation: 'Front Desk Cashier',
        salary: 25000,
        address: '123 Market Road'
      })
      .expect(201);

    cashierId = empRes.body.data.id;

    // Login Cashier
    const cLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: empRes.body.data.email, password: 'Password123!' });
    cashierToken = cLogin.body.data.token;
  });

  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  it('1. Lists all shop modules and enabled modules', async () => {
    const all = await request(app)
      .get('/api/v1/modules')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(all.body.data.length).toBe(3);

    const enabled = await request(app)
      .get('/api/v1/modules/enabled')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(enabled.body.data.length).toBe(3);
  });

  it('2. Disabling employee module restricts access to /api/v1/employees (403 Forbidden)', async () => {
    // Disable employee module
    await request(app)
      .put('/api/v1/modules/employee')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isEnabled: false })
      .expect(200);

    // Attempt to access employee endpoints
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    expect(res.body.message).toContain("Module 'employee' is disabled for this shop");

    // Re-enable employee module
    await request(app)
      .put('/api/v1/modules/employee')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isEnabled: true })
      .expect(200);

    // Access restored
    await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('3. Disabling inventory module restricts access to /api/v1/products (403 Forbidden)', async () => {
    await request(app)
      .put('/api/v1/modules/inventory')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isEnabled: false })
      .expect(200);

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    expect(res.body.message).toContain("Module 'inventory' is disabled for this shop");

    // Re-enable
    await request(app)
      .put('/api/v1/modules/inventory')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isEnabled: true })
      .expect(200);
  });

  it('4. Owner sees unmasked salary in employee list', async () => {
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const cashierRecord = res.body.data.find((e: any) => e.id === cashierId);
    expect(cashierRecord.salary).toBe(25000);
  });

  it('5. Cashier has salary masked (null) when viewing other employees', async () => {
    // Grant Cashier employee.view temporarily to test salary masking
    const rolesRes = await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${ownerToken}`);
    const cashierRole = rolesRes.body.data.find((r: any) => r.name === 'Cashier/Staff');
    await request(app)
      .put(`/api/v1/roles/${cashierRole.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ permissions: ['inventory.view', 'employee.view'] });

    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    const ownerRecord = res.body.data.find((e: any) => e.id === ownerId);
    expect(ownerRecord.salary).toBeNull();
  });

  it('6. Cashier can view their own salary without masking', async () => {
    const res = await request(app)
      .get(`/api/v1/employees/${cashierId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(cashierId);
    expect(res.body.data.salary).toBe(25000);
  });

  it('7. Updates employee profile via PUT /employees/:userId', async () => {
    const res = await request(app)
      .put(`/api/v1/employees/${cashierId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        designation: 'Senior Cashier & Shift Lead',
        salary: 30000,
        emergencyContact: '+919999888877'
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.designation).toBe('Senior Cashier & Shift Lead');
    expect(res.body.data.salary).toBe(30000);
    expect(res.body.data.emergencyContact).toBe('+919999888877');
  });

  it('8. Protection against deactivating own account returns 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${ownerId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(400);

    expect(res.body.message).toContain('You cannot deactivate your own account');
  });

  it('9. Protection against deactivating the last active Owner of the shop', async () => {
    // Attempt deactivating owner via employee endpoint
    const res = await request(app)
      .put(`/api/v1/employees/${ownerId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(400);

    expect(res.body.message).toContain('You cannot deactivate your own account');

    // Create a temporary admin/manager to test deactivating the owner
    const rolesRes = await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${ownerToken}`);
    const managerRole = rolesRes.body.data.find((r: any) => r.name === 'Manager');
    await request(app)
      .put(`/api/v1/roles/${managerRole.id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        permissions: [...managerRole.permissions, 'users.manage']
      });

    const mRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Manager Mary',
        email: `mary_${randomString()}@grocery.com`,
        password: 'Password123!',
        roleId: managerRole.id
      });

    const mLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mRes.body.data.email, password: 'Password123!' });

    // Mary tries to deactivate the only active owner
    const res2 = await request(app)
      .patch(`/api/v1/users/${ownerId}/status`)
      .set('Authorization', `Bearer ${mLogin.body.data.token}`)
      .send({ isActive: false })
      .expect(400);

    expect(res2.body.message).toContain('Cannot deactivate, delete, or demote the last active Owner of the shop');
  });
});
