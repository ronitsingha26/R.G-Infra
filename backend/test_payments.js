import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rginfra_crm'
  });
  try {
    const [rows] = await connection.query(`
      SELECT pay.id, pay.project_id, pay.client_id, pay.amount, pay.payment_date, pay.payment_mode, pay.reference_no, pay.email_sent,
             p.name AS project_name, c.company_name AS client_name, c.email AS client_email, pay.created_at
      FROM payments pay
      LEFT JOIN projects p ON p.id = pay.project_id
      LEFT JOIN clients c ON c.id = pay.client_id
      
      UNION ALL
      
      SELECT cp.id, NULL as project_id, cp.client_id, cp.amount, cp.payment_date, cp.payment_mode, cp.reference_no, 0 as email_sent,
             a.name AS project_name, c.name AS client_name, c.email AS client_email, cp.created_at
      FROM client_payments cp
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN flats f ON f.id = cp.flat_id
      LEFT JOIN apartments a ON a.id = f.apartment_id
      
      ORDER BY payment_date DESC, created_at DESC
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  await connection.end();
}
run();
