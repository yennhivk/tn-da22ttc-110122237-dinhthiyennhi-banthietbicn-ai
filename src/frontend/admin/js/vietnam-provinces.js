// ==========================================
// Quản lý dữ liệu địa giới hành chính Việt Nam
// Sử dụng API công khai: https://provinces.open-api.vn
// Đầy đủ 63 tỉnh thành + quận/huyện + phường/xã
// ==========================================

const PROVINCES_API = 'https://provinces.open-api.vn/api';

// Cache dữ liệu để tránh gọi API nhiều lần
let provincesCache = null;
let districtsCache = {};
let wardsCache = {};

// Lấy danh sách tất cả tỉnh/thành
async function fetchProvinces() {
    if (provincesCache) return provincesCache;

    try {
        const response = await fetch(`${PROVINCES_API}/p/`);
        if (!response.ok) throw new Error('Failed to fetch provinces');
        provincesCache = await response.json();
        return provincesCache;
    } catch (error) {
        console.error('Lỗi tải danh sách tỉnh/thành:', error);
        return [];
    }
}

// Lấy danh sách quận/huyện theo mã tỉnh
async function fetchDistricts(provinceCode) {
    if (districtsCache[provinceCode]) return districtsCache[provinceCode];

    try {
        const response = await fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`);
        if (!response.ok) throw new Error('Failed to fetch districts');
        const data = await response.json();
        districtsCache[provinceCode] = data.districts || [];
        return districtsCache[provinceCode];
    } catch (error) {
        console.error('Lỗi tải danh sách quận/huyện:', error);
        return [];
    }
}

// Lấy danh sách phường/xã theo mã quận
async function fetchWards(districtCode) {
    if (wardsCache[districtCode]) return wardsCache[districtCode];

    try {
        const response = await fetch(`${PROVINCES_API}/d/${districtCode}?depth=2`);
        if (!response.ok) throw new Error('Failed to fetch wards');
        const data = await response.json();
        wardsCache[districtCode] = data.wards || [];
        return wardsCache[districtCode];
    } catch (error) {
        console.error('Lỗi tải danh sách phường/xã:', error);
        return [];
    }
}
