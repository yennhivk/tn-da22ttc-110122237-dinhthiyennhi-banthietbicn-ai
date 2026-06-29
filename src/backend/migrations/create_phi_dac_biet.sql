-- Bảng phí đặc biệt cho vận chuyển
CREATE TABLE IF NOT EXISTS phi_dac_biet (
    ma_phi INT PRIMARY KEY AUTO_INCREMENT,
    ten_phi VARCHAR(255) NOT NULL COMMENT 'Tên phí đặc biệt',
    gia_tri DECIMAL(10,2) NOT NULL COMMENT 'Giá trị phí',
    loai_gia_tri ENUM('fixed', 'percent') DEFAULT 'fixed' COMMENT 'Loại giá trị: cố định hoặc phần trăm',
    mo_ta TEXT COMMENT 'Mô tả chi tiết',
    trang_thai ENUM('active', 'inactive') DEFAULT 'active',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO phi_dac_biet (ten_phi, gia_tri, loai_gia_tri, mo_ta, trang_thai) VALUES
('Phí giao hàng nhanh', 15000, 'fixed', 'Phí giao hàng trong 2 giờ', 'active'),
('Phí giao hàng vùng xa', 20000, 'fixed', 'Phí phụ thu cho vùng xa trung tâm', 'active'),
('Phí COD', 10000, 'fixed', 'Phí thu hộ tiền mặt', 'active');
