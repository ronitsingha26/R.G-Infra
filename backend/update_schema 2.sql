CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: we use IGNORE for ADD COLUMN to not fail if it already exists, but mysql doesn't support IF NOT EXISTS for columns in ALTER TABLE before 8.0 natively without a stored procedure, so we'll just run it. If it fails we'll ignore.
