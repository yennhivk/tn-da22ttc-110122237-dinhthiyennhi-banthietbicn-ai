// API Configuration
const API_URL = 'http://localhost:3000/api';

// State
let currentProduct = null;
let currentQuantity = 1;

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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        loadProductDetail(productId);
    } else {
        showError('Không tìm thấy sản phẩm');
    }
    
    updateCartBadge();
});

// Load product detail from API
async function loadProductDetail(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const result = await response.json();
        
        if (result.success) {
            currentProduct = result.data;
            displayProductDetail(currentProduct);
            loadRelatedProducts(currentProduct.ma_danh_muc);

            // TRACKING: Ghi nhận hành vi XEM sản phẩm
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            if (token && userStr) {
                try {
                    const userId = JSON.parse(userStr).ma_tai_khoan;
                    if (userId) {
                        fetch(`${API_URL}/recommendations/track`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ userId: userId, productId: productId, actionType: 'view', actionValue: 1 })
                        })
                        .then(res => res.json())
                        .then(resData => {
                            if (resData.success && resData.isHighlyInterested) {
                                showInterestNotification(resData.productName || 'sản phẩm này');
                            }
                        })
                        .catch(e => {});
                    }
                } catch(e) {}
            }

        } else {
            showError('Không tìm thấy sản phẩm');
        }
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
        showError('Lỗi kết nối đến server');
    }
}

// Display product detail
function displayProductDetail(product) {
    // Update page title
    document.title = `${product.ten_san_pham} - Yến Nhi Tech`;
    
    // Breadcrumb
    document.getElementById('breadcrumbCategory').textContent = product.ten_danh_muc || 'Sản phẩm';
    document.getElementById('breadcrumbProduct').textContent = product.ten_san_pham;
    
    // Main image
    const mainImageUrl = getProductImageUrl(product.images?.[0]?.duong_dan_anh);
    document.getElementById('mainImage').src = mainImageUrl;
    document.getElementById('mainImage').alt = product.ten_san_pham;

    // Thumbnails
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    if (product.images && product.images.length > 0) {
        thumbnailContainer.innerHTML = product.images.map((img, index) => `
            <button onclick="changeMainImage('${getProductImageUrl(img.duong_dan_anh)}', this)" 
                    class="thumbnail-item flex-shrink-0 w-20 h-20 border-2 ${index === 0 ? 'border-red-600' : 'border-gray-200'} rounded-lg overflow-hidden">
                <img src="${getProductImageUrl(img.duong_dan_anh)}" alt="Thumbnail ${index + 1}" 
                     class="w-full h-full object-contain"
                     onerror="this.onerror=null; this.src=PLACEHOLDER_IMAGE">
            </button>
        `).join('');
    } else {
        thumbnailContainer.innerHTML = `
            <div class="thumbnail-item flex-shrink-0 w-20 h-20 border-2 border-red-600 rounded-lg overflow-hidden">
                <img src="${mainImageUrl}" alt="Thumbnail" class="w-full h-full object-contain">
            </div>
        `;
    }
    
    // Product info
    document.getElementById('productBrand').textContent = product.thuong_hieu || 'Không rõ';
    document.getElementById('productName').textContent = product.ten_san_pham;
    
    // Price
    const price = product.gia;
    const oldPrice = price * 1.15;
    const savedAmount = oldPrice - price;
    
    document.getElementById('productPrice').textContent = formatPrice(price);
    document.getElementById('oldPrice').textContent = formatPrice(oldPrice);
    document.getElementById('savedAmount').textContent = formatPrice(savedAmount);
    
    // Stock
    const stockInfo = document.getElementById('stockInfo');
    const stockBadge = document.getElementById('stockBadge');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.querySelector('button[onclick="buyNow()"]');
    
    if (product.so_luong > 0) {
        stockInfo.textContent = `Còn ${product.so_luong} sản phẩm`;
        stockBadge.textContent = 'Còn hàng';
        stockBadge.className = 'bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold';
        addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
    } else {
        stockInfo.textContent = 'Hết hàng';
        stockInfo.className = 'text-red-600 text-sm font-bold';
        stockBadge.textContent = '🚫 Hết hàng';
        stockBadge.className = 'bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold';
        
        // Vô hiệu hóa nút thêm vào giỏ
        addToCartBtn.disabled = true;
        addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
        addToCartBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        addToCartBtn.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
            Sản phẩm hết hàng
        `;
        
        // Vô hiệu hóa nút mua ngay
        if (buyNowBtn) {
            buyNowBtn.disabled = true;
            buyNowBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
            buyNowBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
            buyNowBtn.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Tạm hết hàng
            `;
        }
        
        // Vô hiệu hóa các nút số lượng
        const quantityInput = document.getElementById('quantity');
        const decreaseBtn = document.querySelector('button[onclick="decreaseQuantity()"]');
        const increaseBtn = document.querySelector('button[onclick="increaseQuantity()"]');
        
        if (quantityInput) quantityInput.disabled = true;
        if (decreaseBtn) decreaseBtn.disabled = true;
        if (increaseBtn) increaseBtn.disabled = true;
    }
    
    // Description - Chi tiết hơn
    displayProductDescription(product);
    
    // Specs - Chi tiết hơn
    displayProductSpecs(product);
    
    // Reviews
    displayReviews(product.reviews || []);
}

