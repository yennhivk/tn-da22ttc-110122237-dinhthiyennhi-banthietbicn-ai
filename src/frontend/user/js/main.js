


﻿// Tải sẵn model AI nhận diện ảnh cho mượt
window.addEventListener('load', async () => {
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') return;
    try {
        if (!window.tf) {
            const s1 = document.createElement('script');
            s1.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0';
            document.head.appendChild(s1);
            await new Promise(r => s1.onload = r);
        }
        if (!window.mobilenet) {
            const s2 = document.createElement('script');
            s2.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0';
            document.head.appendChild(s2);
            await new Promise(r => s2.onload = r);
        }
        if (!window.__aiModel) {
            try { await window.tf.setBackend('webgl'); } catch(e){}
            window.__aiModel = await window.mobilenet.load({version: 2, alpha: 0.5});
            console.log('AI Model Preloaded V2!');
        }
    } catch(e) {}
});

/**
 * Global Functions - Yến Nhi Mobile
 * Các hàm JavaScript dùng chung cho toàn bộ website
 */

// Toggle Mobile Menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');
    
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
        if (menuIcon) menuIcon.classList.toggle('hidden');
        if (closeIcon) closeIcon.classList.toggle('hidden');
    }
}

// Handle Search (Desktop)
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        navigateToSearchResults(searchInput.value);
    }
}

// Handle Search (Mobile)
function handleMobileSearch() {
    const searchInput = document.getElementById('mobileSearchInput');
    if (searchInput && searchInput.value.trim()) {
        navigateToSearchResults(searchInput.value);
    }
}

function navigateToSearchResults(query) {
    const keyword = (query || '').trim();
    if (!keyword) return;

    if (typeof window.searchAll === 'function') {
        window.searchAll(keyword);
        return;
    }

    const isInPages = window.location.pathname.includes('/pages/');
    const target = isInPages ? 'products.html' : 'user/pages/products.html';
    window.location.href = `${target}?search=${encodeURIComponent(keyword)}`;
}

