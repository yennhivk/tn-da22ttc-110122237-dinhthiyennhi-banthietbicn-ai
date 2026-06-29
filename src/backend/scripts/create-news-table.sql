-- Tạo bảng tin tức
CREATE TABLE IF NOT EXISTS tin_tuc (
    ma_tin_tuc INT AUTO_INCREMENT PRIMARY KEY,
    tieu_de VARCHAR(500) NOT NULL,
    mo_ta_ngan VARCHAR(1000),
    noi_dung TEXT,
    hinh_anh VARCHAR(500),
    danh_muc VARCHAR(100) DEFAULT 'Công nghệ',
    tag VARCHAR(50) DEFAULT 'Tin tức',
    mau_tag VARCHAR(50) DEFAULT 'blue',
    luot_xem INT DEFAULT 0,
    noi_bat TINYINT(1) DEFAULT 0,
    trang_thai ENUM('hien_thi', 'an', 'nhap') DEFAULT 'hien_thi',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ma_tai_khoan INT,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO tin_tuc (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai) VALUES
('iPhone 16 Pro Max: Đánh giá chi tiết sau 1 tháng sử dụng', 'Trải nghiệm thực tế iPhone 16 Pro Max với chip A18 Pro, camera 48MP và nhiều tính năng AI mới...', 'Nội dung chi tiết về iPhone 16 Pro Max...', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=500&fit=crop', 'Điện thoại', 'HOT', 'red', 1, 'hien_thi'),
('Top 5 Laptop Gaming đáng mua nhất cuối năm 2024', 'Tổng hợp những laptop gaming tốt nhất với hiệu năng mạnh mẽ và giá cả hợp lý...', 'Nội dung chi tiết về laptop gaming...', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=300&h=200&fit=crop', 'Laptop', 'MỚI', 'green', 1, 'hien_thi'),
('Apple Watch Series 10: Màn hình lớn hơn, pin tốt hơn', 'Apple Watch Series 10 với nhiều cải tiến đáng giá về màn hình và thời lượng pin...', 'Nội dung chi tiết về Apple Watch...', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=200&fit=crop', 'Phụ kiện', 'REVIEW', 'blue', 1, 'hien_thi'),
('AI trong smartphone 2025: Xu hướng không thể bỏ qua', 'Trí tuệ nhân tạo đang thay đổi cách chúng ta sử dụng điện thoại thông minh...', 'Nội dung chi tiết về AI smartphone...', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop', 'Công nghệ', 'TRENDING', 'purple', 1, 'hien_thi'),
('Samsung Galaxy S25 lộ diện với thiết kế mới', 'Samsung Galaxy S25 series sẽ có thiết kế hoàn toàn mới với viền mỏng hơn...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=250&fit=crop', 'Điện thoại', 'Tin mới', 'red', 0, 'hien_thi'),
('MacBook Pro M4 chính thức ra mắt tại Việt Nam', 'Apple MacBook Pro với chip M4 mang đến hiệu năng vượt trội cho người dùng chuyên nghiệp...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop', 'Laptop', 'Tin mới', 'blue', 0, 'hien_thi'),
('Sony WH-1000XM6: Tai nghe chống ồn tốt nhất?', 'Sony WH-1000XM6 với công nghệ chống ồn tiên tiến và chất âm tuyệt vời...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop', 'Phụ kiện', 'REVIEW', 'yellow', 0, 'hien_thi'),
('RTX 5090 sẽ ra mắt vào tháng 1/2025', 'NVIDIA RTX 5090 hứa hẹn mang đến hiệu năng gaming đỉnh cao với kiến trúc mới...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=250&fit=crop', 'PC Gaming', 'Tin mới', 'green', 0, 'hien_thi'),
('Samsung Galaxy A06 5G: Pin trâu, chơi game ổn, giá hơn 3 triệu', 'Đánh giá Samsung Galaxy A06 5G sau thời gian sử dụng thực tế...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&h=300&fit=crop', 'Điện thoại', 'Tư vấn', 'blue', 0, 'hien_thi'),
('Mua TV Samsung nhận trọn bộ gói giải trí cực đã', 'Khi mua TV Samsung đời 2024-2025, bạn được tặng kèm trọn bộ gói giải trí...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=300&fit=crop', 'TV', 'Khuyến mãi', 'purple', 0, 'hien_thi'),
('Samsung Galaxy S24 Ultra: Đỉnh cao công nghệ với AI Galaxy', 'Samsung Galaxy S24 Ultra mang đến trải nghiệm hoàn toàn mới với AI Galaxy...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=300&fit=crop', 'Điện thoại', 'Đánh giá', 'green', 0, 'hien_thi'),
('Galaxy Z Flip6: Điện thoại gập thời trang, nhỏ gọn và mạnh mẽ', 'Samsung Galaxy Z Flip6 là sự kết hợp hoàn hảo giữa thiết kế thời trang...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1591122947157-26bad3a117d2?w=500&h=300&fit=crop', 'Điện thoại', 'HOT', 'red', 0, 'hien_thi'),
('AirPods Pro Gen 2: Chất lượng âm thanh và chống ồn tuyệt vời', 'AirPods Pro thế hệ 2 với chip H2 mới mang đến chất lượng âm thanh vượt trội...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=500&h=300&fit=crop', 'Phụ kiện', 'REVIEW', 'yellow', 0, 'hien_thi'),
('Xu hướng công nghệ 2025: AI và IoT thống trị thị trường', 'Trí tuệ nhân tạo và Internet vạn vật sẽ là hai xu hướng công nghệ lớn nhất...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500&h=300&fit=crop', 'Công nghệ', 'TRENDING', 'orange', 0, 'hien_thi');

-- Hiển thị kết quả
SELECT 'Đã tạo bảng tin_tuc và thêm dữ liệu mẫu thành công!' as message;
SELECT COUNT(*) as 'Số tin tức' FROM tin_tuc;
