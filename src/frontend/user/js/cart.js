// Cart JavaScript
// Chi khai bao neu chua ton tai
if (typeof API_URL === 'undefined') {
    var API_URL = 'http://localhost:3000/api';
}
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23f3f4f6" width="300" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EKh%C3%B4ng%20c%C3%B3%20%E1%BA%A3nh%3C/text%3E%3C/svg%3E';

// Luu trở các sản phẩm được chọn (theo index)
let selectedItems = new Set();

// Kiem tra dang nhap
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

// Lay user hien tai
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Lay cart key theo user
function getCartKey() {
    const user = getCurrentUser();
    return user ? `cart_${user.ma_tai_khoan}` : 'cart_guest';
}

// Lay selected key theo user
function getSelectedKey() {
    const user = getCurrentUser();
    return user ? `selected_${user.ma_tai_khoan}` : 'selected_guest';
}

// Luu selected items vao localStorage
function saveSelectedItems() {
    const selectedKey = getSelectedKey();
    localStorage.setItem(selectedKey, JSON.stringify([...selectedItems]));
}

// Load selected items tu localStorage
function loadSelectedItems() {
    const selectedKey = getSelectedKey();
    const saved = localStorage.getItem(selectedKey);
    if (saved) {
        selectedItems = new Set(JSON.parse(saved));
    } else {
        // Mac dinh chon tat ca
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        selectedItems = new Set(cart.map((_, index) => index));
    }
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Kiem tra dang nhap
    if (!isLoggedIn()) {
        showLoginRequiredPage();
        return;
    }
    
    // Clean invalid cart data (kiem tra san pham ton tai)
    await cleanCartData();
    // Load selected items
    loadSelectedItems();
    loadCart();
    updateCartBadge();
    
    // Load promo codes
    loadSavedPromos();
    loadAppliedPromo();
});

