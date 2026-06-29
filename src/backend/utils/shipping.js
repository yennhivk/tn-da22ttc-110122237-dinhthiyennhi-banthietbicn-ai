/**
 * utils/shipping.js — WRAPPER giữ contract cho orders/auth/payment cũ.
 *
 * Bên trong delegate sang Shipping Engine V3 ở `services/shipping/`.
 * KHÔNG đụng tới chữ ký 4 hàm public dưới đây, vì:
 *   - routes/orders.js  dùng calculateShippingFee, saveShippingHistory
 *   - routes/auth.js    dùng calculateShipping
 *   - routes/payment.js dùng calculateShipping
 *
 * Tất cả các hàm helper cũ (calculateDistanceKm, geocodeAddress, findShippingZone,
 * getShippingDiscount, estimateDistanceByProvince) cũng được giữ tên và
 * forward sang engine mới khi cần.
 */

const engine = require('../services/shipping/ShippingFeeEngine');
const DistanceService = require('../services/shipping/DistanceService');
const ProvinceMatcher = require('../services/shipping/ProvinceMatcher');
const db = require('../config/database');

// ============================================================
// Public — KHÔNG đổi chữ ký
// ============================================================

/**
 * Compatibility helper (orders.js, auth.js, payment.js):
 *   calculateShipping(address, orderValue)
 * Trả về shape cũ: { distance_km, shipping_fee, base_fee, zone, is_fallback }
 */
async function calculateShipping(address, orderValue = 0, weight = 0) {
    const province = guessProvinceFromAddress(address);
    const result = await engine.calculate({
        destination: { address, province },
        weight: parseFloat(weight) || 0,
        order_value: orderValue,
        preview: false
    });

    if (!result.success) {
        return {
            distance_km: 0,
            shipping_fee: 30000,
            base_fee: 30000,
            zone: 'Mặc định',
            is_fallback: true
        };
    }

    return {
        distance_km: result.distance_km || 0,
        shipping_fee: result.shipping_fee,
        base_fee: result.breakdown.base_fee,
        zone: result.match.zone_name,
        is_fallback: !!result.is_fallback
    };
}

/**
 * Compatibility helper (orders.js):
 *   calculateShippingFee({ customerAddress, customerProvince, totalWeight, orderValue, specialFees, userLatitude, userLongitude })
 * Trả về shape cũ rộng.
 */
async function calculateShippingFee(params = {}) {
    const {
        customerAddress = null,
        customerProvince = null,
        userLatitude = null,
        userLongitude = null,
        totalWeight = 0,
        orderValue = 0,
        specialFees = []
    } = params;

    const result = await engine.calculate({
        destination: {
            address: customerAddress,
            province: customerProvince,
            latitude: userLatitude,
            longitude: userLongitude
        },
        weight: parseFloat(totalWeight) || 0,
        order_value: parseFloat(orderValue) || 0,
        preview: false
    });

    if (!result.success) {
        throw new Error(result.error?.message || 'Không tính được phí ship');
    }

    // Tính phí đặc biệt + discount theo dữ liệu legacy (orders.js vẫn dùng)
    const specialFeesApplied = await applyLegacySpecialFees(specialFees, result.breakdown.base_fee);
    const totalBeforeDiscount = result.shipping_fee + specialFeesApplied.total;
    const discount = await getLegacyDiscount(parseFloat(orderValue) || 0);
    const discountAmount = Math.round(totalBeforeDiscount * (discount.percent / 100));
    const finalFee = Math.max(0, Math.round(totalBeforeDiscount - discountAmount));

    return {
        success: true,
        distance_km: result.distance_km || 0,
        zone_name: result.match.zone_name,
        zone_code: result.match.zone_code,
        base_fee: result.breakdown.base_fee,
        weight_fee: result.breakdown.weight_fee,
        weight_limit_kg: result.breakdown.weight_limit_kg,
        total_weight_kg: parseFloat(totalWeight) || 0,
        special_fees: specialFeesApplied.items,
        special_fees_total: specialFeesApplied.total,
        subtotal_fee: totalBeforeDiscount,
        discount_percent: discount.percent,
        discount_amount: discountAmount,
        discount_description: discount.description,
        final_fee: finalFee,
        is_fallback: !!result.is_fallback,
        store_info: {
            name: result.origin.store_name,
            address: null
        }
    };
}

