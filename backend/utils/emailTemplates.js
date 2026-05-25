const COMPANY = {
  name: 'R G Infra',
  address: '505, H-Square, Ranchi - 834001',
  phone: '+91 93347 00319',
  email: 'rginfra22@gmail.com',
  gstin: '20ABFFR2754J1ZA',
};

const BANK = {
  accountName: 'RG INFRA GREEN VILLE PH 2 MASTER COL AC',
  bankName: 'HDFC Bank',
  branch: 'Lalpur, Ranchi',
  accountNumber: '50200105157831',
  ifscCode: 'HDFC0000719',
};

function inr(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/-`;
}

function pct(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function shell(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:680px;margin:28px auto;background:#ffffff;border:1px solid #dbe3ee;">
    <div style="padding:24px 30px 18px;border-bottom:3px solid #1f2937;">
      <div style="font-size:26px;font-weight:800;letter-spacing:.2px;color:#111827;">${COMPANY.name}</div>
      <div style="margin-top:6px;font-size:12px;line-height:1.45;color:#4b5563;">
        ${COMPANY.address}<br>
        Ph: ${COMPANY.phone} | Email: ${COMPANY.email}<br>
        GSTIN: ${COMPANY.gstin}
      </div>
    </div>
    <div style="padding:24px 30px;">
      <div style="font-size:17px;font-weight:700;margin:0 0 18px;color:#111827;">${title}</div>
      ${body}
    </div>
    <div style="padding:16px 30px;background:#f8fafc;border-top:1px solid #dbe3ee;font-size:11px;color:#64748b;line-height:1.45;">
      <strong>${COMPANY.name}</strong><br>
      ${COMPANY.address} | ${COMPANY.phone} | ${COMPANY.email}
    </div>
  </div>
</body>
</html>`;
}

function bankBlock() {
  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0 0;font-size:13px;">
      <tr><td style="border:1px solid #d1d5db;padding:8px 10px;background:#f9fafb;font-weight:700;width:150px;">Name</td><td style="border:1px solid #d1d5db;padding:8px 10px;">${BANK.accountName}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:8px 10px;background:#f9fafb;font-weight:700;">Bank</td><td style="border:1px solid #d1d5db;padding:8px 10px;">${BANK.bankName}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:8px 10px;background:#f9fafb;font-weight:700;">Branch</td><td style="border:1px solid #d1d5db;padding:8px 10px;">${BANK.branch}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:8px 10px;background:#f9fafb;font-weight:700;">Account No.</td><td style="border:1px solid #d1d5db;padding:8px 10px;">${BANK.accountNumber}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:8px 10px;background:#f9fafb;font-weight:700;">IFSC</td><td style="border:1px solid #d1d5db;padding:8px 10px;">${BANK.ifscCode}</td></tr>
    </table>`;
}

export function paymentReceivedEmail({
  clientName,
  projectName,
  amountReceived,
  paymentDate,
  paymentMode,
  referenceNo,
  totalPaid,
  totalAmount,
  dueAmount,
  progress,
}) {
  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 14px;">Dear <strong>${clientName}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      We acknowledge receipt of your payment towards <strong>${projectName || 'your booked unit'}</strong>. The payment details are given below for your records.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px;">
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Amount Received</td><td style="border:1px solid #d1d5db;padding:9px 10px;color:#047857;font-weight:700;">${inr(amountReceived)}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Payment Date</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${paymentDate || 'N/A'}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Payment Mode</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${paymentMode || 'N/A'}</td></tr>
      ${referenceNo ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Reference No.</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${referenceNo}</td></tr>` : ''}
    </table>
    <div style="background:#f8fafc;border-left:3px solid #1f2937;padding:12px 14px;font-size:13px;line-height:1.55;">
      Total Value: <strong>${inr(totalAmount)}</strong><br>
      Total Paid: <strong>${inr(totalPaid)}</strong><br>
      Balance Due: <strong>${inr(dueAmount)}</strong><br>
      Payment Progress: <strong>${progress || 0}%</strong>
    </div>
    <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">Thank you for your payment.</p>`;

  return shell('Payment Receipt Confirmation', body);
}

