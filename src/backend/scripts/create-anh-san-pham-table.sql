-- Tạo bảng anh_san_pham nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS anh_san_pham (
    ma_anh INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    duong_dan_anh VARCHAR(500) NOT NULL,
    la_anh_chinh TINYINT(1) DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra bảng đã tạo
DESCRIBE anh_san_pham;

-- Nếu bảng đã tồn tại nhưng thiếu cột, thêm cột
-- ALTER TABLE anh_san_pham ADD COLUMN la_anh_chinh TINYINT(1) DEFAULT 0;
