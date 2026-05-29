import { Router } from 'express';
import XLSX from 'xlsx-js-style';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { processDueReminders } from '../services/dueReminderCron.js';
import { refreshDueReminderStatuses, syncDueReminders } from '../services/dueReminderSync.js';
import { sendMail } from '../utils/mailer.js';
import { dueReminderEmail } from '../utils/emailTemplates.js';
import { renderPdfBuffer } from '../services/pdf/helpers.js';

const router = Router();

function displayDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildReminderEmail(due) {
  const combinedDue = Number(due.due_amount || 0);
  return dueReminderEmail({
    clientName: due.client_name,
    apartmentName: due.apartment_name,
    flatNo: due.flat_unit,
    percentagePaid: 0,
    nextPercentage: due.payment_percentage,
    paidAmount: Number(due.total_paid || 0),
    dueAmount: combinedDue,
    dueDate: displayDate(due.due_date),
    nextStageName: due.projection_stage,
    nextStagePercentage: due.payment_percentage,
    nextStageAmount: combinedDue,
    totalDue: combinedDue,
  });
}

function renderTemplate(template, due) {
  if (!template) return null;
  const values = {
    client_name: due.client_name || '',
    flat_unit: due.flat_unit || '',
    apartment_name: due.apartment_name || '',
    projection_stage: due.projection_stage || '',
    due_amount: Number(due.due_amount || 0).toLocaleString('en-IN'),
    gst_amount: Number(due.gst_amount || 0).toLocaleString('en-IN'),
    total_payable: Number(due.total_payable || due.due_amount || 0).toLocaleString('en-IN'),
    due_date: displayDate(due.due_date) || '',
    phone: due.phone || '',
    email: due.email || '',
  };
  return Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

async function logReminder({ due, emailStatus, errorMessage, userId }) {
  await pool.query(
    `INSERT INTO reminder_logs
     (client_id, flat_id, schedule_id, stage_name, due_date, combined_due, current_stage_due,
      email_sent, email_status, whatsapp_initiated, trigger_type, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'manual', ?)`,
    [
      due.client_id,
      due.flat_id || null,
      due.schedule_id || null,
      due.projection_stage || null,
      due.due_date || null,
      Number(due.due_amount || 0),
      Number(due.due_amount || 0),
      emailStatus === 'sent',
      emailStatus,
      errorMessage || null,
    ]
  );

  await pool.query(
    `INSERT INTO communication_history
     (client_id, flat_id, type, channel, subject, message, recipient_email, status, error_message)
     VALUES (?, ?, 'email', 'email', ?, ?, ?, ?, ?)`,
    [
      due.client_id,
      due.flat_id || null,
      `Due Reminder Email - ${due.apartment_name || 'Property'}, Flat ${due.flat_unit || ''}`,
      emailStatus === 'sent'
        ? `Due reminder sent by user ${userId || 'admin'}. Amount: Rs. ${Number(due.due_amount || 0)}`
        : `Due reminder failed: ${errorMessage}`,
      due.email || null,
      emailStatus,
      errorMessage || null,
    ]
  );
}

// ─── GET /api/reminders/due — Synced due reminder queue ───────────────────
router.get('/due', verifyToken, async (req, res) => {
  try {
    await syncDueReminders();
    await refreshDueReminderStatuses();

    const where = ['status != "paid"'];
    const params = [];
    if (req.query.date) {
      where.push('due_date = ?');
      params.push(req.query.date);
    }
    if (req.query.status && ['upcoming', 'overdue'].includes(req.query.status)) {
      where.push('status = ?');
      params.push(req.query.status);
    }
    if (req.query.client) {
      where.push('client_name LIKE ?');
      params.push(`%${req.query.client}%`);
    }
    if (req.query.min_due) {
      where.push('due_amount >= ?');
      params.push(Number(req.query.min_due));
    }
    if (req.query.max_due) {
      where.push('due_amount <= ?');
      params.push(Number(req.query.max_due));
    }

    const [rows] = await pool.query(
      `SELECT * FROM due_reminders
       WHERE ${where.join(' AND ')}
       ORDER BY due_date IS NULL, due_date ASC, client_name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Get due reminders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/reminders/bulk-email — Send selected/date due emails ───────
router.post('/bulk-email', verifyToken, async (req, res) => {
  try {
    const { due_date, reminder_ids = [], subject, html_template } = req.body;
    if (!due_date && (!Array.isArray(reminder_ids) || reminder_ids.length === 0)) {
      return res.status(400).json({ error: 'Select a due date or at least one reminder' });
    }

    await syncDueReminders();
    await refreshDueReminderStatuses();

    let rows;
    if (Array.isArray(reminder_ids) && reminder_ids.length > 0) {
      const placeholders = reminder_ids.map(() => '?').join(',');
      [rows] = await pool.query(
        `SELECT * FROM due_reminders WHERE id IN (${placeholders}) AND status != 'paid'`,
        reminder_ids
      );
    } else {
      [rows] = await pool.query(
        `SELECT * FROM due_reminders WHERE due_date = ? AND status != 'paid'`,
        [due_date]
      );
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const due of rows) {
      if (!due.email) {
        skipped++;
        await pool.query(
          `UPDATE due_reminders SET email_status = 'skipped', reminder_count = reminder_count + 1 WHERE id = ?`,
          [due.id]
        );
        await logReminder({ due, emailStatus: 'skipped', errorMessage: 'Client email missing', userId: req.user?.id });
        continue;
      }

      const emailResult = await sendMail({
        to: due.email,
        subject: renderTemplate(subject, due) || `RG INFRA - Due Payment Reminder | ${due.apartment_name || 'Property'}, Flat ${due.flat_unit || ''}`,
        html: renderTemplate(html_template, due) || buildReminderEmail(due),
      });

      const status = emailResult.success ? 'sent' : 'failed';
      if (emailResult.success) sent++;
      else failed++;

      await pool.query(
        `UPDATE due_reminders
         SET email_status = ?, last_sent_at = NOW(), reminder_count = reminder_count + 1
         WHERE id = ?`,
        [status, due.id]
      );
      await logReminder({
        due,
        emailStatus: status,
        errorMessage: emailResult.success ? null : emailResult.reason,
        userId: req.user?.id,
      });
    }

    req.app.get('io')?.emit('data_changed', { type: 'bulk_due_reminders_sent', sent, failed, skipped });
    res.json({ message: `Bulk email completed. Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}`, sent, failed, skipped, total: rows.length });
  } catch (err) {
    console.error('Bulk reminder error:', err);
    res.status(500).json({ error: 'Failed to send bulk reminders' });
  }
});

// ─── GET /api/reminders/email-preview/:id — Preview selected reminder email
router.get('/email-preview/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM due_reminders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({
      subject: `RG INFRA - Due Payment Reminder | ${rows[0].apartment_name || 'Property'}, Flat ${rows[0].flat_unit || ''}`,
      html: buildReminderEmail(rows[0]),
    });
  } catch (err) {
    console.error('Preview reminder email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/reminders/export — Export due report as XLSX ────────────────
router.get('/export', verifyToken, async (req, res) => {
  try {
    await syncDueReminders();
    await refreshDueReminderStatuses();
    const [rows] = await pool.query(`
      SELECT client_name, phone, email, apartment_name, flat_unit, projection_stage,
        payment_percentage, total_paid, due_amount, gst_percent, gst_amount, total_payable,
        due_date, status, email_status, last_sent_at
      FROM due_reminders
      ORDER BY due_date IS NULL, due_date ASC, client_name ASC
    `);

    const reportRows = rows.map((row) => ({
      Client: row.client_name,
      Phone: row.phone,
      Email: row.email,
      Property: row.apartment_name,
      Flat: row.flat_unit,
      Stage: row.projection_stage,
      Percentage: Number(row.payment_percentage || 0),
      'Total Paid': Number(row.total_paid || 0),
      'Due Amount': Number(row.due_amount || 0),
      'GST %': Number(row.gst_percent || 0),
      'GST Amount': Number(row.gst_amount || 0),
      'Total Payable': Number(row.total_payable || row.due_amount || 0),
      'Due Date': row.due_date ? displayDate(row.due_date) : '',
      Status: row.status,
      'Email Status': row.email_status,
      'Last Sent': row.last_sent_at ? displayDate(row.last_sent_at) : '',
    }));

    if (req.query.format === 'pdf') {
      const body = [
        ['Client', 'Flat', 'Stage', 'Due Date', 'Base Due', 'GST', 'Payable', 'Status'],
        ...reportRows.map((row) => [
          row.Client || '',
          row.Flat || '',
          row.Stage || '',
          row['Due Date'] || '',
          `Rs. ${Number(row['Due Amount'] || 0).toLocaleString('en-IN')}`,
          `Rs. ${Number(row['GST Amount'] || 0).toLocaleString('en-IN')}`,
          `Rs. ${Number(row['Total Payable'] || 0).toLocaleString('en-IN')}`,
          row.Status || '',
        ]),
      ];
      const buffer = await renderPdfBuffer({
        pageOrientation: 'landscape',
        content: [
          { text: 'R G Infra - Due Reminders Report', fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
          {
            table: { headerRows: 1, widths: ['*', 55, '*', 70, 75, 75, 75, 60], body },
            layout: 'lightHorizontalLines',
            fontSize: 8,
          },
        ],
        defaultStyle: { font: 'Helvetica' },
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="due_reminders_report.pdf"');
      return res.send(buffer);
    }

    const ws = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Due Reminders');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="due_reminders_report.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Export due reminders error:', err);
    res.status(500).json({ error: 'Failed to export due report' });
  }
});

// ─── GET /api/reminders — All reminder logs ────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT rl.*, 
        c.name as client_name, c.unique_client_id, c.email as client_email, c.phone as client_phone,
        f.flat_number, a.name as apartment_name,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
      FROM reminder_logs rl
      LEFT JOIN clients c ON rl.client_id = c.id
      LEFT JOIN flats f ON rl.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN demand_letters dl ON rl.demand_letter_id = dl.id
      ORDER BY rl.sent_on DESC
      LIMIT 200
    `);
    res.json(logs);
  } catch (err) {
    console.error('Get reminder logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/reminders/client/:clientId — Logs for a specific client ──────
router.get('/client/:clientId', verifyToken, async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT rl.*, 
        c.name as client_name,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
      FROM reminder_logs rl
      LEFT JOIN clients c ON rl.client_id = c.id
      LEFT JOIN demand_letters dl ON rl.demand_letter_id = dl.id
      WHERE rl.client_id = ?
      ORDER BY rl.sent_on DESC
    `, [req.params.clientId]);
    res.json(logs);
  } catch (err) {
    console.error('Get client reminder logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/reminders/stats — Summary stats ─────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_reminders,
        SUM(CASE WHEN email_status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN email_status = 'failed' THEN 1 ELSE 0 END) as emails_failed,
        SUM(CASE WHEN email_status = 'skipped' THEN 1 ELSE 0 END) as emails_skipped,
        SUM(CASE WHEN whatsapp_initiated = 1 THEN 1 ELSE 0 END) as whatsapp_initiated,
        SUM(CASE WHEN trigger_type = 'cron' THEN 1 ELSE 0 END) as cron_triggered,
        SUM(CASE WHEN trigger_type = 'manual' THEN 1 ELSE 0 END) as manually_triggered,
        SUM(CASE WHEN DATE(sent_on) = CURDATE() THEN 1 ELSE 0 END) as sent_today
      FROM reminder_logs
    `);
    res.json(stats[0]);
  } catch (err) {
    console.error('Get reminder stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/reminders/trigger — Manually trigger due reminder run ──────
router.post('/trigger', verifyToken, async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await processDueReminders(io, 'manual');
    res.json({
      message: 'Due reminder check completed',
      ...result,
    });
  } catch (err) {
    console.error('Manual trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

// ─── DELETE /api/reminders/:id — Delete a single log ──────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM reminder_logs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Reminder log deleted' });
  } catch (err) {
    console.error('Delete reminder log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
