-- =========================================
-- BẢNG HỆ THỐNG GỢI Ý SẢN PHẨM
-- =========================================

USE CSDL_DoAnCN;

-- 1. Bảng lịch sử xem sản phẩm
CREATE TABLE IF NOT EXISTS lich_su_xem_san_pham (
    ma_lich_su INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ma_san_pham INT,
    thoi_gian_xem DATETIME DEFAULT CURRENT_TIMESTAMP,
    thoi_gian_xem_giay INT DEFAULT 0,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    INDEX idx_tai_khoan (ma_tai_khoan),
    INDEX idx_san_pham (ma_san_pham),
    INDEX idx_thoi_gian (thoi_gian_xem)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Bảng lịch sử tìm kiếm (mở rộng từ bảng có sẵn)
-- Đã có bảng du_lieu_tim_kiem, không cần tạo mới

-- 3. Bảng tương tác người dùng (click, add to cart, purchase)
CREATE TABLE IF NOT EXISTS tuong_tac_nguoi_dung (
    ma_tuong_tac INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ma_san_pham INT,
    loai_tuong_tac ENUM('xem','them_gio_hang','mua','danh_gia','yeu_thich') NOT NULL,
    diem_tuong_tac DECIMAL(3,2) DEFAULT 1.0,
    thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    INDEX idx_tai_khoan_tuong_tac (ma_tai_khoan),
    INDEX idx_san_pham_tuong_tac (ma_san_pham),
    INDEX idx_loai_tuong_tac (loai_tuong_tac)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Bảng ma trận tương đồng sản phẩm (cache)
CREATE TABLE IF NOT EXISTS ma_tran_tuong_dong (
    ma_tuong_dong INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham_1 INT,
    ma_san_pham_2 INT,
    do_tuong_dong DECIMAL(5,4),
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_san_pham_1) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham_2) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    UNIQUE KEY unique_pair (ma_san_pham_1, ma_san_pham_2),
    INDEX idx_sp1 (ma_san_pham_1),
    INDEX idx_sp2 (ma_san_pham_2)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Bảng sản phẩm yêu thích
CREATE TABLE IF NOT EXISTS san_pham_yeu_thich (
    ma_yeu_thich INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ma_san_pham INT,
    ngay_them DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (ma_tai_khoan, ma_san_pham),
    INDEX idx_tai_khoan_yeu_thich (ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu cho testing
INSERT INTO lich_su_xem_san_pham (ma_tai_khoan, ma_san_pham, thoi_gian_xem_giay) VALUES
(2, 1, 45),
(2, 2, 30),
(2, 5, 20),
(3, 1, 60),
(3, 3, 40),
(3, 5, 25);

INSERT INTO tuong_tac_nguoi_dung (ma_tai_khoan, ma_san_pham, loai_tuong_tac, diem_tuong_tac) VALUES
(2, 1, 'mua', 5.0),
(2, 6, 'mua', 5.0),
(2, 5, 'xem', 1.0),
(3, 5, 'them_gio_hang', 3.0),
(3, 1, 'xem', 1.0),
(3, 3, 'xem', 1.0);

INSERT INTO san_pham_yeu_thich (ma_tai_khoan, ma_san_pham) VALUES
(2, 1),
(2, 3),
(3, 5);
