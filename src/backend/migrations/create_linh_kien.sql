-- Migration: Tạo bảng quản lý linh kiện
-- Ngày tạo: 2026-05-13

-- Bảng linh kiện
CREATE TABLE IF NOT EXISTS linh_kien (
    ma_linh_kien INT AUTO_INCREMENT PRIMARY KEY,
    ten_linh_kien VARCHAR(255) NOT NULL,
    ma_linh_kien_code VARCHAR(50) UNIQUE,
    barcode VARCHAR(100),
    loai_linh_kien ENUM('phu_kien', 'linh_kien_thay_the', 'vat_tu_tieu_hao', 'cong_cu') DEFAULT 'phu_kien',
    don_vi_tinh VARCHAR(50) DEFAULT 'Cái',
    gia_nhap DECIMAL(15,2) DEFAULT 0,
    gia_ban DECIMAL(15,2) DEFAULT 0,
    so_luong_ton INT DEFAULT 0,
    so_luong_toi_thieu INT DEFAULT 10,
    mo_ta TEXT,
    hinh_anh VARCHAR(500),
    trang_thai ENUM('hoat_dong', 'ngung_kinh_doanh') DEFAULT 'hoat_dong',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ma_code (ma_linh_kien_code),
    INDEX idx_barcode (barcode),
    INDEX idx_loai (loai_linh_kien),
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng liên kết linh kiện với sản phẩm chính
CREATE TABLE IF NOT EXISTS lien_ket_linh_kien_san_pham (
    ma_lien_ket INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    ma_linh_kien INT NOT NULL,
    so_luong_can INT DEFAULT 1,
    la_phu_kien_mac_dinh TINYINT(1) DEFAULT 0,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    FOREIGN KEY (ma_linh_kien) REFERENCES linh_kien(ma_linh_kien) ON DELETE CASCADE,
    INDEX idx_san_pham (ma_san_pham),
    INDEX idx_linh_kien (ma_linh_kien)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lịch sử xuất/nhập linh kiện
CREATE TABLE IF NOT EXISTS lich_su_xuat_nhap_linh_kien (
    ma_giao_dich INT AUTO_INCREMENT PRIMARY KEY,
    ma_linh_kien INT NOT NULL,
    loai_giao_dich ENUM('nhap', 'xuat', 'dieu_chinh') NOT NULL,
    so_luong INT NOT NULL,
    gia_tri DECIMAL(15,2) DEFAULT 0,
    ton_truoc INT DEFAULT 0,
    ton_sau INT DEFAULT 0,
    ly_do VARCHAR(255),
    ma_don_hang INT NULL,
    ma_phieu_nhap INT NULL,
    nguoi_thuc_hien VARCHAR(100),
    ghi_chu TEXT,
    ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_linh_kien) REFERENCES linh_kien(ma_linh_kien) ON DELETE CASCADE,
    INDEX idx_linh_kien (ma_linh_kien),
    INDEX idx_loai (loai_giao_dich),
    INDEX idx_ngay (ngay_giao_dich)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu: 20 linh kiện
INSERT INTO linh_kien (ten_linh_kien, ma_linh_kien_code, barcode, loai_linh_kien, don_vi_tinh, gia_nhap, gia_ban, so_luong_ton, so_luong_toi_thieu, mo_ta, trang_thai) VALUES
-- Phụ kiện
('Chuột không dây Logitech M185', 'LK000001', '8710000001', 'phu_kien', 'Cái', 120000, 180000, 45, 10, 'Chuột không dây Logitech M185, kết nối USB', 'hoat_dong'),
('Bàn phím cơ Keychron K2', 'LK000002', '8710000002', 'phu_kien', 'Cái', 1200000, 1800000, 15, 5, 'Bàn phím cơ Keychron K2, switch Blue', 'hoat_dong'),
('Tai nghe Gaming HyperX Cloud II', 'LK000003', '8710000003', 'phu_kien', 'Cái', 1500000, 2200000, 20, 5, 'Tai nghe gaming HyperX Cloud II, 7.1 surround', 'hoat_dong'),
('Webcam Logitech C920', 'LK000004', '8710000004', 'phu_kien', 'Cái', 1300000, 1900000, 12, 5, 'Webcam Logitech C920, Full HD 1080p', 'hoat_dong'),
('Loa Bluetooth JBL Flip 5', 'LK000005', '8710000005', 'phu_kien', 'Cái', 1800000, 2500000, 18, 5, 'Loa Bluetooth JBL Flip 5, chống nước IPX7', 'hoat_dong'),

-- Linh kiện thay thế
('RAM DDR4 8GB Kingston', 'LK000006', '8710000006', 'linh_kien_thay_the', 'Thanh', 600000, 900000, 50, 15, 'RAM DDR4 8GB Kingston 2666MHz', 'hoat_dong'),
('SSD 256GB Samsung 870 EVO', 'LK000007', '8710000007', 'linh_kien_thay_the', 'Cái', 800000, 1200000, 35, 10, 'SSD 256GB Samsung 870 EVO SATA', 'hoat_dong'),
('Ổ cứng HDD 1TB Seagate', 'LK000008', '8710000008', 'linh_kien_thay_the', 'Cái', 700000, 1000000, 40, 10, 'Ổ cứng HDD 1TB Seagate BarraCuda', 'hoat_dong'),
('Pin laptop Dell 6 cell', 'LK000009', '8710000009', 'linh_kien_thay_the', 'Cái', 500000, 800000, 25, 8, 'Pin laptop Dell 6 cell, 48Wh', 'hoat_dong'),
('Màn hình laptop 15.6" FHD', 'LK000010', '8710000010', 'linh_kien_thay_the', 'Cái', 1200000, 1800000, 10, 5, 'Màn hình laptop 15.6" Full HD IPS', 'hoat_dong'),

-- Vật tư tiêu hao
('Keo tản nhiệt Arctic MX-4', 'LK000011', '8710000011', 'vat_tu_tieu_hao', 'Tuýp', 50000, 80000, 100, 20, 'Keo tản nhiệt Arctic MX-4, 4g', 'hoat_dong'),
('Băng keo 2 mặt 3M', 'LK000012', '8710000012', 'vat_tu_tieu_hao', 'Cuộn', 30000, 50000, 80, 20, 'Băng keo 2 mặt 3M, 10mm x 10m', 'hoat_dong'),
('Giấy lau màn hình', 'LK000013', '8710000013', 'vat_tu_tieu_hao', 'Hộp', 40000, 70000, 60, 15, 'Giấy lau màn hình chuyên dụng, 100 tờ', 'hoat_dong'),
('Dung dịch vệ sinh laptop', 'LK000014', '8710000014', 'vat_tu_tieu_hao', 'Chai', 60000, 100000, 50, 15, 'Dung dịch vệ sinh laptop, 250ml', 'hoat_dong'),
('Túi chống tĩnh điện', 'LK000015', '8710000015', 'vat_tu_tieu_hao', 'Cái', 5000, 10000, 200, 50, 'Túi chống tĩnh điện, size M', 'hoat_dong'),

-- Công cụ
('Bộ tua vít sửa laptop', 'LK000016', '8710000016', 'cong_cu', 'Bộ', 150000, 250000, 30, 5, 'Bộ tua vít sửa laptop 32 món', 'hoat_dong'),
('Máy thổi bụi mini', 'LK000017', '8710000017', 'cong_cu', 'Cái', 200000, 350000, 15, 5, 'Máy thổi bụi mini cho laptop', 'hoat_dong'),
('Đồng hồ vạn năng', 'LK000018', '8710000018', 'cong_cu', 'Cái', 300000, 500000, 10, 3, 'Đồng hồ vạn năng đo điện tử', 'hoat_dong'),
('Kìm cắt dây điện', 'LK000019', '8710000019', 'cong_cu', 'Cái', 80000, 150000, 20, 5, 'Kìm cắt dây điện chuyên dụng', 'hoat_dong'),
('Đèn LED soi linh kiện', 'LK000020', '8710000020', 'cong_cu', 'Cái', 120000, 200000, 12, 5, 'Đèn LED soi linh kiện có kính lúp', 'hoat_dong');

-- Dữ liệu mẫu: Liên kết linh kiện với sản phẩm (giả sử có sản phẩm laptop)
-- Lưu ý: Cần có sản phẩm trong bảng san_pham trước
INSERT INTO lien_ket_linh_kien_san_pham (ma_san_pham, ma_linh_kien, so_luong_can, la_phu_kien_mac_dinh, ghi_chu) VALUES
(1, 1, 1, 1, 'Chuột đi kèm laptop'),
(1, 6, 1, 0, 'RAM nâng cấp'),
(1, 7, 1, 0, 'SSD nâng cấp'),
(2, 2, 1, 1, 'Bàn phím cơ đi kèm'),
(2, 3, 1, 1, 'Tai nghe gaming đi kèm');

-- Dữ liệu mẫu: Lịch sử xuất/nhập (10 giao dịch)
INSERT INTO lich_su_xuat_nhap_linh_kien (ma_linh_kien, loai_giao_dich, so_luong, gia_tri, ton_truoc, ton_sau, ly_do, nguoi_thuc_hien, ghi_chu) VALUES
(1, 'nhap', 50, 6000000, 0, 50, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập từ nhà cung cấp Logitech'),
(2, 'nhap', 20, 24000000, 0, 20, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập từ nhà cung cấp Keychron'),
(3, 'nhap', 25, 37500000, 0, 25, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập từ nhà cung cấp HyperX'),
(1, 'xuat', 5, 900000, 50, 45, 'Bán kèm laptop', 'Admin', 'Xuất cho đơn hàng #1001'),
(6, 'nhap', 50, 30000000, 0, 50, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập từ nhà cung cấp Kingston'),
(7, 'nhap', 40, 32000000, 0, 40, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập từ nhà cung cấp Samsung'),
(6, 'xuat', 2, 1800000, 50, 48, 'Nâng cấp laptop', 'Admin', 'Xuất cho dịch vụ nâng cấp'),
(11, 'nhap', 100, 5000000, 0, 100, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập vật tư tiêu hao'),
(16, 'nhap', 30, 4500000, 0, 30, 'Nhập hàng đầu kỳ', 'Admin', 'Nhập công cụ sửa chữa'),
(7, 'xuat', 5, 6000000, 40, 35, 'Nâng cấp laptop', 'Admin', 'Xuất cho dịch vụ nâng cấp');

-- Tạo trigger tự động cập nhật tồn kho khi có giao dịch
DELIMITER //
CREATE TRIGGER after_insert_lich_su_xuat_nhap 
AFTER INSERT ON lich_su_xuat_nhap_linh_kien
FOR EACH ROW
BEGIN
    IF NEW.loai_giao_dich = 'nhap' THEN
        UPDATE linh_kien SET so_luong_ton = so_luong_ton + NEW.so_luong WHERE ma_linh_kien = NEW.ma_linh_kien;
    ELSEIF NEW.loai_giao_dich = 'xuat' THEN
        UPDATE linh_kien SET so_luong_ton = so_luong_ton - NEW.so_luong WHERE ma_linh_kien = NEW.ma_linh_kien;
    ELSEIF NEW.loai_giao_dich = 'dieu_chinh' THEN
        UPDATE linh_kien SET so_luong_ton = NEW.ton_sau WHERE ma_linh_kien = NEW.ma_linh_kien;
    END IF;
END//
DELIMITER ;
