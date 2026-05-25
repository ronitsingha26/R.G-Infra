import pool from './config/db.js';

async function addColumnIfMissing(table, column, definition, after) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (Number(row.cnt) === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}${after ? ` AFTER ${after}` : ''}`);
  }
}

async function updateDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        address TEXT,
        land_north VARCHAR(500),
        land_south VARCHAR(500),
        land_east VARCHAR(500),
        land_west VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await addColumnIfMissing('properties', 'land_north', 'VARCHAR(500) NULL', 'address');
    await addColumnIfMissing('properties', 'land_south', 'VARCHAR(500) NULL', 'land_north');
    await addColumnIfMissing('properties', 'land_east', 'VARCHAR(500) NULL', 'land_south');
    await addColumnIfMissing('properties', 'land_west', 'VARCHAR(500) NULL', 'land_east');

    await addColumnIfMissing('apartments', 'property_id', 'INT NULL', 'id');
    await addColumnIfMissing('apartments', 'total_flats', 'INT DEFAULT 0', 'name');
    await addColumnIfMissing('apartments', 'numbering_pattern', 'VARCHAR(100) NULL', 'total_flats');
    await addColumnIfMissing('apartments', 'parking_slots', 'INT DEFAULT 0', 'numbering_pattern');
    await addColumnIfMissing('apartments', 'electricity_details', 'VARCHAR(200) NULL', 'parking_slots');
    await addColumnIfMissing('apartments', 'transformer_details', 'VARCHAR(200) NULL', 'electricity_details');
    await addColumnIfMissing('apartments', 'water_connection_details', 'TEXT NULL', 'transformer_details');
    await addColumnIfMissing('apartments', 'floor_north', 'VARCHAR(500) NULL', 'transformer_details');
    await addColumnIfMissing('apartments', 'floor_south', 'VARCHAR(500) NULL', 'floor_north');
    await addColumnIfMissing('apartments', 'floor_east', 'VARCHAR(500) NULL', 'floor_south');
    await addColumnIfMissing('apartments', 'floor_west', 'VARCHAR(500) NULL', 'floor_east');

    await addColumnIfMissing('flats', 'gst_percent', 'DECIMAL(5,2) NOT NULL DEFAULT 0', 'total_amount');

    await addColumnIfMissing('infrastructure_details', 'extra_parking_allotment', 'BOOLEAN DEFAULT FALSE', 'parking_slot_no');
    await addColumnIfMissing('infrastructure_details', 'extra_parking_slot_no', 'VARCHAR(100) NULL', 'extra_parking_allotment');
    await addColumnIfMissing('infrastructure_details', 'extra_parking_charge', 'DECIMAL(15,2) DEFAULT 0', 'extra_parking_slot_no');

    console.log('Database updated successfully');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    process.exit(0);
  }
}
updateDB();
