-- Migration: Tạo bảng thương hiệu
-- Ngày tạo: 2026-05-12

-- Tạo bảng thuong_hieu
CREATE TABLE IF NOT EXISTS thuong_hieu (
    ma_thuong_hieu INT AUTO_INCREMENT PRIMARY KEY,
    ten_thuong_hieu VARCHAR(255) NOT NULL UNIQUE,
    xuat_xu VARCHAR(255) COMMENT 'Xuất xứ/quốc gia',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ten_thuong_hieu (ten_thuong_hieu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng quản lý thương hiệu sản phẩm';

-- Thêm dữ liệu mẫu
INSERT INTO thuong_hieu (ten_thuong_hieu, xuat_xu) VALUES
('Apple', 'Mỹ'),
('Samsung', 'Hàn Quốc'),
('Xiaomi', 'Trung Quốc'),
('OPPO', 'Trung Quốc'),
('Vivo', 'Trung Quốc'),
('Realme', 'Trung Quốc'),
('Huawei', 'Trung Quốc'),
('Nokia', 'Phần Lan'),
('Sony', 'Nhật Bản'),
('LG', 'Hàn Quốc'),
('Asus', 'Đài Loan'),
('Acer', 'Đài Loan'),
('Dell', 'Mỹ'),
('HP', 'Mỹ'),
('Lenovo', 'Trung Quốc'),
('MSI', 'Đài Loan'),
('Razer', 'Mỹ'),
('Google', 'Mỹ'),
('OnePlus', 'Trung Quốc'),
('Motorola', 'Mỹ');

-- Thông báo hoàn thành
SELECT 'Migration completed: thuong_hieu table created with sample data' as message;
