export const BRAND = {
  ink: '#111827',
  muted: '#4b5563',
  soft: '#f3f4f6',
  softer: '#f9fafb',
  border: '#d1d5db',
  lightBorder: '#e5e7eb',
  white: '#ffffff',
  accent: '#3857c9',
};

export const pdfStyles = {
  header: {
    fontSize: 26,
    bold: true,
    color: BRAND.ink,
    margin: [0, 0, 0, 4],
  },
  headerMeta: {
    fontSize: 9.5,
    color: BRAND.muted,
    lineHeight: 1.25,
  },
  title: {
    fontSize: 13,
    bold: true,
    alignment: 'center',
    decoration: 'underline',
    characterSpacing: 0.4,
    margin: [0, 8, 0, 16],
  },
  invoiceTitle: {
    fontSize: 14,
    bold: true,
    alignment: 'center',
    characterSpacing: 0.4,
    margin: [0, 6, 0, 16],
  },
  tableHeader: {
    bold: true,
    fontSize: 9,
    color: BRAND.muted,
    fillColor: BRAND.soft,
    characterSpacing: 0.3,
  },
  label: {
    bold: true,
    color: BRAND.ink,
  },
  value: {
    color: BRAND.ink,
  },
  paragraph: {
    fontSize: 10.2,
    lineHeight: 1.35,
    alignment: 'justify',
    margin: [0, 0, 0, 8],
  },
  sectionHeader: {
    bold: true,
    fontSize: 10.5,
    margin: [0, 8, 0, 5],
  },
  footer: {
    fontSize: 8,
    color: '#6b7280',
  },
  small: {
    fontSize: 9,
    color: BRAND.muted,
  },
};

export const tableLayouts = {
  lightGrid: {
    hLineColor: () => BRAND.border,
    vLineColor: () => BRAND.border,
    hLineWidth: () => 0.7,
    vLineWidth: () => 0.7,
    paddingLeft: () => 7,
    paddingRight: () => 7,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  },
  invoiceGrid: {
    hLineColor: () => BRAND.lightBorder,
    vLineColor: () => BRAND.lightBorder,
    hLineWidth: () => 0.7,
    vLineWidth: () => 0.7,
    paddingLeft: () => 7,
    paddingRight: () => 7,
    paddingTop: () => 6,
    paddingBottom: () => 6,
  },
  noBorders: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
};
