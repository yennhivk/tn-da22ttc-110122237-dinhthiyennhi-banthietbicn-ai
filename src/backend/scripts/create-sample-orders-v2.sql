-- Script tạo đơn hàng mẫu cho user đang đăng nhập
-- Chạy script này trong MySQL Workbench hoặc phpMyAdmin

USE CSDL_DoAnCN;

-- Xem danh sách tài khoản khách hàng
SELECT ma_tai_khoan, ten_dang_nhap, email FROM tai_khoan WHERE vai_tro = 'khach_hang';

-- Xem danh sách sản phẩm
SELECT ma_san_pham, ten_san_pham, gia FROM san_pham LIMIT 10;

-- =============================================
-- THÊM ĐƠN HÀNG MẪU
-- Thay đổi ma_tai_khoan theo user bạn muốn test
-- =============================================

-- Đơn hàng 1: Đang xử lý
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES (2, 33990000, 'cho_xu_ly', 'dang_xu_ly', '123 Nguyễn Văn A, Quận 1, TP.HCM', NOW());

SET @order1 = LAST_INSERT_ID();

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES (@order1, 1, 1, 33990000);

-- Đơn hàng 2: Đang giao
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES (2, 35980000, 'da_thanh_toan', 'dang_giao', '456 Lê Văn B, Quận 3, TP.HCM', NOW() - INTERVAL 2 DAY);

SET @order2 = LAST_INSERT_ID();

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES 
(@order2, 2, 1, 29990000),
(@order2, 6, 1, 5990000);

-- Đơn hàng 3: Hoàn thành
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES (2, 28990000, 'da_thanh_toan', 'hoan_thanh', '789 Trần Văn C, Quận 7, TP.HCM', NOW() - INTERVAL 7 DAY);

SET @order3 = LAST_INSERT_ID();

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES (@order3, 3, 1, 28990000);

-- Đơn hàng 4: Đã hủy
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES (2, 5990000, 'cho_xu_ly', 'da_huy', '321 Phạm Văn D, Quận Bình Thạnh, TP.HCM', NOW() - INTERVAL 5 DAY);

SET @order4 = LAST_INSERT_ID();

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES (@order4, 5, 1, 5990000);

-- Đơn hàng 5: Đang xử lý với nhiều sản phẩm
INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
VALUES (2, 40970000, 'cho_xu_ly', 'dang_xu_ly', '654 Hoàng Văn E, Quận Tân Bình, TP.HCM', NOW() - INTERVAL 1 DAY);

SET @order5 = LAST_INSERT_ID();

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES 
(@order5, 1, 1, 33990000),
(@order5, 5, 1, 5990000),
(@order5, 6, 1, 990000);

-- =============================================
-- KIỂM TRA KẾT QUẢ
-- =============================================
SELECT 'Đã tạo 5 đơn hàng mẫu!' as message;

SELECT dh.ma_don_hang, dh.tong_tien, dh.trang_thai_don_hang, dh.dia_chi_giao_hang, dh.ngay_tao
FROM don_hang dh
WHERE dh.ma_tai_khoan = 2
ORDER BY dh.ngay_tao DESC;

SELECT ctdh.ma_don_hang, sp.ten_san_pham, ctdh.so_luong, ctdh.gia_ban
FROM chi_tiet_don_hang ctdh
JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
WHERE dh.ma_tai_khoan = 2
ORDER BY ctdh.ma_don_hang DESC;
