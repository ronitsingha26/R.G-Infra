import pool from './config/db.js';

async function testInsert() {
  try {
    const [result] = await pool.query(
      `INSERT INTO infrastructure_details 
      (flat_id, parking_allotment, parking_slot_no, extra_parking_allotment, extra_vehicle_type, extra_parking_count, extra_parking_slot_no, extra_parking_charge, transformer_apartment, transformer_flat, electricity_board_source, water_connection_details) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        electricity_board_source = VALUES(electricity_board_source),
        water_connection_details = VALUES(water_connection_details)`,
      [
        1, false, null, false, null, null, null, 0, null, null, null, null
      ]
    );
    console.log('Success:', result);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}
testInsert();
