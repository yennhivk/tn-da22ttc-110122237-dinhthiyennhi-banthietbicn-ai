-- Thêm cột công nợ vào bảng nhà cung cấp
ALTER TABLE nha_cung_cap 
ADD COLUMN IF NOT EXISTS tong_cong_no DECIMAL(15,2) DEFAULT 0 COMMENT 'Tổng công nợ hiện tại',
ADD COLUMN IF NOT EXISTS han_thanh_toan INT DEFAULT 30 COMMENT 'Hạn thanh toán (ngày)',
ADD COLUMN IF NOT EXISTS ngay_cap_nhat_cong_no DATETIME COMMENT 'Ngày cập nhật công nợ gần nhất';

-- Tạo bảng lịch sử công nợ nhà cung cấp
CREATE TABLE IF NOT EXISTS lich_su_cong_no_ncc (
    ma_lich_su INT PRIMARY KEY AUTO_INCREMENT,
    ma_nha_cung_cap INT NOT NULL,
    loai_giao_dich ENUM('nhap_hang', 'thanh_toan', 'dieu_chinh') NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    cong_no_truoc DECIMAL(15,2) NOT NULL DEFAULT 0,
    cong_no_sau DECIMAL(15,2) NOT NULL DEFAULT 0,
    ma_phieu_nhap INT,
    ghi_chu TEXT,
    nguoi_thuc_hien INT,
    ngay_giao_dich DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap) ON DELETE CASCADE,
    FOREIGN KEY (ma_phieu_nhap) REFERENCES phieu_nhap_hang(ma_phieu_nhap) ON DELETE SET NULL,
    INDEX idx_nha_cung_cap (ma_nha_cung_cap),
    INDEX idx_ngay_giao_dich (ngay_giao_dich)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu lịch sử công nợ
INSERT INTO lich_su_cong_no_ncc (ma_nha_cung_cap, loai_giao_dich, so_tien, cong_no_truoc, cong_no_sau, ma_phieu_nhap, ghi_chu, nguoi_thuc_hien, ngay_giao_dich) VALUES
(1, 'nhap_hang', 875000000, 0, 875000000, 1, 'Nhập hàng đợt 1', 1, '2024-01-15 09:30:00'),
(1, 'thanh_toan', 500000000, 875000000, 375000000, NULL, 'Thanh toán một phần', 1, '2024-01-20 14:00:00'),
(2, 'nhap_hang', 450000000, 0, 450000000, 2, 'Nhập hàng Samsung', 1, '2024-01-20 10:15:00'),
(2, 'thanh_toan', 450000000, 450000000, 0, NULL, 'Thanh toán đủ', 1, '2024-01-25 16:00:00'),
(3, 'nhap_hang', 320000000, 0, 320000000, 3, 'Nhập hàng Xiaomi', 1, '2024-02-01 14:20:00'),
(1, 'thanh_toan', 375000000, 375000000, 0, NULL, 'Thanh toán hết nợ', 1, '2024-02-05 10:00:00'),
(4, 'nhap_hang', 580000000, 0, 580000000, 4, 'Nhập hàng phụ kiện', 1, '2024-02-10 11:00:00'),
(5, 'nhap_hang', 280000000, 0, 280000000, 5, 'Nhập hàng laptop', 1, '2024-02-15 15:45:00');

-- Cập nhật tổng công nợ hiện tại cho các nhà cung cấp
UPDATE nha_cung_cap ncc
SET tong_cong_no = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN loai_giao_dich = 'nhap_hang' THEN so_tien
            WHEN loai_giao_dich = 'thanh_toan' THEN -so_tien
            WHEN loai_giao_dich = 'dieu_chinh' THEN so_tien
            ELSE 0
        END
    ), 0)
    FROM lich_su_cong_no_ncc
    WHERE ma_nha_cung_cap = ncc.ma_nha_cung_cap
),
ngay_cap_nhat_cong_no = NOW();
