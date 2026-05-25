import { writeFile } from 'fs/promises';
import {
  amountInWords,
  cleanText,
  COMPANY,
  DEFAULT_BANK_DETAILS,
  DEFAULT_BOUNDARIES,
  formatCurrency,
  formatDate,
  formatPercent,
  keyValueTable,
  renderPdfBuffer,
  sectionHeader,
  signatureNode,
  simpleTable,
  toAddressLines,
} from './helpers.js';
import { BRAND, pdfStyles, tableLayouts } from './styles.js';

function header() {
  return {
    table: {
      widths: ['*', 170],
      body: [[
        {
          stack: [
            { text: COMPANY.name, style: 'header' },
            { text: `${COMPANY.address}\nPh: ${COMPANY.phone}, Email: ${COMPANY.email}`, style: 'headerMeta' },
          ],
          border: [false, false, false, true],
          margin: [0, 0, 0, 8],
        },
        {
          stack: [
            { text: 'GSTIN', bold: true, margin: [0, 0, 0, 2] },
            { text: COMPANY.gstin },
          ],
          alignment: 'right',
          fontSize: 9,
          border: [true, true, true, true],
          margin: [9, 8, 9, 8],
        },
      ]],
    },
    layout: {
      hLineColor: () => BRAND.border,
      vLineColor: () => BRAND.border,
      hLineWidth: (i) => (i === 1 ? 1.4 : 0.7),
      vLineWidth: () => 0.7,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 8],
  };
}

