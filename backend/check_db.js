import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rginfra'
  });
  const [rows] = await connection.execute("SELECT c.id, c.name, f.total_amount FROM clients c LEFT JOIN flats f ON c.flat_id = f.id WHERE c.name = 'RONIT SINGHA'");
  console.log(rows);
  await connection.end();
}
run();
