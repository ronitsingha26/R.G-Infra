-- ============================================================
-- R.G INFRA CRM — Dummy Data Seed Script
-- 2 Apartments, 12 Flats, 10 Clients, Payment Stages, Schedules, Payments, Dues
-- ============================================================
USE rg_infra_crm;

-- ─── 1. PROPERTIES (1 Property) ──────────────────────────────
INSERT IGNORE INTO properties (id, name, address) VALUES 
(1, 'RG Residency Group', 'Salt Lake Sector V, Kolkata');

-- ─── 2. APARTMENTS (2 Projects) ──────────────────────────────
INSERT IGNORE INTO apartments (id, property_id, name, total_flats, numbering_pattern, parking_slots, electricity_details, transformer_details) VALUES 
(1, 1, 'RG Solitaire Tower', 50, '101', 40, 'WBSEDCL', '500kVA'),
(2, 1, 'RG Pearl Residency', 60, 'P-101', 50, 'CESC', '1000kVA');

-- ─── 3. FLATS (6 per apartment = 12 total) ───────────────────
-- RG Solitaire Tower
INSERT IGNORE INTO flats (id, apartment_id, flat_number, floor, block, sbu_area, total_amount, is_available) VALUES 
(1,  1, '101A', '1st',  'A', 1250.00, 7500000.00,  FALSE),
(2,  1, '102B', '1st',  'B', 1300.00, 7800000.00,  FALSE),
(3,  1, '201A', '2nd',  'A', 1400.00, 8400000.00,  FALSE),
(4,  1, '202B', '2nd',  'B', 1100.00, 6600000.00,  FALSE),
(5,  1, '301A', '3rd',  'A', 1500.00, 9000000.00,  FALSE),
(6,  1, '302B', '3rd',  'B', 1350.00, 8100000.00,  TRUE);

-- RG Pearl Residency
INSERT IGNORE INTO flats (id, apartment_id, flat_number, floor, block, sbu_area, total_amount, is_available) VALUES 
(7,  2, 'P-101', '1st',  'Tower 1', 1600.00, 9600000.00,  FALSE),
(8,  2, 'P-102', '1st',  'Tower 1', 1200.00, 7200000.00,  FALSE),
(9,  2, 'P-201', '2nd',  'Tower 2', 1750.00, 10500000.00, FALSE),
(10, 2, 'P-202', '2nd',  'Tower 2', 1450.00, 8700000.00,  FALSE),
(11, 2, 'P-301', '3rd',  'Tower 1', 2000.00, 12000000.00, FALSE),
(12, 2, 'P-302', '3rd',  'Tower 2', 1550.00, 9300000.00,  TRUE);

-- ─── 4. CLIENTS (10 clients) ─────────────────────────────────
INSERT IGNORE INTO clients (id, unique_client_id, name, phone, email, address, purchase_date, flat_id) VALUES 
(1,  'RGI-1001', 'Rahul Sharma',     '9876543210', 'rahul.sharma@gmail.com',    'Sector 15, Noida',            '2025-01-10', 1),
(2,  'RGI-1002', 'Priya Singh',      '9876543211', 'priya.singh@gmail.com',     'DLF Phase 3, Gurgaon',        '2025-01-25', 2),
(3,  'RGI-1003', 'Amitabh Verma',    '9876543212', 'amitabh.verma@gmail.com',   'Vasant Kunj, New Delhi',      '2025-02-05', 3),
(4,  'RGI-1004', 'Neha Gupta',       '9876543213', 'neha.gupta@gmail.com',      'HSR Layout, Bangalore',       '2025-02-20', 4),
(5,  'RGI-1005', 'Vikram Desai',     '9876543214', 'vikram.desai@gmail.com',    'Andheri West, Mumbai',         '2025-03-01', 5),
(6,  'RGI-1006', 'Sunita Agarwal',   '9876543215', 'sunita.agarwal@gmail.com',  'Civil Lines, Jaipur',          '2025-03-10', 7),
(7,  'RGI-1007', 'Rajesh Patel',     '9876543216', 'rajesh.patel@gmail.com',    'Bodakdev, Ahmedabad',          '2025-03-18', 8),
(8,  'RGI-1008', 'Kavita Mehta',     '9876543217', 'kavita.mehta@gmail.com',    'Koramangala, Bangalore',       '2025-04-01', 9),
(9,  'RGI-1009', 'Sanjay Tiwari',    '9876543218', 'sanjay.tiwari@gmail.com',   'Gomti Nagar, Lucknow',         '2025-04-15', 10),
(10, 'RGI-1010', 'Deepika Reddy',    '9876543219', 'deepika.reddy@gmail.com',   'Jubilee Hills, Hyderabad',     '2025-04-25', 11);

