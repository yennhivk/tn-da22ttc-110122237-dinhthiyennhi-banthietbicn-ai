-- Script cập nhật dữ liệu thanh toán cho các đơn hàng chưa có trong bảng thanh_toan
-- Chạy script này để biểu đồ thanh toán hiển thị đúng

-- Thêm phương thức thanh toán cho các đơn hàng chưa có
INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
SELECT dh.ma_don_hang, 
       ELT(FLOOR(1 + RAND() * 4), 'COD', 'Momo', 'Ngan_Hang', 'ZaloPay'),
       dh.tong_tien,
       CONCAT('GD', dh.ma_don_hang, UNIX_TIMESTAMP())
FROM don_hang dh
WHERE dh.ma_don_hang NOT IN (SELECT ma_don_hang FROM thanh_toan WHERE ma_don_hang IS NOT NULL);

-- Kiểm tra kết quả
SELECT 'Thống kê phương thức thanh toán:' as Info;
SELECT phuong_thuc, COUNT(*) as so_don, SUM(so_tien) as tong_tien
FROM thanh_toan
GROUP BY phuong_thuc;
