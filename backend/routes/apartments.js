import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/apartments
router.get('/', verifyToken, async (req, res) => {
  try {
    // Optionally join with properties to get property name
    const [apartments] = await pool.query(`
      SELECT a.*, p.name as property_name 
      FROM apartments a 
      LEFT JOIN properties p ON a.property_id = p.id
      ORDER BY a.created_at DESC
    `);
    res.json(apartments);
  } catch (err) {
    console.error('Get apartments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/apartments
router.post('/', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      name, property_id, total_flats, numbering_pattern, parking_slots, electricity_details, transformer_details, water_connection_details,
      floor_north, floor_south, floor_east, floor_west,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Apartment name is required' });

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO apartments
        (name, property_id, total_flats, numbering_pattern, parking_slots, electricity_details, transformer_details, water_connection_details,
         floor_north, floor_south, floor_east, floor_west)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, property_id || null, total_flats || 0, numbering_pattern || null, parking_slots || 0,
        electricity_details || null, transformer_details || null, water_connection_details || null,
        floor_north || null, floor_south || null, floor_east || null, floor_west || null,
      ]
    );

    const aptId = result.insertId;

    // Auto-generate flats if total_flats > 0
    const tFlats = parseInt(total_flats, 10) || 0;
    if (tFlats > 0) {
      let startNum = 1;
      if (numbering_pattern) {
        const match = numbering_pattern.match(/\d+/);
        if (match) startNum = parseInt(match[0], 10);
      }
      
      for (let i = 0; i < tFlats; i++) {
        await connection.query('INSERT INTO flats (apartment_id, flat_number) VALUES (?, ?)', [aptId, String(startNum + i)]);
      }
    }

    await connection.commit();

    const [rows] = await pool.query('SELECT a.*, p.name as property_name FROM apartments a LEFT JOIN properties p ON a.property_id = p.id WHERE a.id = ?', [aptId]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added', apartment_id: aptId });
    res.status(201).json(rows[0]);
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Apartment name already exists' });
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        error: 'Database schema is missing apartment columns. Run backend/hostinger_hotfix.sql or backend/update_db.js once on the server.',
      });
    }
    console.error('Create apartment error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/apartments/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      name, property_id, total_flats, numbering_pattern, parking_slots, electricity_details, transformer_details, water_connection_details,
      floor_north, floor_south, floor_east, floor_west,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Apartment name is required' });

    const [existingRows] = await pool.query('SELECT * FROM apartments WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Apartment not found' });
    const existing = existingRows[0];

    const nextPropertyId = property_id !== undefined ? property_id || null : existing.property_id || null;
    const nextTotalFlats = total_flats !== undefined && total_flats !== '' ? Number(total_flats) : Number(existing.total_flats || 0);
    const nextNumberingPattern = numbering_pattern !== undefined ? numbering_pattern || null : existing.numbering_pattern || null;
    const nextParkingSlots = parking_slots !== undefined && parking_slots !== '' ? Number(parking_slots) : Number(existing.parking_slots || 0);
    const nextElectricityDetails = electricity_details !== undefined ? electricity_details || null : existing.electricity_details || null;
    const nextTransformerDetails = transformer_details !== undefined ? transformer_details || null : existing.transformer_details || null;
    const nextWaterConnectionDetails = water_connection_details !== undefined ? water_connection_details || null : existing.water_connection_details || null;
    const nextFloorNorth = floor_north !== undefined ? floor_north || null : existing.floor_north || null;
    const nextFloorSouth = floor_south !== undefined ? floor_south || null : existing.floor_south || null;
    const nextFloorEast = floor_east !== undefined ? floor_east || null : existing.floor_east || null;
    const nextFloorWest = floor_west !== undefined ? floor_west || null : existing.floor_west || null;

    await pool.query(
      `UPDATE apartments SET 
       name = ?, property_id = ?, total_flats = ?, numbering_pattern = ?, parking_slots = ?,
       electricity_details = ?, transformer_details = ?, water_connection_details = ?, floor_north = ?, floor_south = ?, floor_east = ?, floor_west = ?
       WHERE id = ?`,
      [
        name,
        nextPropertyId,
        nextTotalFlats,
        nextNumberingPattern,
        nextParkingSlots,
        nextElectricityDetails,
        nextTransformerDetails,
        nextWaterConnectionDetails,
        nextFloorNorth,
        nextFloorSouth,
        nextFloorEast,
        nextFloorWest,
        req.params.id,
      ]
    );
    
    const [rows] = await pool.query('SELECT a.*, p.name as property_name FROM apartments a LEFT JOIN properties p ON a.property_id = p.id WHERE a.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Apartment not found' });
    req.app.get('io')?.emit('data_changed', { type: 'project_updated', apartment_id: req.params.id });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Apartment name already exists' });
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        error: 'Database schema is missing apartment columns. Run backend/hostinger_hotfix.sql or backend/update_db.js once on the server.',
      });
    }
    console.error('Update apartment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/apartments/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [[{ bookingCount }]] = await pool.query(
      'SELECT COUNT(*) AS bookingCount FROM bookings WHERE apartment_id = ?',
      [req.params.id]
    );
    if (Number(bookingCount) > 0) {
      return res.status(409).json({
        error: 'This apartment has bookings/clients linked to it. Delete or transfer those bookings before deleting the apartment.',
      });
    }

    await pool.query('DELETE FROM apartments WHERE id = ?', [req.params.id]);
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted', apartment_id: req.params.id });
    res.json({ message: 'Apartment deleted' });
  } catch (err) {
    console.error('Delete apartment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
