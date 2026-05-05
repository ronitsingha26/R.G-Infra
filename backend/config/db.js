import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'abc_construction_db',
  charset:  'utf8mb4',

  // Pool settings
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  connectTimeout:     30000, // 30s — important for slow Hostinger DB cold starts

  // Optional SSL for Hostinger remote MySQL
  // Set DB_SSL=true in your Hostinger env panel if your DB host requires SSL
  ...(process.env.DB_SSL === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

// ─── Startup connection test ───────────────────────────────────────────────
// Fail fast so PM2 / Hostinger can restart rather than silently serving errors
pool.getConnection()
  .then((conn) => {
    console.log(`✅ MySQL connected → ${process.env.DB_NAME || 'abc_construction_db'} @ ${process.env.DB_HOST || 'localhost'}`);
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
    if (isProd) {
      console.error('   Shutting down — fix DB credentials and restart.');
      process.exit(1);
    }
  });

export default pool;
