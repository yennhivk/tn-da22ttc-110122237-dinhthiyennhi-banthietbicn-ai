-- ==========================================
-- shipping_fee_logs
-- Audit trail mỗi lần tính phí (cả preview và real order)
-- ==========================================

CREATE TABLE shipping_fee_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NULL COMMENT 'NULL = preview/calculate request không gắn đơn',
    zone_id INT NULL,
    rule_id INT NULL,

    -- Input snapshot
    input_address TEXT NULL,
    input_province VARCHAR(100) NULL,
    input_latitude DECIMAL(10,7) NULL,
    input_longitude DECIMAL(10,7) NULL,
    input_weight_kg DECIMAL(10,2) NULL,
    input_order_value DECIMAL(15,2) NULL,
    input_snapshot JSON NULL COMMENT 'Full request body để debug',

    -- Result
    distance_km DECIMAL(10,2) NULL,
    match_type ENUM('province','distance','buffer','region_fallback','default') NULL,
    base_fee DECIMAL(15,2) NULL,
    distance_fee DECIMAL(15,2) NULL,
    weight_fee DECIMAL(15,2) NULL,
    subtotal_fee DECIMAL(15,2) NULL,
    final_fee DECIMAL(15,2) NOT NULL,
    breakdown JSON NULL COMMENT 'Full breakdown response',

    -- Metadata
    is_preview TINYINT(1) NOT NULL DEFAULT 0,
    is_fallback TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'TRUE khi không geocode được, dùng estimated_distance',
    calculation_time_ms INT NULL,
    geocoding_used TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_order (order_id),
    INDEX idx_zone_rule (zone_id, rule_id),
    INDEX idx_created (created_at),
    INDEX idx_match_type (match_type),
    INDEX idx_preview (is_preview),
    CONSTRAINT fk_log_zone FOREIGN KEY (zone_id) REFERENCES shipping_zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_log_rule FOREIGN KEY (rule_id) REFERENCES shipping_zone_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
