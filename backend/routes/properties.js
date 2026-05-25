import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/properties
router.get('/', verifyToken, async (req, res) => {
  try {
    const [properties] = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json(properties);
  } catch (err) {
    console.error('Get properties error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/properties
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, address, land_north, land_south, land_east, land_west } = req.body;
    if (!name) return res.status(400).json({ error: 'Property name is required' });

    const [result] = await pool.query(
      `INSERT INTO properties (name, address, land_north, land_south, land_east, land_west)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, address || null, land_north || null, land_south || null, land_east || null, land_west || null]
    );
    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added' });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Property name already exists' });
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/properties/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, address, land_north, land_south, land_east, land_west } = req.body;
    if (!name) return res.status(400).json({ error: 'Property name is required' });

    await pool.query(
      `UPDATE properties
       SET name = ?, address = ?, land_north = ?, land_south = ?, land_east = ?, land_west = ?
       WHERE id = ?`,
      [name, address || null, land_north || null, land_south || null, land_east || null, land_west || null, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    req.app.get('io')?.emit('data_changed', { type: 'project_updated' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Property name already exists' });
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM properties WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted' });
    res.json({ message: 'Property deleted' });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
