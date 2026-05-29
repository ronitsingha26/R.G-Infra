import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

function makeBookingId(nextId) {
  const year = new Date().getFullYear();
  return `RGB-${year}-${String(1000 + nextId).padStart(5, '0')}`;
}

function parkingCodeFromFlat(flatNumber, prefix = 'P') {
  const normalized = String(flatNumber || '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized ? `${prefix}${normalized}` : null;
}

function normalizePan(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

function normalizeAadhaar(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 12);
}

function validateIds(pan, aadhaar) {
  if (pan && pan.length !== 10) return 'PAN must be exactly 10 characters';
  if (aadhaar && aadhaar.length !== 12) return 'Aadhaar must be exactly 12 digits';
  return null;
}

// GET /api/clients
router.get('/', verifyToken, async (req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT c.*, 
        f.flat_number, f.floor, f.block, f.sbu_area, f.total_amount, COALESCE(f.gst_percent, 0) AS gst_percent,
        ROUND(COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100, 2) AS gst_amount,
        ROUND(COALESCE(f.total_amount, 0) + (COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100), 2) AS total_amount_with_gst,
        f.status as flat_status,
        a.name as apartment_name, p.name as property_name,
        b.booking_id, b.status as booking_status, b.booking_amount, b.booking_percentage,
          i.parking_allotment, i.parking_slot_no, i.extra_parking_allotment, i.extra_parking_slot_no, i.extra_parking_charge,
          i.transformer_apartment, i.transformer_flat, i.corpus_fund, i.electricity_board_source, i.water_connection_details,
        COALESCE((SELECT SUM(amount) FROM client_payments WHERE client_id = c.id), 0) as total_paid,
        (f.total_amount - COALESCE((SELECT SUM(amount) FROM client_payments WHERE client_id = c.id), 0)) as total_due
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN properties p ON a.property_id = p.id
      LEFT JOIN infrastructure_details i ON f.id = i.flat_id
      LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
      ORDER BY c.created_at DESC
    `);
    res.json(clients);
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clients/history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.unique_client_id, c.name, c.phone, c.email, c.purchase_date,
        f.flat_number, COALESCE(b.flat_value, f.total_amount, 0) as total_amount,
        COALESCE(f.gst_percent, 0) AS gst_percent,
        ROUND(COALESCE(b.flat_value, f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100, 2) AS gst_amount,
        ROUND(COALESCE(b.flat_value, f.total_amount, 0) + (COALESCE(b.flat_value, f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100), 2) AS total_amount_with_gst,
        a.name as apartment_name, p.name as property_name,
        COALESCE(cp.total_paid, 0) as total_paid,
        GREATEST(COALESCE(b.flat_value, f.total_amount, 0) - COALESCE(cp.total_paid, 0), 0) as total_due,
        d.current_stage_name, d.current_stage_due, d.next_stage_name, d.next_stage_amount, d.combined_due,
        (
          SELECT ps.due_date
          FROM payment_schedules ps
          WHERE ps.client_id = c.id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1
        ) AS current_due_date,
        (
          SELECT ps.due_date
          FROM payment_schedules ps
          WHERE ps.client_id = c.id AND ps.status != 'paid'
          ORDER BY ps.stage_order ASC, ps.id ASC
          LIMIT 1 OFFSET 1
        ) AS next_due_date,
        dl.id as latest_demand_letter_id,
        dl.file_name as latest_demand_letter_file,
        dl.file_url as latest_demand_letter_url,
        dl.generated_date as latest_demand_letter_date,
        dl.delivery_status as latest_demand_letter_status,
        inv.id as latest_invoice_id,
        inv.invoice_no as latest_invoice_no,
        inv.file_name as latest_invoice_file,
        inv.file_url as latest_invoice_url,
        inv.generated_date as latest_invoice_date,
        inv.amount as latest_invoice_amount,
        inv.grand_total as latest_invoice_total
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN properties p ON a.property_id = p.id
      LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
      LEFT JOIN (
        SELECT client_id, SUM(amount) as total_paid
        FROM client_payments
        GROUP BY client_id
      ) cp ON cp.client_id = c.id
      LEFT JOIN dues d ON d.client_id = c.id
      LEFT JOIN demand_letters dl ON dl.id = (
        SELECT id
        FROM demand_letters
        WHERE client_id = c.id
        ORDER BY generated_date DESC, id DESC
        LIMIT 1
      )
      LEFT JOIN invoices inv ON inv.id = (
        SELECT id
        FROM invoices
        WHERE client_id = c.id
        ORDER BY generated_date DESC, id DESC
        LIMIT 1
      )
      ORDER BY c.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get client history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT c.*, 
        f.flat_number, f.floor, f.block, f.sbu_area, f.total_amount, COALESCE(f.gst_percent, 0) AS gst_percent,
        ROUND(COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100, 2) AS gst_amount,
        ROUND(COALESCE(f.total_amount, 0) + (COALESCE(f.total_amount, 0) * COALESCE(f.gst_percent, 0) / 100), 2) AS total_amount_with_gst,
        f.apartment_id, f.status as flat_status,
        a.name as apartment_name, p.name as property_name,
        b.id as booking_record_id, b.booking_id, b.status as booking_status, b.booking_amount, b.booking_percentage,
          i.parking_allotment, i.parking_slot_no, i.extra_parking_allotment, i.extra_parking_slot_no, i.extra_parking_charge,
          i.transformer_apartment, i.transformer_flat, i.corpus_fund, i.electricity_board_source, i.water_connection_details, i.id as infra_id,
        COALESCE((SELECT SUM(amount) FROM client_payments WHERE client_id = c.id), 0) as total_paid,
        (f.total_amount - COALESCE((SELECT SUM(amount) FROM client_payments WHERE client_id = c.id), 0)) as total_due
      FROM clients c
      LEFT JOIN flats f ON c.flat_id = f.id
      LEFT JOIN apartments a ON f.apartment_id = a.id
      LEFT JOIN properties p ON a.property_id = p.id
      LEFT JOIN infrastructure_details i ON f.id = i.flat_id
      LEFT JOIN bookings b ON b.client_id = c.id AND b.status = 'active'
      WHERE c.id = ?
    `, [req.params.id]);

    if (clients.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(clients[0]);
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clients (Onboarding flow)
router.post('/', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { 
      name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id, flat_price, gst_percent,
      booking_amount, booking_percentage,
      parking_allotment, parking_slot_no,
      extra_parking_allotment, extra_vehicle_type, extra_parking_count, extra_parking_slot_no, extra_parking_charge,
      transformer_apartment, transformer_flat, corpus_fund, electricity_board_source, water_connection_details
    } = req.body;

    if (!name || !flat_id) {
      return res.status(400).json({ error: 'Name and flat_id are required' });
    }

    const normalizedPan = normalizePan(pan_number);
    const normalizedAadhaar = normalizeAadhaar(aadhaar_number);
    const idError = validateIds(normalizedPan, normalizedAadhaar);
    if (idError) {
      return res.status(400).json({ error: idError });
    }

    await connection.beginTransaction();

    // 1. Check flat availability
    const [flats] = await connection.query(
      'SELECT id, apartment_id, tower_id, flat_number, total_amount, is_available, status FROM flats WHERE id = ? FOR UPDATE',
      [flat_id]
    );
    if (flats.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Flat not found' });
    }
    if (!flats[0].is_available || flats[0].status === 'booked') {
      await connection.rollback();
      return res.status(400).json({ error: 'Flat is already booked or unavailable' });
    }

    const [aptRows] = await connection.query(
      `SELECT
        COALESCE(p.electricity_details, a.electricity_details) AS electricity_details,
        COALESCE(p.transformer_details, a.transformer_details) AS transformer_details,
        COALESCE(p.water_connection_details, a.water_connection_details) AS water_connection_details
      FROM apartments a
      LEFT JOIN properties p ON a.property_id = p.id
      WHERE a.id = ? FOR UPDATE`,
      [flats[0].apartment_id]
    );
    const apartmentInfra = aptRows[0] || {};
    const derivedParkingSlot = parkingCodeFromFlat(flats[0].flat_number);
    const derivedExtraParkingSlot = parkingCodeFromFlat(flats[0].flat_number, 'EP');

    // 2. Generate unique_client_id (e.g. RGI-1001)
    const [maxIdResult] = await connection.query('SELECT MAX(id) as maxId FROM clients');
    const nextId = (maxIdResult[0].maxId || 0) + 1;
    const unique_client_id = `RGI-${1000 + nextId}`;
    const booking_id = makeBookingId(nextId);

    // 3. Insert Client
    const combinedPanAadhaar = pan_aadhaar || [normalizedPan, normalizedAadhaar].filter(Boolean).join(' / ') || null;
    const [clientResult] = await connection.query(
      'INSERT INTO clients (unique_client_id, name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        unique_client_id,
        name,
        phone || null,
        email || null,
        address || null,
        combinedPanAadhaar,
        normalizedPan || null,
        normalizedAadhaar || null,
        purchase_date || null,
        flat_id,
      ]
    );

    // 4. Update Flat availability
    await connection.query('UPDATE flats SET is_available = FALSE, status = ? WHERE id = ?', ['booked', flat_id]);

    // If flat_price and gst_percent are provided during onboarding, update the flat record
    if (flat_price !== undefined && flat_price !== null && flat_price !== '') {
      await connection.query(
        'UPDATE flats SET total_amount = ?, gst_percent = ? WHERE id = ?',
        [Number(flat_price), Number(gst_percent || 0), flat_id]
      );
    }

    const flatTotalAmount = Number(flat_price || flats[0].total_amount || 0);
    let finalBookingAmount = Number(booking_amount || 0);
    let finalBookingPercentage = booking_percentage !== undefined && booking_percentage !== null && booking_percentage !== ''
      ? Number(booking_percentage)
      : null;

    if (finalBookingPercentage !== null && !Number.isNaN(finalBookingPercentage) && flatTotalAmount > 0) {
      finalBookingAmount = (flatTotalAmount * finalBookingPercentage) / 100;
    } else if (finalBookingAmount > 0 && flatTotalAmount > 0) {
      finalBookingPercentage = (finalBookingAmount / flatTotalAmount) * 100;
    }

    await connection.query(
      `INSERT INTO bookings
        (booking_id, client_id, apartment_id, tower_id, flat_id, booking_date, flat_value, booking_amount, booking_percentage, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        clientResult.insertId,
        flats[0].apartment_id,
        flats[0].tower_id || null,
        flat_id,
        purchase_date || new Date(),
        flatTotalAmount,
        finalBookingAmount || 0,
        finalBookingPercentage || 0,
        req.user?.id || null,
      ]
    );

    await connection.query(
      `INSERT INTO infrastructure_details 
      (flat_id, parking_allotment, parking_slot_no, extra_parking_allotment, extra_vehicle_type, extra_parking_count, extra_parking_slot_no, extra_parking_charge, transformer_apartment, transformer_flat, corpus_fund, electricity_board_source, water_connection_details) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        parking_allotment = VALUES(parking_allotment),
        parking_slot_no = VALUES(parking_slot_no),
        extra_parking_allotment = VALUES(extra_parking_allotment),
        extra_vehicle_type = VALUES(extra_vehicle_type),
        extra_parking_count = VALUES(extra_parking_count),
        extra_parking_slot_no = VALUES(extra_parking_slot_no),
        extra_parking_charge = VALUES(extra_parking_charge),
        transformer_apartment = VALUES(transformer_apartment),
        transformer_flat = VALUES(transformer_flat),
        corpus_fund = VALUES(corpus_fund),
        electricity_board_source = VALUES(electricity_board_source),
        water_connection_details = VALUES(water_connection_details)`,
      [
        flat_id,
        parking_allotment || false,
        parking_allotment ? (parking_slot_no || derivedParkingSlot) : null,
        extra_parking_allotment || false,
        extra_parking_allotment ? (extra_vehicle_type || null) : null,
        extra_parking_allotment ? (extra_parking_count || 1) : null,
        extra_parking_allotment ? (extra_parking_slot_no || derivedExtraParkingSlot) : null,
        extra_parking_allotment ? (extra_parking_charge || 0) : 0,
        apartmentInfra.transformer_details || transformer_apartment || null,
        transformer_flat || null,
        corpus_fund || 0,
        apartmentInfra.electricity_details || electricity_board_source || null,
        apartmentInfra.water_connection_details || water_connection_details || null
      ]
    );

    await connection.commit();
    
    // Fetch inserted client
    const [newClient] = await pool.query('SELECT * FROM clients WHERE id = ?', [clientResult.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'client_added', data: newClient[0] });
    
    res.status(201).json(newClient[0]);
  } catch (err) {
    await connection.rollback();
    console.error('Create client/onboarding error:', err);
    res.status(500).json({ error: 'Server error during onboarding' });
  } finally {
    connection.release();
  }
});

// PUT /api/clients/:id (Update client details)
router.put('/:id', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { 
      name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id,
      parking_allotment, parking_slot_no,
      extra_parking_allotment, extra_vehicle_type, extra_parking_count, extra_parking_slot_no, extra_parking_charge,
      transformer_apartment, transformer_flat, corpus_fund, electricity_board_source, water_connection_details
    } = req.body;

    const normalizedPan = normalizePan(pan_number);
    const normalizedAadhaar = normalizeAadhaar(aadhaar_number);
    const idError = validateIds(normalizedPan, normalizedAadhaar);
    if (idError) {
      return res.status(400).json({ error: idError });
    }

    await connection.beginTransaction();

    // Check if client exists
    const [existingClient] = await connection.query('SELECT flat_id FROM clients WHERE id = ? FOR UPDATE', [req.params.id]);
    if (existingClient.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }

    const oldFlatId = existingClient[0].flat_id;

    // Handle flat change
    if (flat_id && flat_id !== oldFlatId) {
      const [flats] = await connection.query('SELECT id, apartment_id, tower_id, flat_number, total_amount, is_available, status FROM flats WHERE id = ? FOR UPDATE', [flat_id]);
      if (flats.length === 0 || !flats[0].is_available) {
        await connection.rollback();
        return res.status(400).json({ error: 'New flat is not available' });
      }

      const [aptRows] = await connection.query(
        `SELECT
          COALESCE(p.electricity_details, a.electricity_details) AS electricity_details,
          COALESCE(p.transformer_details, a.transformer_details) AS transformer_details,
          COALESCE(p.water_connection_details, a.water_connection_details) AS water_connection_details
        FROM apartments a
        LEFT JOIN properties p ON a.property_id = p.id
        WHERE a.id = ? FOR UPDATE`,
        [flats[0].apartment_id]
      );
      const apartmentInfra = aptRows[0] || {};
      const derivedParkingSlot = parkingCodeFromFlat(flats[0].flat_number);
      const derivedExtraParkingSlot = parkingCodeFromFlat(flats[0].flat_number, 'EP');
      
      // Free old flat
      if (oldFlatId) await connection.query('UPDATE flats SET is_available = TRUE, status = ? WHERE id = ?', ['available', oldFlatId]);
      
      // Book new flat
      await connection.query('UPDATE flats SET is_available = FALSE, status = ? WHERE id = ?', ['booked', flat_id]);

      await connection.query(
        `UPDATE bookings SET apartment_id = ?, tower_id = ?, flat_id = ?, flat_value = ? 
         WHERE client_id = ? AND status = 'active'`,
        [flats[0].apartment_id, flats[0].tower_id || null, flat_id, flats[0].total_amount || 0, req.params.id]
      );

      // Delete old infra details and insert new (or just update if we keep 1 infra per flat, but here infra is tied to flat so we should maybe update the infra for new flat, or move infra? The prompt says infra is per flat. Actually, the prompt says "Infrastructure Details: Parking...". If infra is tied to flat, moving flat means moving to a new infra. For simplicity, we just delete old infra details for the old flat and insert for the new flat.)
      await connection.query('DELETE FROM infrastructure_details WHERE flat_id = ?', [oldFlatId]);
      await connection.query(
        `INSERT INTO infrastructure_details 
        (flat_id, parking_allotment, parking_slot_no, extra_parking_allotment, extra_vehicle_type, extra_parking_count, extra_parking_slot_no, extra_parking_charge, transformer_apartment, transformer_flat, corpus_fund, electricity_board_source, water_connection_details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flat_id,
          parking_allotment || false,
          parking_allotment ? (parking_slot_no || derivedParkingSlot) : null,
          extra_parking_allotment || false,
          extra_parking_allotment ? (extra_vehicle_type || null) : null,
          extra_parking_allotment ? (extra_parking_count || 1) : null,
          extra_parking_allotment ? (extra_parking_slot_no || derivedExtraParkingSlot) : null,
          extra_parking_allotment ? (extra_parking_charge || 0) : 0,
          apartmentInfra.transformer_details || transformer_apartment || null,
          transformer_flat || null,
          corpus_fund || 0,
          apartmentInfra.electricity_details || electricity_board_source || null,
          apartmentInfra.water_connection_details || water_connection_details || null,
        ]
      );
    } else if (flat_id) {
      const [flatRows] = await connection.query(
        `SELECT
          f.id,
          f.flat_number,
          COALESCE(p.electricity_details, a.electricity_details) AS electricity_details,
          COALESCE(p.transformer_details, a.transformer_details) AS transformer_details,
          COALESCE(p.water_connection_details, a.water_connection_details) AS water_connection_details
        FROM flats f
        LEFT JOIN apartments a ON f.apartment_id = a.id
        LEFT JOIN properties p ON a.property_id = p.id
        WHERE f.id = ? FOR UPDATE`,
        [flat_id]
      );
      const flatDetails = flatRows[0] || {};
      const derivedParkingSlot = parkingCodeFromFlat(flatDetails.flat_number);
      const derivedExtraParkingSlot = parkingCodeFromFlat(flatDetails.flat_number, 'EP');

      // Just update infra details for same flat
      await connection.query(
        `UPDATE infrastructure_details SET 
          parking_allotment = ?, parking_slot_no = ?, extra_parking_allotment = ?, extra_vehicle_type = ?, extra_parking_count = ?, extra_parking_slot_no = ?, extra_parking_charge = ?, transformer_apartment = ?, transformer_flat = ?, corpus_fund = ?, electricity_board_source = ?, water_connection_details = ?
        WHERE flat_id = ?`,
        [
          parking_allotment || false,
          parking_allotment ? (parking_slot_no || derivedParkingSlot) : null,
          extra_parking_allotment || false,
          extra_parking_allotment ? (extra_vehicle_type || null) : null,
          extra_parking_allotment ? (extra_parking_count || 1) : null,
          extra_parking_allotment ? (extra_parking_slot_no || derivedExtraParkingSlot) : null,
          extra_parking_allotment ? (extra_parking_charge || 0) : 0,
          flatDetails.transformer_details || transformer_apartment || null,
          transformer_flat || null,
          corpus_fund || 0,
          flatDetails.electricity_details || electricity_board_source || null,
          flatDetails.water_connection_details || water_connection_details || null,
          flat_id
        ]
      );
    }

    // Update Client
    const combinedPanAadhaar = pan_aadhaar || [normalizedPan, normalizedAadhaar].filter(Boolean).join(' / ') || null;
    await connection.query(
      'UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, pan_aadhaar = ?, pan_number = ?, aadhaar_number = ?, purchase_date = ?, flat_id = ? WHERE id = ?',
      [
        name,
        phone || null,
        email || null,
        address || null,
        combinedPanAadhaar,
        normalizedPan || null,
        normalizedAadhaar || null,
        purchase_date || null,
        flat_id || oldFlatId,
        req.params.id,
      ]
    );

    await connection.commit();

    const [updated] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'client_updated', data: updated[0] });
    
    res.json(updated[0]);
  } catch (err) {
    await connection.rollback();
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// DELETE /api/clients/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [client] = await connection.query('SELECT flat_id FROM clients WHERE id = ?', [req.params.id]);
    if (client.length > 0) {
      const flatId = client[0].flat_id;
      // Make flat available again
      if (flatId) await connection.query('UPDATE flats SET is_available = TRUE, status = ? WHERE id = ?', ['available', flatId]);
    }

    await connection.query('DELETE FROM clients WHERE id = ?', [req.params.id]);

    await connection.commit();
    req.app.get('io')?.emit('data_changed', { type: 'client_deleted', id: req.params.id });
    res.json({ message: 'Client deleted and flat released' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
