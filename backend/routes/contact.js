import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// POST /api/contact — public (landing page form)
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, project_type, message } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const [result] = await pool.query(
      'INSERT INTO contact_submissions (name, phone, email, project_type, message) VALUES (?, ?, ?, ?, ?)',
      [name, phone || null, email || null, project_type || null, message || null]
    );
    req.app.get('io')?.emit('data_changed', { type: 'new_enquiry', data: { id: result.insertId, name } });
    res.status(201).json({ id: result.insertId, message: 'Enquiry submitted successfully' });
  } catch (err) { console.error('Contact submit error:', err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/contact — admin only
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { console.error('Get contacts error:', err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/contact/:id/read — mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE contact_submissions SET is_read = 1 WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'contact_read', id: req.params.id });
    res.json({ message: 'Marked as read' });
  } catch (err) { console.error('Mark read error:', err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
