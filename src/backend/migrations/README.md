# Hybrid Shipping Pricing Engine - Database Migrations

Hướng dẫn chi tiết để thiết lập cơ sở dữ liệu cho Hybrid Shipping Pricing Engine.

## 📋 Tổng quan

Các file migration này tạo schema database hoàn chỉnh cho hệ thống tính phí vận chuyển hybrid, bao gồm:

- **7 bảng chính**: zones, rules, provinces, audit trail, special fees, discounts, store locations
- **Indexes tối ưu hóa**: Đạt p95 < 500ms cho queries thường dùng
- **Sample data**: Dữ liệu mẫu để test ngay lập tức
- **Migration script**: Chuyển đổi từ hệ thống cũ (tùy chọn)

## 📂 Cấu trúc Files

```
migrations/
├── 001_create_shipping_zones.sql              # Bảng zones với soft delete
├── 002_create_shipping_zone_rules.sql         # Bảng rules với pricing logic
├── 003_create_shipping_provinces.sql          # 63 tỉnh thành Việt Nam
├── 004_create_shipping_fee_audit_trail.sql    # Lịch sử tính phí
├── 005_create_shipping_special_fees.sql       # Phí đặc biệt (COD, fragile, etc.)
├── 006_create_shipping_discounts.sql          # Giảm giá theo giá trị đơn
├── 007_create_shipping_store_locations.sql    # Vị trí cửa hàng (origin points)
├── 008_create_performance_indexes.sql         # Indexes tối ưu performance
├── 009_migrate_from_old_system.sql            # Migration từ hệ thống cũ
├── run_all_migrations.sql                     # Script chạy tất cả
└── README.md                                  # File này
```

## 🚀 Cách chạy Migrations

### Phương pháp 1: Chạy tất cả cùng lúc (Khuyến nghị)

```bash
# 1. Backup database trước (QUAN TRỌNG!)
mysqldump -u root -p yennhi_tech > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Chạy tất cả migrations
mysql -u root -p yennhi_tech < run_all_migrations.sql
```

### Phương pháp 2: Chạy từng file riêng lẻ

Nếu cần debug hoặc chạy từng bước:

```bash
mysql -u root -p yennhi_tech < 001_create_shipping_zones.sql
mysql -u root -p yennhi_tech < 002_create_shipping_zone_rules.sql
mysql -u root -p yennhi_tech < 003_create_shipping_provinces.sql
mysql -u root -p yennhi_tech < 004_create_shipping_fee_audit_trail.sql
mysql -u root -p yennhi_tech < 005_create_shipping_special_fees.sql
mysql -u root -p yennhi_tech < 006_create_shipping_discounts.sql
mysql -u root -p yennhi_tech < 007_create_shipping_store_locations.sql
mysql -u root -p yennhi_tech < 008_create_performance_indexes.sql
```

### Phương pháp 3: Chạy trong MySQL Workbench

1. Mở MySQL Workbench
2. Connect đến database `yennhi_tech`
3. File > Open SQL Script > chọn `run_all_migrations.sql`
4. Execute (Ctrl+Shift+Enter)

## 📊 Verify Migrations

Sau khi chạy xong, kiểm tra:

```sql
-- Kiểm tra tables đã được tạo
SHOW TABLES LIKE 'shipping_%';

-- Kiểm tra số lượng records
SELECT 'shipping_zones' as table_name, COUNT(*) as row_count FROM shipping_zones
UNION ALL
SELECT 'shipping_zone_rules', COUNT(*) FROM shipping_zone_rules
UNION ALL
SELECT 'shipping_provinces', COUNT(*) FROM shipping_provinces
UNION ALL
SELECT 'shipping_special_fees', COUNT(*) FROM shipping_special_fees
UNION ALL
SELECT 'shipping_discounts', COUNT(*) FROM shipping_discounts
UNION ALL
SELECT 'shipping_store_locations', COUNT(*) FROM shipping_store_locations;

-- Kết quả mong đợi:
-- shipping_zones: 5 zones (2 sample distance + 3 province zones)
-- shipping_zone_rules: 5 rules
-- shipping_provinces: 63 provinces
-- shipping_special_fees: 8 fees
-- shipping_discounts: 4 discount tiers
-- shipping_store_locations: 1 default store
```

## 🔄 Migration từ hệ thống cũ (Optional)

Nếu bạn đang nâng cấp từ hệ thống cũ:

```bash
# 1. Backup cả database cũ và mới
mysqldump -u root -p yennhi_tech > full_backup_before_migration.sql

# 2. Chạy migration script
mysql -u root -p yennhi_tech < 009_migrate_from_old_system.sql

# 3. So sánh kết quả tính phí
# - Test với cùng địa chỉ ở cả 2 hệ thống
# - Fee variance phải < 5%
```

### Các bảng cũ được migrate:

- `cau_hinh_van_chuyen` → `shipping_zones` + `shipping_zone_rules`
- `giam_gia_phi_ship` → `shipping_discounts`
- `phi_dac_biet` → `shipping_special_fees`
- `thong_tin_cua_hang` → `shipping_store_locations`

## 📐 Schema Overview

### 1. shipping_zones
Định nghĩa vùng giá với 3 loại:
- `distance_zone`: Tính theo khoảng cách (0-10km, 10-40km, etc.)
- `province_zone`: Tính theo tỉnh thành
- `region_zone`: Tính theo vùng (Miền Bắc, Trung, Nam)

