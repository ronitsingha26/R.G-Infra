import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/properties
router.get('/', verifyToken, async (req, res) => {
  try {
    const [properties] = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json(properties);
  } catch (err) {
    console.error('Get properties error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/properties
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, address, electricity_details, transformer_details, water_connection_details, land_north, land_south, land_east, land_west } = req.body;
    if (!name) return res.status(400).json({ error: 'Property name is required' });

    const [result] = await pool.query(
      `INSERT INTO properties (name, address, electricity_details, transformer_details, water_connection_details, land_north, land_south, land_east, land_west)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        address || null,
        electricity_details || null,
        transformer_details || null,
        water_connection_details || null,
        land_north || null,
        land_south || null,
        land_east || null,
        land_west || null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('data_changed', { type: 'project_added' });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Property name already exists' });
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/properties/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, address, electricity_details, transformer_details, water_connection_details, land_north, land_south, land_east, land_west } = req.body;
    if (!name) return res.status(400).json({ error: 'Property name is required' });

    await pool.query(
      `UPDATE properties
       SET name = ?, address = ?, electricity_details = ?, transformer_details = ?, water_connection_details = ?, land_north = ?, land_south = ?, land_east = ?, land_west = ?
       WHERE id = ?`,
      [
        name,
        address || null,
        electricity_details || null,
        transformer_details || null,
        water_connection_details || null,
        land_north || null,
        land_south || null,
        land_east || null,
        land_west || null,
        req.params.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    req.app.get('io')?.emit('data_changed', { type: 'project_updated' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Property name already exists' });
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const propId = req.params.id;

    // Get all apartment IDs under this property
    const [apts] = await connection.query('SELECT id FROM apartments WHERE property_id = ?', [propId]);
    const aptIds = apts.map(a => a.id);

    if (aptIds.length > 0) {
      // Get all flat IDs under these apartments
      const [flats] = await connection.query('SELECT id FROM flats WHERE apartment_id IN (?)', [aptIds]);
      const flatIds = flats.map(f => f.id);

      if (flatIds.length > 0) {
        // Get client IDs linked to these flats
        const [cls] = await connection.query('SELECT id FROM clients WHERE flat_id IN (?)', [flatIds]);
        const clientIds = cls.map(c => c.id);

        if (clientIds.length > 0) {
          // Delete client-linked data (only tables that actually have client_id)
          await connection.query('DELETE FROM work_projections WHERE client_id IN (?)', [clientIds]);
          // NOTE: work_projection_milestones is a global master table — no client_id column, skip it
          await connection.query('DELETE FROM demand_letters WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM reminder_logs WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM communication_logs WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM communication_history WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM client_payments WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM payment_schedules WHERE client_id IN (?)', [clientIds]);
          // NOTE: payment_stages uses apartment_id, not client_id — skip it
          await connection.query('DELETE FROM dues WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM due_reminders WHERE client_id IN (?)', [clientIds]);
          // NOTE: notifications uses user_id not client_id — skip it
          await connection.query('DELETE FROM invoices WHERE client_id IN (?)', [clientIds]).catch(() => {});
          await connection.query('DELETE FROM bookings WHERE client_id IN (?)', [clientIds]);
          await connection.query('DELETE FROM clients WHERE id IN (?)', [clientIds]);
        }

        // Delete flat-linked data
        await connection.query('DELETE FROM infrastructure_details WHERE flat_id IN (?)', [flatIds]);
        await connection.query('DELETE FROM flats WHERE id IN (?)', [flatIds]);
      }

      // Delete apartments
      await connection.query('DELETE FROM apartments WHERE id IN (?)', [aptIds]);
    }

    // Finally delete the property itself
    await connection.query('DELETE FROM properties WHERE id = ?', [propId]);

    await connection.commit();
    req.app.get('io')?.emit('data_changed', { type: 'project_deleted' });
    res.json({ message: 'Property and all linked data deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});


export default router;
