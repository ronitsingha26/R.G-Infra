import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { sendMail } from '../utils/mailer.js';
import { paymentReceivedEmail, dueReminderEmail } from '../utils/emailTemplates.js';

const router = Router();

// GET /api/payments — all payments with project & client names
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pay.*, p.name AS project_name, c.company_name AS client_name, c.email AS client_email
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      LEFT JOIN clients c ON c.id = pay.client_id
      ORDER BY pay.payment_date DESC, pay.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payments — add new payment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { project_id, client_id, amount, payment_date, payment_mode, reference_no, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    // If client_id not provided but project_id is, get client_id from project
    let finalClientId = client_id;
    if (!finalClientId && project_id) {
      const [proj] = await pool.query('SELECT client_id FROM projects WHERE id = ?', [project_id]);
      if (proj.length > 0) finalClientId = proj[0].client_id;
    }

    const [result] = await pool.query(
      'INSERT INTO payments (project_id, client_id, amount, payment_date, payment_mode, reference_no, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_id || null, finalClientId || null, amount, payment_date || new Date().toISOString().slice(0, 10), payment_mode || null, reference_no || null, notes || null]
    );

    const [rows] = await pool.query(`
      SELECT pay.*, p.name AS project_name, c.company_name AS client_name, c.email AS client_email
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      LEFT JOIN clients c ON c.id = pay.client_id
      WHERE pay.id = ?
    `, [result.insertId]);

    req.app.get('io')?.emit('data_changed', { type: 'payment_added', data: rows[0] });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/payments/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { amount, payment_date, payment_mode, reference_no, notes } = req.body;

    await pool.query(
      'UPDATE payments SET amount = ?, payment_date = ?, payment_mode = ?, reference_no = ?, notes = ? WHERE id = ?',
      [amount, payment_date || null, payment_mode || null, reference_no || null, notes || null, req.params.id]
    );

    const [rows] = await pool.query(`
      SELECT pay.*, p.name AS project_name, c.company_name AS client_name, c.email AS client_email
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      LEFT JOIN clients c ON c.id = pay.client_id
      WHERE pay.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    req.app.get('io')?.emit('data_changed', { type: 'payment_updated', data: rows[0] });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payments/:id/send-receipt — send payment confirmation email
router.post('/:id/send-receipt', verifyToken, async (req, res) => {
  try {
    // Get payment + project + client details
    const [payments] = await pool.query(`
      SELECT pay.*, p.name AS project_name, p.total_amount, p.progress,
             c.company_name AS client_name, c.contact_person, c.email AS client_email
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      LEFT JOIN clients c ON c.id = pay.client_id
      WHERE pay.id = ?
    `, [req.params.id]);

    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = payments[0];

    if (!payment.client_email) {
      return res.status(400).json({ error: 'Client does not have an email address' });
    }

    // Calculate total paid for this project
    const [paidRows] = await pool.query(
      'SELECT SUM(amount) AS total_paid FROM payments WHERE project_id = ?',
      [payment.project_id]
    );
    const totalPaid = Number(paidRows[0]?.total_paid || 0);
    const dueAmount = Number(payment.total_amount || 0) - totalPaid;

    const html = paymentReceivedEmail({
      clientName: payment.contact_person || payment.client_name,
      projectName: payment.project_name || 'N/A',
      amountReceived: payment.amount,
      paymentDate: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : 'N/A',
      paymentMode: payment.payment_mode,
      referenceNo: payment.reference_no,
      totalPaid,
      totalAmount: payment.total_amount,
      dueAmount: Math.max(0, dueAmount),
      progress: payment.progress,
    });

    const result = await sendMail({
      to: payment.client_email,
      subject: `Payment Received — ${payment.project_name || 'Bajaj Developer Constructions'}`,
      html,
    });

    if (result.success) {
      await pool.query('UPDATE payments SET email_sent = 1 WHERE id = ?', [req.params.id]);
      req.app.get('io')?.emit('data_changed', { type: 'receipt_sent', paymentId: req.params.id });
      res.json({ message: 'Payment receipt email sent successfully', ...result });
    } else {
      res.status(500).json({ error: 'Failed to send email', reason: result.reason });
    }
  } catch (err) {
    console.error('Send receipt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payments/send-due-reminder/:clientId — send due payment reminder
router.post('/send-due-reminder/:clientId', verifyToken, async (req, res) => {
  try {
    const [clients] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.clientId]);
    if (clients.length === 0) return res.status(404).json({ error: 'Client not found' });

    const client = clients[0];
    if (!client.email) return res.status(400).json({ error: 'Client does not have an email address' });

    // Get all projects for this client with payment info
    const [projects] = await pool.query(`
      SELECT p.*,
        COALESCE(pm.total_paid, 0) AS total_paid
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(amount) AS total_paid
        FROM payments GROUP BY project_id
      ) pm ON pm.project_id = p.id
      WHERE p.client_id = ?
    `, [req.params.clientId]);

    const projectsWithDue = projects
      .map((p) => ({
        name: p.name,
        totalAmount: Number(p.total_amount || 0),
        totalPaid: Number(p.total_paid || 0),
        dueAmount: Math.max(0, Number(p.total_amount || 0) - Number(p.total_paid || 0)),
        progress: p.progress || 0,
      }))
      .filter((p) => p.dueAmount > 0);

    if (projectsWithDue.length === 0) {
      return res.status(400).json({ error: 'No dues found for this client' });
    }

    const totalDue = projectsWithDue.reduce((s, p) => s + p.dueAmount, 0);

    const html = dueReminderEmail({
      clientName: client.contact_person || client.company_name,
      projects: projectsWithDue,
      totalDue,
    });

    const result = await sendMail({
      to: client.email,
      subject: `Payment Due Reminder — Bajaj Developer Constructions`,
      html,
    });

    if (result.success) {
      req.app.get('io')?.emit('data_changed', { type: 'due_reminder_sent', clientId: req.params.clientId, totalDue });
      res.json({ message: 'Due reminder email sent successfully', totalDue, ...result });
    } else {
      res.status(500).json({ error: 'Failed to send email', reason: result.reason });
    }
  } catch (err) {
    console.error('Send due reminder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
