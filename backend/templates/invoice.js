/**
 * RG INFRA — Payment Invoice HTML Template
 * Legacy HTML version retained for reference.
 */

const COMPANY = {
  name: 'R G Infra',
  address: '505, H-Square, Ranchi - 834001',
  phone: '+91 93347 00319',
  email: 'rginfra22@gmail.com',
  gstin: '20ABFFR2754J1ZA',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function toAddressLines(address) {
  if (!address) return [];
  return String(address)
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function numberToIndianWords(amount) {
  const n = Math.round(Number(amount || 0));
  if (n === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const underHundred = (num) => {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ''}`;
  };

  const underThousand = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ''}${hundred && rest ? ' ' : ''}${rest ? underHundred(rest) : ''}`;
  };

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));

  return parts.join(' ');
}

function rupeesWords(amount) {
  return `Rupees ${numberToIndianWords(amount)} only`;
}

export function getInvoiceHTML(data) {
  const {
    invoiceNo,
    invoiceDate,
    clientName,
    clientId,
    clientAddress,
    clientPhone,
    clientEmail,
    bookingId,
    apartmentName,
    propertyName,
    flatNumber,
    floor,
    block,
    sbuArea,
    paymentDate,
    paymentMode,
    referenceNo,
    paymentPercentage,
    amount,
    gstPercent,
    gstAmount,
    grandTotal,
  } = data;

  const formattedInvoiceDate = invoiceDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedPaymentDate = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';

  const addressLines = toAddressLines(clientAddress);
  const totalAmount = Number(amount || 0);
  const gstPct = Number(gstPercent || 0);
  const gst = Number(gstAmount || 0);
  const grand = Number(grandTotal || (totalAmount + gst));

  const propertyLine = [
    apartmentName || null,
    propertyName ? `(${propertyName})` : null,
  ].filter(Boolean).join(' ');

  const flatLine = [
    flatNumber ? `Flat ${flatNumber}` : null,
    floor ? `${floor} Floor` : null,
    block ? `Block ${block}` : null,
    sbuArea ? `${Number(sbuArea).toLocaleString('en-IN')} sqft` : null,
  ].filter(Boolean).join(' • ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body {
      margin: 0;
      background: #f4f5f7;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 18mm 18mm 16mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 18px;
      gap: 18px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 6px;
    }
    .company-meta {
      font-size: 11.5px;
      color: #4b5563;
      line-height: 1.45;
    }
    .invoice-box {
      min-width: 190px;
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      font-size: 11.5px;
      text-align: right;
      line-height: 1.5;
    }
    .title {
      text-align: center;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      font-size: 15px;
      margin: 6px 0 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .section-title {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .box {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      border-radius: 6px;
      min-height: 90px;
    }
    .box p {
      margin: 0 0 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.06em;
      color: #6b7280;
    }
    .totals {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 16px;
      align-items: start;
    }
    .totals .amount-box {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .totals .amount-box div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .totals .amount-box div:last-child {
      margin-bottom: 0;
    }
    .footer {
      margin-top: 18px;
      font-size: 11px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="company-name">${escapeHtml(COMPANY.name)}</div>
        <div class="company-meta">
          ${escapeHtml(COMPANY.address)}<br />
          Phone: ${escapeHtml(COMPANY.phone)}<br />
          Email: ${escapeHtml(COMPANY.email)}<br />
          GSTIN: ${escapeHtml(COMPANY.gstin)}
        </div>
      </div>
      <div class="invoice-box">
        <div><strong>Invoice No:</strong> ${escapeHtml(invoiceNo || '-')}</div>
        <div><strong>Date:</strong> ${escapeHtml(formattedInvoiceDate)}</div>
        ${bookingId ? `<div><strong>Booking:</strong> ${escapeHtml(bookingId)}</div>` : ''}
      </div>
    </div>

    <div class="title">Payment Invoice</div>

    <div class="grid">
      <div class="box">
        <div class="section-title">Bill To</div>
        <p><strong>${escapeHtml(clientName || 'Client')}</strong></p>
        ${clientId ? `<p>Client ID: ${escapeHtml(clientId)}</p>` : ''}
        ${addressLines.length ? addressLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('') : '<p>-</p>'}
        ${clientPhone ? `<p>Phone: ${escapeHtml(clientPhone)}</p>` : ''}
        ${clientEmail ? `<p>Email: ${escapeHtml(clientEmail)}</p>` : ''}
      </div>
      <div class="box">
        <div class="section-title">Property</div>
        ${propertyLine ? `<p>${escapeHtml(propertyLine)}</p>` : '<p>-</p>'}
        ${flatLine ? `<p>${escapeHtml(flatLine)}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Payment Date</th>
          <th>Mode</th>
          <th>Reference</th>
          <th>Percentage</th>
          <th style="text-align:right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Payment received</td>
          <td>${escapeHtml(formattedPaymentDate)}</td>
          <td>${escapeHtml(paymentMode || '-')}</td>
          <td>${escapeHtml(referenceNo || '-')}</td>
          <td>${escapeHtml(formatPercent(paymentPercentage))}%</td>
          <td style="text-align:right;">${formatCurrency(totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="box">
        <div class="section-title">Amount in Words</div>
        <p>${escapeHtml(rupeesWords(grand))}</p>
      </div>
      <div class="amount-box">
        <div><span>Subtotal</span><strong>${formatCurrency(totalAmount)}</strong></div>
        <div><span>${gstPct > 0 ? `GST (${formatPercent(gstPct)}%)` : 'GST'}</span><strong>${formatCurrency(gst)}</strong></div>
        <div><span>Grand Total</span><strong>${formatCurrency(grand)}</strong></div>
      </div>
    </div>

    <div class="footer">
      <div>Thank you for your payment.</div>
      <div>Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;
}
