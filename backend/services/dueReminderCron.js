/**
 * ═══════════════════════════════════════════════════════════════════
 * RG INFRA — Automated Due Reminder Cron Service
 * ═══════════════════════════════════════════════════════════════════
 * Runs daily at 9:00 AM IST
 * 
 * Logic:
 * 1. Find all payment_schedules with due_date <= today AND status != 'paid'
 * 2. Recalculate dues (carry-forward partial payments)
 * 3. Check reminder_logs to avoid duplicate reminders for same due_date
 * 4. Generate demand letter PDF
 * 5. Send email with PDF attachment
 * 6. Generate WhatsApp redirect (logged as 'initiated')
 * 7. Log everything to reminder_logs + communication_history
 */

import cron from 'node-cron';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { sendMail } from '../utils/mailer.js';
import { demandLetterEmail } from '../utils/emailTemplates.js';
import { recalculateDues as recalculateLedgerDues } from './paymentLedger.js';
import { writeDemandLetterPdf } from './pdf/demandLetterPdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '..', 'generated_demand_letters');
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ────────────────────────────────────────────────────────────────────
// Helper: Check if a reminder was already sent today for this client
// ────────────────────────────────────────────────────────────────────
async function wasReminderSentToday(clientId, dueDate) {
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await pool.query(
    `SELECT id FROM reminder_logs 
     WHERE client_id = ? AND due_date = ? AND DATE(sent_on) = ?
     LIMIT 1`,
    [clientId, dueDate, today]
  );
  return rows.length > 0;
}

