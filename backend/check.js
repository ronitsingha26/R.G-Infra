import pool from './config/db.js';

async function run() {
  const [rows] = await pool.query('SELECT stage_order, stage_name, percentage, status FROM payment_schedules WHERE client_id = 1 ORDER BY stage_order ASC');
  console.log(rows);
  process.exit(0);
}
run();
