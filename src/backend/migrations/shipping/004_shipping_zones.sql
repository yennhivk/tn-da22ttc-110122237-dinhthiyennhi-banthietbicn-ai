-- ==========================================
-- shipping_zones
-- Định nghĩa vùng giao hàng. 3 loại:
--   distance — match theo khoảng cách km (nội tỉnh)
--   province — match theo danh sách tỉnh
--   region   — match theo region_code (fallback liên tỉnh)
-- ==========================================

CREATE TABLE shipping_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_code VARCHAR(64) NOT NULL UNIQUE,
    zone_name VARCHAR(150) NOT NULL,
    zone_type ENUM('distance','province','region') NOT NULL,
    priority INT NOT NULL DEFAULT 50 COMMENT 'Cao hơn = match trước (province=100, distance=80, region=50)',
    description TEXT NULL,
    status ENUM('active','inactive','draft') NOT NULL DEFAULT 'active',
    effective_from DATE NULL COMMENT 'NULL = có hiệu lực ngay',
    effective_to DATE NULL COMMENT 'NULL = vĩnh viễn',
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status_priority (status, priority DESC),
    INDEX idx_type (zone_type),
    INDEX idx_deleted (deleted_at),
    INDEX idx_effective (effective_from, effective_to),
    CONSTRAINT chk_priority CHECK (priority BETWEEN 1 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
