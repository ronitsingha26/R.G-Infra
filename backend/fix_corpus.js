const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'routes', 'clients.js');
let content = fs.readFileSync(file, 'utf8');

// Remove i.corpus_fund, from SELECTs
content = content.replace(/i\.transformer_flat, i\.corpus_fund, i\.electricity_board_source/g, 'i.transformer_flat, i.electricity_board_source');

// Add corpus_fund to INSERT INTO clients
content = content.replace(
  'INSERT INTO clients (unique_client_id, name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO clients (unique_client_id, name, phone, email, address, pan_aadhaar, pan_number, aadhaar_number, purchase_date, flat_id, corpus_fund) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

// Add corpus_fund value to INSERT array
content = content.replace(
  /purchase_date \|\| null,\s*flat_id,\s*\]/g,
  'purchase_date || null,\n        flat_id,\n        corpus_fund || null,\n      ]'
);

// Remove corpus_fund from INSERT INTO infrastructure_details
content = content.replace(
  'transformer_apartment, transformer_flat, corpus_fund, electricity_board_source, water_connection_details',
  'transformer_apartment, transformer_flat, electricity_board_source, water_connection_details'
);
// Replace VALUES with one less ?
content = content.replace(
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
// Remove corpus_fund = VALUES(corpus_fund),
content = content.replace(/\s*corpus_fund = VALUES\(corpus_fund\),/g, '');
// Remove corpus_fund || 0, from values array
content = content.replace(/\s*corpus_fund \|\| 0,/g, '');
// Remove corpus_fund = ?, from UPDATE infrastructure_details
content = content.replace(/transformer_flat = \?, corpus_fund = \?, electricity_board_source = \?/g, 'transformer_flat = ?, electricity_board_source = ?');

// Add corpus_fund to UPDATE clients
content = content.replace(
  'UPDATE clients SET name=?, phone=?, email=?, address=?, pan_aadhaar=?, pan_number=?, aadhaar_number=?, purchase_date=? WHERE id=?',
  'UPDATE clients SET name=?, phone=?, email=?, address=?, pan_aadhaar=?, pan_number=?, aadhaar_number=?, purchase_date=?, corpus_fund=? WHERE id=?'
);

// Add corpus_fund value to UPDATE clients array
content = content.replace(
  /purchase_date \|\| null,\s*id\s*\]/g,
  'purchase_date || null,\n        corpus_fund || null,\n        id\n      ]'
);

fs.writeFileSync(file, content, 'utf8');

const dbConfig = require('./db.js'); // Assuming this exports the pool
console.log('File updated');
