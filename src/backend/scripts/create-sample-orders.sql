-- Tạo đơn hàng mẫu để test
-- Chạy script này trong MySQL

-- Kiểm tra xem có tài khoản nào không
-- Nếu chưa có, tạo tài khoản test
INSERT IGNORE INTO tai_khoan (ma_tai_khoan, ten_dang_nhap, email, mat_khau, vai_tro, trang_thai)
VALUES (100, 'khach_test', 'khach@test.com', '$2b$10$abcdefghijklmnopqrstuv', 'khach_hang', 1);

-- Tạo đơn hàng mẫu với các trạng thái khác nhau
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai, dia_chi_giao, so_dien_thoai, ghi_chu, ngay_dat)
VALUES 
(100, 25990000, 'cho_xac_nhan', '123 Nguyễn Văn A, Q.1, TP.HCM', '0901234567', 'Giao giờ hành chính', NOW()),
(100, 15500000, 'da_xac_nhan', '456 Lê Văn B, Q.3, TP.HCM', '0912345678', 'Gọi trước khi giao', NOW() - INTERVAL 1 DAY),
(100, 34900000, 'dang_giao', '789 Trần Văn C, Q.7, TP.HCM', '0923456789', NULL, NOW() - INTERVAL 2 DAY),
(100, 8990000, 'da_giao', '321 Phạm Văn D, Q.Bình Thạnh, TP.HCM', '0934567890', 'Đã nhận hàng', NOW() - INTERVAL 5 DAY),
(100, 12000000, 'da_huy', '654 Hoàng Văn E, Q.Tân Bình, TP.HCM', '0945678901', 'Khách hủy đơn', NOW() - INTERVAL 3 DAY);

-- Lấy ID các đơn hàng vừa tạo và thêm chi tiết
-- Giả sử có sản phẩm với ma_san_pham = 1, 2, 3
-- Nếu không có sản phẩm, bạn cần tạo sản phẩm trước

-- Kiểm tra sản phẩm tồn tại
SELECT ma_san_pham, ten_san_pham FROM san_pham LIMIT 5;

-- Thêm chi tiết đơn hàng (điều chỉnh ma_don_hang và ma_san_pham theo database của bạn)
-- INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia)
-- VALUES 
-- (1, 1, 1, 25990000),
-- (2, 2, 1, 15500000),
-- (3, 1, 1, 34900000),
-- (4, 3, 1, 8990000),
-- (5, 2, 1, 12000000);

SELECT 'Đã tạo 5 đơn hàng mẫu!' as message;
SELECT * FROM don_hang ORDER BY ma_don_hang DESC LIMIT 5;
