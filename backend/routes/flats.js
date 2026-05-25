import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import XLSX from 'xlsx-js-style';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// ─── Upload Setup ────────────────────────────────────────────────────────────
const UPLOAD_DIR = join(__dirname, '..', 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `flat_upload_${Date.now()}${extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .xlsx, .xls, .csv files are allowed'));
  },
});

// ─── Column Aliases for Auto-Mapping ─────────────────────────────────────────
const COLUMN_ALIASES = {
  // Flat Details columns
  flat_number:      ['flat no', 'flat number', 'flat_no', 'flatno', 'flat', 'unit no', 'unit number', 'unit'],
  flat_type:        ['type', 'flat type', 'flat_type', 'bhk', 'unit type', 'category'],
  floor:            ['floor', 'floor no', 'floor_no', 'storey', 'level'],
  block:            ['block', 'block name', 'block_name', 'tower', 'wing'],
  sbu_area:         ['super built up area', 'sbu area', 'sbu_area', 'super area', 'super built area', 'sba', 'total sbu', 'super builtup area'],
  carpet_area:      ['carpet area', 'carpet_area', 'carpet', 'carpet sq ft'],
  balcony_area:     ['balcony', 'balcony area', 'balcony_area', 'balcony sq ft'],
  terrace_area:     ['terrace', 'terrace area', 'terrace_area', 'terrace sq ft'],
  built_up_area:    ['built up area', 'built_up_area', 'builtup area', 'buildup area', 'built area'],
  undivided_share:  ['undivided share of land', 'undivided share', 'undivided_share', 'udi share', 'udi', 'uds', 'land share'],
  total_amount:     ['flat amount', 'total amount', 'total_amount', 'amount', 'price', 'flat price', 'cost', 'flat value', 'flat amount (₹)', 'flat amount (rs)'],
  gst_percent:      ['gst', 'gst %', 'gst(%)', 'gst_percent', 'gst percent', 'tax %', 'tax'],

  // Booking Status columns
  booking_status:   ['booking status', 'status', 'booking_status', 'booked', 'availability', 'available'],
  customer_name:    ['customer name', 'customer_name', 'client name', 'client_name', 'buyer name', 'buyer', 'customer', 'name', 'owner'],
};

// System fields
const FLAT_DETAIL_FIELDS = ['flat_number', 'flat_type', 'floor', 'sbu_area', 'carpet_area', 'balcony_area', 'terrace_area', 'built_up_area', 'undivided_share'];
const BOOKING_STATUS_FIELDS = ['flat_number', 'flat_type', 'floor', 'sbu_area', 'booking_status', 'customer_name'];

/**
 * Auto-map Excel headers to system fields
 */
function autoMapHeaders(headers, fieldSet) {
  const mapping = {};
  const usedFields = new Set();

  for (const header of headers) {
    if (!header || typeof header !== 'string') continue;
    const normalizedHeader = String(header).trim().toLowerCase().replace(/[_\-\.]+/g, ' ');

    let bestMatch = null;
    let bestConfidence = 'NONE';

    for (const [systemField, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!fieldSet.includes(systemField)) continue;
      if (usedFields.has(systemField)) continue;

      // Exact match
      if (aliases.includes(normalizedHeader)) {
        bestMatch = systemField;
        bestConfidence = 'HIGH';
        break;
      }

      // Partial/fuzzy match
      if (bestConfidence !== 'HIGH') {
        for (const alias of aliases) {
          if (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)) {
            bestMatch = systemField;
            bestConfidence = 'MEDIUM';
            break;
          }
        }
      }
    }

    if (bestMatch) {
      mapping[header] = { systemField: bestMatch, confidence: bestConfidence };
      usedFields.add(bestMatch);
    }
  }

  return mapping;
}

/**
 * Detect sheet type based on headers
 */
function detectSheetType(headers) {
  const normalized = headers.map(h => String(h || '').trim().toLowerCase());
  if (normalized.some(h => h.includes('booking status') || h === 'booking status')) return 'booking_status';
  if (normalized.some(h => h.includes('carpet') || h.includes('balcony') || h.includes('terrace') || h.includes('built up') || h.includes('undivided'))) return 'flat_details';
  if (normalized.some(h => h.includes('flat no') || h.includes('flat number'))) return 'flat_details'; // fallback
  return 'unknown';
}

/**
 * Extract block name from sheet name / title row
 */
function extractBlockName(sheetName, titleRow) {
  // Try sheet name first: "Block-A" → "A", "Block -A" → "A"
  const sheetMatch = sheetName.match(/block\s*[-–]\s*([A-Za-z0-9]+)/i);
  if (sheetMatch) return sheetMatch[1].toUpperCase();

  // Try title row: "BLOCK- A" → "A"
  if (titleRow) {
    const titleStr = String(titleRow[0] || '').trim();
    const titleMatch = titleStr.match(/block\s*[-–]\s*([A-Za-z0-9]+)/i);
    if (titleMatch) return titleMatch[1].toUpperCase();
  }

  return sheetName; // fallback
}

/**
 * Find header row index in sheet data
 */
function findHeaderRow(data) {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    const normalized = row.map(c => String(c || '').trim().toLowerCase());
    if (normalized.some(c => c.includes('flat no') || c === 'flat no' || c === 'flat number')) {
      return i;
    }
  }
  return -1;
}

/**
 * Clean cell value — handle NA, NULL, empty, etc.
 */
function cleanValue(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (['', 'na', 'n/a', 'null', 'nil', '-', '—', 'none'].includes(str.toLowerCase())) return null;
  return str;
}

/**
 * Safely parse number
 */
function getSafeFloat(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}


// ─── STANDARD CRUD ───────────────────────────────────────────────────────────

// GET /api/flats
router.get('/', verifyToken, async (req, res) => {
  try {
    const [flats] = await pool.query(`
      SELECT f.*,
        COALESCE(f.gst_percent, 0) as gst_percent,
        ROUND(COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100, 2) as gst_amount,
        ROUND(COALESCE(f.total_amount, 0) + (COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100), 2) as total_amount_with_gst,
        a.name as apartment_name 
      FROM flats f
      LEFT JOIN apartments a ON f.apartment_id = a.id
      ORDER BY f.created_at DESC
    `);
    res.json(flats);
  } catch (err) {
    console.error('Get flats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/flats
router.post('/', verifyToken, async (req, res) => {
  try {
    const { apartment_id, tower_id, flat_number, flat_type, floor, block, sbu_area, carpet_area, balcony_area, terrace_area, built_up_area, undivided_share, total_amount, gst_percent, is_available, status } = req.body;
    if (!apartment_id || !flat_number) return res.status(400).json({ error: 'apartment_id and flat_number are required' });

    const nextStatus = status || (is_available === false ? 'booked' : 'available');
    const [result] = await pool.query(
      `INSERT INTO flats (apartment_id, tower_id, flat_number, flat_type, floor, block, sbu_area, carpet_area, balcony_area, terrace_area, built_up_area, undivided_share, total_amount, gst_percent, is_available, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [apartment_id, tower_id || null, flat_number, flat_type || null, floor || null, block || null, sbu_area || null, carpet_area || null, balcony_area || null, terrace_area || null, built_up_area || null, undivided_share || null, total_amount || null, gst_percent || 0, is_available !== undefined ? is_available : nextStatus === 'available', nextStatus]
    );
    const [rows] = await pool.query('SELECT * FROM flats WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added' });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Flat number already exists in this apartment' });
    console.error('Create flat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/flats/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { apartment_id, tower_id, flat_number, flat_type, floor, block, sbu_area, carpet_area, balcony_area, terrace_area, built_up_area, undivided_share, total_amount, gst_percent, is_available, status } = req.body;
    const nextStatus = status || (is_available === false ? 'booked' : 'available');
    
    await pool.query(
      `UPDATE flats SET apartment_id = ?, tower_id = ?, flat_number = ?, flat_type = ?, floor = ?, block = ?, sbu_area = ?, carpet_area = ?, balcony_area = ?, terrace_area = ?, built_up_area = ?, undivided_share = ?, total_amount = ?, gst_percent = ?, is_available = ?, status = ? WHERE id = ?`,
      [apartment_id, tower_id || null, flat_number, flat_type || null, floor, block, sbu_area, carpet_area || null, balcony_area || null, terrace_area || null, built_up_area || null, undivided_share || null, total_amount, gst_percent || 0, is_available, nextStatus, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM flats WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Flat not found' });
    req.app.get('io')?.emit('data_changed', { type: 'project_updated' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Flat number already exists in this apartment' });
    console.error('Update flat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/flats/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM flats WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted' });
    res.json({ message: 'Flat deleted' });
  } catch (err) {
    console.error('Delete flat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ─── BULK UPLOAD ENDPOINTS ───────────────────────────────────────────────────

/**
 * POST /api/flats/parse-headers
 * Upload Excel, read all sheets, return headers + sample rows + auto mappings
 */
router.post('/parse-headers', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.readFile(req.file.path);
    const sheets = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (data.length < 2) continue; // Skip empty sheets

      const headerRowIdx = findHeaderRow(data);
      if (headerRowIdx === -1) continue; // No header found

      const headers = data[headerRowIdx].map(h => String(h || '').trim()).filter(Boolean);
      const sheetType = detectSheetType(headers);
      const blockName = extractBlockName(sheetName, data[0]);

      // Get data rows (skip header, skip TOTAL rows)
      const dataRows = data.slice(headerRowIdx + 1).filter(row => {
        if (!row || !Array.isArray(row)) return false;
        const firstCell = String(row[0] || '').trim().toLowerCase();
        return firstCell !== '' && firstCell !== 'total' && !isNaN(Number(row[0]));
      });

      // Sample rows (first 5)
      const sampleRows = dataRows.slice(0, 5).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      });

      // Auto-map headers
      const fieldSet = sheetType === 'booking_status' ? BOOKING_STATUS_FIELDS : FLAT_DETAIL_FIELDS;
      const autoMappings = autoMapHeaders(headers, fieldSet);

      sheets.push({
        sheetName,
        sheetType,
        blockName,
        headers,
        headerRowIndex: headerRowIdx,
        totalRows: dataRows.length,
        sampleRows,
        autoMappings,
      });
    }

    res.json({
      fileName: req.file.originalname,
      filePath: req.file.filename,
      totalSheets: wb.SheetNames.length,
      sheets,
    });
  } catch (err) {
    console.error('Parse headers error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse Excel file' });
  }
});


