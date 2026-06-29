/**
 * Admin UI cho Shipping Engine V3
 *
 * Gọi API `/api/shipping-config/*` (route đã được viết lại với engine mới).
 * Render hoàn toàn từ JS — không phụ thuộc HTML modal cũ.
 */
(() => {
'use strict';

const API = (window.API_BASE || window.location.origin + '/api') + '/shipping-config';

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const fmtVND = (v) => (Number(v) || 0).toLocaleString('vi-VN') + 'đ';
const fmtKm = (v) => (v == null ? '—' : Number(v).toFixed(2) + ' km');
const fmtDate = (v) => v ? new Date(v).toLocaleString('vi-VN') : '—';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getToken() {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
}

async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + path, { ...opts, headers });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

function toast(msg, type = 'info') {
    if (window.showToast) return window.showToast(msg, type);
    const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-sky-500', warn: 'bg-amber-500' };
    const el = document.createElement('div');
    el.className = `fixed top-5 right-5 z-[9999] ${colors[type] || colors.info} text-white px-4 py-2 rounded shadow-lg`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ---------- State ----------
const state = {
    zones: [],
    provinces: [],
    regions: [],
    stores: [],
    activeStoreModal: null
};

// ============================================================
// TAB: ZONES + RULES
// ============================================================
async function loadZones() {
    const container = $('zones-list');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">Đang tải...</div>';
    try {
        const [zonesRes, regionsRes] = await Promise.all([api('/zones'), api('/regions')]);
        state.zones = zonesRes.data || [];
        state.regions = regionsRes.data || [];

        if (state.zones.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">Chưa có vùng nào. Bấm "➕ Thêm vùng" để bắt đầu.</div>';
            return;
        }
        container.innerHTML = state.zones.map(renderZoneCard).join('');
    } catch (err) {
        container.innerHTML = `<div class="text-rose-600 p-4">Lỗi tải vùng: ${esc(err.message)}</div>`;
    }
}

function renderZoneCard(zone) {
    const typeBadge = {
        distance: 'bg-emerald-100 text-emerald-700',
        province: 'bg-sky-100 text-sky-700',
        region:   'bg-violet-100 text-violet-700'
    }[zone.zone_type] || 'bg-slate-100';

    const typeName = {
        distance: '📏 Distance',
        province: '🗺️ Province',
        region:   '🌐 Region'
    }[zone.zone_type] || zone.zone_type;

    const rulesHtml = (zone.rules || []).map(r => renderRule(r, zone.zone_type)).join('') ||
        '<div class="text-xs text-slate-400 italic">Chưa có rule</div>';

    return `
    <div class="border rounded-xl bg-white shadow-sm overflow-hidden">
        <div class="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-xs ${typeBadge}">${typeName}</span>
                    <span class="font-semibold text-slate-800">${esc(zone.zone_name)}</span>
                    <span class="text-xs text-slate-500">/${esc(zone.zone_code)}</span>
                    <span class="text-xs text-slate-500">Priority: <b>${zone.priority}</b></span>
                    ${zone.status !== 'active' ? `<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">${zone.status}</span>` : ''}
                </div>
                ${zone.description ? `<div class="text-xs text-slate-500 mt-1">${esc(zone.description)}</div>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick="ShippingAdmin.editZone(${zone.id})" class="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">✏️ Sửa</button>
                <button onclick="ShippingAdmin.deleteZone(${zone.id})" class="text-xs px-3 py-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200">🗑️ Xóa</button>
                <button onclick="ShippingAdmin.addRule(${zone.id})" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">➕ Rule</button>
            </div>
        </div>
        <div class="p-4 space-y-2">${rulesHtml}</div>
    </div>`;
}

function renderRule(r, zoneType) {
    const isDistance = zoneType === 'distance';
    const isFixed    = zoneType !== 'distance';

    const detail = isDistance
        ? `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><div class="text-slate-500">Khoảng cách</div><div class="font-mono">${r.km_from ?? '—'} → ${r.km_to ?? '∞'} km</div></div>
                <div><div class="text-slate-500">Phí cơ bản</div><div class="font-semibold text-emerald-700">${fmtVND(r.base_fee)}</div></div>
                <div><div class="text-slate-500">Included / Extra</div><div class="font-mono">${r.included_km}km + ${fmtVND(r.extra_per_km)}/km</div></div>
                <div><div class="text-slate-500">Buffer</div><div class="font-mono">±${r.buffer_zone_km} km</div></div>
            </div>`
        : `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div><div class="text-slate-500">Phí cố định</div><div class="font-semibold text-emerald-700">${fmtVND(r.fixed_fee)}</div></div>
                ${r.region_code ? `<div><div class="text-slate-500">Region</div><div>${esc(r.region_code)}</div></div>` : ''}
                ${Array.isArray(r.province_codes) && r.province_codes.length ? `<div class="col-span-2 md:col-span-1"><div class="text-slate-500">Province codes</div><div class="font-mono">${esc(r.province_codes.join(', '))}</div></div>` : ''}
            </div>`;

    return `
    <div class="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-start justify-between gap-3">
        <div class="flex-1">
            <div class="text-sm font-medium text-slate-700 mb-2">${esc(r.rule_name || `Rule #${r.id}`)}</div>
            ${detail}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                <div><div class="text-slate-500">Trọng lượng</div><div class="font-mono">${r.weight_limit_kg}kg + ${fmtVND(r.extra_per_kg)}/kg</div></div>
                <div><div class="text-slate-500">Min fee</div><div class="font-mono">${r.min_fee != null ? fmtVND(r.min_fee) : '—'}</div></div>
                <div><div class="text-slate-500">Max fee</div><div class="font-mono">${r.max_fee != null ? fmtVND(r.max_fee) : '—'}</div></div>
                <div><div class="text-slate-500">Status</div><div>${esc(r.status)}</div></div>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <button onclick="ShippingAdmin.editRule(${r.id}, ${r.zone_id})" class="text-xs px-3 py-1 bg-white border rounded hover:bg-slate-100">✏️</button>
            <button onclick="ShippingAdmin.deleteRule(${r.id})" class="text-xs px-3 py-1 bg-white border rounded hover:bg-rose-50 text-rose-700">🗑️</button>
        </div>
    </div>`;
}

// ---- Zone modal ----
function openModal(html) {
    let m = $('shipping-modal-host');
    if (!m) {
        m = document.createElement('div');
        m.id = 'shipping-modal-host';
        m.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 overflow-y-auto';
        document.body.appendChild(m);
    }
    m.innerHTML = `<div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden">${html}</div>`;
    m.style.display = 'flex';
}
function closeShipModal() {
    const m = $('shipping-modal-host');
    if (m) { m.style.display = 'none'; m.innerHTML = ''; }
}
window.closeShippingModal = closeShipModal;

function zoneFormHtml(z = {}) {
    const isEdit = !!z.id;
    return `
    <div class="p-5 border-b flex justify-between items-center bg-gradient-to-r from-sky-500 to-cyan-500 text-white">
        <h3 class="font-bold text-lg">${isEdit ? '✏️ Sửa vùng' : '➕ Thêm vùng'}</h3>
        <button onclick="closeShippingModal()" class="text-2xl">&times;</button>
    </div>
    <form id="zone-form" class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <input type="hidden" name="id" value="${z.id || ''}">
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="text-xs font-semibold">Zone code <span class="text-rose-500">*</span></label>
                <input name="zone_code" required class="w-full border rounded px-3 py-2" value="${esc(z.zone_code || '')}" ${isEdit ? '' : 'placeholder="VD: NOI_TINH_0_10"'}>
            </div>
            <div>
                <label class="text-xs font-semibold">Tên vùng <span class="text-rose-500">*</span></label>
                <input name="zone_name" required class="w-full border rounded px-3 py-2" value="${esc(z.zone_name || '')}">
            </div>
            <div>
                <label class="text-xs font-semibold">Loại zone <span class="text-rose-500">*</span></label>
                <select name="zone_type" class="w-full border rounded px-3 py-2" ${isEdit ? 'disabled' : ''}>
                    <option value="distance" ${z.zone_type === 'distance' ? 'selected' : ''}>📏 Distance (theo km)</option>
                    <option value="province" ${z.zone_type === 'province' ? 'selected' : ''}>🗺️ Province (theo tỉnh)</option>
                    <option value="region"   ${z.zone_type === 'region'   ? 'selected' : ''}>🌐 Region (theo miền)</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold">Priority (1-100)</label>
                <input type="number" name="priority" min="1" max="100" class="w-full border rounded px-3 py-2" value="${z.priority ?? 50}">
            </div>
            <div class="col-span-2">
                <label class="text-xs font-semibold">Mô tả</label>
                <textarea name="description" rows="2" class="w-full border rounded px-3 py-2">${esc(z.description || '')}</textarea>
            </div>
            <div>
                <label class="text-xs font-semibold">Status</label>
                <select name="status" class="w-full border rounded px-3 py-2">
                    <option value="active" ${z.status === 'active' ? 'selected' : ''}>active</option>
                    <option value="inactive" ${z.status === 'inactive' ? 'selected' : ''}>inactive</option>
                    <option value="draft" ${z.status === 'draft' ? 'selected' : ''}>draft</option>
                </select>
            </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="closeShippingModal()" class="px-4 py-2 rounded bg-slate-200">Hủy</button>
            <button class="px-4 py-2 rounded bg-sky-600 text-white">${isEdit ? 'Lưu' : 'Thêm'}</button>
        </div>
    </form>`;
}

async function showAddZoneModal() {
    openModal(zoneFormHtml());
    $('zone-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.priority = parseInt(body.priority, 10);
        try {
            await api('/zones', { method: 'POST', body: JSON.stringify(body) });
            toast('Đã thêm vùng', 'success');
            closeShipModal();
            loadZones();
        } catch (err) { toast(err.message, 'error'); }
    });
}
window.showAddZoneModal = showAddZoneModal;

async function editZone(id) {
    const zone = state.zones.find(z => z.id === id);
    if (!zone) return;
    openModal(zoneFormHtml(zone));
    $('zone-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.priority = parseInt(body.priority, 10);
        delete body.zone_type; // disabled, không submit
        try {
            await api(`/zones/${id}`, { method: 'PUT', body: JSON.stringify(body) });
            toast('Đã cập nhật', 'success');
            closeShipModal();
            loadZones();
        } catch (err) { toast(err.message, 'error'); }
    });
}

async function deleteZone(id) {
    if (!confirm('Xóa vùng này? (soft delete — có thể khôi phục từ DB)')) return;
    try {
        await api(`/zones/${id}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        loadZones();
    } catch (err) { toast(err.message, 'error'); }
}

// ---- Rule modal ----
function ruleFormHtml(zone, rule = {}) {
    const t = zone.zone_type;
    const distanceFields = `
        <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs font-semibold">km_from</label><input type="number" step="0.1" name="km_from" class="w-full border rounded px-3 py-2" value="${rule.km_from ?? 0}"></div>
            <div><label class="text-xs font-semibold">km_to (NULL = vô hạn)</label><input type="number" step="0.1" name="km_to" class="w-full border rounded px-3 py-2" value="${rule.km_to ?? ''}"></div>
            <div><label class="text-xs font-semibold">base_fee (đ) <span class="text-rose-500">*</span></label><input type="number" name="base_fee" required class="w-full border rounded px-3 py-2" value="${rule.base_fee ?? 0}"></div>
            <div><label class="text-xs font-semibold">included_km</label><input type="number" step="0.1" name="included_km" class="w-full border rounded px-3 py-2" value="${rule.included_km ?? 0}"></div>
            <div><label class="text-xs font-semibold">extra_per_km (đ)</label><input type="number" name="extra_per_km" class="w-full border rounded px-3 py-2" value="${rule.extra_per_km ?? 0}"></div>
            <div><label class="text-xs font-semibold">buffer_zone_km</label><input type="number" step="0.1" name="buffer_zone_km" class="w-full border rounded px-3 py-2" value="${rule.buffer_zone_km ?? 0}"></div>
        </div>`;

    const provinceFields = `
        <div><label class="text-xs font-semibold">fixed_fee (đ) <span class="text-rose-500">*</span></label><input type="number" name="fixed_fee" required class="w-full border rounded px-3 py-2" value="${rule.fixed_fee ?? 0}"></div>
        <div><label class="text-xs font-semibold">province_codes (comma) <span class="text-rose-500">*</span></label>
             <input name="province_codes" class="w-full border rounded px-3 py-2" placeholder="79,74,75"
                    value="${esc(Array.isArray(rule.province_codes) ? rule.province_codes.join(',') : '')}">
             <p class="text-[10px] text-slate-500 mt-1">Tham khảo tab Tỉnh / Vùng logistics.</p>
        </div>`;

    const regionOptions = state.regions.map(r =>
        `<option value="${esc(r.region_code)}" ${rule.region_code === r.region_code ? 'selected' : ''}>${esc(r.region_name)} (${esc(r.region_code)})</option>`
    ).join('');
    const regionFields = `
        <div><label class="text-xs font-semibold">fixed_fee (đ) <span class="text-rose-500">*</span></label><input type="number" name="fixed_fee" required class="w-full border rounded px-3 py-2" value="${rule.fixed_fee ?? 0}"></div>
        <div><label class="text-xs font-semibold">region_code <span class="text-rose-500">*</span></label>
             <select name="region_code" class="w-full border rounded px-3 py-2"><option value="">— chọn —</option>${regionOptions}</select></div>`;

    const specific = t === 'distance' ? distanceFields : (t === 'province' ? provinceFields : regionFields);

    return `
    <div class="p-5 border-b flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <h3 class="font-bold text-lg">${rule.id ? '✏️ Sửa rule' : '➕ Thêm rule'} — ${esc(zone.zone_name)}</h3>
        <button onclick="closeShippingModal()" class="text-2xl">&times;</button>
    </div>
    <form id="rule-form" class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
            <label class="text-xs font-semibold">Tên rule</label>
            <input name="rule_name" class="w-full border rounded px-3 py-2" value="${esc(rule.rule_name || '')}">
        </div>
        ${specific}
        <div class="grid grid-cols-2 gap-3 pt-3 border-t">
            <div><label class="text-xs font-semibold">weight_limit_kg</label><input type="number" step="0.1" name="weight_limit_kg" class="w-full border rounded px-3 py-2" value="${rule.weight_limit_kg ?? 5}"></div>
            <div><label class="text-xs font-semibold">extra_per_kg (đ)</label><input type="number" name="extra_per_kg" class="w-full border rounded px-3 py-2" value="${rule.extra_per_kg ?? 5000}"></div>
            <div><label class="text-xs font-semibold">min_fee (đ)</label><input type="number" name="min_fee" class="w-full border rounded px-3 py-2" value="${rule.min_fee ?? ''}"></div>
            <div><label class="text-xs font-semibold">max_fee (đ)</label><input type="number" name="max_fee" class="w-full border rounded px-3 py-2" value="${rule.max_fee ?? ''}"></div>
        </div>
        <div>
            <label class="text-xs font-semibold">Status</label>
            <select name="status" class="w-full border rounded px-3 py-2">
                <option value="active" ${rule.status === 'active' ? 'selected' : ''}>active</option>
                <option value="inactive" ${rule.status === 'inactive' ? 'selected' : ''}>inactive</option>
            </select>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="closeShippingModal()" class="px-4 py-2 rounded bg-slate-200">Hủy</button>
            <button class="px-4 py-2 rounded bg-emerald-600 text-white">${rule.id ? 'Lưu' : 'Thêm'}</button>
        </div>
    </form>`;
}

function parseRuleForm(form, zoneType) {
    const fd = new FormData(form);
    const obj = Object.fromEntries(fd.entries());
    const out = { rule_name: obj.rule_name || null };
    const num = (v) => (v === '' || v == null ? null : Number(v));

    if (zoneType === 'distance') {
        Object.assign(out, {
            km_from: num(obj.km_from),
            km_to: num(obj.km_to),
            base_fee: num(obj.base_fee),
            included_km: num(obj.included_km),
            extra_per_km: num(obj.extra_per_km),
            buffer_zone_km: num(obj.buffer_zone_km)
        });
    } else if (zoneType === 'province') {
        out.fixed_fee = num(obj.fixed_fee);
        out.province_codes = (obj.province_codes || '').split(',').map(s => s.trim()).filter(Boolean);
    } else {
        out.fixed_fee = num(obj.fixed_fee);
        out.region_code = obj.region_code || null;
    }
    Object.assign(out, {
        weight_limit_kg: num(obj.weight_limit_kg),
        extra_per_kg: num(obj.extra_per_kg),
        min_fee: num(obj.min_fee),
        max_fee: num(obj.max_fee),
        status: obj.status || 'active'
    });
    return out;
}

async function addRule(zoneId) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) return;
    openModal(ruleFormHtml(zone));
    $('rule-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const body = parseRuleForm(e.target, zone.zone_type);
            await api(`/zones/${zoneId}/rules`, { method: 'POST', body: JSON.stringify(body) });
            toast('Đã thêm rule', 'success');
            closeShipModal();
            loadZones();
        } catch (err) { toast(err.message, 'error'); }
    });
}

async function editRule(ruleId, zoneId) {
    const zone = state.zones.find(z => z.id === zoneId);
    const rule = zone?.rules?.find(r => r.id === ruleId);
    if (!zone || !rule) return;
    openModal(ruleFormHtml(zone, rule));
    $('rule-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const body = parseRuleForm(e.target, zone.zone_type);
            await api(`/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(body) });
            toast('Đã cập nhật', 'success');
            closeShipModal();
            loadZones();
        } catch (err) { toast(err.message, 'error'); }
    });
}

