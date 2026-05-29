import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { ensurePaymentSchedule, generatePaymentSchedule, recalculateDues } from '../services/paymentLedger.js';
import { syncDueReminders } from '../services/dueReminderSync.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ─── POST /api/payment-schedules/generate/:clientId — Generate schedule ────
// Creates payment_schedule entries for a client based on defined stages
router.post('/generate/:clientId', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const clientId = Number(req.params.clientId);
    const dueInfo = await generatePaymentSchedule(clientId, connection);
    await syncDueReminders(clientId, connection);

    req.app.get('io')?.emit('data_changed', { type: 'schedule_generated', client_id: clientId });

    const [newSchedules] = await connection.query(
      'SELECT * FROM payment_schedules WHERE client_id = ? ORDER BY stage_order ASC',
      [clientId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Payment schedule generated',
      schedules: newSchedules,
      dues: dueInfo,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Generate schedule error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  } finally {
    connection.release();
  }
});

// ─── GET /api/payment-schedules/client/:clientId — Get client's schedule ───
router.get('/client/:clientId', verifyToken, async (req, res) => {
  try {
    const [schedules] = await pool.query(
      'SELECT * FROM payment_schedules WHERE client_id = ? ORDER BY stage_order ASC',
      [req.params.clientId]
    );
    res.json(schedules);
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/payment-schedules/client/:clientId — Add a schedule row ───────
router.post('/client/:clientId', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const clientId = Number(req.params.clientId);
    const { percentage, due_date, stage_name } = req.body;
    
    if (percentage === undefined || isNaN(percentage)) {
      return res.status(400).json({ error: 'Valid percentage is required' });
    }

    await connection.beginTransaction();

    const [clients] = await connection.query(
      `SELECT c.flat_id, f.total_amount 
       FROM clients c 
       LEFT JOIN flats f ON f.id = c.flat_id 
       WHERE c.id = ?`,
      [clientId]
    );

    if (clients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }

    const flatId = clients[0].flat_id;
    const totalAmount = Number(clients[0].total_amount || 0);
    const amount = totalAmount * (Number(percentage) / 100);

    const [existing] = await connection.query(
      'SELECT MAX(stage_order) as max_order FROM payment_schedules WHERE client_id = ?',
      [clientId]
    );
    const nextOrder = (existing[0]?.max_order || 0) + 1;
    const name = stage_name || `Stage ${nextOrder}`;

    await connection.query(
      `INSERT INTO payment_schedules (client_id, flat_id, stage_order, stage_name, percentage, amount, due_date, status, paid_amount, due_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [clientId, flatId, nextOrder, name, Number(percentage), amount, due_date || null, amount]
    );

    await connection.commit();
    await recalculateDues(clientId);
    await syncDueReminders(clientId);
    req.app.get('io')?.emit('data_changed', { type: 'schedule_updated', client_id: clientId });
    
    res.status(201).json({ message: 'Schedule stage added successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Add schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ─── POST /api/payment-schedules/pay — Record a payment ───────────────────
router.post('/pay', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { client_id, amount, amount_includes_gst = false, payment_percentage, payment_date, payment_mode, reference_no, notes } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    await connection.beginTransaction();

    // Get flat_id from client
    const [clients] = await connection.query(
      `SELECT c.flat_id, b.id as booking_id
       FROM clients c
       LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
       WHERE c.id = ?`,
      [client_id]
    );
    if (clients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }

    const [flatRows] = await connection.query('SELECT total_amount, COALESCE(gst_percent, 0) AS gst_percent FROM flats WHERE id = ?', [clients[0].flat_id]);
    const totalAmount = Number(flatRows[0]?.total_amount || 0);
    const gstPercent = Number(flatRows[0]?.gst_percent || 0);

    let finalAmount = Number(amount || 0);
    let finalPercentage = payment_percentage !== undefined && payment_percentage !== null && payment_percentage !== ''
      ? Number(payment_percentage)
      : null;

    if (amount_includes_gst && finalAmount > 0 && gstPercent > 0) {
      finalAmount = finalAmount / (1 + (gstPercent / 100));
      finalPercentage = totalAmount > 0 ? (finalAmount / totalAmount) * 100 : finalPercentage;
    } else if (finalPercentage !== null && !Number.isNaN(finalPercentage) && totalAmount > 0) {
      finalAmount = (totalAmount * finalPercentage) / 100;
    } else if (finalAmount > 0 && totalAmount > 0) {
      finalPercentage = (finalAmount / totalAmount) * 100;
    }

    if (!finalAmount || finalAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Valid amount or percentage is required' });
    }

    await ensurePaymentSchedule(Number(client_id), connection);

    const gstAmount = finalAmount * (gstPercent / 100);

    // Record the payment
    const [result] = await connection.query(
      `INSERT INTO client_payments (client_id, booking_id, flat_id, amount, payment_percentage, gst_amount, payment_date, payment_mode, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        clients[0].booking_id || null,
        clients[0].flat_id,
        finalAmount,
        finalPercentage || 0,
        gstAmount,
        payment_date || new Date(),
        payment_mode || null,
        reference_no || null,
        notes || null,
      ]
    );

    // Recalculate dues
    const dueInfo = await recalculateDues(Number(client_id), connection);
    await syncDueReminders(Number(client_id), connection);
    const [schedules] = await connection.query(
      'SELECT * FROM payment_schedules WHERE client_id = ? ORDER BY stage_order ASC',
      [client_id]
    );

    const [paymentRows] = await connection.query(
      `SELECT cp.id, NULL AS project_id, cp.client_id, cp.amount, cp.gst_amount,
              (COALESCE(cp.amount, 0) + COALESCE(cp.gst_amount, 0)) AS grand_total,
              cp.payment_date, cp.payment_mode, cp.reference_no, 0 AS email_sent,
              c.name AS client_name, c.email AS client_email, c.phone AS client_phone, a.name AS apartment_name, f.flat_number,
              cp.created_at
       FROM client_payments cp
       LEFT JOIN clients c ON c.id = cp.client_id
       LEFT JOIN flats f ON f.id = cp.flat_id
       LEFT JOIN apartments a ON a.id = f.apartment_id
       WHERE cp.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    req.app.get('io')?.emit('data_changed', { type: 'payment_added', data: paymentRows[0] });

    res.status(201).json({
      message: 'Payment recorded',
      payment_id: result.insertId,
      dues: dueInfo,
      schedules,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Record payment error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  } finally {
    connection.release();
  }
});

// ─── GET /api/payment-schedules/payments/:clientId — Client payment history
router.get('/payments/:clientId', verifyToken, async (req, res) => {
  try {
    const [payments] = await pool.query(
      'SELECT * FROM client_payments WHERE client_id = ? ORDER BY payment_date DESC',
      [req.params.clientId]
    );
    res.json(payments);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/payment-schedules/dues/:clientId — Get computed dues ─────────
router.get('/dues/:clientId', verifyToken, async (req, res) => {
  try {
    // Recalculate first for fresh data
    const dueInfo = await ensurePaymentSchedule(Number(req.params.clientId));
    if (!dueInfo) return res.status(404).json({ error: 'No schedule found for this client' });

    const [schedules] = await pool.query(
      'SELECT * FROM payment_schedules WHERE client_id = ? ORDER BY stage_order ASC',
      [req.params.clientId]
    );

    res.json({
      ...dueInfo,
      schedules,
    });
  } catch (err) {
    console.error('Get dues error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  }
});

// ─── GET /api/payment-schedules/pending — All clients with pending dues ────
router.get('/pending', verifyToken, async (req, res) => {
  try {
    await syncDueReminders();
    const [dues] = await pool.query(`
      SELECT d.*,
        COALESCE(d.current_due, d.current_stage_due, d.combined_due, 0) AS current_due,
        COALESCE(d.next_installment_amount, d.next_stage_amount, 0) AS next_installment_amount,
        COALESCE(d.total_payable, COALESCE(d.current_due, d.current_stage_due, d.combined_due, 0) + COALESCE(d.gst_amount, 0)) AS total_payable,
        c.name as client_name, c.unique_client_id, c.phone, c.email,
        f.flat_number, a.name as apartment_name,
        (
          SELECT ps.id
          FROM payment_schedules ps
          WHERE ps.client_id = d.client_id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1
        ) AS current_schedule_id,
        (
          SELECT ps.due_date
          FROM payment_schedules ps
          WHERE ps.client_id = d.client_id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1
        ) AS current_due_date,
        (
          SELECT ps.percentage
          FROM payment_schedules ps
          WHERE ps.client_id = d.client_id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1
        ) AS current_stage_percentage,
        (
          SELECT ps.due_date
          FROM payment_schedules ps
          WHERE ps.client_id = d.client_id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1 OFFSET 1
        ) AS next_due_date,
        (
          SELECT ps.percentage
          FROM payment_schedules ps
          WHERE ps.client_id = d.client_id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1 OFFSET 1
        ) AS next_stage_percentage
      FROM dues d
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN flats f ON d.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      WHERE d.total_due > 0
      ORDER BY current_due DESC
    `);
    res.json(dues);
  } catch (err) {
    console.error('Get pending dues error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/payment-schedules/:id/due-date — Set due date for a stage ────
router.put('/:id/due-date', verifyToken, async (req, res) => {
  try {
    const { due_date } = req.body;
    await pool.query('UPDATE payment_schedules SET due_date = ? WHERE id = ?', [due_date, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM payment_schedules WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    await recalculateDues(rows[0].client_id);
    await syncDueReminders(rows[0].client_id);
    req.app.get('io')?.emit('data_changed', { type: 'schedule_updated', client_id: rows[0].client_id });
    res.json(rows[0]);
  } catch (err) {
    console.error('Set due date error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/payment-schedules/:id/percentage — Set percentage for a stage ────
router.put('/:id/percentage', verifyToken, async (req, res) => {
  try {
    const { percentage } = req.body;
    if (percentage === undefined || isNaN(percentage)) return res.status(400).json({ error: 'Valid percentage is required' });

    const scheduleId = req.params.id;
    const [scheduleRows] = await pool.query('SELECT * FROM payment_schedules WHERE id = ?', [scheduleId]);
    if (scheduleRows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    const schedule = scheduleRows[0];

    const [flatRows] = await pool.query('SELECT total_amount FROM flats WHERE id = ?', [schedule.flat_id]);
    const totalAmount = Number(flatRows[0]?.total_amount || 0);

    const newAmount = totalAmount * (Number(percentage) / 100);

    // Also update due_amount if it hasn't been paid yet. We can just rely on recalculateDues to fix it.
    await pool.query('UPDATE payment_schedules SET percentage = ?, amount = ? WHERE id = ?', [Number(percentage), newAmount, scheduleId]);

    await recalculateDues(schedule.client_id);
    await syncDueReminders(schedule.client_id);

    req.app.get('io')?.emit('data_changed', { type: 'schedule_updated', client_id: schedule.client_id });

    const [updatedRows] = await pool.query('SELECT * FROM payment_schedules WHERE id = ?', [scheduleId]);
    res.json({ message: 'Percentage updated successfully', schedule: updatedRows[0] });
  } catch (err) {
    console.error('Set percentage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/payment-schedules/payment/:id — Delete a payment record ───
router.delete('/payment/:id', verifyToken, async (req, res) => {
  try {
    // Get client_id before deleting
    const [payment] = await pool.query('SELECT client_id FROM client_payments WHERE id = ?', [req.params.id]);
    if (payment.length === 0) return res.status(404).json({ error: 'Payment not found' });

    await pool.query('DELETE FROM client_payments WHERE id = ?', [req.params.id]);

    // Recalculate dues after deletion
    await recalculateDues(payment[0].client_id);
    await syncDueReminders(payment[0].client_id);

    req.app.get('io')?.emit('data_changed', { type: 'payment_deleted', client_id: payment[0].client_id });
    res.json({ message: 'Payment deleted and dues recalculated' });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ─── DELETE /api/payment-schedules/:id — Delete a schedule row ────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_schedules WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });

    const schedule = rows[0];
    if (schedule.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete a fully paid schedule' });
    }

    await pool.query('DELETE FROM payment_schedules WHERE id = ?', [req.params.id]);

    // Reorder remaining stages
    const [remaining] = await pool.query(
      'SELECT id FROM payment_schedules WHERE client_id = ? ORDER BY stage_order ASC',
      [schedule.client_id]
    );
    for (let i = 0; i < remaining.length; i++) {
      await pool.query('UPDATE payment_schedules SET stage_order = ? WHERE id = ?', [i + 1, remaining[i].id]);
    }

    // Recalculate dues
    await recalculateDues(schedule.client_id);
    await syncDueReminders(schedule.client_id);
    req.app.get('io')?.emit('data_changed', { type: 'schedule_updated', client_id: schedule.client_id });
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
