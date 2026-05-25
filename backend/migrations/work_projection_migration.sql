-- ============================================================
-- Work Projection Module — Migration
-- Creates work_projections table for tracking construction milestones
-- ============================================================

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

-- ============================================================
-- Work Projection Milestones (Master Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS work_projection_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  percentage DECIMAL(5,2) NOT NULL,
  milestone_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert defaults if table is empty
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
