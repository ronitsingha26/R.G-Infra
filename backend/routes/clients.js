import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/clients — list all clients with payment summary
router.get('/', verifyToken, async (req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT c.*,
        COALESCE(ps.total_projects, 0) AS total_projects,
        COALESCE(ps.total_project_amount, 0) AS total_project_amount,
        COALESCE(pm.total_paid, 0) AS total_paid
      FROM clients c
      LEFT JOIN (
        SELECT client_id, COUNT(*) AS total_projects, SUM(total_amount) AS total_project_amount
        FROM projects GROUP BY client_id
      ) ps ON ps.client_id = c.id
      LEFT JOIN (
        SELECT client_id, SUM(amount) AS total_paid
        FROM payments GROUP BY client_id
      ) pm ON pm.client_id = c.id
      ORDER BY c.created_at DESC
    `);

    const result = clients.map((c) => ({
      ...c,
      total_due: Number(c.total_project_amount || 0) - Number(c.total_paid || 0),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clients/:id — single client with projects & payments
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [clients] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (clients.length === 0) return res.status(404).json({ error: 'Client not found' });

    const client = clients[0];

    const [projects] = await pool.query(`
      SELECT p.*,
        COALESCE(pm.total_paid, 0) AS total_paid
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(amount) AS total_paid
        FROM payments GROUP BY project_id
      ) pm ON pm.project_id = p.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.id]);

    const [payments] = await pool.query(`
      SELECT pay.*, p.name AS project_name
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      WHERE pay.client_id = ?
      ORDER BY pay.payment_date DESC
    `, [req.params.id]);

    const totalProjectAmount = projects.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    res.json({
      ...client,
      projects: projects.map((p) => ({
        ...p,
        due_amount: Number(p.total_amount || 0) - Number(p.total_paid || 0),
      })),
      payments,
      total_project_amount: totalProjectAmount,
      total_paid: totalPaid,
      total_due: totalProjectAmount - totalPaid,
    });
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clients
router.post('/', verifyToken, async (req, res) => {
  try {
    const { company_name, contact_person, phone, email, address, city, state, gstin, notes } = req.body;
    if (!company_name) return res.status(400).json({ error: 'Company name is required' });

    const [result] = await pool.query(
      'INSERT INTO clients (company_name, contact_person, phone, email, address, city, state, gstin, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [company_name, contact_person || null, phone || null, email || null, address || null, city || null, state || null, gstin || null, notes || null]
    );

    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'client_added', data: rows[0] });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/clients/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { company_name, contact_person, phone, email, address, city, state, gstin, notes } = req.body;

    await pool.query(
      'UPDATE clients SET company_name = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, gstin = ?, notes = ? WHERE id = ?',
      [company_name, contact_person || null, phone || null, email || null, address || null, city || null, state || null, gstin || null, notes || null, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    req.app.get('io')?.emit('data_changed', { type: 'client_updated', data: rows[0] });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'client_deleted', id: req.params.id });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
