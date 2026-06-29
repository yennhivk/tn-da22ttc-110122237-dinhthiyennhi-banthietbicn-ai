-- Tạo đơn hàng mẫu để test
-- Chạy script này trong MySQL Workbench hoặc command line

-- Lấy ma_tai_khoan của admin (hoặc bất kỳ user nào)
SET @user_id = (SELECT ma_tai_khoan FROM tai_khoan LIMIT 1);

-- Nếu không có user, tạo user test
INSERT IGNORE INTO tai_khoan (ma_tai_khoan, ten_dang_nhap, email, vai_tro, trang_thai)
VALUES (999, 'khach_test', 'khach@test.com', 'khach_hang', 1);

SET @user_id = COALESCE(@user_id, 999);

-- Tạo 5 đơn hàng mẫu với các trạng thái khác nhau
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai, dia_chi_giao, so_dien_thoai, ghi_chu, ngay_dat) VALUES
(@user_id, 25990000, 'cho_xac_nhan', '123 Nguyễn Văn A, Quận 1, TP.HCM', '0901234567', 'Giao giờ hành chính', NOW()),
(@user_id, 15500000, 'da_xac_nhan', '456 Lê Văn B, Quận 3, TP.HCM', '0912345678', 'Gọi trước khi giao', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(@user_id, 34900000, 'dang_giao', '789 Trần Văn C, Quận 7, TP.HCM', '0923456789', 'Shipper đang trên đường', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(@user_id, 8990000, 'da_giao', '321 Phạm Văn D, Quận Bình Thạnh, TP.HCM', '0934567890', 'Đã nhận hàng, cảm ơn shop', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(@user_id, 12000000, 'da_huy', '654 Hoàng Văn E, Quận Tân Bình, TP.HCM', '0945678901', 'Khách hủy do đổi ý', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- Kiểm tra kết quả
SELECT 'Đã tạo 5 đơn hàng mẫu!' AS message;
SELECT * FROM don_hang ORDER BY ma_don_hang DESC LIMIT 5;
