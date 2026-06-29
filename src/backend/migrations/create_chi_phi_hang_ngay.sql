-- Tạo bảng chi phí hàng ngày
CREATE TABLE IF NOT EXISTS chi_phi_hang_ngay (
    ma_chi_phi INT PRIMARY KEY AUTO_INCREMENT,
    ngay_chi DATE NOT NULL,
    loai_chi_phi VARCHAR(50) NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    mo_ta TEXT,
    nguoi_tao VARCHAR(100),
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ngay_chi (ngay_chi),
    INDEX idx_loai_chi_phi (loai_chi_phi),
    FOREIGN KEY (loai_chi_phi) REFERENCES loai_chi_phi(ma_loai) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO chi_phi_hang_ngay (ngay_chi, loai_chi_phi, so_tien, mo_ta, nguoi_tao) VALUES
('2026-05-01', 'tien_dien', 2500000, 'Hóa đơn tiền điện tháng 4/2026', 'admin'),
('2026-05-01', 'tien_nuoc', 350000, 'Hóa đơn tiền nước tháng 4/2026', 'admin'),
('2026-05-01', 'thue_mat_bang', 15000000, 'Tiền thuê mặt bằng tháng 5/2026', 'admin'),
('2026-05-05', 'van_chuyen', 450000, 'Chi phí vận chuyển hàng từ nhà cung cấp', 'admin'),
('2026-05-07', 'van_phong_pham', 280000, 'Mua giấy A4, bút, kẹp tài liệu', 'admin'),
('2026-05-08', 'quang_cao_online', 1200000, 'Quảng cáo Facebook Ads', 'admin'),
('2026-05-10', 'phat_sinh_khac', 150000, 'Sửa chữa máy in', 'admin'),
('2026-05-11', 'van_chuyen', 380000, 'Giao hàng cho khách', 'admin'),
('2026-05-12', 'bao_tri', 500000, 'Bảo trì hệ thống điều hòa', 'admin');