// Hiển thị mô tả sản phẩm chi tiết
function displayProductDescription(product) {
    const descContainer = document.getElementById('productDescription');
    
    // Tạo mô tả chi tiết dựa trên thông tin sản phẩm
    let descriptionHTML = '';
    
    if (product.mo_ta) {
        descriptionHTML += `
            <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Giới thiệu sản phẩm
                </h3>
                <p class="text-gray-700 leading-relaxed">${product.mo_ta}</p>
            </div>
        `;
    }
    
    // Thêm điểm nổi bật
    descriptionHTML += `
        <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                Điểm nổi bật
            </h3>
            <ul class="space-y-2">
                <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Sản phẩm chính hãng ${product.thuong_hieu || ''} - Bảo hành 12 tháng</span>
                </li>
                <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Thiết kế hiện đại, sang trọng phù hợp mọi phong cách</span>
                </li>
                <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Hiệu năng mạnh mẽ, đáp ứng mọi nhu cầu sử dụng</span>
                </li>
                <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">Hỗ trợ kỹ thuật 24/7, đội ngũ tư vấn chuyên nghiệp</span>
                </li></ul>
        </div>
    `;
    
    // Thêm cam kết
    descriptionHTML += `
        <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 class="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                Cam kết từ Yến Nhi Tech
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="flex items-center gap-2 text-sm text-blue-700">
                    <span class="text-lg">✅</span>
                    <span>100% sản phẩm chính hãng</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-blue-700">
                    <span class="text-lg">🚚</span>
                    <span>Giao hàng toàn quốc</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-blue-700">
                    <span class="text-lg">🚚</span>
                    <span>Giao hàng toàn quốc</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-blue-700">
                    <span class="text-lg">🚚?</span>
                    <span>Bảo hành tận nơi</span>
                </div>
            </div>
        </div>
    `;
    
    descContainer.innerHTML = descriptionHTML;
}