function normalizeImageFileName(fileName) {
    return (fileName || '')
        .replace(/\.[^/.]+$/, '')
        .replace(/[\-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(screenshot|image|img|photo|scan|camera|upload)/gi, '')
        .trim();
}

function initAdvancedSearchFeatures() {
    const searchInputs = document.querySelectorAll('#headerSearch, #searchInput, #mobileSearchInput');
    if (!searchInputs.length) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    searchInputs.forEach(input => {
        if (!input || input.dataset.advancedSearchInit === '1') return;
        input.dataset.advancedSearchInit = '1';

        const wrapper = input.parentElement;
        if (!wrapper) return;

        input.style.paddingRight = '90px';

        const actions = document.createElement('div');
        actions.className = 'search-action-buttons';
        actions.style.cssText = [
            'position:absolute',
            'right:8px',
            'top:50%',
            'transform:translateY(-50%)',
            'display:flex',
            'align-items:center',
            'gap:6px',
            'z-index:4'
        ].join(';');

        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.title = 'Tim kiem bang giong noi';
        voiceBtn.setAttribute('aria-label', 'Tim kiem bang giong noi');
        voiceBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path><path d="M19 10v2a7 7 0 01-14 0v-2"></path><path d="M12 19v4"></path><path d="M8 23h8"></path></svg>';
        voiceBtn.style.cssText = [
            'width:32px',
            'height:32px',
            'border:none',
            'border-radius:999px',
            'background:#eff6ff',
            'color:#2563eb',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'cursor:pointer',
            'transition:all .2s ease'
        ].join(';');

        const imageBtn = document.createElement('button');
        imageBtn.type = 'button';
        imageBtn.title = 'Tim kiem bang hinh anh';
        imageBtn.setAttribute('aria-label', 'Tim kiem bang hinh anh');
        imageBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 012-2h2.2l1.4-2h6.8l1.4 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>';
        imageBtn.style.cssText = voiceBtn.style.cssText;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        actions.appendChild(voiceBtn);
        actions.appendChild(imageBtn);
        wrapper.appendChild(actions);
        wrapper.appendChild(fileInput);

        let recognition = null;
        let listening = false;

        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = function() {
                input.dataset.originalPlaceholder = input.placeholder;
                input.placeholder = 'Đang nghe... Vui lòng nói';
            };

            recognition.onresult = function(event) {
                let transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
                if (transcript) {
                    // Chuẩn hóa giọng nói: bỏ dấu câu, chữ viết hoa và các từ thừa (filler words) hay dùng khi nói
                    transcript = transcript.toLowerCase()
                        .replace(/[.,!?]/g, '') // Bỏ dấu chấm phẩy nếu có
                        .replace(/^(tìm|tìm kiếm|tìm cho tôi|mua|mua giúp tôi|tôi muốn mua|tôi muốn tìm|cho xem)\s+/i, '')
                        .replace(/i phôn|ai phôn/i, 'iphone') // Sửa lỗi người Việt hay đọc sai tiếng anh
                        .replace(/láp tốp|lắp ráp/i, 'laptop')
                        .replace(/mắc búc/i, 'macbook')
                        .trim();
                    
                    input.value = transcript;
                    navigateToSearchResults(transcript);
                }
            };
            
            recognition.onerror = function(event) {
                console.error("Lỗi nhận diện giọng nói:", event.error);
                input.placeholder = 'Không nghe rõ, vui lòng thử lại...';
                setTimeout(() => {
                    input.placeholder = input.dataset.originalPlaceholder || 'Tìm kiếm...';
                }, 3000);
            };

            recognition.onend = function() {
                listening = false;
                voiceBtn.style.background = '#eff6ff';
                voiceBtn.style.color = '#2563eb';
                if (input.placeholder === 'Đang nghe... Vui lòng nói') {
                    input.placeholder = input.dataset.originalPlaceholder || 'Tìm kiếm...';
                }
            };
        } else {
            voiceBtn.disabled = true;
            voiceBtn.style.opacity = '0.45';
            voiceBtn.style.cursor = 'not-allowed';
            voiceBtn.title = 'Trinh duyet khong ho tro tim kiem giong noi';
        }

        voiceBtn.addEventListener('click', function() {
            if (!recognition) return;
            if (!listening) {
                listening = true;
                voiceBtn.style.background = '#fee2e2';
                voiceBtn.style.color = '#dc2626';
                recognition.start();
            } else {
                recognition.stop();
            }
        });

        imageBtn.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function(event) {
                const base64Str = event.target.result;
                sessionStorage.setItem('uploadedImage', base64Str);
                
                input.value = '';
                input.placeholder = 'Đang dùng AI quét ảnh...';
                
                try {
                    // 1. Tải thư viện AI (nếu chưa tải) tuần tự để tránh lỗi thiếu TensorFlow
                    if (!window.tf) {
                        await new Promise(r => {
                            const s = document.createElement('script');
                            s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0';
                            s.onload = r;
                            document.head.appendChild(s);
                        });
                    }
                    if (!window.mobilenet) {
                        await new Promise(r => {
                            const s = document.createElement('script');
                            s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0';
                            s.onload = r;
                            document.head.appendChild(s);
                        });
                    }
                    
                    // 2. Tái sử dụng model đã tải để phản hồi ngay lập tức
                    if (!window.__aiModel) {
                        try { await window.tf.setBackend('webgl'); } catch(e){} // Bật tăng tốc phần cứng
                        window.__aiModel = await window.mobilenet.load({version: 2, alpha: 0.5}); // Bản nhẹ nhất
                    }
                    
                    // 3. Đưa ảnh vào phân tích
                    const imgForAI = new Image();
                    imgForAI.src = base64Str;
                    await new Promise(resolve => { imgForAI.onload = resolve; });
                    
                    // Lấy ra top 7 kết quả giống nhất
                    const predictions = await window.__aiModel.classify(imgForAI, 7);
                    console.log("AI trả về danh sách đầy đủ:", predictions);
                    
                    let inferredQuery = '';
                    
                    // Sắp xếp thứ tự ưu tiên nhận diện: Những từ khóa dễ trùng lặp phải xếp hợp lý.
                    // Vd: "computer mouse" phải lọt vào 'chuột' trước khi bị nhận nhầm thành 'máy tính' (pc)
                    // "headphone" phải lọt vào 'tai nghe' trước khi bị nhận nhầm thành 'phone' (điện thoại)
                    const mappings = [
                        { regex: /laptop|notebook|macbook/i, kw: 'laptop' },
                        { regex: /headset|headphone|earphone|earpiece|loudspeaker|speaker|stethoscope|hearing aid|dental floss|projector/i, kw: 'tai nghe' },
                        { regex: /cellular|smartphone|telephone|phone|handset|mobile|ipod|modem|remote control|wallet|pay-phone/i, kw: 'điện thoại' },
                        { regex: /keyboard|keypad|typewriter/i, kw: 'bàn phím' },
                        { regex: /mouse|joystick/i, kw: 'chuột' },
                        { regex: /monitor|screen|display|television|tv/i, kw: 'màn hình' },
                        { regex: /desktop|computer|system board|case/i, kw: 'pc' },
                        { regex: /watch|clock/i, kw: 'đồng hồ' },
                        { regex: /refrigerator|icebox/i, kw: 'tủ lạnh' },
                        { regex: /washer|washing machine|dryer/i, kw: 'máy giặt' },
                        { regex: /camera|webcam|polaroid/i, kw: 'webcam' },
                        { regex: /tablet|ipad|pad/i, kw: 'ipad' },
                        { regex: /router|switch|usb/i, kw: 'phụ kiện' }
                    ];

                    // Chấm điểm xác suất AI từ cao đến thấp, dò qua từng món cụ thể
                    // Điều này giúp ảnh Tai nghe (xác suất tai nghe cao nhất) không bị đè bởi chữ Mouse (xác suất thấp)
                    for (const p of predictions) {
                        const classStr = p.className.toLowerCase();
                        for (const m of mappings) {
                            if (m.regex.test(classStr)) {
                                inferredQuery = m.kw;
                                break;
                            }
                        }
                        if (inferredQuery) break; // Nếu đã tìm thấy kết quả ở dự đoán cao nhất thì kết thúc
                    }
                    
                    if (inferredQuery) {
                        sessionStorage.setItem('imageSearchQuery', inferredQuery);
                        navigateToSearchResults(inferredQuery);
                    } else {
                        alert('Hệ thống AI quét ra vật thể: [' + predictions[0].className + '] nhưng chưa khớp với sản phẩm công nghệ nào. Bạn vui lòng chụp gần sản phẩm hơn!');
                        input.placeholder = 'Tìm kiếm...';
                    }
                    
                } catch (err) {
                    console.error('Lỗi khi AI quét ảnh:', err);
                    alert('Quá trình quét và phân tích đang bị gián đoạn, vui lòng kiểm tra kết nối mạng và thử lại!');
                    input.placeholder = 'Tìm kiếm...';
                }
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        });

        // Hien thi thumbnail neu co trong sessionStorage va trung khop voi query
        const urlParams = new URLSearchParams(window.location.search);
        const currentQuery = urlParams.get('search');
        const savedImage = sessionStorage.getItem('uploadedImage');
        const savedQuery = sessionStorage.getItem('imageSearchQuery');

        if (savedImage && (currentQuery === savedQuery || (!currentQuery && savedQuery))) {
            const thumbWrapper = document.createElement('div');
            thumbWrapper.style.cssText = [
                'position:absolute',
                'left:8px',
                'top:50%',
                'transform:translateY(-50%)',
                'height:32px',
                'width:32px',
                'border-radius:4px',
                'overflow:hidden',
                'z-index:5',
                'border:1px solid #ddd',
                'background:#fff',
                'display:flex',
                'align-items:center',
                'justify-content:center'
            ].join(';');

            const img = document.createElement('img');
            img.src = savedImage;
            img.style.cssText = 'max-width:100%;max-height:100%;object-fit:cover;';

            // Nut xoa thumbnail
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = [
                'position:absolute',
                'top:-5px',
                'right:-5px',
                'width:16px',
                'height:16px',
                'border-radius:50%',
                'background:red',
                'color:white',
                'border:none',
                'font-size:12px',
                'line-height:1',
                'cursor:pointer',
                'display:none'
            ].join(';');

            thumbWrapper.appendChild(img);
            thumbWrapper.appendChild(closeBtn);
            wrapper.appendChild(thumbWrapper);
            
            // Them padding left cho input de chua thumbnail
            input.style.paddingLeft = '45px';
            input.value = savedQuery || ''; // xoa text hoac ghi de text (ẩn text? user muon xoa text "không xuất hiện tên hình")
            // De an ten hinh: ta lam text color mau trang hoac rong
            input.value = '';
            input.placeholder = 'Đang tìm bằng hình ảnh...';

            thumbWrapper.addEventListener('mouseenter', () => closeBtn.style.display = 'block');
            thumbWrapper.addEventListener('mouseleave', () => closeBtn.style.display = 'none');

            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('uploadedImage');
                sessionStorage.removeItem('imageSearchQuery');
                thumbWrapper.remove();
                input.style.paddingLeft = ''; // reset padding left
                input.value = '';
                input.placeholder = 'Tìm kiếm...';
                
                // neu dang o trang ket qua tim kiem, tro ve trang tat ca san pham
                if (window.location.pathname.includes('products.html')) {
                    window.location.href = window.location.pathname;
                }
            });
        }

    });
}

