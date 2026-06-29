-- Đồng bộ cửa hàng chính và vùng phí ship theo địa chỉ 74-76 Lê Lợi, Phường 2, Trà Vinh.

UPDATE thong_tin_cua_hang
SET
    dia_chi_day_du = '74-76 Lê Lợi, Phường 2, Trà Vinh',
    tinh_thanh = 'Trà Vinh',
    quan_huyen = 'Thành phố Trà Vinh',
    phuong_xa = 'Phường 2',
    kinh_do = 106.3419,
    vi_do = 9.9347
WHERE la_mac_dinh = TRUE;

UPDATE cau_hinh_van_chuyen
SET
    ten_vung = 'Nội thành Trà Vinh',
    ma_vung = 'INNER_TRA_VINH',
    khoang_cach_toi_thieu = 0,
    khoang_cach_toi_da = 10,
    phi_co_ban = 15000,
    danh_sach_tinh = '["trà vinh", "tp trà vinh", "thành phố trà vinh"]',
    thu_tu = 1
WHERE ma_vung IN ('INNER_HCMC', 'INNER_TRA_VINH');

UPDATE cau_hinh_van_chuyen
SET
    ten_vung = 'Khu vực gần Trà Vinh',
    ma_vung = 'NEAR_TRA_VINH',
    khoang_cach_toi_thieu = 10,
    khoang_cach_toi_da = 40,
    phi_co_ban = 25000,
    danh_sach_tinh = '[]',
    thu_tu = 2
WHERE ma_vung IN ('OUTER_HCMC', 'NEAR_TRA_VINH');

UPDATE cau_hinh_van_chuyen
SET
    khoang_cach_toi_thieu = 40,
    khoang_cach_toi_da = 120,
    phi_co_ban = 35000,
    danh_sach_tinh = '["vĩnh long", "bến tre", "sóc trăng", "cần thơ"]',
    thu_tu = 3
WHERE ma_vung = 'NEARBY_PROVINCES';

UPDATE cau_hinh_van_chuyen
SET
    khoang_cach_toi_thieu = 120,
    khoang_cach_toi_da = 400,
    danh_sach_tinh = '["tiền giang", "long an", "đồng tháp", "hậu giang", "an giang", "kiên giang", "bạc liêu", "cà mau", "hồ chí minh", "sài gòn", "tp.hcm", "tp hcm", "hcm"]',
    thu_tu = 4
WHERE ma_vung = 'SOUTH_REGION';
