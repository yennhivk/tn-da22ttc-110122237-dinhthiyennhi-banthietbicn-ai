/**
 * Shipping API — V3
 *
 * Endpoint URL được GIỮ NGUYÊN ở prefix `/api/shipping-config` để
 * frontend cũ (checkout.html) không phải đổi.
 *
 * Public:
 *   POST   /calculate           — tính phí ship (checkout)
 *   GET    /stores/default      — lấy cửa hàng mặc định (FE user/admin nhỏ)
 *
 * Admin:
 *   GET    /zones               — list zones + rules
 *   POST   /zones               — tạo zone
 *   PUT    /zones/:id           — sửa zone
 *   DELETE /zones/:id           — soft delete
 *   POST   /zones/:id/rules     — thêm rule
 *   PUT    /rules/:id           — sửa rule
 *   DELETE /rules/:id           — xóa rule
 *   GET    /provinces           — danh sách 63 tỉnh + region
 *   GET    /regions             — danh sách region
 *   POST   /preview             — tính preview (không log)
 *   POST   /simulate            — chạy nhiều scenario một lúc
 *   GET    /stores              — list cửa hàng
 *   POST   /stores              — tạo cửa hàng
 *   PUT    /stores/:id          — sửa cửa hàng
 *   DELETE /stores/:id          — xóa cửa hàng
 *   GET    /logs                — query log
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/authMiddleware');

const engine = require('../services/shipping/ShippingFeeEngine');
const ProvinceMatcher = require('../services/shipping/ProvinceMatcher');
const ZoneResolver = require('../services/shipping/ZoneResolver');
const DistanceService = require('../services/shipping/DistanceService');

// ============================================================
// PUBLIC: POST /calculate  (FE checkout đang dùng)
// Giữ shape response cũ: { success, data: { final_fee, distance_km, zone_name, base_fee, weight_fee, discount_percent, discount_amount, ... } }
// ============================================================
router.post('/calculate', async (req, res) => {
    try {
        const {
            address = null,
            province = null,
            weight = 0,
            orderValue = 0,
            userLatitude = null,
            userLongitude = null
        } = req.body;

        console.log('[shipping/calculate] 💰 Order Value received:', orderValue);
        console.log('[shipping/calculate] 🔍 Request body:', req.body);

        if (!address && (userLatitude == null || userLongitude == null) && !province) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu địa chỉ hoặc tọa độ giao hàng'
            });
        }

        const result = await engine.calculate({
            destination: {
                address,
                province,
                latitude: userLatitude,
                longitude: userLongitude
            },
            weight: parseFloat(weight) || 0,
            order_value: parseFloat(orderValue) || 0
        });

        console.log('[shipping/calculate] 📦 Engine result:', {
            success: result.success,
            shipping_fee: result.shipping_fee,
            free_shipping_applied: result.free_shipping_applied,
            order_value_used: parseFloat(orderValue) || 0
        });

        if (!result.success) {
            return res.status(422).json({ success: false, message: result.error?.message || 'Không tính được phí ship' });
        }

        // Discount theo bậc giá trị đơn (giữ logic hiện tại của FE)
        const discount = await computeDiscount(parseFloat(orderValue) || 0, result.shipping_fee);

        const data = {
            final_fee: Math.max(0, result.shipping_fee - discount.amount),
            distance_km: result.distance_km,
            zone_name: result.match.zone_name,
            zone_code: result.match.zone_code,
            zone_type: result.match.zone_type,
            match_type: result.match.type,
            base_fee: result.breakdown.base_fee,
            distance_fee: result.breakdown.distance_fee,
            weight_fee: result.breakdown.weight_fee,
            subtotal_fee: result.breakdown.subtotal_fee,
            discount_percent: discount.percent,
            discount_amount: discount.amount,
            discount_description: discount.description,
            is_fallback: result.is_fallback,
            free_shipping_applied: result.free_shipping_applied || false,
            free_shipping_threshold: result.breakdown.free_shipping_threshold || null,
            origin: result.origin,
            destination: result.destination
        };

        console.log('[shipping/calculate] ✅ Response data:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('[shipping/calculate] error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

async function computeDiscount(orderValue, shippingFee) {
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
            const pct = parseInt(rows[0].discount_percentage) || 0;
            const amount = Math.round(shippingFee * (pct / 100));
            return {
                percent: pct,
                amount: amount,
                description: rows[0].description || 'Giảm giá phí ship'
            };
        }
    } catch (err) {
        console.error('[computeDiscount] Lỗi truy vấn bảng shipping_discounts:', err.message);
    }
    return { percent: 0, amount: 0, description: 'Phí ship tiêu chuẩn' };
}

// ============================================================
// PUBLIC: GET /stores/default
// ============================================================
router.get('/stores/default', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM thong_tin_cua_hang WHERE la_mac_dinh = TRUE AND trang_thai='active' LIMIT 1`
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không có cửa hàng mặc định' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: ZONES
// ============================================================
router.get('/zones', requireAdmin, async (req, res) => {
    try {
        const [zones] = await db.query(`
            SELECT * FROM shipping_zones
            WHERE deleted_at IS NULL
            ORDER BY priority DESC, id ASC
        `);
        const [rules] = await db.query(`
            SELECT * FROM shipping_zone_rules
            WHERE status <> 'expired'
            ORDER BY zone_id, id
        `);
        const rulesByZone = rules.reduce((acc, r) => {
            const key = r.zone_id;
            (acc[key] = acc[key] || []).push({
                ...r,
                province_codes: parseJSON(r.province_codes)
            });
            return acc;
        }, {});
        const data = zones.map(z => ({ ...z, rules: rulesByZone[z.id] || [] }));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/zones', requireAdmin, async (req, res) => {
    try {
        const { zone_code, zone_name, zone_type, priority = 50, description = null, status = 'active', effective_from = null, effective_to = null } = req.body;
        if (!zone_code || !zone_name || !zone_type) {
            return res.status(400).json({ success: false, message: 'Thiếu zone_code/zone_name/zone_type' });
        }
        if (!['distance', 'province', 'region'].includes(zone_type)) {
            return res.status(400).json({ success: false, message: 'zone_type không hợp lệ' });
        }
        const [result] = await db.query(
            `INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status, effective_from, effective_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [zone_code, zone_name, zone_type, priority, description, status, effective_from, effective_to]
        );
        ZoneResolver.invalidateCache();
        res.json({ success: true, data: { id: result.insertId } });
    } catch (err) {
        const msg = err.code === 'ER_DUP_ENTRY' ? 'zone_code đã tồn tại' : err.message;
        res.status(400).json({ success: false, message: msg });
    }
});

router.put('/zones/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const fields = ['zone_code', 'zone_name', 'zone_type', 'priority', 'description', 'status', 'effective_from', 'effective_to'];
        const sets = [];
        const values = [];
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                sets.push(`${f} = ?`);
                values.push(req.body[f]);
            }
        }
        if (sets.length === 0) return res.status(400).json({ success: false, message: 'Không có thay đổi' });
        values.push(id);
        await db.query(`UPDATE shipping_zones SET ${sets.join(', ')} WHERE id = ?`, values);
        ZoneResolver.invalidateCache();
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.delete('/zones/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`UPDATE shipping_zones SET deleted_at = CURRENT_TIMESTAMP, status='inactive' WHERE id = ?`, [id]);
        ZoneResolver.invalidateCache();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: RULES
// ============================================================
router.post('/zones/:zoneId/rules', requireAdmin, async (req, res) => {
    try {
        const { zoneId } = req.params;
        const [zones] = await db.query(`SELECT zone_type FROM shipping_zones WHERE id=? AND deleted_at IS NULL`, [zoneId]);
        if (zones.length === 0) return res.status(404).json({ success: false, message: 'Zone không tồn tại' });
        const zoneType = zones[0].zone_type;

        const body = req.body || {};
        const isFixed = zoneType !== 'distance';
        if (isFixed && body.fixed_fee == null) {
            return res.status(400).json({ success: false, message: 'Zone province/region phải có fixed_fee' });
        }
        if (zoneType === 'distance' && body.base_fee == null) {
            return res.status(400).json({ success: false, message: 'Zone distance phải có base_fee' });
        }
        if (zoneType === 'province' && !Array.isArray(body.province_codes)) {
            return res.status(400).json({ success: false, message: 'Zone province cần province_codes là mảng' });
        }
        if (zoneType === 'region' && !body.region_code) {
            return res.status(400).json({ success: false, message: 'Zone region cần region_code' });
        }

        const [result] = await db.query(
            `INSERT INTO shipping_zone_rules
             (zone_id, rule_name, km_from, km_to, base_fee, included_km, extra_per_km, buffer_zone_km,
              fixed_fee, province_codes, region_code,
              weight_limit_kg, extra_per_kg, min_fee, max_fee,
              effective_from, effective_to, status, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                zoneId,
                body.rule_name || null,
                body.km_from ?? null,
                body.km_to ?? null,
                body.base_fee ?? 0,
                body.included_km ?? 0,
                body.extra_per_km ?? 0,
                body.buffer_zone_km ?? 0,
                body.fixed_fee ?? null,
                body.province_codes ? JSON.stringify(body.province_codes) : null,
                body.region_code ?? null,
                body.weight_limit_kg ?? 5,
                body.extra_per_kg ?? 5000,
                body.min_fee ?? null,
                body.max_fee ?? null,
                body.effective_from ?? null,
                body.effective_to ?? null,
                body.status || 'active',
                body.note ?? null
            ]
        );
        ZoneResolver.invalidateCache();
        res.json({ success: true, data: { id: result.insertId } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.put('/rules/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const allow = ['rule_name', 'km_from', 'km_to', 'base_fee', 'included_km', 'extra_per_km', 'buffer_zone_km',
            'fixed_fee', 'province_codes', 'region_code', 'weight_limit_kg', 'extra_per_kg',
            'min_fee', 'max_fee', 'effective_from', 'effective_to', 'status', 'note'];
        const sets = [];
        const values = [];
        for (const f of allow) {
            if (req.body[f] !== undefined) {
                sets.push(`${f} = ?`);
                values.push(f === 'province_codes' && Array.isArray(req.body[f]) ? JSON.stringify(req.body[f]) : req.body[f]);
            }
        }
        if (sets.length === 0) return res.status(400).json({ success: false, message: 'Không có thay đổi' });
        values.push(id);
        await db.query(`UPDATE shipping_zone_rules SET ${sets.join(', ')} WHERE id = ?`, values);
        ZoneResolver.invalidateCache();
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.delete('/rules/:id', requireAdmin, async (req, res) => {
    try {
        await db.query(`DELETE FROM shipping_zone_rules WHERE id = ?`, [req.params.id]);
        ZoneResolver.invalidateCache();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: PROVINCES / REGIONS
// ============================================================
router.get('/provinces', requireAdmin, async (req, res) => {
    try {
        const list = await ProvinceMatcher.listAll();
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/regions', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM shipping_region_mappings WHERE status='active' ORDER BY region_code`);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: PREVIEW & SIMULATE
// ============================================================
router.post('/preview', requireAdmin, async (req, res) => {
    try {
        const { destination = {}, weight = 0, orderValue = 0, distance_km = null } = req.body;
        if (distance_km != null && !destination.address && !destination.latitude) {
            const result = await engine.previewByDistance({
                distance_km: parseFloat(distance_km),
                province: destination.province,
                weight: parseFloat(weight) || 0
            });
            return res.json({ success: true, data: result });
        }
        const result = await engine.calculate({
            destination,
            weight: parseFloat(weight) || 0,
            order_value: parseFloat(orderValue) || 0,
            preview: true
        });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/simulate', requireAdmin, async (req, res) => {
    try {
        const { scenarios = [] } = req.body;
        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            return res.status(400).json({ success: false, message: 'scenarios rỗng' });
        }
        const results = [];
        for (const sc of scenarios) {
            const result = await engine.calculate({
                destination: sc.destination || {},
                weight: parseFloat(sc.weight) || 0,
                order_value: parseFloat(sc.orderValue) || 0,
                preview: true
            });
            results.push({ name: sc.name || null, input: sc, result });
        }
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: STORES (giữ y nguyên nghiệp vụ quản lý cửa hàng)
// ============================================================
router.get('/stores', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM thong_tin_cua_hang ORDER BY la_mac_dinh DESC, ngay_tao DESC`);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper to extract coordinates from embedded map HTML/URL
function extractCoordsFromEmbed(html) {
    if (!html) return null;
    
    // 1. Check pb format (Google Maps Embed)
    const matchPbLat = html.match(/!3d(-?\d+\.\d+)/);
    const matchPbLng = html.match(/!2d(-?\d+\.\d+)/);
    if (matchPbLat && matchPbLng) {
        return {
            lat: parseFloat(matchPbLat[1]),
            lng: parseFloat(matchPbLng[1])
        };
    }
    
    // 2. Check q=lat,lng format
    const matchQLatLng = html.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQLatLng) {
        return {
            lat: parseFloat(matchQLatLng[1]),
            lng: parseFloat(matchQLatLng[2])
        };
    }
    
    // 3. Check ll=lat,lng format
    const matchLLLatLng = html.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchLLLatLng) {
        return {
            lat: parseFloat(matchLLLatLng[1]),
            lng: parseFloat(matchLLLatLng[2])
        };
    }
    
    // 4. Check @lat,lng format
    const matchAtLatLng = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAtLatLng) {
        return {
            lat: parseFloat(matchAtLatLng[1]),
            lng: parseFloat(matchAtLatLng[2])
        };
    }
    
    return null;
}

router.post('/stores', requireAdmin, async (req, res) => {
    try {
        const { ten_cua_hang, dia_chi_day_du, tinh_thanh, quan_huyen, phuong_xa, so_dien_thoai, email, la_mac_dinh, ban_do_html } = req.body;
        
        let kinh_do = null;
        let vi_do = null;

        // Try extracting coordinates from the embedded HTML
        const coords = extractCoordsFromEmbed(ban_do_html);
        if (coords) {
            kinh_do = coords.lng;
            vi_do = coords.lat;
        }

        // If coordinates could not be extracted, try to geocode based on address
        if (!kinh_do || !vi_do) {
            try {
                const geo = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { format: 'json', q: dia_chi_day_du, limit: 1, countrycodes: 'vn' },
                    headers: { 'User-Agent': 'YenNhiTechShippingV3/1.0' },
                    timeout: 5000
                });
                if (geo.data && geo.data.length > 0) {
                    kinh_do = parseFloat(geo.data[0].lon);
                    vi_do = parseFloat(geo.data[0].lat);
                }
            } catch (_) {}
        }

        // Fallbacks if geocoding also fails
        if (!kinh_do) kinh_do = 106.3452910;
        if (!vi_do) vi_do = 9.9236898;

        if (la_mac_dinh) await db.query('UPDATE thong_tin_cua_hang SET la_mac_dinh = FALSE');
        const [result] = await db.query(
            `INSERT INTO thong_tin_cua_hang
             (ten_cua_hang, dia_chi_day_du, tinh_thanh, quan_huyen, phuong_xa, kinh_do, vi_do, so_dien_thoai, email, la_mac_dinh, ban_do_html)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ten_cua_hang, dia_chi_day_du, tinh_thanh, quan_huyen, phuong_xa, kinh_do, vi_do, so_dien_thoai, email, la_mac_dinh, ban_do_html || null]
        );
        DistanceService.invalidateOriginCache();
        res.json({ success: true, data: { ma_cua_hang: result.insertId, kinh_do, vi_do, ban_do_html } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/stores/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        let { ten_cua_hang, dia_chi_day_du, tinh_thanh, quan_huyen, phuong_xa, so_dien_thoai, email, la_mac_dinh, trang_thai, ban_do_html } = req.body;

        let kinh_do = null;
        let vi_do = null;

        // Try extracting coordinates from the embedded HTML
        const coords = extractCoordsFromEmbed(ban_do_html);
        if (coords) {
            kinh_do = coords.lng;
            vi_do = coords.lat;
        }

        // If coordinates could not be extracted, try to preserve the existing coordinates (if the address hasn't changed)
        if (!kinh_do || !vi_do) {
            const [existing] = await db.query('SELECT kinh_do, vi_do, dia_chi_day_du FROM thong_tin_cua_hang WHERE ma_cua_hang = ?', [id]);
            if (existing && existing.length > 0) {
                if (existing[0].dia_chi_day_du === dia_chi_day_du) {
                    kinh_do = parseFloat(existing[0].kinh_do);
                    vi_do = parseFloat(existing[0].vi_do);
                }
            }
        }

        // If coordinates are still missing (e.g. address changed or new store, and no coords could be extracted), try to geocode the address
        if (!kinh_do || !vi_do) {
            try {
                const geo = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { format: 'json', q: dia_chi_day_du, limit: 1, countrycodes: 'vn' },
                    headers: { 'User-Agent': 'YenNhiTechShippingV3/1.0' },
                    timeout: 8000
                });
                if (geo.data && geo.data.length > 0) {
                    kinh_do = parseFloat(geo.data[0].lon);
                    vi_do = parseFloat(geo.data[0].lat);
                }
            } catch (_) {}
        }

        // Fallbacks if geocoding also fails
        if (!kinh_do) kinh_do = 106.3452910;
        if (!vi_do) vi_do = 9.9236898;

        if (la_mac_dinh) await db.query('UPDATE thong_tin_cua_hang SET la_mac_dinh = FALSE WHERE ma_cua_hang != ?', [id]);
        await db.query(
            `UPDATE thong_tin_cua_hang
                SET ten_cua_hang=?, dia_chi_day_du=?, tinh_thanh=?, quan_huyen=?, phuong_xa=?,
                    kinh_do=?, vi_do=?, so_dien_thoai=?, email=?, la_mac_dinh=?, trang_thai=?, ban_do_html=?
              WHERE ma_cua_hang=?`,
            [ten_cua_hang, dia_chi_day_du, tinh_thanh, quan_huyen, phuong_xa, kinh_do, vi_do, so_dien_thoai, email, la_mac_dinh, trang_thai, ban_do_html || null, id]
        );
        DistanceService.invalidateOriginCache();
        res.json({ success: true, data: { kinh_do, vi_do, ban_do_html } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/stores/:id', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT la_mac_dinh FROM thong_tin_cua_hang WHERE ma_cua_hang = ?', [req.params.id]);
        if (rows.length > 0 && rows[0].la_mac_dinh) {
            return res.status(400).json({ success: false, message: 'Không thể xóa cửa hàng mặc định' });
        }
        await db.query('DELETE FROM thong_tin_cua_hang WHERE ma_cua_hang = ?', [req.params.id]);
        DistanceService.invalidateOriginCache();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/geocode', requireAdmin, async (req, res) => {
    try {
        const coords = await DistanceService.geocode(req.body.address);
        if (!coords) return res.status(404).json({ success: false, message: 'Không tìm thấy tọa độ' });
        res.json({ success: true, data: coords });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: SHIPPING DISCOUNTS
// ============================================================
router.get('/discounts', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM shipping_discounts ORDER BY order_value_from ASC`);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/discounts', requireAdmin, async (req, res) => {
    try {
        const { order_value_from, order_value_to, discount_percentage, description, status = 'active' } = req.body;
        if (order_value_from == null || discount_percentage == null) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin giá trị tối thiểu hoặc phần trăm giảm' });
        }
        const [result] = await db.query(
            `INSERT INTO shipping_discounts (order_value_from, order_value_to, discount_percentage, description, status)
             VALUES (?, ?, ?, ?, ?)`,
            [order_value_from, order_value_to || null, discount_percentage, description || null, status]
        );
        res.json({ success: true, data: { id: result.insertId } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.put('/discounts/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { order_value_from, order_value_to, discount_percentage, description, status } = req.body;
        const fields = [];
        const values = [];
        if (order_value_from !== undefined) { fields.push('order_value_from = ?'); values.push(order_value_from); }
        if (order_value_to !== undefined) { fields.push('order_value_to = ?'); values.push(order_value_to); }
        if (discount_percentage !== undefined) { fields.push('discount_percentage = ?'); values.push(discount_percentage); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (status !== undefined) { fields.push('status = ?'); values.push(status); }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'Không có thông tin cập nhật' });
        values.push(id);
        await db.query(`UPDATE shipping_discounts SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.delete('/discounts/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM shipping_discounts WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: LOGS
// ============================================================
router.get('/logs', requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, matchType, orderId, page = 1, limit = 50 } = req.query;
        let sql = `SELECT l.*, z.zone_name, z.zone_code FROM shipping_fee_logs l LEFT JOIN shipping_zones z ON l.zone_id = z.id WHERE 1=1`;
        const params = [];
        if (startDate) { sql += ` AND l.created_at >= ?`; params.push(startDate); }
        if (endDate)   { sql += ` AND l.created_at <= ?`; params.push(endDate); }
        if (matchType) { sql += ` AND l.match_type = ?`; params.push(matchType); }
        if (orderId)   { sql += ` AND l.order_id = ?`;   params.push(orderId); }
        sql += ` ORDER BY l.id DESC LIMIT ? OFFSET ?`;
        const limitN = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
        const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limitN;
        params.push(limitN, offset);
        const [rows] = await db.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN: CARRIER CONFIG
// ============================================================
const fs = require('fs');
const path = require('path');
const carrierConfigPath = path.join(__dirname, '../data/shipping_carrier_config.json');

router.get('/carrier', requireAdmin, (req, res) => {
    try {
        if (fs.existsSync(carrierConfigPath)) {
            const config = JSON.parse(fs.readFileSync(carrierConfigPath, 'utf8'));
            if (config.free_shipping_enabled === undefined) config.free_shipping_enabled = true;
            if (config.free_shipping_threshold === undefined) config.free_shipping_threshold = 2000000;
            return res.json({ success: true, data: config });
        }
        res.json({
            success: true,
            data: {
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
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi đọc cấu hình carrier: ' + err.message });
    }
});

router.post('/carrier', requireAdmin, (req, res) => {
    try {
        const {
            active_mode,
            default_length_cm,
            default_width_cm,
            default_height_cm,
            default_weight_kg,
            ghn_token,
            ghn_shop_id,
            ghtk_token,
            insurance_fee_enabled,
            insurance_fee_percent,
            insurance_min_order_value,
            free_shipping_enabled,
            free_shipping_threshold
        } = req.body;

        const newConfig = {
            active_mode: active_mode || 'local',
            default_length_cm: parseFloat(default_length_cm) || 15,
            default_width_cm: parseFloat(default_width_cm) || 10,
            default_height_cm: parseFloat(default_height_cm) || 5,
            default_weight_kg: parseFloat(default_weight_kg) || 0.5,
            ghn_token: ghn_token || '',
            ghn_shop_id: ghn_shop_id || '',
            ghtk_token: ghtk_token || '',
            insurance_fee_enabled: insurance_fee_enabled !== false,
            insurance_fee_percent: parseFloat(insurance_fee_percent) || 0.5,
            insurance_min_order_value: parseFloat(insurance_min_order_value) || 1000000,
            free_shipping_enabled: free_shipping_enabled !== false,
            free_shipping_threshold: parseFloat(free_shipping_threshold) ?? 2000000
        };

        const dir = path.dirname(carrierConfigPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(carrierConfigPath, JSON.stringify(newConfig, null, 2), 'utf8');
        res.json({ success: true, message: 'Lưu cấu hình carrier thành công', data: newConfig });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi ghi cấu hình carrier: ' + err.message });
    }
});

// ============================================================
// Helpers
// ============================================================
function parseJSON(v) {
    if (v == null) return null;
    if (Array.isArray(v) || typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return null; }
}

module.exports = router;
