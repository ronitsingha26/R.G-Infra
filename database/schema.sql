-- ============================================================
-- R.G INFRA CRM — MySQL Schema
-- ============================================================
create database  rg_infra_crm;
use rg_infra_crm;



-- 1. USERS (Admin login)
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','staff','accountant') DEFAULT 'admin',
  is_active   BOOLEAN DEFAULT TRUE,
  last_login_at DATETIME,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
);

-- 2. PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL UNIQUE,
  address     TEXT,
  electricity_details  VARCHAR(200),
  transformer_details  VARCHAR(200),
  water_connection_details  TEXT,
  land_north  VARCHAR(500),
  land_south  VARCHAR(500),
  land_east   VARCHAR(500),
  land_west   VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. APARTMENTS
CREATE TABLE IF NOT EXISTS apartments (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  property_id               INT,
  name                      VARCHAR(200) NOT NULL,
  total_flats               INT,
  numbering_pattern         VARCHAR(50),
  parking_slots             INT,
  electricity_details       VARCHAR(200),
  transformer_details       VARCHAR(200),
  water_connection_details  TEXT,
  floor_north               VARCHAR(500),
  floor_south               VARCHAR(500),
  floor_east                VARCHAR(500),
  floor_west                VARCHAR(500),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  UNIQUE(property_id, name)
);

-- 4. TOWERS / BLOCKS
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

-- 5. FLATS
CREATE TABLE IF NOT EXISTS flats (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id   INT NOT NULL,
  tower_id       INT,
  flat_number    VARCHAR(50) NOT NULL,
  flat_type      VARCHAR(50),
  floor          VARCHAR(50),
  block          VARCHAR(50),
  sbu_area       DECIMAL(10,2),
  carpet_area    DECIMAL(10,2),
  balcony_area   DECIMAL(10,2),
  terrace_area   DECIMAL(10,2),
  built_up_area  DECIMAL(10,2),
  undivided_share DECIMAL(10,2),
  total_amount   DECIMAL(15,2),
  gst_percent    DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_available   BOOLEAN DEFAULT TRUE,
  status         ENUM('available','reserved','booked') DEFAULT 'available',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (tower_id) REFERENCES towers(id) ON DELETE SET NULL,
  UNIQUE(apartment_id, flat_number)
  ,INDEX idx_flats_status (status)
  ,INDEX idx_flats_apartment_status (apartment_id, status)
);

-- 6. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  unique_client_id  VARCHAR(50) UNIQUE NOT NULL,
  name              VARCHAR(200) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  address           TEXT,
  pan_aadhaar       VARCHAR(50),
  pan_number        VARCHAR(20),
  aadhaar_number    VARCHAR(20),
  purchase_date     DATE,
  flat_id           INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  INDEX idx_clients_flat (flat_id),
  INDEX idx_clients_phone (phone),
  INDEX idx_clients_email (email)
);

-- 7. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  booking_id         VARCHAR(50) NOT NULL UNIQUE,
  client_id          INT NOT NULL,
  apartment_id       INT NOT NULL,
  tower_id           INT,
  flat_id            INT NOT NULL,
  booking_date       DATE NOT NULL,
  flat_value         DECIMAL(15,2) NOT NULL DEFAULT 0,
  booking_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  booking_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  status             ENUM('active','cancelled','transferred') DEFAULT 'active',
  created_by         INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  FOREIGN KEY (tower_id) REFERENCES towers(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(flat_id, status),
  INDEX idx_bookings_client (client_id),
  INDEX idx_bookings_apartment (apartment_id),
  INDEX idx_bookings_flat (flat_id)
);

-- 8. INFRASTRUCTURE DETAILS
CREATE TABLE IF NOT EXISTS infrastructure_details (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  flat_id                  INT NOT NULL,
  parking_allotment        BOOLEAN DEFAULT FALSE,
  parking_slot_no          VARCHAR(100),
  extra_parking_allotment  BOOLEAN DEFAULT FALSE,
  extra_vehicle_type       VARCHAR(200) DEFAULT NULL,
  extra_parking_count      INT DEFAULT 1,
  extra_parking_slot_no    VARCHAR(500),
  extra_parking_charge     DECIMAL(15,2) DEFAULT 0,
  transformer_apartment    VARCHAR(200),
  transformer_flat         VARCHAR(200),
  corpus_fund              DECIMAL(15,2),
  electricity_board_source VARCHAR(200),
  water_connection_details TEXT,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
  UNIQUE(flat_id)
);

-- 9. PARKING, TRANSFORMER, AND UTILITY MASTER DATA
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
  UNIQUE(apartment_id, slot_number),
  INDEX idx_parking_status (status)
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
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  INDEX idx_transformers_apartment (apartment_id)
);