// Hiển thị thông số kỹ thuật chi tiết
function displayProductSpecs(product) {
    const specsContainer = document.getElementById('productSpecs');
    
    // Tạo thông số kỹ thuật dựa trên danh mục sản phẩm
    let specsHTML = `
        <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full">
                <tbody>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700 w-1/3">Thương hiệu</td>
                        <td class="px-4 py-3 text-gray-900">${product.thuong_hieu || 'Đang cập nhật'}</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Danh mục</td>
                        <td class="px-4 py-3 text-gray-900">${product.ten_danh_muc || 'Đang cập nhật'}</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Mã sản phẩm</td>
                        <td class="px-4 py-3 text-gray-900">SP${String(product.ma_san_pham).padStart(6, '0')}</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Tình trạng</td>
                        <td class="px-4 py-3">
                            <span class="${product.so_luong > 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                ${product.so_luong > 0 ? 'Còn hàng (' + product.so_luong + ' sản phẩm)' : 'Hết hàng'}
                            </span>
                        </td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Bảo hành</td>
                        <td class="px-4 py-3 text-gray-900">12 tháng chính hãng tại trung tâm bảo hành</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Xuất xứ</td>
                        <td class="px-4 py-3 text-gray-900">Chính hãng - Nhập khẩu</td>
                    </tr>
    `;
    
    // Thêm thông số theo danh mục
    if (product.ten_danh_muc) {
        const category = product.ten_danh_muc.toLowerCase();
        
        if (category.includes('điện thoại') || category.includes('phone')) {
            specsHTML += `
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Màn hình</td>
                        <td class="px-4 py-3 text-gray-900">AMOLED, 6.7 inch, 120Hz</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Chip xử lý</td>
                        <td class="px-4 py-3 text-gray-900">Chip cao cấp thế hệ mới</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">RAM</td>
                        <td class="px-4 py-3 text-gray-900">8GB / 12GB</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Bộ nhớ trong</td>
                        <td class="px-4 py-3 text-gray-900">128GB / 256GB / 512GB</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Camera sau</td>
                        <td class="px-4 py-3 text-gray-900">48MP + 12MP + 12MP</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Camera trước</td>
                        <td class="px-4 py-3 text-gray-900">12MP</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Pin</td>
                        <td class="px-4 py-3 text-gray-900">4500mAh, sạc nhanh 65W</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Hệ điều hành</td>
                        <td class="px-4 py-3 text-gray-900">${product.thuong_hieu === 'Apple' ? 'iOS' : 'Android'}</td>
                    </tr>
            `;
        } else if (category.includes('laptop')) {
            specsHTML += `
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Màn hình</td>
                        <td class="px-4 py-3 text-gray-900">14 inch / 15.6 inch, Full HD / 2K</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">CPU</td>
                        <td class="px-4 py-3 text-gray-900">Intel Core i5/i7 hoặc AMD Ryzen 5/7</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">RAM</td>
                        <td class="px-4 py-3 text-gray-900">8GB / 16GB / 32GB DDR5</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Ổ cứng</td>
                        <td class="px-4 py-3 text-gray-900">SSD 256GB / 512GB / 1TB NVMe</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Card đồ họa</td>
                        <td class="px-4 py-3 text-gray-900">Intel Iris Xe / NVIDIA RTX</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Pin</td>
                        <td class="px-4 py-3 text-gray-900">Lên đến 10 giờ sử dụng</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Hệ điều hành</td>
                        <td class="px-4 py-3 text-gray-900">${product.thuong_hieu === 'Apple' ? 'macOS' : 'Windows 11'}</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Trọng lượng</td>
                        <td class="px-4 py-3 text-gray-900">1.4kg - 1.8kg</td>
                    </tr>
            `;
        } else if (category.includes('phụ kiện') || category.includes('tai nghe')) {
            specsHTML += `
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Loại kết nối</td>
                        <td class="px-4 py-3 text-gray-900">Bluetooth 5.3 / Có dây</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Thời lượng pin</td>
                        <td class="px-4 py-3 text-gray-900">Lên đến 30 giờ (với hộp sạc)</td>
                    </tr>
                    <tr class="border-b border-gray-200 bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Chống nước</td>
                        <td class="px-4 py-3 text-gray-900">IPX4 / IPX5</td>
                    </tr>
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3 font-semibold text-gray-700">Tính năng</td>
                        <td class="px-4 py-3 text-gray-900">Chống ồn chủ động (ANC), Xuyên âm</td>
                    </tr>
            `;
        }
    }
    
    specsHTML += `
                    <tr class="bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-700">Phụ kiện đi kèm</td>
                        <td class="px-4 py-3 text-gray-900">Hộp, sách hướng dẫn, cáp sạc, phụ kiện theo máy</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p class="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Thông số kỹ thuật có thể thay đổi theo từng phiên bản sản phẩm. 
                Vui lòng liên hệ hotline <strong class="text-red-600">1900.5301</strong> để được tư vấn chi tiết.
            </p>
        </div>
    `;
    
    specsContainer.innerHTML = specsHTML;
}


