-- ==========================================
-- shipping_region_mappings
-- Logistics regions (miền) — gốc của zone_type='region'
-- ==========================================

CREATE TABLE shipping_region_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    region_code VARCHAR(32) NOT NULL UNIQUE,
    region_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO shipping_region_mappings (region_code, region_name, description) VALUES
('MIEN_TAY',    'Miền Tây Nam Bộ',  'Đồng bằng sông Cửu Long: Cần Thơ, Vĩnh Long, An Giang, Đồng Tháp, Tiền Giang, Bến Tre, Trà Vinh, Long An, Hậu Giang, Sóc Trăng, Bạc Liêu, Cà Mau, Kiên Giang'),
('DONG_NAM_BO', 'Đông Nam Bộ',       'TP.HCM, Bình Dương, Đồng Nai, Bà Rịa-Vũng Tàu, Tây Ninh, Bình Phước'),
('TAY_NGUYEN',  'Tây Nguyên',        'Đắk Lắk, Đắk Nông, Gia Lai, Kon Tum, Lâm Đồng'),
('MIEN_TRUNG',  'Miền Trung',        'Từ Bình Thuận ra Thanh Hóa: Đà Nẵng, Huế, Quảng Nam, Quảng Ngãi, Bình Định, Phú Yên, Khánh Hòa, Ninh Thuận, Bình Thuận, Nghệ An, Hà Tĩnh, Quảng Bình, Quảng Trị, Thanh Hóa'),
('MIEN_BAC',    'Miền Bắc',          'Đồng bằng sông Hồng + trung du miền núi phía Bắc: Hà Nội, Hải Phòng, Quảng Ninh, các tỉnh phía Bắc');
