
-- Tạo bảng bài viết
CREATE TABLE IF NOT EXISTS bai_viet (
    ma_bai_viet INT AUTO_INCREMENT PRIMARY KEY,
    tieu_de VARCHAR(500) NOT NULL,
    mo_ta_ngan TEXT,
    noi_dung LONGTEXT,
    hinh_anh VARCHAR(500),
    danh_muc ENUM('huong_dan', 'danh_gia', 'meo_vat', 'so_sanh') DEFAULT 'huong_dan',
    tac_gia VARCHAR(100) DEFAULT 'Admin',
    tags VARCHAR(255),
    luot_xem INT DEFAULT 0,
    trang_thai ENUM('xuat_ban', 'nhap', 'an') DEFAULT 'xuat_ban',
    ma_tai_khoan INT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO bai_viet (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai) VALUES
('Hướng dẫn chọn mua laptop phù hợp năm 2024', 'Bài viết hướng dẫn chi tiết cách chọn laptop phù hợp với nhu cầu sử dụng', 'Nội dung chi tiết về cách chọn laptop...', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'huong_dan', 'Admin', 'laptop, mua sắm, hướng dẫn', 'xuat_ban'),
('Đánh giá iPhone 15 Pro Max sau 3 tháng sử dụng', 'Review chi tiết iPhone 15 Pro Max với những trải nghiệm thực tế', 'Nội dung đánh giá chi tiết...', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800', 'danh_gia', 'Admin', 'iphone, review, apple', 'xuat_ban'),
('10 mẹo tiết kiệm pin cho điện thoại Android', 'Những mẹo đơn giản giúp kéo dài thời lượng pin điện thoại', 'Nội dung các mẹo tiết kiệm pin...', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'meo_vat', 'Admin', 'android, pin, mẹo vặt', 'xuat_ban'),
('So sánh MacBook Air M3 vs Dell XPS 15', 'So sánh chi tiết 2 dòng laptop cao cấp phổ biến nhất', 'Nội dung so sánh chi tiết...', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'so_sanh', 'Admin', 'macbook, dell, so sánh', 'xuat_ban'),
('Cách vệ sinh laptop đúng cách tại nhà', 'Hướng dẫn vệ sinh laptop an toàn và hiệu quả', 'Nội dung hướng dẫn vệ sinh...', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', 'huong_dan', 'Admin', 'laptop, vệ sinh, bảo dưỡng', 'xuat_ban');

SELECT 'Đã tạo bảng bai_viet và thêm dữ liệu mẫu!' as Result;
