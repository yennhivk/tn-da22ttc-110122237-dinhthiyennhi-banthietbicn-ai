-- Tạo đơn hàng mẫu để test biểu đồ
-- Chạy script này trong MySQL

-- Xóa đơn hàng cũ (tùy chọn)
-- DELETE FROM chi_tiet_don_hang;
-- DELETE FROM don_hang;

-- Lấy ma_tai_khoan đầu tiên
SET @user_id = (SELECT ma_tai_khoan FROM tai_khoan WHERE vai_tro = 'khach_hang' LIMIT 1);

-- Nếu không có user, dùng user admin
SET @user_id = COALESCE(@user_id, (SELECT ma_tai_khoan FROM tai_khoan LIMIT 1));

-- Tạo đơn hàng mẫu với các trạng thái khác nhau
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES 
-- Đơn đang xử lý
(@user_id, 25990000, 'dang_xu_ly', '123 Nguyễn Văn A, Q.1, TP.HCM', NOW()),
(@user_id, 15500000, 'dang_xu_ly', '456 Lê Văn B, Q.3, TP.HCM', NOW() - INTERVAL 1 DAY),
(@user_id, 8990000, 'dang_xu_ly', '789 Trần Văn C, Q.7, TP.HCM', NOW() - INTERVAL 2 DAY),

-- Đơn đang giao
(@user_id, 34900000, 'dang_giao', '321 Phạm Văn D, Q.Bình Thạnh, TP.HCM', NOW() - INTERVAL 3 DAY),
(@user_id, 12000000, 'dang_giao', '654 Hoàng Văn E, Q.Tân Bình, TP.HCM', NOW() - INTERVAL 4 DAY),

-- Đơn hoàn thành
(@user_id, 45000000, 'hoan_thanh', '111 Nguyễn Trãi, Q.5, TP.HCM', NOW() - INTERVAL 5 DAY),
(@user_id, 22500000, 'hoan_thanh', '222 Lý Thường Kiệt, Q.10, TP.HCM', NOW() - INTERVAL 10 DAY),
(@user_id, 18900000, 'hoan_thanh', '333 Cách Mạng Tháng 8, Q.3, TP.HCM', NOW() - INTERVAL 15 DAY),
(@user_id, 67000000, 'hoan_thanh', '444 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', NOW() - INTERVAL 20 DAY),
(@user_id, 31500000, 'hoan_thanh', '555 Võ Văn Tần, Q.3, TP.HCM', NOW() - INTERVAL 25 DAY),

-- Đơn đã hủy
(@user_id, 9900000, 'da_huy', '666 Hai Bà Trưng, Q.1, TP.HCM', NOW() - INTERVAL 7 DAY),
(@user_id, 5500000, 'da_huy', '777 Pasteur, Q.3, TP.HCM', NOW() - INTERVAL 12 DAY);

-- Thêm đơn hàng các tháng trước để có dữ liệu biểu đồ theo tháng
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES 
(@user_id, 28000000, 'hoan_thanh', 'Địa chỉ tháng 11', NOW() - INTERVAL 1 MONTH),
(@user_id, 35000000, 'hoan_thanh', 'Địa chỉ tháng 11', NOW() - INTERVAL 1 MONTH - INTERVAL 5 DAY),
(@user_id, 42000000, 'hoan_thanh', 'Địa chỉ tháng 10', NOW() - INTERVAL 2 MONTH),
(@user_id, 19000000, 'hoan_thanh', 'Địa chỉ tháng 10', NOW() - INTERVAL 2 MONTH - INTERVAL 10 DAY),
(@user_id, 55000000, 'hoan_thanh', 'Địa chỉ tháng 9', NOW() - INTERVAL 3 MONTH),
(@user_id, 38000000, 'hoan_thanh', 'Địa chỉ tháng 8', NOW() - INTERVAL 4 MONTH),
(@user_id, 27000000, 'hoan_thanh', 'Địa chỉ tháng 7', NOW() - INTERVAL 5 MONTH);

-- Thêm dữ liệu thanh toán cho các đơn hàng vừa tạo
-- Lấy các đơn hàng chưa có trong bảng thanh_toan và thêm phương thức thanh toán ngẫu nhiên
INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
SELECT dh.ma_don_hang, 
       ELT(FLOOR(1 + RAND() * 4), 'COD', 'Momo', 'Ngan_Hang', 'ZaloPay'),
       dh.tong_tien,
       CONCAT('GD', dh.ma_don_hang, UNIX_TIMESTAMP())
FROM don_hang dh
WHERE dh.ma_don_hang NOT IN (SELECT ma_don_hang FROM thanh_toan WHERE ma_don_hang IS NOT NULL);

SELECT 'Đã tạo đơn hàng mẫu!' as Result;
SELECT trang_thai_don_hang, COUNT(*) as so_luong, SUM(tong_tien) as tong_doanh_thu 
FROM don_hang 
GROUP BY trang_thai_don_hang;