/**
 * POST /api/flats/bulk-upload/flat-details
 * Process flat area/details Excel and upsert into DB
 */
router.post('/bulk-upload/flat-details', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { apartment_id, column_mappings } = req.body;
    if (!apartment_id) return res.status(400).json({ error: 'apartment_id is required' });

    const parsedMappings = typeof column_mappings === 'string' ? JSON.parse(column_mappings) : (column_mappings || {});
    const wb = XLSX.readFile(req.file.path);

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors = [];
    const processedSheets = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const headerRowIdx = findHeaderRow(data);
      if (headerRowIdx === -1) {
        processedSheets.push({ sheetName, status: 'skipped', reason: 'No header row found' });
        continue;
      }

      const headers = data[headerRowIdx].map(h => String(h || '').trim());
      const blockName = extractBlockName(sheetName, data[0]);

      // Build column mapping: systemField → column index
      // Use provided mappings, or fall back to auto-map
      const sheetMappings = parsedMappings[sheetName] || autoMapHeaders(headers, FLAT_DETAIL_FIELDS);
      const reverseMap = {}; // systemField → columnIndex
      for (const [excelHeader, mapping] of Object.entries(sheetMappings)) {
        const systemField = typeof mapping === 'string' ? mapping : mapping.systemField;
        const colIdx = headers.indexOf(excelHeader);
        if (colIdx !== -1) reverseMap[systemField] = colIdx;
      }

      // Data rows
      const dataRows = data.slice(headerRowIdx + 1).filter(row => {
        if (!row || !Array.isArray(row)) return false;
        const firstCell = String(row[0] || '').trim().toLowerCase();
        return firstCell !== '' && firstCell !== 'total' && !isNaN(Number(row[0]));
      });

      let sheetInserted = 0;
      let sheetUpdated = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const excelRowNum = headerRowIdx + 2 + i; // 1-indexed Excel row

        try {
          const getValue = (field) => {
            const idx = reverseMap[field];
            return idx !== undefined ? cleanValue(row[idx]) : null;
          };

          const flatNumber = getValue('flat_number');
          if (!flatNumber) {
            errors.push({ sheet: sheetName, row: excelRowNum, error: 'Missing flat number' });
            totalSkipped++;
            continue;
          }

          const flatData = {
            apartment_id: Number(apartment_id),
            flat_number: String(flatNumber),
            flat_type: getValue('flat_type'),
            floor: getValue('floor')?.trim() || null,
            block: blockName,
            sbu_area: getSafeFloat(getValue('sbu_area')),
            carpet_area: getSafeFloat(getValue('carpet_area')),
            balcony_area: getSafeFloat(getValue('balcony_area')),
            terrace_area: getSafeFloat(getValue('terrace_area')),
            built_up_area: getSafeFloat(getValue('built_up_area')),
            undivided_share: getSafeFloat(getValue('undivided_share')),
            total_amount: getSafeFloat(getValue('total_amount')),
            gst_percent: getSafeFloat(getValue('gst_percent')) || 0,
          };

          // Upsert: INSERT ... ON DUPLICATE KEY UPDATE
          const [result] = await pool.query(
            `INSERT INTO flats (apartment_id, flat_number, flat_type, floor, block, sbu_area, carpet_area, balcony_area, terrace_area, built_up_area, undivided_share, total_amount, gst_percent, is_available, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'available')
             ON DUPLICATE KEY UPDATE
               flat_type = COALESCE(VALUES(flat_type), flat_type),
               floor = COALESCE(VALUES(floor), floor),
               block = COALESCE(VALUES(block), block),
               sbu_area = COALESCE(VALUES(sbu_area), sbu_area),
               carpet_area = COALESCE(VALUES(carpet_area), carpet_area),
               balcony_area = COALESCE(VALUES(balcony_area), balcony_area),
               terrace_area = COALESCE(VALUES(terrace_area), terrace_area),
               built_up_area = COALESCE(VALUES(built_up_area), built_up_area),
               undivided_share = COALESCE(VALUES(undivided_share), undivided_share),
               total_amount = COALESCE(VALUES(total_amount), total_amount),
               gst_percent = COALESCE(VALUES(gst_percent), gst_percent)`,
            [
              flatData.apartment_id, flatData.flat_number, flatData.flat_type,
              flatData.floor, flatData.block, flatData.sbu_area,
              flatData.carpet_area, flatData.balcony_area, flatData.terrace_area,
              flatData.built_up_area, flatData.undivided_share,
              flatData.total_amount, flatData.gst_percent,
            ]
          );

          if (result.affectedRows === 1) {
            sheetInserted++;
            totalInserted++;
          } else if (result.affectedRows === 2) {
            // ON DUPLICATE KEY UPDATE counts as 2 affected rows
            sheetUpdated++;
            totalUpdated++;
          }
        } catch (rowErr) {
          errors.push({ sheet: sheetName, row: excelRowNum, error: rowErr.message });
          totalSkipped++;
        }
      }

      processedSheets.push({
        sheetName,
        blockName,
        status: 'processed',
        totalRows: dataRows.length,
        inserted: sheetInserted,
        updated: sheetUpdated,
      });
    }

    // Emit socket event for real-time refresh
    req.app.get('io')?.emit('data_changed', { type: 'project_added' });

    res.json({
      success: true,
      totalInserted,
      totalUpdated,
      totalSkipped,
      totalProcessed: totalInserted + totalUpdated + totalSkipped,
      sheets: processedSheets,
      errors: errors.slice(0, 50), // cap at 50 errors
    });
  } catch (err) {
    console.error('Bulk upload flat details error:', err);
    res.status(500).json({ error: err.message || 'Bulk upload failed' });
  }
});


