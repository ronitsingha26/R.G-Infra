import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [[{ totalClients }]] = await pool.query('SELECT COUNT(*) AS totalClients FROM clients');
    const [[{ totalProjects }]] = await pool.query('SELECT COUNT(*) AS totalProjects FROM projects');
    const [[{ activeProjects }]] = await pool.query("SELECT COUNT(*) AS activeProjects FROM projects WHERE status IN ('Ongoing','Delayed')");
    const [[{ completedProjects }]] = await pool.query("SELECT COUNT(*) AS completedProjects FROM projects WHERE status = 'Completed'");
    const [[{ totalProjectAmount }]] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) AS totalProjectAmount FROM projects');
    const [[{ totalPaid }]] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM payments');
    const [[{ unreadContacts }]] = await pool.query('SELECT COUNT(*) AS unreadContacts FROM contact_submissions WHERE is_read = 0');
    const totalDue = Number(totalProjectAmount) - Number(totalPaid);
    res.json({ totalClients: Number(totalClients), totalProjects: Number(totalProjects), activeProjects: Number(activeProjects), completedProjects: Number(completedProjects), totalProjectAmount: Number(totalProjectAmount), totalPaid: Number(totalPaid), totalDue: Math.max(0, totalDue), unreadContacts: Number(unreadContacts) });
  } catch (err) { console.error('Dashboard stats error:', err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/dashboard/due-alerts
router.get('/due-alerts', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM (
        SELECT c.id, c.company_name, c.contact_person, c.email, c.phone,
          COALESCE(ps.total_project_amount, 0) AS total_project_amount,
          COALESCE(pm.total_paid, 0) AS total_paid,
          (COALESCE(ps.total_project_amount, 0) - COALESCE(pm.total_paid, 0)) AS due_amount
        FROM clients c
        LEFT JOIN (SELECT client_id, SUM(total_amount) AS total_project_amount FROM projects GROUP BY client_id) ps ON ps.client_id = c.id
        LEFT JOIN (SELECT client_id, SUM(amount) AS total_paid FROM payments GROUP BY client_id) pm ON pm.client_id = c.id
      ) AS sub
      WHERE sub.due_amount > 0
      ORDER BY sub.due_amount DESC
    `);
    res.json(rows);
  } catch (err) { console.error('Due alerts error:', err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/dashboard/recent-payments
router.get('/recent-payments', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pay.*, p.name AS project_name, c.company_name AS client_name
      FROM payments pay LEFT JOIN projects p ON p.id = pay.project_id LEFT JOIN clients c ON c.id = pay.client_id
      ORDER BY pay.payment_date DESC, pay.created_at DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) { console.error('Recent payments error:', err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
