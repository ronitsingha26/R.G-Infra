import pool from '../config/db.js';

function toSqlDate(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export async function syncDueReminders(clientId = null, queryRunner = pool) {
  const params = [];
  const clientClause = clientId ? 'AND ps.client_id = ?' : '';
  if (clientId) params.push(clientId);

  const [schedules] = await queryRunner.query(`
    SELECT
      ps.id AS schedule_id,
      ps.client_id,
      ps.flat_id,
      ps.stage_name,
      ps.stage_order,
      ps.percentage,
      ps.amount,
      ps.due_amount,
      ps.gst_amount AS schedule_gst_amount,
      ps.due_date,
      ps.status AS schedule_status,
      c.name AS client_name,
      c.phone,
      c.email,
      f.flat_number,
      COALESCE(NULLIF(f.gst_percent, 0), (
        SELECT pp.gst_percent
        FROM payment_plans pp
        WHERE pp.apartment_id = a.id AND pp.is_active = TRUE
        ORDER BY pp.id DESC
        LIMIT 1
      ), 0) AS gst_percent,
      COALESCE(b.flat_value, f.total_amount, 0) AS total_amount,
      a.name AS apartment_name,
      wp.id AS work_projection_id,
      COALESCE(cp.total_paid, 0) AS total_paid
    FROM payment_schedules ps
    JOIN clients c ON c.id = ps.client_id
    LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
    LEFT JOIN flats f ON f.id = ps.flat_id
    LEFT JOIN apartments a ON a.id = f.apartment_id
    JOIN work_projections wp
      ON wp.client_id = ps.client_id
      AND wp.milestone_name = ps.stage_name
      AND wp.status = 'completed'
    LEFT JOIN (
      SELECT client_id, SUM(amount) AS total_paid
      FROM client_payments
      GROUP BY client_id
    ) cp ON cp.client_id = ps.client_id
    WHERE ps.status != 'paid' ${clientClause}
  `, params);

  const grouped = new Map();
  for (const row of schedules) {
    if (!grouped.has(row.client_id)) grouped.set(row.client_id, []);
    grouped.get(row.client_id).push(row);
  }

  const collapsedByScheduleId = new Map();
  const skipScheduleIds = new Set();
  for (const rows of grouped.values()) {
    const sorted = rows.sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0) || a.schedule_id - b.schedule_id);
    if (sorted.length <= 1) continue;

    const target = sorted[sorted.length - 1];
    const totalDue = sorted.reduce((sum, row) => sum + Number(row.due_amount || row.amount || 0), 0);
    const totalPct = sorted.reduce((sum, row) => sum + Number(row.percentage || 0), 0);
    const dueDates = sorted
      .map((row) => (row.due_date ? toSqlDate(row.due_date) : null))
      .filter(Boolean)
      .sort();
    const earliestDueDate = dueDates.length ? dueDates[0] : null;

    collapsedByScheduleId.set(target.schedule_id, {
      dueAmount: totalDue,
      percentage: totalPct,
      dueDate: earliestDueDate,
    });

    for (const row of sorted.slice(0, -1)) {
      skipScheduleIds.add(row.schedule_id);
    }
  }

  for (const row of schedules) {
    if (skipScheduleIds.has(row.schedule_id)) continue;

    const override = collapsedByScheduleId.get(row.schedule_id) || null;
    const dueDate = override?.dueDate || (row.due_date ? toSqlDate(row.due_date) : null);
    const status = dueDate && dueDate < toSqlDate(new Date()) ? 'overdue' : 'upcoming';
    const baseDue = Number(row.due_amount || row.amount || 0);
    const dueAmount = Number(override?.dueAmount || baseDue);
    const paymentPercentage = Number(override?.percentage || row.percentage || 0);
    const gstPercent = Number(row.gst_percent || 0);
    const gstAmount = Math.round((dueAmount * gstPercent) / 100 * 100) / 100;

    await queryRunner.query(
      `INSERT INTO due_reminders
       (client_id, flat_id, schedule_id, work_projection_id, client_name, phone, email, flat_unit,
        apartment_name, projection_stage, payment_percentage, total_amount, total_paid, due_amount,
        gst_percent, gst_amount, total_payable, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        client_id = VALUES(client_id),
        flat_id = VALUES(flat_id),
        work_projection_id = VALUES(work_projection_id),
        client_name = VALUES(client_name),
        phone = VALUES(phone),
        email = VALUES(email),
        flat_unit = VALUES(flat_unit),
        apartment_name = VALUES(apartment_name),
        projection_stage = VALUES(projection_stage),
        payment_percentage = VALUES(payment_percentage),
        total_amount = VALUES(total_amount),
        total_paid = VALUES(total_paid),
        due_amount = VALUES(due_amount),
        gst_percent = VALUES(gst_percent),
        gst_amount = VALUES(gst_amount),
        total_payable = VALUES(total_payable),
        due_date = VALUES(due_date),
        status = VALUES(status)`,
      [
        row.client_id,
        row.flat_id || null,
        row.schedule_id,
        row.work_projection_id || null,
        row.client_name,
        row.phone || null,
        row.email || null,
        row.flat_number || null,
        row.apartment_name || null,
        row.stage_name,
        paymentPercentage,
        Number(row.total_amount || row.amount || 0),
        Number(row.total_paid || 0),
        dueAmount,
        gstPercent,
        gstAmount,
        Math.round((dueAmount + gstAmount) * 100) / 100,
        dueDate,
        status,
      ]
    );
  }

  if (skipScheduleIds.size > 0) {
    const ids = Array.from(skipScheduleIds);
    const placeholders = ids.map(() => '?').join(',');
    await queryRunner.query(`DELETE FROM due_reminders WHERE schedule_id IN (${placeholders})`, ids);
  }

  const cleanupParams = [];
  const cleanupClient = clientId ? 'AND dr.client_id = ?' : '';
  if (clientId) cleanupParams.push(clientId);
  await queryRunner.query(
    `DELETE dr
     FROM due_reminders dr
     LEFT JOIN payment_schedules ps ON ps.id = dr.schedule_id
     LEFT JOIN work_projections wp ON wp.id = dr.work_projection_id
     WHERE (ps.id IS NULL OR ps.status = 'paid' OR wp.id IS NULL OR wp.status != 'completed') ${cleanupClient}`,
    cleanupParams
  );

  return schedules.length;
}

export async function refreshDueReminderStatuses(queryRunner = pool) {
  await queryRunner.query(`
    UPDATE due_reminders dr
    LEFT JOIN payment_schedules ps ON ps.id = dr.schedule_id
    SET dr.status = CASE
      WHEN ps.status = 'paid' THEN 'paid'
      WHEN dr.due_date IS NOT NULL AND dr.due_date < CURDATE() THEN 'overdue'
      ELSE 'upcoming'
    END,
    dr.due_amount = CASE WHEN ps.status = 'paid' THEN 0 ELSE dr.due_amount END
  `);
}