// Navigate to Home
function navigateToHome() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
        window.location.href = '../index.html';
    } else {
        window.location.href = 'index.html';
    }
}

// Add Enter key support for search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleMobileSearch();
            }
        });
    }

    initAdvancedSearchFeatures();
});

document.addEventListener('headerLoaded', initAdvancedSearchFeatures);

// Shopping Cart Functions (dÃ¹ng cho index.html - trang chá»§)
// LÆ°u Ã½: Trang products.html vÃ  product-detail.html cÃ³ hÃ m addToCart riÃªng trong products.js/product-detail.js
// HÃ m nÃ y chá»‰ Ä‘Æ°á»£c gá»i khi cÃ¡c file JS khÃ¡c khÃ´ng Ä‘á»‹nh nghÄ©a addToCart

// Kiem tra xem dang o trang nao de quyet dinh co dinh nghia addToCart hay khong
(function() {
    // Neu dang o trang products hoac product-detail, khong dinh nghia addToCart
    // vi cac trang do da co ham rieng trong products.js hoac product-detail.js
    const isProductPage = window.location.pathname.includes('products.html') || 
                          window.location.pathname.includes('product-detail.html');
    
    if (isProductPage) {
        console.log('main.js: Dang o trang san pham, bo qua dinh nghia addToCart');
        return;
    }
    
    // Dinh nghia addToCart cho trang chu va cac trang khac
    window.addToCart = function(product) {
        // Kiem tra dang nhap
        if (!localStorage.getItem('token')) {
            showLoginRequiredModal();
            return;
        }
        
        // Lay cart key theo user
        const user = JSON.parse(localStorage.getItem('user'));
        const cartKey = user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
        let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        
        // Xá»­ lÃ½ nhiá»u kiá»ƒu tham sá»‘
        let productData;
        if (typeof product === 'object' && product !== null) {
            productData = product;
        } else if (typeof product === 'number') {
            // Náº¿u lÃ  ID, táº¡o object cÆ¡ báº£n
            productData = { id: product, name: 'Sáº£n pháº©m #' + product, price: 0 };
        } else if (typeof product === 'string') {
            // Náº¿u lÃ  tÃªn sáº£n pháº©m
            productData = { id: Date.now(), name: product, price: 0 };
        } else {
            console.error('addToCart: Tham sá»‘ khÃ´ng há»£p lá»‡', product);
            return;
        }
        
        // RÃ ng buá»™c giÃ¡ khÃ´ng Ã¢m
        const productPrice = Math.max(0, productData.price || 0);
        
        const existingItem = cart.find(item => item.id === productData.id || item.ma_san_pham === productData.id);
        
        if (existingItem) {
            const newQuantity = (existingItem.quantity || existingItem.so_luong || 0) + 1;
            
            // Kiá»ƒm tra sá»‘ lÆ°á»£ng > 5 thÃ¬ yÃªu cáº§u liÃªn há»‡ hotline
            if (newQuantity > 5) {
                showQuantityLimitModalMain();
                return;
            }
            
            existingItem.quantity = newQuantity;
            existingItem.so_luong = newQuantity;
        } else {
            cart.push({
                id: productData.id,
                ma_san_pham: productData.id,
                name: productData.name,
                ten_san_pham: productData.name,
                price: productPrice,
                gia: productPrice,
                image: productData.image,
                anh_chinh: productData.image,
                quantity: 1,
                so_luong: 1,
                trong_luong_kg: parseFloat(productData.trong_luong_kg) || 0.5
            });
        }
        
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCartBadgeGlobal();
        showToast('Đã thêm vào giỏ hàng!', 'success');
    };
    
    // Modal hiển thị khi số lượng > 5 (cho trang chủ)
    window.showQuantityLimitModalMain = function() {
        const existingModal = document.getElementById('quantityLimitModalMain');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'quantityLimitModalMain';
        modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onclick="event.stopPropagation()">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">Thông báo đặt hàng số lượng lớn</h3>
                    <p class="text-gray-600 mb-4">Để đặt mua số lượng trên 5 sản phẩm, vui lòng liên hệ trực tiếp với cửa hàng để được hỗ trợ giá tốt nhất!</p>
                    <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                        <p class="text-lg font-bold text-yellow-700">📞 Hotline: 0335162856</p>
                        <p class="text-sm text-yellow-600 mt-1">Hỗ trợ 8:00 - 21:30 hàng ngày</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeQuantityLimitModalMain()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                            Đóng
                        </button>
                        <a href="tel:0335162856" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center gap-2">
                            <span>📞</span> Gọi ngay
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeQuantityLimitModalMain();
            }
        });
    };
    
    window.closeQuantityLimitModalMain = function() {
        const modal = document.getElementById('quantityLimitModalMain');
        if (modal) modal.remove();
    };
})();

