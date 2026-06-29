-- ============================================================
-- Hybrid Shipping Pricing Engine - Complete Migration Script
-- ============================================================
-- Description: Runs all migration files in correct order
-- Author: Hybrid Shipping Pricing Engine
-- Date: 2025-01-15
-- 
-- USAGE:
--   mysql -u root -p yennhi_tech < run_all_migrations.sql
--   OR run each file individually in order
-- 
-- BACKUP FIRST:
--   mysqldump -u root -p yennhi_tech > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
-- ============================================================

USE yennhi_tech;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- ============================================================
-- PHASE 1: DATABASE SETUP
-- ============================================================

SELECT '========================================' as message;
SELECT 'PHASE 1: DATABASE SETUP STARTED' as message;
SELECT '========================================' as message;

-- Migration 001: Create shipping_zones table
SELECT 'Running migration 001: shipping_zones...' as message;
SOURCE 001_create_shipping_zones.sql;

-- Migration 002: Create shipping_zone_rules table
SELECT 'Running migration 002: shipping_zone_rules...' as message;
SOURCE 002_create_shipping_zone_rules.sql;

-- Migration 003: Create shipping_provinces table
SELECT 'Running migration 003: shipping_provinces...' as message;
SOURCE 003_create_shipping_provinces.sql;

-- Migration 004: Create shipping_fee_audit_trail table
SELECT 'Running migration 004: shipping_fee_audit_trail...' as message;
SOURCE 004_create_shipping_fee_audit_trail.sql;

-- Migration 005: Create shipping_special_fees table
SELECT 'Running migration 005: shipping_special_fees...' as message;
SOURCE 005_create_shipping_special_fees.sql;

-- Migration 006: Create shipping_discounts table
SELECT 'Running migration 006: shipping_discounts...' as message;
SOURCE 006_create_shipping_discounts.sql;

-- Migration 007: Create shipping_store_locations table
SELECT 'Running migration 007: shipping_store_locations...' as message;
SOURCE 007_create_shipping_store_locations.sql;

-- Migration 008: Create performance indexes
SELECT 'Running migration 008: performance_indexes...' as message;
SOURCE 008_create_performance_indexes.sql;

SELECT '========================================' as message;
SELECT 'PHASE 1: DATABASE SETUP COMPLETED' as message;
SELECT '========================================' as message;

-- ============================================================
-- PHASE 2: DATA MIGRATION (OPTIONAL)
-- ============================================================

SELECT '========================================' as message;
SELECT 'PHASE 2: DATA MIGRATION (OPTIONAL)' as message;
SELECT 'Running migration 009: migrate_from_old_system...' as message;
SELECT '========================================' as message;

-- Uncomment to run data migration from old system
-- SOURCE 009_migrate_from_old_system.sql;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT '========================================' as message;
SELECT 'VERIFICATION: Checking all tables...' as message;
SELECT '========================================' as message;

-- Check table existence
SELECT 
    'shipping_zones' as table_name,
    COUNT(*) as row_count
FROM shipping_zones
UNION ALL
SELECT 'shipping_zone_rules', COUNT(*) FROM shipping_zone_rules
UNION ALL
SELECT 'shipping_provinces', COUNT(*) FROM shipping_provinces
UNION ALL
SELECT 'shipping_fee_audit_trail', COUNT(*) FROM shipping_fee_audit_trail
UNION ALL
SELECT 'shipping_special_fees', COUNT(*) FROM shipping_special_fees
UNION ALL
SELECT 'shipping_discounts', COUNT(*) FROM shipping_discounts
UNION ALL
SELECT 'shipping_store_locations', COUNT(*) FROM shipping_store_locations;

-- Check indexes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'shipping_%'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Check foreign key constraints
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'shipping_%'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- ============================================================
-- SAMPLE DATA VERIFICATION
-- ============================================================

SELECT '========================================' as message;
SELECT 'SAMPLE DATA VERIFICATION' as message;
SELECT '========================================' as message;

-- Show sample zones
SELECT 
    zone_name,
    zone_code,
    zone_type,
    priority,
    status
FROM shipping_zones
ORDER BY priority DESC, zone_name
LIMIT 10;

-- Show sample provinces by region
SELECT 
    logistics_region,
    COUNT(*) as province_count,
    GROUP_CONCAT(province_name ORDER BY province_name SEPARATOR ', ') as sample_provinces
FROM (
    SELECT 
        logistics_region,
        province_name
    FROM shipping_provinces
    GROUP BY logistics_region, province_name
    HAVING COUNT(*) <= 5
) as sample
GROUP BY logistics_region;

-- Show sample discounts
SELECT 
    CONCAT(FORMAT(order_value_from, 0), 'đ') as from_value,
    CASE 
        WHEN order_value_to IS NULL THEN 'Unlimited'
        ELSE CONCAT(FORMAT(order_value_to, 0), 'đ')
    END as to_value,
    CONCAT(discount_percentage, '%') as discount,
    status
FROM shipping_discounts
ORDER BY order_value_from;

-- Show sample special fees
SELECT 
    fee_code,
    fee_name,
    CONCAT(value, IF(value_type = 'percentage', '%', 'đ')) as fee_value,
    status
FROM shipping_special_fees
ORDER BY fee_code;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

SELECT '========================================' as message;
SELECT '✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!' as message;
SELECT '========================================' as message;

SELECT 'Next steps:' as message;
SELECT '1. Verify data integrity with sample queries' as step;
SELECT '2. Run migration 009 if you need to migrate from old system' as step;
SELECT '3. Implement core pricing engine (Phase 2 in tasks.md)' as step;
SELECT '4. Test calculation endpoints' as step;
SELECT '5. Deploy to production with feature flag' as step;
