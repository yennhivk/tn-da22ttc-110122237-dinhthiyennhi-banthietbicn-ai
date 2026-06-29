/**
 * ShippingFeeEngine — V4
 *
 * Public API duy nhất cho việc tính phí ship.
 * Hỗ trợ Mode A (Local Rules Engine + Volumetric Weight)
 * và Mode B (Direct Live APIs: GHN / GHTK).
 */

const db = require('../../config/database');
const DistanceService = require('./DistanceService');
const ProvinceMatcher = require('./ProvinceMatcher');
const ZoneResolver = require('./ZoneResolver');
const PricingCalculator = require('./PricingCalculator');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../data/shipping_carrier_config.json');

function getCarrierConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading carrier config:', e);
    }
    return {
        active_mode: 'local',
        default_length_cm: 15,
        default_width_cm: 10,
        default_height_cm: 5,
        default_weight_kg: 0.5,
        ghn_token: '',
        ghn_shop_id: '',
        ghtk_token: '',
        insurance_fee_enabled: true,
        insurance_fee_percent: 0.5,
        insurance_min_order_value: 1000000,
        free_shipping_enabled: true,
        free_shipping_threshold: 2000000
    };
}

function buildErrorResult(message, code = 'CALC_ERROR') {
    return {
        success: false,
        error: { code, message },
        shipping_fee: 0
    };
}

// In-memory cache for GHN location lookups
const ghnLocationCache = {
    provinces: null,
    districts: {},
    wards: {}
};

