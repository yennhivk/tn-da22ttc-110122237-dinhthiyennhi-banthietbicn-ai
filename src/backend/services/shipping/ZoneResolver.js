/**
 * ZoneResolver
 *
 * Quyết định rule áp dụng cho 1 yêu cầu tính phí, theo logic §6:
 *
 *   1. Same province (nội tỉnh)
 *        → tìm rule trong zone_type='distance' khớp khoảng cách
 *        → nếu km nằm trong buffer thì trả thêm rule kế tiếp để smoothing
 *   2. Different province (liên tỉnh)
 *        → tìm rule province (chứa province_code của destination)
 *        → nếu không có → fallback rule region (region_code của tỉnh đích)
 *
 * Output:
 *   {
 *     primary:    { zone, rule },                     // luôn có
 *     adjacent:   { zone, rule }   | null,            // dùng smoothing distance buffer
 *     bufferRatio: number          | null,            // 0..1
 *     matchType: 'province' | 'distance' | 'buffer' | 'region_fallback' | 'default'
 *   }
 *
 *   null nếu không match được bất kỳ rule nào (caller phải throw error rõ ràng).
 */

const db = require('../../config/database');

const CACHE_TTL_MS = 60 * 1000;
let zoneRulesCache = { rows: null, loadedAt: 0 };

async function loadActiveRules() {
    if (zoneRulesCache.rows && Date.now() - zoneRulesCache.loadedAt < CACHE_TTL_MS) {
        return zoneRulesCache.rows;
    }
    const [rows] = await db.query(`
        SELECT
            z.id              AS zone_id,
            z.zone_code,
            z.zone_name,
            z.zone_type,
            z.priority        AS zone_priority,
            r.id              AS rule_id,
            r.rule_name,
            r.km_from, r.km_to,
            r.base_fee, r.included_km, r.extra_per_km, r.buffer_zone_km,
            r.fixed_fee, r.province_codes, r.region_code,
            r.weight_limit_kg, r.extra_per_kg,
            r.min_fee, r.max_fee
        FROM shipping_zones z
        JOIN shipping_zone_rules r ON r.zone_id = z.id
        WHERE z.status = 'active'
          AND r.status = 'active'
          AND z.deleted_at IS NULL
          AND (z.effective_from IS NULL OR z.effective_from <= CURDATE())
          AND (z.effective_to   IS NULL OR z.effective_to   >= CURDATE())
          AND (r.effective_from IS NULL OR r.effective_from <= CURDATE())
          AND (r.effective_to   IS NULL OR r.effective_to   >= CURDATE())
        ORDER BY z.priority DESC, r.id ASC
    `);
    const parsed = rows.map(r => ({
        ...r,
        province_codes: Array.isArray(r.province_codes)
            ? r.province_codes
            : (r.province_codes ? JSON.parse(r.province_codes) : null)
    }));
    zoneRulesCache = { rows: parsed, loadedAt: Date.now() };
    return parsed;
}

function invalidateCache() {
    zoneRulesCache = { rows: null, loadedAt: 0 };
}

function makeBundle(row) {
    return {
        zone: {
            id: row.zone_id,
            zone_code: row.zone_code,
            zone_name: row.zone_name,
            zone_type: row.zone_type,
            priority: row.zone_priority
        },
        rule: {
            id: row.rule_id,
            rule_name: row.rule_name,
            km_from: row.km_from != null ? parseFloat(row.km_from) : null,
            km_to: row.km_to != null ? parseFloat(row.km_to) : null,
            base_fee: parseFloat(row.base_fee || 0),
            included_km: parseFloat(row.included_km || 0),
            extra_per_km: parseFloat(row.extra_per_km || 0),
            buffer_zone_km: parseFloat(row.buffer_zone_km || 0),
            fixed_fee: row.fixed_fee != null ? parseFloat(row.fixed_fee) : null,
            province_codes: row.province_codes,
            region_code: row.region_code,
            weight_limit_kg: parseFloat(row.weight_limit_kg || 0),
            extra_per_kg: parseFloat(row.extra_per_kg || 0),
            min_fee: row.min_fee != null ? parseFloat(row.min_fee) : null,
            max_fee: row.max_fee != null ? parseFloat(row.max_fee) : null
        }
    };
}

/**
 * @param {object} ctx
 * @param {string} ctx.sameProvince - true nếu origin và destination cùng tỉnh
 * @param {object} ctx.destinationProvince - record từ ProvinceMatcher (hoặc null)
 * @param {number} ctx.distanceKm - khoảng cách haversine (có thể null nếu fallback)
 */
async function resolve(ctx) {
    const { sameProvince, destinationProvince, distanceKm } = ctx;
    const rules = await loadActiveRules();

    // Distance-based khi nội tỉnh
    if (sameProvince && distanceKm != null) {
        const distanceRules = rules.filter(r => r.zone_type === 'distance');
        const inside = distanceRules.filter(r =>
            distanceKm >= (r.km_from ?? 0) &&
            (r.km_to == null || distanceKm < r.km_to)
        );

        if (inside.length > 0) {
            const primaryRow = inside[0];                // sorted by priority DESC
            const primary = makeBundle(primaryRow);

            return { primary, adjacent: null, bufferRatio: null, matchType: 'distance' };
        }

        // Nội tỉnh nhưng không khớp distance rule → fallback xuống region/default
    }

    // Province rule (liên tỉnh hoặc nội tỉnh nhưng không có distance rule khớp)
    if (destinationProvince) {
        const provRow = rules.find(r =>
            r.zone_type === 'province' &&
            Array.isArray(r.province_codes) &&
            r.province_codes.includes(destinationProvince.province_code)
        );
        if (provRow) {
            return { primary: makeBundle(provRow), adjacent: null, bufferRatio: null, matchType: 'province' };
        }

        // Region fallback
        const regionRow = rules.find(r =>
            r.zone_type === 'region' &&
            r.region_code === destinationProvince.region_code
        );
        if (regionRow) {
            return { primary: makeBundle(regionRow), adjacent: null, bufferRatio: null, matchType: 'region_fallback' };
        }
    }

    // Final fallback: zone region có priority cao nhất
    const fallbackRow = rules.find(r => r.zone_type === 'region');
    if (fallbackRow) {
        return { primary: makeBundle(fallbackRow), adjacent: null, bufferRatio: null, matchType: 'default' };
    }

    return null;
}

module.exports = {
    resolve,
    invalidateCache,
    loadActiveRules
};
