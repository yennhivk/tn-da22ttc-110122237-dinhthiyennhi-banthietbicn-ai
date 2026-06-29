-- Tạo bảng máy POS
CREATE TABLE IF NOT EXISTS may_pos (
    ma_pos INT PRIMARY KEY AUTO_INCREMENT,
    ma_may VARCHAR(50) UNIQUE NOT NULL,
    ten_may VARCHAR(100) NOT NULL,
    vi_tri VARCHAR(200),
    trang_thai ENUM('active', 'offline', 'maintenance') DEFAULT 'active',
    may_in VARCHAR(50),
    cong_may_in VARCHAR(100),
    may_quet VARCHAR(50),
    cong_may_quet VARCHAR(100),
    nhan_vien_ids TEXT COMMENT 'Danh sách ID nhân viên được phép sử dụng, phân cách bởi dấu phẩy',
    ghi_chu TEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_ma_may (ma_may)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng giao dịch POS
CREATE TABLE IF NOT EXISTS giao_dich_pos (
    ma_giao_dich INT PRIMARY KEY AUTO_INCREMENT,
    ma_pos INT NOT NULL,
    ma_nhan_vien INT,
    loai_giao_dich ENUM('sale', 'refund', 'void', 'test') DEFAULT 'sale',
    so_tien DECIMAL(15,2) NOT NULL,
    thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
    chi_tiet JSON COMMENT 'Chi tiết giao dịch dạng JSON',
    INDEX idx_ma_pos (ma_pos),
    INDEX idx_thoi_gian (thoi_gian),
    FOREIGN KEY (ma_pos) REFERENCES may_pos(ma_pos) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu máy POS
INSERT INTO may_pos (ma_may, ten_may, vi_tri, trang_thai, may_in, cong_may_in, may_quet, cong_may_quet, nhan_vien_ids, ghi_chu) VALUES
('POS-001', 'Quầy 1', 'Tầng 1 - Quầy thu ngân chính', 'active', 'thermal_80mm', 'COM1', 'laser_scanner', 'COM2', '1,2,3', 'Máy POS chính, ưu tiên cao'),
('POS-002', 'Quầy 2', 'Tầng 1 - Quầy phụ', 'active', 'thermal_80mm', 'USB001', '2d_scanner', 'USB002', '2,3,4', 'Máy POS phụ'),
('POS-003', 'Quầy 3', 'Tầng 2', 'offline', 'thermal_58mm', 'COM3', 'ccd_scanner', 'COM4', '3,4', 'Đang bảo trì');

-- Thêm dữ liệu mẫu giao dịch POS
INSERT INTO giao_dich_pos (ma_pos, ma_nhan_vien, loai_giao_dich, so_tien, thoi_gian, chi_tiet) VALUES
(1, 1, 'sale', 1500000, '2026-05-12 09:30:00', '{"items": [{"name": "Laptop Dell", "qty": 1, "price": 1500000}]}'),
(1, 1, 'sale', 850000, '2026-05-12 10:15:00', '{"items": [{"name": "Mouse Logitech", "qty": 2, "price": 425000}]}'),
(2, 2, 'sale', 2300000, '2026-05-12 11:00:00', '{"items": [{"name": "Monitor LG", "qty": 1, "price": 2300000}]}'),
(1, 1, 'refund', 425000, '2026-05-12 14:30:00', '{"reason": "Khách trả hàng", "original_transaction": 2}'),
(2, 3, 'sale', 650000, '2026-05-12 15:45:00', '{"items": [{"name": "Keyboard", "qty": 1, "price": 650000}]}');
