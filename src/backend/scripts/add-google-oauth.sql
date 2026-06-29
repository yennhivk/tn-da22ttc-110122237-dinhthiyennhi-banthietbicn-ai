-- Thêm cột google_id vào bảng tai_khoan để hỗ trợ đăng nhập Google
-- Chạy script này trong MySQL để cập nhật database

-- Thêm cột google_id (có thể null vì user có thể đăng ký bằng email thường)
ALTER TABLE tai_khoan 
ADD COLUMN google_id VARCHAR(255) NULL AFTER email;

-- Tạo index cho google_id để tìm kiếm nhanh hơn
CREATE INDEX idx_google_id ON tai_khoan(google_id);

-- Cho phép mat_khau có thể null (vì user đăng nhập Google không cần mật khẩu)
ALTER TABLE tai_khoan 
MODIFY COLUMN mat_khau VARCHAR(255) NULL;

-- Kiểm tra kết quả
DESCRIBE tai_khoan;