export function buildDemandLetterDocDefinition(data = {}) {
  const bank = { ...DEFAULT_BANK_DETAILS, ...(data.bankDetails || {}) };
  const land = { ...DEFAULT_BOUNDARIES, ...(data.landBoundaries || {}) };
  const floorBounds = { ...DEFAULT_BOUNDARIES, ...(data.floorBoundaries || {}) };
  const totalAmount = Number(data.totalAmount || 0);
  const paidAmount = Number(data.paidAmount || 0);
  const dueAmount = Number(data.dueAmount || 0);
  const gstPercent = Number(data.gstPercent || 0);
  const gstAmount = Number(data.gstAmount || 0);
  const grandTotal = Number(data.grandTotal || dueAmount + gstAmount);
  const milestoneAmount = Number(data.stageAmount || dueAmount || 0);
  const nextAmount = Number(data.nextStageAmount || 0);
  const duePct = data.duePercentage ?? (totalAmount > 0 ? (dueAmount / totalAmount) * 100 : 0);
  const paidPct = data.paidPercentage ?? (totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0);
  const stageText = data.currentStageName || 'the present construction/payment milestone';
  const formattedDate = data.date || formatDate(new Date());
  const dueDate = data.dueDate || null;
  const nextDueDate = data.nextDueDate || null;
  const addressLines = toAddressLines(data.clientAddress);
  const flatDescription = [
    data.flatNo ? `Flat No. ${data.flatNo}` : 'Flat No. N/A',
    data.floor ? `${data.floor} Floor` : null,
    data.block ? `Block ${data.block}` : null,
    data.area ? `Area ${data.area} sqft.` : null,
    data.apartmentName ? `in ${data.apartmentName}` : null,
  ].filter(Boolean).join(', ');

  const summaryRows = [
    [{ text: 'Total consideration' }, { text: formatCurrency(totalAmount), alignment: 'right' }],
    [{ text: 'Received till date' }, { text: formatCurrency(paidAmount), alignment: 'right' }],
    [{ text: 'Current stage demand' }, { text: formatCurrency(milestoneAmount), alignment: 'right' }],
    [{ text: 'Balance payable for present demand' }, { text: formatCurrency(dueAmount), alignment: 'right' }],
  ];
  if (gstAmount > 0) {
    summaryRows.push([{ text: `GST (${formatPercent(gstPercent)}%)` }, { text: formatCurrency(gstAmount), alignment: 'right' }]);
  }
  summaryRows.push([
    { text: 'Total payable', bold: true, color: BRAND.white, fillColor: BRAND.ink },
    { text: formatCurrency(grandTotal), alignment: 'right', bold: true, color: BRAND.white, fillColor: BRAND.ink },
  ]);

  if (dueDate) summaryRows.push([{ text: 'Payment to be completed by' }, { text: dueDate, alignment: 'right' }]);
  if (nextAmount > 0) {
    summaryRows.push([
      { text: `Next payment${data.nextStageName ? ` - ${data.nextStageName}` : ''}${data.nextStagePercentage ? ` (${formatPercent(data.nextStagePercentage)}%)` : ''}` },
      { text: `${formatCurrency(nextAmount)}${nextDueDate ? ` by ${nextDueDate}` : ''}`, alignment: 'right' },
    ]);
  }

  return {
    pageSize: 'A4',
    pageMargins: [51, 48, 51, 42],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10.2,
      color: BRAND.ink,
      lineHeight: 1.3,
    },
    styles: pdfStyles,
    tableLayouts,
    footer: () => ({
      margin: [51, 0, 51, 16],
      columns: [
        { text: `${COMPANY.name} | ${COMPANY.address}`, style: 'footer' },
        { text: `${COMPANY.email} | ${COMPANY.phone}`, style: 'footer', alignment: 'right' },
      ],
    }),
    content: [
      header(),
      { text: 'DEMAND LETTER', style: 'title' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'To,', bold: true },
              { text: `${cleanText(data.clientName, 'Valued Customer')},` },
              ...addressLines.map((line) => ({ text: `${line},` })),
            ],
            margin: [0, 0, 0, 10],
          },
          { width: 'auto', text: `Date: ${formattedDate}`, bold: true, alignment: 'right' },
        ],
        columnGap: 20,
      },
      {
        text: `Sub:- Request for payment towards your booking of ${flatDescription}.`,
        bold: true,
        alignment: 'justify',
        margin: [0, 0, 0, 12],
      },
      { text: 'Dear Sir/Madam,', style: 'paragraph' },
      {
        text: [
          'We would like to bring to your kind notice that the construction work of the above stated flat, which is booked in your name for a total consideration of ',
          { text: formatCurrency(totalAmount), bold: true },
          ` (${amountInWords(totalAmount)}), has reached ${stageText}.`,
        ],
        style: 'paragraph',
      },
      {
        text: [
          'As per our agreement and payment schedule, an amount of ',
          { text: formatCurrency(milestoneAmount), bold: true },
          ` (${amountInWords(milestoneAmount)}) is due (${formatPercent(duePct)}%). We have received till date `,
          { text: formatCurrency(paidAmount), bold: true },
          ` (${amountInWords(paidAmount)}) (${formatPercent(paidPct)}%). The balance payable for the present demand is `,
          { text: formatCurrency(dueAmount), bold: true },
          ` (${amountInWords(dueAmount)})`,
          ...(gstAmount > 0 ? [
            ` plus GST (${formatPercent(gstPercent)}%) of `,
            { text: formatCurrency(gstAmount), bold: true },
            ` (${amountInWords(gstAmount)})`,
          ] : []),
          ', total ',
          { text: formatCurrency(grandTotal), bold: true },
          ` (${amountInWords(grandTotal)}) is now payable.`,
        ],
        style: 'paragraph',
      },
      simpleTable(['Particulars', 'Amount'], summaryRows, { widths: ['*', 145], alignments: ['left', 'right'] }),
      sectionHeader('The Land is butted and bounded as below:'),
      keyValueTable([['NORTH:', land.north], ['SOUTH:', land.south], ['EAST:', land.east], ['WEST:', land.west]]),
      sectionHeader('The floor is butted and bounded as below:'),
      keyValueTable([['NORTH:', floorBounds.north], ['SOUTH:', floorBounds.south], ['EAST:', floorBounds.east], ['WEST:', floorBounds.west]]),
      {
        text: `Hence, you are requested to make arrangement for the outstanding amount${dueDate ? ` on or before ${dueDate}` : ' within one week of receipt of this demand letter'}.`,
        style: 'paragraph',
        fillColor: BRAND.softer,
        margin: [0, 4, 0, 10],
        border: [true, false, false, false],
      },
      sectionHeader('Our Bank details for payment:'),
      keyValueTable([
        ['Name:', bank.accountName],
        ['Bank:', bank.bankName],
        ['Branch:', bank.branch],
        ['Account No.:', bank.accountNumber],
        ['IFSC:', bank.ifscCode],
      ]),
      {
        width: 230,
        stack: [
          { text: 'Thanking you,\nFor R G INFRA', fontSize: 11.5, lineHeight: 1.35 },
          signatureNode(data.signatureImage),
          { text: 'Authorised Signatory', fontSize: 11.5 },
        ],
        margin: [0, 8, 0, 0],
      },
    ],
  };
}

export async function generateDemandLetterPdf(data) {
  return renderPdfBuffer(buildDemandLetterDocDefinition(data));
}

export async function writeDemandLetterPdf(data, filePath) {
  const buffer = await generateDemandLetterPdf(data);
  await writeFile(filePath, buffer);
  return buffer;
}