async function deleteRule(id) {
    if (!confirm('Xóa rule này?')) return;
    try {
        await api(`/rules/${id}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        loadZones();
    } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// TAB: PROVINCES
// ============================================================
async function loadProvinces() {
    const tbody = $('provinces-tbody');
    const summary = $('regions-summary');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">Đang tải...</td></tr>';

    try {
        const [provRes, regRes] = await Promise.all([api('/provinces'), api('/regions')]);
        state.provinces = provRes.data || [];
        state.regions = regRes.data || [];

        const grouped = state.provinces.reduce((acc, p) => {
            (acc[p.region_code] = acc[p.region_code] || []).push(p);
            return acc;
        }, {});

        summary.innerHTML = state.regions.map(r => {
            const list = grouped[r.region_code] || [];
            return `<div class="border rounded-xl p-4 bg-slate-50">
                <div class="text-sm text-slate-500">${esc(r.region_code)}</div>
                <div class="font-semibold text-slate-800">${esc(r.region_name)}</div>
                <div class="text-xs text-slate-500 mt-1">${list.length} tỉnh</div>
            </div>`;
        }).join('');

        tbody.innerHTML = state.provinces.map(p => `
            <tr class="border-t">
                <td class="p-3 font-mono">${esc(p.province_code)}</td>
                <td class="p-3 font-semibold">${esc(p.province_name)}</td>
                <td class="p-3 text-slate-600">${esc(p.normalized_name)}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">${esc(p.region_code)}</span></td>
                <td class="p-3 text-right font-mono">${p.estimated_distance_km ?? '—'}</td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-rose-600">Lỗi: ${esc(err.message)}</td></tr>`;
    }
}

// ============================================================
// TAB: STORES
// ============================================================
async function loadStores() {
    const container = $('stores-list');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">Đang tải...</div>';
    
    // Inject custom CSS to make preview map responsive
    if (!document.getElementById('store-map-preview-style')) {
        const style = document.createElement('style');
        style.id = 'store-map-preview-style';
        style.textContent = `
            .store-map-preview iframe {
                width: 100% !important;
                height: 100% !important;
                border: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    try {
        const res = await api('/stores');
        state.stores = res.data || [];
        if (state.stores.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">Chưa có cửa hàng nào.</div>';
            return;
        }
        container.innerHTML = state.stores.map(s => `
        <div class="border rounded-xl p-4 ${s.la_mac_dinh ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex-1 min-w-[280px]">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-800">${esc(s.ten_cua_hang)}</span>
                        ${s.la_mac_dinh ? '<span class="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded">🏠 Mặc định (Origin)</span>' : ''}
                        ${s.trang_thai !== 'active' ? `<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">${esc(s.trang_thai)}</span>` : ''}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">${esc(s.dia_chi_day_du || '')}</div>
                    <div class="text-xs text-slate-500 mt-1">${esc(s.so_dien_thoai || '')} ${s.email ? '· ' + esc(s.email) : ''}</div>
                    ${s.ban_do_html ? `
                    <div class="mt-3 border rounded overflow-hidden max-w-md h-[180px] store-map-preview">
                        ${s.ban_do_html}
                    </div>
                    ` : ''}
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    ${typeof window.editStore === 'function'
                        ? `<button onclick="editStore(${s.ma_cua_hang})" class="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded">✏️ Sửa</button>`
                        : `<button onclick="ShippingAdmin.editStoreInline(${s.ma_cua_hang})" class="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded">✏️ Sửa</button>`}
                    ${!s.la_mac_dinh ? `<button onclick="ShippingAdmin.setDefaultStore(${s.ma_cua_hang})" class="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded">⭐ Đặt mặc định</button>` : ''}
                    ${!s.la_mac_dinh ? `<button onclick="ShippingAdmin.deleteStore(${s.ma_cua_hang})" class="text-xs px-3 py-1.5 bg-rose-100 text-rose-700 rounded">🗑️ Xóa</button>` : ''}
                </div>
            </div>
        </div>`).join('');
    } catch (err) {
        container.innerHTML = `<div class="text-rose-600 p-4">Lỗi: ${esc(err.message)}</div>`;
    }
}

function storeFormHtml(s = {}) {
    const banDoHtml = esc(s.ban_do_html || '');
    return `
    <div class="p-5 border-b flex justify-between items-center bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white">
        <h3 class="font-bold text-lg">${s.ma_cua_hang ? '✏️ Sửa cửa hàng' : '➕ Thêm cửa hàng'}</h3>
        <button onclick="closeShippingModal()" class="text-2xl">&times;</button>
    </div>
    <form id="store-form" class="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
        <div><label class="text-xs font-semibold">Tên cửa hàng *</label><input name="ten_cua_hang" required class="w-full border rounded px-3 py-2" value="${esc(s.ten_cua_hang || '')}"></div>
        <div><label class="text-xs font-semibold">Địa chỉ đầy đủ *</label><textarea name="dia_chi_day_du" required rows="2" class="w-full border rounded px-3 py-2">${esc(s.dia_chi_day_du || '')}</textarea></div>
        <div>
            <label class="text-xs font-semibold">🗺️ Nhúng HTML Bản đồ (Iframe)</label>
            <textarea name="ban_do_html" rows="3" class="w-full border rounded px-3 py-2 font-mono text-xs" placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'>${banDoHtml}</textarea>
            <div id="store-map-preview" class="mt-2 border rounded overflow-hidden" style="${banDoHtml ? '' : 'display:none'}">${banDoHtml}</div>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div><label class="text-xs font-semibold">SĐT</label><input name="so_dien_thoai" class="w-full border rounded px-3 py-2" value="${esc(s.so_dien_thoai || '')}"></div>
            <div><label class="text-xs font-semibold">Email</label><input name="email" class="w-full border rounded px-3 py-2" value="${esc(s.email || '')}"></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div><label class="text-xs font-semibold">Trạng thái</label>
                <select name="trang_thai" class="w-full border rounded px-3 py-2">
                    <option value="active" ${s.trang_thai === 'active' ? 'selected' : ''}>active</option>
                    <option value="inactive" ${s.trang_thai === 'inactive' ? 'selected' : ''}>inactive</option>
                </select>
            </div>
            <div class="flex items-end"><label class="flex items-center gap-2"><input type="checkbox" name="la_mac_dinh" value="1" ${s.la_mac_dinh ? 'checked' : ''}> <span class="text-sm">Đặt làm cửa hàng mặc định (Origin)</span></label></div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="closeShippingModal()" class="px-4 py-2 rounded bg-slate-200">Hủy</button>
            <button class="px-4 py-2 rounded bg-fuchsia-600 text-white">${s.ma_cua_hang ? 'Lưu' : 'Thêm'}</button>
        </div>
    </form>`;
}

function previewStoreMap() {
    const preview = document.getElementById('store-map-preview');
    const ta = document.querySelector('[name="ban_do_html"]');
    if (!preview || !ta) return;
    const val = ta.value.trim();
    if (val) {
        preview.innerHTML = val;
        preview.style.display = '';
        // Tự động cập nhật địa chỉ từ iframe
        const addr = extractAddressFromIframe(val);
        if (addr) {
            const addrField = document.querySelector('[name="dia_chi_day_du"]');
            if (addrField) addrField.value = addr;
        }
    } else {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
}

function extractAddressFromIframe(html) {
    // Lấy src từ thẻ iframe
    const m = html.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!m) return null;
    let src = m[1];
    try { src = decodeURIComponent(src); } catch(e) {}

    // Format 1: ?q=địa chỉ
    const qm = src.match(/[?&]q=([^&]+)/i);
    if (qm) return decodeURIComponent(qm[1].replace(/\+/g, ' '));

    // Format 2: Google Maps embed pb=...!2sPlaceName!...
    const placeM = src.match(/!2s([^!]+)/);
    if (placeM) return decodeURIComponent(placeM[1].replace(/\+/g, ' '));

    // Format 3: maps/place/URL
    const placeM2 = src.match(/maps\/place\/([^/?#]+)/);
    if (placeM2) return decodeURIComponent(placeM2[1].replace(/\+/g, ' '));

    return null;
}

function showAddStoreModal() {
    openModal(storeFormHtml());
    $('store-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.la_mac_dinh = !!body.la_mac_dinh;
        try {
            await api('/stores', { method: 'POST', body: JSON.stringify(body) });
            toast('Đã thêm cửa hàng', 'success');
            closeShipModal();
            loadStores();
        } catch (err) { toast(err.message, 'error'); }
    });
    // Gắn sự kiện input cho ô nhúng bản đồ
    const ta = document.querySelector('[name="ban_do_html"]');
    if (ta) ta.addEventListener('input', previewStoreMap);
}
window.showAddStoreModal = showAddStoreModal;

async function editStoreInline(id) {
    const s = state.stores.find(x => x.ma_cua_hang === id);
    if (!s) return;
    openModal(storeFormHtml(s));
    $('store-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.la_mac_dinh = !!body.la_mac_dinh;
        try {
            await api(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(body) });
            toast('Đã cập nhật', 'success');
            closeShipModal();
            loadStores();
        } catch (err) { toast(err.message, 'error'); }
    });
    // Gắn sự kiện input cho ô nhúng bản đồ
    const ta = document.querySelector('[name="ban_do_html"]');
    if (ta) ta.addEventListener('input', previewStoreMap);
}

async function setDefaultStore(id) {
    const s = state.stores.find(x => x.ma_cua_hang === id);
    if (!s) return;
    try {
        await api(`/stores/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ten_cua_hang: s.ten_cua_hang,
                dia_chi_day_du: s.dia_chi_day_du,
                so_dien_thoai: s.so_dien_thoai,
                email: s.email,
                la_mac_dinh: true,
                trang_thai: s.trang_thai
            })
        });
        toast('Đã đặt mặc định', 'success');
        loadStores();
    } catch (err) { toast(err.message, 'error'); }
}

