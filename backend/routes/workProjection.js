import { Router } from 'express';
import multer from 'multer';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { recalculateDues, ensurePaymentSchedule } from '../services/paymentLedger.js';
import { syncDueReminders } from '../services/dueReminderSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// ─── Multer config for proof images ────────────────────────────────────────
const uploadDir = join(__dirname, '..', 'uploads', 'work-projection');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `wp_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  },
});

// ─── Helper to get Milestones ──────────────────────────────────────────────
async function getMilestones() {
  const [rows] = await pool.query('SELECT name, percentage, milestone_order as `order` FROM work_projection_milestones WHERE is_active = TRUE ORDER BY milestone_order ASC');
  return rows.map(r => ({ name: r.name, percentage: Number(r.percentage), order: r.order }));
}

// ─── GET /api/work-projection/milestones — Get predefined milestones ───────
router.get('/milestones', verifyToken, async (_req, res) => {
  try {
    const milestones = await getMilestones();
    res.json(milestones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/work-projection/all — List all clients with projection summary
router.get('/all', verifyToken, async (_req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT
        c.id, c.unique_client_id, c.name, c.phone, c.email,
        f.flat_number, f.total_amount,
        a.name AS apartment_name,
        p.name AS property_name,
        COALESCE(wp.completed_pct, 0) AS completed_percentage,
        COALESCE(wp.milestone_count, 0) AS completed_milestones,
        wp.last_updated
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN properties p ON a.property_id = p.id
      LEFT JOIN (
        SELECT
          client_id,
          SUM(milestone_percentage) AS completed_pct,
          COUNT(*) AS milestone_count,
          MAX(updated_at) AS last_updated
        FROM work_projections
        WHERE status = 'completed'
        GROUP BY client_id
      ) wp ON wp.client_id = c.id
      ORDER BY c.name ASC
    `);
    res.json(clients);
  } catch (err) {
    console.error('Get all work projections error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/work-projection/summary/:clientId — Aggregated summary ───────
router.get('/summary/:clientId', verifyToken, async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);

    // Get client info
    const [clientRows] = await pool.query(`
      SELECT
        c.id, c.unique_client_id, c.name, c.phone, c.email,
        f.flat_number, f.total_amount,
        COALESCE(NULLIF(f.gst_percent, 0), (
          SELECT pp.gst_percent
          FROM payment_plans pp
          WHERE pp.apartment_id = a.id AND pp.is_active = TRUE
          ORDER BY pp.id DESC
          LIMIT 1
        ), 0) AS flat_gst_percent,
        f.floor, f.block,
        a.name AS apartment_name,
        p.name AS property_name
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN properties p ON a.property_id = p.id
      WHERE c.id = ?
    `, [clientId]);

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientRows[0];
    const totalAmount = Number(client.total_amount || 0);
    const gstPercent = Number(client.flat_gst_percent || 0);

    // Get completed milestones
    const [milestones] = await pool.query(
      'SELECT * FROM work_projections WHERE client_id = ? ORDER BY milestone_order ASC',
      [clientId]
    );

    // Get total paid from client_payments
    const [paidRows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid, COALESCE(SUM(gst_amount), 0) AS total_paid_gst FROM client_payments WHERE client_id = ?',
      [clientId]
    );

    const totalPaid = Number(paidRows[0].total_paid || 0);
    const totalPaidGst = Number(paidRows[0].total_paid_gst || 0);
    const totalPaidWithGst = totalPaid + totalPaidGst;
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const totalCompletedPercentage = completedMilestones.reduce((sum, m) => sum + Number(m.milestone_percentage), 0);
    const totalDueGenerated = (totalAmount * totalCompletedPercentage) / 100;
    const dueGstAmount = totalDueGenerated * (gstPercent / 100);
    const grandTotalAmount = totalAmount + (totalAmount * gstPercent / 100);
    const totalDueGeneratedWithGst = totalDueGenerated + dueGstAmount;
    const remainingCollectable = totalDueGenerated - totalPaid;
    const overallRemainingWithGst = Math.max(0, grandTotalAmount - totalPaidWithGst);
    const totalPendingPercentage = 100 - totalCompletedPercentage;

    const MILESTONES = await getMilestones();

    // Build full milestone list (completed + pending)
    const completedNames = new Set(completedMilestones.map(m => m.milestone_name));
    const allMilestones = MILESTONES.map(m => {
      const completed = milestones.find(cm => cm.milestone_name === m.name);
      if (completed) {
        return {
          ...completed,
          milestone_percentage: Number(completed.milestone_percentage),
        };
      }
      return {
        id: null,
        client_id: clientId,
        flat_id: client.flat_id || null,
        milestone_name: m.name,
        milestone_percentage: m.percentage,
        milestone_order: m.order,
        completion_date: null,
        notes: null,
        proof_image: null,
        status: 'pending',
        created_by: null,
        created_at: null,
        updated_at: null,
      };
    });

    const lastCompleted = completedMilestones.length > 0
      ? completedMilestones[completedMilestones.length - 1].updated_at
      : null;

    let scheduleDue = null;
    try {
      scheduleDue = await ensurePaymentSchedule(clientId);
    } catch (err) {
      scheduleDue = null;
    }

    const scheduleCombined = Number(scheduleDue?.combined_due || 0);
    const scheduleNext = Number(scheduleDue?.next_stage_amount || 0);
    const scheduleNextInstallment = Number(scheduleDue?.next_installment_amount || scheduleNext || 0);
    const scheduleCarryOver = Math.max(0, scheduleNextInstallment - scheduleNext);

    res.json({
      client: {
        id: client.id,
        name: client.name,
        unique_client_id: client.unique_client_id,
        phone: client.phone,
        email: client.email,
        apartment_name: client.apartment_name || '',
        property_name: client.property_name || '',
        flat_number: client.flat_number || '',
        floor: client.floor || '',
        block: client.block || '',
      },
      total_property_amount: totalAmount,
      gst_percent: gstPercent,
      gst_amount: totalAmount * gstPercent / 100,
      grand_total_amount: grandTotalAmount,
      total_paid: totalPaid,
      total_completed_percentage: totalCompletedPercentage,
      total_due_generated: totalDueGenerated,
      total_due_generated_gst: dueGstAmount,
      total_due_generated_with_gst: totalDueGeneratedWithGst,
      remaining_collectable: Math.max(0, remainingCollectable),
      remaining_collectable_gst: Math.max(0, remainingCollectable * (gstPercent / 100)),
      remaining_collectable_with_gst: overallRemainingWithGst,
      total_paid_with_gst: totalPaidWithGst,
      advance_payment: Math.max(0, Math.round((totalPaidWithGst - totalDueGeneratedWithGst) * 100) / 100),
      total_pending_percentage: totalPendingPercentage,
      milestones: allMilestones,
      last_updated: lastCompleted,
      schedule_current_stage: scheduleDue?.current_stage || null,
      schedule_next_stage: scheduleDue?.next_stage || null,
      schedule_current_due: scheduleDue?.current_due ?? scheduleDue?.current_stage_due ?? null,
      schedule_next_stage_amount: scheduleNext || null,
      schedule_next_installment_amount: scheduleNextInstallment || null,
      schedule_carry_over: scheduleCarryOver || null,
      schedule_combined_due: scheduleCombined || null,
    });
  } catch (err) {
    console.error('Get work projection summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/work-projection/:clientId — Get milestones for a client ──────
router.get('/:clientId', verifyToken, async (req, res) => {
  try {
    const [milestones] = await pool.query(
      'SELECT * FROM work_projections WHERE client_id = ? ORDER BY milestone_order ASC',
      [Number(req.params.clientId)]
    );
    res.json(milestones);
  } catch (err) {
    console.error('Get work projections error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/work-projection — Add a completed milestone ─────────────────
router.post('/', verifyToken, upload.single('proof_image'), async (req, res) => {
  try {
    const { client_id, milestone_name, completion_date, due_date, notes } = req.body;

    if (!client_id || !milestone_name) {
      return res.status(400).json({ error: 'client_id and milestone_name are required' });
    }

    const MILESTONES = await getMilestones();

    // Find milestone definition
    const milestoneDef = MILESTONES.find(m => m.name === milestone_name);
    if (!milestoneDef) {
      return res.status(400).json({ error: 'Invalid milestone name' });
    }

    // Check for duplicate
    const [existing] = await pool.query(
      'SELECT id FROM work_projections WHERE client_id = ? AND milestone_name = ?',
      [client_id, milestone_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: `Milestone "${milestone_name}" is already completed for this client` });
    }

    // Check total won't exceed 100%
    const [currentTotal] = await pool.query(
      'SELECT COALESCE(SUM(milestone_percentage), 0) AS total FROM work_projections WHERE client_id = ? AND status = ?',
      [client_id, 'completed']
    );
    const currentPct = Number(currentTotal[0].total);
    if (currentPct + milestoneDef.percentage > 100) {
      return res.status(400).json({ error: `Adding this milestone would exceed 100%. Current: ${currentPct}%, This: ${milestoneDef.percentage}%` });
    }

    // Get client's flat_id and total amount
    const [clientRows] = await pool.query(`
      SELECT c.flat_id, b.id as booking_id, COALESCE(b.flat_value, f.total_amount, 0) as total_amount,
        COALESCE(NULLIF(f.gst_percent, 0), (
          SELECT pp.gst_percent
          FROM payment_plans pp
          WHERE pp.apartment_id = a.id AND pp.is_active = TRUE
          ORDER BY pp.id DESC
          LIMIT 1
        ), 0) AS gst_percent
      FROM clients c
      LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      WHERE c.id = ?
    `, [client_id]);
    
    const flatId = clientRows.length > 0 ? clientRows[0].flat_id : null;
    const bookingId = clientRows.length > 0 ? clientRows[0].booking_id : null;
    const totalAmount = clientRows.length > 0 ? Number(clientRows[0].total_amount) : 0;
    const gstPercent = clientRows.length > 0 ? Number(clientRows[0].gst_percent || 0) : 0;

    // Handle proof image
    const proofImage = req.file ? `/uploads/work-projection/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO work_projections
       (client_id, flat_id, milestone_name, milestone_percentage, milestone_order, completion_date, notes, proof_image, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        client_id, flatId, milestone_name, milestoneDef.percentage, milestoneDef.order,
        completion_date || new Date().toISOString().split('T')[0],
        notes || null, proofImage,
        req.user?.id || null,
      ]
    );

    // Sync to payment_schedules so it shows up in due reminders
    if (totalAmount > 0) {
      const amount = (totalAmount * milestoneDef.percentage) / 100;
      const [existingSchedule] = await pool.query(
        'SELECT id FROM payment_schedules WHERE client_id = ? AND stage_name = ?',
        [client_id, milestone_name]
      );
      if (existingSchedule.length === 0) {
        const [maxOrder] = await pool.query('SELECT MAX(stage_order) as max_order FROM payment_schedules WHERE client_id = ?', [client_id]);
        const nextOrder = (maxOrder[0].max_order || 0) + 1;
        const gstAmount = amount * (gstPercent / 100);
        await pool.query(
          `INSERT INTO payment_schedules (client_id, flat_id, booking_id, stage_order, stage_name, percentage, amount, gst_amount, due_amount, status, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [client_id, flatId, bookingId, nextOrder, milestone_name, milestoneDef.percentage, amount, gstAmount, amount, due_date || completion_date || new Date().toISOString().split('T')[0]]
        );
      }
    }
    
    await recalculateDues(client_id, pool);
    await syncDueReminders(Number(client_id), pool);

    const [inserted] = await pool.query('SELECT * FROM work_projections WHERE id = ?', [result.insertId]);

    // Emit socket event
    req.app.get('io')?.emit('data_changed', { type: 'work_projection_updated', data: { client_id } });

    res.status(201).json({ message: 'Milestone completed', projection: inserted[0] });
  } catch (err) {
    console.error('Create work projection error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This milestone is already completed for this client' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/work-projection/bulk-delete — Bulk remove a milestone ──────────
router.post('/bulk-delete', verifyToken, async (req, res) => {
  try {
    const { client_ids, milestone_name } = req.body;
    if (!client_ids || !client_ids.length || !milestone_name) {
      return res.status(400).json({ error: 'client_ids array and milestone_name are required' });
    }

    // Identify which clients actually have this milestone completed
    const [existing] = await pool.query(
      'SELECT id, client_id FROM work_projections WHERE client_id IN (?) AND milestone_name = ?',
      [client_ids, milestone_name]
    );

    if (existing.length === 0) {
      return res.json({ message: 'No matching milestones found to delete', deletedCount: 0 });
    }

    const idsToDelete = existing.map(e => e.id);
    const clientsToUpdate = [...new Set(existing.map(e => e.client_id))];

    // Delete work projections
    await pool.query('DELETE FROM work_projections WHERE id IN (?)', [idsToDelete]);

    // Delete corresponding payment_schedules that are pending
    await pool.query(
      'DELETE FROM payment_schedules WHERE client_id IN (?) AND stage_name = ? AND status != "paid"',
      [clientsToUpdate, milestone_name]
    );

    // Recalculate dues for affected clients
    for (const clientId of clientsToUpdate) {
      await recalculateDues(clientId, pool);
      await syncDueReminders(clientId, pool);
      req.app.get('io')?.emit('data_changed', { type: 'work_projection_updated', data: { client_id: clientId } });
    }

    res.json({ message: `Successfully removed milestone for ${clientsToUpdate.length} clients`, deletedCount: clientsToUpdate.length });
  } catch (err) {
    console.error('Bulk delete work projection error:', err);
    res.status(500).json({ error: 'Server error during bulk delete' });
  }
});

// ─── PUT /api/work-projection/:id — Edit a milestone ───────────────────────
router.put('/:id', verifyToken, upload.single('proof_image'), async (req, res) => {
  try {
    const { completion_date, notes } = req.body;
    const id = Number(req.params.id);

    // Check exists
    const [existing] = await pool.query('SELECT * FROM work_projections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Work projection entry not found' });
    }

    // Handle proof image (keep existing if no new upload)
    const proofImage = req.file
      ? `/uploads/work-projection/${req.file.filename}`
      : existing[0].proof_image;

    await pool.query(
      `UPDATE work_projections SET completion_date = ?, notes = ?, proof_image = ? WHERE id = ?`,
      [
        completion_date || existing[0].completion_date,
        notes !== undefined ? notes : existing[0].notes,
        proofImage,
        id,
      ]
    );

    await pool.query(
      `UPDATE payment_schedules
       SET due_date = ?
       WHERE client_id = ? AND stage_name = ? AND status != 'paid'`,
      [completion_date || existing[0].completion_date, existing[0].client_id, existing[0].milestone_name]
    );
    await recalculateDues(existing[0].client_id, pool);
    await syncDueReminders(existing[0].client_id, pool);

    const [updated] = await pool.query('SELECT * FROM work_projections WHERE id = ?', [id]);

    req.app.get('io')?.emit('data_changed', { type: 'work_projection_updated', data: { client_id: existing[0].client_id } });

    res.json({ message: 'Milestone updated', projection: updated[0] });
  } catch (err) {
    console.error('Update work projection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/work-projection/:id — Remove a milestone entry ────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [existing] = await pool.query('SELECT client_id, milestone_name FROM work_projections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Work projection entry not found' });
    }

    await pool.query('DELETE FROM work_projections WHERE id = ?', [id]);

    // Also remove from payment_schedules if it exists and is pending
    await pool.query(
      'DELETE FROM payment_schedules WHERE client_id = ? AND stage_name = ? AND status != "paid"',
      [existing[0].client_id, existing[0].milestone_name]
    );

    await recalculateDues(existing[0].client_id, pool);
    await syncDueReminders(existing[0].client_id, pool);

    req.app.get('io')?.emit('data_changed', { type: 'work_projection_updated', data: { client_id: existing[0].client_id } });

    res.json({ message: 'Milestone entry removed' });
  } catch (err) {
    console.error('Delete work projection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
