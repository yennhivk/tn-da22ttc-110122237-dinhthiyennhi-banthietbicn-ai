/**
 * PricingCalculator
 *
 * Tính phí cuối từ 1 rule (hoặc cặp rule khi smoothing).
 *
 * Logic:
 *   distance rule    : base = base_fee + max(0, distance - included_km) * extra_per_km
 *   province/region  : base = fixed_fee
 *
 *   weight_fee = max(0, weight - weight_limit_kg) * extra_per_kg
 *   subtotal   = base + weight_fee
 *   final      = clamp(subtotal, min_fee, max_fee)
 *
 * Smoothing (buffer): nội suy tuyến tính giữa primary và adjacent theo ratio.
 * 
 * MIỄN PHÍ SHIP: Đơn hàng từ 2.000.000đ trở lên được miễn phí ship.
 */

const FREE_SHIPPING_THRESHOLD = 2000000; // 2 triệu đồng

function feeFromRule(rule, distanceKm) {
    if (rule.fixed_fee != null) {
        return { base: rule.fixed_fee, distance: 0 };
    }
    const base = parseFloat(rule.base_fee || 0);
    const included = parseFloat(rule.included_km || 0);
    const perKm = parseFloat(rule.extra_per_km || 0);
    const extraKm = distanceKm != null ? Math.max(0, distanceKm - included) : 0;
    const distancePart = extraKm * perKm;
    return { base: base + distancePart, distance: distancePart };
}

function weightFee(rule, weightKg) {
    if (weightKg == null || weightKg <= 0) return 0;
    const limit = parseFloat(rule.weight_limit_kg || 0);
    const perKg = parseFloat(rule.extra_per_kg || 0);
    if (weightKg <= limit || perKg <= 0) return 0;
    return Math.round((weightKg - limit) * perKg);
}

function clamp(value, min, max) {
    let v = value;
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
}

function calculateVolumetricWeight(lengthCm, widthCm, heightCm) {
    const l = parseFloat(lengthCm) || 0;
    const w = parseFloat(widthCm) || 0;
    const h = parseFloat(heightCm) || 0;
    if (l <= 0 || w <= 0 || h <= 0) return 0;
    return (l * w * h) / 5000;
}

/**
 * @param {object} matched - output của ZoneResolver.resolve
 * @param {number|null} distanceKm
 * @param {number} weightKg
 * @param {number} orderValue - giá trị đơn hàng để kiểm tra miễn phí ship
 * @param {object} dimensions - kích thước { length, width, height }
 * @param {object} config - cấu hình carrier để tính phí bảo hiểm
 */
function calculate(matched, distanceKm, weightKg, orderValue = 0, dimensions = {}, config = {}) {
    const { primary } = matched;

    const volWeight = calculateVolumetricWeight(dimensions.length, dimensions.width, dimensions.height);
    const billableWeight = Math.max(weightKg, volWeight);

    const isFreeShippingEnabled = config.free_shipping_enabled !== false;
    const rawThreshold = parseFloat(config.free_shipping_threshold);
    const freeShippingThreshold = isFreeShippingEnabled ? (!isNaN(rawThreshold) ? rawThreshold : 2000000) : Infinity;

    // Kiểm tra miễn phí ship
    if (orderValue >= freeShippingThreshold) {
        return {
            base_fee: 0,
            distance_fee: 0,
            weight_fee: 0,
            insurance_fee: 0,
            volumetric_weight: parseFloat(volWeight.toFixed(2)),
            billable_weight: parseFloat(billableWeight.toFixed(2)),
            subtotal_fee: 0,
            final_fee: 0,
            free_shipping_applied: true,
            free_shipping_threshold: freeShippingThreshold
        };
    }

    const primaryFee = feeFromRule(primary.rule, distanceKm);
    const baseFee = primaryFee.base;
    const distanceFee = primaryFee.distance;

    const wFee = weightFee(primary.rule, billableWeight);
    
    // Tính phí khai giá (bảo hiểm)
    let insFee = 0;
    if (config.insurance_fee_enabled && orderValue >= (config.insurance_min_order_value ?? 1000000)) {
        const pct = parseFloat(config.insurance_fee_percent ?? 0.5) / 100;
        insFee = Math.round(orderValue * pct);
    }

    const subtotal = baseFee + wFee + insFee;
    const final = clamp(subtotal, primary.rule.min_fee, primary.rule.max_fee);

    return {
        base_fee: Math.round(baseFee),
        distance_fee: Math.round(distanceFee),
        weight_fee: Math.round(wFee),
        insurance_fee: Math.round(insFee),
        volumetric_weight: parseFloat(volWeight.toFixed(2)),
        billable_weight: parseFloat(billableWeight.toFixed(2)),
        subtotal_fee: Math.round(subtotal),
        final_fee: Math.round(Math.max(0, final)),
        free_shipping_applied: false
    };
}

module.exports = { calculate, feeFromRule, weightFee, FREE_SHIPPING_THRESHOLD };