-- ─── 5. INFRASTRUCTURE DETAILS ───────────────────────────────
INSERT IGNORE INTO infrastructure_details (flat_id, parking_allotment, parking_slot_no, transformer_apartment, transformer_flat, corpus_fund, electricity_board_source) VALUES 
(1,  TRUE,  'P-01',  'Solitaire Main',   'Internal',  50000.00,  'State Board'),
(2,  TRUE,  'P-02',  'Solitaire Main',   'Internal',  50000.00,  'State Board'),
(3,  TRUE,  'P-05',  'Solitaire Main',   'Internal',  55000.00,  'State Board'),
(4,  FALSE, NULL,    'Solitaire Main',   'Internal',  45000.00,  'State Board'),
(5,  TRUE,  'P-08',  'Solitaire Main',   'Internal',  60000.00,  'State Board'),
(7,  TRUE,  'P-101', 'Pearl Tower 1',    'DG Backup', 65000.00,  'BSES Rajdhani'),
(8,  FALSE, NULL,    'Pearl Tower 1',    'DG Backup', 55000.00,  'BSES Rajdhani'),
(9,  TRUE,  'P-201', 'Pearl Tower 2',    'DG Backup', 70000.00,  'BSES Yamuna'),
(10, TRUE,  'P-202', 'Pearl Tower 2',    'DG Backup', 60000.00,  'BSES Yamuna'),
(11, TRUE,  'P-301', 'Pearl Tower 1',    'DG Backup', 80000.00,  'BSES Rajdhani');

-- ─── 6. PAYMENT STAGES ──────────────────────────────────────
INSERT IGNORE INTO payment_stages (id, stage_name, percentage, stage_order) VALUES 
(1, 'Booking Amount',      10.00, 1),
(2, 'Agreement Signing',   20.00, 2),
(3, 'Plinth Level',        15.00, 3),
(4, 'First Slab',          15.00, 4),
(5, 'Brickwork & Plaster', 20.00, 5),
(6, 'Possession',          20.00, 6);

-- ─── 6. PAYMENT SCHEDULES ───────────────────────────────────
-- Client 1: Rahul Sharma — Flat 101A (75L) — Paid Booking + Agreement + Partial Plinth
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(1,  1, 1, 1, 'Booking Amount',    10.00, 750000.00,  750000.00,  0.00,      '2025-01-10', 'paid',    1),
(2,  1, 1, 2, 'Agreement Signing', 20.00, 1500000.00, 1500000.00, 0.00,      '2025-02-10', 'paid',    2),
(3,  1, 1, 3, 'Plinth Level',      15.00, 1125000.00, 500000.00,  625000.00, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  'partial', 3),
(4,  1, 1, 4, 'First Slab',        15.00, 1125000.00, 0.00,       1125000.00, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'pending', 4);

-- Client 2: Priya Singh — Flat 102B (78L) — Paid Booking only
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(5,  2, 2, 1, 'Booking Amount',    10.00, 780000.00,  780000.00, 0.00,       '2025-01-25', 'paid',    1),
(6,  2, 2, 2, 'Agreement Signing', 20.00, 1560000.00, 0.00,      1560000.00, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'pending', 2);

-- Client 3: Amitabh Verma — Flat 201A (84L) — Paid through Plinth
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(7,  3, 3, 1, 'Booking Amount',    10.00, 840000.00,  840000.00, 0.00, '2025-02-05', 'paid', 1),
(8,  3, 3, 2, 'Agreement Signing', 20.00, 1680000.00, 1680000.00,0.00, '2025-03-05', 'paid', 2),
(9,  3, 3, 3, 'Plinth Level',      15.00, 1260000.00, 1260000.00,0.00, '2025-05-05', 'paid', 3),
(10, 3, 3, 4, 'First Slab',        15.00, 1260000.00, 0.00,      1260000.00, '2025-08-05', 'pending', 4);

-- Client 4: Neha Gupta — Flat 202B (66L) — Paid Booking
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(11, 4, 4, 1, 'Booking Amount',    10.00, 660000.00,  660000.00, 0.00,       '2025-02-20', 'paid',    1),
(12, 4, 4, 2, 'Agreement Signing', 20.00, 1320000.00, 0.00,      1320000.00, '2025-03-20', 'pending', 2);

-- Client 5: Vikram Desai — Flat 301A (90L) — Paid Booking + Partial Agreement
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(13, 5, 5, 1, 'Booking Amount',    10.00, 900000.00,  900000.00,  0.00,      '2025-03-01', 'paid',    1),
(14, 5, 5, 2, 'Agreement Signing', 20.00, 1800000.00, 1000000.00, 800000.00, '2025-04-01', 'partial', 2);

