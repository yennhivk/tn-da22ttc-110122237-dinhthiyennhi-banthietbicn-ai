-- Tạo bảng phiếu kiểm kê
CREATE TABLE IF NOT EXISTS phieu_kiem_ke (
    ma_phieu_kiem_ke INT PRIMARY KEY AUTO_INCREMENT,
    ma_nhan_vien INT NOT NULL,
    ngay_kiem_ke DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai ENUM('dang_kiem_ke', 'hoan_thanh', 'da_duyet') DEFAULT 'dang_kiem_ke',
    tong_san_pham INT NOT NULL DEFAULT 0,
    tong_chenh_lech INT NOT NULL DEFAULT 0,
    gia_tri_chenh_lech DECIMAL(15,2) NOT NULL DEFAULT 0,
    ghi_chu TEXT,
    nguoi_duyet INT,
    ngay_duyet DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ngay_kiem_ke (ngay_kiem_ke),
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng chi tiết kiểm kê
CREATE TABLE IF NOT EXISTS chi_tiet_kiem_ke (
    ma_chi_tiet_kiem_ke INT PRIMARY KEY AUTO_INCREMENT,
    ma_phieu_kiem_ke INT NOT NULL,
    ma_san_pham INT NOT NULL,
    so_luong_he_thong INT NOT NULL DEFAULT 0,
    so_luong_thuc_te INT NOT NULL DEFAULT 0,
    chenh_lech INT NOT NULL DEFAULT 0,
    gia_nhap DECIMAL(15,2) NOT NULL DEFAULT 0,
    gia_tri_chenh_lech DECIMAL(15,2) NOT NULL DEFAULT 0,
    ly_do_chenh_lech TEXT,
    ghi_chu TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_phieu_kiem_ke) REFERENCES phieu_kiem_ke(ma_phieu_kiem_ke) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham),
    INDEX idx_phieu_kiem_ke (ma_phieu_kiem_ke),
    INDEX idx_san_pham (ma_san_pham),
    INDEX idx_chenh_lech (chenh_lech)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu phiếu kiểm kê
INSERT INTO phieu_kiem_ke (ma_nhan_vien, ngay_kiem_ke, trang_thai, tong_san_pham, tong_chenh_lech, gia_tri_chenh_lech, ghi_chu) VALUES
(1, '2024-01-31 14:00:00', 'da_duyet', 10, -5, -75000000, 'Kiểm kê cuối tháng 1/2024 - Phát hiện thiếu hàng'),
(1, '2024-02-15 09:00:00', 'hoan_thanh', 15, 3, 45000000, 'Kiểm kê giữa tháng 2/2024 - Thừa hàng do nhập sai'),
(1, '2024-02-28 16:00:00', 'dang_kiem_ke', 20, 0, 0, 'Kiểm kê cuối tháng 2/2024 - Đang thực hiện');

-- Thêm dữ liệu mẫu chi tiết kiểm kê
-- Phiếu 1: Thiếu hàng
INSERT INTO chi_tiet_kiem_ke (ma_phieu_kiem_ke, ma_san_pham, so_luong_he_thong, so_luong_thuc_te, chenh_lech, gia_nhap, gia_tri_chenh_lech, ly_do_chenh_lech, ghi_chu) VALUES
(1, 1, 15, 13, -2, 24500000, -49000000, 'Hàng bị mất trong kho', 'Cần kiểm tra camera an ninh'),
(1, 2, 10, 9, -1, 21000000, -21000000, 'Hàng bị hỏng', 'Đã báo cáo bảo hiểm'),
(1, 3, 8, 6, -2, 20300000, -40600000, 'Không rõ nguyên nhân', 'Cần điều tra thêm'),
(1, 15, 5, 5, 0, 35000000, 0, 'Khớp', 'OK'),
(1, 22, 20, 18, -2, 4200000, -8400000, 'Hàng bị lỗi', 'Đã trả về NCC');

-- Phiếu 2: Thừa hàng
INSERT INTO chi_tiet_kiem_ke (ma_phieu_kiem_ke, ma_san_pham, so_luong_he_thong, so_luong_thuc_te, chenh_lech, gia_nhap, gia_tri_chenh_lech, ly_do_chenh_lech, ghi_chu) VALUES
(2, 9, 10, 12, 2, 15000000, 30000000, 'Nhập hàng chưa cập nhật hệ thống', 'Đã cập nhật lại'),
(2, 14, 15, 16, 1, 8000000, 8000000, 'Sai sót khi xuất hàng', 'Đã điều chỉnh'),
(2, 26, 20, 20, 0, 5600000, 0, 'Khớp', 'OK'),
(2, 50, 8, 8, 0, 2100000, 0, 'Khớp', 'OK');

-- Phiếu 3: Đang kiểm kê
INSERT INTO chi_tiet_kiem_ke (ma_phieu_kiem_ke, ma_san_pham, so_luong_he_thong, so_luong_thuc_te, chenh_lech, gia_nhap, gia_tri_chenh_lech, ly_do_chenh_lech, ghi_chu) VALUES
(3, 1, 13, 13, 0, 24500000, 0, '', 'Đang kiểm tra'),
(3, 2, 9, 9, 0, 21000000, 0, '', 'Đang kiểm tra'),
(3, 3, 6, 6, 0, 20300000, 0, '', 'Đang kiểm tra');
