-- ==========================================
-- MỞ RỘNG BẢNG thong_tin_cua_hang
-- Thêm các trường thông tin chung của cửa hàng:
-- website, slogan, giờ mở cửa, mã số thuế, tên pháp lý, mạng xã hội, logo
--
-- Lưu ý: MySQL < 8.0.29 không hỗ trợ ADD COLUMN IF NOT EXISTS.
-- Nên chạy qua script: node backend/run_extend_store_migration.js
-- (Script này tự kiểm tra cột đã tồn tại chưa trước khi ALTER.)
-- ==========================================

ALTER TABLE thong_tin_cua_hang
    ADD COLUMN ten_phap_ly VARCHAR(255) NULL COMMENT 'Tên đăng ký kinh doanh / pháp lý',
    ADD COLUMN ma_so_thue VARCHAR(50) NULL COMMENT 'Mã số thuế',
    ADD COLUMN slogan VARCHAR(255) NULL COMMENT 'Khẩu hiệu / mô tả ngắn',
    ADD COLUMN mo_ta TEXT NULL COMMENT 'Mô tả dài về cửa hàng',
    ADD COLUMN logo_url VARCHAR(500) NULL COMMENT 'URL logo cửa hàng',
    ADD COLUMN website VARCHAR(255) NULL COMMENT 'Website chính thức',
    ADD COLUMN facebook VARCHAR(255) NULL COMMENT 'Link Facebook',
    ADD COLUMN zalo VARCHAR(50) NULL COMMENT 'Số/ID Zalo',
    ADD COLUMN instagram VARCHAR(255) NULL COMMENT 'Link Instagram',
    ADD COLUMN tiktok VARCHAR(255) NULL COMMENT 'Link TikTok',
    ADD COLUMN gio_mo_cua VARCHAR(255) NULL COMMENT 'Giờ mở cửa';

-- Cập nhật dữ liệu mặc định cho cửa hàng chính
UPDATE thong_tin_cua_hang
SET
    ten_phap_ly = COALESCE(ten_phap_ly, 'CÔNG TY TNHH YẾN NHI TECH'),
    slogan = COALESCE(slogan, 'Công nghệ chất lượng - Giá trị bền vững'),
    website = COALESCE(website, 'www.yennhitechstore.com'),
    gio_mo_cua = COALESCE(gio_mo_cua, 'T2-CN: 8:00 - 22:00')
WHERE la_mac_dinh = TRUE;