**Priority matching**: 100 (province) > 80 (exact distance) > 70 (buffer zone)

### 2. shipping_zone_rules
Chi tiết công thức tính phí cho mỗi zone:
- Distance pricing: `base_fee + (distance - included_km) * extra_per_km`
- Weight pricing: `extra_per_kg` cho mỗi kg vượt `weight_limit_kg`
- Buffer zones: Smooth transition tránh price jump

### 3. shipping_provinces
63 tỉnh thành Việt Nam với:
- `normalized_name`: Không dấu, lowercase để matching
- `logistics_region`: MIEN_BAC, MIEN_TRUNG, MIEN_NAM
- `estimated_distance_km`: Fallback khi geocoding fail

### 4. shipping_fee_audit_trail
Lưu toàn bộ lịch sử tính phí với:
- JSON input snapshot
- JSON calculation breakdown
- Match type và fallback status
- Calculation time metrics

### 5. shipping_special_fees
Phí dịch vụ đặc biệt:
- `COD`: 15,000đ fixed
- `FRAGILE`: 10,000đ fixed
- `EXPRESS`: 20% percentage
- `INSURANCE`: 1% percentage

### 6. shipping_discounts
Giảm giá theo giá trị đơn hàng:
- 300k-500k: -20%
- 500k-1M: -30%
- 1M-2M: -50%
- ≥2M: -100% (miễn phí)

### 7. shipping_store_locations
Origin points cho tính khoảng cách:
- Tọa độ WGS84 (latitude, longitude)
- Hỗ trợ multiple stores
- Flag `is_default` cho store mặc định

## 🔧 Performance Indexes

Tất cả indexes đã được tối ưu cho:
- Zone matching: `idx_zones_active_priority`
- Province lookup: `idx_provinces_normalized`
- Discount range: `idx_discounts_active_range`
- Audit queries: `idx_audit_order_timestamp`

**Target**: p95 < 500ms, p99 < 1s

## 🧪 Testing Migrations

Sau khi chạy xong, test với sample queries:

```sql
-- Test 1: Lấy zone ưu tiên cao nhất
SELECT * FROM shipping_zones 
WHERE status = 'active' AND deleted_at IS NULL 
ORDER BY priority DESC 
LIMIT 1;

-- Test 2: Tìm tỉnh theo normalized name
SELECT * FROM shipping_provinces 
WHERE normalized_name = 'vinh long';

-- Test 3: Tìm discount cho đơn 750k
SELECT * FROM shipping_discounts
WHERE status = 'active'
  AND 750000 >= order_value_from
  AND (order_value_to IS NULL OR 750000 <= order_value_to)
ORDER BY discount_percentage DESC
LIMIT 1;

-- Test 4: Lấy default store
SELECT * FROM shipping_store_locations
WHERE is_default = TRUE AND status = 'active';

-- Test 5: Performance test (should use index)
EXPLAIN SELECT * FROM shipping_zones 
WHERE status = 'active' 
ORDER BY priority DESC;
-- Kết quả phải có "Using index" trong Extra column
```

## 🚨 Troubleshooting

### Lỗi: Table already exists
```sql
-- Xóa table cũ (cẩn thận! Mất dữ liệu)
DROP TABLE IF EXISTS shipping_fee_audit_trail;
DROP TABLE IF EXISTS shipping_zone_rules;
DROP TABLE IF EXISTS shipping_zones;
DROP TABLE IF EXISTS shipping_provinces;
DROP TABLE IF EXISTS shipping_special_fees;
DROP TABLE IF EXISTS shipping_discounts;
DROP TABLE IF EXISTS shipping_store_locations;

-- Sau đó chạy lại migrations
```

### Lỗi: Foreign key constraint fails
```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Chạy migrations
SET FOREIGN_KEY_CHECKS = 1;
```

### Lỗi: Character encoding issues
```sql
-- Đảm bảo database dùng UTF8MB4
ALTER DATABASE yennhi_tech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📝 Next Steps

Sau khi migrations thành công:

1. ✅ **Verify data integrity** với sample queries ở trên
2. 🔨 **Implement Core Pricing Engine** (Phase 2 trong tasks.md)
   - DistanceCalculator.js
   - GeocodingService.js
   - ZoneMatcher.js
   - ShippingFeeCalculator.js
3. 🌐 **Create API endpoints** (Phase 3)
   - POST /api/shipping-engine/calculate
   - CRUD endpoints cho zones, rules, etc.
4. 🧪 **Write unit tests** với coverage > 80%
5. 🚀 **Deploy with feature flag** (10% → 50% → 100%)

## 📚 References

- Design document: `.kiro/specs/hybrid-shipping-pricing-engine/design.md`
- Requirements: `.kiro/specs/hybrid-shipping-pricing-engine/requirements.md`
- Tasks breakdown: `.kiro/specs/hybrid-shipping-pricing-engine/tasks.md`

## 🆘 Support

Nếu gặp vấn đề, kiểm tra:
1. MySQL version >= 8.0
2. Database charset = utf8mb4
3. InnoDB engine enabled
4. Sufficient permissions (CREATE, INSERT, ALTER, INDEX)

---

**Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Phase 1 Complete ✅
