import pool from './config/db.js';

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_projection_milestones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        percentage DECIMAL(5,2) NOT NULL,
        milestone_order INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const milestones = [
      ['Booking', 10, 1],
      ['Raft Foundation Complete', 10, 2],
      ['Ground Floor Slab', 5, 3],
      ['1st Floor Slab', 5, 4],
      ['2nd Floor Slab', 5, 5],
      ['3rd Floor Slab', 5, 6],
      ['4th Floor Slab', 5, 7],
      ['5th Floor Slab', 5, 8],
      ['6th Floor Slab', 5, 9],
      ['7th Floor Slab', 5, 10],
      ['8th Floor Slab', 5, 11],
      ['9th Floor Slab', 5, 12],
      ['10th Floor Slab', 5, 13],
      ['Roof Slab', 5, 14],
      ['Brick Work & Plaster', 5, 15],
      ['Flooring', 10, 16],
      ['Handover', 5, 17]
    ];

    for (const [name, pct, order] of milestones) {
      await pool.query('INSERT IGNORE INTO work_projection_milestones (name, percentage, milestone_order) VALUES (?, ?, ?)', [name, pct, order]);
    }

    console.log("Migration successful");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
