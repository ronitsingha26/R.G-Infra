/**
 * Formats a number in Indian Rupee style: ₹12,50,000
 */
function inr(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Payment received confirmation email
 */
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Bajaj Developer Constructions</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Payment Received Confirmation</p>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Dear <strong>${clientName}</strong>,
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
        We are pleased to confirm that we have received your payment for the project <strong>"${projectName}"</strong>. Here are the details:
      </p>

      <!-- Payment Details Table -->
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Amount Received</td>
          <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;color:#059669;font-size:15px;font-weight:700;">${inr(amountReceived)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Payment Date</td>
          <td style="padding:12px 16px;border:1px solid #e2e8f0;color:#334155;font-size:14px;">${paymentDate || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Payment Mode</td>
          <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:14px;">${paymentMode || 'N/A'}</td>
        </tr>
        ${referenceNo ? `
        <tr>
          <td style="padding:12px 16px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Reference No.</td>
          <td style="padding:12px 16px;border:1px solid #e2e8f0;color:#334155;font-size:14px;">${referenceNo}</td>
        </tr>` : ''}
      </table>

      <!-- Project Summary -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px;">
        <h3 style="margin:0 0 12px;color:#92400e;font-size:14px;font-weight:700;">Project Summary — ${projectName}</h3>
        <table style="width:100%;">
          <tr>
            <td style="padding:4px 0;color:#78716c;font-size:13px;">Total Project Amount</td>
            <td style="padding:4px 0;color:#334155;font-size:13px;font-weight:600;text-align:right;">${inr(totalAmount)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#78716c;font-size:13px;">Total Paid</td>
            <td style="padding:4px 0;color:#059669;font-size:13px;font-weight:600;text-align:right;">${inr(totalPaid)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#78716c;font-size:13px;">Remaining Due</td>
            <td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">${inr(dueAmount)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#78716c;font-size:13px;">Project Progress</td>
            <td style="padding:4px 0;color:#334155;font-size:13px;font-weight:600;text-align:right;">${progress || 0}%</td>
          </tr>
        </table>
      </div>

      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
        Thank you for your prompt payment. If you have any questions, please don't hesitate to reach out.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Bajaj Developer Constructions • info@bajajdeveloper.in • +91 98765 43210
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Due payment reminder email
 */
export function dueReminderEmail({
  clientName,
  projects, // array of { name, totalAmount, totalPaid, dueAmount, progress }
  totalDue,
}) {
  const projectRows = projects
    .map(
      (p) => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#334155;font-size:13px;font-weight:600;">${p.name}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#334155;font-size:13px;text-align:right;">${inr(p.totalAmount)}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#059669;font-size:13px;text-align:right;">${inr(p.totalPaid)}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#dc2626;font-size:13px;font-weight:700;text-align:right;">${inr(p.dueAmount)}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#334155;font-size:13px;text-align:center;">${p.progress}%</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Bajaj Developer Constructions</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Payment Due Reminder</p>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Dear <strong>${clientName}</strong>,
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
        This is a friendly reminder that you have an outstanding payment due. Please find the details below:
      </p>

      <!-- Total Due Highlight -->
      <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <div style="color:#991b1b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Total Amount Due</div>
        <div style="color:#dc2626;font-size:32px;font-weight:800;margin-top:8px;">${inr(totalDue)}</div>
      </div>

      <!-- Project Breakdown -->
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-align:left;">Project</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-align:right;">Total</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-align:right;">Paid</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-align:right;">Due</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;text-align:center;">Progress</th>
          </tr>
        </thead>
        <tbody>
          ${projectRows}
        </tbody>
      </table>

      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
        Please arrange the payment at your earliest convenience. If you have already made the payment, please disregard this reminder. For any queries, feel free to contact us.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Bajaj Developer Constructions • info@bajajdeveloper.in • +91 98765 43210
      </p>
    </div>
  </div>
</body>
</html>`;
}
