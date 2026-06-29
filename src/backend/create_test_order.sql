-- Tạo đơn hàng test cho MoMo
USE CSDL_DoAnCN;

-- Xóa đơn hàng test cũ nếu có
DELETE FROM thanh_toan WHERE ma_don_hang = 9999;
DELETE FROM don_hang WHERE ma_don_hang = 9999;

-- Tạo đơn hàng test mới
INSERT INTO don_hang (
    ma_don_hang, 
    ma_tai_khoan, 
    tong_tien, 
    trang_thai_thanh_toan, 
    trang_thai_don_hang,
    dia_chi_giao_hang,
    so_dien_thoai,
    ghi_chu,
    ngay_tao,
    ngay_dat
) VALUES (
    9999,
    1,
    10000.00,
    'cho_xu_ly',
    'dang_xu_ly',
    'Dia chi test',
    '0123456789',
    'Don hang test MoMo',
    NOW(),
    NOW()
);

-- Tạo bản ghi thanh toán
INSERT INTO thanh_toan (
    ma_don_hang,
    phuong_thuc,
    so_tien,
    ngay_thanh_toan
) VALUES (
    9999,
    'momo',
    10000.00,
    NOW()
);

-- Kiểm tra
SELECT 
    dh.ma_don_hang,
    dh.tong_tien,
    dh.trang_thai_thanh_toan,
    dh.trang_thai_don_hang,
    tt.phuong_thuc,
    tt.ma_giao_dich
FROM don_hang dh
LEFT JOIN thanh_toan tt ON dh.ma_don_hang = tt.ma_don_hang
WHERE dh.ma_don_hang = 9999;

SELECT '✅ Đơn hàng test đã được tạo! Mã đơn hàng: 9999' as message;
