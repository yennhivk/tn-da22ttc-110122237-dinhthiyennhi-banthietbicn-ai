// Load Header and Footer components
document.addEventListener('DOMContentLoaded', function() {
    // Đảm bảo store-info.js đã load trước khi áp dụng vào header/footer
    ensureStoreInfoLoaded();

    // Load Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch('../includes/header.html?v=' + Date.now())
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
                document.dispatchEvent(new Event('headerLoaded'));
                // Initialize auth UI after header is loaded
                if (typeof initAuthUI === 'function') {
                    initAuthUI();
                }
                // Update cart badge after header is loaded
                if (typeof updateCartBadge === 'function') {
                    updateCartBadge();
                }
                // Đồng bộ thông tin cửa hàng (nếu header có data-store-field)
                applyStoreInfoIfReady(headerPlaceholder);
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Load Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('../includes/footer.html?v=' + Date.now())
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
                // Đồng bộ thông tin cửa hàng vào footer
                applyStoreInfoIfReady(footerPlaceholder);
            })
            .catch(error => console.error('Error loading footer:', error));
    }
});

// Helper: chờ window.StoreInfo sẵn sàng rồi apply
function applyStoreInfoIfReady(root) {
    const tryApply = () => {
        if (window.StoreInfo && typeof window.StoreInfo.initStoreInfo === 'function') {
            window.StoreInfo.initStoreInfo(root);
            return true;
        }
        return false;
    };
    if (tryApply()) return;
    // store-info.js có thể chưa load — đợi tối đa ~3s
    let tries = 0;
    const iv = setInterval(() => {
        tries++;
        if (tryApply() || tries > 30) clearInterval(iv);
    }, 100);
}

// Tự inject script store-info.js nếu page chưa có
function ensureStoreInfoLoaded() {
    if (window.StoreInfo) return;
    if (document.querySelector('script[data-store-info-loader]')) return;
    const s = document.createElement('script');
    s.src = '../js/store-info.js';
    s.dataset.storeInfoLoader = '1';
    document.head.appendChild(s);
}
