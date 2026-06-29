-- Tạo bảng user_interactions cho ML recommendation system
USE CSDL_DoAnCN;

CREATE TABLE IF NOT EXISTS user_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    MaND INT NOT NULL,
    MaSP INT NOT NULL,
    LoaiTuongTac VARCHAR(50) NOT NULL,
    GiaTri INT DEFAULT 1,
    ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (MaND),
    INDEX idx_product (MaSP),
    INDEX idx_time (ThoiGian),
    INDEX idx_action (LoaiTuongTac)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert dữ liệu mẫu từ bảng cũ (nếu có)
INSERT IGNORE INTO user_interactions (MaND, MaSP, LoaiTuongTac, GiaTri, ThoiGian)
SELECT ma_tai_khoan, ma_san_pham, loai_tuong_tac, diem_tuong_tac, thoi_gian
FROM tuong_tac_nguoi_dung
WHERE EXISTS (SELECT 1 FROM tuong_tac_nguoi_dung LIMIT 1);

-- Thêm dữ liệu mẫu nếu chưa có
INSERT IGNORE INTO user_interactions (MaND, MaSP, LoaiTuongTac, GiaTri) VALUES
(1, 1, 'view', 1),
(1, 2, 'view', 1),
(1, 3, 'purchase', 2),
(2, 1, 'view', 1),
(2, 2, 'cart', 1),
(2, 4, 'purchase', 1),
(3, 1, 'view', 1),
(3, 5, 'cart', 1);
