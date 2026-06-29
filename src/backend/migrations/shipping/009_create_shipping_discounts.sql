-- ==========================================
-- CREATE TABLE shipping_discounts
-- Giảm giá phí ship theo giá trị đơn hàng
-- ==========================================

CREATE TABLE IF NOT EXISTS shipping_discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_value_from DECIMAL(12,2) NOT NULL COMMENT 'Giá trị đơn tối thiểu (VND)',
    order_value_to DECIMAL(12,2) NULL COMMENT 'Giá trị đơn tối đa (VND), NULL = vô hạn',
    discount_percentage INT NOT NULL COMMENT 'Phần trăm giảm giá phí ship (0-100)',
    description VARCHAR(255) NULL COMMENT 'Mô tả chương trình',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_discount_range (order_value_from, order_value_to),
    INDEX idx_discount_status (status),
    
    CONSTRAINT chk_discount_range CHECK (order_value_to IS NULL OR order_value_to > order_value_from),
    CONSTRAINT chk_discount_percentage CHECK (discount_percentage BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default shipping discounts
INSERT INTO shipping_discounts (order_value_from, order_value_to, discount_percentage, description, status) VALUES
(500000, 999999, 30, 'Giảm 30% phí ship cho đơn từ 500k', 'active'),
(1000000, 1999999, 50, 'Giảm 50% phí ship cho đơn từ 1 triệu', 'active'),
(2000000, NULL, 100, 'Miễn phí ship cho đơn từ 2 triệu', 'active');
