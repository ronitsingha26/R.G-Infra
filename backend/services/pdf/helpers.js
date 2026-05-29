import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';
import PdfPrinter from 'pdfmake';
import { BRAND } from './styles.js';

export const COMPANY = {
  name: 'R G Infra',
  address: '505, H-Square, Ranchi - 834001',
  phone: '+91 93347 00319',
  email: 'rginfra22@gmail.com',
  gstin: '20ABFFR2754J1ZA',
};

export const DEFAULT_BANK_DETAILS = {
  accountName: 'RG INFRA GREEN VILLE PH 2 MASTER COL AC',
  bankName: 'HDFC Bank',
  branch: 'Lalpur, Ranchi',
  accountNumber: '50200105157831',
  ifscCode: 'HDFC0000719',
};

export const DEFAULT_BOUNDARIES = {
  north: 'N/A',
  south: 'N/A',
  east: 'N/A',
  west: 'N/A',
};

const printer = new PdfPrinter({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

export function cleanText(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function formatCurrency(value, options = {}) {
  const num = Number(value || 0);
  const isInteger = Number.isInteger(num);
  const defaultDecimals = isInteger ? 0 : 2;
  const { decimals = defaultDecimals, symbol = 'Rs. ', suffix = '/-' } = options;
  const amount = num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${amount}${suffix}`;
}

export function formatNumber(value, decimals) {
  const num = Number(value || 0);
  const isInteger = Number.isInteger(num);
  const finalDecimals = decimals !== undefined ? decimals : (isInteger ? 0 : 2);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: finalDecimals,
    maximumFractionDigits: finalDecimals,
  });
}

export function formatDate(value, fallback = '-') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function amountInWords(amount) {
  const num = Number(amount || 0);
  const n = Math.floor(num);
  const paise = Math.round((num - n) * 100);

  if (n === 0 && paise === 0) return 'Rupees Zero only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const underHundred = (val) => (val < 20 ? ones[val] : `${tens[Math.floor(val / 10)]}${val % 10 ? ` ${ones[val % 10]}` : ''}`);
  const underThousand = (val) => {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
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

  let rupeesText = parts.length > 0 ? `Rupees ${parts.join(' ')}` : '';
  let paiseText = paise > 0 ? ` and ${underHundred(paise)} Paise` : '';

  if (rupeesText === '' && paiseText !== '') {
    return `${underHundred(paise)} Paise only`;
  }

  return `${rupeesText}${paiseText} only`;
}

export function toAddressLines(address) {
  if (!address) return [];
  return String(address).split(/\r?\n|,\s*/).map((line) => line.trim()).filter(Boolean);
}

export function sectionHeader(text) {
  return { text, style: 'sectionHeader' };
}

export function keyValueTable(rows, options = {}) {
  return {
    table: {
      widths: options.widths || [118, '*'],
      body: rows.map(([label, value]) => [
        { text: label, style: 'label', fillColor: BRAND.softer },
        value && typeof value === 'object' ? value : { text: cleanText(value), style: 'value' },
      ]),
    },
    layout: options.layout || 'lightGrid',
    margin: options.margin || [0, 4, 0, 10],
  };
}

export function simpleTable(headers, rows, options = {}) {
  return {
    table: {
      headerRows: headers?.length ? 1 : 0,
      widths: options.widths || headers.map(() => '*'),
      body: [
        ...(headers?.length ? [headers.map((header, index) => ({
          text: header,
          style: 'tableHeader',
          alignment: options.alignments?.[index] || 'left',
        }))] : []),
        ...rows,
      ],
    },
    layout: options.layout || 'lightGrid',
    margin: options.margin || [0, 6, 0, 10],
  };
}

export function signatureNode(signatureImage) {
  if (signatureImage) {
    const image = imageToDataUrl(signatureImage);
    if (image) return { image, width: 130, height: 45, fit: [130, 45], margin: [6, 2, 0, 2] };
  }

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="95" viewBox="0 0 280 95">
      <path d="M36 76 C58 45, 61 19, 50 14 C39 9, 38 38, 43 59 C49 84, 83 64, 104 42 C118 27, 109 20, 95 39 C84 55, 92 75, 118 64 C139 55, 143 31, 133 27 C123 24, 118 48, 129 60 C145 79, 178 41, 160 32 C148 26, 139 44, 151 56 C168 72, 199 49, 218 47 C239 44, 250 45, 263 42" fill="none" stroke="${BRAND.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M73 80 C116 81, 169 76, 236 70" fill="none" stroke="${BRAND.accent}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
    </svg>`,
    width: 128,
    margin: [6, 2, 0, 0],
  };
}

export function imageToDataUrl(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('data:image/')) return value;
  if (Buffer.isBuffer(value)) return `data:image/png;base64,${value.toString('base64')}`;
  if (typeof value === 'string' && existsSync(value)) {
    const ext = extname(value).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${readFileSync(value).toString('base64')}`;
  }
  return null;
}

export function createPdfStream(docDefinition) {
  return printer.createPdfKitDocument(docDefinition, {
    tableLayouts: docDefinition.tableLayouts,
    bufferPages: false,
  });
}

export function renderPdfBuffer(docDefinition) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pdfDoc = createPdfStream(docDefinition);
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
