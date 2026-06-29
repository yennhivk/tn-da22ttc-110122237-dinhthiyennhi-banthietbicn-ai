-- Migration: Thêm các trường mới vào bảng san_pham
-- Ngày tạo: 2026-05-12

-- Thêm cột ma_san_pham_code
ALTER TABLE san_pham ADD COLUMN ma_san_pham_code VARCHAR(50) UNIQUE COMMENT 'Mã sản phẩm dạng SKU';

-- Thêm cột barcode
ALTER TABLE san_pham ADD COLUMN barcode VARCHAR(100) UNIQUE COMMENT 'Mã vạch sản phẩm';

-- Thêm cột gia_nhap
ALTER TABLE san_pham ADD COLUMN gia_nhap DECIMAL(15,2) DEFAULT 0 COMMENT 'Giá nhập';

-- Thêm cột so_luong_ban
ALTER TABLE san_pham ADD COLUMN so_luong_ban INT DEFAULT 0 COMMENT 'Số lượng đã bán';

-- Thêm cột luot_xem
ALTER TABLE san_pham ADD COLUMN luot_xem INT DEFAULT 0 COMMENT 'Lượt xem sản phẩm';

-- Tạo index
CREATE INDEX idx_ma_san_pham_code ON san_pham(ma_san_pham_code);
CREATE INDEX idx_barcode ON san_pham(barcode);
CREATE INDEX idx_so_luong_ban ON san_pham(so_luong_ban);

-- Cập nhật mã sản phẩm cho các sản phẩm hiện có
UPDATE san_pham 
SET ma_san_pham_code = CONCAT('SP', LPAD(ma_san_pham, 6, '0'))
WHERE ma_san_pham_code IS NULL OR ma_san_pham_code = '';

-- Cập nhật giá nhập mặc định = 70% giá bán
UPDATE san_pham 
SET gia_nhap = gia * 0.7
WHERE gia_nhap IS NULL OR gia_nhap = 0;

-- Thông báo hoàn thành
SELECT 'Migration completed: san_pham table updated with new fields' as message;