/**
 * POST /api/flats/bulk-upload/booking-status
 * Process booking status Excel and update existing flats
 */
router.post('/bulk-upload/booking-status', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { apartment_id, column_mappings } = req.body;
    if (!apartment_id) return res.status(400).json({ error: 'apartment_id is required' });

    const parsedMappings = typeof column_mappings === 'string' ? JSON.parse(column_mappings) : (column_mappings || {});
    const wb = XLSX.readFile(req.file.path);

    let totalBooked = 0;
    let totalAvailable = 0;
    let totalSkipped = 0;
    let totalNotFound = 0;
    const errors = [];
    const processedSheets = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const headerRowIdx = findHeaderRow(data);
      if (headerRowIdx === -1) {
        processedSheets.push({ sheetName, status: 'skipped', reason: 'No header row found' });
        continue;
      }

      const headers = data[headerRowIdx].map(h => String(h || '').trim());
      const blockName = extractBlockName(sheetName, data[0]);

      // Build column mapping
      const sheetMappings = parsedMappings[sheetName] || autoMapHeaders(headers, BOOKING_STATUS_FIELDS);
      const reverseMap = {};
      for (const [excelHeader, mapping] of Object.entries(sheetMappings)) {
        const systemField = typeof mapping === 'string' ? mapping : mapping.systemField;
        const colIdx = headers.indexOf(excelHeader);
        if (colIdx !== -1) reverseMap[systemField] = colIdx;
      }

      // Data rows
      const dataRows = data.slice(headerRowIdx + 1).filter(row => {
        if (!row || !Array.isArray(row)) return false;
        const firstCell = String(row[0] || '').trim().toLowerCase();
        return firstCell !== '' && firstCell !== 'total' && !isNaN(Number(row[0]));
      });

      let sheetBooked = 0;
      let sheetAvailable = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const excelRowNum = headerRowIdx + 2 + i;

        try {
          const getValue = (field) => {
            const idx = reverseMap[field];
            return idx !== undefined ? cleanValue(row[idx]) : null;
          };

          const flatNumber = getValue('flat_number');
          if (!flatNumber) {
            errors.push({ sheet: sheetName, row: excelRowNum, error: 'Missing flat number' });
            totalSkipped++;
            continue;
          }

          const bookingStatus = (getValue('booking_status') || '').toLowerCase().trim();
          const customerName = getValue('customer_name') || null;
          const isBooked = ['booked', 'sold', 'reserved', 'yes', 'y', '1', 'true'].includes(bookingStatus);

          // Find existing flat
          const [existingFlats] = await pool.query(
            'SELECT id FROM flats WHERE apartment_id = ? AND flat_number = ?',
            [Number(apartment_id), String(flatNumber)]
          );

          if (existingFlats.length === 0) {
            // If flat doesn't exist, also upsert the flat basic data along with booking status
            const flatType = getValue('flat_type') || null;
            const floorVal = getValue('floor')?.trim() || null;
            const sbuArea = getSafeFloat(getValue('sbu_area'));

            await pool.query(
              `INSERT INTO flats (apartment_id, flat_number, flat_type, floor, block, sbu_area, is_available, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 is_available = VALUES(is_available),
                 status = VALUES(status),
                 flat_type = COALESCE(VALUES(flat_type), flat_type),
                 floor = COALESCE(VALUES(floor), floor),
                 block = COALESCE(VALUES(block), block),
                 sbu_area = COALESCE(VALUES(sbu_area), sbu_area)`,
              [Number(apartment_id), String(flatNumber), flatType, floorVal, blockName, sbuArea, !isBooked, isBooked ? 'booked' : 'available']
            );

            if (isBooked) { sheetBooked++; totalBooked++; }
            else { sheetAvailable++; totalAvailable++; }
            continue;
          }

          // Update existing flat booking status
          await pool.query(
            'UPDATE flats SET is_available = ?, status = ? WHERE id = ?',
            [!isBooked, isBooked ? 'booked' : 'available', existingFlats[0].id]
          );

          if (isBooked) { sheetBooked++; totalBooked++; }
          else { sheetAvailable++; totalAvailable++; }
        } catch (rowErr) {
          errors.push({ sheet: sheetName, row: excelRowNum, error: rowErr.message });
          totalSkipped++;
        }
      }

      processedSheets.push({
        sheetName,
        blockName,
        status: 'processed',
        totalRows: dataRows.length,
        booked: sheetBooked,
        available: sheetAvailable,
      });
    }

    req.app.get('io')?.emit('data_changed', { type: 'project_updated' });

    res.json({
      success: true,
      totalBooked,
      totalAvailable,
      totalSkipped,
      totalNotFound,
      totalProcessed: totalBooked + totalAvailable + totalSkipped,
      sheets: processedSheets,
      errors: errors.slice(0, 50),
    });
  } catch (err) {
    console.error('Bulk upload booking status error:', err);
    res.status(500).json({ error: err.message || 'Bulk upload failed' });
  }
});


