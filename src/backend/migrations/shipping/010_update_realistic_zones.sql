-- ==========================================
-- UPDATE SHIPPING ZONES & RULES TO REALISTIC RATES
-- Updates both Trà Vinh (70k-220k) and Vĩnh Long (35k-70k) schemas
-- ==========================================

-- 1. Updates for Trà Vinh schema (if active)
UPDATE shipping_zones SET zone_code = 'LAN_CAN_30K', zone_name = 'Tỉnh lân cận — 30.000đ', description = 'Vĩnh Long, Bến Tre, Sóc Trăng, Cần Thơ, Tiền Giang' WHERE zone_code = 'LAN_CAN_70K';
UPDATE shipping_zones SET zone_code = 'MIEN_TAY_XA_35K', zone_name = 'Miền Tây xa — 35.000đ', description = 'An Giang, Hậu Giang, Đồng Tháp, Long An, Bạc Liêu, Kiên Giang, Cà Mau' WHERE zone_code = 'MIEN_TAY_XA_100K';
UPDATE shipping_zones SET zone_code = 'DONG_NAM_BO_40K', zone_name = 'Đông Nam Bộ — 40.000đ', description = 'TP.HCM, Bình Dương, Đồng Nai, Bà Rịa-Vũng Tàu, Tây Ninh, Bình Phước' WHERE zone_code = 'DONG_NAM_BO_120K';
UPDATE shipping_zones SET zone_code = 'TAY_NGUYEN_45K', zone_name = 'Tây Nguyên — 45.000đ', description = 'Đắk Lắk, Đắk Nông, Gia Lai, Kon Tum, Lâm Đồng' WHERE zone_code = 'TAY_NGUYEN_150K';
UPDATE shipping_zones SET zone_code = 'MIEN_TRUNG_50K', zone_name = 'Miền Trung — 50.000đ', description = 'Từ Bình Thuận ra Thanh Hóa' WHERE zone_code = 'MIEN_TRUNG_180K';
UPDATE shipping_zones SET zone_code = 'MIEN_BAC_55K', zone_name = 'Miền Bắc — 55.000đ', description = 'Hà Nội + đồng bằng sông Hồng + trung du miền núi phía Bắc' WHERE zone_code = 'MIEN_BAC_220K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Lân cận Trà Vinh — 30.000đ', r.fixed_fee = 30000.00, r.min_fee = 30000.00, r.max_fee = 100000.00
WHERE z.zone_code = 'LAN_CAN_30K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Tây xa hơn — 35.000đ', r.fixed_fee = 35000.00, r.min_fee = 35000.00, r.max_fee = 120000.00
WHERE z.zone_code = 'MIEN_TAY_XA_35K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Đông Nam Bộ — 40.000đ', r.fixed_fee = 40000.00, r.min_fee = 40000.00, r.max_fee = 150000.00
WHERE z.zone_code = 'DONG_NAM_BO_40K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Tây Nguyên — 45.000đ', r.fixed_fee = 45000.00, r.min_fee = 45000.00, r.max_fee = 180000.00
WHERE z.zone_code = 'TAY_NGUYEN_45K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Trung — 50.000đ', r.fixed_fee = 50000.00, r.min_fee = 50000.00, r.max_fee = 200000.00
WHERE z.zone_code = 'MIEN_TRUNG_50K';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Bắc — 55.000đ', r.fixed_fee = 55000.00, r.min_fee = 55000.00, r.max_fee = 220000.00
WHERE z.zone_code = 'MIEN_BAC_55K';


-- 2. Updates for Vĩnh Long / Seed schema (if active)
UPDATE shipping_zones SET zone_name = 'TP. Hồ Chí Minh — 35.000đ' WHERE zone_code = 'TP_HCM';
UPDATE shipping_zones SET zone_name = 'Cần Thơ — 30.000đ' WHERE zone_code = 'CAN_THO';
UPDATE shipping_zones SET zone_name = 'Miền Tây — 35.000đ' WHERE zone_code = 'ZONE_MIEN_TAY';
UPDATE shipping_zones SET zone_name = 'Đông Nam Bộ — 40.000đ' WHERE zone_code = 'ZONE_DONG_NAM_BO';
UPDATE shipping_zones SET zone_name = 'Tây Nguyên — 45.000đ' WHERE zone_code = 'ZONE_TAY_NGUYEN';
UPDATE shipping_zones SET zone_name = 'Miền Trung — 50.000đ' WHERE zone_code = 'ZONE_MIEN_TRUNG';
UPDATE shipping_zones SET zone_name = 'Miền Bắc — 55.000đ' WHERE zone_code = 'ZONE_MIEN_BAC';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'TP.HCM — 35.000đ', r.fixed_fee = 35000.00, r.min_fee = 35000.00, r.max_fee = 100000.00
WHERE z.zone_code = 'TP_HCM';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Cần Thơ — 30.000đ', r.fixed_fee = 30000.00, r.min_fee = 30000.00, r.max_fee = 100000.00
WHERE z.zone_code = 'CAN_THO';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Tây — 35.000đ', r.fixed_fee = 35000.00, r.min_fee = 35000.00, r.max_fee = 120000.00
WHERE z.zone_code = 'ZONE_MIEN_TAY';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Đông Nam Bộ — 40.000đ', r.fixed_fee = 40000.00, r.min_fee = 40000.00, r.max_fee = 150000.00
WHERE z.zone_code = 'ZONE_DONG_NAM_BO';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Tây Nguyên — 45.000đ', r.fixed_fee = 45000.00, r.min_fee = 45000.00, r.max_fee = 180000.00
WHERE z.zone_code = 'ZONE_TAY_NGUYEN';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Trung — 50.000đ', r.fixed_fee = 50000.00, r.min_fee = 50000.00, r.max_fee = 200000.00
WHERE z.zone_code = 'ZONE_MIEN_TRUNG';

UPDATE shipping_zone_rules r JOIN shipping_zones z ON r.zone_id = z.id 
SET r.rule_name = 'Miền Bắc — 55.000đ', r.fixed_fee = 55000.00, r.min_fee = 55000.00, r.max_fee = 220000.00
WHERE z.zone_code = 'ZONE_MIEN_BAC';