// Cáº­p nháº­t cart badge (global)
function updateCartBadgeGlobal() {
    const user = JSON.parse(localStorage.getItem('user'));
    const cartKey = user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || parseInt(item.so_luong) || 0), 0);
    
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems || 0;
    });
}

// Hien thi modal yeu cau dang nhap (dung cho index.html)
function showLoginRequiredModal() {
    // Xoa modal cu neu co
    const existingModal = document.getElementById('loginRequiredModalMain');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
    modal.id = 'loginRequiredModalMain';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onclick="event.stopPropagation()">
            <div class="text-center">
                <svg class="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Yêu cầu đăng nhập</h3>
                <p class="text-gray-600 mb-6">Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng</p>
                <div class="flex gap-3">
                    <button id="closeLoginModalMainBtn" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                        Để sau
                    </button>
                    <a href="pages/login.html" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center">
                        Đăng nhập
                    </a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Them event listener cho nut dong
    document.getElementById('closeLoginModalMainBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // Dong modal khi click ben ngoai
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Dong modal dang nhap (main.js) - giu lai de tuong thich
function closeLoginModalMain() {
    const modal = document.getElementById('loginRequiredModalMain');
    if (modal) modal.remove();
}

// Chuyen den trang dang nhap (main.js - tu index.html) - giu lai de tuong thich
function goToLoginPageMain() {
    window.location.href = 'pages/login.html';
}

function removeFromCartGlobal(productId) {
    const user = JSON.parse(localStorage.getItem('user'));
    const cartKey = user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    cart = cart.filter(item => (item.id !== productId && item.ma_san_pham !== productId));
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartBadgeGlobal();
    showToast('Đã xóa khỏi giỏ hàng!', 'info');
}

function clearCartGlobal() {
    const user = JSON.parse(localStorage.getItem('user'));
    const cartKey = user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
    localStorage.setItem(cartKey, '[]');
    updateCartBadgeGlobal();
    showToast('Giỏ hàng đã được xóa!', 'info');
}

function getCartGlobal() {
    const user = JSON.parse(localStorage.getItem('user'));
    const cartKey = user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
}

function getCartTotalGlobal() {
    const cart = getCartGlobal();
    return cart.reduce((total, item) => total + ((item.price || item.gia || 0) * (item.quantity || item.so_luong || 0)), 0);
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    }[type] || 'bg-gray-500';
    
    toast.innerHTML = `
        <div class="flex items-center gap-3 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="font-semibold">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading Spinner
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loading.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.remove();
    }
}

// Format Currency (VND)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Validate Email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate Phone (Vietnam)
function validatePhone(phone) {
    const re = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    return re.test(phone);
}

// User Authentication - Su dung token va user tu localStorage
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Đã đăng xuất!', 'info');
    
    // Xac dinh duong dan dung dua tren vi tri hien tai
    const currentPath = window.location.pathname;
    if (currentPath.includes('/user/pages/')) {
        window.location.href = '../../index.html';
    } else if (currentPath.includes('/pages/')) {
        window.location.href = '../index.html';
    } else {
        window.location.href = 'index.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Cap nhat cart badge cho tat ca cac trang
    updateCartBadgeGlobal();
    
    // Check if user is logged in and update UI
    if (isLoggedIn()) {
        const user = getCurrentUser();
        
        // Cap nhat phan user account area (cho cac trang co cau truc moi)
        const userAccountArea = document.getElementById('userAccountArea');
        const loginBtn = document.getElementById('loginBtn');
        const userDropdown = document.getElementById('userDropdown');
        const userDisplayName = document.getElementById('userDisplayName');
        const userAvatarLetter = document.getElementById('userAvatarLetter');
        const userAvatarImg = document.getElementById('userAvatarImg');
        const dropdownUserName = document.getElementById('dropdownUserName');
        const dropdownUserEmail = document.getElementById('dropdownUserEmail');
        
        if (userAccountArea && loginBtn && userDropdown) {
            // An nut dang nhap, hien dropdown user
            loginBtn.classList.add('hidden');
            userDropdown.classList.remove('hidden');
            
            // Hien thi ten user
            const displayName = user.ho_ten || user.ten_dang_nhap || 'User';
            if (userDisplayName) {
                userDisplayName.textContent = displayName;
            }
            
            // Hien thi chu cai dau trong avatar
            if (userAvatarLetter) {
                userAvatarLetter.textContent = displayName.charAt(0).toLowerCase();
            }
            
            // Hien thi avatar neu co
            if (userAvatarImg && user.hinh_anh) {
                const avatarSrc = user.hinh_anh.startsWith('http') ? user.hinh_anh : 'http://localhost:3000' + user.hinh_anh;
                userAvatarImg.src = avatarSrc;
                userAvatarImg.classList.remove('hidden');
                if (userAvatarLetter) userAvatarLetter.classList.add('hidden');
            }
            
            // Cap nhat dropdown info
            if (dropdownUserName) {
                dropdownUserName.textContent = displayName;
            }
            if (dropdownUserEmail) {
                dropdownUserEmail.textContent = user.email || '';
            }
        }
        
        // Fallback cho cac trang cu
        const loginButtons = document.querySelectorAll('[href*="login.html"]');
        loginButtons.forEach(btn => {
            if (btn.textContent.includes('Đăng nhập')) {
                btn.textContent = user.name || user.ten_dang_nhap || 'Tài khoản';
                btn.href = 'pages/account.html';
            }
        });
    }
});

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add scroll to top button
window.addEventListener('scroll', function() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.remove('hidden');
        } else {
            scrollBtn.classList.add('hidden');
        }
    }
});

// Show category products - Navigate to products page with category filter
function showCategoryProducts(category) {
    // Xác định đường dẫn dựa trên vị trí hiện tại
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const targetPath = isInPages ? 'products.html' : 'user/pages/products.html';
    
    // Chuyển hướng đến trang sản phẩm với category filter
    window.location.href = `${targetPath}?category=${encodeURIComponent(category)}`;
}

// Buy now function - Add to cart and go to checkout
function buyNow(productId) {
    // Kiểm tra đăng nhập
    if (!isLoggedIn()) {
        showLoginRequiredModal();
        return;
    }
    
    // Thêm sản phẩm vào giỏ hàng
    if (typeof addToCart === 'function') {
        addToCart(productId);
    }
    
    // Chuyển đến trang giỏ hàng
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const cartPath = isInPages ? 'cart.html' : 'pages/cart.html';
    
    setTimeout(() => {
        window.location.href = cartPath;
    }, 500);
}