// ────────────────────────────────────────────────────────────────────
// Helper: Generate demand letter PDF (reuses existing template)
// ────────────────────────────────────────────────────────────────────
async function generateDemandLetterPDF(client, dueInfo) {
  const totalAmount = dueInfo.total_flat_amount;
  const paidAmount = dueInfo.total_paid;
  const dueAmount = Number(dueInfo.current_due ?? dueInfo.current_stage_due ?? dueInfo.combined_due ?? 0);
  const gstPercent = Number(dueInfo.gst_percent || 0);
  const gstAmount = Number(dueInfo.gst_amount ?? (dueAmount * gstPercent / 100));
  const grandTotal = Number(dueInfo.total_payable ?? (dueAmount + gstAmount));
  const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const safeClientName = (client.name || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const dateStr = formattedDate.replace(/\//g, '-');
  const fileName = `RG_INFRA_Due_Reminder_${safeClientName}_${dateStr}.pdf`;
  const filePath = join(OUTPUT_DIR, fileName);

  try {
    await writeDemandLetterPdf({
      clientName: client.name,
      flatNo: client.flat_number,
      block: client.block,
      apartmentName: client.apartment_name,
      area: client.sbu_area,
      totalAmount,
      stageAmount: dueInfo.current_stage_due || dueAmount,
      paidAmount,
      dueAmount,
      gstPercent,
      gstAmount,
      grandTotal,
      currentStageName: dueInfo.current_stage,
      nextStageName: dueInfo.next_stage,
      nextStageAmount: dueInfo.next_stage_amount,
      dueDate: dueInfo.current_due_date,
      nextDueDate: dueInfo.next_due_date,
      date: formattedDate,
      bankDetails: {},
      signatureImage: process.env.SIGNATURE_IMAGE_PATH,
    }, filePath);

    // Save demand letter record
    const fileUrl = `/api/demand-letters/download/${fileName}`;
    const [result] = await pool.query(
      `INSERT INTO demand_letters (client_id, file_name, file_url, generated_date, total_amount, paid_amount, due_amount, gst_percent, gst_amount, grand_total, email_sent, whatsapp_sent) 
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client.id, fileName, fileUrl, totalAmount, paidAmount, dueAmount, gstPercent, gstAmount, grandTotal, true, false]
    );

    return { id: result.insertId, fileName, filePath, fileUrl, grandTotal, gstAmount };
  } catch (err) {
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────
// Helper: Log to communication_history
// ────────────────────────────────────────────────────────────────────
async function logCommunication(data) {
  try {
    await pool.query(
      `INSERT INTO communication_history 
       (client_id, flat_id, type, channel, subject, message, recipient_email, recipient_phone, demand_letter_id, file_url, status, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.client_id, data.flat_id || null, data.type, data.channel || 'email', data.subject || null,
       data.message || null, data.recipient_email || null, data.recipient_phone || null,
       data.demand_letter_id || null, data.file_url || null, data.status || 'sent', data.error_message || null]
    );
  } catch (err) {
    console.error('   ❌ Log communication error:', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// MAIN CRON JOB: Process all due reminders
// ════════════════════════════════════════════════════════════════════
async function processDueReminders(io, triggerType = 'cron') {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n⏰ [DUE REMINDER] Starting ${triggerType} run — ${today}`);

  try {
    // 1. Find all payment_schedules where due_date <= today AND status != 'paid'
    const [overdueSchedules] = await pool.query(`
      SELECT ps.*, c.id as client_id, c.name as client_name, c.email as client_email,
        c.phone as client_phone, c.flat_id,
        f.flat_number, f.sbu_area, f.total_amount as flat_total_amount,
        a.name as apartment_name
      FROM payment_schedules ps
      JOIN clients c ON ps.client_id = c.id
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      WHERE ps.due_date <= ? AND ps.status != 'paid'
      ORDER BY ps.client_id, ps.stage_order
    `, [today]);

    if (overdueSchedules.length === 0) {
      console.log('   ✅ No due reminders to send.');
      return { processed: 0, sent: 0, skipped: 0, failed: 0 };
    }

    // 2. Group by client to send one combined reminder per client
    const clientMap = new Map();
    for (const sch of overdueSchedules) {
      if (!clientMap.has(sch.client_id)) {
        clientMap.set(sch.client_id, {
          client: {
            id: sch.client_id,
            name: sch.client_name,
            email: sch.client_email,
            phone: sch.client_phone,
            flat_id: sch.flat_id,
            flat_number: sch.flat_number,
            sbu_area: sch.sbu_area,
            apartment_name: sch.apartment_name,
          },
          schedules: [],
        });
      }
      clientMap.get(sch.client_id).schedules.push(sch);
    }

    console.log(`   📋 Found ${clientMap.size} client(s) with overdue schedules.`);

    let sent = 0, skipped = 0, failed = 0;

    // 3. Process each client
    for (const [clientId, { client, schedules }] of clientMap) {
      try {
        // Get the earliest overdue schedule for duplicate check
        const earliestDueDate = schedules[0].due_date;

        // Check for duplicate reminder
        const alreadySent = await wasReminderSentToday(clientId, earliestDueDate);
        if (alreadySent) {
          console.log(`   ⏭️  ${client.name} — already reminded today, skipping`);
          skipped++;
          continue;
        }

        // Recalculate dues with carry-forward
        const dueInfo = await recalculateLedgerDues(clientId);
        const currentDue = Number(dueInfo?.current_due ?? dueInfo?.current_stage_due ?? dueInfo?.combined_due ?? 0);
        if (!dueInfo || currentDue <= 0) {
          console.log(`   ⏭️  ${client.name} — no current due, skipping`);
          skipped++;
          continue;
        }
        const currentDueDate = dueInfo.current_due_date
          ? new Date(dueInfo.current_due_date).toISOString().slice(0, 10)
          : null;
        if (currentDueDate && currentDueDate > today) {
          console.log(`   ⏭️  ${client.name} — current installment is not due yet (${currentDueDate}), skipping`);
          skipped++;
          continue;
        }

        console.log(`   📨 Processing: ${client.name} | Current Due: ₹${currentDue}`);

        // Generate demand letter PDF
        let demandLetter = null;
        try {
          demandLetter = await generateDemandLetterPDF(client, dueInfo);
          console.log(`   📄 PDF generated: ${demandLetter.fileName}`);
        } catch (pdfErr) {
          console.error(`   ❌ PDF generation failed for ${client.name}:`, pdfErr.message);
        }

        // Send email with PDF attachment
        let emailStatus = 'skipped';
        let emailError = null;
        if (client.email) {
          try {
            const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const emailHtml = demandLetterEmail({
              clientName: client.name,
              apartmentName: client.apartment_name,
              flatNo: client.flat_number,
              dueAmount: currentDue,
              gstAmount: demandLetter?.gstAmount || dueInfo.gst_amount || 0,
              gstPercent: dueInfo.gst_percent || 0,
              grandTotal: demandLetter?.grandTotal || dueInfo.total_payable || currentDue,
              date: formattedDate,
            });

            const attachments = demandLetter ? [{
              filename: demandLetter.fileName,
              path: demandLetter.filePath,
              contentType: 'application/pdf',
            }] : [];

            const emailResult = await sendMail({
              to: client.email,
              subject: `RG INFRA — Due Payment Reminder | ${client.apartment_name}, Flat ${client.flat_number}`,
              html: emailHtml,
              attachments,
            });

            emailStatus = emailResult.success ? 'sent' : 'failed';
            if (!emailResult.success) emailError = emailResult.reason;

            // Log email to communication history
            await logCommunication({
              client_id: clientId,
              flat_id: client.flat_id,
              type: 'email',
              channel: 'email',
              subject: `[Auto] Due Reminder — ${client.apartment_name}, Flat ${client.flat_number}`,
              message: emailResult.success
                ? `Automated due reminder sent. Current pending: ₹${currentDue}`
                : `Auto reminder email failed: ${emailResult.reason}`,
              recipient_email: client.email,
              demand_letter_id: demandLetter?.id || null,
              file_url: demandLetter?.fileUrl || null,
              status: emailResult.success ? 'sent' : 'failed',
              error_message: emailError,
            });

            console.log(`   ✉️  Email ${emailStatus}: ${client.email}`);
          } catch (emailErr) {
            emailStatus = 'failed';
            emailError = emailErr.message;
            console.error(`   ❌ Email failed for ${client.name}:`, emailErr.message);
          }
        } else {
          console.log(`   ⚠️  No email for ${client.name} — skipping email`);
        }

        // Log WhatsApp as initiated (since cron can't open browser)
        if (client.phone) {
          await logCommunication({
            client_id: clientId,
            flat_id: client.flat_id,
            type: 'whatsapp',
            channel: 'whatsapp',
            subject: `[Auto] WhatsApp Due Reminder — ${client.apartment_name}, Flat ${client.flat_number}`,
            message: `Automated WhatsApp reminder queued. Current pending: ₹${currentDue}. Phone: ${client.phone}`,
            recipient_phone: client.phone,
            demand_letter_id: demandLetter?.id || null,
            status: 'initiated',
          });
        }

        // Find next due date from upcoming unpaid schedules
        const [nextDueDates] = await pool.query(
          `SELECT due_date FROM payment_schedules 
           WHERE client_id = ? AND status != 'paid' AND due_date > ?
           ORDER BY stage_order ASC LIMIT 1`,
          [clientId, today]
        );
        const nextDueDate = nextDueDates[0]?.due_date || null;

        // Log to reminder_logs
        await pool.query(
          `INSERT INTO reminder_logs 
           (client_id, flat_id, schedule_id, stage_name, due_date, combined_due, current_stage_due, 
            next_stage_amount, email_sent, email_status, whatsapp_initiated, demand_letter_id, 
            trigger_type, next_due_date, error_message) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clientId, client.flat_id, dueInfo.current_schedule_id || schedules[0].id,
            dueInfo.current_stage || schedules[0].stage_name, earliestDueDate,
            currentDue, dueInfo.current_stage_due, dueInfo.next_stage_amount,
            emailStatus === 'sent', emailStatus,
            !!client.phone, demandLetter?.id || null,
            triggerType, nextDueDate, emailError,
          ]
        );

        sent++;
        console.log(`   ✅ Done: ${client.name}`);
      } catch (clientErr) {
        failed++;
        console.error(`   ❌ Error processing ${client.name}:`, clientErr.message);
      }
    }

    const summary = { processed: clientMap.size, sent, skipped, failed };
    console.log(`\n⏰ [DUE REMINDER] Complete — Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}\n`);

    // Emit socket event for real-time UI update
    io?.emit('data_changed', { type: 'due_reminders_processed', ...summary });

    return summary;
  } catch (err) {
    console.error('⏰ [DUE REMINDER] Fatal error:', err);
    return { processed: 0, sent: 0, skipped: 0, failed: 0, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// START CRON: Schedule daily at 9:00 AM IST (3:30 AM UTC)
// ════════════════════════════════════════════════════════════════════
let cronJob = null;

export function startDueReminderCron(io) {
  // Run every day at 9:00 AM IST → 3:30 AM UTC
  // Cron format: minute hour day month weekday
  cronJob = cron.schedule('30 3 * * *', async () => {
    console.log('🔔 Cron triggered: Daily due reminder check');
    await processDueReminders(io, 'cron');
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('🕘 Due Reminder Cron: Scheduled daily at 9:00 AM IST');
  return cronJob;
}

export function stopDueReminderCron() {
  if (cronJob) {
    cronJob.stop();
    console.log('🛑 Due Reminder Cron: Stopped');
  }
}

// Export for manual trigger from API
export { processDueReminders };
