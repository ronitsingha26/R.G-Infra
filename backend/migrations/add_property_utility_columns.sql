-- Move utility details to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS electricity_details VARCHAR(200) AFTER address,
  ADD COLUMN IF NOT EXISTS transformer_details VARCHAR(200) AFTER electricity_details,
  ADD COLUMN IF NOT EXISTS water_connection_details TEXT AFTER transformer_details;
