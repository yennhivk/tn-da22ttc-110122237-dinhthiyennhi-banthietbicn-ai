-- ==========================================
-- Seed dữ liệu mẫu (cửa hàng gốc Vĩnh Long)
-- Đáp ứng yêu cầu §1+§7 trong "ke hoạch phí ship.md":
--   Nội tỉnh: distance pricing với base_fee + included_km + extra_per_km + buffer
--   Liên tỉnh: zone-based fixed_fee theo region
-- ==========================================

-- ============= ZONES =============
-- Distance zones (nội tỉnh Vĩnh Long)
INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status) VALUES
('NOI_TINH_0_10',  'Nội tỉnh 0-10km',  'distance', 90, 'Khu vực nội thành Vĩnh Long trong bán kính 10km',          'active'),
('NOI_TINH_10_40', 'Ngoại thành 10-40km','distance', 85, 'Các huyện trong tỉnh Vĩnh Long',                          'active');

-- Province zones (per-province fixed fee, ưu tiên cao hơn region fallback)
INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status) VALUES
('TP_HCM', 'TP. Hồ Chí Minh', 'province', 100, 'Phí cố định cho đơn đến TP.HCM',  'active'),
('CAN_THO', 'Cần Thơ',        'province', 100, 'Phí cố định cho đơn đến Cần Thơ', 'active');

-- Region zones (fallback liên tỉnh)
INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status) VALUES
('ZONE_MIEN_TAY',    'Miền Tây',    'region', 60, 'Fallback cho các tỉnh miền Tây không có province zone riêng', 'active'),
('ZONE_DONG_NAM_BO', 'Đông Nam Bộ', 'region', 60, 'Bình Dương, Đồng Nai, Vũng Tàu, Tây Ninh, Bình Phước',        'active'),
('ZONE_TAY_NGUYEN',  'Tây Nguyên',  'region', 60, 'Đắk Lắk, Gia Lai, Kon Tum, Lâm Đồng, Đắk Nông',              'active'),
('ZONE_MIEN_TRUNG',  'Miền Trung',  'region', 60, 'Từ Bình Thuận ra Thanh Hóa',                                  'active'),
('ZONE_MIEN_BAC',    'Miền Bắc',    'region', 60, 'Đồng bằng sông Hồng + miền núi phía Bắc',                     'active');

-- ============= RULES =============
-- Distance rule: nội tỉnh 0-10km — 15k cho 5km đầu, +2k/km vượt (theo §1 ví dụ)
INSERT INTO shipping_zone_rules
(zone_id, rule_name, km_from, km_to, base_fee, included_km, extra_per_km, buffer_zone_km, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 'Nội tỉnh 0-10km', 0, 10, 15000, 5, 2000, 2, 5, 5000, 10000, 50000
FROM shipping_zones WHERE zone_code='NOI_TINH_0_10';

-- Distance rule: 10-40km — 25k cho 10km đầu, +1.5k/km vượt, buffer 5km
INSERT INTO shipping_zone_rules
(zone_id, rule_name, km_from, km_to, base_fee, included_km, extra_per_km, buffer_zone_km, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 'Ngoại thành 10-40km', 10, 40, 25000, 10, 1500, 5, 5, 5000, 20000, 80000
FROM shipping_zones WHERE zone_code='NOI_TINH_10_40';

-- Province rule: TP.HCM
INSERT INTO shipping_zone_rules
(zone_id, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 45000, JSON_ARRAY('79'), 5, 5000, NULL, 200000
FROM shipping_zones WHERE zone_code='TP_HCM';

-- Province rule: Cần Thơ
INSERT INTO shipping_zone_rules
(zone_id, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 28000, JSON_ARRAY('92'), 5, 5000, NULL, 150000
FROM shipping_zones WHERE zone_code='CAN_THO';

-- Region rules
INSERT INTO shipping_zone_rules (zone_id, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 35000, 'MIEN_TAY',    5, 5000, NULL, 150000 FROM shipping_zones WHERE zone_code='ZONE_MIEN_TAY';
INSERT INTO shipping_zone_rules (zone_id, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 50000, 'DONG_NAM_BO', 5, 5000, NULL, 200000 FROM shipping_zones WHERE zone_code='ZONE_DONG_NAM_BO';
INSERT INTO shipping_zone_rules (zone_id, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 55000, 'TAY_NGUYEN',  5, 5000, NULL, 200000 FROM shipping_zones WHERE zone_code='ZONE_TAY_NGUYEN';
INSERT INTO shipping_zone_rules (zone_id, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 60000, 'MIEN_TRUNG',  5, 5000, NULL, 250000 FROM shipping_zones WHERE zone_code='ZONE_MIEN_TRUNG';
INSERT INTO shipping_zone_rules (zone_id, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee)
SELECT id, 70000, 'MIEN_BAC',    5, 5000, NULL, 300000 FROM shipping_zones WHERE zone_code='ZONE_MIEN_BAC';
