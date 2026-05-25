/**
 * RG INFRA — Formal Demand Letter HTML Template
 * Legacy HTML version retained for reference.
 */

const COMPANY = {
  name: 'R G Infra',
  address: '505, H-Square, Ranchi - 834001',
  phone: '+91 93347 00319',
  email: 'rginfra22@gmail.com',
  gstin: '20ABFFR2754J1ZA',
};

const DEFAULT_BANK_DETAILS = {
  accountName: 'RG INFRA GREEN VILLE PH 2 MASTER COL AC',
  bankName: 'HDFC Bank',
  branch: 'Lalpur, Ranchi',
  accountNumber: '50200105157831',
  ifscCode: 'HDFC0000719',
};

const DEFAULT_LAND_BOUNDARIES = {
  north: 'N/A',
  south: 'N/A',
  east: 'N/A',
  west: 'N/A',
};

const DEFAULT_FLOOR_BOUNDARIES = {
  north: 'N/A',
  south: 'N/A',
  east: 'N/A',
  west: 'N/A',
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
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
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

function signatureSvg() {
  return encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="95" viewBox="0 0 280 95">
      <path d="M36 76 C58 45, 61 19, 50 14 C39 9, 38 38, 43 59 C49 84, 83 64, 104 42 C118 27, 109 20, 95 39 C84 55, 92 75, 118 64 C139 55, 143 31, 133 27 C123 24, 118 48, 129 60 C145 79, 178 41, 160 32 C148 26, 139 44, 151 56 C168 72, 199 49, 218 47 C239 44, 250 45, 263 42" fill="none" stroke="#3857c9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M73 80 C116 81, 169 76, 236 70" fill="none" stroke="#3857c9" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
    </svg>
  `);
}

export function getDemandLetterHTML(data) {
  const {
    clientName,
    clientAddress,
    flatNo,
    floor,
    block,
    apartmentName,
    area,
    totalAmount,
    stageAmount,
    paidAmount,
    dueAmount,
    gstPercent = 0,
    gstAmount,
    grandTotal,
    duePercentage,
    paidPercentage,
    currentStageName,
    dueDate,
    nextStageName,
    nextStageAmount,
    nextStagePercentage,
    nextDueDate,
    date,
    bankDetails = {},
    landBoundaries = {},
    floorBoundaries = {},
  } = data;

  const formattedDate = date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const bank = { ...DEFAULT_BANK_DETAILS, ...bankDetails };
  const land = { ...DEFAULT_LAND_BOUNDARIES, ...landBoundaries };
  const floorBounds = { ...DEFAULT_FLOOR_BOUNDARIES, ...floorBoundaries };
  const addressLines = toAddressLines(clientAddress);
  const flatDescription = [
    `Flat No. ${flatNo || 'N/A'}`,
    floor ? `${floor} Floor` : null,
    block ? `Block ${block}` : null,
    area ? `Area ${area} sqft.` : null,
    apartmentName ? `in ${apartmentName}` : null,
  ].filter(Boolean).join(', ');
  const stageText = currentStageName || 'the present construction/payment milestone';
  const duePct = duePercentage ?? (Number(totalAmount) > 0 ? (Number(dueAmount || 0) / Number(totalAmount)) * 100 : 0);
  const paidPct = paidPercentage ?? (Number(totalAmount) > 0 ? (Number(paidAmount || 0) / Number(totalAmount)) * 100 : 0);
  const milestoneAmount = Number(stageAmount || dueAmount || 0);
  const nextAmount = Number(nextStageAmount || 0);
  const gst = Number(gstAmount || 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12.5px;
      line-height: 1.48;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 17mm 18mm 15mm;
      position: relative;
    }
    .letterhead {
      border-bottom: 2px solid #1f2937;
      padding-bottom: 10px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      gap: 22px;
    }
    .company-name {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: #111827;
      margin: 0 0 5px;
    }
    .company-meta {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.45;
    }
    .gst-box {
      min-width: 190px;
      border: 1px solid #d1d5db;
      padding: 9px 11px;
      align-self: flex-start;
      font-size: 11px;
      line-height: 1.45;
      text-align: right;
    }
    .doc-title {
      text-align: center;
      font-weight: 700;
      text-decoration: underline;
      letter-spacing: 0.5px;
      font-size: 15px;
      margin: 8px 0 18px;
      text-transform: uppercase;
    }
    .top-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: start;
      margin-bottom: 16px;
    }
    .to-block {
      white-space: pre-line;
      min-height: 98px;
    }
    .date {
      font-weight: 700;
      white-space: nowrap;
      padding-top: 2px;
    }
    .subject {
      font-weight: 700;
      margin: 12px 0 14px;
      text-align: justify;
    }
    .body p {
      margin: 0 0 11px;
      text-align: justify;
    }
    .amount {
      font-weight: 700;
      white-space: nowrap;
    }
    .summary-table,
    .bank-table,
    .bounds-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 13px;
    }
    .summary-table th,
    .summary-table td,
    .bank-table td,
    .bounds-table td {
      border: 1px solid #d1d5db;
      padding: 7px 9px;
      vertical-align: top;
    }
    .summary-table th {
      background: #f3f4f6;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .summary-table .right,
    .bank-table .right {
      text-align: right;
    }
    .summary-table .total td {
      background: #111827;
      color: #ffffff;
      font-weight: 700;
    }
    .section-heading {
      font-weight: 700;
      margin: 14px 0 6px;
    }
    .bounds-table td:first-child,
    .bank-table td:first-child {
      width: 118px;
      font-weight: 700;
      background: #f9fafb;
    }
    .request-note {
      margin-top: 13px;
      padding: 10px 12px;
      border-left: 3px solid #111827;
      background: #f9fafb;
    }
    .signature-block {
      margin-top: 20px;
      width: 265px;
    }
    .signature-top {
      font-size: 14px;
      line-height: 1.45;
    }
    .signature-img {
      width: 180px;
      height: 62px;
      object-fit: contain;
      display: block;
      margin: 2px 0 0 8px;
    }
    .signatory {
      font-size: 14px;
    }
    .footer {
      position: absolute;
      left: 18mm;
      right: 18mm;
      bottom: 8mm;
      border-top: 1px solid #d1d5db;
      padding-top: 5px;
      color: #6b7280;
      font-size: 9.5px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="letterhead">
      <div>
        <h1 class="company-name">${escapeHtml(COMPANY.name)}</h1>
        <div class="company-meta">
          ${escapeHtml(COMPANY.address)}<br />
          Ph: ${escapeHtml(COMPANY.phone)}, Email: ${escapeHtml(COMPANY.email)}
        </div>
      </div>
      <div class="gst-box">
        <strong>GSTIN</strong><br />
        ${escapeHtml(COMPANY.gstin)}
      </div>
    </header>

    <div class="doc-title">Demand Letter</div>

    <section class="top-grid">
      <div class="to-block">
        <strong>To,</strong><br />
        ${escapeHtml(clientName || 'Valued Customer')},${addressLines.length ? '<br />' : ''}
        ${addressLines.map((line) => `${escapeHtml(line)},`).join('<br />')}
      </div>
      <div class="date">Date: ${escapeHtml(formattedDate)}</div>
    </section>

    <div class="subject">
      Sub:- Request for payment towards your booking of ${escapeHtml(flatDescription)}.
    </div>

    <section class="body">
      <p>Dear Sir/Madam,</p>
      <p>
        We would like to bring to your kind notice that the construction work of the above stated flat,
        which is booked in your name for a total consideration of
        <span class="amount">Rs. ${formatCurrency(totalAmount)}/-</span>
        (${escapeHtml(rupeesWords(totalAmount))}), has reached ${escapeHtml(stageText)}.
      </p>
      <p>
        As per our agreement and payment schedule, an amount of
        <span class="amount">Rs. ${formatCurrency(milestoneAmount)}/-</span>
        (${escapeHtml(rupeesWords(milestoneAmount))}) is due (${formatPercent(duePct)}%). We have received till date
        <span class="amount">Rs. ${formatCurrency(paidAmount)}/-</span>
        (${escapeHtml(rupeesWords(paidAmount))}) (${formatPercent(paidPct)}%). The balance payable for the present demand is
        <span class="amount">Rs. ${formatCurrency(dueAmount)}/-</span>
        (${escapeHtml(rupeesWords(dueAmount))})${gst > 0 ? ` plus GST (${formatPercent(gstPercent)}%) of
        <span class="amount">Rs. ${formatCurrency(gstAmount)}/-</span>
        (${escapeHtml(rupeesWords(gstAmount))})` : ''}, total
        <span class="amount">Rs. ${formatCurrency(grandTotal)}/-</span>
        (${escapeHtml(rupeesWords(grandTotal))}) is now payable.
      </p>

      <table class="summary-table">
        <thead>
          <tr>
            <th>Particulars</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total consideration</td>
            <td class="right">Rs. ${formatCurrency(totalAmount)}/-</td>
          </tr>
          <tr>
            <td>Received till date</td>
            <td class="right">Rs. ${formatCurrency(paidAmount)}/-</td>
          </tr>
          <tr>
            <td>Current stage demand</td>
            <td class="right">Rs. ${formatCurrency(milestoneAmount)}/-</td>
          </tr>
          <tr>
            <td>Balance payable for present demand</td>
            <td class="right">Rs. ${formatCurrency(dueAmount)}/-</td>
          </tr>
          ${gst > 0 ? `
          <tr>
            <td>GST (${formatPercent(gstPercent)}%)</td>
            <td class="right">Rs. ${formatCurrency(gstAmount)}/-</td>
          </tr>` : ''}
          <tr class="total">
            <td>Total payable</td>
            <td class="right">Rs. ${formatCurrency(grandTotal)}/-</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td>Payment to be completed by</td>
            <td class="right">${escapeHtml(dueDate)}</td>
          </tr>` : ''}
          ${nextAmount > 0 ? `
          <tr>
            <td>Next payment${nextStageName ? ` - ${escapeHtml(nextStageName)}` : ''}${nextStagePercentage ? ` (${formatPercent(nextStagePercentage)}%)` : ''}</td>
            <td class="right">Rs. ${formatCurrency(nextAmount)}/-${nextDueDate ? ` by ${escapeHtml(nextDueDate)}` : ''}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div class="section-heading">The Land is butted and bounded as below:</div>
      <table class="bounds-table">
        <tr><td>NORTH:</td><td>${escapeHtml(land.north)}</td></tr>
        <tr><td>SOUTH:</td><td>${escapeHtml(land.south)}</td></tr>
        <tr><td>EAST:</td><td>${escapeHtml(land.east)}</td></tr>
        <tr><td>WEST:</td><td>${escapeHtml(land.west)}</td></tr>
      </table>

      <div class="section-heading">The floor is butted and bounded as below:</div>
      <table class="bounds-table">
        <tr><td>NORTH:</td><td>${escapeHtml(floorBounds.north)}</td></tr>
        <tr><td>SOUTH:</td><td>${escapeHtml(floorBounds.south)}</td></tr>
        <tr><td>EAST:</td><td>${escapeHtml(floorBounds.east)}</td></tr>
        <tr><td>WEST:</td><td>${escapeHtml(floorBounds.west)}</td></tr>
      </table>

      <p class="request-note">
        Hence, you are requested to make arrangement for the outstanding amount${dueDate ? ` on or before ${escapeHtml(dueDate)}` : ' within one week of receipt of this demand letter'}.
      </p>

      <div class="section-heading">Our Bank details for payment:</div>
      <table class="bank-table">
        <tr><td>Name:</td><td>${escapeHtml(bank.accountName)}</td></tr>
        <tr><td>Bank:</td><td>${escapeHtml(bank.bankName)}</td></tr>
        <tr><td>Branch:</td><td>${escapeHtml(bank.branch)}</td></tr>
        <tr><td>Account No.:</td><td>${escapeHtml(bank.accountNumber)}</td></tr>
        <tr><td>IFSC:</td><td>${escapeHtml(bank.ifscCode)}</td></tr>
      </table>

      <div class="signature-block">
        <div class="signature-top">Thanking you,<br />For R G INFRA</div>
        <img class="signature-img" alt="Authorised Signature" src="data:image/svg+xml;charset=utf-8,${signatureSvg()}" />
        <div class="signatory">Authorised Signatory</div>
      </div>
    </section>

    <footer class="footer">
      <span>${escapeHtml(COMPANY.name)} | ${escapeHtml(COMPANY.address)}</span>
      <span>${escapeHtml(COMPANY.email)} | ${escapeHtml(COMPANY.phone)}</span>
    </footer>
  </main>
</body>
</html>`;
}
