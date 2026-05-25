import 'dotenv/config';
import pool from './config/db.js';

async function test() {
  try {
    const [[{ totalFlatSales }]] = await pool.query('SELECT COALESCE(SUM(f.total_amount), 0) AS totalFlatSales FROM clients c JOIN flats f ON c.flat_id = f.id');
    console.log("totalFlatSales:", totalFlatSales);
    
    const [rows] = await pool.query(`
      SELECT 
        a.id as apartment_id, a.name as apartment_name,
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT f.id) as total_flats_sold,
        COALESCE(SUM(f.total_amount), 0) as total_sales,
        COALESCE(SUM(cp.amount), 0) as total_collected,
        (COALESCE(SUM(f.total_amount), 0) - COALESCE(SUM(cp.amount), 0)) as total_due
      FROM apartments a
      LEFT JOIN flats f ON f.apartment_id = a.id AND f.is_available = FALSE
      LEFT JOIN clients c ON c.flat_id = f.id
      LEFT JOIN client_payments cp ON cp.client_id = c.id
      GROUP BY a.id, a.name
      ORDER BY total_sales DESC
    `);
    console.log("Apartment sales:", rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
test();
