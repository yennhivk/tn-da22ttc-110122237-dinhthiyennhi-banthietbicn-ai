-- ==========================================
-- shipping_zone_rules
-- Quy tắc tính phí cho từng zone. 1 zone có thể có nhiều rule
-- (ví dụ: zone "Nội tỉnh" có rule 0-5km và rule 5-10km).
-- ==========================================

CREATE TABLE shipping_zone_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id INT NOT NULL,
    rule_name VARCHAR(150) NULL COMMENT 'Tên rule (optional, hỗ trợ admin nhận diện)',

    -- Distance rule: dùng khi zone.zone_type='distance'
    km_from DECIMAL(10,2) NULL COMMENT 'Khoảng cách từ (km) — inclusive',
    km_to DECIMAL(10,2) NULL COMMENT 'Khoảng cách đến (km) — exclusive. NULL = vô hạn',
    base_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    included_km DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Số km đã bao gồm trong base_fee',
    extra_per_km DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Phụ phí mỗi km vượt included_km',
    buffer_zone_km DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Vùng buffer 2 phía của km_to để smooth transition',

    -- Province/Region rule: dùng khi zone.zone_type IN ('province','region')
    fixed_fee DECIMAL(15,2) NULL COMMENT 'Phí cố định',
    province_codes JSON NULL COMMENT 'Mảng province_code (vd ["79","74"]) — chỉ cho zone_type=province',
    region_code VARCHAR(32) NULL COMMENT 'FK shipping_region_mappings — chỉ cho zone_type=region',

    -- Weight (áp dụng chung)
    weight_limit_kg DECIMAL(10,2) NOT NULL DEFAULT 5 COMMENT 'Trọng lượng được bao gồm',
    extra_per_kg DECIMAL(15,2) NOT NULL DEFAULT 5000 COMMENT 'Phụ phí mỗi kg vượt',

    -- Constraints
    min_fee DECIMAL(15,2) NULL COMMENT 'Phí tối thiểu sau khi tính',
    max_fee DECIMAL(15,2) NULL COMMENT 'Phí tối đa (cap)',

    -- Temporal
    effective_from DATE NULL,
    effective_to DATE NULL,
    status ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_zone_status (zone_id, status),
    INDEX idx_distance_range (km_from, km_to),
    INDEX idx_region (region_code),
    INDEX idx_effective (effective_from, effective_to),

    CONSTRAINT fk_rule_zone FOREIGN KEY (zone_id) REFERENCES shipping_zones(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rule_region FOREIGN KEY (region_code) REFERENCES shipping_region_mappings(region_code)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_distance_range CHECK (km_to IS NULL OR km_from IS NULL OR km_to > km_from),
    CONSTRAINT chk_buffer CHECK (buffer_zone_km >= 0),
    CONSTRAINT chk_fees CHECK (base_fee >= 0 AND extra_per_km >= 0 AND extra_per_kg >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
