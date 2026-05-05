-- ============================================================
-- Bajaj Developer Construction — MySQL Schema
-- Run this in Hostinger phpMyAdmin to create all tables
-- Database: u822871577_bajaj_dev
-- ============================================================

-- NOTE: On Hostinger, the database is already created via the panel.
-- Do NOT run the CREATE/USE DATABASE lines below on Hostinger.
-- Just select your database in phpMyAdmin and run from line 14 onward.

-- CREATE DATABASE IF NOT EXISTS u822871577_bajaj_dev
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE u822871577_bajaj_dev;

-- 1. USERS (Admin login)
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(50)  DEFAULT 'admin',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  company_name      VARCHAR(200) NOT NULL,
  contact_person    VARCHAR(100),
  phone             VARCHAR(20),
  email             VARCHAR(150),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  gstin             VARCHAR(20),
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  client_id      INT,
  location       VARCHAR(300),
  description    TEXT,
  total_amount   DECIMAL(15,2) DEFAULT 0,
  status         ENUM('Planning','Ongoing','Delayed','Completed') DEFAULT 'Planning',
  progress       INT DEFAULT 0,
  start_date     DATE,
  deadline       DATE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- 4. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_id     INT,
  client_id      INT,
  amount         DECIMAL(15,2) NOT NULL,
  payment_date   DATE,
  payment_mode   VARCHAR(50),
  reference_no   VARCHAR(100),
  notes          TEXT,
  email_sent     TINYINT(1) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- 5. CONTACT SUBMISSIONS (from landing page enquiry form)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(150),
  project_type   VARCHAR(100),
  message        TEXT,
  is_read        TINYINT(1) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
