import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

function mapApartmentProject(row) {
  const totalAmount = Number(row.total_amount || 0);
  const totalPaid = Number(row.total_paid || 0);
  return {
    id: row.id,
    name: row.name,
    client_id: row.client_id,
    client_name: row.client_name,
    client_email: row.client_email,
    client_contact: row.client_contact,
    location: row.location,
    description: row.description,
    total_amount: totalAmount,
    total_paid: totalPaid,
    due_amount: Math.max(0, totalAmount - totalPaid),
    status: row.status,
    progress: row.progress,
    start_date: row.start_date,
    deadline: row.deadline,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const projectSelect = `
  SELECT
    a.id,
    a.name,
    p.address AS location,
    CONCAT_WS(' ', 'Apartment with', NULLIF(a.total_flats, 0), 'flats') AS description,
    COALESCE(SUM(f.total_amount), 0) AS total_amount,
    COALESCE(SUM(cp.total_paid), 0) AS total_paid,
    MIN(c.id) AS client_id,
    MIN(c.name) AS client_name,
    MIN(c.email) AS client_email,
    MIN(c.phone) AS client_contact,
    CASE
      WHEN COUNT(f.id) = 0 THEN 'Planning'
      WHEN SUM(CASE WHEN f.is_available = FALSE THEN 1 ELSE 0 END) >= COUNT(f.id) THEN 'Completed'
      WHEN SUM(CASE WHEN f.is_available = FALSE THEN 1 ELSE 0 END) > 0 THEN 'In Progress'
      ELSE 'Planning'
    END AS status,
    CASE
      WHEN COUNT(f.id) = 0 THEN 0
      ELSE ROUND((SUM(CASE WHEN f.is_available = FALSE THEN 1 ELSE 0 END) / COUNT(f.id)) * 100)
    END AS progress,
    a.created_at,
    a.updated_at,
    NULL AS start_date,
    NULL AS deadline
  FROM apartments a
  LEFT JOIN properties p ON p.id = a.property_id
  LEFT JOIN flats f ON f.apartment_id = a.id
  LEFT JOIN clients c ON c.flat_id = f.id
  LEFT JOIN (
    SELECT c2.flat_id, SUM(cp.amount) AS total_paid
    FROM client_payments cp
    JOIN clients c2 ON c2.id = cp.client_id
    GROUP BY c2.flat_id
  ) cp ON cp.flat_id = f.id
`;

// Legacy /api/projects endpoint backed by current apartment/flat schema.
router.get('/', verifyToken, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      ${projectSelect}
      GROUP BY a.id, a.name, p.address, a.total_flats, a.created_at, a.updated_at
      ORDER BY a.created_at DESC
    `);
    res.json(rows.map(mapApartmentProject));
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [projects] = await pool.query(`
      ${projectSelect}
      WHERE a.id = ?
      GROUP BY a.id, a.name, p.address, a.total_flats, a.created_at, a.updated_at
    `, [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });

    const [payments] = await pool.query(`
      SELECT cp.id, ? AS project_id, cp.client_id, cp.amount, cp.payment_date, cp.payment_mode,
        cp.reference_no, 0 AS email_sent, a.name AS project_name, c.name AS client_name,
        c.email AS client_email, cp.created_at
      FROM client_payments cp
      JOIN clients c ON c.id = cp.client_id
      JOIN flats f ON f.id = cp.flat_id
      JOIN apartments a ON a.id = f.apartment_id
      WHERE a.id = ?
      ORDER BY cp.payment_date DESC, cp.created_at DESC
    `, [req.params.id, req.params.id]);

    res.json({ ...mapApartmentProject(projects[0]), payments });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, location, total_flats } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    let propertyId = null;
    if (location) {
      const [propertyResult] = await pool.query(
        'INSERT INTO properties (name, address) VALUES (?, ?) ON DUPLICATE KEY UPDATE address = VALUES(address), id = LAST_INSERT_ID(id)',
        [name, location]
      );
      propertyId = propertyResult.insertId;
    }

    const [result] = await pool.query(
      'INSERT INTO apartments (property_id, name, total_flats) VALUES (?, ?, ?)',
      [propertyId, name, total_flats || null]
    );

    const [rows] = await pool.query(`${projectSelect} WHERE a.id = ? GROUP BY a.id, a.name, p.address, a.total_flats, a.created_at, a.updated_at`, [result.insertId]);
    const project = mapApartmentProject(rows[0]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added', data: project });
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, location, total_flats } = req.body;
    await pool.query('UPDATE apartments SET name = ?, total_flats = COALESCE(?, total_flats) WHERE id = ?', [name, total_flats || null, req.params.id]);
    if (location !== undefined) {
      await pool.query(
        `UPDATE properties p
         JOIN apartments a ON a.property_id = p.id
         SET p.address = ?
         WHERE a.id = ?`,
        [location || null, req.params.id]
      );
    }

    const [rows] = await pool.query(`${projectSelect} WHERE a.id = ? GROUP BY a.id, a.name, p.address, a.total_flats, a.created_at, a.updated_at`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const project = mapApartmentProject(rows[0]);
    req.app.get('io')?.emit('data_changed', { type: 'project_updated', data: project });
    res.json(project);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM apartments WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted', id: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
