import { pool } from './pool';
import { registerShop } from '../services/authService';

async function main() {
  const existing = await pool.query("SELECT id FROM users WHERE email = 'owner@example.com'");
  if (existing.rowCount === 0) {
    const res = await registerShop({
      shopName: 'Metro General Store',
      shopType: 'general',
      currency: 'INR',
      gstin: '07AAAAA0000A1Z5',
      name: 'Demo Owner',
      email: 'owner@example.com',
      phone: '+919876543210',
      password: 'Password123!',
    });
    console.log(`Demo shop registered successfully!`);
    console.log(`Email: ${res.user.email}`);
    console.log(`Password: Password123!`);
    console.log(`Shop: ${res.shop.name} (${res.shop.id})`);
  } else {
    console.log('Demo shop owner (owner@example.com) already exists in database.');
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
