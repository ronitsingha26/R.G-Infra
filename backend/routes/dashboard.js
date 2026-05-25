import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [[{ totalClients }]] = await pool.query('SELECT COUNT(*) AS totalClients FROM clients');
    const [[{ totalApartments }]] = await pool.query('SELECT COUNT(*) AS totalApartments FROM apartments');
    const [[{ totalFlats }]] = await pool.query('SELECT COUNT(*) AS totalFlats FROM flats');
    const [[{ bookedFlats }]] = await pool.query('SELECT COUNT(*) AS bookedFlats FROM flats WHERE is_available = FALSE');

    // Flat-based financial totals
    const [[{ totalFlatSales }]] = await pool.query('SELECT COALESCE(SUM(f.total_amount), 0) AS totalFlatSales FROM clients c JOIN flats f ON c.flat_id = f.id');
    const [[{ totalFlatPaid }]] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS totalFlatPaid FROM client_payments');
    const totalFlatDue = Math.max(0, Number(totalFlatSales) - Number(totalFlatPaid));

    // Unread contacts (graceful — table may not exist)
    let unreadContacts = 0;
    try {
      const [[row]] = await pool.query('SELECT COUNT(*) AS cnt FROM contact_submissions WHERE is_read = 0');
      unreadContacts = Number(row.cnt);
    } catch { /* table may not exist yet */ }

    res.json({
      totalClients: Number(totalClients),
      totalApartments: Number(totalApartments),
      totalFlats: Number(totalFlats),
      bookedFlats: Number(bookedFlats),
      // Keep legacy keys so frontend doesn't break
      totalProjects: Number(totalApartments),
      activeProjects: Number(bookedFlats),
      completedProjects: 0,
      totalProjectAmount: Number(totalFlatSales),
      totalPaid: Number(totalFlatPaid),
      totalDue: totalFlatDue,
      unreadContacts,
      totalFlatSales: Number(totalFlatSales),
      totalFlatPaid: Number(totalFlatPaid),
      totalFlatDue,
    });
  } catch (err) { console.error('Dashboard stats error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/due-alerts ────────────────────────────────────────
router.get('/due-alerts', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.name, c.unique_client_id, c.email, c.phone,
        f.flat_number, a.name as apartment_name,
        COALESCE(f.total_amount, 0) AS total_amount,
        COALESCE(cp.paid, 0) AS total_paid,
        (COALESCE(f.total_amount, 0) - COALESCE(cp.paid, 0)) AS due_amount
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN (
        SELECT client_id, SUM(amount) as paid FROM client_payments GROUP BY client_id
      ) cp ON cp.client_id = c.id
      HAVING due_amount > 0
      ORDER BY due_amount DESC
    `);
    res.json(rows);
  } catch (err) { console.error('Due alerts error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/recent-payments ───────────────────────────────────
router.get('/recent-payments', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cp.*, c.name AS client_name, c.unique_client_id,
        f.flat_number, a.name AS apartment_name
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON cp.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      ORDER BY cp.payment_date DESC, cp.created_at DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) { console.error('Recent payments error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS (Charts + Premium Dashboard)
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/analytics/collection-trend ────────────────────────
// Monthly payment collection over last 12 months
router.get('/analytics/collection-trend', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') AS month,
        DATE_FORMAT(payment_date, '%b %Y') AS label,
        SUM(amount) AS total_collected,
        COUNT(*) AS payment_count
      FROM client_payments
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
      ORDER BY month ASC
    `);
    res.json(rows);
  } catch (err) { console.error('Collection trend error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/analytics/apartment-sales ─────────────────────────
// Total sales grouped by apartment
router.get('/analytics/apartment-sales', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id as apartment_id, a.name as apartment_name,
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT f.id) as total_flats_sold,
        COALESCE(SUM(f.total_amount), 0) as total_sales,
        COALESCE(SUM(cp.paid), 0) as total_collected,
        (COALESCE(SUM(f.total_amount), 0) - COALESCE(SUM(cp.paid), 0)) as total_due
      FROM apartments a
      LEFT JOIN flats f ON f.apartment_id = a.id AND f.is_available = FALSE
      LEFT JOIN clients c ON c.flat_id = f.id
      LEFT JOIN (
        SELECT client_id, SUM(amount) as paid FROM client_payments GROUP BY client_id
      ) cp ON cp.client_id = c.id
      GROUP BY a.id, a.name
      ORDER BY total_sales DESC
    `);
    res.json(rows);
  } catch (err) { console.error('Apartment sales error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/analytics/due-vs-paid ─────────────────────────────
// Per-client due vs paid breakdown
router.get('/analytics/due-vs-paid', verifyToken, async (req, res) => {
  try {
    const { apartment_id } = req.query;
    let whereClause = '';
    const params = [];
    if (apartment_id) {
      whereClause = 'WHERE f.apartment_id = ?';
      params.push(apartment_id);
    }

    const [rows] = await pool.query(`
      SELECT 
        c.id as client_id, c.name as client_name, c.unique_client_id,
        c.phone, c.email,
        f.flat_number, a.name as apartment_name,
        COALESCE(f.total_amount, 0) as total_amount,
        COALESCE(cp.paid, 0) as paid_amount,
        (COALESCE(f.total_amount, 0) - COALESCE(cp.paid, 0)) as due_amount
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN (
        SELECT client_id, SUM(amount) as paid FROM client_payments GROUP BY client_id
      ) cp ON cp.client_id = c.id
      ${whereClause}
      ORDER BY due_amount DESC
    `, params);
    res.json(rows);
  } catch (err) { console.error('Due vs paid error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/analytics/payment-history ─────────────────────────
// Filterable client payment history
router.get('/analytics/payment-history', verifyToken, async (req, res) => {
  try {
    const { client_id, apartment_id, from_date, to_date } = req.query;
    let conditions = [];
    const params = [];

    if (client_id) { conditions.push('cp.client_id = ?'); params.push(client_id); }
    if (apartment_id) { conditions.push('f.apartment_id = ?'); params.push(apartment_id); }
    if (from_date) { conditions.push('cp.payment_date >= ?'); params.push(from_date); }
    if (to_date) { conditions.push('cp.payment_date <= ?'); params.push(to_date); }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT 
        cp.*, c.name as client_name, c.unique_client_id,
        f.flat_number, a.name as apartment_name
      FROM client_payments cp
      LEFT JOIN clients c ON cp.client_id = c.id
      LEFT JOIN flats f ON cp.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      ${whereClause}
      ORDER BY cp.payment_date DESC
      LIMIT 100
    `, params);
    res.json(rows);
  } catch (err) { console.error('Payment history error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/analytics/due-list ────────────────────────────────
// Clients with pending dues (filterable)
router.get('/analytics/due-list', verifyToken, async (req, res) => {
  try {
    const { apartment_id } = req.query;
    let whereClause = 'HAVING due_amount > 0';
    const params = [];
    if (apartment_id) {
      whereClause = 'WHERE f.apartment_id = ? HAVING due_amount > 0';
      params.push(apartment_id);
    }

    const [rows] = await pool.query(`
      SELECT 
        c.id as client_id, c.name as client_name, c.unique_client_id,
        c.phone, c.email,
        f.flat_number, a.name as apartment_name,
        COALESCE(f.total_amount, 0) as total_amount,
        COALESCE(cp.paid, 0) as paid_amount,
        (COALESCE(f.total_amount, 0) - COALESCE(cp.paid, 0)) as due_amount,
        d.current_stage_name, d.combined_due, d.next_stage_name
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN (
        SELECT client_id, SUM(amount) as paid FROM client_payments GROUP BY client_id
      ) cp ON cp.client_id = c.id
      LEFT JOIN dues d ON d.client_id = c.id
      ${whereClause}
      ORDER BY due_amount DESC
    `, params);
    res.json(rows);
  } catch (err) { console.error('Due list error:', err); res.status(500).json({ error: 'Server error' }); }
});

// ─── GET /api/dashboard/analytics/stage-progress ──────────────────────────
// Overall stage-wise collection progress
router.get('/analytics/stage-progress', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ps.stage_name, ps.stage_order,
        COUNT(*) as total_clients,
        SUM(CASE WHEN ps.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN ps.status = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN ps.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(ps.amount), 0) as total_stage_amount,
        COALESCE(SUM(ps.paid_amount), 0) as total_stage_paid,
        COALESCE(SUM(ps.due_amount), 0) as total_stage_due
      FROM payment_schedules ps
      GROUP BY ps.stage_name, ps.stage_order
      ORDER BY ps.stage_order ASC
    `);
    res.json(rows);
  } catch (err) { console.error('Stage progress error:', err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
