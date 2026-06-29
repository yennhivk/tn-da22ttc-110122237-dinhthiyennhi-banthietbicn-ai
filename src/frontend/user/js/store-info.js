// ==========================================
// STORE INFO LOADER
// Fetch thông tin cửa hàng mặc định từ API và đồng bộ ra các phần tử
// có data-store-field="<tên cột>" trên trang.
// Dùng chung cho footer, contact, POS receipt, v.v.
// ==========================================

(function () {
    const CACHE_KEY = '__store_info_cache_v1';
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

    // Tự nhận diện base API URL (admin pages dùng cổng 3000; user pages thường relative)
    function getApiBase() {
        if (typeof window !== 'undefined' && window.API_URL) return window.API_URL;
        return 'http://localhost:3000/api';
    }

    async function fetchDefaultStore({ forceRefresh = false } = {}) {
        // Dùng cache trong session
        if (!forceRefresh) {
            try {
                const cached = sessionStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_TTL_MS) return data;
                }
            } catch (e) { /* ignore */ }
        }

        try {
            const res = await fetch(`${getApiBase()}/shipping-config/stores/default`);
            if (!res.ok) return null;
            const json = await res.json();
            if (!json.success || !json.data) return null;
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: json.data, ts: Date.now() }));
            } catch (e) { /* ignore quota */ }
            return json.data;
        } catch (err) {
            console.warn('[StoreInfo] Không tải được thông tin cửa hàng mặc định:', err.message);
            return null;
        }
    }

    function ensureUrl(url) {
        if (!url) return '';
        return /^https?:\/\//i.test(url) ? url : `https://${url}`;
    }

    function buildGoogleMapsEmbedUrl(store) {
        const address = String(store?.dia_chi_day_du || '').trim() || '74-76 Lê Lợi, Phường 2, Thành phố Trà Vinh, Trà Vinh';
        return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
    }

    // Áp dụng dữ liệu vào các phần tử có data-store-field hoặc data-store-attr
    function applyStoreInfo(store, root = document) {
        if (!store) return;

        root.querySelectorAll('[data-store-field]').forEach(el => {
            const field = el.dataset.storeField;
            const val = store[field];
            if (val == null || val === '') return;

            // Nếu field là link (website, facebook,...), cập nhật href + text
            if (el.tagName === 'A' && ['website', 'facebook', 'instagram', 'tiktok'].includes(field)) {
                el.href = ensureUrl(val);
                if (!el.dataset.keepText) el.textContent = val;
            } else if (el.tagName === 'IMG' && field === 'logo_url') {
                el.src = val;
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = val;
            } else {
                el.textContent = val;
            }
        });

        // data-store-attr="href:website" hoặc "src:logo_url"
        root.querySelectorAll('[data-store-attr]').forEach(el => {
            const pairs = el.dataset.storeAttr.split(',');
            pairs.forEach(p => {
                const [attr, field] = p.split(':').map(s => s.trim());
                if (!attr || !field) return;
                const val = store[field];
                if (val == null || val === '') return;
                if (['href', 'src'].includes(attr) && ['website', 'facebook', 'instagram', 'tiktok'].includes(field)) {
                    el.setAttribute(attr, ensureUrl(val));
                } else {
                    el.setAttribute(attr, val);
                }
            });
        });

        const contactMap = root.querySelector('#contact-map');
        if (contactMap) {
            if (store.ban_do_html) {
                const parent = contactMap.parentElement;
                if (parent) {
                    parent.innerHTML = store.ban_do_html;
                    const newIframe = parent.querySelector('iframe');
                    if (newIframe) {
                        newIframe.id = 'contact-map';
                        newIframe.style.width = '100%';
                        newIframe.style.height = '100%';
                        newIframe.style.border = '0';
                    }
                }
            } else {
                contactMap.src = buildGoogleMapsEmbedUrl(store);
            }
        }
    }

    async function initStoreInfo(root = document) {
        const store = await fetchDefaultStore();
        applyStoreInfo(store, root);
        return store;
    }

    // Auto-init khi DOM ready (trừ khi disable bằng window.STORE_INFO_NO_AUTO)
    if (typeof window !== 'undefined') {
        window.StoreInfo = { fetchDefaultStore, applyStoreInfo, initStoreInfo };
        if (!window.STORE_INFO_NO_AUTO) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => initStoreInfo());
            } else {
                initStoreInfo();
            }
        }
    }
})();
