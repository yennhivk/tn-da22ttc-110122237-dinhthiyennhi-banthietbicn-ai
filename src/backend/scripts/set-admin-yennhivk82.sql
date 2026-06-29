-- =========================================
-- CẬP NHẬT TÀI KHOẢN yennhivk82@gmail.com 
-- LÀM ADMIN MẶC ĐỊNH
-- =========================================
-- Script này cập nhật tài khoản Google yennhivk82@gmail.com 
-- thành admin để có thể đăng nhập vào trang quản trị

USE CSDL_DoAnCN;

-- Cập nhật vai trò admin cho tài khoản yennhivk82@gmail.com
UPDATE tai_khoan 
SET vai_tro = 'admin'
WHERE email = 'yennhivk82@gmail.com';

-- Kiểm tra kết quả
SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, google_id, trang_thai
FROM tai_khoan 
WHERE email = 'yennhivk82@gmail.com';

-- Thông báo
SELECT 'Đã cập nhật tài khoản yennhivk82@gmail.com thành admin' AS status;