async function deleteStore(id) {
    if (!confirm('Xóa cửa hàng này?')) return;
    try {
        await api(`/stores/${id}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        loadStores();
    } catch (err) { toast(err.message, 'error'); }
}

// ============================================================
// TAB: PREVIEW
// ============================================================
async function runPreview() {
    const out = $('preview-result');
    out.innerHTML = '<div class="text-slate-500">⏳ Đang tính...</div>';
    const body = {
        destination: {
            address: $('preview-address').value.trim() || null,
            province: $('preview-province').value.trim() || null
        },
        weight: parseFloat($('preview-weight').value) || 0,
        orderValue: parseFloat($('preview-value').value) || 0,
        distance_km: $('preview-distance').value ? parseFloat($('preview-distance').value) : null
    };
    try {
        const res = await api('/preview', { method: 'POST', body: JSON.stringify(body) });
        out.innerHTML = renderPreviewResult(res.data);
    } catch (err) {
        out.innerHTML = `<div class="text-rose-600">❌ ${esc(err.message)}</div>`;
    }
}
window.runPreview = runPreview;

function renderPreviewResult(data) {
    if (!data?.success) return `<div class="text-rose-600">❌ ${esc(data?.error?.message || 'Không tính được')}</div>`;
    const m = data.match || {};
    const b = data.breakdown || {};
    return `
    <div class="space-y-2">
        <div class="flex items-center justify-between border-b pb-2">
            <span class="text-slate-500">Phí ship</span>
            <span class="text-2xl font-bold text-emerald-700">${fmtVND(b.final_fee ?? data.shipping_fee)}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-white border rounded p-2"><div class="text-slate-500">Khoảng cách</div><div class="font-mono">${fmtKm(data.distance_km)}</div></div>
            <div class="bg-white border rounded p-2"><div class="text-slate-500">Match type</div><div>${esc(m.type || '—')}</div></div>
            <div class="bg-white border rounded p-2"><div class="text-slate-500">Zone</div><div>${esc(m.zone_name || '—')} <span class="text-slate-400">(${esc(m.zone_type || '')})</span></div></div>
            <div class="bg-white border rounded p-2"><div class="text-slate-500">Buffer ratio</div><div class="font-mono">${m.buffer_ratio != null ? Number(m.buffer_ratio).toFixed(2) : '—'}</div></div>
        </div>
        <div class="border-t pt-2">
            <div class="text-xs text-slate-500 mb-1">Breakdown</div>
            <div class="grid grid-cols-2 gap-1 text-xs">
                <div>base_fee</div>      <div class="text-right font-mono">${fmtVND(b.base_fee)}</div>
                <div>distance_fee</div>  <div class="text-right font-mono">${fmtVND(b.distance_fee)}</div>
                <div>weight_fee</div>    <div class="text-right font-mono">${fmtVND(b.weight_fee)}</div>
                <div>subtotal_fee</div>  <div class="text-right font-mono">${fmtVND(b.subtotal_fee)}</div>
                <div class="font-semibold">final_fee</div><div class="text-right font-mono font-semibold">${fmtVND(b.final_fee)}</div>
            </div>
        </div>
        <details class="text-xs text-slate-500"><summary class="cursor-pointer">JSON raw</summary><pre class="bg-slate-900 text-slate-100 p-2 rounded overflow-x-auto">${esc(JSON.stringify(data, null, 2))}</pre></details>
    </div>`;
}

async function runBufferTest() {
    const province = $('preview-province').value.trim() || null;
    const out = $('buffer-test-result');
    out.innerHTML = '<div class="text-slate-500">⏳ Đang chạy...</div>';
    const distances = [35, 38, 39.5, 40, 40.5, 42, 45];
    try {
        const rows = [];
        for (const d of distances) {
            const res = await api('/preview', { method: 'POST', body: JSON.stringify({
                destination: { province },
                distance_km: d,
                weight: 1,
                orderValue: 0
            })});
            const data = res.data || {};
            rows.push(`<tr class="border-t">
                <td class="p-1 font-mono">${d} km</td>
                <td class="p-1">${esc(data.match_type || '—')}</td>
                <td class="p-1">${esc(data.zone_code || '—')}</td>
                <td class="p-1 text-right font-mono">${fmtVND(data.breakdown?.final_fee ?? 0)}</td>
            </tr>`);
        }
        out.innerHTML = `<table class="w-full text-xs border rounded overflow-hidden"><thead class="bg-slate-100"><tr><th class="p-1 text-left">Distance</th><th class="p-1 text-left">Match</th><th class="p-1 text-left">Zone</th><th class="p-1 text-right">Phí</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="text-[10px] text-slate-500 mt-1">Phí phải tăng tuyến tính qua điểm 40km nhờ buffer smoothing.</p>`;
    } catch (err) {
        out.innerHTML = `<div class="text-rose-600">❌ ${esc(err.message)}</div>`;
    }
}
window.runBufferTest = runBufferTest;

// ============================================================
// TAB: LOGS
// ============================================================
async function loadLogs() {
    const tbody = $('logs-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-500">Đang tải...</td></tr>';
    try {
        const res = await api('/logs?limit=100');
        const rows = res.data || [];
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-500">Chưa có log nào</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr class="border-t hover:bg-slate-50">
                <td class="p-2 font-mono">${r.id}</td>
                <td class="p-2">${r.order_id ?? '<span class="text-slate-400">preview</span>'}</td>
                <td class="p-2 text-xs">${esc(r.input_address || r.input_province || '—')}</td>
                <td class="p-2 font-mono">${fmtKm(r.distance_km)}</td>
                <td class="p-2">${esc(r.match_type || '—')}</td>
                <td class="p-2">${esc(r.zone_name || '—')}</td>
                <td class="p-2 text-right font-mono">${fmtVND(r.final_fee)}</td>
                <td class="p-2 text-xs">${fmtDate(r.created_at)}</td>
            </tr>`).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-rose-600">Lỗi: ${esc(err.message)}</td></tr>`;
    }
}
window.loadLogs = loadLogs;

