-- Split PAN and Aadhaar into separate columns on clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20) AFTER pan_aadhaar,
  ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20) AFTER pan_number;
