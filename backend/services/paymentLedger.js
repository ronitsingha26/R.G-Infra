import pool from '../config/db.js';

function asDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

async function loadClientFinancials(queryRunner, clientId) {
  const [clients] = await queryRunner.query(
    `SELECT c.id, c.flat_id, c.purchase_date,
        f.total_amount, f.gst_percent, f.apartment_id,
        b.id AS booking_id, b.flat_value
     FROM clients c
     LEFT JOIN flats f ON c.flat_id = f.id
     LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
     WHERE c.id = ?`,
    [clientId]
  );

  if (clients.length === 0) {
    const error = new Error('Client not found');
    error.status = 404;
    throw error;
  }

  const client = clients[0];
  const totalAmount = Number(client.flat_value || client.total_amount || 0);
  if (totalAmount <= 0) {
    const error = new Error('Flat has no total amount set');
    error.status = 400;
    throw error;
  }

  return { ...client, totalAmount };
}

async function loadStages(queryRunner, apartmentId) {
  const [plans] = await queryRunner.query(
    'SELECT * FROM payment_plans WHERE apartment_id = ? AND is_active = TRUE ORDER BY id DESC LIMIT 1',
    [apartmentId]
  );

  if (plans.length > 0) {
    const [installments] = await queryRunner.query(
      `SELECT id, stage_name, percentage, stage_order, due_days_offset
       FROM payment_installments
       WHERE payment_plan_id = ?
       ORDER BY stage_order ASC`,
      [plans[0].id]
    );
    return { paymentPlanId: plans[0].id, gstPercent: Number(plans[0].gst_percent || 0), stages: installments };
  }

  const [apartmentStages] = await queryRunner.query(
    `SELECT * FROM payment_stages
     WHERE apartment_id = ?
     ORDER BY stage_order ASC`,
    [apartmentId]
  );
  if (apartmentStages.length > 0) {
    return { paymentPlanId: null, gstPercent: 0, stages: apartmentStages };
  }

  const [globalStages] = await queryRunner.query(
    `SELECT * FROM payment_stages
     WHERE apartment_id IS NULL
     ORDER BY stage_order ASC`
  );
  return { paymentPlanId: null, gstPercent: 0, stages: globalStages };
}

