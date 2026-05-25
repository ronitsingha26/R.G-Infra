import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/payment-stages — List all stages (ordered) ───────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [stages] = await pool.query('SELECT * FROM payment_stages ORDER BY stage_order ASC');
    res.json(stages);
  } catch (err) {
    console.error('Get payment stages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/payment-stages — Create a new stage ─────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { stage_name, percentage, stage_order } = req.body;
    if (!stage_name || percentage === undefined) {
      return res.status(400).json({ error: 'stage_name and percentage are required' });
    }

    // Auto-assign stage_order if not provided
    let order = stage_order;
    if (order === undefined || order === null) {
      const [maxOrder] = await pool.query('SELECT MAX(stage_order) as maxOrder FROM payment_stages');
      order = (maxOrder[0].maxOrder || 0) + 1;
    }

    const [result] = await pool.query(
      'INSERT INTO payment_stages (stage_name, percentage, stage_order) VALUES (?, ?, ?)',
      [stage_name, percentage, order]
    );

    const [rows] = await pool.query('SELECT * FROM payment_stages WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'stage_added' });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create payment stage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/payment-stages/:id — Update a stage ──────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { stage_name, percentage, stage_order } = req.body;

    await pool.query(
      'UPDATE payment_stages SET stage_name = ?, percentage = ?, stage_order = ? WHERE id = ?',
      [stage_name, percentage, stage_order, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM payment_stages WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Stage not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update payment stage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/payment-stages/:id ────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM payment_stages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stage deleted' });
  } catch (err) {
    console.error('Delete payment stage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/payment-stages/bulk — Bulk set all stages ──────────────────
router.post('/bulk', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { stages } = req.body; // [{ stage_name, percentage, stage_order }]
    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ error: 'stages array is required' });
    }

    // Validate total percentage = 100
    const totalPct = stages.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      return res.status(400).json({ error: `Total percentage must be 100%. Currently: ${totalPct}%` });
    }

    await connection.beginTransaction();

    // Clear existing stages
    await connection.query('DELETE FROM payment_stages');

    // Insert new stages
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      await connection.query(
        'INSERT INTO payment_stages (stage_name, percentage, stage_order) VALUES (?, ?, ?)',
        [s.stage_name, s.percentage, s.stage_order || i + 1]
      );
    }

    await connection.commit();

    const [allStages] = await pool.query('SELECT * FROM payment_stages ORDER BY stage_order ASC');
    req.app.get('io')?.emit('data_changed', { type: 'stages_updated' });
    res.json({ message: 'Stages updated', stages: allStages });
  } catch (err) {
    await connection.rollback();
    console.error('Bulk set stages error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
