-- Script sửa bảng don_hang để phù hợp với code backend
-- Chạy script này trong MySQL nếu gặp lỗi "Unknown column"

-- Kiểm tra cấu trúc hiện tại
DESCRIBE don_hang;

-- Thêm các cột còn thiếu (nếu chưa có)
-- Cột trang_thai thay cho trang_thai_don_hang
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS trang_thai ENUM('cho_xac_nhan','da_xac_nhan','dang_giao','da_giao','da_huy') DEFAULT 'cho_xac_nhan';

-- Cột dia_chi_giao thay cho dia_chi_giao_hang
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS dia_chi_giao TEXT;

-- Cột so_dien_thoai
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS so_dien_thoai VARCHAR(20);

-- Cột ghi_chu
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

-- Cột ngay_dat thay cho ngay_tao
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS ngay_dat DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Cột ngay_cap_nhat
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS ngay_cap_nhat DATETIME;

-- Copy dữ liệu từ cột cũ sang cột mới (nếu có)
UPDATE don_hang SET trang_thai = 
    CASE trang_thai_don_hang
        WHEN 'dang_xu_ly' THEN 'cho_xac_nhan'
        WHEN 'dang_giao' THEN 'dang_giao'
        WHEN 'hoan_thanh' THEN 'da_giao'
        WHEN 'da_huy' THEN 'da_huy'
        ELSE 'cho_xac_nhan'
    END
WHERE trang_thai IS NULL AND trang_thai_don_hang IS NOT NULL;

UPDATE don_hang SET dia_chi_giao = dia_chi_giao_hang WHERE dia_chi_giao IS NULL AND dia_chi_giao_hang IS NOT NULL;
UPDATE don_hang SET ngay_dat = ngay_tao WHERE ngay_dat IS NULL AND ngay_tao IS NOT NULL;

-- Kiểm tra lại
DESCRIBE don_hang;
SELECT * FROM don_hang LIMIT 5;
