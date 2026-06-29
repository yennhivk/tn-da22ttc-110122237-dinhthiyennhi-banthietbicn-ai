-- Migration: Tạo bảng nhà cung cấp
-- Ngày tạo: 2026-05-12

-- Tạo bảng nha_cung_cap
CREATE TABLE IF NOT EXISTS nha_cung_cap (
    ma_nha_cung_cap INT AUTO_INCREMENT PRIMARY KEY,
    ten_nha_cung_cap VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20),
    email VARCHAR(255),
    dia_chi TEXT,
    nguoi_lien_he VARCHAR(255),
    trang_thai ENUM('hoat_dong', 'ngung_hoat_dong') DEFAULT 'hoat_dong',
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng quản lý nhà cung cấp';

-- Thêm dữ liệu mẫu
INSERT INTO nha_cung_cap (
    ten_nha_cung_cap, so_dien_thoai, email, dia_chi, nguoi_lien_he, trang_thai, ghi_chu
) VALUES
('Apple Việt Nam', '0281234567', 'contact@apple.vn', '123 Đường Lê Lợi, Quận 1, TP.HCM', 'Nguyễn Văn A', 'hoat_dong', 'Nhà phân phối chính thức Apple'),
('FPT Shop', '0282345678', 'supplier@fptshop.com.vn', '456 Đường Nguyễn Huệ, Quận 1, TP.HCM', 'Trần Thị B', 'hoat_dong', 'Đối tác phân phối'),
('Thế Giới Di Động', '0283456789', 'b2b@thegioididong.com', '789 Đường Trần Hưng Đạo, Quận 5, TP.HCM', 'Lê Văn C', 'hoat_dong', 'Nhà cung cấp thiết bị di động'),
('Điện Máy Xanh', '0284567890', 'supplier@dienmayxanh.com', '321 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM', 'Phạm Thị D', 'hoat_dong', 'Nhà cung cấp điện tử'),
('CellphoneS', '0285678901', 'partner@cellphones.com.vn', '654 Đường Võ Văn Tần, Quận 3, TP.HCM', 'Hoàng Văn E', 'hoat_dong', 'Đối tác kinh doanh');

-- Thông báo hoàn thành
SELECT 'Migration completed: nha_cung_cap table created with sample data' as message;
