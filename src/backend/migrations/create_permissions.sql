-- Tạo bảng phân quyền cho nhân viên
CREATE TABLE IF NOT EXISTS phan_quyen (
    ma_phan_quyen INT AUTO_INCREMENT PRIMARY KEY,
    ma_nhan_vien INT NOT NULL,
    quyen JSON NOT NULL COMMENT 'JSON object chứa các quyền: {view_orders: true, create_orders: false, ...}',
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    nguoi_cap_nhat VARCHAR(100),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien) ON DELETE CASCADE,
    UNIQUE KEY unique_employee (ma_nhan_vien)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng log hoạt động
CREATE TABLE IF NOT EXISTS log_hoat_dong (
    ma_log INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ma_nhan_vien INT,
    hanh_dong VARCHAR(100) NOT NULL COMMENT 'Hành động thực hiện: update_permissions, create_order, delete_product...',
    doi_tuong VARCHAR(50) COMMENT 'Đối tượng: employee, product, order...',
    ma_doi_tuong INT COMMENT 'ID của đối tượng',
    mo_ta TEXT COMMENT 'Mô tả chi tiết hành động',
    ip_address VARCHAR(45),
    user_agent TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tai_khoan (ma_tai_khoan),
    INDEX idx_nhan_vien (ma_nhan_vien),
    INDEX idx_hanh_dong (hanh_dong),
    INDEX idx_ngay_tao (ngay_tao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm comment cho bảng
ALTER TABLE phan_quyen COMMENT = 'Bảng quản lý phân quyền cho nhân viên';
ALTER TABLE log_hoat_dong COMMENT = 'Bảng ghi log hoạt động của hệ thống';