function normalizeText(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function parseAddress(address, provinceName) {
    const result = {
        province: provinceName || '',
        district: '',
        ward: ''
    };
    if (!address) return result;
    
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    const len = parts.length;
    
    if (!result.province && len > 0) {
        result.province = parts[len - 1];
    }
    if (len > 1) {
        result.district = parts[len - 2];
    }
    if (len > 2) {
        result.ward = parts[len - 3];
    }
    
    return result;
}

async function getGhnProvinceId(token, provinceName) {
    const isTest = String(token).toLowerCase().includes('test') || String(token).startsWith('dev');
    const baseUrl = isTest ? 'https://dev-online-gateway.ghn.vn' : 'https://online-gateway.ghn.vn';
    
    if (!ghnLocationCache.provinces) {
        const res = await axios.get(`${baseUrl}/shiip/public-api/master-data/province`, {
            headers: { 'Token': token }
        });
        if (res.data && res.data.data) {
            ghnLocationCache.provinces = res.data.data;
        }
    }
    
    if (ghnLocationCache.provinces) {
        const norm = normalizeText(provinceName);
        const match = ghnLocationCache.provinces.find(p => normalizeText(p.ProvinceName).includes(norm) || norm.includes(normalizeText(p.ProvinceName)));
        return match ? match.ProvinceID : null;
    }
    return null;
}

async function getGhnDistrictId(token, provinceId, districtName) {
    const isTest = String(token).toLowerCase().includes('test') || String(token).startsWith('dev');
    const baseUrl = isTest ? 'https://dev-online-gateway.ghn.vn' : 'https://online-gateway.ghn.vn';
    
    if (!ghnLocationCache.districts[provinceId]) {
        const res = await axios.post(`${baseUrl}/shiip/public-api/master-data/district`, 
            { province_id: provinceId },
            { headers: { 'Token': token } }
        );
        if (res.data && res.data.data) {
            ghnLocationCache.districts[provinceId] = res.data.data;
        }
    }
    
    if (ghnLocationCache.districts[provinceId]) {
        const norm = normalizeText(districtName);
        const match = ghnLocationCache.districts[provinceId].find(d => normalizeText(d.DistrictName).includes(norm) || norm.includes(normalizeText(d.DistrictName)));
        return match ? match.DistrictID : null;
    }
    return null;
}

async function getGhnWardCode(token, districtId, wardName) {
    const isTest = String(token).toLowerCase().includes('test') || String(token).startsWith('dev');
    const baseUrl = isTest ? 'https://dev-online-gateway.ghn.vn' : 'https://online-gateway.ghn.vn';
    
    if (!ghnLocationCache.wards[districtId]) {
        const res = await axios.post(`${baseUrl}/shiip/public-api/master-data/ward`, 
            { district_id: districtId },
            { headers: { 'Token': token } }
        );
        if (res.data && res.data.data) {
            ghnLocationCache.wards[districtId] = res.data.data;
        }
    }
    
    if (ghnLocationCache.wards[districtId]) {
        const norm = normalizeText(wardName);
        const match = ghnLocationCache.wards[districtId].find(w => normalizeText(w.WardName).includes(norm) || norm.includes(normalizeText(w.WardName)));
        return match ? match.WardCode : null;
    }
    return null;
}

async function calculateGhn(token, shopId, origin, destination, billableWeight, orderValue, dimensions) {
    const isTest = String(token).toLowerCase().includes('test') || String(token).startsWith('dev');
    const baseUrl = isTest ? 'https://dev-online-gateway.ghn.vn' : 'https://online-gateway.ghn.vn';
    
    const destParsed = parseAddress(destination.address, destination.province);
    const originParsed = parseAddress(origin.address, origin.province || 'Trà Vinh');
    
    const fromProvinceId = await getGhnProvinceId(token, originParsed.province || 'Trà Vinh');
    if (!fromProvinceId) throw new Error('Không tìm thấy mã tỉnh gốc của cửa hàng tại GHN');
    
    const fromDistrictId = await getGhnDistrictId(token, fromProvinceId, originParsed.district || 'Thành phố Trà Vinh');
    if (!fromDistrictId) throw new Error('Không tìm thấy mã quận gốc của cửa hàng tại GHN');
    
    const toProvinceId = await getGhnProvinceId(token, destParsed.province);
    if (!toProvinceId) throw new Error('Không xác định được tỉnh giao hàng tại GHN');
    
    const toDistrictId = await getGhnDistrictId(token, toProvinceId, destParsed.district);
    if (!toDistrictId) throw new Error('Không xác định được quận/huyện giao hàng tại GHN');
    
    const toWardCode = await getGhnWardCode(token, toDistrictId, destParsed.ward);
    if (!toWardCode) throw new Error('Không xác định được phường/xã giao hàng tại GHN');

    const payload = {
        from_district_id: parseInt(fromDistrictId),
        to_district_id: parseInt(toDistrictId),
        to_ward_code: String(toWardCode),
        height: parseInt(dimensions.height || 5),
        length: parseInt(dimensions.length || 15),
        width: parseInt(dimensions.width || 10),
        weight: Math.round(billableWeight * 1000), // GHN expects grams
        insurance_value: Math.min(5000000, Math.round(orderValue)),
        service_type_id: 2
    };

    const response = await axios.post(`${baseUrl}/shiip/public-api/v2/shipping-order/fee`, payload, {
        headers: {
            'Token': token,
            'ShopId': parseInt(shopId),
            'Content-Type': 'application/json'
        }
    });

    if (response.data && response.data.code === 200 && response.data.data) {
        return {
            fee: response.data.data.total,
            insurance_fee: response.data.data.insurance || 0
        };
    }
    throw new Error(response.data?.message || 'Lỗi tính phí của GHN API');
}

async function calculateGhtk(token, origin, destination, billableWeight, orderValue) {
    const isTest = String(token).toLowerCase().includes('test') || String(token).startsWith('dev');
    const baseUrl = isTest ? 'https://services.ghtk.vn' : 'https://services.giaohangtietkiem.vn';
    
    const destParsed = parseAddress(destination.address, destination.province);
    const originParsed = parseAddress(origin.address, origin.province || 'Trà Vinh');
    
    const params = {
        pick_province: originParsed.province || 'Trà Vinh',
        pick_district: originParsed.district || 'Thành phố Trà Vinh',
        province: destParsed.province || '',
        district: destParsed.district || '',
        address: destination.address || '',
        weight: Math.round(billableWeight * 1000),
        value: Math.round(orderValue)
    };

    const response = await axios.get(`${baseUrl}/services/shipment/fee`, {
        params,
        headers: { 'Token': token }
    });

    if (response.data && response.data.success && response.data.fee) {
        return {
            fee: response.data.fee.fee,
            insurance_fee: response.data.fee.insurance_fee || 0
        };
    }
    throw new Error(response.data?.message || 'Lỗi tính phí của GHTK API');
}

async function calculate(input = {}) {
    const startedAt = Date.now();
    const destination = input.destination || {};
    const weight = parseFloat(input.weight ?? input.weight_kg ?? 0) || 0;
    const orderValue = parseFloat(input.order_value ?? input.orderValue ?? 0) || 0;
    const preview = !!input.preview;

    const config = getCarrierConfig();
    const length = parseFloat(input.length ?? input.length_cm ?? config.default_length_cm ?? 15);
    const width = parseFloat(input.width ?? input.width_cm ?? config.default_width_cm ?? 10);
    const height = parseFloat(input.height ?? input.height_cm ?? config.default_height_cm ?? 5);
    const dimensions = { length, width, height };

    try {
        // 1. Origin store
        const origin = await DistanceService.getDefaultStore();
        const originProvince = await ProvinceMatcher.resolve(origin.province);

        // 2. Resolve destination province
        let destProvinceRaw = destination.province || destination.tinh_thanh || null;
        if (!destProvinceRaw && destination.address) {
            const parts = String(destination.address).split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length > 0) {
                destProvinceRaw = parts[parts.length - 1];
            }
        }
        const destinationProvince = await ProvinceMatcher.resolve(destProvinceRaw);

        // 3. Distance
        const distResult = await DistanceService.distanceFrom(origin, destination);
        let distanceKm = distResult.distance_km;
        let isFallback = distResult.fallback;

        if (distanceKm == null && destinationProvince && destinationProvince.estimated_distance_km != null) {
            distanceKm = parseFloat(destinationProvince.estimated_distance_km);
            isFallback = true;
        }

        let pricing = null;
        let matched = null;
        let activeModeUsed = config.active_mode || 'local';

        const isFreeShippingEnabled = config.free_shipping_enabled !== false;
        const rawThreshold = parseFloat(config.free_shipping_threshold);
        const freeShippingThreshold = isFreeShippingEnabled ? (!isNaN(rawThreshold) ? rawThreshold : 2000000) : Infinity;

        // MODE B: GIAO HÀNG NHANH
        if (activeModeUsed === 'ghn' && config.ghn_token && config.ghn_shop_id) {
            try {
                const volWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
                const billableWeight = Math.max(weight, volWeight);

                if (orderValue >= freeShippingThreshold) {
                    pricing = {
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
                } else {
                    const ghnRes = await calculateGhn(config.ghn_token, config.ghn_shop_id, origin, destination, billableWeight, orderValue, dimensions);
                    pricing = {
                        base_fee: ghnRes.fee - ghnRes.insurance_fee,
                        distance_fee: 0,
                        weight_fee: 0,
                        insurance_fee: ghnRes.insurance_fee,
                        volumetric_weight: parseFloat(volWeight.toFixed(2)),
                        billable_weight: parseFloat(billableWeight.toFixed(2)),
                        subtotal_fee: ghnRes.fee,
                        final_fee: ghnRes.fee,
                        free_shipping_applied: false
                    };
                }

                matched = {
                    matchType: 'default',
                    primary: {
                        zone: { id: 0, zone_code: 'GHN_LIVE', zone_name: 'Giao Hàng Nhanh API', zone_type: 'province', priority: 10 },
                        rule: { id: 0, rule_name: 'GHN API Rule', weight_limit_kg: 1, extra_per_kg: 5000, min_fee: 0, max_fee: 999999 }
                    },
                    bufferRatio: null,
                    adjacent: null
                };
            } catch (err) {
                console.warn('[ShippingFeeEngine] GHN API failed, falling back to Local Rules:', err.message);
                activeModeUsed = 'local';
            }
        }

        // MODE B: GIAO HÀNG TIẾT KIỆM
        if (activeModeUsed === 'ghtk' && config.ghtk_token) {
            try {
                const volWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
                const billableWeight = Math.max(weight, volWeight);

                if (orderValue >= freeShippingThreshold) {
                    pricing = {
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
                } else {
                    const ghtkRes = await calculateGhtk(config.ghtk_token, origin, destination, billableWeight, orderValue);
                    pricing = {
                        base_fee: ghtkRes.fee - ghtkRes.insurance_fee,
                        distance_fee: 0,
                        weight_fee: 0,
                        insurance_fee: ghtkRes.insurance_fee,
                        volumetric_weight: parseFloat(volWeight.toFixed(2)),
                        billable_weight: parseFloat(billableWeight.toFixed(2)),
                        subtotal_fee: ghtkRes.fee,
                        final_fee: ghtkRes.fee,
                        free_shipping_applied: false
                    };
                }

                matched = {
                    matchType: 'default',
                    primary: {
                        zone: { id: 0, zone_code: 'GHTK_LIVE', zone_name: 'Giao Hàng Tiết Kiệm API', zone_type: 'province', priority: 10 },
                        rule: { id: 0, rule_name: 'GHTK API Rule', weight_limit_kg: 1, extra_per_kg: 5000, min_fee: 0, max_fee: 999999 }
                    },
                    bufferRatio: null,
                    adjacent: null
                };
            } catch (err) {
                console.warn('[ShippingFeeEngine] GHTK API failed, falling back to Local Rules:', err.message);
                activeModeUsed = 'local';
            }
        }

        // MODE A: LOCAL RULES ENGINE (or Fallback)
        if (activeModeUsed === 'local' || !pricing) {
            const sameProvince =
                originProvince && destinationProvince &&
                originProvince.province_code === destinationProvince.province_code;

            matched = await ZoneResolver.resolve({
                sameProvince,
                destinationProvince,
                distanceKm
            });

            if (!matched) {
                return buildErrorResult(
                    'Không tìm thấy vùng phí ship phù hợp cho địa chỉ này',
                    'NO_ZONE_MATCH'
                );
            }

            pricing = PricingCalculator.calculate(matched, distanceKm, weight, orderValue, dimensions, config);
        }

        const calcTimeMs = Date.now() - startedAt;

        const result = {
            success: true,
            shipping_fee: pricing.final_fee,
            distance_km: distanceKm,
            is_fallback: isFallback,
            free_shipping_applied: pricing.free_shipping_applied || false,
            match: {
                type: matched.matchType,
                zone_id: matched.primary.zone.id,
                zone_code: matched.primary.zone.zone_code,
                zone_name: matched.primary.zone.zone_name,
                zone_type: matched.primary.zone.zone_type,
                rule_id: matched.primary.rule.id,
                buffer_ratio: matched.bufferRatio,
                adjacent_zone_code: matched.adjacent ? matched.adjacent.zone.zone_code : null
            },
            breakdown: {
                base_fee: pricing.base_fee,
                distance_fee: pricing.distance_fee,
                weight_fee: pricing.weight_fee,
                insurance_fee: pricing.insurance_fee || 0,
                volumetric_weight: pricing.volumetric_weight || 0,
                billable_weight: pricing.billable_weight || 0,
                subtotal_fee: pricing.subtotal_fee,
                final_fee: pricing.final_fee,
                free_shipping_applied: pricing.free_shipping_applied || false,
                free_shipping_threshold: pricing.free_shipping_threshold || null,
                weight_limit_kg: matched.primary.rule.weight_limit_kg,
                extra_per_kg: matched.primary.rule.extra_per_kg,
                min_fee: matched.primary.rule.min_fee,
                max_fee: matched.primary.rule.max_fee
            },
            origin: {
                store_id: origin.id,
                store_name: origin.name,
                province: origin.province
            },
            destination: {
                province: destinationProvince ? destinationProvince.province_name : (destProvinceRaw || null),
                province_code: destinationProvince ? destinationProvince.province_code : null,
                region_code: destinationProvince ? destinationProvince.region_code : null
            },
            meta: {
                calculation_time_ms: calcTimeMs,
                geocoded: distResult.geocoded,
                duration_min: distResult.coords?.duration_min || null,
                routing_used: distResult.coords?.routing_used || false,
                active_mode: activeModeUsed,
                preview
            }
        };

        if (!preview) {
            await logCalculation(input, destination, distanceKm, matched, pricing, result, calcTimeMs)
                .catch(err => console.warn('[ShippingFeeEngine] log failed:', err.message));
        }

        return result;
    } catch (err) {
        console.error('[ShippingFeeEngine] error:', err);
        return buildErrorResult(err.message, err.code || 'CALC_ERROR');
    }
}

async function logCalculation(input, destination, distanceKm, matched, pricing, result, calcTimeMs) {
    await db.query(
        `INSERT INTO shipping_fee_logs
            (order_id, zone_id, rule_id,
             input_address, input_province, input_latitude, input_longitude,
             input_weight_kg, input_order_value, input_snapshot,
             distance_km, match_type,
             base_fee, distance_fee, weight_fee, subtotal_fee, final_fee, breakdown,
             is_preview, is_fallback, calculation_time_ms, geocoding_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            input.order_id || null,
            matched.primary.zone.id || null,
            matched.primary.rule.id || null,
            destination.address || destination.dia_chi || null,
            destination.province || destination.tinh_thanh || null,
            destination.latitude != null ? parseFloat(destination.latitude) : null,
            destination.longitude != null ? parseFloat(destination.longitude) : null,
            parseFloat(input.weight ?? input.weight_kg ?? 0) || 0,
            parseFloat(input.order_value ?? input.orderValue ?? 0) || 0,
            JSON.stringify(input),
            distanceKm,
            matched.matchType,
            pricing.base_fee,
            pricing.distance_fee,
            pricing.weight_fee,
            pricing.subtotal_fee,
            pricing.final_fee,
            JSON.stringify(result.breakdown),
            0,
            result.is_fallback ? 1 : 0,
            calcTimeMs,
            result.meta.geocoded ? 1 : 0
        ]
    );
}

async function previewByDistance({ distance_km, province, weight = 0 }) {
    const origin = await DistanceService.getDefaultStore();
    const originProvince = await ProvinceMatcher.resolve(origin.province);
    const destinationProvince = province ? await ProvinceMatcher.resolve(province) : null;
    const sameProvince =
        originProvince && destinationProvince &&
        originProvince.province_code === destinationProvince.province_code;

    const matched = await ZoneResolver.resolve({
        sameProvince,
        destinationProvince,
        distanceKm: distance_km
    });
    if (!matched) return buildErrorResult('Không match được zone', 'NO_ZONE_MATCH');

    const pricing = PricingCalculator.calculate(matched, distance_km, weight, 0, {}, getCarrierConfig());
    return {
        success: true,
        distance_km,
        match_type: matched.matchType,
        zone_code: matched.primary.zone.zone_code,
        rule_id: matched.primary.rule.id,
        breakdown: pricing
    };
}

module.exports = {
    calculate,
    previewByDistance
};
