import pool from './config/db.js';
import { recalculateDues } from './services/paymentLedger.js';

async function run() {
  const [projections] = await pool.query('SELECT * FROM work_projections WHERE status = "completed"');
  for (const wp of projections) {
    const [clients] = await pool.query('SELECT c.flat_id, b.id as booking_id, COALESCE(b.flat_value, f.total_amount, 0) as total_amount FROM clients c LEFT JOIN bookings b ON b.client_id = c.id AND b.status = "active" LEFT JOIN flats f ON c.flat_id = f.id WHERE c.id = ?', [wp.client_id]);
    
    if (clients.length === 0) continue;
    const totalAmount = Number(clients[0].total_amount || 0);
    if (totalAmount <= 0) continue;

    const [existing] = await pool.query('SELECT id FROM payment_schedules WHERE client_id = ? AND stage_name = ?', [wp.client_id, wp.milestone_name]);
    if (existing.length === 0) {
      const amount = (totalAmount * wp.milestone_percentage) / 100;
      const [maxOrder] = await pool.query('SELECT MAX(stage_order) as max_order FROM payment_schedules WHERE client_id = ?', [wp.client_id]);
      const nextOrder = (maxOrder[0].max_order || 0) + 1;
      
      console.log(`Syncing missing projection ${wp.milestone_name} for client ${wp.client_id}...`);
      await pool.query(
        `INSERT INTO payment_schedules (client_id, flat_id, booking_id, stage_order, stage_name, percentage, amount, due_amount, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [wp.client_id, clients[0].flat_id, clients[0].booking_id, nextOrder, wp.milestone_name, wp.milestone_percentage, amount, amount, wp.completion_date]
      );
    }
  }
  
  const [allClients] = await pool.query('SELECT id FROM clients');
  for (const c of allClients) {
    await recalculateDues(c.id, pool);
  }
  console.log("Done syncing.");
  process.exit(0);
}
run();