// ============================================================
// TAB: CARRIER CONFIG
// ============================================================
async function loadCarrierConfig() {
    try {
        const res = await api('/carrier');
        const data = res.data;
        if (!data) return;

        const form = $('carrier-config-form');
        if (!form) return;

        form.querySelector('select[name="active_mode"]').value = data.active_mode || 'local';
        form.querySelector('input[name="default_length_cm"]').value = data.default_length_cm ?? 15;
        form.querySelector('input[name="default_width_cm"]').value = data.default_width_cm ?? 10;
        form.querySelector('input[name="default_height_cm"]').value = data.default_height_cm ?? 5;
        form.querySelector('input[name="default_weight_kg"]').value = data.default_weight_kg ?? 0.5;

        form.querySelector('input[name="insurance_fee_enabled"]').checked = !!data.insurance_fee_enabled;
        form.querySelector('input[name="insurance_fee_percent"]').value = data.insurance_fee_percent ?? 0.5;
        form.querySelector('input[name="insurance_min_order_value"]').value = data.insurance_min_order_value ?? 1000000;

        form.querySelector('input[name="free_shipping_enabled"]').checked = !!data.free_shipping_enabled;
        form.querySelector('input[name="free_shipping_threshold"]').value = data.free_shipping_threshold ?? 2000000;

        form.querySelector('input[name="ghn_token"]').value = data.ghn_token ?? '';
        form.querySelector('input[name="ghn_shop_id"]').value = data.ghn_shop_id ?? '';
        form.querySelector('input[name="ghtk_token"]').value = data.ghtk_token ?? '';

        toggleCarrierFields();
    } catch (err) {
        toast('Lỗi tải cấu hình carrier: ' + err.message, 'error');
    }
}

