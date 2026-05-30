import pool from './config/db.js';

async function testInsert() {
  try {
    const [result] = await pool.query(
      'INSERT INTO clients (unique_client_id, name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id, corpus_fund) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['RGI-TEST', 'Test', null, null, null, null, null, null, null, 1, null]
    );
    console.log('Success:', result);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}
testInsert();