export function dueReminderEmail({
  clientName,
  apartmentName,
  flatNo,
  percentagePaid,
  nextPercentage,
  paidAmount,
  dueAmount,
  dueDate,
  nextStageName,
  nextStagePercentage,
  nextStageAmount,
  nextDueDate,
  projects,
  totalDue,
}) {
  if (Array.isArray(projects) && projects.length > 0) {
    const rows = projects.map((project) => `
      <tr>
        <td style="border:1px solid #d1d5db;padding:9px 10px;">${project.name || 'Project'}</td>
        <td style="border:1px solid #d1d5db;padding:9px 10px;text-align:right;">${inr(project.totalPaid)}</td>
        <td style="border:1px solid #d1d5db;padding:9px 10px;text-align:right;color:#b91c1c;font-weight:700;">${inr(project.dueAmount)}</td>
      </tr>
    `).join('');
    const body = `
      <p style="font-size:14px;line-height:1.65;margin:0 0 14px;">Dear <strong>${clientName}</strong>,</p>
      <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
        This is a reminder regarding outstanding payment against your booking/project with R G Infra.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px;">
        <tr>
          <th style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;text-align:left;">Project</th>
          <th style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;text-align:right;">Paid</th>
          <th style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;text-align:right;">Due</th>
        </tr>
        ${rows}
        <tr>
          <td colspan="2" style="border:1px solid #111827;padding:9px 10px;background:#111827;color:#fff;font-weight:700;">Total Due</td>
          <td style="border:1px solid #111827;padding:9px 10px;background:#111827;color:#fff;font-weight:700;text-align:right;">${inr(totalDue)}</td>
        </tr>
      </table>
      <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">You are requested to arrange the outstanding payment within one week.</p>
      <div style="font-size:13px;font-weight:700;margin-top:18px;">Bank details for payment:</div>
      ${bankBlock()}
      <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">Thanking you,<br>For R G INFRA</p>`;

    return shell('Payment Due Reminder', body);
  }

  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 14px;">Dear <strong>${clientName}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      This is a reminder regarding the outstanding payment towards your booking of
      <strong>${apartmentName || 'the project'}, Flat No. ${flatNo || 'N/A'}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px;">
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Amount Received (${pct(percentagePaid)}%)</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(paidAmount)}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Current Due (${pct(nextPercentage)}%)</td><td style="border:1px solid #d1d5db;padding:9px 10px;color:#b91c1c;font-weight:700;">${inr(dueAmount)}</td></tr>
      ${dueDate ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Complete By</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${dueDate}</td></tr>` : ''}
      ${nextStageAmount ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Next Payment</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${nextStageName || 'Next stage'}${nextStagePercentage ? ` (${pct(nextStagePercentage)}%)` : ''}: <strong>${inr(nextStageAmount)}</strong>${nextDueDate ? ` by ${nextDueDate}` : ''}</td></tr>` : ''}
    </table>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      You are requested to arrange the outstanding payment within one week. If the payment has already been made, kindly share the transaction details with our accounts team.
    </p>
    <div style="font-size:13px;font-weight:700;margin-top:18px;">Bank details for payment:</div>
    ${bankBlock()}
    <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">Thanking you,<br>For R G INFRA</p>`;

  return shell('Payment Due Reminder', body);
}

