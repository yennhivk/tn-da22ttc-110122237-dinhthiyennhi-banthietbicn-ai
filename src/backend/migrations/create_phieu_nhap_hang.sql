-- Tạo bảng phiếu nhập hàng
CREATE TABLE IF NOT EXISTS phieu_nhap_hang (
    ma_phieu_nhap INT PRIMARY KEY AUTO_INCREMENT,
    ma_don_dat_hang INT,
    ma_nha_cung_cap INT NOT NULL,
    ma_nhan_vien INT NOT NULL,
    ngay_nhap DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tong_so_luong INT NOT NULL DEFAULT 0,
    tong_gia_tri DECIMAL(15,2) NOT NULL DEFAULT 0,
    trang_thai ENUM('dang_kiem_tra', 'hoan_thanh', 'co_van_de') DEFAULT 'dang_kiem_tra',
    ghi_chu TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_don_dat_hang) REFERENCES don_dat_hang(ma_don_dat_hang) ON DELETE SET NULL,
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap),
    INDEX idx_ngay_nhap (ngay_nhap),
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_nha_cung_cap (ma_nha_cung_cap)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng chi tiết phiếu nhập hàng
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_nhap (
    ma_chi_tiet_nhap INT PRIMARY KEY AUTO_INCREMENT,
    ma_phieu_nhap INT NOT NULL,
    ma_san_pham INT NOT NULL,
    so_luong_dat INT NOT NULL DEFAULT 0,
    so_luong_thuc_nhan INT NOT NULL DEFAULT 0,
    gia_nhap DECIMAL(15,2) NOT NULL,
    thanh_tien DECIMAL(15,2) NOT NULL,
    chat_luong ENUM('tot', 'trung_binh', 'kem') DEFAULT 'tot',
    ghi_chu TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_phieu_nhap) REFERENCES phieu_nhap_hang(ma_phieu_nhap) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham),
    INDEX idx_phieu_nhap (ma_phieu_nhap),
    INDEX idx_san_pham (ma_san_pham)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu phiếu nhập hàng
INSERT INTO phieu_nhap_hang (ma_don_dat_hang, ma_nha_cung_cap, ma_nhan_vien, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai, ghi_chu) VALUES
(1, 1, 1, '2024-01-15 09:30:00', 50, 875000000, 'hoan_thanh', 'Nhập hàng đợt 1 - Đầy đủ'),
(2, 2, 1, '2024-01-20 10:15:00', 30, 450000000, 'hoan_thanh', 'Nhập hàng Samsung - Đầy đủ'),
(3, 3, 1, '2024-02-01 14:20:00', 25, 320000000, 'co_van_de', 'Thiếu 2 sản phẩm, 1 sản phẩm bị lỗi'),
(4, 4, 1, '2024-02-10 11:00:00', 40, 580000000, 'hoan_thanh', 'Nhập hàng phụ kiện - Đầy đủ'),
(5, 5, 1, '2024-02-15 15:45:00', 20, 280000000, 'hoan_thanh', 'Nhập hàng laptop - Đầy đủ'),
(NULL, 1, 1, '2024-02-20 09:00:00', 15, 180000000, 'dang_kiem_tra', 'Đang kiểm tra hàng mới về'),
(NULL, 3, 1, '2024-02-22 10:30:00', 35, 420000000, 'dang_kiem_tra', 'Đang kiểm tra lô hàng Xiaomi');

-- Thêm dữ liệu mẫu chi tiết phiếu nhập
INSERT INTO chi_tiet_phieu_nhap (ma_phieu_nhap, ma_san_pham, so_luong_dat, so_luong_thuc_nhan, gia_nhap, thanh_tien, chat_luong, ghi_chu) VALUES
-- Phiếu nhập 1
(1, 1, 20, 20, 24500000, 490000000, 'tot', 'Hàng đầy đủ, chất lượng tốt'),
(1, 2, 15, 15, 21000000, 315000000, 'tot', 'Hàng đầy đủ'),
(1, 3, 15, 15, 20300000, 304500000, 'tot', 'Hàng đầy đủ'),

-- Phiếu nhập 2
(2, 2, 20, 20, 21000000, 420000000, 'tot', 'Hàng Samsung chính hãng'),
(2, 13, 10, 10, 18000000, 180000000, 'tot', 'Galaxy Z Fold 5 đầy đủ'),

-- Phiếu nhập 3 (có vấn đề)
(3, 9, 15, 13, 15000000, 195000000, 'trung_binh', 'Thiếu 2 máy, 1 máy bị trầy xước'),
(3, 10, 10, 10, 12500000, 125000000, 'tot', 'Hàng đầy đủ'),

-- Phiếu nhập 4
(4, 22, 20, 20, 4200000, 84000000, 'tot', 'AirPods Pro 2 đầy đủ'),
(4, 26, 20, 20, 5600000, 112000000, 'tot', 'Tai nghe Sony đầy đủ'),

-- Phiếu nhập 5
(5, 15, 10, 10, 35000000, 350000000, 'tot', 'MacBook Pro M3 đầy đủ'),
(5, 16, 10, 10, 23000000, 230000000, 'tot', 'Dell XPS 15 đầy đủ'),

-- Phiếu nhập 6 (đang kiểm tra)
(6, 1, 15, 15, 24500000, 367500000, 'tot', 'Đang kiểm tra'),

-- Phiếu nhập 7 (đang kiểm tra)
(7, 9, 20, 20, 15000000, 300000000, 'tot', 'Đang kiểm tra'),
(7, 14, 15, 15, 8000000, 120000000, 'tot', 'Đang kiểm tra');
