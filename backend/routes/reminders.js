import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { processDueReminders } from '../services/dueReminderCron.js';

const router = Router();

// ─── GET /api/reminders — All reminder logs ────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT rl.*, 
        c.name as client_name, c.unique_client_id, c.email as client_email, c.phone as client_phone,
        f.flat_number, a.name as apartment_name,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
      FROM reminder_logs rl
      LEFT JOIN clients c ON rl.client_id = c.id
      LEFT JOIN flats f ON rl.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN demand_letters dl ON rl.demand_letter_id = dl.id
      ORDER BY rl.sent_on DESC
      LIMIT 200
    `);
    res.json(logs);
  } catch (err) {
    console.error('Get reminder logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/reminders/client/:clientId — Logs for a specific client ──────
router.get('/client/:clientId', verifyToken, async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT rl.*, 
        c.name as client_name,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
      FROM reminder_logs rl
      LEFT JOIN clients c ON rl.client_id = c.id
      LEFT JOIN demand_letters dl ON rl.demand_letter_id = dl.id
      WHERE rl.client_id = ?
      ORDER BY rl.sent_on DESC
    `, [req.params.clientId]);
    res.json(logs);
  } catch (err) {
    console.error('Get client reminder logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/reminders/stats — Summary stats ─────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_reminders,
        SUM(CASE WHEN email_status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN email_status = 'failed' THEN 1 ELSE 0 END) as emails_failed,
        SUM(CASE WHEN email_status = 'skipped' THEN 1 ELSE 0 END) as emails_skipped,
        SUM(CASE WHEN whatsapp_initiated = 1 THEN 1 ELSE 0 END) as whatsapp_initiated,
        SUM(CASE WHEN trigger_type = 'cron' THEN 1 ELSE 0 END) as cron_triggered,
        SUM(CASE WHEN trigger_type = 'manual' THEN 1 ELSE 0 END) as manually_triggered,
        SUM(CASE WHEN DATE(sent_on) = CURDATE() THEN 1 ELSE 0 END) as sent_today
      FROM reminder_logs
    `);
    res.json(stats[0]);
  } catch (err) {
    console.error('Get reminder stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/reminders/trigger — Manually trigger due reminder run ──────
router.post('/trigger', verifyToken, async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await processDueReminders(io, 'manual');
    res.json({
      message: 'Due reminder check completed',
      ...result,
    });
  } catch (err) {
    console.error('Manual trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

// ─── DELETE /api/reminders/:id — Delete a single log ──────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM reminder_logs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Reminder log deleted' });
  } catch (err) {
    console.error('Delete reminder log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
