-- ==========================================
-- RESET & SEED LẠI shipping_zones / shipping_zone_rules
-- Cửa hàng gốc: Trà Vinh (Yến Nhi Tech)
--
-- Logic:
--   - Trà Vinh (84)                   → FREE SHIP (0đ)
--   - Tỉnh lân cận (Vĩnh Long, Bến Tre,
--     Sóc Trăng, Cần Thơ, Tiền Giang) → 70.000đ
--   - Miền Tây xa hơn (An Giang, Hậu
--     Giang, Đồng Tháp, Long An, Bạc
--     Liêu, Kiên Giang, Cà Mau)       → 100.000đ
--   - Đông Nam Bộ (TP.HCM, Bình Dương,
--     Đồng Nai, BR-VT, Tây Ninh, BP)  → 120.000đ
--   - Tây Nguyên                       → 150.000đ
--   - Miền Trung                       → 180.000đ
--   - Miền Bắc                         → 220.000đ
-- ==========================================

-- 1) Xóa sạch zones cũ — rules tự cascade theo FK shipping_zone_rules.zone_id
DELETE FROM shipping_zone_rules;
DELETE FROM shipping_zones;

-- Reset AUTO_INCREMENT để zone_id bắt đầu lại từ 1 (cho dễ nhìn admin)
ALTER TABLE shipping_zones AUTO_INCREMENT = 1;
ALTER TABLE shipping_zone_rules AUTO_INCREMENT = 1;

-- ============= ZONES =============
INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status) VALUES
('TRA_VINH_FREE',       'Trà Vinh — Miễn phí ship',  'province', 100, 'Toàn bộ Trà Vinh: TP Trà Vinh + các huyện Càng Long, Tiểu Cần, Cầu Kè, Châu Thành, Cầu Ngang, Trà Cú, Duyên Hải', 'active'),
('LAN_CAN_70K',         'Tỉnh lân cận — 70.000đ',     'province', 95,  'Vĩnh Long, Bến Tre, Sóc Trăng, Cần Thơ, Tiền Giang',                                                          'active'),
('MIEN_TAY_XA_100K',    'Miền Tây xa — 100.000đ',     'province', 90,  'An Giang, Hậu Giang, Đồng Tháp, Long An, Bạc Liêu, Kiên Giang, Cà Mau',                                       'active'),
('DONG_NAM_BO_120K',    'Đông Nam Bộ — 120.000đ',     'region',   80,  'TP.HCM, Bình Dương, Đồng Nai, Bà Rịa-Vũng Tàu, Tây Ninh, Bình Phước',                                          'active'),
('TAY_NGUYEN_150K',     'Tây Nguyên — 150.000đ',      'region',   70,  'Đắk Lắk, Đắk Nông, Gia Lai, Kon Tum, Lâm Đồng',                                                              'active'),
('MIEN_TRUNG_180K',     'Miền Trung — 180.000đ',      'region',   60,  'Từ Bình Thuận ra Thanh Hóa',                                                                                  'active'),
('MIEN_BAC_220K',       'Miền Bắc — 220.000đ',        'region',   50,  'Hà Nội + đồng bằng sông Hồng + trung du miền núi phía Bắc',                                                  'active');

-- ============= RULES =============

-- (1) Trà Vinh — FREE (province type, fixed_fee = 0)
-- Province code '84' = Trà Vinh (theo bảng shipping_provinces)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Trà Vinh — miễn phí toàn tỉnh', 0, JSON_ARRAY('84'), 100, 0, 0, 0, 'active'
FROM shipping_zones WHERE zone_code='TRA_VINH_FREE';

-- (2) Tỉnh lân cận — 70k
--   '86'=Vĩnh Long, '83'=Bến Tre, '94'=Sóc Trăng, '92'=Cần Thơ, '82'=Tiền Giang
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Lân cận Trà Vinh — 70.000đ', 70000, JSON_ARRAY('86','83','94','92','82'), 5, 5000, 70000, 150000, 'active'
FROM shipping_zones WHERE zone_code='LAN_CAN_70K';

-- (3) Miền Tây xa hơn — 100k
--   '89'=An Giang, '93'=Hậu Giang, '87'=Đồng Tháp, '80'=Long An,
--   '95'=Bạc Liêu, '91'=Kiên Giang, '96'=Cà Mau
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Miền Tây xa hơn — 100.000đ', 100000, JSON_ARRAY('89','93','87','80','95','91','96'), 5, 5000, 100000, 200000, 'active'
FROM shipping_zones WHERE zone_code='MIEN_TAY_XA_100K';

-- (4) Đông Nam Bộ — 120k (region)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Đông Nam Bộ — 120.000đ', 120000, 'DONG_NAM_BO', 5, 5000, 120000, 250000, 'active'
FROM shipping_zones WHERE zone_code='DONG_NAM_BO_120K';

-- (5) Tây Nguyên — 150k (region)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Tây Nguyên — 150.000đ', 150000, 'TAY_NGUYEN', 5, 5000, 150000, 300000, 'active'
FROM shipping_zones WHERE zone_code='TAY_NGUYEN_150K';

-- (6) Miền Trung — 180k (region)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Miền Trung — 180.000đ', 180000, 'MIEN_TRUNG', 5, 5000, 180000, 350000, 'active'
FROM shipping_zones WHERE zone_code='MIEN_TRUNG_180K';

-- (7) Miền Bắc — 220k (region)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
SELECT id, 'Miền Bắc — 220.000đ', 220000, 'MIEN_BAC', 5, 5000, 220000, 400000, 'active'
FROM shipping_zones WHERE zone_code='MIEN_BAC_220K';
