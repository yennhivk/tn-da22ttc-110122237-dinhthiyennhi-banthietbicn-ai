-- Bảng thông tin cá nhân hóa (Personalization Profile)
USE CSDL_DoAnCN;

CREATE TABLE IF NOT EXISTS thong_tin_ca_nhan_hoa (
    ma_tai_khoan INT PRIMARY KEY,
    danh_muc_quan_tam JSON,
    thuong_hieu_yeu_thich JSON,
    muc_dich_su_dung VARCHAR(255),
    phan_khuc_ngan_sach VARCHAR(255),
    da_hoan_thanh_khao_sat TINYINT(1) DEFAULT 1,
    thoi_gian_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    thoi_gian_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate dữ liệu cũ từ bảng tai_khoan sang bảng mới nếu có
INSERT IGNORE INTO thong_tin_ca_nhan_hoa (ma_tai_khoan, muc_dich_su_dung, phan_khuc_ngan_sach, da_hoan_thanh_khao_sat)
SELECT ma_tai_khoan, muc_dich_su_dung, phan_khuc_ngan_sach, 1 
FROM tai_khoan 
WHERE muc_dich_su_dung IS NOT NULL OR phan_khuc_ngan_sach IS NOT NULL;