-- Client 6: Sunita Agarwal — Flat P-101 (96L) — Paid Booking + Agreement + Plinth
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(15, 6, 7, 1, 'Booking Amount',    10.00, 960000.00,  960000.00,  0.00, '2025-03-10', 'paid', 1),
(16, 6, 7, 2, 'Agreement Signing', 20.00, 1920000.00, 1920000.00, 0.00, '2025-04-10', 'paid', 2),
(17, 6, 7, 3, 'Plinth Level',      15.00, 1440000.00, 1440000.00, 0.00, '2025-06-10', 'paid', 3),
(18, 6, 7, 4, 'First Slab',        15.00, 1440000.00, 0.00,       1440000.00, '2025-09-10', 'pending', 4);

-- Client 7: Rajesh Patel — Flat P-102 (72L) — Paid Booking only
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(19, 7, 8, 1, 'Booking Amount',    10.00, 720000.00,  720000.00, 0.00,       '2025-03-18', 'paid',    1),
(20, 7, 8, 2, 'Agreement Signing', 20.00, 1440000.00, 0.00,      1440000.00, '2025-04-18', 'pending', 2);

-- Client 8: Kavita Mehta — Flat P-201 (1.05Cr) — Paid Booking + Agreement
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(21, 8, 9, 1, 'Booking Amount',    10.00, 1050000.00, 1050000.00, 0.00, '2025-04-01', 'paid', 1),
(22, 8, 9, 2, 'Agreement Signing', 20.00, 2100000.00, 2100000.00, 0.00, '2025-05-01', 'paid', 2),
(23, 8, 9, 3, 'Plinth Level',      15.00, 1575000.00, 0.00,       1575000.00, '2025-07-01', 'pending', 3);

-- Client 9: Sanjay Tiwari — Flat P-202 (87L) — Paid Booking
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(24, 9, 10, 1, 'Booking Amount',    10.00, 870000.00,  870000.00, 0.00,       '2025-04-15', 'paid',    1),
(25, 9, 10, 2, 'Agreement Signing', 20.00, 1740000.00, 0.00,      1740000.00, '2025-05-15', 'pending', 2);

-- Client 10: Deepika Reddy — Flat P-301 (1.2Cr) — Paid Booking + Agreement + Plinth + Partial Slab
INSERT IGNORE INTO payment_schedules (id, client_id, flat_id, stage_id, stage_name, percentage, amount, paid_amount, due_amount, due_date, status, stage_order) VALUES
(26, 10, 11, 1, 'Booking Amount',      10.00, 1200000.00, 1200000.00, 0.00, '2025-04-25', 'paid', 1),
(27, 10, 11, 2, 'Agreement Signing',   20.00, 2400000.00, 2400000.00, 0.00, '2025-05-25', 'paid', 2),
(28, 10, 11, 3, 'Plinth Level',        15.00, 1800000.00, 1800000.00, 0.00, '2025-07-25', 'paid', 3),
(29, 10, 11, 4, 'First Slab',          15.00, 1800000.00, 800000.00,  1000000.00, '2025-10-25', 'partial', 4);

-- ─── 7. CLIENT PAYMENTS ─────────────────────────────────────
INSERT IGNORE INTO client_payments (client_id, flat_id, amount, payment_date, payment_mode, reference_no, notes) VALUES 
-- Rahul Sharma
(1, 1,  750000.00,  '2025-01-10', 'Bank Transfer', 'NEFT-0001', 'Booking Amount'),
(1, 1,  1500000.00, '2025-02-08', 'Cheque',        'CHQ-9901',  'Agreement Signing'),
(1, 1,  500000.00,  '2025-05-05', 'UPI',           'UPI-3301',  'Partial Plinth'),
-- Priya Singh
(2, 2,  780000.00,  '2025-01-25', 'Bank Transfer', 'RTGS-0002', 'Booking Amount'),
-- Amitabh Verma
(3, 3,  840000.00,  '2025-02-05', 'Bank Transfer', 'NEFT-0003', 'Booking Amount'),
(3, 3,  1680000.00, '2025-03-02', 'Cheque',        'CHQ-1102',  'Agreement Signing'),
(3, 3,  1260000.00, '2025-05-01', 'Bank Transfer', 'NEFT-0004', 'Plinth Level'),
-- Neha Gupta
(4, 4,  660000.00,  '2025-02-20', 'UPI',           'UPI-4401',  'Booking Amount'),
-- Vikram Desai
(5, 5,  900000.00,  '2025-03-01', 'Bank Transfer', 'NEFT-0005', 'Booking Amount'),
(5, 5,  1000000.00, '2025-03-28', 'Cheque',        'CHQ-5501',  'Partial Agreement'),
-- Sunita Agarwal
(6, 7,  960000.00,  '2025-03-10', 'Bank Transfer', 'RTGS-0006', 'Booking Amount'),
(6, 7,  1920000.00, '2025-04-08', 'Bank Transfer', 'RTGS-0007', 'Agreement Signing'),
(6, 7,  1440000.00, '2025-06-05', 'Cheque',        'CHQ-6601',  'Plinth Level'),
-- Rajesh Patel
(7, 8,  720000.00,  '2025-03-18', 'UPI',           'UPI-7701',  'Booking Amount'),
-- Kavita Mehta
(8, 9,  1050000.00, '2025-04-01', 'Bank Transfer', 'NEFT-0008', 'Booking Amount'),
(8, 9,  2100000.00, '2025-04-28', 'Bank Transfer', 'RTGS-0009', 'Agreement Signing'),
-- Sanjay Tiwari
(9, 10, 870000.00,  '2025-04-15', 'Cheque',        'CHQ-9901',  'Booking Amount'),
-- Deepika Reddy
(10, 11, 1200000.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Bank Transfer', 'RTGS-0010', 'Booking Amount'),
(10, 11, 2400000.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'Bank Transfer', 'RTGS-0011', 'Agreement Signing'),
(10, 11, 1800000.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY),  'Cheque',        'CHQ-1001',  'Plinth Level'),
(10, 11, 800000.00,  CURDATE(),                         'UPI',           'UPI-1002',  'Partial First Slab');