// Hien thi trang yeu cau dang nhap
function showLoginRequiredPage() {
    const container = document.getElementById('cartItems');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-16">
                <svg class="w-24 h-24 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Vui lòng đăng nhập</h3>
                <p class="text-gray-500 mb-6">Bạn cần đăng nhập để xem giỏ hàng của mình</p>
                <a href="login.html" class="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition">
                    Đăng nhập ngay
                </a>
            </div>
        `;
    }
    // Cap nhat summary
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    const itemCountEl = document.getElementById('cartItemCount');
    if (subtotalEl) subtotalEl.textContent = '0₫';
    if (totalEl) totalEl.textContent = '0₫';
    if (itemCountEl) itemCountEl.textContent = '0 sản phẩm';
}

// Clean invalid cart data - kiểm tra sản phẩm tồn tại trong database
async function cleanCartData() {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Filter out invalid items (thiếu ma_san_pham hoặc ten_san_pham)
    cart = cart.filter(item => {
        return item && item.ma_san_pham && item.ten_san_pham;
    });
    
    // Kiểm tra sản phẩm tồn tại trong database
    const validCart = [];
    for (const item of cart) {
        try {
            const response = await fetch(`${API_URL}/products/${item.ma_san_pham}`);
            if (response.ok) {
                const resData = await response.json();
                const dbProduct = resData.success ? resData.data : null;
                // sản phẩm tồn tại, giữ lại trong giỏ
                validCart.push({
                    ...item,
                    so_luong: Math.max(1, parseInt(item.so_luong) || 1),
                    gia: Math.max(0, parseFloat(item.gia) || 0),
                    trong_luong_kg: dbProduct && dbProduct.trong_luong_kg !== undefined && dbProduct.trong_luong_kg !== null
                        ? parseFloat(dbProduct.trong_luong_kg)
                        : (parseFloat(item.trong_luong_kg) || 0.5)
                });
            } else {
                // sản phẩm không tồn tại, bỏ qua và log
                console.warn(`sản phẩm ID ${item.ma_san_pham} không tồn tại, đã xóa khỏi giỏ hàng`);
            }
        } catch (error) {
            // Lỗi network, giữ lại sản phẩm để tránh mất dữ liệu
            console.error(`Lỗi kiểm tra sản phẩm ${item.ma_san_pham}:`, error);
            validCart.push({
                ...item,
                so_luong: Math.max(1, parseInt(item.so_luong) || 1),
                gia: Math.max(0, parseFloat(item.gia) || 0)
            });
        }
    }
    
    // Neu co san pham bi xoa, thong bao cho user
    if (validCart.length < cart.length) {
        const removedCount = cart.length - validCart.length;
        showNotification(`Đã xóa ${removedCount} sản phẩm không còn tồn tại khỏi giỏ hàng`);
    }
    
    localStorage.setItem(cartKey, JSON.stringify(validCart));
}

// Load cart from localStorage
function loadCart() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    displayCart(cart);
    updateCartSummary(cart);
}

// Display cart items
function displayCart(cart) {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        selectedItems.clear();
        saveSelectedItems();
        container.innerHTML = `
            <div class="text-center py-16">
                <svg class="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Giỏ hàng trống</h3>
                <p class="text-gray-500 mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
                <a href="products.html" class="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition">
                    Tiếp tục mua sắm
                </a>
            </div>
        `;
        return;
    }
    
    // Xóa các index không hợp lệ khỏi selectedItems
    selectedItems = new Set([...selectedItems].filter(i => i < cart.length));
    saveSelectedItems();
    
    // Kiểm tra xem tất cả đã được chọn chưa
    const allSelected = cart.length > 0 && selectedItems.size === cart.length;
    
    // Header với checkbox chọn tất cả
    let html = `
        <div class="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-100">
            <div class="flex items-center gap-3">
                <label class="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" 
                           id="selectAll" 
                           onchange="toggleSelectAll(this.checked)"
                           ${allSelected ? 'checked' : ''}
                           class="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer">
                    <span class="font-semibold text-gray-700">chọn tất cả (${cart.length} sản phẩm)</span>
                </label>
                <div class="ml-auto flex items-center gap-2">
                    <span class="text-sm text-gray-500"> chọn: <strong class="text-red-600">${selectedItems.size}</strong> sản phẩm</span>
                    ${selectedItems.size > 0 ? `
                        <button onclick="removeSelectedItems()" class="text-red-500 hover:text-red-700 text-sm font-medium ml-2">
                            Xóa đã chọn
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Danh sáº£ch sản phẩm
    html += cart.map((item, index) => {
        const isSelected = selectedItems.has(index);
        return `
        <div class="bg-white rounded-xl shadow-md p-4 mb-4 border-2 ${isSelected ? 'border-red-400 bg-red-50/30' : 'border-gray-100'} transition-all duration-200">
            <div class="flex gap-4">
                <!-- Checkbox -->
                <div class="flex items-center">
                    <input type="checkbox" 
                           id="item-${index}" 
                           onchange="toggleItemSelection(${index}, this.checked)"
                           ${isSelected ? 'checked' : ''}
                           class="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer">
                </div>
                
                <!-- Product Image -->
                <div class="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer" onclick="toggleItemSelection(${index}, !selectedItems.has(${index})); document.getElementById('item-${index}').checked = selectedItems.has(${index});">
                    <img src="${item.anh_chinh || PLACEHOLDER_IMAGE}" 
                         alt="${item.ten_san_pham}" 
                         class="w-full h-full object-contain"
                         onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'">
                </div>
                
                <!-- Product Info -->
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 mb-1 cursor-pointer hover:text-red-600" onclick="toggleItemSelection(${index}, !selectedItems.has(${index})); document.getElementById('item-${index}').checked = selectedItems.has(${index});">${item.ten_san_pham}</h3>
                    <p class="text-red-600 font-bold text-lg">${formatPrice(item.gia)}</p>
                    
                    <!-- Quantity Controls -->
                    <div class="flex items-center gap-3 mt-2">
                        <div class="flex items-center border border-gray-300 rounded-lg">
                            <button onclick="updateQuantity(${index}, -1)" class="px-3 py-1 hover:bg-gray-100 transition">-</button>
                            <span class="px-3 py-1 border-x border-gray-300">${parseInt(item.so_luong) || 1}</span>
                            <button onclick="updateQuantity(${index}, 1)" class="px-3 py-1 hover:bg-gray-100 transition">+</button>
                        </div>
                        <button onclick="removeItem(${index})" class="text-red-500 hover:text-red-700 transition" title="Xóa sản phẩm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Item Total -->
                <div class="text-right">
                    <p class="text-sm text-gray-500">Thành tiền</p>
                    <p class="font-bold text-red-600">${formatPrice(item.gia * (parseInt(item.so_luong) || 1))}</p>
                </div>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = html;
}

// Toggle chọn/bỏ chọn một sản phẩm
function toggleItemSelection(index, isSelected) {
    if (isSelected) {
        selectedItems.add(index);
    } else {
        selectedItems.delete(index);
    }
    saveSelectedItems();
    loadCart(); // Reload để cập nhật UI và tính toán lại
}

// Toggle chọn/bỏ chọn tất cả
function toggleSelectAll(isSelected) {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    if (isSelected) {
        selectedItems = new Set(cart.map((_, index) => index));
    } else {
        selectedItems.clear();
    }
    saveSelectedItems();
    loadCart();
}

// Xáº£a các sản phẩm dáº£ chọn
function removeSelectedItems() {
    if (selectedItems.size === 0) {
        showNotification('Vui lòng chọn sản phẩm cần xóa');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.size} sản phẩm đã chọn?`)) {
        return;
    }
    
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Xóa từ cuối lên để không ảnh hưởng index
    const sortedIndices = [...selectedItems].sort((a, b) => b - a);
    sortedIndices.forEach(index => {
        cart.splice(index, 1);
    });
    
    localStorage.setItem(cartKey, JSON.stringify(cart));
    selectedItems.clear();
    saveSelectedItems();
    loadCart();
    updateCartBadge();
    showNotification(`Đã xóa ${sortedIndices.length} sản phẩm`);
}


// Update cart summary - chỉ tính cho các sản phẩm được chọn
function updateCartSummary(cart) {
    // Kiểm tra nếu có promo đang áp dụng thì dùng hàm có discount
    const promoData = getPromoData();
    if (promoData && promoData.discountPercent > 0) {
        updateCartSummaryWithDiscount();
        return;
    }
    
    // chỉ tính từng cho các sản phẩm được chọn
    let subtotal = 0;
    let selectedCount = 0;
    
    cart.forEach((item, index) => {
        if (selectedItems.has(index)) {
            const qty = parseInt(item.so_luong) || 1;
            subtotal += item.gia * qty;
            selectedCount += qty;
        }
    });
    
    //✓ Miễn phí ship cho đơn từ 2 triệu
    const FREE_SHIPPING_THRESHOLD = 2000000;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (subtotal > 0 ? 0 : 0);
    const total = subtotal + shipping;
    
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const itemCountEl = document.getElementById('cartItemCount');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) {
        if (subtotal === 0) {
            shippingEl.innerHTML = '<span class="text-gray-500">0₫</span>';
        } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            shippingEl.innerHTML = '<span class="text-green-600 font-semibold">✓ Miễn phí</span>';
        } else {
            const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
            shippingEl.innerHTML = (remaining <= 500000) ? `<span class="text-gray-600">Tính khi thanh toán</span><br><span class="text-xs text-orange-600">⚡ Cần ${formatPrice(remaining)} để✓ Miễn phí!</span>` : `<span class="text-gray-600">Tính khi thanh toán</span>`;
        }
    }
    if (totalEl) totalEl.textContent = formatPrice(total);
    if (itemCountEl) {
        itemCountEl.textContent = `${selectedCount} sản phẩm được chọn`;
    }
    
    // Ẩn dòng giảm giá nếu không có promo
    const summaryRow = document.getElementById('summaryPromoRow');
    if (summaryRow) {
        summaryRow.classList.add('hidden');
        summaryRow.classList.remove('flex');
    }
    
    // Cập nhật nút thanh toán
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        if (selectedItems.size === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.remove('hover:bg-red-700');
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.add('hover:bg-red-700');
        }
    }
}

// Update quantity
function updateQuantity(index, change) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    if (cart[index]) {
        const newQuantity = Math.max(1, (parseInt(cart[index].so_luong) || 1) + change);
        
        // Kiểm tra số lượng > 5 thì yêu cầu liên hệ hotline
        if (newQuantity > 5) {
            showQuantityLimitModal();
            return;
        }
        
        cart[index].so_luong = newQuantity;
        localStorage.setItem(cartKey, JSON.stringify(cart));
        loadCart();
        updateCartBadge();
    }
}

// Modal hiển thị khi số lượng > 5
function showQuantityLimitModal() {
    const existingModal = document.getElementById('quantityLimitModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'quantityLimitModal';
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
                    <p class="text-lg font-bold text-yellow-700"> Hotline: 0335162856</p>
                    <p class="text-sm text-yellow-600 mt-1">hỗ trợ 8:00 - 21:30 hằng ngày</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeQuantityLimitModal()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                        ng
                    </button>
                    <a href="tel:0335162856" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center gap-2">
                        <span></span> Gọi ngay
                    </a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeQuantityLimitModal();
        }
    });
}

function closeQuantityLimitModal() {
    const modal = document.getElementById('quantityLimitModal');
    if (modal) modal.remove();
}

// Remove item from cart
function removeItem(index) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    cart.splice(index, 1);
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    // Cập nhật selectedItems - xóa index này và giảm các index lớn hơn
    selectedItems.delete(index);
    const newSelected = new Set();
    selectedItems.forEach(i => {
        if (i > index) {
            newSelected.add(i - 1);
        } else {
            newSelected.add(i);
        }
    });
    selectedItems = newSelected;
    saveSelectedItems();
    
    loadCart();
    updateCartBadge();
    showNotification('Đã xóa sản phẩm khỏi giỏ hàng');
}

// Clear all cart
function clearCart() {
    if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
        const cartKey = getCartKey();
        localStorage.setItem(cartKey, '[]');
        loadCart();
        updateCartBadge();
        showNotification('Đã xóa tất cả sản phẩm');
    }
}

// Update cart badge
function updateCartBadge() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.so_luong) || 0), 0);
    
    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalItems || 0;
    });
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Tiến hành thanh toán
function proceedToCheckout() {
    if (selectedItems.size === 0) {
        showNotification('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
        return;
    }
    
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Lấy các sản phẩm được chọn
    const selectedProducts = [];
    let totalQuantity = 0;
    cart.forEach((item, index) => {
        if (selectedItems.has(index)) {
            selectedProducts.push(item);
            totalQuantity += parseInt(item.so_luong) || 1;
        }
    });
    
    // Kiểm tra từng số lượng sản phẩm - nếu >= 5 thì hiển thị cảnh báo
    if (totalQuantity >= 5) {
        showLargeOrderWarning(totalQuantity);
        return;
    }
    
    // Luu sản phẩm được chọn để thanh toáº£n
    const user = getCurrentUser();
    const checkoutKey = user ? `checkout_${user.ma_tai_khoan}` : 'checkout_guest';
    localStorage.setItem(checkoutKey, JSON.stringify(selectedProducts));
    
    // Chuyển đến trang thanh toán
    window.location.href = 'checkout.html';
}

// Hiển thị cảnh báo đơn hàng số lượng lớn
function showLargeOrderWarning(totalQuantity) {
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('largeOrderWarningModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'largeOrderWarningModal';
    modal.className = 'fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-4 max-w-sm w-full shadow-2xl" onclick="event.stopPropagation()">
            <div class="text-center">
                <!-- Warning Icon -->
                <div class="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                
                <h3 class="text-lg font-bold text-gray-900 mb-1">Đơn hàng số lượng lớn</h3>
                <p class="text-sm text-gray-600 mb-3">
                    Bạn dang mua <span class="font-bold text-red-600">${totalQuantity} sản phẩm</span>.
                </p>
                
                <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-2 mb-3">
                    <p class="text-xs text-gray-700">
                        Đơn hàng từ <strong>5 SP</strong> trở lên, vui lòng liên hệ cửa hàng để nhận ưu đãi!
                    </p>
                </div>
                
                <!-- Hotline Info -->
                <div class="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                    <p class="text-xs text-gray-600">Hotline:</p>
                    <a href="tel:0358022466" class="text-lg font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        0358.022.466
                    </a>
                </div>
                
                <!-- Zalo Contact -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                    <a href="https://zalo.me/0358022466" target="_blank" class="inline-flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" alt="Zalo" class="w-4 h-4">
                        Chat Zalo ngay
                    </a>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-2">
                    <button onclick="document.getElementById('largeOrderWarningModal').remove()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-lg transition text-sm">
                        Quay lại
                    </button>
                    <a href="tel:0358022466" class="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-2 px-3 rounded-lg transition text-center text-sm">
                         Gọi ngay
                    </a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // áº£áº£ng modal khi click báº£n ngoáº£i
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Mobile menu toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}


// ==========================================
// PROMO CODE FUNCTIONS
// ==========================================

// Lấy key lưu mã khuyến mãi theo user
function getSavedPromosKey() {
    const user = getCurrentUser();
    return user ? `saved_promos_${user.ma_tai_khoan}` : 'saved_promos_guest';
}

// Lấy danh sách mã đã lưu
function getSavedPromos() {
    try {
        return JSON.parse(localStorage.getItem(getSavedPromosKey())) || [];
    } catch {
        return [];
    }
}

// Lấy key lưu mã đang áp dụng
function getAppliedPromoKey() {
    const user = getCurrentUser();
    return user ? `applied_promo_${user.ma_tai_khoan}` : 'applied_promo_guest';
}

// Lấy mã đang áp dụng
function getAppliedPromo() {
    return localStorage.getItem(getAppliedPromoKey()) || '';
}

// Luu máº£ dang áº£p đểng
function setAppliedPromo(code) {
    localStorage.setItem(getAppliedPromoKey(), code);
}

// Load và hiển thị mã đã lưu
function loadSavedPromos() {
    const container = document.getElementById('savedPromosList');
    const savedContainer = document.getElementById('savedPromosContainer');
    if (!container) return;
    
    const savedPromos = getSavedPromos();
    
    if (savedPromos.length === 0) {
        if (savedContainer) savedContainer.classList.add('hidden');
        return;
    }
    
    if (savedContainer) savedContainer.classList.remove('hidden');
    
    container.innerHTML = savedPromos.map(promo => `
        <button onclick="selectPromoCode('${promo.code}')" 
                class="saved-promo-btn bg-green-100 border-2 border-green-400 text-green-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-green-200 transition flex items-center gap-2">
            <span></span>
            <span>${promo.code}</span>
        </button>
    `).join('');
}

// Chọn mã khuyến mãi (điền vào input)
function selectPromoCode(code) {
    const input = document.getElementById('promoCodeInput');
    if (input) {
        input.value = code;
        input.focus();
    }
}

// Lưu thông tin giảm giá hiện tại
let currentPromoData = null;

// Áp dụng mã khuyến mãi
async function applyPromoCode() {
    const input = document.getElementById('promoCodeInput');
    const code = input ? input.value.trim().toUpperCase() : '';
    
    if (!code) {
        showNotification('Vui lòng nhập mã giảm giá');
        return;
    }
    
    // Tính subtotal hiện tại
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    let subtotal = 0;
    cart.forEach((item, index) => {
        if (selectedItems.has(index)) {
            const qty = parseInt(item.so_luong) || 1;
            subtotal += item.gia * qty;
        }
    });
    
    // Gọi API kiểm tra mã giảm giá
    try {
        const response = await fetch(`${API_URL}/admin/public/apply-promo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            showErrorNotification(result.message || 'Mã giảm giá không hợp lệ');
            return;
        }
        
        // Lưu thông tin giảm giá
        currentPromoData = result.data;
        
        // Luu máº£ dang áº£p đểng
        setAppliedPromo(code);
        savePromoData(result.data);
        
        // Hiển thị mã đang áp dụng trong phần voucher
        const appliedContainer = document.getElementById('appliedPromoContainer');
        const appliedCode = document.getElementById('appliedPromoCode');
        
        if (appliedContainer && appliedCode) {
            appliedCode.textContent = code;
            appliedContainer.classList.remove('hidden');
        }
        
        // Cập nhật tạm tính đơn hàng với giảm giá
        updateCartSummaryWithDiscount();
        
        // Clear input
        if (input) input.value = '';
        
        showNotification(`Áp dụng mã "${code}" - ${result.data.message}`);
        
    } catch (error) {
        console.error('Apply promo error:', error);
        showErrorNotification('Không thể kiểm tra mã giảm giá. Vui lòng thử lại.');
    }
}

