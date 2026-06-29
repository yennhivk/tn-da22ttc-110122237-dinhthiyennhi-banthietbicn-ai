-- Cập nhật bảng tin_tuc để thêm các cột mới
-- Đổi tên cột nếu cần thiết và thêm các cột còn thiếu

-- Kiểm tra và đổi tên cột ma_tin thành ma_tin_tuc
ALTER TABLE tin_tuc 
CHANGE COLUMN ma_tin ma_tin_tuc INT NOT NULL AUTO_INCREMENT;

-- Đổi tên anh_dai_dien thành hinh_anh
ALTER TABLE tin_tuc 
CHANGE COLUMN anh_dai_dien hinh_anh VARCHAR(500) DEFAULT NULL;

-- Đổi tên ngay_dang thành ngay_tao
ALTER TABLE tin_tuc 
CHANGE COLUMN ngay_dang ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Thêm cột mo_ta_ngan
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS mo_ta_ngan VARCHAR(1000) AFTER tieu_de;

-- Thêm cột danh_muc
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS danh_muc VARCHAR(100) DEFAULT 'Công nghệ' AFTER hinh_anh;

-- Thêm cột tag
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS tag VARCHAR(50) DEFAULT 'Tin tức' AFTER danh_muc;

-- Thêm cột mau_tag
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS mau_tag VARCHAR(50) DEFAULT 'blue' AFTER tag;

-- Thêm cột luot_xem
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS luot_xem INT DEFAULT 0 AFTER mau_tag;

-- Thêm cột noi_bat
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS noi_bat TINYINT(1) DEFAULT 0 AFTER luot_xem;

-- Thêm cột ngay_cap_nhat
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER ngay_tao;

-- Thêm cột ma_tai_khoan
ALTER TABLE tin_tuc 
ADD COLUMN IF NOT EXISTS ma_tai_khoan INT AFTER ngay_cap_nhat;

-- Cập nhật dữ liệu mẫu hiện có
UPDATE tin_tuc SET 
    mo_ta_ngan = LEFT(noi_dung, 200),
    danh_muc = 'Công nghệ',
    tag = 'Tin tức',
    mau_tag = 'blue',
    luot_xem = FLOOR(RAND() * 1000),
    noi_bat = 0
WHERE mo_ta_ngan IS NULL;

-- Thêm thêm tin tức mẫu
INSERT INTO tin_tuc (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai) VALUES
('iPhone 16 Pro Max: Đánh giá chi tiết sau 1 tháng sử dụng', 'Trải nghiệm thực tế iPhone 16 Pro Max với chip A18 Pro, camera 48MP và nhiều tính năng AI mới...', 'Nội dung chi tiết về iPhone 16 Pro Max...', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=500&fit=crop', 'Điện thoại', 'HOT', 'red', 1, 'hien_thi'),
('Top 5 Laptop Gaming đáng mua nhất cuối năm 2024', 'Tổng hợp những laptop gaming tốt nhất với hiệu năng mạnh mẽ và giá cả hợp lý...', 'Nội dung chi tiết về laptop gaming...', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=300&h=200&fit=crop', 'Laptop', 'MỚI', 'green', 1, 'hien_thi'),
('Apple Watch Series 10: Màn hình lớn hơn, pin tốt hơn', 'Apple Watch Series 10 với nhiều cải tiến đáng giá về màn hình và thời lượng pin...', 'Nội dung chi tiết về Apple Watch...', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=200&fit=crop', 'Phụ kiện', 'REVIEW', 'blue', 1, 'hien_thi'),
('AI trong smartphone 2025: Xu hướng không thể bỏ qua', 'Trí tuệ nhân tạo đang thay đổi cách chúng ta sử dụng điện thoại thông minh...', 'Nội dung chi tiết về AI smartphone...', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop', 'Công nghệ', 'TRENDING', 'purple', 1, 'hien_thi');

SELECT 'Đã cập nhật bảng tin_tuc thành công!' as message;
SELECT COUNT(*) as 'Số tin tức' FROM tin_tuc;