CREATE TABLE IF NOT EXISTS electricity_sources (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  apartment_id  INT NOT NULL,
  provider      VARCHAR(200) NOT NULL,
  meter_prefix  VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  INDEX idx_electricity_apartment (apartment_id)
);

-- 10. DEMAND LETTERS
CREATE TABLE IF NOT EXISTS demand_letters (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  client_id        INT NOT NULL,
  booking_id       INT,
  file_name        VARCHAR(500) NOT NULL,
  file_url         VARCHAR(500) NOT NULL,
  generated_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_date        DATETIME,
  sent_by          INT,
  delivery_status  ENUM('draft','sent','failed','partial') DEFAULT 'draft',
  payment_stage    VARCHAR(200),
  total_amount     DECIMAL(15,2),
  paid_amount      DECIMAL(15,2),
  due_amount       DECIMAL(15,2),
  gst_percent      DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount       DECIMAL(15,2),
  grand_total      DECIMAL(15,2),
  email_sent       BOOLEAN DEFAULT FALSE,
  whatsapp_sent    BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_demand_client_date (client_id, generated_date)
);

-- 10B. CLIENT PAYMENTS (Actual payment records)
CREATE TABLE IF NOT EXISTS client_payments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  client_id        INT NOT NULL,
  booking_id       INT,
  flat_id          INT,
  amount           DECIMAL(15,2) NOT NULL,
  payment_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_date     DATE,
  payment_mode     VARCHAR(50),
  reference_no     VARCHAR(100),
  receipt_no       VARCHAR(100),
  receipt_file_url VARCHAR(500),
  email_sent       BOOLEAN DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  INDEX idx_client_payments_client_date (client_id, payment_date),
  INDEX idx_client_payments_flat (flat_id)
);

-- 10C. INVOICES
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
  FOREIGN KEY (payment_id) REFERENCES client_payments(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(payment_id, invoice_no),
  INDEX idx_invoices_client_date (client_id, generated_date)
);

-- 10D. CONTACT SUBMISSIONS (Landing page enquiries)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  phone        VARCHAR(30),
  email        VARCHAR(150),
  project_type VARCHAR(100),
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_read_created (is_read, created_at),
  INDEX idx_contact_email (email),
  INDEX idx_contact_phone (phone)
);

-- 11. COMMUNICATION HISTORY (tracks every email, demand letter, whatsapp sent)
CREATE TABLE IF NOT EXISTS communication_history (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  client_id        INT NOT NULL,
  flat_id          INT,
  type             ENUM('demand_letter','email','whatsapp','payment_receipt','invoice') NOT NULL,
  channel          ENUM('email','whatsapp') NOT NULL DEFAULT 'email',
  subject          VARCHAR(500),
  message          TEXT,
  recipient_email  VARCHAR(150),
  recipient_phone  VARCHAR(20),
  demand_letter_id INT,
  invoice_id       INT,
  file_url         VARCHAR(500),
  status           ENUM('sent','failed','initiated','pending','delivered','read') DEFAULT 'sent',
  error_message    TEXT,
  provider_message_id VARCHAR(200),
  sent_on          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (demand_letter_id) REFERENCES demand_letters(id) ON DELETE SET NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

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
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_comm_logs_client (client_id, created_at),
  INDEX idx_comm_logs_channel_status (channel, delivery_status)
);

-- 12. APARTMENT-WISE PAYMENT PLANS
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
  UNIQUE(apartment_id, name),
  INDEX idx_payment_plans_apartment_active (apartment_id, is_active)
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
  UNIQUE(payment_plan_id, stage_order),
  INDEX idx_installments_plan_order (payment_plan_id, stage_order)
);

-- 13. PAYMENT STAGES (Global fallback milestone percentages)
CREATE TABLE IF NOT EXISTS payment_stages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  stage_name   VARCHAR(200) NOT NULL,
  percentage   DECIMAL(5,2) NOT NULL,
  stage_order  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  apartment_id  INT,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  INDEX idx_payment_stages_apartment (apartment_id)
);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'Booking Amount', 10.00, 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 1);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'Agreement Signing', 20.00, 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 2);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'Plinth Level', 15.00, 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 3);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'First Slab', 15.00, 4, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 4);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'Brickwork & Plaster', 20.00, 5, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 5);

INSERT INTO payment_stages (stage_name, percentage, stage_order, apartment_id)
SELECT 'Possession', 20.00, 6, NULL
WHERE NOT EXISTS (SELECT 1 FROM payment_stages WHERE apartment_id IS NULL AND stage_order = 6);

