-- Migration: Tạo bảng đơn đặt hàng (Pre-order)
-- Ngày tạo: 2026-05-12

-- Tạo bảng don_dat_hang
CREATE TABLE IF NOT EXISTS don_dat_hang (
    ma_don_dat_hang INT AUTO_INCREMENT PRIMARY KEY,
    ma_don_dat VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã đơn đặt dạng DDH + timestamp',
    loai ENUM('online', 'offline') NOT NULL COMMENT 'Loại đơn: online hoặc offline',
    
    -- Thông tin khách hàng
    ten_khach_hang VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    dia_chi TEXT,
    
    -- Thông tin sản phẩm
    ten_san_pham VARCHAR(500) NOT NULL,
    so_luong INT NOT NULL DEFAULT 1,
    gia_du_kien DECIMAL(15,2) COMMENT 'Giá dự kiến',
    mo_ta TEXT COMMENT 'Mô tả chi tiết sản phẩm',
    
    -- Liên kết nhà cung cấp
    ma_nha_cung_cap INT COMMENT 'Mã nhà cung cấp',
    ngay_du_kien DATE COMMENT 'Ngày dự kiến có hàng',
    
    -- Trạng thái và ghi chú
    trang_thai ENUM('pending', 'confirmed', 'in_stock', 'completed', 'cancelled') DEFAULT 'pending',
    ghi_chu TEXT,
    
    -- Timestamps
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_loai (loai),
    INDEX idx_ngay_tao (ngay_tao),
    INDEX idx_ma_don_dat (ma_don_dat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng quản lý đơn đặt hàng trước';

-- Thêm dữ liệu mẫu
INSERT INTO don_dat_hang (
    ma_don_dat, loai, ten_khach_hang, so_dien_thoai, email, dia_chi,
    ten_san_pham, so_luong, gia_du_kien, mo_ta, ma_nha_cung_cap,
    ngay_du_kien, trang_thai, ghi_chu
) VALUES
-- Đơn online
('DDH1715500001', 'online', 'Nguyễn Văn A', '0901234567', 'nguyenvana@email.com', '123 Đường ABC, Quận 1, TP.HCM',
 'iPhone 15 Pro Max 256GB', 1, 29990000, 'Màu Titan Tự Nhiên, chưa active', 1,
 DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'pending', 'Khách yêu cầu giao trong tuần'),

('DDH1715500002', 'online', 'Trần Thị B', '0912345678', 'tranthib@email.com', '456 Đường XYZ, Quận 3, TP.HCM',
 'MacBook Pro 14" M3 Pro', 1, 52990000, '16GB RAM, 512GB SSD, Space Black', 1,
 DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'confirmed', 'Đã xác nhận với NCC'),

('DDH1715500003', 'online', 'Lê Văn C', '0923456789', 'levanc@email.com', '789 Đường DEF, Quận 5, TP.HCM',
 'iPad Pro 12.9" M2 WiFi 256GB', 2, 28990000, 'Màu Bạc, kèm Apple Pencil', 1,
 DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'in_stock', 'Hàng đã về kho'),

-- Đơn offline (tại cửa hàng)
('DDH1715500004', 'offline', 'Phạm Thị D', '0934567890', NULL, NULL,
 'AirPods Pro 2', 3, 6490000, 'Khách mua số lượng lớn', 1,
 DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'pending', 'Khách đến cửa hàng đặt trực tiếp'),

('DDH1715500005', 'offline', 'Hoàng Văn E', '0945678901', NULL, NULL,
 'Apple Watch Ultra 2', 1, 21990000, 'Dây Alpine Loop màu xanh', 1,
 DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'confirmed', 'Đã đặt cọc 5 triệu'),

('DDH1715500006', 'online', 'Võ Thị F', '0956789012', 'vothif@email.com', '321 Đường GHI, Quận 7, TP.HCM',
 'Mac Mini M2 Pro', 1, 34990000, '32GB RAM, 512GB SSD', 2,
 DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'pending', 'Chờ NCC báo giá'),

('DDH1715500007', 'online', 'Đặng Văn G', '0967890123', 'dangvang@email.com', '654 Đường JKL, Quận 10, TP.HCM',
 'iPhone 14 Plus 128GB', 1, 22990000, 'Màu Tím, máy mới 100%', 1,
 DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'completed', 'Đã giao hàng và thanh toán'),

('DDH1715500008', 'offline', 'Bùi Thị H', '0978901234', NULL, NULL,
 'Magic Keyboard cho iPad Pro', 2, 8990000, 'Bàn phím tiếng Việt', 1,
 DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'cancelled', 'Khách hủy do thay đổi nhu cầu');

-- Thông báo hoàn thành
SELECT 'Migration completed: don_dat_hang table created with sample data' as message;
