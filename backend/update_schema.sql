-- ============================================================
-- R.G INFRA ERP Upgrade Migration
-- Run this once on an existing database before deploying code.
-- For a fresh database, use backend/schema.sql instead.
-- ============================================================

USE rg_infra_crm;

-- NOTE: MySQL does not support IF NOT EXISTS for ADD COLUMN/INDEX.
-- If you re-run this script, ignore duplicate column/index errors.

ALTER TABLE users
  MODIFY role ENUM('admin','staff','accountant') DEFAULT 'admin',
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN last_login_at DATETIME;

ALTER TABLE properties
  ADD COLUMN land_north VARCHAR(500) NULL AFTER address,
  ADD COLUMN land_south VARCHAR(500) NULL AFTER land_north,
  ADD COLUMN land_east VARCHAR(500) NULL AFTER land_south,
  ADD COLUMN land_west VARCHAR(500) NULL AFTER land_east;

CREATE TABLE IF NOT EXISTS towers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id  INT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  floor_count   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  UNIQUE(apartment_id, name),
  INDEX idx_towers_apartment (apartment_id)
);

ALTER TABLE flats
  ADD COLUMN tower_id INT NULL AFTER apartment_id,
  ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER total_amount,
  ADD COLUMN status ENUM('available','reserved','booked') DEFAULT 'available' AFTER is_available,
  ADD INDEX idx_flats_status (status),
  ADD INDEX idx_flats_apartment_status (apartment_id, status);

ALTER TABLE apartments
  ADD COLUMN floor_north VARCHAR(500) NULL AFTER transformer_details,
  ADD COLUMN floor_south VARCHAR(500) NULL AFTER floor_north,
  ADD COLUMN floor_east VARCHAR(500) NULL AFTER floor_south,
  ADD COLUMN floor_west VARCHAR(500) NULL AFTER floor_east;

ALTER TABLE apartments
  ADD COLUMN water_connection_details TEXT NULL AFTER transformer_details;

ALTER TABLE clients
  ADD COLUMN pan_aadhaar VARCHAR(50) NULL AFTER address,
  ADD INDEX idx_clients_flat (flat_id),
  ADD INDEX idx_clients_phone (phone),
  ADD INDEX idx_clients_email (email);

CREATE TABLE IF NOT EXISTS bookings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  booking_id      VARCHAR(50) NOT NULL UNIQUE,
  client_id       INT NOT NULL,
  apartment_id    INT NOT NULL,
  tower_id        INT,
  flat_id         INT NOT NULL,
  booking_date    DATE NOT NULL,
  flat_value      DECIMAL(15,2) NOT NULL DEFAULT 0,
  booking_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  booking_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  status          ENUM('active','cancelled','transferred') DEFAULT 'active',
  created_by      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  FOREIGN KEY (tower_id) REFERENCES towers(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bookings_client (client_id),
  INDEX idx_bookings_apartment (apartment_id),
  INDEX idx_bookings_flat (flat_id)
);

ALTER TABLE bookings
  ADD COLUMN booking_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER booking_amount;

ALTER TABLE infrastructure_details
  ADD COLUMN water_connection_details TEXT NULL AFTER electricity_board_source,
  ADD COLUMN extra_parking_allotment BOOLEAN DEFAULT FALSE AFTER parking_slot_no,
  ADD COLUMN extra_parking_slot_no VARCHAR(100) NULL AFTER extra_parking_allotment,
  ADD COLUMN extra_parking_charge DECIMAL(15,2) DEFAULT 0 AFTER extra_parking_slot_no,
  ADD UNIQUE INDEX uq_infra_flat (flat_id);

CREATE TABLE IF NOT EXISTS parking_allotments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id  INT NOT NULL,
  flat_id       INT,
  slot_number   VARCHAR(100) NOT NULL,
  status        ENUM('available','reserved','allotted') DEFAULT 'available',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  UNIQUE(apartment_id, slot_number)
);

CREATE TABLE IF NOT EXISTS transformers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id  INT NOT NULL,
  flat_id       INT,
  name          VARCHAR(200) NOT NULL,
  capacity      VARCHAR(100),
  location      VARCHAR(200),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS electricity_sources (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id  INT NOT NULL,
  provider      VARCHAR(200) NOT NULL,
  meter_prefix  VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_plans (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id   INT NOT NULL,
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  gst_percent    DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  UNIQUE(apartment_id, name)
);

CREATE TABLE IF NOT EXISTS payment_installments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  payment_plan_id  INT NOT NULL,
  stage_name       VARCHAR(200) NOT NULL,
  percentage       DECIMAL(5,2) NOT NULL,
  stage_order      INT NOT NULL DEFAULT 0,
  due_days_offset  INT DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE,
  UNIQUE(payment_plan_id, stage_order)
);

