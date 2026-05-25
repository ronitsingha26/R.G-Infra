import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const DATASETS = {
  all: 'Complete Backup',
  clients: 'Client Data',
  payments: 'Payment History',
  dues: 'Due & Paid Status',
  schedules: 'Payment Dates',
  monthly: 'Monthly Profit',
};

function safeName(value) {
  return String(value || 'backup').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
}

function formatDateForFile() {
  return new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

function sqlDateFilter(alias, field, fromDate, toDate) {
  const conditions = [];
  const params = [];
  if (fromDate) {
    conditions.push(`${alias}.${field} >= ?`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`${alias}.${field} <= ?`);
    params.push(toDate);
  }
  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(columns, rows) {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(','));
  return [header, ...body].join('\n');
}

function xmlEscape(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function worksheetXml(name, columns, rows) {
  const columnCount = columns.length;
  const rowCount = rows.length + 1;
  const headerCells = columns
    .map((column) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(column.label)}</Data></Cell>`)
    .join('');
  const rowCells = rows.map((row) => {
    const cells = columns.map((column) => {
      const value = row[column.key];
      const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  return `
    <Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}">
      <Table ss:ExpandedColumnCount="${columnCount}" ss:ExpandedRowCount="${rowCount}" x:FullColumns="1" x:FullRows="1">
        <Row>${headerCells}</Row>
        ${rowCells}
      </Table>
    </Worksheet>`;
}

function toExcelXml(sheets) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#F97316" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${sheets.map((sheet) => worksheetXml(sheet.name, sheet.columns, sheet.rows)).join('\n')}
</Workbook>`;
}

const columns = {
  clients: [
    { key: 'unique_client_id', label: 'Client ID' },
    { key: 'name', label: 'Client Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'pan_aadhaar', label: 'PAN/Aadhaar' },
    { key: 'address', label: 'Address' },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'property_name', label: 'Property' },
    { key: 'apartment_name', label: 'Apartment' },
    { key: 'tower_name', label: 'Tower' },
    { key: 'flat_number', label: 'Flat No' },
    { key: 'floor', label: 'Floor' },
    { key: 'sbu_area', label: 'SBU Area' },
    { key: 'flat_value', label: 'Flat Value' },
    { key: 'booking_id', label: 'Booking ID' },
    { key: 'booking_date', label: 'Booking Date' },
    { key: 'booking_amount', label: 'Booking Amount' },
    { key: 'total_paid', label: 'Total Paid' },
    { key: 'total_due', label: 'Total Due' },
    { key: 'first_payment_date', label: 'First Payment Date' },
    { key: 'last_payment_date', label: 'Last Payment Date' },
    { key: 'created_at', label: 'Created At' },
  ],
  payments: [
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'receipt_no', label: 'Receipt No' },
    { key: 'unique_client_id', label: 'Client ID' },
    { key: 'client_name', label: 'Client Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'property_name', label: 'Property' },
    { key: 'apartment_name', label: 'Apartment' },
    { key: 'flat_number', label: 'Flat No' },
    { key: 'amount', label: 'Paid Amount' },
    { key: 'payment_percentage', label: 'Payment %' },
    { key: 'gst_amount', label: 'GST Amount' },
    { key: 'payment_mode', label: 'Mode' },
    { key: 'reference_no', label: 'Reference No' },
    { key: 'invoice_no', label: 'Invoice No' },
    { key: 'notes', label: 'Notes' },
    { key: 'created_at', label: 'Recorded At' },
  ],
  dues: [
    { key: 'unique_client_id', label: 'Client ID' },
    { key: 'client_name', label: 'Client Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'property_name', label: 'Property' },
    { key: 'apartment_name', label: 'Apartment' },
    { key: 'flat_number', label: 'Flat No' },
    { key: 'total_flat_amount', label: 'Flat Value' },
    { key: 'total_paid', label: 'Paid' },
    { key: 'total_due', label: 'Due' },
    { key: 'combined_due', label: 'Current Due' },
    { key: 'current_stage_name', label: 'Current Stage' },
    { key: 'current_stage_due', label: 'Current Stage Due' },
    { key: 'next_stage_name', label: 'Next Stage' },
    { key: 'next_stage_amount', label: 'Next Stage Amount' },
    { key: 'last_calculated', label: 'Last Calculated' },
  ],
  schedules: [
    { key: 'unique_client_id', label: 'Client ID' },
    { key: 'client_name', label: 'Client Name' },
    { key: 'property_name', label: 'Property' },
    { key: 'apartment_name', label: 'Apartment' },
    { key: 'flat_number', label: 'Flat No' },
    { key: 'stage_order', label: 'Stage Order' },
    { key: 'stage_name', label: 'Stage Name' },
    { key: 'percentage', label: 'Stage %' },
    { key: 'amount', label: 'Stage Amount' },
    { key: 'gst_amount', label: 'GST' },
    { key: 'paid_amount', label: 'Paid' },
    { key: 'due_amount', label: 'Due' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'paid_date', label: 'Paid Date' },
    { key: 'status', label: 'Status' },
  ],
  monthly: [
    { key: 'month', label: 'Month' },
    { key: 'booked_clients', label: 'Booked Clients' },
    { key: 'sales_value', label: 'Sales Value' },
    { key: 'paid_collected', label: 'Paid Collected / Profit' },
    { key: 'gst_collected', label: 'GST Collected' },
    { key: 'due_balance', label: 'Due Balance' },
    { key: 'payment_count', label: 'Payment Count' },
  ],
};

async function getBackupData({ fromDate, toDate }) {
  const clientFilter = sqlDateFilter('c', 'purchase_date', fromDate, toDate);
  const paymentFilter = sqlDateFilter('cp', 'payment_date', fromDate, toDate);
  const scheduleFilter = sqlDateFilter('ps', 'due_date', fromDate, toDate);

  const [clients] = await pool.query(`
    SELECT
      c.unique_client_id, c.name, c.phone, c.email, c.pan_aadhaar, c.address,
      DATE_FORMAT(c.purchase_date, '%Y-%m-%d') AS purchase_date,
      p.name AS property_name, a.name AS apartment_name, t.name AS tower_name,
      f.flat_number, f.floor, f.sbu_area, COALESCE(f.total_amount, 0) AS flat_value,
      b.booking_id, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      COALESCE(b.booking_amount, 0) AS booking_amount,
      COALESCE(pay.total_paid, 0) AS total_paid,
      GREATEST(COALESCE(f.total_amount, 0) - COALESCE(pay.total_paid, 0), 0) AS total_due,
      DATE_FORMAT(pay.first_payment_date, '%Y-%m-%d') AS first_payment_date,
      DATE_FORMAT(pay.last_payment_date, '%Y-%m-%d') AS last_payment_date,
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM clients c
    LEFT JOIN flats f ON f.id = c.flat_id
    LEFT JOIN apartments a ON a.id = f.apartment_id
    LEFT JOIN properties p ON p.id = a.property_id
    LEFT JOIN towers t ON t.id = f.tower_id
    LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
    LEFT JOIN (
      SELECT client_id, SUM(amount) AS total_paid, MIN(payment_date) AS first_payment_date, MAX(payment_date) AS last_payment_date
      FROM client_payments
      GROUP BY client_id
    ) pay ON pay.client_id = c.id
    ${clientFilter.clause}
    ORDER BY c.created_at DESC
  `, clientFilter.params);

  const [payments] = await pool.query(`
    SELECT
      DATE_FORMAT(cp.payment_date, '%Y-%m-%d') AS payment_date,
      cp.receipt_no, c.unique_client_id, c.name AS client_name, c.phone,
      p.name AS property_name, a.name AS apartment_name, f.flat_number,
      COALESCE(cp.amount, 0) AS amount, COALESCE(cp.payment_percentage, 0) AS payment_percentage,
      COALESCE(cp.gst_amount, 0) AS gst_amount, cp.payment_mode, cp.reference_no,
      inv.invoice_no, cp.notes, DATE_FORMAT(cp.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM client_payments cp
    LEFT JOIN clients c ON c.id = cp.client_id
    LEFT JOIN flats f ON f.id = cp.flat_id
    LEFT JOIN apartments a ON a.id = f.apartment_id
    LEFT JOIN properties p ON p.id = a.property_id
    LEFT JOIN invoices inv ON inv.payment_id = cp.id
    ${paymentFilter.clause}
    ORDER BY cp.payment_date DESC, cp.created_at DESC
  `, paymentFilter.params);

  const [dues] = await pool.query(`
    SELECT
      c.unique_client_id, c.name AS client_name, c.phone, c.email,
      p.name AS property_name, a.name AS apartment_name, f.flat_number,
      COALESCE(d.total_flat_amount, f.total_amount, 0) AS total_flat_amount,
      COALESCE(d.total_paid, 0) AS total_paid,
      COALESCE(d.total_due, 0) AS total_due,
      COALESCE(d.combined_due, 0) AS combined_due,
      d.current_stage_name, COALESCE(d.current_stage_due, 0) AS current_stage_due,
      d.next_stage_name, COALESCE(d.next_stage_amount, 0) AS next_stage_amount,
      DATE_FORMAT(d.last_calculated, '%Y-%m-%d %H:%i:%s') AS last_calculated
    FROM clients c
    LEFT JOIN dues d ON d.client_id = c.id
    LEFT JOIN flats f ON f.id = c.flat_id
    LEFT JOIN apartments a ON a.id = f.apartment_id
    LEFT JOIN properties p ON p.id = a.property_id
    ORDER BY total_due DESC, c.name ASC
  `);

  const [schedules] = await pool.query(`
    SELECT
      c.unique_client_id, c.name AS client_name,
      p.name AS property_name, a.name AS apartment_name, f.flat_number,
      ps.stage_order, ps.stage_name, ps.percentage,
      COALESCE(ps.amount, 0) AS amount, COALESCE(ps.gst_amount, 0) AS gst_amount,
      COALESCE(ps.paid_amount, 0) AS paid_amount, COALESCE(ps.due_amount, 0) AS due_amount,
      DATE_FORMAT(ps.due_date, '%Y-%m-%d') AS due_date,
      DATE_FORMAT(ps.paid_date, '%Y-%m-%d') AS paid_date,
      ps.status
    FROM payment_schedules ps
    LEFT JOIN clients c ON c.id = ps.client_id
    LEFT JOIN flats f ON f.id = ps.flat_id
    LEFT JOIN apartments a ON a.id = f.apartment_id
    LEFT JOIN properties p ON p.id = a.property_id
    ${scheduleFilter.clause}
    ORDER BY ps.due_date ASC, c.name ASC, ps.stage_order ASC
  `, scheduleFilter.params);

  const monthlyParams = [];
  let monthlyPaymentWhere = '';
  if (fromDate || toDate) {
    const conditions = [];
    if (fromDate) { conditions.push('payment_date >= ?'); monthlyParams.push(fromDate); }
    if (toDate) { conditions.push('payment_date <= ?'); monthlyParams.push(toDate); }
    monthlyPaymentWhere = `WHERE ${conditions.join(' AND ')}`;
  }
  const [monthly] = await pool.query(`
    SELECT
      m.month,
      COALESCE(bookings.booked_clients, 0) AS booked_clients,
      COALESCE(bookings.sales_value, 0) AS sales_value,
      COALESCE(payments.paid_collected, 0) AS paid_collected,
      COALESCE(payments.gst_collected, 0) AS gst_collected,
      GREATEST(COALESCE(bookings.sales_value, 0) - COALESCE(bookings.total_paid_for_booked_clients, 0), 0) AS due_balance,
      COALESCE(payments.payment_count, 0) AS payment_count
    FROM (
      SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month FROM client_payments ${monthlyPaymentWhere}
      UNION
      SELECT DATE_FORMAT(purchase_date, '%Y-%m') AS month FROM clients WHERE purchase_date IS NOT NULL
    ) m
    LEFT JOIN (
      SELECT
        DATE_FORMAT(c.purchase_date, '%Y-%m') AS month,
        COUNT(DISTINCT c.id) AS booked_clients,
        COALESCE(SUM(f.total_amount), 0) AS sales_value,
        COALESCE(SUM(pay.total_paid), 0) AS total_paid_for_booked_clients
      FROM clients c
      LEFT JOIN flats f ON f.id = c.flat_id
      LEFT JOIN (SELECT client_id, SUM(amount) AS total_paid FROM client_payments GROUP BY client_id) pay ON pay.client_id = c.id
      WHERE c.purchase_date IS NOT NULL
      GROUP BY DATE_FORMAT(c.purchase_date, '%Y-%m')
    ) bookings ON bookings.month = m.month
    LEFT JOIN (
      SELECT
        DATE_FORMAT(payment_date, '%Y-%m') AS month,
        COALESCE(SUM(amount), 0) AS paid_collected,
        COALESCE(SUM(gst_amount), 0) AS gst_collected,
        COUNT(*) AS payment_count
      FROM client_payments
      ${monthlyPaymentWhere}
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
    ) payments ON payments.month = m.month
    WHERE m.month IS NOT NULL
    ORDER BY m.month DESC
  `, [...monthlyParams, ...monthlyParams]);

  return { clients, payments, dues, schedules, monthly };
}

router.get('/summary', verifyToken, async (_req, res) => {
  try {
    const [[summary]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM clients) AS clients,
        (SELECT COUNT(*) FROM client_payments) AS payments,
        (SELECT COALESCE(SUM(amount), 0) FROM client_payments) AS paid,
        (SELECT COALESCE(SUM(total_due), 0) FROM dues) AS due
    `);
    res.json({
      clients: Number(summary.clients || 0),
      payments: Number(summary.payments || 0),
      paid: Number(summary.paid || 0),
      due: Number(summary.due || 0),
      datasets: DATASETS,
    });
  } catch (err) {
    console.error('Backup summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export', verifyToken, async (req, res) => {
  const dataset = DATASETS[req.query.dataset] ? req.query.dataset : 'all';
  const format = req.query.format === 'csv' ? 'csv' : 'xls';
  const fromDate = req.query.from_date || '';
  const toDate = req.query.to_date || '';

  try {
    const data = await getBackupData({ fromDate, toDate });
    const selectedKeys = dataset === 'all' ? ['clients', 'payments', 'dues', 'schedules', 'monthly'] : [dataset];
    const fileBase = safeName(`rg_infra_${dataset}_${formatDateForFile()}`);
    let payload;
    let contentType;
    let extension;

    if (format === 'csv') {
      payload = selectedKeys
        .map((key) => `# ${DATASETS[key]}\n${toCsv(columns[key], data[key])}`)
        .join('\n\n');
      contentType = 'text/csv; charset=utf-8';
      extension = 'csv';
    } else {
      payload = toExcelXml(selectedKeys.map((key) => ({
        name: DATASETS[key],
        columns: columns[key],
        rows: data[key],
      })));
      contentType = 'application/vnd.ms-excel; charset=utf-8';
      extension = 'xls';
    }

    const fileName = `${fileBase}.${extension}`;
    try {
      await pool.query(
        'INSERT INTO backup_logs (file_name, file_url, status, created_by) VALUES (?, ?, ?, ?)',
        [fileName, null, 'success', req.user?.id || null]
      );
    } catch (logErr) {
      console.warn('Backup log skipped:', logErr.message);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(format === 'csv' ? `\uFEFF${payload}` : payload);
  } catch (err) {
    console.error('Backup export error:', err);
    try {
      await pool.query(
        'INSERT INTO backup_logs (file_name, status, error_message, created_by) VALUES (?, ?, ?, ?)',
        [`rg_infra_${dataset}_${formatDateForFile()}.${format}`, 'failed', err.message, req.user?.id || null]
      );
    } catch { /* ignore logging failures */ }
    res.status(500).json({ error: 'Backup export failed' });
  }
});

export default router;
