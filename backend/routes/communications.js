import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = Router();

let invoiceSupportPromise = null;

async function hasInvoiceSupport() {
  if (!invoiceSupportPromise) {
    invoiceSupportPromise = (async () => {
      const [[tableRow]] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'invoices'`
      );

      if (!tableRow || Number(tableRow.count) === 0) return false;

      const [[columnRow]] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'communication_history'
           AND column_name = 'invoice_id'`
      );

      return Boolean(columnRow && Number(columnRow.count) > 0);
    })().catch((err) => {
      console.warn('Invoice support check failed:', err.message || err);
      return false;
    });
  }

  return invoiceSupportPromise;
}

// ─── GET /api/demand-letters/download/:filename — Serve the PDF ────────────
router.get('/download/:filename', async (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', 'demand_letters', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ─── GET /api/communications — Full communication history ──────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const includeInvoices = await hasInvoiceSupport();
    const [history] = await pool.query(`
      SELECT ch.*, 
        c.name as client_name, c.unique_client_id, c.phone as client_phone, c.email as client_email,
        a.name as apartment_name, f.flat_number,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
        ${includeInvoices ? ', inv.file_name as invoice_file, inv.file_url as invoice_url, inv.invoice_no as invoice_no' : ''}
      FROM communication_history ch
      LEFT JOIN clients c ON ch.client_id = c.id
      LEFT JOIN flats f ON ch.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN demand_letters dl ON ch.demand_letter_id = dl.id
      ${includeInvoices ? 'LEFT JOIN invoices inv ON ch.invoice_id = inv.id' : ''}
      ORDER BY ch.sent_on DESC
    `);
    res.json(history);
  } catch (err) {
    console.error('Get communication history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/communications/client/:clientId — History for a specific client
router.get('/client/:clientId', verifyToken, async (req, res) => {
  try {
    const includeInvoices = await hasInvoiceSupport();
    const [history] = await pool.query(`
      SELECT ch.*, 
        c.name as client_name,
        f.flat_number,
        a.name as apartment_name,
        dl.file_name as demand_letter_file, dl.file_url as demand_letter_url
        ${includeInvoices ? ', inv.file_name as invoice_file, inv.file_url as invoice_url, inv.invoice_no as invoice_no' : ''}
      FROM communication_history ch
      LEFT JOIN clients c ON ch.client_id = c.id
      LEFT JOIN flats f ON ch.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN demand_letters dl ON ch.demand_letter_id = dl.id
      ${includeInvoices ? 'LEFT JOIN invoices inv ON ch.invoice_id = inv.id' : ''}
      WHERE ch.client_id = ?
      ORDER BY ch.sent_on DESC
    `, [req.params.clientId]);
    res.json(history);
  } catch (err) {
    console.error('Get client communication history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/communications/stats — Summary stats ─────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_communications,
        SUM(CASE WHEN type = 'demand_letter' THEN 1 ELSE 0 END) as total_demand_letters,
        SUM(CASE WHEN channel = 'email' THEN 1 ELSE 0 END) as total_emails,
        SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as total_whatsapp,
        SUM(CASE WHEN type = 'payment_receipt' THEN 1 ELSE 0 END) as total_payment_receipts,
        SUM(CASE WHEN type = 'invoice' THEN 1 ELSE 0 END) as total_invoices,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as total_sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
        SUM(CASE WHEN status = 'initiated' THEN 1 ELSE 0 END) as total_initiated
      FROM communication_history
    `);
    res.json(stats[0]);
  } catch (err) {
    console.error('Get communication stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/communications/:id — Delete a single history entry ────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM communication_history WHERE id = ?', [req.params.id]);
    res.json({ message: 'Communication record deleted' });
  } catch (err) {
    console.error('Delete communication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
