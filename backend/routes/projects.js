import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/projects — list all with client name & payment summary
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.company_name AS client_name, c.email AS client_email,
        COALESCE(pm.total_paid, 0) AS total_paid
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN (
        SELECT project_id, SUM(amount) AS total_paid
        FROM payments GROUP BY project_id
      ) pm ON pm.project_id = p.id
      ORDER BY p.created_at DESC
    `);

    const result = rows.map((p) => ({
      ...p,
      due_amount: Number(p.total_amount || 0) - Number(p.total_paid || 0),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id — single project detail + payments
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [projects] = await pool.query(`
      SELECT p.*, c.company_name AS client_name, c.email AS client_email, c.contact_person AS client_contact
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `, [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });

    const project = projects[0];

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE project_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    res.json({
      ...project,
      payments,
      total_paid: totalPaid,
      due_amount: Number(project.total_amount || 0) - totalPaid,
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, client_id, location, description, total_amount, status, progress, start_date, deadline } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const [result] = await pool.query(
      'INSERT INTO projects (name, client_id, location, description, total_amount, status, progress, start_date, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, client_id || null, location || null, description || null, total_amount || 0, status || 'Planning', progress || 0, start_date || null, deadline || null]
    );

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added', data: rows[0] });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, client_id, location, description, total_amount, status, progress, start_date, deadline } = req.body;

    await pool.query(
      'UPDATE projects SET name = ?, client_id = ?, location = ?, description = ?, total_amount = ?, status = ?, progress = ?, start_date = ?, deadline = ? WHERE id = ?',
      [name, client_id || null, location || null, description || null, total_amount || 0, status || 'Planning', progress || 0, start_date || null, deadline || null, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    req.app.get('io')?.emit('data_changed', { type: 'project_updated', data: rows[0] });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted', id: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