ALTER TABLE payment_stages
  ADD COLUMN apartment_id INT NULL,
  ADD INDEX idx_payment_stages_apartment (apartment_id);

ALTER TABLE payment_schedules
  ADD COLUMN booking_id INT NULL AFTER client_id,
  ADD COLUMN payment_plan_id INT NULL AFTER flat_id,
  ADD COLUMN gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER amount,
  ADD COLUMN paid_date DATE NULL AFTER due_date,
  ADD INDEX idx_schedules_client_status (client_id, status),
  ADD INDEX idx_schedules_due_date (due_date);

ALTER TABLE client_payments
  ADD COLUMN booking_id INT NULL AFTER client_id,
  ADD COLUMN payment_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER amount,
  ADD COLUMN gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER payment_percentage,
  ADD COLUMN receipt_no VARCHAR(100) NULL AFTER reference_no,
  ADD COLUMN receipt_file_url VARCHAR(500) NULL AFTER receipt_no,
  ADD COLUMN email_sent BOOLEAN DEFAULT FALSE AFTER receipt_file_url,
  ADD INDEX idx_client_payments_client_date (client_id, payment_date),
  ADD INDEX idx_client_payments_flat (flat_id);

ALTER TABLE dues
  ADD COLUMN booking_id INT NULL AFTER client_id,
  ADD COLUMN current_due DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER current_stage_due,
  ADD COLUMN current_due_date DATE NULL AFTER current_due,
  ADD COLUMN next_installment_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER next_stage_amount,
  ADD COLUMN next_due_date DATE NULL AFTER next_installment_amount,
  ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER next_due_date,
  ADD COLUMN gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER gst_percent,
  ADD COLUMN total_payable DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER gst_amount;

ALTER TABLE demand_letters
  ADD COLUMN booking_id INT NULL AFTER client_id,
  ADD COLUMN sent_date DATETIME NULL AFTER generated_date,
  ADD COLUMN sent_by INT NULL AFTER sent_date,
  ADD COLUMN delivery_status ENUM('draft','sent','failed','partial') DEFAULT 'draft' AFTER sent_by,
  ADD COLUMN payment_stage VARCHAR(200) NULL AFTER delivery_status,
  ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER due_amount,
  ADD INDEX idx_demand_client_date (client_id, generated_date);

CREATE TABLE IF NOT EXISTS invoices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  payment_id     INT NOT NULL,
  client_id      INT NOT NULL,
  booking_id     INT,
  flat_id        INT,
  invoice_no     VARCHAR(100) NOT NULL,
  file_name      VARCHAR(500) NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  amount         DECIMAL(15,2) NOT NULL,
  gst_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total    DECIMAL(15,2) NOT NULL,
  payment_date   DATE,
  payment_mode   VARCHAR(100),
  reference_no   VARCHAR(150),
  generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(payment_id, invoice_no),
  INDEX idx_invoices_client_date (client_id, generated_date)
);

ALTER TABLE communication_history
  MODIFY type ENUM('demand_letter','email','whatsapp','payment_receipt','invoice') NOT NULL,
  MODIFY status ENUM('sent','failed','initiated','pending','delivered','read') DEFAULT 'sent',
  ADD COLUMN invoice_id INT NULL AFTER demand_letter_id,
  ADD COLUMN provider_message_id VARCHAR(200) NULL AFTER error_message;

CREATE TABLE IF NOT EXISTS communication_logs (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  client_id             INT NOT NULL,
  booking_id            INT,
  demand_letter_id      INT,
  channel               ENUM('email','whatsapp','sms','system') NOT NULL,
  message_type          ENUM('demand_letter','payment_due','payment_receipt','reminder','general','invoice') NOT NULL,
  subject               VARCHAR(500),
  message               TEXT,
  recipient             VARCHAR(200),
  attachment_url        VARCHAR(500),
  delivery_status       ENUM('queued','sent','delivered','read','failed','initiated') DEFAULT 'queued',
  provider              VARCHAR(100),
  provider_message_id   VARCHAR(200),
  sent_by               INT,
  sent_at               DATETIME,
  error_message         TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (demand_letter_id) REFERENCES demand_letters(id) ON DELETE SET NULL,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    VARCHAR(100),
  old_values   JSON,
  new_values   JSON,
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(500),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        ENUM('info','success','warning','error') DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backup_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_name   VARCHAR(500) NOT NULL,
  file_url    VARCHAR(500),
  status      ENUM('success','failed','running') DEFAULT 'running',
  error_message TEXT,
  created_by  INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
