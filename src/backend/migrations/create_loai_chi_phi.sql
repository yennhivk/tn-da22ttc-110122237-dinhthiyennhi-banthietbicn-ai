-- Tạo bảng loại chi phí
CREATE TABLE IF NOT EXISTS loai_chi_phi (
    ma_loai VARCHAR(50) PRIMARY KEY,
    ten_hien_thi VARCHAR(100) NOT NULL,
    phan_nhom ENUM('co_dinh', 'phat_sinh', 'marketing', 'van_hanh') NOT NULL,
    icon VARCHAR(10) DEFAULT '📋',
    mo_ta TEXT,
    mau_sac VARCHAR(20) DEFAULT 'blue',
    trang_thai TINYINT(1) DEFAULT 1,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phan_nhom (phan_nhom),
    INDEX idx_trang_thai (trang_thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO loai_chi_phi (ma_loai, ten_hien_thi, phan_nhom, icon, mo_ta, mau_sac, trang_thai) VALUES
-- Chi phí cố định
('tien_dien', 'Tiền điện', 'co_dinh', '⚡', 'Chi phí điện năng hàng tháng', 'yellow', 1),
('tien_nuoc', 'Tiền nước', 'co_dinh', '💧', 'Chi phí nước sinh hoạt hàng tháng', 'blue', 1),
('thue_mat_bang', 'Thuê mặt bằng', 'co_dinh', '🏢', 'Chi phí thuê cửa hàng/văn phòng', 'purple', 1),
('luong_nhan_vien', 'Lương nhân viên', 'co_dinh', '👨‍💼', 'Lương và phụ cấp nhân viên', 'green', 1),

-- Chi phí phát sinh
('van_chuyen', 'Vận chuyển', 'phat_sinh', '🚚', 'Chi phí giao hàng và vận chuyển', 'orange', 1),
('bao_tri', 'Bảo trì', 'phat_sinh', '🔧', 'Sửa chữa và bảo trì thiết bị', 'red', 1),
('van_phong_pham', 'Văn phòng phẩm', 'phat_sinh', '📎', 'Giấy tờ, bút, dụng cụ văn phòng', 'gray', 1),
('phat_sinh_khac', 'Chi phí phát sinh khác', 'phat_sinh', '💰', 'Các chi phí phát sinh không thuộc nhóm khác', 'pink', 1),

-- Marketing
('quang_cao_online', 'Quảng cáo online', 'marketing', '📢', 'Facebook Ads, Google Ads, TikTok Ads', 'blue', 1),
('quang_cao_offline', 'Quảng cáo offline', 'marketing', '📰', 'Băng rôn, tờ rơi, pano', 'orange', 1),
('khuyen_mai', 'Khuyến mãi', 'marketing', '🎁', 'Chi phí chương trình khuyến mãi', 'red', 1),

-- Vận hành
('dien_thoai_internet', 'Điện thoại & Internet', 'van_hanh', '📞', 'Cước điện thoại và internet', 'blue', 1),
('bao_hiem', 'Bảo hiểm', 'van_hanh', '🛡️', 'Bảo hiểm cửa hàng, hàng hóa', 'green', 1),
('thue_phi', 'Thuế & Phí', 'van_hanh', '💳', 'Thuế, phí, lệ phí', 'purple', 1),
('dao_tao', 'Đào tạo', 'van_hanh', '📚', 'Chi phí đào tạo nhân viên', 'yellow', 1);
