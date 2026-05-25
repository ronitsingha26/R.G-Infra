import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { sendMail } from '../utils/mailer.js';
import { demandLetterEmail, dueReminderEmail, dueReminderWithDemandLetterEmail, getWhatsAppDueMessage, getWhatsAppPaymentDoneMessage } from '../utils/emailTemplates.js';
import { ensurePaymentSchedule } from '../services/paymentLedger.js';
import { writeDemandLetterPdf } from '../services/pdf/demandLetterPdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Ensure output directory exists
const OUTPUT_DIR = join(__dirname, '..', 'generated_demand_letters');
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function formatDisplayDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Helper: Log communication to history table
 */
async function logCommunication({ client_id, booking_id, flat_id, type, channel, subject, message, recipient_email, recipient_phone, demand_letter_id, file_url, status, error_message, sent_by }) {
  try {
    await pool.query(
      `INSERT INTO communication_history 
       (client_id, flat_id, type, channel, subject, message, recipient_email, recipient_phone, demand_letter_id, file_url, status, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, flat_id || null, type, channel || 'email', subject || null, message || null, recipient_email || null, recipient_phone || null, demand_letter_id || null, file_url || null, status || 'sent', error_message || null]
    );
    await pool.query(
      `INSERT INTO communication_logs
       (client_id, booking_id, demand_letter_id, channel, message_type, subject, message, recipient, attachment_url, delivery_status, provider, sent_by, sent_at, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        client_id,
        booking_id || null,
        demand_letter_id || null,
        channel || 'email',
        type === 'payment_receipt' ? 'payment_receipt' : type === 'whatsapp' ? 'reminder' : type,
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

/**
 * Helper: fetch client with flat + apartment data
 */
async function fetchClientFull(clientId) {
  const [clients] = await pool.query(`
    SELECT c.*, 
      f.flat_number, f.floor, f.block, f.sbu_area, f.total_amount, COALESCE(f.gst_percent, 0) AS flat_gst_percent,
      a.name as apartment_name,
      a.floor_north, a.floor_south, a.floor_east, a.floor_west,
      p.land_north, p.land_south, p.land_east, p.land_west,
      b.id as booking_record_id, b.booking_id
    FROM clients c
    LEFT JOIN flats f ON c.flat_id = f.id
    LEFT JOIN apartments a ON f.apartment_id = a.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
    WHERE c.id = ?
  `, [clientId]);
  return clients[0] || null;
}

async function getDemandPaymentContext(clientId, fallbackPaidAmount = null) {
  let dueInfo = null;
  try {
    dueInfo = await ensurePaymentSchedule(Number(clientId));
  } catch (err) {
    if (err.status !== 400) throw err;
  }

  const [[paidRow]] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM client_payments WHERE client_id = ?',
    [clientId]
  );
  const [[clientRow]] = await pool.query(
    `SELECT COALESCE(b.flat_value, f.total_amount, 0) AS total_amount,
        COALESCE(f.gst_percent, 0) AS flat_gst_percent
     FROM clients c
     LEFT JOIN flats f ON c.flat_id = f.id
     LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
     WHERE c.id = ?`,
    [clientId]
  );

  const actualPaid = Number(paidRow?.total_paid || 0);
  const totalAmount = Number(clientRow?.total_amount || 0);
  const paidAmount = fallbackPaidAmount !== null && fallbackPaidAmount !== undefined && Number(fallbackPaidAmount) > 0
    ? Number(fallbackPaidAmount)
    : actualPaid;

  const [scheduleRows] = await pool.query(
    `SELECT *
     FROM payment_schedules
     WHERE client_id = ? AND status != 'paid'
     ORDER BY stage_order ASC
     LIMIT 2`,
    [clientId]
  );
  const currentSchedule = scheduleRows[0] || null;
  const nextSchedule = scheduleRows[1] || null;
  const dueAmount = Number(dueInfo?.current_due ?? dueInfo?.current_stage_due ?? Math.max(0, totalAmount - paidAmount));
  const gstPercent = Number(clientRow?.flat_gst_percent || dueInfo?.gst_percent || 0);
  const gstAmount = Number(dueInfo?.gst_amount ?? (dueAmount * gstPercent / 100));

  return {
    dueInfo,
    paidAmount,
    stageAmount: Number(currentSchedule?.amount || dueInfo?.current_stage_due || Math.max(0, totalAmount - paidAmount)),
    dueAmount,
    duePercentage: currentSchedule?.percentage || (totalAmount > 0 && dueInfo?.current_stage_due ? (Number(dueInfo.current_stage_due) / totalAmount) * 100 : null),
    currentStageName: currentSchedule?.stage_name || dueInfo?.current_stage || null,
    currentDueDate: currentSchedule?.due_date || dueInfo?.current_due_date || null,
    nextStageName: nextSchedule?.stage_name || dueInfo?.next_stage || null,
    nextStageAmount: Number(nextSchedule?.amount || dueInfo?.next_stage_amount || 0),
    nextStagePercentage: nextSchedule?.percentage || (totalAmount > 0 && dueInfo?.next_stage_amount ? (Number(dueInfo.next_stage_amount) / totalAmount) * 100 : null),
    nextDueDate: nextSchedule?.due_date || dueInfo?.next_due_date || null,
    gstPercent,
    gstAmount,
    totalPayable: dueAmount + gstAmount,
  };
}

// ─── POST /api/demand-letters/generate ─────────────────────────────────────
// Body: { client_id, paid_amount, bank_details, send_email: bool, send_whatsapp: bool }
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { client_id, paid_amount, bank_details, send_email = false, send_whatsapp = false } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await fetchClientFull(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const totalAmount = Number(client.total_amount) || 0;
    const paymentContext = await getDemandPaymentContext(client_id, paid_amount);
    const paidAmount = paymentContext.paidAmount;
    const dueAmount = paymentContext.dueAmount;
    const gstAmount = paymentContext.gstAmount;
    const grandTotal = paymentContext.totalPayable;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const safeClientName = (client.name || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
    const dateStr = formattedDate.replace(/\//g, '-');
    const fileName = `RG_INFRA_Demand_Letter_${safeClientName}_${dateStr}.pdf`;
    const filePath = join(OUTPUT_DIR, fileName);

    // 1. Generate PDF
    await writeDemandLetterPdf({
      clientName: client.name,
      clientAddress: client.address,
      flatNo: client.flat_number,
      floor: client.floor,
      block: client.block,
      apartmentName: client.apartment_name,
      area: client.sbu_area,
      totalAmount,
      stageAmount: paymentContext.stageAmount,
      paidAmount,
      dueAmount,
      gstPercent: paymentContext.gstPercent,
      gstAmount,
      grandTotal,
      duePercentage: paymentContext.duePercentage,
      currentStageName: paymentContext.currentStageName,
      dueDate: formatDisplayDate(paymentContext.currentDueDate),
      nextStageName: paymentContext.nextStageName,
      nextStageAmount: paymentContext.nextStageAmount,
      nextStagePercentage: paymentContext.nextStagePercentage,
      nextDueDate: formatDisplayDate(paymentContext.nextDueDate),
      landBoundaries: {
        north: client.land_north,
        south: client.land_south,
        east: client.land_east,
        west: client.land_west,
      },
      floorBoundaries: {
        north: client.floor_north,
        south: client.floor_south,
        east: client.floor_east,
        west: client.floor_west,
      },
      date: formattedDate,
      bankDetails: bank_details || {},
      signatureImage: req.body.signature_image || process.env.SIGNATURE_IMAGE_PATH,
    }, filePath);

    // 2. Save demand letter record
    const fileUrl = `/api/demand-letters/download/${fileName}`;
    const [result] = await pool.query(
      `INSERT INTO demand_letters (client_id, booking_id, file_name, file_url, generated_date, total_amount, paid_amount, due_amount, gst_percent, gst_amount, grand_total, email_sent, whatsapp_sent, sent_by) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, client.booking_record_id || null, fileName, fileUrl, totalAmount, paidAmount, dueAmount, paymentContext.gstPercent, gstAmount, grandTotal, send_email, send_whatsapp, req.user?.id || null]
    );
    const demandLetterId = result.insertId;

    // Log generation in communication history
    await logCommunication({
      client_id,
      booking_id: client.booking_record_id,
      flat_id: client.flat_id,
      type: 'demand_letter',
      channel: 'email',
      subject: `Demand Letter Generated — ${client.apartment_name}, Flat ${client.flat_number}`,
      message: `Demand letter generated. Total: ₹${totalAmount}, Paid: ₹${paidAmount}, Due: ₹${dueAmount}, Total Payable: ₹${grandTotal}`,
      demand_letter_id: demandLetterId,
      file_url: fileUrl,
      status: 'sent',
      sent_by: req.user?.id || null,
    });

    // 3. Optionally send email with PDF attachment
    let emailResult = null;
    if (send_email && client.email) {
      const emailHtml = demandLetterEmail({
        clientName: client.name,
        apartmentName: client.apartment_name,
        flatNo: client.flat_number,
        dueAmount,
        gstAmount,
        gstPercent: paymentContext.gstPercent,
        grandTotal,
        date: formattedDate,
        dueDate: formatDisplayDate(paymentContext.currentDueDate),
        nextStageName: paymentContext.nextStageName,
        nextStageAmount: paymentContext.nextStageAmount,
        nextStagePercentage: paymentContext.nextStagePercentage,
        nextDueDate: formatDisplayDate(paymentContext.nextDueDate),
      });

      emailResult = await sendMail({
        to: client.email,
        subject: `RG INFRA — Demand Letter | ${client.apartment_name}, Flat ${client.flat_number}`,
        html: emailHtml,
        attachments: [{
          filename: fileName,
          path: filePath,
          contentType: 'application/pdf',
        }],
      });

      // Log email in communication history
      await logCommunication({
        client_id,
        booking_id: client.booking_record_id,
        flat_id: client.flat_id,
        type: 'demand_letter',
        channel: 'email',
        subject: `Demand Letter Email Sent — ${client.apartment_name}, Flat ${client.flat_number}`,
        message: emailResult.success ? 'Email sent successfully with PDF attached' : `Email failed: ${emailResult.reason}`,
        recipient_email: client.email,
        demand_letter_id: demandLetterId,
        file_url: fileUrl,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.reason,
        sent_by: req.user?.id || null,
      });
    }

    // 4. Optionally generate WhatsApp redirect
    let whatsappData = null;
    if (send_whatsapp && client.phone) {
      whatsappData = getWhatsAppDueMessage({
        clientName: client.name,
        apartmentName: client.apartment_name,
        flatNo: client.flat_number,
        dueAmount,
        gstAmount,
        gstPercent: paymentContext.gstPercent,
        grandTotal,
        phone: client.phone,
        dueDate: formatDisplayDate(paymentContext.currentDueDate),
        nextStageName: paymentContext.nextStageName,
        nextStageAmount: paymentContext.nextStageAmount,
        nextStagePercentage: paymentContext.nextStagePercentage,
        nextDueDate: formatDisplayDate(paymentContext.nextDueDate),
      });

      // Log whatsapp in communication history (initiated — user sends manually)
      await logCommunication({
        client_id,
        booking_id: client.booking_record_id,
        flat_id: client.flat_id,
        type: 'whatsapp',
        channel: 'whatsapp',
        subject: `WhatsApp Due Reminder — ${client.apartment_name}, Flat ${client.flat_number}`,
        message: whatsappData.message,
        recipient_phone: client.phone,
        demand_letter_id: demandLetterId,
        status: 'initiated',
        sent_by: req.user?.id || null,
      });
    }

    await pool.query(
      `UPDATE demand_letters
       SET sent_date = CASE WHEN ? OR ? THEN NOW() ELSE sent_date END,
           delivery_status = CASE
             WHEN ? AND ? THEN 'sent'
             WHEN ? OR ? THEN 'partial'
             ELSE 'draft'
           END
       WHERE id = ?`,
      [
        Boolean(emailResult?.success),
        Boolean(whatsappData),
        Boolean(emailResult?.success),
        Boolean(whatsappData),
        Boolean(emailResult?.success),
        Boolean(whatsappData),
        demandLetterId,
      ]
    );

    req.app.get('io')?.emit('data_changed', { type: 'demand_letter_generated', client_id });

    res.status(201).json({
      message: 'Demand letter generated successfully',
      id: demandLetterId,
      file_name: fileName,
      file_url: fileUrl,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      email_sent: send_email ? (emailResult?.success || false) : false,
      whatsapp_url: whatsappData?.whatsappUrl || null,
    });
  } catch (err) {
    console.error('Generate demand letter error:', err);
    res.status(500).json({ error: 'Failed to generate demand letter' });
  }
});

// ─── POST /api/demand-letters/whatsapp-payment-done — Payment done WhatsApp ─
router.post('/whatsapp-payment-done', verifyToken, async (req, res) => {
  try {
    const { client_id, amount_paid } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await fetchClientFull(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const whatsappData = getWhatsAppPaymentDoneMessage({
      clientName: client.name,
      apartmentName: client.apartment_name,
      flatNo: client.flat_number,
      amountPaid: amount_paid,
      phone: client.phone,
    });

    // Log in communication history (initiated — user sends manually)
    await logCommunication({
      client_id,
      flat_id: client.flat_id,
      type: 'whatsapp',
      channel: 'whatsapp',
      subject: `WhatsApp Payment Confirmation — ₹${amount_paid}`,
      message: whatsappData.message,
      recipient_phone: client.phone,
      status: 'initiated',
    });

    res.json({
      message: 'WhatsApp payment done message generated',
      whatsapp_url: whatsappData.whatsappUrl,
    });
  } catch (err) {
    console.error('WhatsApp payment done error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/demand-letters/send-due-reminder — Email-only due reminder ──
router.post('/send-due-reminder', verifyToken, async (req, res) => {
  try {
    const { client_id, percentage_paid, next_percentage } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await fetchClientFull(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!client.email) return res.status(400).json({ error: 'Client has no email address' });

    const totalAmount = Number(client.total_amount) || 0;
    const paymentContext = await getDemandPaymentContext(client_id);
    const paidAmount = paymentContext.paidAmount;
    const dueAmount = paymentContext.dueAmount;
    const paidPct = Number(percentage_paid) || (totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0);
    const nextPct = Number(next_percentage) || (totalAmount > 0 ? (dueAmount / totalAmount) * 100 : 0);

    const emailHtml = dueReminderEmail({
      clientName: client.name,
      apartmentName: client.apartment_name,
      flatNo: client.flat_number,
      percentagePaid: paidPct,
      nextPercentage: nextPct,
      paidAmount,
      dueAmount,
      dueDate: formatDisplayDate(paymentContext.currentDueDate),
      nextStageName: paymentContext.nextStageName,
      nextStageAmount: paymentContext.nextStageAmount,
      nextStagePercentage: paymentContext.nextStagePercentage,
      nextDueDate: formatDisplayDate(paymentContext.nextDueDate),
    });

    const emailResult = await sendMail({
      to: client.email,
      subject: `RG INFRA — Due Payment Reminder | ${client.apartment_name}, Flat ${client.flat_number}`,
      html: emailHtml,
    });

    await logCommunication({
      client_id,
      flat_id: client.flat_id,
      type: 'email',
      channel: 'email',
      subject: `Due Reminder Email — ${client.apartment_name}, Flat ${client.flat_number}`,
      message: emailResult.success ? `Due reminder email sent. Amount: ₹${dueAmount}` : `Email failed: ${emailResult.reason}`,
      recipient_email: client.email,
      status: emailResult.success ? 'sent' : 'failed',
      error_message: emailResult.success ? null : emailResult.reason,
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: `Email failed: ${emailResult.reason}` });
    }

    req.app.get('io')?.emit('data_changed', { type: 'due_reminder_sent', client_id });
    res.json({ message: 'Due reminder email sent successfully' });
  } catch (err) {
    console.error('Send due reminder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/demand-letters/send-enhanced-reminder — Reminder with optional demand letter ──
// Body: { client_id, attach_demand_letter: bool }
router.post('/send-enhanced-reminder', verifyToken, async (req, res) => {
  try {
    const { client_id, attach_demand_letter = false } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await fetchClientFull(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!client.email) return res.status(400).json({ error: 'Client has no email address' });

    const totalAmount = Number(client.total_amount) || 0;

    // Get total paid from client_payments
    const [payResult] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM client_payments WHERE client_id = ?',
      [client_id]
    );
    const totalPaid = Number(payResult[0].total_paid);
    let dueAmount = Math.max(0, totalAmount - totalPaid);
    const paidPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    const paymentContext = await getDemandPaymentContext(client_id);
    dueAmount = paymentContext.dueAmount;
    const gstPercent = paymentContext.gstPercent;

    // Get due date from the earliest unpaid schedule
    const [scheduleRows] = await pool.query(
      `SELECT * FROM payment_schedules WHERE client_id = ? AND status != 'paid' ORDER BY stage_order ASC LIMIT 2`,
      [client_id]
    );
    const dueDateRaw = scheduleRows[0]?.due_date;
    const dueDate = formatDisplayDate(dueDateRaw);
    const nextSchedule = scheduleRows[1] || null;
    const nextDueDate = formatDisplayDate(nextSchedule?.due_date);

    let emailHtml;
    let emailSubject;
    let attachments = [];
    let demandLetterId = null;

    if (attach_demand_letter) {
      // ─── GENERATE DEMAND LETTER PDF ───
      const gstAmount = paymentContext.gstAmount;
      const grandTotal = dueAmount + gstAmount;
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const safeClientName = (client.name || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      const dateStr = formattedDate.replace(/\//g, '-');
      const fileName = `RG_INFRA_Demand_Letter_${safeClientName}_${dateStr}.pdf`;
      const filePath = join(OUTPUT_DIR, fileName);

      await writeDemandLetterPdf({
        clientName: client.name,
        clientAddress: client.address,
        flatNo: client.flat_number,
        floor: client.floor,
        block: client.block,
        apartmentName: client.apartment_name,
        area: client.sbu_area,
        totalAmount,
        stageAmount: paymentContext.stageAmount,
        paidAmount: totalPaid,
        dueAmount,
        gstPercent,
        gstAmount,
        grandTotal,
        duePercentage: paymentContext.duePercentage,
        currentStageName: paymentContext.currentStageName,
        dueDate,
        nextStageName: paymentContext.nextStageName,
        nextStageAmount: paymentContext.nextStageAmount,
        nextStagePercentage: paymentContext.nextStagePercentage,
        nextDueDate,
        landBoundaries: {
          north: client.land_north,
          south: client.land_south,
          east: client.land_east,
          west: client.land_west,
        },
        floorBoundaries: {
          north: client.floor_north,
          south: client.floor_south,
          east: client.floor_east,
          west: client.floor_west,
        },
        date: formattedDate,
        bankDetails: {},
        signatureImage: req.body.signature_image || process.env.SIGNATURE_IMAGE_PATH,
      }, filePath);
      // Save demand letter record
      const fileUrl = `/api/demand-letters/download/${fileName}`;
      const [dlResult] = await pool.query(
        `INSERT INTO demand_letters (client_id, file_name, file_url, generated_date, total_amount, paid_amount, due_amount, gst_percent, gst_amount, grand_total, email_sent) 
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, 1)`,
        [client_id, fileName, fileUrl, totalAmount, totalPaid, dueAmount, gstPercent, gstAmount, grandTotal]
      );
      demandLetterId = dlResult.insertId;

      // Log demand letter generation
      await logCommunication({
        client_id,
        flat_id: client.flat_id,
        type: 'demand_letter',
        channel: 'email',
        subject: `Demand Letter Generated — ${client.apartment_name}, Flat ${client.flat_number}`,
        message: `Demand letter generated with reminder. Total: ₹${totalAmount}, Paid: ₹${totalPaid}, Due: ₹${dueAmount}, Grand Total: ₹${grandTotal}`,
        demand_letter_id: demandLetterId,
        file_url: fileUrl,
        status: 'sent',
      });

      // Use template WITHOUT "demand letter attached" line (PDF speaks for itself)
      emailHtml = dueReminderWithDemandLetterEmail({
        clientName: client.name,
        apartmentName: client.apartment_name,
        flatNo: client.flat_number,
        paidAmount: totalPaid,
        dueAmount,
        gstAmount,
        gstPercent,
        grandTotal,
        dueDate,
        nextStageName: paymentContext.nextStageName,
        nextStageAmount: paymentContext.nextStageAmount,
        nextStagePercentage: paymentContext.nextStagePercentage,
        nextDueDate,
      });

      emailSubject = `RG INFRA — Payment Due Notice | ${client.apartment_name}, Flat ${client.flat_number}`;
      attachments = [{
        filename: fileName,
        path: filePath,
        contentType: 'application/pdf',
      }];
    } else {
      // ─── PLAIN REMINDER (no attachment) ───
      const nextPct = totalAmount > 0 ? Math.round((dueAmount / totalAmount) * 100) : 0;

      emailHtml = dueReminderEmail({
        clientName: client.name,
        apartmentName: client.apartment_name,
        flatNo: client.flat_number,
        percentagePaid: paidPct,
        nextPercentage: nextPct,
        paidAmount: totalPaid,
        dueAmount,
        dueDate,
        nextStageName: paymentContext.nextStageName,
        nextStageAmount: paymentContext.nextStageAmount,
        nextStagePercentage: paymentContext.nextStagePercentage,
        nextDueDate,
      });

      emailSubject = `RG INFRA — Due Payment Reminder | ${client.apartment_name}, Flat ${client.flat_number}`;
    }

    // ─── SEND EMAIL ───
    const emailResult = await sendMail({
      to: client.email,
      subject: emailSubject,
      html: emailHtml,
      attachments,
    });

    // ─── LOG IN COMMUNICATION HISTORY ───
    await logCommunication({
      client_id,
      flat_id: client.flat_id,
      type: attach_demand_letter ? 'demand_letter' : 'email',
      channel: 'email',
      subject: attach_demand_letter
        ? `Due Reminder + Demand Letter — ${client.apartment_name}, Flat ${client.flat_number}`
        : `Due Reminder Email — ${client.apartment_name}, Flat ${client.flat_number}`,
      message: emailResult.success
        ? `${attach_demand_letter ? 'Due reminder with demand letter PDF' : 'Due reminder email'} sent. Due: ₹${dueAmount}`
        : `Email failed: ${emailResult.reason}`,
      recipient_email: client.email,
      demand_letter_id: demandLetterId,
      status: emailResult.success ? 'sent' : 'failed',
      error_message: emailResult.success ? null : emailResult.reason,
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: `Email failed: ${emailResult.reason}` });
    }

    req.app.get('io')?.emit('data_changed', { type: 'due_reminder_sent', client_id });
    res.json({
      message: attach_demand_letter
        ? 'Due reminder with demand letter sent successfully'
        : 'Due reminder email sent successfully',
      attach_demand_letter,
      demand_letter_id: demandLetterId,
    });
  } catch (err) {
    console.error('Send due reminder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/demand-letters — List all demand letters ─────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [letters] = await pool.query(`
      SELECT dl.*, c.name as client_name, c.unique_client_id,
        a.name as apartment_name, f.flat_number
      FROM demand_letters dl
      LEFT JOIN clients c ON dl.client_id = c.id
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      ORDER BY dl.generated_date DESC
    `);
    res.json(letters);
  } catch (err) {
    console.error('List demand letters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/demand-letters/client/:clientId — Letters for a specific client
router.get('/client/:clientId', verifyToken, async (req, res) => {
  try {
    const [letters] = await pool.query(`
      SELECT dl.*, c.name as client_name
      FROM demand_letters dl
      LEFT JOIN clients c ON dl.client_id = c.id
      WHERE dl.client_id = ?
      ORDER BY dl.generated_date DESC
    `, [req.params.clientId]);
    res.json(letters);
  } catch (err) {
    console.error('Get client demand letters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/demand-letters/download/:filename — Serve the PDF ────────────
router.get('/download/:filename', async (req, res) => {
  try {
    const filePath = join(OUTPUT_DIR, req.params.filename);
    if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Download demand letter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/demand-letters/:id — Remove a demand letter ───────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [letters] = await pool.query('SELECT file_name FROM demand_letters WHERE id = ?', [req.params.id]);
    if (letters.length > 0) {
      const filePath = join(OUTPUT_DIR, letters[0].file_name);
      const { unlinkSync } = await import('fs');
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch (e) { /* silent */ }
      }
    }
    await pool.query('DELETE FROM demand_letters WHERE id = ?', [req.params.id]);
    res.json({ message: 'Demand letter deleted' });
  } catch (err) {
    console.error('Delete demand letter error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