// Luu tháº£ng tin promo váº£o localStorage
function savePromoData(data) {
    const user = getCurrentUser();
    const key = user ? `promo_data_${user.ma_tai_khoan}` : 'promo_data_guest';
    localStorage.setItem(key, JSON.stringify(data));
}

// Lấy thông tin promo từ localStorage
function getPromoData() {
    const user = getCurrentUser();
    const key = user ? `promo_data_${user.ma_tai_khoan}` : 'promo_data_guest';
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

// Xáº£a tháº£ng tin promo
function clearPromoData() {
    const user = getCurrentUser();
    const key = user ? `promo_data_${user.ma_tai_khoan}` : 'promo_data_guest';
    localStorage.removeItem(key);
    currentPromoData = null;
}

// Cập nhật tạm tính đơn hàng với giảm giá
function updateCartSummaryWithDiscount() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // tính subtotal
    let subtotal = 0;
    let selectedCount = 0;
    cart.forEach((item, index) => {
        if (selectedItems.has(index)) {
            const qty = parseInt(item.so_luong) || 1;
            subtotal += item.gia * qty;
            selectedCount += qty;
        }
    });
    
    // Lấy thông tin giảm giá
    const promoData = currentPromoData || getPromoData();
    let discountAmount = 0;
    
    if (promoData && promoData.discountPercent > 0) {
        // Kiểm tra điều kiện tối thiểu
        if (!promoData.minOrderValue || subtotal >= promoData.minOrderValue) {
            discountAmount = Math.round(subtotal * promoData.discountPercent / 100);
        }
    }
    
    //✓ Miễn phí ship cho đơn từ 2 triệu
    const FREE_SHIPPING_THRESHOLD = 2000000;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (subtotal > 0 ? 0 : 0);
    const total = subtotal - discountAmount + shipping;
    
    // Cập nhật UI
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const itemCountEl = document.getElementById('cartItemCount');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) {
        if (subtotal === 0) {
            shippingEl.innerHTML = '<span class="text-gray-500">0₫</span>';
        } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            shippingEl.innerHTML = '<span class="text-green-600 font-semibold">✓ Miễn phí</span>';
        } else {
            const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
            shippingEl.innerHTML = (remaining <= 500000) ? `<span class="text-gray-600">Tính khi thanh toán</span><br><span class="text-xs text-orange-600">⚡ Cần ${formatPrice(remaining)} để✓ Miễn phí!</span>` : `<span class="text-gray-600">Tính khi thanh toán</span>`;
        }
    }
    if (totalEl) totalEl.textContent = formatPrice(total);
    if (itemCountEl) {
        itemCountEl.textContent = `${selectedCount} sản phẩm được chọn`;
    }
    
    // Cập nhật dòng giảm giá
    const summaryRow = document.getElementById('summaryPromoRow');
    const summaryCode = document.getElementById('summaryPromoCode');
    const summaryDiscount = document.getElementById('summaryPromoDiscount');
    
    if (summaryRow && summaryCode && summaryDiscount) {
        if (promoData && discountAmount > 0) {
            summaryCode.textContent = promoData.code;
            summaryDiscount.textContent = `-${formatPrice(discountAmount)}`;
            // Reset màu về xanh
            summaryDiscount.classList.remove('text-orange-500');
            summaryDiscount.classList.add('text-green-600');
            summaryRow.classList.remove('hidden');
            summaryRow.classList.add('flex');
        } else if (promoData && promoData.minOrderValue && subtotal < promoData.minOrderValue) {
            // Không đủ điều kiện
            summaryCode.textContent = promoData.code;
            summaryDiscount.textContent = `Cần ${formatPrice(promoData.minOrderValue)}`;
            summaryDiscount.classList.remove('text-green-600');
            summaryDiscount.classList.add('text-orange-500');
            summaryRow.classList.remove('hidden');
            summaryRow.classList.add('flex');
        } else {
            summaryRow.classList.add('hidden');
            summaryRow.classList.remove('flex');
        }
    }
    
    // Cập nhật nút thanh toán
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        if (selectedItems.size === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.remove('hover:bg-red-700');
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.add('hover:bg-red-700');
        }
    }
}

