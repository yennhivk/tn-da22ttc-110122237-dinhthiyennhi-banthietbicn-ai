/**
 * DistanceService
 *
 * - Haversine giữa 2 tọa độ (km, làm tròn 2 chữ số)
 * - Geocode địa chỉ qua Nominatim (OpenStreetMap), có cache + timeout
 * - Resolve origin = cửa hàng mặc định trong bảng thong_tin_cua_hang
 *
 * Không phụ thuộc Google API key.
 */

const axios = require('axios');
const db = require('../../config/database');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'http://router.project-osrm.org/route/v1/driving';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'YenNhiTechShippingV3/1.0';
const GEOCODE_TIMEOUT_MS = 8000;
const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

const geocodeCache = new Map();   // key = normalized address, value = { coords, expiresAt }
let originCache = { store: null, expiresAt: 0 };

function toRad(deg) { return (deg * Math.PI) / 180; }

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
}

/**
 * Lấy cửa hàng mặc định (origin point) từ thong_tin_cua_hang.
 * Trả về { id, name, address, province, lat, lng } hoặc throw nếu không có.
 */
async function getDefaultStore() {
    if (originCache.store && Date.now() < originCache.expiresAt) {
        return originCache.store;
    }
    const [rows] = await db.query(
        `SELECT ma_cua_hang AS id,
                ten_cua_hang AS name,
                dia_chi_day_du AS address,
                tinh_thanh AS province,
                vi_do AS lat,
                kinh_do AS lng
           FROM thong_tin_cua_hang
          WHERE la_mac_dinh = TRUE AND trang_thai = 'active'
          LIMIT 1`
    );
    if (rows.length === 0) {
        throw new Error('Chưa cấu hình cửa hàng mặc định (thong_tin_cua_hang.la_mac_dinh)');
    }
    originCache = { store: rows[0], expiresAt: Date.now() + 60 * 1000 };
    return rows[0];
}

function invalidateOriginCache() {
    originCache = { store: null, expiresAt: 0 };
}

/**
 * Geocode 1 địa chỉ → { latitude, longitude } hoặc null khi thất bại.
 */
async function geocode(address) {
    if (!address) return null;
    const key = String(address).trim().toLowerCase();
    const cached = geocodeCache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.coords;

    try {
        const res = await axios.get(NOMINATIM_URL, {
            params: { format: 'json', q: address, limit: 1, countrycodes: 'vn' },
            headers: { 'User-Agent': USER_AGENT },
            timeout: GEOCODE_TIMEOUT_MS
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
            const coords = {
                latitude: parseFloat(res.data[0].lat),
                longitude: parseFloat(res.data[0].lon),
                display_name: res.data[0].display_name
            };
            geocodeCache.set(key, { coords, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
            return coords;
        }
    } catch (err) {
        // im lặng — caller sẽ fallback
        console.warn('[DistanceService] geocode failed:', err.message);
    }
    return null;
}

/**
 * Trả về { distance_km, geocoded, fallback } cho cặp (origin, destination).
 * destination có thể là:
 *   { latitude, longitude }
 *   { address }
 *   cả hai
 * Nếu cả 2 cách đều thất bại → trả distance_km=null + fallback=true.
 */
async function distanceFrom(origin, destination) {
    if (!origin || origin.lat == null || origin.lng == null) {
        throw new Error('Origin thiếu tọa độ');
    }

    let coords = null;
    let geocoded = false;

    if (destination.latitude != null && destination.longitude != null) {
        coords = { latitude: parseFloat(destination.latitude), longitude: parseFloat(destination.longitude) };
    } else if (destination.address) {
        coords = await geocode(destination.address);
        geocoded = !!coords;
    }

    if (!coords) {
        return { distance_km: null, geocoded: false, fallback: true };
    }

    const distance_km = haversine(
        parseFloat(origin.lat),
        parseFloat(origin.lng),
        coords.latitude,
        coords.longitude
    );

    return {
        distance_km,
        geocoded,
        fallback: false,
        coords: {
            ...coords,
            duration_min: null,
            routing_used: false
        }
    };
}

module.exports = {
    haversine,
    geocode,
    distanceFrom,
    getDefaultStore,
    invalidateOriginCache
};