// Display reviews
function displayReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    const reviewCount = reviews.length;
    
    document.getElementById('reviewCount').textContent = `${reviewCount} đánh giá`;
    document.getElementById('tabReviewCount').textContent = reviewCount;
    document.getElementById('totalReviewsDisplay').textContent = reviewCount;
    
    // Kiểm tra token còn hợp lệ không
    const token = localStorage.getItem('token');
    let isValidLogin = false;
    
    if (token) {
        try {
            // Decode JWT để kiểm tra expiry
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            isValidLogin = Date.now() < expiry;
            
            if (!isValidLogin) {
                // Token hết hạn, xóa đi
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (e) {
            // Token không hợp lệ
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
    
    // Hien thi form danh gia hoac nut dang nhap
    if (isValidLogin) {
        document.getElementById('reviewFormContainer').classList.remove('hidden');
        document.getElementById('loginToReview').classList.add('hidden');
        // Mặc định chọn 5 sao
        selectStar(5);
    } else {
        document.getElementById('reviewFormContainer').classList.add('hidden');
        document.getElementById('loginToReview').classList.remove('hidden');
    }
    
    // Tính điểm trung bình và phân bố sao
    let avgRating = 0;
    const ratingCounts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    
    if (reviewCount > 0) {
        reviews.forEach(r => {
            avgRating += r.so_sao;
            ratingCounts[r.so_sao] = (ratingCounts[r.so_sao] || 0) + 1;
        });
        avgRating = avgRating / reviewCount;
    }
    
    // Hiển thị điểm trung bình
    document.getElementById('avgRatingDisplay').textContent = avgRating.toFixed(1);
    document.getElementById('ratingText').textContent = avgRating.toFixed(1);
    
    // Hiển thị sao trung bình
    document.getElementById('avgStarsDisplay').innerHTML = generateStars(Math.round(avgRating));
    
    // Hiển thị phân bố sao
    const distributionHTML = [5, 4, 3, 2, 1].map(star => {
        const count = ratingCounts[star] || 0;
        const percent = reviewCount > 0 ? (count / reviewCount * 100) : 0;
        return `
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-600 w-12">${star} sao</span>
                <div class="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="bg-yellow-400 h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                </div>
                <span class="text-sm text-gray-500 w-16 text-right">${count} (${percent.toFixed(0)}%)</span>
            </div>
        `;
    }).join('');
    document.getElementById('ratingDistribution').innerHTML = distributionHTML;
    
    // Hiển thị danh sách đánh giá
    if (reviewCount === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <p>Chua c� d�nh gi� n�o cho s?n ph?m n�y</p>
                <p class="text-sm mt-2">H�y l� ngu?i d?u ti�n d�nh gi�!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <h3 class="font-bold text-lg text-gray-900 mb-4">🚚 T?t c? d�nh gi� (${reviewCount})</h3>
        <div class="space-y-4">
            ${reviews.map(review => `
                <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="text-white font-bold text-lg">${(review.ten_dang_nhap || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                <div>
                                    <span class="font-semibold text-gray-900">${review.ten_dang_nhap || 'Ngu?i d�ng'}</span>
                                    <span class="text-green-600 text-xs ml-2 bg-green-100 px-2 py-0.5 rounded-full">? �� mua h�ng</span>
                                </div>
                                <span class="text-gray-400 text-sm">${formatDate(review.ngay_tao)}</span>
                            </div>
                            <div class="flex text-yellow-400 mb-2">
                                ${generateStars(review.so_sao)}
                            </div>
                            <p class="text-gray-700">${review.noi_dung}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Chọn số sao khi viết đánh giá
let selectedStarRating = 5;
function selectStar(rating) {
    selectedStarRating = rating;
    document.getElementById('selectedRating').value = rating;
    const buttons = document.querySelectorAll('#starSelector .star-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.classList.remove('text-gray-300');
            btn.classList.add('text-yellow-400');
        } else {
            btn.classList.remove('text-yellow-400');
            btn.classList.add('text-gray-300');
        }
    });
}

// Gửi đánh giá
async function submitReview(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Phi�n dang nh?p d� h?t h?n. Vui l�ng dang nh?p l?i!');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }
    
    const content = document.getElementById('reviewContent').value.trim();
    if (!content) {
        alert('Vui l�ng nh?p n?i dung d�nh gi�!');
        return;
    }
    
    if (content.length < 10) {
        alert('N?i dung d�nh gi� ph?i c� �t nh?t 10 k� t?!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/products/${currentProduct.ma_san_pham}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                so_sao: selectedStarRating,
                noi_dung: content
            })
        });
        
        const result = await response.json();
        
        if (response.status === 401) {
            // Token het han hoac khong hop le
            alert('Phi�n dang nh?p d� h?t h?n. Vui l�ng dang nh?p l?i!');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        if (result.success) {
            alert('��nh gi� c?a b?n d� du?c g?i th�nh c�ng!');
            document.getElementById('reviewContent').value = '';
            selectStar(5);
            // Reload product de cap nhat danh gia
            loadProductDetail(currentProduct.ma_san_pham);
        } else {
            alert(result.message || 'C� l?i x?y ra khi g?i d�nh gi�!');
        }
    } catch (error) {
        console.error('L?i g?i d�nh gi�:', error);
        alert('Kh�ng th? k?t n?i d?n server!');
    }
}

// Generate star HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
        } else {
            stars += '<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
        }
    }
    return stars;
}

// Load related products - Lấy sản phẩm tương tự từ backend (khớp thương hiệu, giá & loại sản phẩm)
async function loadRelatedProducts(categoryId) {
    try {
        const response = await fetch(`${API_URL}/recommendations/similar/${currentProduct.ma_san_pham}`);
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            displayRelatedProducts(result.data, categoryId);
        } else {
            // Fallback: Lấy tất cả sản phẩm và lọc tại client
            const fallbackResponse = await fetch(`${API_URL}/products`);
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.success) {
                let relatedProducts = fallbackResult.data
                    .filter(p => p.ma_san_pham !== currentProduct.ma_san_pham)
                    .sort((a, b) => {
                        if (a.ma_danh_muc === categoryId && b.ma_danh_muc !== categoryId) return -1;
                        if (a.ma_danh_muc !== categoryId && b.ma_danh_muc === categoryId) return 1;
                        return 0;
                    });
                displayRelatedProducts(relatedProducts, categoryId);
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm liên quan:', error);
        // Hiển thị sản phẩm mẫu nếu không kết nối được API
        displaySampleRelatedProducts();
    }
}

// Hiển thị sản phẩm mẫu khi không có dữ liệu từ API
function displaySampleRelatedProducts() {
    const container = document.getElementById('relatedProducts');
    const sampleProducts = [
        { id: 1, name: 'iPhone 15 Pro Max', price: 33990000, brand: 'Apple', image: PLACEHOLDER_IMAGE },
        { id: 2, name: 'Samsung Galaxy S24 Ultra', price: 29990000, brand: 'Samsung', image: PLACEHOLDER_IMAGE },
        { id: 3, name: 'MacBook Air M3 2024', price: 28990000, brand: 'Apple', image: PLACEHOLDER_IMAGE },
        { id: 4, name: 'Dell XPS 13 Plus', price: 25990000, brand: 'Dell', image: PLACEHOLDER_IMAGE },
        { id: 5, name: 'Tai nghe AirPods Pro 2', price: 5990000, brand: 'Apple', image: PLACEHOLDER_IMAGE },
    ];
    
    let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">';
    html += sampleProducts.map(product => createRelatedProductCard(product.id, product.name, product.price, product.brand, product.image)).join('');
    html += '</div>';
    html += createViewMoreButton();
    
    container.innerHTML = html;
}

// Display related products với nút xem thêm
function displayRelatedProducts(products, categoryId) {
    const container = document.getElementById('relatedProducts');
    
    if (products.length === 0) {
        displaySampleRelatedProducts();
        return;
    }
    
    // Hiển thị tối đa 5 sản phẩm đầu tiên
    const displayProducts = products.slice(0, 5);
    const hasMore = products.length > 5;
    
    let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">';
    html += displayProducts.map(product => `
        <a href="product-detail.html?id=${product.ma_san_pham}" class="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 group">
            <!-- Badge giảm giá -->
            <div class="relative">
                <div class="absolute top-2 left-2 z-10">
                    <span class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-15%</span>
                </div>
                <div class="p-4 bg-gradient-to-b from-gray-50 to-white">
                    <img src="${getProductImageUrl(product.anh_chinh)}" 
                         alt="${product.ten_san_pham}" 
                         class="w-full h-36 object-contain group-hover:scale-110 transition-transform duration-300"
                         onerror="this.onerror=null; this.src=PLACEHOLDER_IMAGE">
                </div>
            </div>
            <div class="p-3">
                <!-- Thương hiệu -->
                <span class="text-xs text-blue-600 font-medium">${product.thuong_hieu || 'Chính hãng'}</span>
                <!-- Tên sản phẩm -->
                <h3 class="font-semibold text-gray-900 text-sm mt-1 line-clamp-2 group-hover:text-red-600 transition min-h-[40px]">${product.ten_san_pham}</h3>
                <!-- Giá -->
                <div class="mt-2">
                    <p class="text-red-600 font-bold text-base">${formatPrice(product.gia)}</p>
                    <p class="text-gray-400 text-xs line-through">${formatPrice(product.gia * 1.15)}</p>
                </div>
                <!-- Rating giả -->
                <div class="flex items-center gap-1 mt-2">
                    <div class="flex text-yellow-400">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    </div>
                    <span class="text-xs text-gray-500">(${Math.floor(Math.random() * 50) + 10})</span>
                </div>
            </div>
        </a>
    `).join('');
    html += '</div>';
    
    // Thêm nút xem thêm
    html += createViewMoreButton(categoryId);
    
    container.innerHTML = html;
}

// Tạo card sản phẩm liên quan
function createRelatedProductCard(id, name, price, brand, image) {
    return `
        <a href="product-detail.html?id=${id}" class="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 group">
            <div class="relative">
                <div class="absolute top-2 left-2 z-10">
                    <span class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-15%</span>
                </div>
                <div class="p-4 bg-gradient-to-b from-gray-50 to-white">
                    <img src="${image}" 
                         alt="${name}" 
                         class="w-full h-36 object-contain group-hover:scale-110 transition-transform duration-300">
                </div>
            </div>
            <div class="p-3">
                <span class="text-xs text-blue-600 font-medium">${brand}</span>
                <h3 class="font-semibold text-gray-900 text-sm mt-1 line-clamp-2 group-hover:text-red-600 transition min-h-[40px]">${name}</h3>
                <div class="mt-2">
                    <p class="text-red-600 font-bold text-base">${formatPrice(price)}</p>
                    <p class="text-gray-400 text-xs line-through">${formatPrice(price * 1.15)}</p>
                </div>
                <div class="flex items-center gap-1 mt-2">
                    <div class="flex text-yellow-400">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    </div>
                    <span class="text-xs text-gray-500">(${Math.floor(Math.random() * 50) + 10})</span>
                </div>
            </div>
        </a>
    `;
}

// Tạo nút xem thêm
function createViewMoreButton(categoryId) {
    return `
        <div class="flex justify-center mt-8">
            <a href="products.html${categoryId ? '?category=' + categoryId : ''}" 
               class="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <span>Xem thêm sản phẩm</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                </svg>
            </a>
        </div>
    `;
}

// Default placeholder image
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23f3f4f6" width="300" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EKhông có ảnh%3C/text%3E%3C/svg%3E';

// Helper function to get full image URL
function getProductImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;
    // Xử lý đường dẫn từ database (có thể bắt đầu bằng / hoặc không)
    const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    return `${API_URL.replace('/api', '')}${cleanPath}`;
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Change main image
function changeMainImage(imageUrl, element) {
    document.getElementById('mainImage').src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail-item').forEach(thumb => {
        thumb.classList.remove('border-red-600');
        thumb.classList.add('border-gray-200');
    });
    element.classList.remove('border-gray-200');
    element.classList.add('border-red-600');
}

// Quantity controls
function increaseQuantity() {
    const input = document.getElementById('quantity');
    const max = currentProduct?.so_luong || 99;
    const newValue = parseInt(input.value) + 1;
    
    // Kiểm tra số lượng > 5 thì yêu cầu liên hệ hotline
    if (newValue > 5) {
        showQuantityLimitModal();
        return;
    }
    
    if (newValue <= max) {
        input.value = newValue;
        currentQuantity = newValue;
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
                <h3 class="text-xl font-bold text-gray-900 mb-2">Th�ng b�o d?t h�ng s? lu?ng l?n</h3>
                <p class="text-gray-600 mb-4">�? d?t mua s? lu?ng tr�n 5 s?n ph?m, vui l�ng li�n h? tr?c ti?p v?i c?a h�ng d? du?c h? tr? gi� t?t nh?t!</p>
                <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                    <p class="text-lg font-bold text-yellow-700">🚚 Hotline: 0335162856</p>
                    <p class="text-sm text-yellow-600 mt-1">H? tr? 8:00 - 21:30 h�ng ng�y</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeQuantityLimitModal()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                        ��ng
                    </button>
                    <a href="tel:0335162856" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center gap-2">
                        <span>🚚</span> G?i ngay
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

function decreaseQuantity() {
    const input = document.getElementById('quantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
        currentQuantity = parseInt(input.value);
    }
}

// Tab switching
function switchTab(tabName) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active', 'border-red-600', 'text-red-600');
        tab.classList.add('border-transparent');
    });
    
    // Show selected content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Activate selected tab
    const activeTab = document.getElementById(`tab-${tabName}`);
    activeTab.classList.add('active', 'border-red-600', 'text-red-600');
    activeTab.classList.remove('border-transparent');
}


// Hien thi yeu cau dang nhap
function showLoginRequired() {
    // Xoa modal cu neu co
    const existingModal = document.getElementById('loginRequiredModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
    modal.id = 'loginRequiredModal';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onclick="event.stopPropagation()">
            <div class="text-center">
                <svg class="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Y�u c?u dang nh?p</h3>
                <p class="text-gray-600 mb-6">Vui l�ng dang nh?p d? th�m s?n ph?m v�o gi? h�ng</p>
                <div class="flex gap-3">
                    <button id="closeLoginModalBtn" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                        �? sau
                    </button>
                    <a href="login.html" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center">
                        �ang nh?p
                    </a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Them event listener cho nut dong
    document.getElementById('closeLoginModalBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // Dong modal khi click ben ngoai
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Dong modal dang nhap (giu lai de tuong thich)
function closeLoginModal() {
    const modal = document.getElementById('loginRequiredModal');
    if (modal) modal.remove();
}

// Chuyen den trang dang nhap (giu lai de tuong thich)
function goToLoginPage() {
    window.location.href = 'login.html';
}

// Add to cart from detail page
function addToCartFromDetail() {
    // Kiem tra dang nhap
    if (!isLoggedIn()) {
        showLoginRequired();
        return;
    }
    
    if (!currentProduct) return;
    
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    // Kiểm tra số lượng > 5 thì yêu cầu liên hệ hotline
    if (quantity > 5) {
        showQuantityLimitModal();
        return;
    }
    
    // Kiểm tra giá không âm
    if (currentProduct.gia < 0) {
        showNotification('Lỗi: Giá sản phẩm không hợp lệ!');
        return;
    }
    
    const cartKey = getCartKey();
    
    // Get cart from localStorage
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.ma_san_pham === currentProduct.ma_san_pham);
    
    if (existingItem) {
        const newQuantity = (parseInt(existingItem.so_luong) || 0) + quantity;
        
        // Kiểm tra tổng số lượng > 5
        if (newQuantity > 5) {
            showQuantityLimitModal();
            return;
        }
        
        existingItem.so_luong = newQuantity;
    } else {
        cart.push({
            ma_san_pham: currentProduct.ma_san_pham,
            ten_san_pham: currentProduct.ten_san_pham,
            gia: Math.max(0, currentProduct.gia), // Đảm bảo giá không âm
            anh_chinh: getProductImageUrl(currentProduct.images?.[0]?.duong_dan_anh),
            so_luong: parseInt(quantity) || 1,
            trong_luong_kg: parseFloat(currentProduct.trong_luong_kg) || 0.5
        });
    }
    
    // Save to localStorage
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    // TRACKING: Ghi nhận hành vi THÊM VÀO GIỎ sản phẩm
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        try {
            const userId = JSON.parse(userStr).ma_tai_khoan;
            if (userId && currentProduct) {
                fetch(`${API_URL}/recommendations/track`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ 
                        userId: userId, 
                        productId: currentProduct.ma_san_pham, 
                        actionType: 'cart', 
                        actionValue: 2 
                    })
                }).catch(e => console.error('Error tracking cart interaction:', e));
            }
        } catch(e) {}
    }
    
    // Show notification
    showNotification(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
}

// Buy now
function buyNow() {
    // Kiem tra dang nhap truoc
    if (!isLoggedIn()) {
        showLoginRequired();
        return;
    }
    addToCartFromDetail();
    window.location.href = 'cart.html';
}

// Add to wishlist
function addToWishlist() {
    showNotification('�� th�m v�o danh s�ch y�u th�ch!');
}

// Share product
function shareProduct() {
    if (navigator.share) {
        navigator.share({
            title: currentProduct?.ten_san_pham,
            url: window.location.href
        });
    } else {
        // Copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('�� sao ch�p link s?n ph?m!');
    }
}

// Image modal
function openImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = document.getElementById('mainImage').src;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// Update cart badge
function updateCartBadge() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.so_luong) || 0), 0);
    
    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalItems || 0;
    });
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show error
function showError(message) {
    document.querySelector('main').innerHTML = `
        <div class="max-w-7xl mx-auto px-4 py-20 text-center">
            <svg class="w-24 h-24 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 class="text-2xl font-bold text-gray-700 mb-2">${message}</h2>
            <p class="text-gray-500 mb-6">Vui lòng thử lại hoặc quay về trang sản phẩm</p>
            <a href="products.html" class="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition">
                Xem tất cả sản phẩm
            </a>
        </div>
    `;
}

// Mobile menu toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// Hiển thị thông báo khi người dùng đặc biệt thích một sản phẩm (click >= 5 lần)
function showInterestNotification(productName) {
    let container = document.getElementById('interest-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'interest-toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            max-width: 420px;
            width: calc(100% - 48px);
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-left: 5px solid #ef4444;
        border-radius: 16px;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 20px rgba(239, 68, 68, 0.15);
        padding: 18px 24px 18px 20px;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        transform: translateY(30px) scale(0.95);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
    `;

    toast.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-radius: 50%;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: inset 0 2px 4px rgba(239, 68, 68, 0.05);
        ">
            <svg style="width: 24px; height: 24px; color: #ef4444;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
            </svg>
        </div>
        <div style="flex-grow: 1;">
            <h4 style="
                margin: 0 0 4px 0;
                color: #1e293b;
                font-weight: 700;
                font-size: 15px;
                letter-spacing: -0.2px;
            ">Hệ thống ghi nhận sở thích</h4>
            <p style="
                margin: 0;
                color: #64748b;
                font-size: 13px;
                line-height: 1.5;
            ">Bạn đang rất quan tâm <b>${productName}</b>! Chúng tôi đã tối ưu hóa gợi ý sản phẩm phù hợp riêng cho bạn.</p>
        </div>
        <button style="
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 2px;
            margin-top: -2px;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        " onmouseover="this.style.color='#64748b'" onmouseout="this.style.color='#94a3b8'" onclick="this.parentElement.style.opacity='0'; this.parentElement.style.transform='translateY(-20px) scale(0.95)'; setTimeout(()=>this.parentElement.remove(), 500);">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    // Kích hoạt animation vào
    setTimeout(() => {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.opacity = '1';
    }, 50);

    // Tự động ẩn sau 6 giây
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px) scale(0.95)';
        setTimeout(() => toast.remove(), 500);
    }, 6000);
}

// Ghi nhận hành vi XEM > 30s (Lượt Xem >30s)
let view30sTimer = setTimeout(async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (token && userStr && productId) {
        try {
            const userId = JSON.parse(userStr).ma_tai_khoan;
            if (userId) {
                await fetch(`${API_URL}/recommendations/track`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ 
                        userId: userId, 
                        productId: Number(productId), 
                        actionType: 'view_30s', 
                        actionValue: 1 
                    })
                }).then(() => {
                    console.log(`👁️ [Recommendation] Tracked view >30s for Product ${productId}`);
                }).catch(e => {});
            }
        } catch(e) {}
    }
}, 30000); // 30s

// Hủy timer nếu người dùng rời trang trước 30s
window.addEventListener('beforeunload', () => {
    clearTimeout(view30sTimer);
});

// Ghi nhận hành vi CLICK vào sản phẩm bằng cách lắng nghe click toàn cục trên các liên kết chi tiết sản phẩm (sản phẩm liên quan)
document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href && link.href.includes('product-detail.html')) {
        try {
            const url = new URL(link.href);
            const productId = url.searchParams.get('id');
            if (productId) {
                const token = localStorage.getItem('token');
                const userStr = localStorage.getItem('user');
                if (token && userStr) {
                    const userId = JSON.parse(userStr).ma_tai_khoan;
                    if (userId) {
                        fetch(`${API_URL}/recommendations/track`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                userId: userId,
                                productId: Number(productId),
                                actionType: 'click',
                                actionValue: 1
                            })
                        }).catch(err => console.error('Error tracking click:', err));
                    }
                }
            }
        } catch (err) {
            console.error('Error parsing link for click tracking:', err);
        }
    }
});