// Hiển thị thông báo lỗi
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// Cập nhật hiển thị mã giảm giá trong tạm tính đơn hàng (deprecated - dùng updateCartSummaryWithDiscount)
function updateSummaryPromo(code) {
    // Nếu không có code, ẩn dòng giảm giá
    if (!code) {
        const summaryRow = document.getElementById('summaryPromoRow');
        if (summaryRow) {
            summaryRow.classList.add('hidden');
            summaryRow.classList.remove('flex');
        }
    }
}

// Xóa mã đang áp dụng
function removeAppliedPromo() {
    setAppliedPromo('');
    clearPromoData();
    
    // Ẩn trong phần voucher
    const appliedContainer = document.getElementById('appliedPromoContainer');
    if (appliedContainer) {
        appliedContainer.classList.add('hidden');
    }
    
    // Reset máº£u cho discount text
    const summaryDiscount = document.getElementById('summaryPromoDiscount');
    if (summaryDiscount) {
        summaryDiscount.classList.remove('text-orange-500');
        summaryDiscount.classList.add('text-green-600');
    }
    
    // Cập nhật lại tạm tính
    loadCart();
    
    showNotification('Đã xóa mã giảm giá');
}

// Xóa mã đã lưu
function removeSavedPromo(code) {
    let savedPromos = getSavedPromos();
    savedPromos = savedPromos.filter(p => p.code !== code);
    localStorage.setItem(getSavedPromosKey(), JSON.stringify(savedPromos));
    loadSavedPromos();
    showNotification(`Đã xóa mã "${code}" khỏi danh sách đã lưu`);
}

// Load mã đang áp dụng khi trang load
function loadAppliedPromo() {
    const appliedCode = getAppliedPromo();
    const promoData = getPromoData();
    
    if (appliedCode && promoData) {
        // Load promo data vào biến global
        currentPromoData = promoData;
        
        // Hiển thị trong phần voucher
        const appliedContainer = document.getElementById('appliedPromoContainer');
        const appliedCodeEl = document.getElementById('appliedPromoCode');
        
        if (appliedContainer && appliedCodeEl) {
            appliedCodeEl.textContent = appliedCode;
            appliedContainer.classList.remove('hidden');
        }
        
        // Cập nhật tạm tính đơn hàng với giảm giá
        updateCartSummaryWithDiscount();
    }
}

// Cập nhật DOMContentLoaded để load promo codes
// Đã được xử lý trong DOMContentLoaded chính ở đầu file

