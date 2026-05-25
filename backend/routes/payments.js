import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { sendMail } from '../utils/mailer.js';
import { paymentReceivedEmail, dueReminderEmail } from '../utils/emailTemplates.js';
import { ensurePaymentSchedule, recalculateDues } from '../services/paymentLedger.js';
import { writeInvoicePdf } from '../services/pdf/invoicePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const INVOICE_OUTPUT_DIR = join(__dirname, '..', 'generated_invoices');
if (!existsSync(INVOICE_OUTPUT_DIR)) mkdirSync(INVOICE_OUTPUT_DIR, { recursive: true });

async function logCommunication({
  client_id,
  booking_id,
  flat_id,
  type,
  channel,
  subject,
  message,
  recipient_email,
  recipient_phone,
  invoice_id,
  file_url,
  status,
  error_message,
  sent_by,
}) {
  try {
    await pool.query(
      `INSERT INTO communication_history
       (client_id, flat_id, type, channel, subject, message, recipient_email, recipient_phone, invoice_id, file_url, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        flat_id || null,
        type,
        channel || 'email',
        subject || null,
        message || null,
        recipient_email || null,
        recipient_phone || null,
        invoice_id || null,
        file_url || null,
        status || 'sent',
        error_message || null,
      ]
    );
    await pool.query(
      `INSERT INTO communication_logs
       (client_id, booking_id, demand_letter_id, channel, message_type, subject, message, recipient, attachment_url, delivery_status, provider, sent_by, sent_at, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        client_id,
        booking_id || null,
        null,
        channel || 'email',
        type === 'invoice' ? 'invoice' : type,
        subject || null,
        message || null,
        recipient_email || recipient_phone || null,
        file_url || null,
        status || 'sent',
        channel === 'whatsapp' ? (process.env.WHATSAPP_PROVIDER || 'manual') : 'smtp',
        sent_by || null,
        error_message || null,
      ]
    );
  } catch (err) {
    console.error('Log communication error:', err.message);
  }
}

