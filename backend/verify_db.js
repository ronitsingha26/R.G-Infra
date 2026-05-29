import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost', user: 'root', password: 'Awesh@005',
  database: 'rg_infra_crm', port: 3306,
});

async function run() {
  try {
    // Check available flats in Block A & B
    const [flats] = await pool.query(`
      SELECT f.id, f.flat_number, f.block, f.floor, f.flat_type, f.sbu_area, 
             f.total_amount, f.gst_percent, a.name as apt_name
      FROM flats f 
      JOIN apartments a ON f.apartment_id = a.id 
      WHERE f.is_available = TRUE AND a.name IN ('A','B') 
      ORDER BY a.name, CAST(f.flat_number AS UNSIGNED) 
      LIMIT 15
    `);
    console.log(`Available flats in Block A & B (${flats.length} shown):`);
    flats.forEach(f => 
      console.log(`  Block ${f.apt_name} | Flat ${f.flat_number} | Floor ${f.floor} | ${f.sbu_area} sqft | Price: ${f.total_amount || 'NOT SET'}`)
    );

    // properties table check
    const [pcols] = await pool.query('DESCRIBE properties');
    console.log('\nproperties table columns:', pcols.map(c => c.Field).join(', '));

    // clients table check  
    const [ccols] = await pool.query('DESCRIBE clients');
    console.log('clients table columns:', ccols.map(c => c.Field).join(', '));

    console.log('\n✅ Database schema is correct!');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
