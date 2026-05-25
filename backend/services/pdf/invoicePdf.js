import { writeFile } from 'fs/promises';
import {
  amountInWords,
  cleanText,
  COMPANY,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  renderPdfBuffer,
  simpleTable,
  toAddressLines,
} from './helpers.js';
import { BRAND, pdfStyles, tableLayouts } from './styles.js';

function boxedStack(title, lines) {
  return {
    stack: [
      { text: title, style: 'tableHeader', fillColor: null, margin: [0, 0, 0, 5] },
      ...lines,
    ],
    border: [true, true, true, true],
    margin: [9, 9, 9, 9],
  };
}

export function buildInvoiceDocDefinition(data = {}) {
  const invoiceDate = data.invoiceDate || formatDate(new Date());
  const paymentDate = formatDate(data.paymentDate);
  const amount = Number(data.amount || 0);
  const gstPercent = Number(data.gstPercent || 0);
  const gstAmount = Number(data.gstAmount || 0);
  const grandTotal = Number(data.grandTotal || amount + gstAmount);
  const addressLines = toAddressLines(data.clientAddress);
  const propertyLine = [data.apartmentName || null, data.propertyName ? `(${data.propertyName})` : null].filter(Boolean).join(' ');
  const flatLine = [
    data.flatNumber ? `Flat ${data.flatNumber}` : null,
    data.floor ? `${data.floor} Floor` : null,
    data.block ? `Block ${data.block}` : null,
    data.sbuArea ? `${formatNumber(data.sbuArea)} sqft` : null,
  ].filter(Boolean).join(' | ');

  return {
    pageSize: 'A4',
    pageMargins: [51, 50, 51, 44],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10.2,
      color: BRAND.ink,
      lineHeight: 1.3,
    },
    styles: pdfStyles,
    tableLayouts,
    footer: () => ({
      margin: [51, 0, 51, 18],
      columns: [
        { text: 'Thank you for your payment.', style: 'footer' },
        { text: 'Authorized Signatory', style: 'footer', alignment: 'right' },
      ],
    }),
    content: [
      {
        table: {
          widths: ['*', 180],
          body: [[
            {
              stack: [
                { text: COMPANY.name, style: 'header' },
                { text: `${COMPANY.address}\nPhone: ${COMPANY.phone}\nEmail: ${COMPANY.email}\nGSTIN: ${COMPANY.gstin}`, style: 'headerMeta' },
              ],
              border: [false, false, false, true],
              margin: [0, 0, 0, 8],
            },
            {
              stack: [
                { text: [{ text: 'Invoice No: ', bold: true }, cleanText(data.invoiceNo)] },
                { text: [{ text: 'Date: ', bold: true }, invoiceDate] },
                ...(data.bookingId ? [{ text: [{ text: 'Booking: ', bold: true }, cleanText(data.bookingId)] }] : []),
              ],
              alignment: 'right',
              fontSize: 9.5,
              lineHeight: 1.35,
              border: [true, true, true, true],
              margin: [9, 8, 9, 8],
            },
          ]],
        },
        layout: 'invoiceGrid',
        margin: [0, 0, 0, 8],
      },
      { text: 'PAYMENT INVOICE', style: 'invoiceTitle' },
      {
        table: {
          widths: ['*', '*'],
          body: [[
            boxedStack('BILL TO', [
              { text: cleanText(data.clientName, 'Client'), bold: true },
              ...(data.clientId ? [{ text: `Client ID: ${data.clientId}` }] : []),
              ...(addressLines.length ? addressLines.map((line) => ({ text: line })) : [{ text: '-' }]),
              ...(data.clientPhone ? [{ text: `Phone: ${data.clientPhone}` }] : []),
              ...(data.clientEmail ? [{ text: `Email: ${data.clientEmail}` }] : []),
            ]),
            boxedStack('PROPERTY', [
              { text: propertyLine || '-' },
              ...(flatLine ? [{ text: flatLine }] : []),
            ]),
          ]],
        },
        layout: 'invoiceGrid',
        margin: [0, 0, 0, 14],
      },
      simpleTable(
        ['Description', 'Payment Date', 'Mode', 'Reference', 'Percentage', 'Amount (INR)'],
        [[
          { text: 'Payment received' },
          { text: paymentDate },
          { text: cleanText(data.paymentMode) },
          { text: cleanText(data.referenceNo) },
          { text: `${formatPercent(data.paymentPercentage)}%` },
          { text: formatCurrency(amount, { decimals: 2, symbol: '', suffix: '' }), alignment: 'right' },
        ]],
        { widths: ['*', 68, 58, 68, 54, 75], alignments: ['left', 'left', 'left', 'left', 'left', 'right'], layout: 'invoiceGrid' }
      ),
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'AMOUNT IN WORDS', style: 'tableHeader', fillColor: null, margin: [0, 0, 0, 5] },
              { text: amountInWords(grandTotal) },
            ],
            margin: [0, 5, 16, 0],
          },
          {
            width: 220,
            table: {
              widths: ['*', 88],
              body: [
                [{ text: 'Subtotal' }, { text: formatCurrency(amount, { decimals: 2, symbol: '', suffix: '' }), alignment: 'right', bold: true }],
                [{ text: gstPercent > 0 ? `GST (${formatPercent(gstPercent)}%)` : 'GST' }, { text: formatCurrency(gstAmount, { decimals: 2, symbol: '', suffix: '' }), alignment: 'right', bold: true }],
                [{ text: 'Grand Total', bold: true, fillColor: BRAND.softer }, { text: formatCurrency(grandTotal, { decimals: 2, symbol: '', suffix: '' }), alignment: 'right', bold: true, fillColor: BRAND.softer }],
              ],
            },
            layout: 'invoiceGrid',
          },
        ],
        columnGap: 16,
        margin: [0, 4, 0, 0],
      },
    ],
  };
}

export async function generateInvoicePdf(data) {
  return renderPdfBuffer(buildInvoiceDocDefinition(data));
}

export async function writeInvoicePdf(data, filePath) {
  const buffer = await generateInvoicePdf(data);
  await writeFile(filePath, buffer);
  return buffer;
}