function toggleCarrierFields() {
    const form = $('carrier-config-form');
    if (!form) return;
    const activeMode = form.querySelector('select[name="active_mode"]').value;

    const ghnSection = $('ghn-config-section');
    const ghtkSection = $('ghtk-config-section');

    if (activeMode === 'ghn') {
        ghnSection.classList.remove('hidden');
        ghtkSection.classList.add('hidden');
    } else if (activeMode === 'ghtk') {
        ghnSection.classList.add('hidden');
        ghtkSection.classList.remove('hidden');
    } else {
        ghnSection.classList.add('hidden');
        ghtkSection.classList.add('hidden');
    }
}

async function saveCarrierConfig(e) {
    if (e) e.preventDefault();
    const form = $('carrier-config-form');
    if (!form) return;

    const body = {
        active_mode: form.querySelector('select[name="active_mode"]').value,
        default_length_cm: parseFloat(form.querySelector('input[name="default_length_cm"]').value) || 15,
        default_width_cm: parseFloat(form.querySelector('input[name="default_width_cm"]').value) || 10,
        default_height_cm: parseFloat(form.querySelector('input[name="default_height_cm"]').value) || 5,
        default_weight_kg: parseFloat(form.querySelector('input[name="default_weight_kg"]').value) || 0.5,
        insurance_fee_enabled: form.querySelector('input[name="insurance_fee_enabled"]').checked,
        insurance_fee_percent: parseFloat(form.querySelector('input[name="insurance_fee_percent"]').value) || 0.5,
        insurance_min_order_value: parseFloat(form.querySelector('input[name="insurance_min_order_value"]').value) || 1000000,
        free_shipping_enabled: form.querySelector('input[name="free_shipping_enabled"]').checked,
        free_shipping_threshold: parseFloat(form.querySelector('input[name="free_shipping_threshold"]').value) || 2000000,
        ghn_token: form.querySelector('input[name="ghn_token"]').value.trim(),
        ghn_shop_id: form.querySelector('input[name="ghn_shop_id"]').value.trim(),
        ghtk_token: form.querySelector('input[name="ghtk_token"]').value.trim()
    };

    try {
        await api('/carrier', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        toast('Đã lưu cấu hình hãng vận chuyển thành công!', 'success');
    } catch (err) {
        toast('Lỗi lưu cấu hình: ' + err.message, 'error');
    }
}

// ============================================================
// TAB: SHIPPING DISCOUNTS
// ============================================================
async function loadDiscounts() {
    const list = $('discounts-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">Đang tải...</td></tr>';
    try {
        const res = await api('/discounts');
        const discounts = res.data || [];
        if (discounts.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">Chưa có chương trình giảm giá phí ship nào. Bấm "➕ Thêm mức giảm" để bắt đầu.</td></tr>';
            return;
        }
        list.innerHTML = discounts.map(d => `
            <tr class="border-b hover:bg-slate-50">
                <td class="px-6 py-4 font-semibold text-slate-800">${fmtVND(d.order_value_from)}</td>
                <td class="px-6 py-4">${d.order_value_to ? fmtVND(d.order_value_to) : '∞'}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">${d.discount_percentage}%</span></td>
                <td class="px-6 py-4 text-slate-600">${esc(d.description)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs ${d.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}">
                        ${d.status === 'active' ? 'Hoạt động' : 'Tắt'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right flex justify-end gap-2">
                    <button onclick="ShippingAdmin.editDiscount(${d.id})" class="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">✏️ Sửa</button>
                    <button onclick="ShippingAdmin.deleteDiscount(${d.id})" class="text-xs px-2.5 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200">🗑️ Xóa</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-rose-600">Lỗi tải danh sách giảm giá: ${esc(err.message)}</td></tr>`;
    }
}

async function showAddDiscountModal() {
    renderDiscountModal({
        title: 'Thêm mức giảm giá phí ship',
        discount: {
            order_value_from: '',
            order_value_to: '',
            discount_percentage: '',
            description: '',
            status: 'active'
        },
        onSave: async (body) => {
            await api('/discounts', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            toast('Thêm mức giảm giá thành công!', 'success');
            loadDiscounts();
        }
    });
}

async function editDiscount(id) {
    try {
        const res = await api('/discounts');
        const d = (res.data || []).find(x => x.id === id);
        if (!d) return toast('Không tìm thấy mức giảm giá cần sửa', 'error');

        renderDiscountModal({
            title: 'Chỉnh sửa mức giảm giá phí ship',
            discount: d,
            onSave: async (body) => {
                await api(`/discounts/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body)
                });
                toast('Cập nhật mức giảm giá thành công!', 'success');
                loadDiscounts();
            }
        });
    } catch (err) {
        toast('Lỗi khi tải chi tiết giảm giá: ' + err.message, 'error');
    }
}

async function deleteDiscount(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa mức giảm giá này không?')) return;
    try {
        await api(`/discounts/${id}`, { method: 'DELETE' });
        toast('Xóa mức giảm giá thành công!', 'success');
        loadDiscounts();
    } catch (err) {
        toast('Lỗi khi xóa: ' + err.message, 'error');
    }
}

function renderDiscountModal({ title, discount, onSave }) {
    let m = $('shipping-modal-host');
    if (!m) {
        m = document.createElement('div');
        m.id = 'shipping-modal-host';
        document.body.appendChild(m);
    }

    m.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4';
    m.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div class="p-4 bg-slate-50 border-b flex items-center justify-between">
                <h3 class="font-bold text-slate-800 text-base">${esc(title)}</h3>
                <button onclick="closeShippingModal()" class="text-2xl hover:text-slate-700">&times;</button>
            </div>
            <form id="discount-modal-form" class="p-4 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Đơn hàng tối thiểu (đ) *</label>
                    <input type="number" name="order_value_from" required value="${discount.order_value_from}" class="w-full px-3 py-2 border rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Đơn hàng tối đa (đ) (Trống = không giới hạn)</label>
                    <input type="number" name="order_value_to" value="${discount.order_value_to ?? ''}" class="w-full px-3 py-2 border rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Phần trăm giảm phí ship (%) *</label>
                    <input type="number" min="0" max="100" name="discount_percentage" required value="${discount.discount_percentage}" class="w-full px-3 py-2 border rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Mô tả hiển thị (VD: Giảm 50% phí ship cho đơn từ 1 triệu)</label>
                    <input type="text" name="description" value="${esc(discount.description)}" class="w-full px-3 py-2 border rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                    <select name="status" class="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                        <option value="active" ${discount.status === 'active' ? 'selected' : ''}>Hoạt động</option>
                        <option value="inactive" ${discount.status === 'inactive' ? 'selected' : ''}>Tắt</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onclick="closeShippingModal()" class="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
                </div>
            </form>
        </div>
    `;

    const form = $('discount-modal-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const body = {
            order_value_from: parseFloat(form.order_value_from.value) || 0,
            order_value_to: form.order_value_to.value ? parseFloat(form.order_value_to.value) : null,
            discount_percentage: parseInt(form.discount_percentage.value) || 0,
            description: form.description.value.trim(),
            status: form.status.value
        };
        try {
            await onSave(body);
            closeShippingModal();
        } catch (err) {
            toast('Lỗi: ' + err.message, 'error');
        }
    };
}

// ============================================================
// Tab orchestrator
// ============================================================
function onTabChange(tabName) {
    if (tabName === 'zones')     loadZones();
    if (tabName === 'provinces') loadProvinces();
    if (tabName === 'stores')    loadStores();
    if (tabName === 'carrier')   loadCarrierConfig();
    if (tabName === 'discounts') loadDiscounts();
    if (tabName === 'preview')   { /* no-op until user clicks */ }
    if (tabName === 'logs')      loadLogs();
}

// Public surface
window.ShippingAdmin = {
    onTabChange,
    editZone, deleteZone, addRule, editRule, deleteRule,
    editStoreInline, setDefaultStore, deleteStore,
    toggleCarrierFields, saveCarrierConfig,
    loadDiscounts, showAddDiscountModal, editDiscount, deleteDiscount
};

// Auto-load nếu tab Zones đang hiển thị khi script chạy
document.addEventListener('DOMContentLoaded', () => {
    if ($('shipping-content-zones') && !$('shipping-content-zones').classList.contains('hidden')) {
        loadZones();
    }
});

})();