/**
 * GET /api/flats/download-template/:apartmentId
 * Generate and download a clean, formatted Excel template matching the original "Flat Area" format.
 * - One sheet per block (or one default sheet if no blocks)
 * - Columns: SL.NO, FLAT NO, TYPE, FLOOR, CARPET AREA, BALCONY, TERRACE, BUILT UP AREA, SUPER BUILT UP AREA, UNDIVIDED SHARE OF LAND
 * - NO GST or Amount columns (those are added manually in the portal)
 * - Proper borders, bold headers, column widths, TOTAL row
 */
router.get('/download-template/:apartmentId', verifyToken, async (req, res) => {
  try {
    const aptId = Number(req.params.apartmentId);
    const [apartment] = await pool.query('SELECT a.name, p.name as property_name FROM apartments a LEFT JOIN properties p ON p.id = a.property_id WHERE a.id = ?', [aptId]);
    const aptName = apartment[0]?.name || 'Apartment';

    const [existingFlats] = await pool.query(
      `SELECT flat_number, flat_type, floor, block, sbu_area, carpet_area, balcony_area, terrace_area, built_up_area, undivided_share
       FROM flats WHERE apartment_id = ? ORDER BY block, CAST(flat_number AS UNSIGNED), flat_number`,
      [aptId]
    );

    // Group flats by block
    const blockMap = {};
    for (const f of existingFlats) {
      const blk = f.block || 'Default';
      if (!blockMap[blk]) blockMap[blk] = [];
      blockMap[blk].push(f);
    }

    // If no flats exist, create one empty block sheet
    const blocks = Object.keys(blockMap);
    if (blocks.length === 0) blocks.push('A');

    const HEADERS = ['SL. NO.', 'FLAT NO', 'TYPE', 'FLOOR', 'CARPET AREA', 'BALCONY', 'TERRACE', 'BUILT UP AREA', 'SUPER BUILT UP AREA', 'UNDIVIDED SHARE OF LAND'];
    const COL_WIDTHS = [
      { wch: 7 },   // SL. NO.
      { wch: 10 },  // FLAT NO
      { wch: 8 },   // TYPE
      { wch: 7 },   // FLOOR
      { wch: 14 },  // CARPET AREA
      { wch: 11 },  // BALCONY
      { wch: 10 },  // TERRACE
      { wch: 15 },  // BUILT UP AREA
      { wch: 20 },  // SUPER BUILT UP AREA
      { wch: 25 },  // UNDIVIDED SHARE OF LAND
    ];

    // Border style for all cells
    const thinBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };

    // Header cell style: bold, white text, orange background, centered, with borders
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: 'F97316' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thinBorder,
    };

    // Title row style: bold, large, centered
    const titleStyle = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    // Data cell style: normal with borders
    const dataStyle = {
      border: thinBorder,
      alignment: { vertical: 'center' },
    };

    // Number cell style: centered with borders
    const numStyle = {
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    // Total row style: bold with borders
    const totalStyle = {
      font: { bold: true },
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    const wb = XLSX.utils.book_new();

    for (const blk of blocks) {
      const flats = blockMap[blk] || [];
      const sheetName = `Block-${blk}`;

      // Build data: Row 0 = Block title, Row 1 = Headers, Row 2+ = Data, Last = Total
      const aoa = [];

      // Row 0: Block title (merged across all columns)
      const titleRow = [`BLOCK- ${blk}`];
      for (let c = 1; c < HEADERS.length; c++) titleRow.push('');
      aoa.push(titleRow);

      // Row 1: Column headers
      aoa.push([...HEADERS]);

      // Data rows
      if (flats.length > 0) {
        flats.forEach((f, i) => {
          aoa.push([
            i + 1,
            f.flat_number || '',
            f.flat_type || '',
            f.floor || '',
            f.carpet_area ?? '',
            f.balcony_area ?? '',
            f.terrace_area ?? '',
            f.built_up_area ?? '',
            f.sbu_area ?? '',
            f.undivided_share ?? '',
          ]);
        });
      } else {
        // Empty template: 20 rows
        for (let i = 1; i <= 20; i++) {
          aoa.push([i, '', '', '', '', '', '', '', '', '']);
        }
      }

      // TOTAL row
      const totalRow = ['TOTAL', '', '', ''];
      // Sum columns E through J (carpet_area to undivided_share)
      if (flats.length > 0) {
        for (let col = 4; col < 10; col++) {
          let sum = 0;
          flats.forEach(f => {
            const vals = [null, null, null, null, f.carpet_area, f.balcony_area, f.terrace_area, f.built_up_area, f.sbu_area, f.undivided_share];
            sum += Number(vals[col]) || 0;
          });
          totalRow.push(sum || '');
        }
      } else {
        for (let col = 4; col < 10; col++) totalRow.push('');
      }
      aoa.push(totalRow);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Set column widths
      ws['!cols'] = COL_WIDTHS;

      // Set row heights
      const rowHeights = [];
      rowHeights[0] = { hpt: 28 }; // Title row
      rowHeights[1] = { hpt: 22 }; // Header row
      ws['!rows'] = rowHeights;

      // Merge title row across all columns
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
      ];

      // Apply styles to all cells
      const totalRowIdx = aoa.length - 1;
      for (let R = 0; R < aoa.length; R++) {
        for (let C = 0; C < HEADERS.length; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };

          if (R === 0) {
            // Title row
            ws[cellRef].s = titleStyle;
          } else if (R === 1) {
            // Header row
            ws[cellRef].s = headerStyle;
          } else if (R === totalRowIdx) {
            // Total row
            ws[cellRef].s = totalStyle;
          } else if (C >= 4) {
            // Numeric data cells (centered)
            ws[cellRef].s = numStyle;
          } else {
            // Text data cells
            ws[cellRef].s = dataStyle;
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    }

    // Also add a Booking Status sheet
    const bookingHeaders = ['SL. NO.', 'FLAT NO', 'TYPE', 'FLOOR', 'SUPER BUILT UP AREA', 'BOOKING STATUS', 'CUSTOMER NAME'];
    const bookingWidths = [
      { wch: 7 }, { wch: 10 }, { wch: 8 }, { wch: 7 }, { wch: 20 }, { wch: 16 }, { wch: 25 },
    ];

    for (const blk of blocks) {
      const flats = blockMap[blk] || [];
      const sheetName = `Block -${blk}`;

      const aoa = [];
      // Title
      aoa.push(['BOOKING STATUS', '', '', '', '', '', '']);
      // Block name
      aoa.push([`BLOCK- ${blk}`, '', '', '', '', '', '']);
      // Headers
      aoa.push([...bookingHeaders]);

      if (flats.length > 0) {
        flats.forEach((f, i) => {
          aoa.push([i + 1, f.flat_number || '', f.flat_type || '', f.floor || '', f.sbu_area ?? '', '', '']);
        });
      } else {
        for (let i = 1; i <= 20; i++) {
          aoa.push([i, '', '', '', '', '', '']);
        }
      }

      // TOTAL row
      const totalRow = ['TOTAL', '', '', ''];
      if (flats.length > 0) {
        const sbuSum = flats.reduce((s, f) => s + (Number(f.sbu_area) || 0), 0);
        totalRow.push(sbuSum || '', '', '');
      } else {
        totalRow.push('', '', '');
      }
      aoa.push(totalRow);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = bookingWidths;
      ws['!rows'] = [{ hpt: 24 }, { hpt: 24 }, { hpt: 22 }];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: bookingHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: bookingHeaders.length - 1 } },
      ];

      // Apply styles
      const totalRowIdx = aoa.length - 1;
      for (let R = 0; R < aoa.length; R++) {
        for (let C = 0; C < bookingHeaders.length; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };

          if (R <= 1) {
            ws[cellRef].s = titleStyle;
          } else if (R === 2) {
            ws[cellRef].s = headerStyle;
          } else if (R === totalRowIdx) {
            ws[cellRef].s = totalStyle;
          } else {
            ws[cellRef].s = { border: thinBorder, alignment: { vertical: 'center' } };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    }

    // Generate buffer — use xlsx with styles support
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `${aptName.replace(/[^a-zA-Z0-9]/g, '_')}_Flat_Area.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Download template error:', err);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});


export default router;
