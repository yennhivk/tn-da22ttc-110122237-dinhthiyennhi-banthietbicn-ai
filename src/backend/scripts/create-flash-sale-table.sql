-- Tạo bảng flash_sale để quản lý sản phẩm giờ vàng - giá sốc
CREATE TABLE IF NOT EXISTS flash_sale (
    ma_flash_sale INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    gia_goc DECIMAL(15,2) NOT NULL,
    gia_sale DECIMAL(15,2) NOT NULL,
    phan_tram_giam INT NOT NULL,
    so_luong_gioi_han INT DEFAULT NULL,
    so_luong_da_ban INT DEFAULT 0,
    thoi_gian_bat_dau DATETIME NOT NULL,
    thoi_gian_ket_thuc DATETIME NOT NULL,
    trang_thai ENUM('cho_dien_ra', 'dang_dien_ra', 'ket_thuc') DEFAULT 'cho_dien_ra',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nguoi_tao VARCHAR(100),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE,
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_thoi_gian (thoi_gian_bat_dau, thoi_gian_ket_thuc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
