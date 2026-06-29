-- Thêm cột số điện thoại vào bảng tai_khoan
ALTER TABLE tai_khoan 
ADD COLUMN IF NOT EXISTS so_dien_thoai VARCHAR(20) DEFAULT NULL AFTER email;

-- Cập nhật một số SĐT mẫu cho test
UPDATE tai_khoan SET so_dien_thoai = '0337878399' WHERE ma_tai_khoan = 2;
UPDATE tai_khoan SET so_dien_thoai = '0335261859' WHERE ma_tai_khoan = 3;
UPDATE tai_khoan SET so_dien_thoai = '0909123456' WHERE ma_tai_khoan = 4;