export async function generatePaymentSchedule(clientId, queryRunner = pool) {
  const client = await loadClientFinancials(queryRunner, clientId);
  const { paymentPlanId, gstPercent, stages } = await loadStages(queryRunner, client.apartment_id);

  if (stages.length === 0) {
    const error = new Error('No payment stages defined. Please add stages first.');
    error.status = 400;
    throw error;
  }

  await queryRunner.query('DELETE FROM payment_schedules WHERE client_id = ?', [clientId]);

  for (const stage of stages) {
    const amount = (Number(stage.percentage) / 100) * client.totalAmount;
    const gstAmount = amount * (Number(gstPercent || 0) / 100);
    const dueDate = stage.due_days_offset !== undefined && client.purchase_date
      ? asDateOnly(new Date(new Date(client.purchase_date).getTime() + Number(stage.due_days_offset || 0) * 86400000))
      : null;

    await queryRunner.query(
      `INSERT INTO payment_schedules
        (client_id, booking_id, flat_id, payment_plan_id, stage_id, stage_name, percentage, amount, gst_amount, due_amount, due_date, stage_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        client.booking_id || null,
        client.flat_id,
        paymentPlanId,
        paymentPlanId ? null : stage.id,
        stage.stage_name,
        stage.percentage,
        amount,
        gstAmount,
        amount,
        dueDate,
        stage.stage_order,
      ]
    );
  }

  return recalculateDues(clientId, queryRunner);
}

export async function ensurePaymentSchedule(clientId, queryRunner = pool) {
  const [[{ count }]] = await queryRunner.query(
    'SELECT COUNT(*) AS count FROM payment_schedules WHERE client_id = ?',
    [clientId]
  );

  if (Number(count) === 0) {
    return generatePaymentSchedule(clientId, queryRunner);
  }

  return recalculateDues(clientId, queryRunner);
}

export async function recalculateDues(clientId, queryRunner = pool) {
  const [schedules] = await queryRunner.query(
    `SELECT ps.*, wp.id as wp_id 
     FROM payment_schedules ps 
     LEFT JOIN work_projections wp ON wp.client_id = ps.client_id AND wp.milestone_name = ps.stage_name AND wp.status = 'completed'
     WHERE ps.client_id = ? 
     ORDER BY CASE WHEN wp.id IS NOT NULL THEN 0 ELSE 1 END, ps.stage_order ASC, ps.id ASC`,
    [clientId]
  );
  if (schedules.length === 0) return null;

  const [payResult] = await queryRunner.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid,
        MAX(payment_date) AS latest_payment_date
     FROM client_payments
     WHERE client_id = ?`,
    [clientId]
  );
  const totalPaid = Number(payResult[0].total_paid || 0);
  const latestPaymentDate = asDateOnly(payResult[0].latest_payment_date);

  const [clientData] = await queryRunner.query(
    `SELECT c.flat_id, COALESCE(b.id, NULL) AS booking_id,
        COALESCE(b.flat_value, f.total_amount, 0) AS total_amount,
        COALESCE(NULLIF(f.gst_percent, 0), (
          SELECT pp.gst_percent
          FROM payment_plans pp
          WHERE pp.apartment_id = a.id AND pp.is_active = TRUE
          ORDER BY pp.id DESC
          LIMIT 1
        ), 0) AS gst_percent
     FROM clients c
     LEFT JOIN flats f ON c.flat_id = f.id
     LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
     LEFT JOIN apartments a ON f.apartment_id = a.id
     WHERE c.id = ?`,
    [clientId]
  );

  const totalFlatAmount = Number(clientData[0]?.total_amount || 0);
  const gstPercent = Number(clientData[0]?.gst_percent || 0);
  const totalDue = Math.max(0, totalFlatAmount - totalPaid);

  let remainingPaid = totalPaid;
  let currentStage = null;
  let nextStage = null;
  let currentScheduleId = null;

  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const stageAmount = Number(schedule.amount || 0);

    if (remainingPaid >= stageAmount) {
      remainingPaid -= stageAmount;
      await queryRunner.query(
        `UPDATE payment_schedules
         SET paid_amount = ?, due_amount = 0, status = 'paid', paid_date = COALESCE(?, paid_date)
         WHERE id = ?`,
        [stageAmount, latestPaymentDate, schedule.id]
      );
    } else if (remainingPaid > 0) {
      const paidHere = remainingPaid;
      const dueHere = Math.max(0, stageAmount - paidHere);
      remainingPaid = 0;
      await queryRunner.query(
        `UPDATE payment_schedules
         SET paid_amount = ?, due_amount = ?, status = 'partial', paid_date = ?
         WHERE id = ?`,
        [paidHere, dueHere, latestPaymentDate, schedule.id]
      );
      currentStage = { ...schedule, status: 'partial', paid_amount: paidHere, due_amount: dueHere, paid_date: latestPaymentDate };
      currentScheduleId = schedule.id;
      if (i + 1 < schedules.length) nextStage = schedules[i + 1];
    } else {
      await queryRunner.query(
        `UPDATE payment_schedules
         SET paid_amount = 0, due_amount = ?, status = 'pending', paid_date = NULL
         WHERE id = ?`,
        [stageAmount, schedule.id]
      );
      if (!currentStage) {
        currentStage = { ...schedule, status: 'pending', paid_amount: 0, due_amount: stageAmount, paid_date: null };
        currentScheduleId = schedule.id;
        if (i + 1 < schedules.length) nextStage = schedules[i + 1];
      }
    }
  }

  const currentStageDue = Number(currentStage?.due_amount || 0);
  const nextStageAmount = Number(nextStage?.amount || 0);
  const carryOver = currentStage?.status === 'partial' ? currentStageDue : 0;
  const nextInstallmentAmount = nextStageAmount + carryOver;
  // Future installments stay informational. "Due now" is only the current pending stage.
  const currentDue = Math.min(totalDue, currentStageDue);
  const gstAmount = Math.round(currentDue * (gstPercent / 100) * 100) / 100;
  const totalPayable = Math.round((currentDue + gstAmount) * 100) / 100;
  const combinedDue = carryOver > 0 && nextStageAmount > 0 ? currentStageDue + nextStageAmount : currentDue;

  await queryRunner.query(
    `INSERT INTO dues
      (client_id, booking_id, flat_id, total_flat_amount, total_paid, total_due,
       current_stage_name, current_stage_due, current_due, current_due_date,
       next_stage_name, next_stage_amount, next_installment_amount, next_due_date,
       gst_percent, gst_amount, total_payable, combined_due)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       booking_id = VALUES(booking_id),
       flat_id = VALUES(flat_id),
       total_flat_amount = VALUES(total_flat_amount),
       total_paid = VALUES(total_paid),
       total_due = VALUES(total_due),
       current_stage_name = VALUES(current_stage_name),
       current_stage_due = VALUES(current_stage_due),
       current_due = VALUES(current_due),
       current_due_date = VALUES(current_due_date),
       next_stage_name = VALUES(next_stage_name),
       next_stage_amount = VALUES(next_stage_amount),
       next_installment_amount = VALUES(next_installment_amount),
       next_due_date = VALUES(next_due_date),
       gst_percent = VALUES(gst_percent),
       gst_amount = VALUES(gst_amount),
       total_payable = VALUES(total_payable),
       combined_due = VALUES(combined_due)`,
    [
      clientId,
      clientData[0]?.booking_id || null,
      clientData[0]?.flat_id || null,
      totalFlatAmount,
      totalPaid,
      totalDue,
      currentStage?.stage_name || null,
      currentStageDue,
      currentDue,
      asDateOnly(currentStage?.due_date),
      nextStage?.stage_name || null,
      nextStageAmount,
      nextInstallmentAmount,
      asDateOnly(nextStage?.due_date),
      gstPercent,
      gstAmount,
      totalPayable,
      combinedDue,
    ]
  );

  return {
    total_flat_amount: totalFlatAmount,
    total_paid: totalPaid,
    total_due: totalDue,
    current_stage: currentStage?.stage_name || null,
    current_stage_due: currentStageDue,
    current_due: currentDue,
    current_schedule_id: currentScheduleId,
    current_due_date: currentStage?.due_date || null,
    next_stage: nextStage?.stage_name || null,
    next_stage_amount: nextStageAmount,
    next_installment_amount: nextInstallmentAmount,
    next_due_date: nextStage?.due_date || null,
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    total_payable: totalPayable,
    combined_due: combinedDue,
  };
}