/**
 * Compatibility helper (orders.js): saveShippingHistory(orderId, shippingData)
 * Engine V3 đã tự log; hàm này chỉ "tag" log gần nhất vào orderId nếu chưa có.
 */
async function saveShippingHistory(orderId, shippingData = {}) {
    if (!orderId) return;
    try {
        await db.query(
            `UPDATE shipping_fee_logs
                SET order_id = ?
              WHERE order_id IS NULL
              ORDER BY id DESC
              LIMIT 1`,
            [orderId]
        );
    } catch (err) {
        console.error('[shipping.saveShippingHistory] failed:', err.message);
    }
}

// ============================================================
// Helpers giữ chữ ký cũ (export tiện cho code khác nếu có)
// ============================================================

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    return DistanceService.haversine(lat1, lon1, lat2, lon2);
}

async function geocodeAddress(address) {
    return DistanceService.geocode(address);
}

async function findShippingZone(distanceKm, province = '') {
    const result = await engine.previewByDistance({ distance_km: distanceKm, province });
    return result.success ? { ten_vung: result.zone_code, ma_vung: result.zone_code } : null;
}

async function getShippingDiscount(orderValue) {
    const d = await getLegacyDiscount(orderValue);
    return {
        phan_tram_giam: d.percent,
        mo_ta: d.description
    };
}

// ============================================================
// Private
// ============================================================

function guessProvinceFromAddress(address) {
    if (!address) return null;
    const parts = String(address).split(',').map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
}

/**
 * Special fees vẫn lưu trên bảng `phi_dac_biet` (giữ vì orders.js đang dùng).
 * Nếu bảng không tồn tại / không có code khớp → trả 0.
 */
async function applyLegacySpecialFees(codes, baseAmount) {
    if (!Array.isArray(codes) || codes.length === 0) return { items: [], total: 0 };
    try {
        const [rows] = await db.query(
            `SELECT ma_phi, ten_phi, gia_tri, loai_gia_tri
               FROM phi_dac_biet
              WHERE ma_phi IN (?) AND trang_thai = 'active'`,
            [codes]
        );
        let total = 0;
        const items = rows.map(r => {
            let value = parseFloat(r.gia_tri) || 0;
            if (r.loai_gia_tri === 'percent') value = Math.round(baseAmount * value / 100);
            total += value;
            return { code: r.ma_phi, name: r.ten_phi, value };
        });
        return { items, total };
    } catch (err) {
        // Bảng có thể không tồn tại (legacy hoàn toàn) — bỏ qua an toàn
        return { items: [], total: 0 };
    }
}

/**
 * Discount theo giá trị đơn hàng, lấy từ bảng shipping_discounts
 */
async function getLegacyDiscount(orderValue) {
    try {
        const [rows] = await db.query(
            `SELECT discount_percentage, description 
               FROM shipping_discounts 
              WHERE status = 'active' 
                AND order_value_from <= ? 
                AND (order_value_to IS NULL OR order_value_to >= ?)
              ORDER BY discount_percentage DESC, order_value_from DESC
              LIMIT 1`,
            [orderValue, orderValue]
        );
        if (rows.length > 0) {
            return {
                percent: parseInt(rows[0].discount_percentage) || 0,
                description: rows[0].description || 'Giảm giá phí ship'
            };
        }
    } catch (err) {
        console.error('[getLegacyDiscount] Lỗi truy vấn bảng shipping_discounts:', err.message);
    }
    return { percent: 0, description: 'Phí ship tiêu chuẩn' };
}

module.exports = {
    // Hàm bắt buộc giữ chữ ký
    calculateShipping,
    calculateShippingFee,
    saveShippingHistory,
    // Hàm helper export thêm (nếu nơi khác đang dùng)
    calculateDistanceKm,
    geocodeAddress,
    findShippingZone,
    getShippingDiscount
};