-- ─── 8. DUES ────────────────────────────────────────────────
INSERT IGNORE INTO dues (
	client_id, flat_id, total_flat_amount, total_paid, total_due,
	current_stage_name, current_stage_due, current_due, current_due_date,
	next_stage_name, next_stage_amount, next_installment_amount, next_due_date,
	combined_due
) VALUES 
(1,  1,  7500000.00,  2750000.00,  4750000.00,  'Plinth Level',      625000.00,  625000.00,  DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'First Slab',          1125000.00, 1125000.00, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 1750000.00),
(2,  2,  7800000.00,  780000.00,   7020000.00,  'Agreement Signing', 1560000.00, 1560000.00, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Plinth Level',        1170000.00, 1170000.00, NULL,         2730000.00),
(3,  3,  8400000.00,  3780000.00,  4620000.00,  'First Slab',        1260000.00, 1260000.00, '2025-08-05', 'Brickwork & Plaster', 1680000.00, 1680000.00, NULL,         2940000.00),
(4,  4,  6600000.00,  660000.00,   5940000.00,  'Agreement Signing', 1320000.00, 1320000.00, '2025-03-20', 'Plinth Level',        990000.00,  990000.00,  NULL,         2310000.00),
(5,  5,  9000000.00,  1900000.00,  7100000.00,  'Agreement Signing', 800000.00,  800000.00,  '2025-04-01', 'Plinth Level',        1350000.00, 1350000.00, NULL,         2150000.00),
(6,  7,  9600000.00,  4320000.00,  5280000.00,  'First Slab',        1440000.00, 1440000.00, '2025-09-10', 'Brickwork & Plaster', 1920000.00, 1920000.00, NULL,         3360000.00),
(7,  8,  7200000.00,  720000.00,   6480000.00,  'Agreement Signing', 1440000.00, 1440000.00, '2025-04-18', 'Plinth Level',        1080000.00, 1080000.00, NULL,         2520000.00),
(8,  9,  10500000.00, 3150000.00,  7350000.00,  'Plinth Level',      1575000.00, 1575000.00, '2025-07-01', 'First Slab',          1575000.00, 1575000.00, NULL,         3150000.00),
(9,  10, 8700000.00,  870000.00,   7830000.00,  'Agreement Signing', 1740000.00, 1740000.00, '2025-05-15', 'Plinth Level',        1305000.00, 1305000.00, NULL,         3045000.00),
(10, 11, 12000000.00, 6200000.00,  5800000.00,  'First Slab',        1000000.00, 1000000.00, '2025-10-25', 'Brickwork & Plaster', 2400000.00, 2400000.00, NULL,         3400000.00);

-- ─── 9. REMINDER LOGS (Recent emails for notifications) ─────────
INSERT IGNORE INTO reminder_logs
	(id, client_id, flat_id, schedule_id, stage_name, due_date, combined_due, current_stage_due, next_stage_amount, email_sent, email_status, whatsapp_initiated, trigger_type, next_due_date, sent_on)
VALUES
(1, 1, 1, 3, 'Plinth Level',      DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1750000.00,  625000.00, 1125000.00, 1, 'sent', 0, 'manual', DATE_ADD(CURDATE(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 2, 2, 6, 'Agreement Signing', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2730000.00, 1560000.00, 1170000.00, 1, 'sent', 0, 'manual', NULL,                        DATE_SUB(NOW(), INTERVAL 1 HOUR));
