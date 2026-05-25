import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from './config/db.js';

dotenv.config();

const DEFAULT_ADMIN_PASSWORD = 'admin123';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Check if admin already exists
    const [existing] = await pool.query("SELECT id FROM users WHERE user_id = 'admin'");
    if (existing.length > 0) {
      console.log('Admin user already exists — skipping');
    } else {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await pool.query(
        'INSERT INTO users (user_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'Admin', 'admin@rginfra.com', hash, 'admin']
      );
      console.log(`✅ Admin user created (userid: admin, password: ${DEFAULT_ADMIN_PASSWORD})`);
    }

    console.log('🌱 Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
