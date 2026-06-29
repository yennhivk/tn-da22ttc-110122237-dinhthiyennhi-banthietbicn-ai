-- Đồng bộ cửa hàng chính và vùng phí ship theo địa chỉ thực tế: 126 Nguyễn Thiện Thành, Vĩnh Long

UPDATE thong_tin_cua_hang
SET
    dia_chi_day_du = '126 Nguyễn Thiện Thành, Phường Hòa Thuận, Vĩnh Long',
    tinh_thanh = 'Vĩnh Long',
    quan_huyen = 'Thành phố Vĩnh Long',
    phuong_xa = 'Phường Hòa Thuận',
    kinh_do = 106.3452910,
    vi_do = 9.9236898
WHERE la_mac_dinh = TRUE;

-- Cập nhật vùng nội thành
UPDATE cau_hinh_van_chuyen
SET
    ten_vung = 'Nội thành Vĩnh Long',
    ma_vung = 'INNER_VINH_LONG',
    khoang_cach_toi_thieu = 0,
    khoang_cach_toi_da = 10,
    phi_co_ban = 15000,
    danh_sach_tinh = '["vĩnh long", "tp vĩnh long", "thành phố vĩnh long"]',
    thu_tu = 1
WHERE ma_vung IN ('INNER_TRA_VINH', 'INNER_VINH_LONG', 'INNER_HCMC');

-- Cập nhật vùng ngoại thành
UPDATE cau_hinh_van_chuyen
SET
    ten_vung = 'Khu vực gần Vĩnh Long',
    ma_vung = 'NEAR_VINH_LONG',
    khoang_cach_toi_thieu = 10,
    khoang_cach_toi_da = 40,
    phi_co_ban = 25000,
    danh_sach_tinh = '[]',
    thu_tu = 2
WHERE ma_vung IN ('NEAR_TRA_VINH', 'NEAR_VINH_LONG', 'OUTER_HCMC');

-- Cập nhật vùng lân cận (Trà Vinh giờ là tỉnh lân cận)
UPDATE cau_hinh_van_chuyen
SET
    khoang_cach_toi_thieu = 40,
    khoang_cach_toi_da = 120,
    phi_co_ban = 35000,
    danh_sach_tinh = '["trà vinh", "bến tre", "sóc trăng", "cần thơ", "đồng tháp", "tiền giang"]',
    thu_tu = 3
WHERE ma_vung = 'NEARBY_PROVINCES';

-- Cập nhật vùng miền Nam
UPDATE cau_hinh_van_chuyen
SET
    khoang_cach_toi_thieu = 120,
    khoang_cach_toi_da = 400,
    danh_sach_tinh = '["long an", "hậu giang", "an giang", "kiên giang", "bạc liêu", "cà mau", "hồ chí minh", "sài gòn", "tp.hcm", "tp hcm", "hcm"]',
    thu_tu = 4
WHERE ma_vung = 'SOUTH_REGION';

COMMIT;