export function dueReminderWithDemandLetterEmail({
  clientName,
  apartmentName,
  flatNo,
  paidAmount,
  dueAmount,
  gstAmount,
  gstPercent,
  grandTotal,
  dueDate,
  nextStageName,
  nextStagePercentage,
  nextStageAmount,
  nextDueDate,
}) {
  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 14px;">Dear <strong>${clientName}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      Please find attached the demand letter towards your booking of
      <strong>${apartmentName || 'the project'}, Flat No. ${flatNo || 'N/A'}</strong>.
      ${dueDate ? `The due date recorded in our schedule is <strong>${dueDate}</strong>.` : ''}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px;">
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Amount Received</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(paidAmount)}</td></tr>
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Outstanding Amount</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(dueAmount)}</td></tr>
      ${Number(gstAmount || 0) > 0 ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">GST (${pct(gstPercent)}%)</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(gstAmount)}</td></tr>` : ''}
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#111827;color:#fff;font-weight:700;">Total Payable</td><td style="border:1px solid #111827;padding:9px 10px;background:#111827;color:#fff;font-weight:700;">${inr(grandTotal || dueAmount)}</td></tr>
      ${nextStageAmount ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Next Payment</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${nextStageName || 'Next stage'}${nextStagePercentage ? ` (${pct(nextStagePercentage)}%)` : ''}: <strong>${inr(nextStageAmount)}</strong>${nextDueDate ? ` by ${nextDueDate}` : ''}</td></tr>` : ''}
    </table>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      Kindly arrange the payment within one week of receipt of this mail and attached demand letter.
    </p>
    <div style="font-size:13px;font-weight:700;margin-top:18px;">Bank details for payment:</div>
    ${bankBlock()}
    <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">Thanking you,<br>For R G INFRA</p>`;

  return shell('Demand Letter and Payment Due Notice', body);
}

export function demandLetterEmail({
  clientName,
  apartmentName,
  flatNo,
  dueAmount,
  gstAmount,
  gstPercent,
  grandTotal,
  date,
}) {
  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 14px;">Dear <strong>${clientName}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      Please find attached the demand letter dated <strong>${date || 'N/A'}</strong> towards your booking of
      <strong>${apartmentName || 'the project'}, Flat No. ${flatNo || 'N/A'}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px;">
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">Outstanding Amount</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(dueAmount)}</td></tr>
      ${Number(gstAmount || 0) > 0 ? `<tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#f9fafb;font-weight:700;">GST (${pct(gstPercent)}%)</td><td style="border:1px solid #d1d5db;padding:9px 10px;">${inr(gstAmount)}</td></tr>` : ''}
      <tr><td style="border:1px solid #d1d5db;padding:9px 10px;background:#111827;color:#fff;font-weight:700;">Total Payable</td><td style="border:1px solid #111827;padding:9px 10px;background:#111827;color:#fff;font-weight:700;">${inr(grandTotal || dueAmount)}</td></tr>
    </table>
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px;">
      You are requested to make arrangement for the outstanding amount within one week of receipt of the attached demand letter.
    </p>
    <div style="font-size:13px;font-weight:700;margin-top:18px;">Bank details for payment:</div>
    ${bankBlock()}
    <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">Thanking you,<br>For R G INFRA</p>`;

  return shell('Demand Letter', body);
}

export function getWhatsAppDueMessage({
  clientName,
  apartmentName,
  flatNo,
  dueAmount,
  gstAmount,
  gstPercent,
  grandTotal,
  phone,
  dueDate,
  nextStageName,
  nextStagePercentage,
  nextStageAmount,
  nextDueDate,
}) {
  const message = `Dear ${clientName},

Greetings from R G Infra.

This is a payment reminder towards your booking of ${apartmentName || 'the project'}, Flat No. ${flatNo || 'N/A'}.

Outstanding amount: ${inr(dueAmount)}
${Number(gstAmount || 0) > 0 ? `GST (${pct(gstPercent)}%): ${inr(gstAmount)}\n` : ''}Total payable: ${inr(grandTotal || dueAmount)}
${dueDate ? `Complete this payment by: ${dueDate}\n` : ''}${nextStageAmount ? `\nNext payment: ${nextStageName || 'Next stage'}${nextStagePercentage ? ` (${pct(nextStagePercentage)}%)` : ''} - ${inr(nextStageAmount)}${nextDueDate ? ` by ${nextDueDate}` : ''}\n` : ''}

You are requested to arrange the payment within one week.

Bank details:
Name: ${BANK.accountName}
Bank: ${BANK.bankName}
Branch: ${BANK.branch}
Account No.: ${BANK.accountNumber}
IFSC: ${BANK.ifscCode}

Thanking you,
For R G INFRA`;

  const cleanPhone = (phone || '').replace(/\D/g, '');
  const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const encodedMessage = encodeURIComponent(message);

  return {
    message,
    whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodedMessage}`,
  };
}

export function getWhatsAppPaymentDoneMessage({
  clientName,
  apartmentName,
  flatNo,
  amountPaid,
  phone,
}) {
  const message = `Dear ${clientName},

We acknowledge receipt of your payment of ${inr(amountPaid)} towards ${apartmentName || 'the project'}, Flat No. ${flatNo || 'N/A'}.

Your payment has been recorded in our accounts.

Thanking you,
For R G INFRA`;

  const cleanPhone = (phone || '').replace(/\D/g, '');
  const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const encodedMessage = encodeURIComponent(message);

  return {
    message,
    whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodedMessage}`,
  };
}
