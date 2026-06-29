-- Tạo bảng thông báo
CREATE TABLE IF NOT EXISTS thong_bao (
    ma_thong_bao INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT DEFAULT NULL COMMENT 'NULL = thông báo cho tất cả người dùng',
    loai_thong_bao ENUM('order', 'promotion', 'system', 'news') DEFAULT 'system',
    tieu_de VARCHAR(255) NOT NULL,
    noi_dung TEXT,
    duong_dan VARCHAR(255) DEFAULT NULL COMMENT 'Link khi click vào thông báo',
    da_doc TINYINT(1) DEFAULT 0,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm một số thông báo mẫu
INSERT INTO thong_bao (ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan, da_doc) VALUES
(NULL, 'promotion', 'Khuyến mãi Black Friday!', 'Giảm 20% cho tất cả đơn hàng trên 5 triệu. Mã: BLACK2025', 'promotions.html', 0),
(NULL, 'promotion', 'Giáng sinh rực rỡ!', 'Giảm 15% cho phụ kiện. Mã: XMAS2025', 'promotions.html', 0),
(NULL, 'system', 'Chào mừng bạn đến với Yến Nhi Tech!', 'Cảm ơn bạn đã đăng ký tài khoản. Khám phá ngay các sản phẩm công nghệ hàng đầu.', NULL, 0);