-- 14. PAYMENT SCHEDULES (Per-client stage-wise breakdown)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  client_id     INT NOT NULL,
  booking_id    INT,
  flat_id       INT,
  payment_plan_id INT,
  stage_id      INT,
  stage_name    VARCHAR(200) NOT NULL,
  percentage    DECIMAL(5,2) NOT NULL,
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  gst_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date      DATE,
  paid_date     DATE,
  status        ENUM('pending','partial','paid') DEFAULT 'pending',
  stage_order   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES payment_stages(id) ON DELETE SET NULL
  ,INDEX idx_schedules_client_status (client_id, status)
  ,INDEX idx_schedules_due_date (due_date)
);

-- 16. DUES (Computed pending dues per client)
CREATE TABLE IF NOT EXISTS dues (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  client_id             INT NOT NULL,
  booking_id            INT,
  flat_id               INT,
  total_flat_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_paid            DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_due             DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_stage_name    VARCHAR(200),
  current_stage_due     DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_due           DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_due_date      DATE,
  next_stage_name       VARCHAR(200),
  next_stage_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  next_installment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  next_due_date         DATE,
  gst_percent           DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount            DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_payable         DECIMAL(15,2) NOT NULL DEFAULT 0,
  combined_due          DECIMAL(15,2) NOT NULL DEFAULT 0,
  last_calculated       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  UNIQUE(client_id)
);

-- 17. REMINDER LOGS (Tracks sent due reminders, avoids duplicates)
CREATE TABLE IF NOT EXISTS reminder_logs (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  client_id           INT NOT NULL,
  flat_id             INT,
  schedule_id         INT,
  stage_name          VARCHAR(200),
  due_date            DATE,
  combined_due        DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_stage_due   DECIMAL(15,2) NOT NULL DEFAULT 0,
  next_stage_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  email_sent          BOOLEAN DEFAULT FALSE,
  email_status        ENUM('sent','failed','skipped') DEFAULT 'skipped',
  whatsapp_initiated  BOOLEAN DEFAULT FALSE,
  demand_letter_id    INT,
  trigger_type        ENUM('cron','manual') DEFAULT 'cron',
  next_due_date       DATE,
  error_message       TEXT,
  sent_on             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (schedule_id) REFERENCES payment_schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (demand_letter_id) REFERENCES demand_letters(id) ON DELETE SET NULL
);

-- 18. AUDIT, NOTIFICATIONS, AND BACKUP TRACKING
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_user_date (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        ENUM('info','success','warning','error') DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read)
);

CREATE TABLE IF NOT EXISTS backup_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_name     VARCHAR(500) NOT NULL,
  file_url      VARCHAR(500),
  status        ENUM('success','failed','running') DEFAULT 'running',
  error_message TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 19. WORK PROJECTIONS
CREATE TABLE IF NOT EXISTS work_projections (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  client_id             INT NOT NULL,
  flat_id               INT,
  milestone_name        VARCHAR(200) NOT NULL,
  milestone_percentage  DECIMAL(5,2) NOT NULL,
  milestone_order       INT NOT NULL DEFAULT 0,
  completion_date       DATE,
  notes                 TEXT,
  proof_image           VARCHAR(500),
  status                ENUM('pending','completed') DEFAULT 'pending',
  created_by            INT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(client_id, milestone_name),
  INDEX idx_wp_client_status (client_id, status),
  INDEX idx_wp_milestone (milestone_name)
);

-- 20. WORK PROJECTION MILESTONES (Master Data)
CREATE TABLE IF NOT EXISTS work_projection_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  percentage DECIMAL(5,2) NOT NULL,
  milestone_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO work_projection_milestones (name, percentage, milestone_order) VALUES
('Booking', 10, 1),
('Raft Foundation Complete', 10, 2),
('Ground Floor Slab', 5, 3),
('1st Floor Slab', 5, 4),
('2nd Floor Slab', 5, 5),
('3rd Floor Slab', 5, 6),
('4th Floor Slab', 5, 7),
('5th Floor Slab', 5, 8),
('6th Floor Slab', 5, 9),
('7th Floor Slab', 5, 10),
('8th Floor Slab', 5, 11),
('9th Floor Slab', 5, 12),
('10th Floor Slab', 5, 13),
('Roof Slab', 5, 14),
('Brick Work & Plaster', 5, 15),
('Flooring', 10, 16),
('Handover', 5, 17);

-- ============================================================
-- Default Admin User (Password: admin123)
-- ============================================================
INSERT IGNORE INTO users (user_id, name, email, password, role)
VALUES ('admin', 'Admin', 'admin@rginfra.com', '$2a$10$OwoZPeH7gpR0IoDSufyZZuQGlTSd3th3JVw9dBsw9JvW4mCiYd/ju', 'admin');
