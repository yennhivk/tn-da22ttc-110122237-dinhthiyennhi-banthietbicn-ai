-- ==========================================
-- shipping_provinces
-- Master data 63 tỉnh/thành VN + chuẩn hóa tên, map về region
-- ==========================================

CREATE TABLE shipping_provinces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_code VARCHAR(8) NOT NULL UNIQUE COMMENT 'Mã chuẩn 01-96 theo Tổng cục Thống kê',
    province_name VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị',
    normalized_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Lowercase, bỏ dấu — dùng để match',
    region_code VARCHAR(32) NOT NULL,
    estimated_distance_km DECIMAL(10,2) NULL COMMENT 'Khoảng cách ước lượng từ cửa hàng mặc định, fallback khi không geocode được',
    aliases JSON NULL COMMENT 'Các tên gọi khác (lowercase, bỏ dấu)',
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_region (region_code),
    INDEX idx_status (status),
    INDEX idx_normalized (normalized_name),
    CONSTRAINT fk_province_region FOREIGN KEY (region_code) REFERENCES shipping_region_mappings(region_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed 63 tỉnh — distance ước lượng từ cửa hàng tại Vĩnh Long (làm reference)
INSERT INTO shipping_provinces (province_code, province_name, normalized_name, region_code, estimated_distance_km, aliases) VALUES
-- Miền Tây Nam Bộ (gốc cửa hàng tại Vĩnh Long)
('86', 'Vĩnh Long',        'vinh long',       'MIEN_TAY',    0,   JSON_ARRAY('vl', 'tp vinh long', 'thanh pho vinh long')),
('92', 'Cần Thơ',           'can tho',         'MIEN_TAY',    35,  JSON_ARRAY('ct', 'tp can tho')),
('84', 'Trà Vinh',          'tra vinh',        'MIEN_TAY',    45,  JSON_ARRAY('tv')),
('83', 'Bến Tre',           'ben tre',         'MIEN_TAY',    50,  JSON_ARRAY('bt')),
('87', 'Đồng Tháp',         'dong thap',       'MIEN_TAY',    60,  JSON_ARRAY('dt')),
('82', 'Tiền Giang',        'tien giang',      'MIEN_TAY',    70,  JSON_ARRAY('tg')),
('93', 'Hậu Giang',         'hau giang',       'MIEN_TAY',    75,  JSON_ARRAY('hg')),
('94', 'Sóc Trăng',         'soc trang',       'MIEN_TAY',    90,  JSON_ARRAY('st')),
('80', 'Long An',           'long an',         'MIEN_TAY',    95,  JSON_ARRAY('la')),
('89', 'An Giang',          'an giang',        'MIEN_TAY',    160, JSON_ARRAY('ag')),
('95', 'Bạc Liêu',          'bac lieu',        'MIEN_TAY',    180, JSON_ARRAY('bl')),
('91', 'Kiên Giang',        'kien giang',      'MIEN_TAY',    220, JSON_ARRAY('kg')),
('96', 'Cà Mau',            'ca mau',          'MIEN_TAY',    250, JSON_ARRAY('cm')),

-- Đông Nam Bộ
('79', 'TP. Hồ Chí Minh',   'tp ho chi minh',  'DONG_NAM_BO', 135, JSON_ARRAY('ho chi minh', 'hcm', 'sai gon', 'tphcm', 'tp.hcm', 'tp hcm', 'thanh pho ho chi minh')),
('74', 'Bình Dương',        'binh duong',      'DONG_NAM_BO', 160, JSON_ARRAY('bd')),
('75', 'Đồng Nai',          'dong nai',        'DONG_NAM_BO', 180, JSON_ARRAY('dn-east', 'bien hoa')),
('77', 'Bà Rịa - Vũng Tàu', 'ba ria vung tau', 'DONG_NAM_BO', 210, JSON_ARRAY('vung tau', 'br-vt', 'brvt')),
('72', 'Tây Ninh',          'tay ninh',        'DONG_NAM_BO', 200, JSON_ARRAY('tn-southeast')),
('70', 'Bình Phước',        'binh phuoc',      'DONG_NAM_BO', 230, JSON_ARRAY('bp')),

-- Tây Nguyên
('66', 'Đắk Lắk',           'dak lak',         'TAY_NGUYEN',  350, JSON_ARRAY('dl', 'buon ma thuot')),
('67', 'Đắk Nông',          'dak nong',        'TAY_NGUYEN',  400, JSON_ARRAY('dnong')),
('64', 'Gia Lai',           'gia lai',         'TAY_NGUYEN',  450, JSON_ARRAY('gl', 'pleiku')),
('62', 'Kon Tum',           'kon tum',         'TAY_NGUYEN',  550, JSON_ARRAY('kt')),
('68', 'Lâm Đồng',          'lam dong',        'TAY_NGUYEN',  300, JSON_ARRAY('ld', 'da lat')),

-- Miền Trung
('60', 'Bình Thuận',        'binh thuan',      'MIEN_TRUNG',  380, JSON_ARRAY('bth', 'phan thiet')),
('58', 'Ninh Thuận',        'ninh thuan',      'MIEN_TRUNG',  430, JSON_ARRAY('nt-tt', 'phan rang')),
('56', 'Khánh Hòa',         'khanh hoa',       'MIEN_TRUNG',  550, JSON_ARRAY('kh', 'nha trang')),
('54', 'Phú Yên',           'phu yen',         'MIEN_TRUNG',  620, JSON_ARRAY('py', 'tuy hoa')),
('52', 'Bình Định',         'binh dinh',       'MIEN_TRUNG',  680, JSON_ARRAY('bdi', 'quy nhon')),
('51', 'Quảng Ngãi',        'quang ngai',      'MIEN_TRUNG',  740, JSON_ARRAY('qng')),
('49', 'Quảng Nam',         'quang nam',       'MIEN_TRUNG',  820, JSON_ARRAY('qna', 'hoi an', 'tam ky')),
('48', 'Đà Nẵng',           'da nang',         'MIEN_TRUNG',  850, JSON_ARRAY('dn-mien-trung', 'tp da nang')),
('46', 'Thừa Thiên Huế',    'thua thien hue',  'MIEN_TRUNG',  920, JSON_ARRAY('hue', 'tt hue')),
('45', 'Quảng Trị',         'quang tri',       'MIEN_TRUNG',  990, JSON_ARRAY('qt', 'dong ha')),
('44', 'Quảng Bình',        'quang binh',      'MIEN_TRUNG',  1060, JSON_ARRAY('qb', 'dong hoi')),
('42', 'Hà Tĩnh',           'ha tinh',         'MIEN_TRUNG',  1180, JSON_ARRAY('ht')),
('40', 'Nghệ An',           'nghe an',         'MIEN_TRUNG',  1260, JSON_ARRAY('na', 'vinh')),
('38', 'Thanh Hóa',         'thanh hoa',       'MIEN_TRUNG',  1400, JSON_ARRAY('th-mien-trung')),

-- Miền Bắc
('37', 'Ninh Bình',         'ninh binh',       'MIEN_BAC',    1500, JSON_ARRAY('nb')),
('36', 'Nam Định',          'nam dinh',        'MIEN_BAC',    1530, JSON_ARRAY('nd-mien-bac')),
('35', 'Hà Nam',            'ha nam',          'MIEN_BAC',    1550, JSON_ARRAY('hnam', 'phu ly')),
('34', 'Thái Bình',         'thai binh',       'MIEN_BAC',    1580, JSON_ARRAY('tb-mien-bac')),
('33', 'Hưng Yên',          'hung yen',        'MIEN_BAC',    1620, JSON_ARRAY('hy')),
('30', 'Hải Dương',         'hai duong',       'MIEN_BAC',    1660, JSON_ARRAY('hd')),
('31', 'Hải Phòng',         'hai phong',       'MIEN_BAC',    1700, JSON_ARRAY('hp', 'tp hai phong')),
('27', 'Bắc Ninh',          'bac ninh',        'MIEN_BAC',    1690, JSON_ARRAY('bn-mien-bac')),
('26', 'Vĩnh Phúc',         'vinh phuc',       'MIEN_BAC',    1720, JSON_ARRAY('vp')),
('25', 'Phú Thọ',           'phu tho',         'MIEN_BAC',    1760, JSON_ARRAY('pt', 'viet tri')),
('24', 'Bắc Giang',         'bac giang',       'MIEN_BAC',    1740, JSON_ARRAY('bg')),
('22', 'Quảng Ninh',        'quang ninh',      'MIEN_BAC',    1820, JSON_ARRAY('qn', 'ha long')),
('20', 'Lạng Sơn',          'lang son',        'MIEN_BAC',    1900, JSON_ARRAY('ls')),
('19', 'Thái Nguyên',       'thai nguyen',     'MIEN_BAC',    1780, JSON_ARRAY('tnguyen')),
('17', 'Tuyên Quang',       'tuyen quang',     'MIEN_BAC',    1840, JSON_ARRAY('tq')),
('15', 'Yên Bái',           'yen bai',         'MIEN_BAC',    1880, JSON_ARRAY('yb')),
('14', 'Lào Cai',           'lao cai',         'MIEN_BAC',    1980, JSON_ARRAY('lcai', 'sapa', 'sa pa')),
('13', 'Lai Châu',          'lai chau',        'MIEN_BAC',    2120, JSON_ARRAY('lc-mien-bac')),
('12', 'Điện Biên',         'dien bien',       'MIEN_BAC',    2080, JSON_ARRAY('db-phu')),
('11', 'Sơn La',            'son la',          'MIEN_BAC',    1940, JSON_ARRAY('sl')),
('10', 'Hòa Bình',          'hoa binh',        'MIEN_BAC',    1700, JSON_ARRAY('hb')),
('08', 'Hà Giang',          'ha giang',        'MIEN_BAC',    2000, JSON_ARRAY('hg-mien-bac')),
('06', 'Cao Bằng',          'cao bang',        'MIEN_BAC',    1980, JSON_ARRAY('cb')),
('04', 'Bắc Kạn',           'bac kan',         'MIEN_BAC',    1860, JSON_ARRAY('bk')),
('02', 'Hà Nội',            'ha noi',          'MIEN_BAC',    1700, JSON_ARRAY('hn', 'tp ha noi', 'thanh pho ha noi'));
