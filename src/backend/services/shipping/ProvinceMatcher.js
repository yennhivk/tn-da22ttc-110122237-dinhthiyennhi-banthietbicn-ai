/**
 * ProvinceMatcher
 *
 * Chuẩn hóa và resolve tên tỉnh → bản ghi shipping_provinces.
 *
 * Logic chuẩn hóa:
 *   "TP. Hồ Chí Minh"  → "tp ho chi minh"
 *   "Vĩnh Long"         → "vinh long"
 *   "TP HCM"            → "tp hcm"
 *
 * Match:
 *   1. so khớp normalized_name (đầy đủ)
 *   2. so khớp aliases (JSON array)
 *   3. substring 2 chiều (chứa hoặc bị chứa)
 *
 * Có cache TTL 5 phút (lifetime của process) để giảm query.
 */

const db = require('../../config/database');

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { data: null, loadedAt: 0 };

function normalize(input) {
    if (!input) return '';
    return String(input)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')   // bỏ dấu
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')      // bỏ dấu chấm, gạch
        .replace(/\s+/g, ' ')
        .trim();
}

async function loadAll() {
    if (cache.data && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
        return cache.data;
    }
    const [rows] = await db.query(
        `SELECT id, province_code, province_name, normalized_name, region_code,
                estimated_distance_km, aliases, latitude, longitude
           FROM shipping_provinces
          WHERE status = 'active'`
    );
    const data = rows.map(r => ({
        ...r,
        aliases: Array.isArray(r.aliases) ? r.aliases : (r.aliases ? JSON.parse(r.aliases) : [])
    }));
    cache = { data, loadedAt: Date.now() };
    return data;
}

function invalidateCache() {
    cache = { data: null, loadedAt: 0 };
}

/**
 * Resolve tên tỉnh → province record.
 * @param {string} raw - tên tỉnh nhập vào (có dấu, hoa thường tùy ý)
 * @returns {Promise<object|null>}
 */
async function resolve(raw) {
    const target = normalize(raw);
    if (!target) return null;

    const provinces = await loadAll();

    // 1. exact match normalized_name
    let hit = provinces.find(p => p.normalized_name === target);
    if (hit) return hit;

    // 2. alias match
    hit = provinces.find(p => p.aliases.includes(target));
    if (hit) return hit;

    // 3. substring match (province chứa input hoặc ngược lại)
    hit = provinces.find(p =>
        p.normalized_name.includes(target) ||
        target.includes(p.normalized_name) ||
        p.aliases.some(a => a.includes(target) || target.includes(a))
    );
    return hit || null;
}

async function getByCode(code) {
    const provinces = await loadAll();
    return provinces.find(p => p.province_code === code) || null;
}

async function listAll() {
    return loadAll();
}

module.exports = {
    normalize,
    resolve,
    getByCode,
    listAll,
    invalidateCache
};
