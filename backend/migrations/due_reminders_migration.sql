CREATE TABLE IF NOT EXISTS due_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  flat_id INT,
  schedule_id INT,
  work_projection_id INT,
  client_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  flat_unit VARCHAR(100),
  apartment_name VARCHAR(200),
  projection_stage VARCHAR(200),
  payment_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_payable DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status ENUM('upcoming','overdue','paid') DEFAULT 'upcoming',
  email_status ENUM('not_sent','sent','failed','skipped') DEFAULT 'not_sent',
  last_sent_at DATETIME,
  reminder_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (schedule_id) REFERENCES payment_schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (work_projection_id) REFERENCES work_projections(id) ON DELETE SET NULL,
  UNIQUE KEY uq_due_reminder_schedule (schedule_id),
  INDEX idx_due_reminders_status_date (status, due_date),
  INDEX idx_due_reminders_client (client_id),
  INDEX idx_due_reminders_email_status (email_status)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(300) NOT NULL,
  html_body MEDIUMTEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  days_offset INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scheduled_reminders_offset (days_offset)
);

INSERT IGNORE INTO scheduled_reminders (name, days_offset) VALUES
('7 days before due', -7),
('3 days before due', -3),
('1 day before due', -1),
('On due date', 0),
('After overdue', 1);

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'due_reminders'
    AND COLUMN_NAME = 'total_paid'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE due_reminders ADD COLUMN total_paid DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total_amount',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'due_reminders'
    AND COLUMN_NAME = 'gst_percent'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE due_reminders ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER due_amount',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'due_reminders'
    AND COLUMN_NAME = 'gst_amount'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE due_reminders ADD COLUMN gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER gst_percent',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'due_reminders'
    AND COLUMN_NAME = 'total_payable'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE due_reminders ADD COLUMN total_payable DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER gst_amount',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