// GET /api/payments — all payments with project & client names
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cp.id, NULL as project_id, cp.client_id, cp.amount, cp.gst_amount,
             (COALESCE(cp.amount, 0) + COALESCE(cp.gst_amount, 0)) AS grand_total,
             cp.payment_date, cp.payment_mode, cp.reference_no, 0 as email_sent,
             a.name AS project_name, c.name AS client_name, c.email AS client_email, cp.created_at, c.phone AS client_phone
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON f.id = cp.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      ORDER BY cp.payment_date DESC, cp.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/payments/invoices/download/:filename — Serve invoice PDF ────
router.get('/invoices/download/:filename', async (req, res) => {
  const filePath = join(INVOICE_OUTPUT_DIR, req.params.filename);
  if (existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ─── GET /api/payments/:id/invoices — List invoices for a payment ─────────
router.get('/:id/invoices', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, payment_id, client_id, invoice_no, file_name, file_url,
              amount, gst_amount, grand_total, generated_date
       FROM invoices
       WHERE payment_id = ?
       ORDER BY generated_date DESC, id DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/payments/:id/invoices — Generate invoice PDF ───────────────
router.post('/:id/invoices', verifyToken, async (req, res) => {
  try {
    const paymentId = Number(req.params.id);
    if (!paymentId) return res.status(400).json({ error: 'Valid payment id is required' });

    const [payments] = await pool.query(
      `SELECT cp.*, c.name as client_name, c.unique_client_id, c.email as client_email, c.phone as client_phone, c.address as client_address,
              f.flat_number, f.floor, f.block, f.sbu_area, f.total_amount, COALESCE(f.gst_percent, 0) AS gst_percent,
              a.name as apartment_name, p.name as property_name,
              COALESCE(cp.booking_id, b.id) as booking_record_id, b.booking_id as booking_ref
       FROM client_payments cp
       LEFT JOIN clients c ON c.id = cp.client_id
       LEFT JOIN flats f ON f.id = cp.flat_id
       LEFT JOIN apartments a ON a.id = f.apartment_id
       LEFT JOIN properties p ON a.property_id = p.id
       LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
       WHERE cp.id = ?`,
      [paymentId]
    );

    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = payments[0];

    const invoiceDate = new Date();
    const formattedInvoiceDate = invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const invoiceNo = `RGI-INV-${invoiceDate.getFullYear()}-${String(paymentId).padStart(6, '0')}-${String(Date.now()).slice(-4)}`;

    const safeClientName = (payment.client_name || 'Client')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'Client';
    const dateStr = formattedInvoiceDate.replace(/\//g, '-');
    const fileName = `RG_INFRA_Invoice_${safeClientName}_${invoiceNo}_${dateStr}.pdf`;
    const filePath = join(INVOICE_OUTPUT_DIR, fileName);

    await writeInvoicePdf({
      invoiceNo,
      invoiceDate: formattedInvoiceDate,
      clientName: payment.client_name,
      clientId: payment.unique_client_id,
      clientAddress: payment.client_address,
      clientPhone: payment.client_phone,
      clientEmail: payment.client_email,
      bookingId: payment.booking_ref,
      apartmentName: payment.apartment_name,
      propertyName: payment.property_name,
      flatNumber: payment.flat_number,
      floor: payment.floor,
      block: payment.block,
      sbuArea: payment.sbu_area,
      paymentDate: payment.payment_date,
      paymentMode: payment.payment_mode,
      referenceNo: payment.reference_no,
      paymentPercentage: payment.payment_percentage,
      amount: payment.amount,
      gstPercent: payment.gst_percent || 0,
      gstAmount: payment.gst_amount || 0,
      grandTotal: Number(payment.amount || 0) + Number(payment.gst_amount || 0),
    }, filePath);

    const fileUrl = `/api/payments/invoices/download/${fileName}`;
    const [result] = await pool.query(
      `INSERT INTO invoices
       (payment_id, client_id, booking_id, flat_id, invoice_no, file_name, file_url, amount, gst_amount, grand_total, payment_date, payment_mode, reference_no, generated_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        paymentId,
        payment.client_id,
        payment.booking_record_id || null,
        payment.flat_id || null,
        invoiceNo,
        fileName,
        fileUrl,
        payment.amount,
        payment.gst_amount || 0,
        Number(payment.amount || 0) + Number(payment.gst_amount || 0),
        payment.payment_date || null,
        payment.payment_mode || null,
        payment.reference_no || null,
        req.user?.id || null,
      ]
    );

    const invoiceId = result.insertId;

    await logCommunication({
      client_id: payment.client_id,
      booking_id: payment.booking_record_id,
      flat_id: payment.flat_id,
      type: 'invoice',
      channel: 'email',
      subject: `Invoice Generated — ${payment.apartment_name || 'Project'}, Flat ${payment.flat_number || '-'}`,
      message: `Invoice ${invoiceNo} generated for payment of ₹${Number(payment.amount || 0).toLocaleString('en-IN')}.`,
      recipient_email: payment.client_email,
      recipient_phone: payment.client_phone,
      invoice_id: invoiceId,
      file_url: fileUrl,
      status: 'sent',
      sent_by: req.user?.id || null,
    });

    req.app.get('io')?.emit('data_changed', { type: 'invoice_generated', payment_id: paymentId, invoice_id: invoiceId });

    res.status(201).json({
      id: invoiceId,
      payment_id: paymentId,
      client_id: payment.client_id,
      invoice_no: invoiceNo,
      file_name: fileName,
      file_url: fileUrl,
      amount: payment.amount,
      gst_amount: payment.gst_amount || 0,
      grand_total: Number(payment.amount || 0) + Number(payment.gst_amount || 0),
      generated_date: invoiceDate.toISOString(),
    });
  } catch (err) {
    console.error('Generate invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payments — add new payment
router.post('/', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { project_id, client_id, amount, amount_includes_gst = false, payment_percentage, payment_date, payment_mode, reference_no, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    // If client_id not provided but a legacy project_id is, treat it as an apartment id.
    let finalClientId = client_id;
    if (!finalClientId && project_id) {
      const [projClients] = await connection.query(
        `SELECT c.id AS client_id
         FROM clients c
         JOIN flats f ON f.id = c.flat_id
         WHERE f.apartment_id = ?
         ORDER BY c.created_at DESC
         LIMIT 1`,
        [project_id]
      );
      if (projClients.length > 0) finalClientId = projClients[0].client_id;
    }
    if (!finalClientId) return res.status(400).json({ error: 'client_id is required' });

    await connection.beginTransaction();

    const [clients] = await connection.query(
      `SELECT c.flat_id, COALESCE(b.id, NULL) AS booking_id, f.total_amount, COALESCE(f.gst_percent, 0) AS gst_percent
       FROM clients c
       LEFT JOIN flats f ON f.id = c.flat_id
       LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
       WHERE c.id = ?`,
      [finalClientId]
    );
    if (clients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }

    let finalAmount = Number(amount);
    const totalAmount = Number(clients[0].total_amount || 0);
    const gstPercent = Number(clients[0].gst_percent || 0);
    const finalPercentage = payment_percentage !== undefined && payment_percentage !== null && payment_percentage !== ''
      ? Number(payment_percentage)
      : null;

    if (finalPercentage !== null && !Number.isNaN(finalPercentage) && totalAmount > 0) {
      finalAmount = (totalAmount * finalPercentage) / 100;
    } else if (amount_includes_gst && finalAmount > 0 && gstPercent > 0) {
      finalAmount = finalAmount / (1 + (gstPercent / 100));
    }

    const gstAmount = finalAmount * (gstPercent / 100);
    const calculatedPercentage = finalPercentage !== null && !Number.isNaN(finalPercentage)
      ? finalPercentage
      : totalAmount > 0 ? (finalAmount / totalAmount) * 100 : 0;

    await ensurePaymentSchedule(Number(finalClientId), connection);

    const [result] = await connection.query(
      `INSERT INTO client_payments
        (client_id, booking_id, flat_id, amount, payment_percentage, gst_amount, payment_date, payment_mode, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalClientId,
        clients[0].booking_id || null,
        clients[0].flat_id || null,
        finalAmount,
        calculatedPercentage || 0,
        gstAmount,
        payment_date || new Date().toISOString().slice(0, 10),
        payment_mode || null,
        reference_no || null,
        notes || null,
      ]
    );

    await recalculateDues(Number(finalClientId), connection);

    const [rows] = await connection.query(`
      SELECT cp.id, NULL AS project_id, cp.client_id, cp.amount, cp.gst_amount,
             (COALESCE(cp.amount, 0) + COALESCE(cp.gst_amount, 0)) AS grand_total,
             cp.payment_date, cp.payment_mode, cp.reference_no, 0 AS email_sent,
             a.name AS project_name, c.name AS client_name, c.email AS client_email, cp.created_at, c.phone AS client_phone
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON f.id = cp.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      WHERE cp.id = ?
    `, [result.insertId]);

    await connection.commit();
    req.app.get('io')?.emit('data_changed', { type: 'payment_added', data: rows[0] });
    res.status(201).json(rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error('Create payment error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/payments/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { amount, payment_date, payment_mode, reference_no, notes } = req.body;

    const [[paymentRow]] = await pool.query(
      `SELECT COALESCE(f.gst_percent, 0) AS gst_percent
       FROM client_payments cp
       LEFT JOIN flats f ON f.id = cp.flat_id
       WHERE cp.id = ?`,
      [req.params.id]
    );
    const gstAmount = Number(amount || 0) * (Number(paymentRow?.gst_percent || 0) / 100);

    await pool.query(
      'UPDATE client_payments SET amount = ?, gst_amount = ?, payment_date = ?, payment_mode = ?, reference_no = ?, notes = ? WHERE id = ?',
      [amount, gstAmount, payment_date || null, payment_mode || null, reference_no || null, notes || null, req.params.id]
    );

    const [rows] = await pool.query(`
      SELECT cp.id, NULL AS project_id, cp.client_id, cp.amount, cp.gst_amount,
             (COALESCE(cp.amount, 0) + COALESCE(cp.gst_amount, 0)) AS grand_total,
             cp.payment_date, cp.payment_mode, cp.reference_no, 0 AS email_sent,
             a.name AS project_name, c.name AS client_name, c.email AS client_email, cp.created_at, c.phone AS client_phone
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON f.id = cp.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      WHERE cp.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    await recalculateDues(rows[0].client_id);
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
    // Get payment + apartment + client details
    const [payments] = await pool.query(`
      SELECT cp.*, a.name AS project_name, f.total_amount,
             c.name AS client_name, c.email AS client_email, c.phone AS client_phone
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON f.id = cp.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      WHERE cp.id = ?
    `, [req.params.id]);

    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = payments[0];

    if (!payment.client_email) {
      return res.status(400).json({ error: 'Client does not have an email address' });
    }

    // Calculate total paid for this flat
    const [paidRows] = await pool.query(
      'SELECT SUM(amount) AS total_paid FROM client_payments WHERE flat_id = ?',
      [payment.flat_id]
    );
    const totalPaid = Number(paidRows[0]?.total_paid || 0);
    const dueAmount = Number(payment.total_amount || 0) - totalPaid;

    const html = paymentReceivedEmail({
      clientName: payment.client_name,
      projectName: payment.project_name || 'R.G INFRA',
      amountReceived: payment.amount,
      paymentDate: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : 'N/A',
      paymentMode: payment.payment_mode,
      referenceNo: payment.reference_no,
      totalPaid,
      totalAmount: payment.total_amount,
      dueAmount: Math.max(0, dueAmount),
      progress: Math.round((totalPaid / Number(payment.total_amount || 1)) * 100),
    });

    const result = await sendMail({
      to: payment.client_email,
      subject: `Payment Received — ${payment.project_name || 'R.G INFRA'}`,
      html,
    });

    if (result.success) {
      // We will try to update email_sent, but if column doesn't exist, ignore
      try {
        await pool.query('UPDATE client_payments SET email_sent = 1 WHERE id = ?', [req.params.id]);
      } catch (e) {
        console.log("email_sent column might be missing, skipped updating status");
      }
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

    const dueInfo = await ensurePaymentSchedule(Number(req.params.clientId));
    const [rows] = await pool.query(`
      SELECT a.name, f.total_amount,
        COALESCE(cp.total_paid, 0) AS total_paid
      FROM clients c
      LEFT JOIN flats f ON f.id = c.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      LEFT JOIN (
        SELECT client_id, SUM(amount) AS total_paid
        FROM client_payments GROUP BY client_id
      ) cp ON cp.client_id = c.id
      WHERE c.id = ?
    `, [req.params.clientId]);

    const projectsWithDue = rows
      .map((p) => {
        const totalAmount = Number(p.total_amount || 0);
        const totalPaid = Number(p.total_paid || 0);
        return {
          name: p.name || 'R.G INFRA',
          totalAmount,
          totalPaid,
          dueAmount: Number(dueInfo?.current_due ?? dueInfo?.current_stage_due ?? dueInfo?.combined_due ?? Math.max(0, totalAmount - totalPaid)),
          progress: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
        };
      })
      .filter((p) => p.dueAmount > 0);

    if (projectsWithDue.length === 0) {
      return res.status(400).json({ error: 'No dues found for this client' });
    }

    const totalDue = projectsWithDue.reduce((s, p) => s + p.dueAmount, 0);

    const html = dueReminderEmail({
      clientName: client.name || client.contact_person || client.company_name,
      projects: projectsWithDue,
      totalDue,
    });

    const result = await sendMail({
      to: client.email,
      subject: `Payment Due Reminder — R.G INFRA`,
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

// DELETE /api/payments/:id — delete a payment record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [payments] = await pool.query('SELECT client_id FROM client_payments WHERE id = ?', [req.params.id]);
    if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });

    await pool.query('DELETE FROM client_payments WHERE id = ?', [req.params.id]);
    await recalculateDues(payments[0].client_id);

    req.app.get('io')?.emit('data_changed', { type: 'payment_deleted', id: req.params.id, client_id: payments[0].client_id });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
