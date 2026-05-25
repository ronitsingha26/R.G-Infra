-- Bulk Upload: Add detailed area columns to flats table
ALTER TABLE flats
  ADD COLUMN IF NOT EXISTS flat_type VARCHAR(50) AFTER flat_number,
  ADD COLUMN IF NOT EXISTS carpet_area DECIMAL(10,2) AFTER sbu_area,
  ADD COLUMN IF NOT EXISTS balcony_area DECIMAL(10,2) AFTER carpet_area,
  ADD COLUMN IF NOT EXISTS terrace_area DECIMAL(10,2) AFTER balcony_area,
  ADD COLUMN IF NOT EXISTS built_up_area DECIMAL(10,2) AFTER terrace_area,
  ADD COLUMN IF NOT EXISTS undivided_share DECIMAL(10,2) AFTER built_up_area;
