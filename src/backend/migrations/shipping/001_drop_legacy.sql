-- ==========================================
-- Shipping Engine V3 - Drop legacy tables
-- ==========================================
-- Xóa toàn bộ bảng ship của 3 phiên bản cũ trước khi tạo schema mới.
-- Bảng `phi_dac_biet` và `don_hang_phi_dac_biet` được GIỮ LẠI vì
-- `backend/routes/orders.js` vẫn tham chiếu (special fees ngoài phạm vi engine).

SET FOREIGN_KEY_CHECKS = 0;

-- Legacy V1 (utils/shipping.js + cau_hinh_van_chuyen)
DROP TABLE IF EXISTS lich_su_tinh_phi_ship;
DROP TABLE IF EXISTS cau_hinh_van_chuyen;
DROP TABLE IF EXISTS giam_gia_phi_ship;

-- Legacy V2 (ShippingPricingEngine + tên cột tiếng Việt)
DROP TABLE IF EXISTS shipping_fee_history;

-- Legacy V3 (Hybrid English schema)
DROP TABLE IF EXISTS shipping_fee_audit_trail;
DROP TABLE IF EXISTS shipping_special_fees;
DROP TABLE IF EXISTS shipping_discounts;
DROP TABLE IF EXISTS shipping_zone_rules;
DROP TABLE IF EXISTS shipping_zones;
DROP TABLE IF EXISTS shipping_provinces;
DROP TABLE IF EXISTS shipping_store_locations;
DROP TABLE IF EXISTS shipping_region_mappings;
DROP TABLE IF EXISTS shipping_fee_logs;

SET FOREIGN_KEY_CHECKS = 1;
