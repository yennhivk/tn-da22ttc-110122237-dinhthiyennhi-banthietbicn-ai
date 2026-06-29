-- =========================================
-- Cáº¤U HÃNH CHUNG CHO CÆ  Sá» Dá»® LIá»U
-- =========================================
CREATE DATABASE IF NOT EXISTS CSDL_DoAnCN
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE CSDL_DoAnCN;

-- Äáº£m báº£o káº¿t ná»i há» trá»£ tiáº¿ng Viá»t
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET COLLATION_CONNECTION = 'utf8mb4_unicode_ci';

-- =========================================
-- 1. Báº¢NG TÃI KHOáº¢N NGÆ¯á»I DÃNG
-- =========================================
CREATE TABLE tai_khoan (
    ma_tai_khoan INT AUTO_INCREMENT PRIMARY KEY,
    ten_dang_nhap VARCHAR(50) NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    vai_tro ENUM('admin','khach_hang') DEFAULT 'khach_hang',
    trang_thai TINYINT DEFAULT 1,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tai_khoan ADD COLUMN hinh_anh VARCHAR(255) DEFAULT NULL;
ALTER TABLE tai_khoan ADD COLUMN google_id VARCHAR(255) NULL AFTER email;
ALTER TABLE tai_khoan MODIFY COLUMN mat_khau_gg VARCHAR(255) NULL;


-- =========================================
-- 2. Báº¢NG DANH Má»¤C Sáº¢N PHáº¨M
-- =========================================
CREATE TABLE danh_muc_san_pham (
    ma_danh_muc INT AUTO_INCREMENT PRIMARY KEY,
    ten_danh_muc VARCHAR(100) NOT NULL,
    mo_ta TEXT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 3. Báº¢NG Sáº¢N PHáº¨M
-- =========================================
CREATE TABLE san_pham (
    ma_san_pham INT AUTO_INCREMENT PRIMARY KEY,
    ma_danh_muc INT,
    ten_san_pham VARCHAR(255) NOT NULL,
    mo_ta TEXT,
    gia DECIMAL(10,2) NOT NULL,
    so_luong INT DEFAULT 0,
    thuong_hieu VARCHAR(100),
    trang_thai ENUM('hien_thi','an','xoa') DEFAULT 'hien_thi',
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_danh_muc) REFERENCES danh_muc_san_pham(ma_danh_muc)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 4. Báº¢NG áº¢NH Sáº¢N PHáº¨M
-- =========================================
CREATE TABLE anh_san_pham (
    ma_anh INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham INT,
    duong_dan_anh VARCHAR(255),
    la_anh_chinh TINYINT DEFAULT 0,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 5. Báº¢NG ÄÆ N HÃNG
-- =========================================
CREATE TABLE don_hang (
    ma_don_hang INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    tong_tien DECIMAL(10,2) NOT NULL,
    trang_thai_thanh_toan ENUM('cho_xu_ly','da_thanh_toan','that_bai') DEFAULT 'cho_xu_ly',
    trang_thai_don_hang ENUM('dang_xu_ly','dang_giao','hoan_thanh','da_huy') DEFAULT 'dang_xu_ly',
    dia_chi_giao_hang TEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 6. Báº¢NG CHI TIáº¾T ÄÆ N HÃNG
-- =========================================
CREATE TABLE chi_tiet_don_hang (
    ma_chi_tiet INT AUTO_INCREMENT PRIMARY KEY,
    ma_don_hang INT,
    ma_san_pham INT,
    so_luong INT NOT NULL,
    gia_ban DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (ma_don_hang) REFERENCES don_hang(ma_don_hang),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 7. Báº¢NG THANH TOÃN
-- =========================================
CREATE TABLE thanh_toan (
    ma_thanh_toan INT AUTO_INCREMENT PRIMARY KEY,
    ma_don_hang INT,
    phuong_thuc ENUM('COD','Ngan_Hang','Momo','ZaloPay') NOT NULL,
    so_tien DECIMAL(10,2),
    ngay_thanh_toan DATETIME DEFAULT CURRENT_TIMESTAMP,
    ma_giao_dich VARCHAR(100),
    FOREIGN KEY (ma_don_hang) REFERENCES don_hang(ma_don_hang)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 8. Báº¢NG ÄÃNH GIÃ & PHáº¢N Há»I
-- =========================================
CREATE TABLE danh_gia (
    ma_danh_gia INT AUTO_INCREMENT PRIMARY KEY,
    ma_san_pham INT,
    ma_tai_khoan INT,
    so_sao TINYINT CHECK (so_sao BETWEEN 1 AND 5),
    noi_dung TEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai TINYINT DEFAULT 1,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham),
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 9. Báº¢NG Lá»CH Sá»¬ TRÃ CHUYá»N CHATBOT
-- =========================================
CREATE TABLE lich_su_chatbot (
    ma_lich_su INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    tin_nhan TEXT,
    phan_hoi TEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 10. Báº¢NG GIá» HÃNG
-- =========================================
CREATE TABLE gio_hang (
    ma_gio_hang INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    tong_tien DECIMAL(10,2) DEFAULT 0,
    so_luong_san_pham INT DEFAULT 0,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 11. Báº¢NG CHI TIáº¾T GIá» HÃNG
-- =========================================
CREATE TABLE chi_tiet_gio_hang (
    ma_chi_tiet_gio INT AUTO_INCREMENT PRIMARY KEY,
    ma_gio_hang INT,
    ma_san_pham INT,
    so_luong INT DEFAULT 1,
    gia_tai_thoi_diem_them DECIMAL(10,2),
    ngay_them DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_gio_hang) REFERENCES gio_hang(ma_gio_hang),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 12. Báº¢NG RESET PASSWORD
-- =========================================
CREATE TABLE reset_password (
    ma_reset INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    token VARCHAR(255),
    thoi_gian_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    thoi_gian_het_han DATETIME,
    trang_thai ENUM('chua_su_dung','da_su_dung','het_han') DEFAULT 'chua_su_dung',
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 13. Báº¢NG LIÃN Há»
-- =========================================
CREATE TABLE lien_he (
    ma_lien_he INT AUTO_INCREMENT PRIMARY KEY,
    ten_nguoi_gui VARCHAR(100),
    email VARCHAR(150),
    so_dien_thoai VARCHAR(20),
    noi_dung TEXT,
    ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai ENUM('chua_phan_hoi','da_phan_hoi') DEFAULT 'chua_phan_hoi'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 14. Báº¢NG QUáº¢NG CÃO
-- =========================================
CREATE TABLE quang_cao (
    ma_quang_cao INT AUTO_INCREMENT PRIMARY KEY,
    tieu_de VARCHAR(255),
    hinh_anh VARCHAR(255),
    duong_dan VARCHAR(255),
    ngay_hien_thi DATETIME,
    ngay_ket_thuc DATETIME,
    trang_thai ENUM('dang_hien_thi','da_an') DEFAULT 'dang_hien_thi'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 15. Báº¢NG TIN Tá»¨C
-- =========================================
CREATE TABLE tin_tuc (
    ma_tin INT AUTO_INCREMENT PRIMARY KEY,
    tieu_de VARCHAR(255),
    noi_dung LONGTEXT,
    anh_dai_dien VARCHAR(255),
    tac_gia VARCHAR(100),
    ngay_dang DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai ENUM('hien_thi','an') DEFAULT 'hien_thi'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 16. Báº¢NG Dá»® LIá»U TÃM KIáº¾M
-- =========================================
CREATE TABLE du_lieu_tim_kiem (
    ma_tim_kiem INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    tu_khoa VARCHAR(255),
    ngay_tim_kiem DATETIME DEFAULT CURRENT_TIMESTAMP,
    ket_qua_tra_ve INT DEFAULT 0,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 17. Báº¢NG KHUYáº¾N MÃI
-- =========================================
CREATE TABLE khuyen_mai (
    ma_khuyen_mai INT AUTO_INCREMENT PRIMARY KEY,
    ten_khuyen_mai VARCHAR(100),
    ma_giam_gia VARCHAR(50),
    mo_ta TEXT,
    ngay_bat_dau DATETIME,
    ngay_ket_thuc DATETIME,
    dieu_kien_ap_dung TEXT,
    trang_thai TINYINT DEFAULT 1
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 18. Báº¢NG HÃA ÄÆ N
-- =========================================
CREATE TABLE hoa_don (
    ma_hoa_don INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ngay_xuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    tong_tien DECIMAL(15,2),
    phuong_thuc_thanh_toan VARCHAR(50),
    trang_thai ENUM('da_thanh_toan','cho_thanh_toan','da_huy') DEFAULT 'cho_thanh_toan',
    ghi_chu TEXT,
    FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 19. Báº¢NG CHI TIáº¾T HÃA ÄÆ N
-- =========================================
CREATE TABLE chi_tiet_hoa_don (
    ma_chi_tiet INT AUTO_INCREMENT PRIMARY KEY,
    ma_hoa_don INT,
    ma_san_pham INT,
    so_luong INT,
    don_gia DECIMAL(15,2),
    thue DECIMAL(5,2),
    thanh_tien DECIMAL(15,2),
    FOREIGN KEY (ma_hoa_don) REFERENCES hoa_don(ma_hoa_don),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 20. Báº¢NG HÃA ÄÆ N BÃN HÃNG (POS)
-- =========================================
CREATE TABLE IF NOT EXISTS hoa_don_ban_hang (
    ma_hoa_don_bh INT AUTO_INCREMENT PRIMARY KEY,
    ma_hoa_don VARCHAR(50) UNIQUE NOT NULL,
    ma_khach_hang INT NULL,
    ten_khach_hang VARCHAR(100),
    so_dien_thoai VARCHAR(20),
    ma_nhan_vien INT NULL,
    ten_nhan_vien VARCHAR(100),
    ngay_ban DATETIME DEFAULT CURRENT_TIMESTAMP,
    tong_tien DECIMAL(15,2) NOT NULL DEFAULT 0,
    giam_gia DECIMAL(15,2) DEFAULT 0,
    thuc_thu DECIMAL(15,2) NOT NULL DEFAULT 0,
    phuong_thuc_thanh_toan ENUM('tien_mat','chuyen_khoan','the','momo','zalopay','cod') DEFAULT 'tien_mat',
    trang_thai ENUM('hoan_thanh','da_huy','cho_xu_ly') DEFAULT 'hoan_thanh',
    ghi_chu TEXT,
    FOREIGN KEY (ma_khach_hang) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 21. Báº¢NG CHI TIáº¾T HÃA ÄÆ N BÃN HÃNG (POS)
-- =========================================
CREATE TABLE IF NOT EXISTS chi_tiet_hoa_don_bh (
    ma_chi_tiet INT AUTO_INCREMENT PRIMARY KEY,
    ma_hoa_don_bh INT NOT NULL,
    ma_san_pham INT NOT NULL,
    ten_san_pham VARCHAR(255),
    so_luong INT NOT NULL DEFAULT 1,
    don_gia DECIMAL(15,2) NOT NULL,
    giam_gia DECIMAL(15,2) DEFAULT 0,
    thanh_tien DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (ma_hoa_don_bh) REFERENCES hoa_don_ban_hang(ma_hoa_don_bh) ON DELETE CASCADE,
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =========================================
-- 22. Báº¢NG NHÃN VIÃN
-- =========================================
CREATE TABLE IF NOT EXISTS nhan_vien (
    ma_nhan_vien INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20),
    email VARCHAR(100),
    chuc_vu VARCHAR(50),
    ngay_vao_lam DATE,
    luong_co_ban DECIMAL(15,2),
    trang_thai TINYINT DEFAULT 1,
    ghi_chu TEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, email, vai_tro, trang_thai)
VALUES
('admin', '123456', 'admin@shop.vn', 'admin', 1),
('nguyenvana', '123456', 'vana@gmail.com', 'khach_hang', 1),
('lethib', '123456', 'lethib@gmail.com', 'khach_hang', 1);

INSERT INTO danh_muc_san_pham (ten_danh_muc, mo_ta)
VALUES
('Äiá»n thoáº¡i', 'CÃ¡c dÃ²ng Äiá»n thoáº¡i thÃ´ng minh chÃ­nh hÃ£ng'),
('Laptop', 'MÃ¡y tÃ­nh xÃ¡ch tay hiá»u nÄng cao'),
('Phá»¥ kiá»n', 'Tai nghe, sáº¡c, á»p lÆ°ng vÃ  cÃ¡c phá»¥ kiá»n khÃ¡c');

INSERT INTO san_pham (ma_danh_muc, ten_san_pham, mo_ta, gia, so_luong, thuong_hieu)
VALUES
(1, 'iPhone 15 Pro Max', 'Äiá»n thoáº¡i cao cáº¥p cá»§a Apple', 33990000, 10, 'Apple'),
(1, 'Samsung Galaxy S24 Ultra', 'Flagship Android máº¡nh máº½', 29990000, 8, 'Samsung'),
(2, 'MacBook Air M3 2024', 'Laptop má»ng nháº¹ pin lÃ¢u', 28990000, 5, 'Apple'),
(2, 'Dell XPS 13 Plus', 'Laptop doanh nhÃ¢n sang trá»ng', 25990000, 4, 'Dell'),
(3, 'Tai nghe AirPods Pro 2', 'Tai nghe chá»ng á»n chá»§ Äá»ng', 5990000, 20, 'Apple'),
(3, 'Sáº¡c nhanh 65W Anker', 'Cá»§ sáº¡c nhanh dÃ¹ng cho nhiá»u thiáº¿t bá»', 990000, 50, 'Anker');

INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh)
VALUES
(1, 'images/iphone15.jpg', 1),
(2, 'images/s24ultra.jpg', 1),
(3, 'images/macbook_air_m3.jpg', 1),
(4, 'images/dell_xps13plus.jpg', 1),
(5, 'images/airpodspro2.jpg', 1),
(6, 'images/anker65w.jpg', 1);

INSERT INTO gio_hang (ma_tai_khoan, tong_tien, so_luong_san_pham)
VALUES
(2, 39980000, 2),
(3, 5990000, 1);

INSERT INTO chi_tiet_gio_hang (ma_gio_hang, ma_san_pham, so_luong, gia_tai_thoi_diem_them)
VALUES
(1, 1, 1, 33990000),
(1, 6, 1, 5990000),
(2, 5, 1, 5990000);

INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang)
VALUES
(2, 39980000, 'da_thanh_toan', 'dang_giao', '123 LÃ½ ThÆ°á»ng Kiá»t, HÃ  Ná»i'),
(3, 5990000, 'cho_xu_ly', 'dang_xu_ly', '45 LÃª Duáº©n, ÄÃ  Náºµng');

INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
VALUES
(1, 1, 1, 33990000),
(1, 6, 1, 5990000),
(2, 5, 1, 5990000);

INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
VALUES
(1, 'Ngan_Hang', 39980000, 'GD20251113001'),
(2, 'COD', 5990000, 'GD20251113002');

INSERT INTO danh_gia (ma_san_pham, ma_tai_khoan, so_sao, noi_dung)
VALUES
(1, 2, 5, 'Sáº£n pháº©m cá»±c ká»³ tá»t, hiá»u nÄng mÆ°á»£t mÃ .'),
(3, 3, 4, 'MÃ¡y Äáº¹p, nháº¹, pin á»n. Chá» hÆ¡i nÃ³ng khi cháº¡y náº·ng.');

INSERT INTO lich_su_chatbot (ma_tai_khoan, tin_nhan, phan_hoi)
VALUES
(2, 'Shop cÃ³ iPhone 15 khÃ´ng?', 'Dáº¡, hiá»n shop cÃ³ sáºµn iPhone 15 Pro Max 256GB áº¡!'),
(3, 'CÃ³ giao hÃ ng ÄÃ  Náºµng khÃ´ng?', 'Dáº¡, shop cÃ³ há» trá»£ giao toÃ n quá»c nhÃ©!');

INSERT INTO lien_he (ten_nguoi_gui, email, so_dien_thoai, noi_dung)
VALUES
('Nguyá»n VÄn A', 'vana@gmail.com', '0909123456', 'TÃ´i muá»n há»i vá» tÃ¬nh tráº¡ng ÄÆ¡n hÃ ng #1'),
('LÃª Thá» B', 'lethib@gmail.com', '0909345678', 'Sáº£n pháº©m AirPods cÃ³ cÃ²n hÃ ng khÃ´ng?');

INSERT INTO khuyen_mai (ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung)
VALUES
('Giáº£m giÃ¡ Black Friday', 'BLACK2025', 'Giáº£m 20% cho táº¥t cáº£ ÄÆ¡n hÃ ng trÃªn 5 triá»u', '2025-11-25', '2025-11-30', 'ÄÆ¡n hÃ ng >= 5.000.000Ä'),
('GiÃ¡ng sinh rá»±c rá»¡', 'XMAS2025', 'Giáº£m 15% cho phá»¥ kiá»n', '2025-12-15', '2025-12-31', 'Danh má»¥c phá»¥ kiá»n');

INSERT INTO hoa_don (ma_tai_khoan, tong_tien, phuong_thuc_thanh_toan, trang_thai, ghi_chu)
VALUES
(2, 39980000, 'Ngan_Hang', 'da_thanh_toan', 'HÃ³a ÄÆ¡n cho ÄÆ¡n hÃ ng #1'),
(3, 5990000, 'COD', 'cho_thanh_toan', 'ChÆ°a thanh toÃ¡n');

INSERT INTO chi_tiet_hoa_don (ma_hoa_don, ma_san_pham, so_luong, don_gia, thue, thanh_tien)
VALUES
(1, 1, 1, 33990000, 10, 37389000),
(1, 6, 1, 5990000, 10, 6589000),
(2, 5, 1, 5990000, 0, 5990000);

-- Dá»¯ liá»u máº«u cho nhÃ¢n viÃªn
INSERT INTO nhan_vien (ho_ten, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai)
VALUES
('Nguyá»n VÄn A', '0909123456', 'vana@yennhitech.vn', 'NhÃ¢n viÃªn bÃ¡n hÃ ng', '2024-01-15', 8000000, 1),
('Tráº§n Thá» B', '0909234567', 'thib@yennhitech.vn', 'Thu ngÃ¢n', '2024-02-01', 7500000, 1),
('LÃª VÄn C', '0909345678', 'vanc@yennhitech.vn', 'Quáº£n lÃ½ cá»­a hÃ ng', '2023-12-01', 12000000, 1);

-- Dá»¯ liá»u máº«u cho hÃ³a ÄÆ¡n bÃ¡n hÃ ng (POS)
INSERT INTO hoa_don_ban_hang (ma_hoa_don, ma_khach_hang, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien, tong_tien, giam_gia, thuc_thu, phuong_thuc_thanh_toan, trang_thai)
VALUES
('HD20250516001', 2, 'Nguyá»n VÄn A', '0909123456', 1, 'Nguyá»n VÄn A', 33990000, 0, 33990000, 'chuyen_khoan', 'hoan_thanh'),
('HD20250516002', NULL, 'KhÃ¡ch láº»', NULL, 2, 'Tráº§n Thá» B', 6980000, 100000, 6880000, 'tien_mat', 'hoan_thanh'),
('HD20250516003', 3, 'LÃª Thá» B', '0909345678', 1, 'Nguyá»n VÄn A', 29990000, 500000, 29490000, 'the', 'hoan_thanh');

-- Dá»¯ liá»u máº«u cho chi tiáº¿t hÃ³a ÄÆ¡n bÃ¡n hÃ ng
INSERT INTO chi_tiet_hoa_don_bh (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, thanh_tien)
VALUES
(1, 1, 'iPhone 15 Pro Max', 1, 33990000, 0, 33990000),
(2, 5, 'Tai nghe AirPods Pro 2', 1, 5990000, 100000, 5890000),
(2, 6, 'Sáº¡c nhanh 65W Anker', 1, 990000, 0, 990000),
(3, 2, 'Samsung Galaxy S24 Ultra', 1, 29990000, 500000, 29490000);

INSERT INTO tin_tuc (tieu_de, noi_dung, anh_dai_dien, tac_gia)
VALUES
('Apple ra máº¯t iPhone 15 Pro Max', 'Sáº£n pháº©m má»i mang Äáº¿n nhiá»u nÃ¢ng cáº¥p vÆ°á»£t trá»i vá» camera vÃ  hiá»u nÄng.', 'images/news1.jpg', 'Admin'),
('Máº¹o sá»­ dá»¥ng MacBook hiá»u quáº£ hÆ¡n', 'Tá»ng há»£p cÃ¡c phÃ­m táº¯t vÃ  máº¹o giÃºp báº¡n lÃ m viá»c nhanh hÆ¡n trÃªn macOS.', 'images/news2.jpg', 'Admin');

INSERT INTO du_lieu_tim_kiem (ma_tai_khoan, tu_khoa, ket_qua_tra_ve)
VALUES
(2, 'iPhone', 5),
(3, 'AirPods', 2);

INSERT INTO quang_cao (tieu_de, hinh_anh, duong_dan, ngay_hien_thi, ngay_ket_thuc)
VALUES
('Sale sá»c Black Friday', 'images/banner_blackfriday.jpg', 'khuyen-mai.html', '2025-11-20', '2025-11-30'),
('Æ¯u ÄÃ£i GiÃ¡ng sinh', 'images/banner_xmas.jpg', 'xmas-sale.html', '2025-12-15', '2025-12-31');

-- ============================================
-- â HIá»N THá» TOÃN Bá» Dá»® LIá»U TRONG CSDL ecommerce
-- ============================================


-- 1. Báº£ng tÃ i khoáº£n ngÆ°á»i dÃ¹ng
SELECT * FROM tai_khoan;

-- 2. Báº£ng danh má»¥c sáº£n pháº©m
SELECT * FROM danh_muc_san_pham;

-- 3. Báº£ng sáº£n pháº©m
SELECT * FROM san_pham;

-- 4. Báº£ng áº£nh sáº£n pháº©m
SELECT * FROM anh_san_pham;

-- 5. Báº£ng ÄÆ¡n hÃ ng
SELECT * FROM don_hang;

-- 6. Báº£ng chi tiáº¿t ÄÆ¡n hÃ ng
SELECT * FROM chi_tiet_don_hang;

-- 7. Báº£ng thanh toÃ¡n
SELECT * FROM thanh_toan;

-- 8. Báº£ng ÄÃ¡nh giÃ¡ & pháº£n há»i sáº£n pháº©m
SELECT * FROM danh_gia;

-- 9. Báº£ng lá»ch sá»­ trÃ² chuyá»n chatbot
SELECT * FROM lich_su_chatbot;

-- 10. Báº£ng giá» hÃ ng
SELECT * FROM gio_hang;

-- 11. Báº£ng chi tiáº¿t giá» hÃ ng
SELECT * FROM chi_tiet_gio_hang;

-- 12. Báº£ng reset password
SELECT * FROM reset_password;

-- 13. Báº£ng liÃªn há»
SELECT * FROM lien_he;

-- 14. Báº£ng quáº£ng cÃ¡o
SELECT * FROM quang_cao;

-- 15. Báº£ng tin tá»©c
SELECT * FROM tin_tuc;

-- 16. Báº£ng dá»¯ liá»u tÃ¬m kiáº¿m
SELECT * FROM du_lieu_tim_kiem;

-- 17. Báº£ng khuyáº¿n mÃ£i
SELECT * FROM khuyen_mai;

-- 18. Báº£ng hÃ³a ÄÆ¡n
SELECT * FROM hoa_don;

-- 19. Báº£ng chi tiáº¿t hÃ³a ÄÆ¡n
SELECT * FROM chi_tiet_hoa_don;

-- 20. Báº£ng hÃ³a ÄÆ¡n bÃ¡n hÃ ng (POS)
SELECT * FROM hoa_don_ban_hang;

-- 21. Báº£ng chi tiáº¿t hÃ³a ÄÆ¡n bÃ¡n hÃ ng (POS)
SELECT * FROM chi_tiet_hoa_don_bh;

-- 22. Báº£ng nhÃ¢n viÃªn
SELECT * FROM nhan_vien;

SELECT ma_tai_khoan, ten_dang_nhap, email, hinh_anh FROM tai_khoan WHERE email = 'your_email';



-- B?ng luu tr? hành vi tuong tác ngu?i dùng (Added for Personalization)
CREATE TABLE IF NOT EXISTS user_interactions (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  MaND INT NOT NULL,
  MaSP INT NOT NULL,
  LoaiTuongTac VARCHAR(50) NOT NULL,
  GiaTri FLOAT DEFAULT 1.0,
  ThoiGian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ChiTiet JSON NULL,
  FOREIGN KEY (MaND) REFERENCES tai_khoan(ma_tai_khoan),
  FOREIGN KEY (MaSP) REFERENCES san_pham(ma_san_pham),
  INDEX idx_user_item (MaND, MaSP)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- C?p nh?t b?ng tai_khoan thêm thu?c tính cho kh?o sát cá nhân hóa
ALTER TABLE tai_khoan ADD COLUMN muc_dich_su_dung VARCHAR(255) NULL;
ALTER TABLE tai_khoan ADD COLUMN phan_khuc_ngan_sach VARCHAR(255) NULL;
