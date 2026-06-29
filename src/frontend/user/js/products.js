// API Configuration
const API_URL = 'http://localhost:3000/api';

// Default placeholder image
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23f3f4f6" width="300" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EKh%C3%B4ng%20c%C3%B3%20%E1%BA%A3nh%3C/text%3E%3C/svg%3E';

// Category mapping - map URL slug to database category name
const CATEGORY_MAP = {
    'laptop': 'Laptop',
    'pc-gaming': 'PC Gaming',
    'monitor': 'Màn hình',
    'man-hinh': 'Màn hình',
    'cpu-vga': 'CPU, VGA',
    'case-nguon': 'Case, Nguồn',
    'chuot-ban-phim': 'Chuột, Bàn phím',
    'tai-nghe': 'Tai nghe',
    'op-lung': 'Ốp lưng',
    'phone': 'Điện thoại',
    'dien-thoai': 'Điện thoại',
    'appliances': 'Điện máy',
    'dien-may': 'Điện máy',
    'accessories': 'Phụ kiện',
    'phu-kien': 'Phụ kiện',
    'apple': 'Apple',
    'samsung': 'Samsung',
    'xiaomi': 'Xiaomi'
};

// Get category name from slug (using static + dynamic map)
function getCategoryName(slug) {
    // First try static map
    if (CATEGORY_MAP[slug]) {
        return CATEGORY_MAP[slug];
    }
    // Then try dynamic map from categories.js
    if (window.dynamicCategoryMap && window.dynamicCategoryMap[slug]) {
        return window.dynamicCategoryMap[slug];
    }
    // Return original slug as fallback
    return slug;
}

// State management
let allProducts = [];
let recommendedProducts = [];
let filteredProducts = [];
let currentCategory = null;
let currentBrand = null;
let currentPriceRange = 'all'; // Thêm biến lưu trữ bộ lọc giá hiện tại
let currentPage = 1; // Trang hiện tại
const itemsPerPage = 6; // Số sản phẩm mỗi trang

// Load products when page loads
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const brand = urlParams.get('brand');
    const search = urlParams.get('search');
    
    // Map category slug to actual category name
    if (category) {
        currentCategory = getCategoryName(category);
        // Update page title based on category
        updatePageTitle(currentCategory);
    }
    if (brand) currentBrand = brand;
    
    loadProducts(search);
    setupEventListeners();
    
    // Mặc định luôn vào tab Sản phẩm
    switchTab('san-pham');
});

// Update page title based on selected category
function updatePageTitle(categoryName) {
    const titleElement = document.querySelector('h1.text-2xl, h2.text-2xl');
    if (titleElement) {
        titleElement.textContent = `Sản phẩm: ${categoryName}`;
    }
    // Update document title
    document.title = `${categoryName} - Yến Nhi Tech`;
}

// Cập nhật số lượng sản phẩm theo danh mục
function updateCategoryCounts() {
    // Đếm số sản phẩm theo từng danh mục
    const categoryCounts = {};
    allProducts.forEach(product => {
        const category = product.ten_danh_muc || 'Khác';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Cập nhật số liệu trên giao diện
    const categoryCountElements = document.querySelectorAll('.category-count');
    categoryCountElements.forEach(el => {
        const categoryName = el.getAttribute('data-category');
        if (categoryName === 'all') {
            el.textContent = `(${allProducts.length})`;
        } else if (categoryCounts[categoryName] !== undefined) {
            el.textContent = `(${categoryCounts[categoryName]})`;
        } else {
            el.textContent = '(0)';
        }
    });
    
    // Debug: console.log('📊 Category counts:', categoryCounts);
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // Mobile search
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleMobileSearch();
            }
        });
    }

    // Price filter checkboxes
    const priceCheckboxes = document.querySelectorAll('.price-filter-checkbox');
    priceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                // Uncheck all other checkboxes
                priceCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
                
                // Filter products
                filterByPrice(this.value);
            } else {
                // If unchecked, show all (or check "Tất cả")
                const allCheckbox = document.querySelector('.price-filter-checkbox[value="all"]');
                if (allCheckbox) {
                    allCheckbox.checked = true;
                    filterByPrice("all");
                }
            }
        });
    });
}

// Filter products by price range
function filterByPrice(range) {
    currentPage = 1; // Reset về trang 1 khi lọc
    currentPriceRange = range; // Lưu trạng thái bộ lọc giá
    
    // Áp dụng cả bộ lọc danh mục và giá
    applyAllFilters();
}

// Áp dụng tất cả bộ lọc (danh mục + giá)
function applyAllFilters() {
    // Bắt đầu từ tất cả sản phẩm
    let result = [...allProducts];
    
    // Lọc theo danh mục nếu có
    const activeCategory = document.querySelector('.category-btn.active span:not(.text-2xl):not(.category-count)');
    let categoryName = null;
    if (activeCategory && activeCategory.textContent !== 'Tất cả') {
        categoryName = activeCategory.textContent;
        result = result.filter(product => 
            product.ten_danh_muc && product.ten_danh_muc.toLowerCase().includes(categoryName.toLowerCase())
        );
    }
    
    // Lọc theo giá nếu có
    let minPrice = null;
    let maxPrice = null;
    if (currentPriceRange && currentPriceRange !== 'all') {
        [minPrice, maxPrice] = currentPriceRange.split('-').map(Number);
        result = result.filter(product => {
            const price = Number(product.gia);
            return price >= minPrice && price <= maxPrice;
        });
    }

    // Lọc sản phẩm gợi ý tương tự như sản phẩm thường
    let filteredRecs = [...recommendedProducts];
    if (categoryName) {
        filteredRecs = filteredRecs.filter(product => 
            product.ten_danh_muc && product.ten_danh_muc.toLowerCase().includes(categoryName.toLowerCase())
        );
    }
    if (minPrice !== null && maxPrice !== null) {
        filteredRecs = filteredRecs.filter(product => {
            const price = Number(product.gia);
            return price >= minPrice && price <= maxPrice;
        });
    }

    // Gộp sản phẩm gợi ý và sản phẩm thường, tránh trùng lặp
    const seenIds = new Set();
    const combined = [];

    // Ưu tiên đưa sản phẩm gợi ý đã được lọc vào trước
    filteredRecs.forEach(product => {
        const id = product.ma_san_pham;
        if (id && !seenIds.has(id)) {
            seenIds.add(id);
            combined.push(product);
        }
    });

    // Thêm các sản phẩm thường còn lại
    result.forEach(product => {
        const id = product.ma_san_pham;
        if (id && !seenIds.has(id)) {
            if (product.isRecommended) {
                delete product.isRecommended;
            }
            seenIds.add(id);
            combined.push(product);
        }
    });
    
    filteredProducts = combined;
    
    // Áp dụng sắp xếp hiện tại nếu có
    const sortSelect = document.getElementById('sortSelect2');
    if (sortSelect && sortSelect.value !== 'default') {
        handleSort(sortSelect.value);
    } else {
        handleSort('default');
    }
}

// Handle sorting
function handleSort(sortType) {
    // Đồng bộ giá trị giữa 2 select
    const s1 = document.getElementById('sortSelect');
    const s2 = document.getElementById('sortSelect2');
    if (s1) s1.value = sortType;
    if (s2) s2.value = sortType;

    switch (sortType) {
        case 'price_asc':
            filteredProducts.sort((a, b) => Number(a.gia) - Number(b.gia));
            break;
        case 'price_desc':
            filteredProducts.sort((a, b) => Number(b.gia) - Number(a.gia));
            break;
        case 'newest':
            filteredProducts.sort((a, b) => b.ma_san_pham - a.ma_san_pham);
            break;
        default:
            // Sắp xếp mặc định: đưa sản phẩm gợi ý lên đầu, sau đó sắp xếp sản phẩm thường theo ma_san_pham giảm dần
            filteredProducts.sort((a, b) => {
                if (a.isRecommended && !b.isRecommended) return -1;
                if (!a.isRecommended && b.isRecommended) return 1;
                if (a.isRecommended && b.isRecommended) {
                    // Giữ nguyên thứ tự gợi ý ban đầu từ API
                    const idxA = recommendedProducts.findIndex(p => p.ma_san_pham === a.ma_san_pham);
                    const idxB = recommendedProducts.findIndex(p => p.ma_san_pham === b.ma_san_pham);
                    return idxA - idxB;
                }
                return b.ma_san_pham - a.ma_san_pham;
            });
            break;
    }
    
    currentPage = 1; // Reset về trang 1 khi sắp xếp
    displayProducts(filteredProducts);
    updateResultCount(filteredProducts.length);
}

// Filter products by category
function filterByCategory(categoryName) {
    // Cập nhật trạng thái active cho các nút
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        const span = btn.querySelector('span:not(.text-2xl):not(.category-count)');
        if (!span) return;
        const isMatch = (categoryName === 'all' && span.textContent === 'Tất cả') || 
                        (span.textContent === categoryName);
        
        if (isMatch) {
            btn.classList.add('active', 'bg-red-50', 'text-red-600', 'border-red-600');
            btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        } else {
            btn.classList.remove('active', 'bg-red-50', 'text-red-600', 'border-red-600');
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        }
    });

    if (categoryName === 'all') {
        currentCategory = null;
    } else {
        currentCategory = categoryName;
    }

    updatePageTitle(currentCategory || 'Tất cả sản phẩm');
    loadProducts();
}

// Load products from API
async function loadProducts(searchTerm = null) {
    try {
        showLoading();
        
        let url = `${API_URL}/products`;
        const params = new URLSearchParams();
        
        if (currentCategory) {
            params.append('category', currentCategory);
        }
        if (currentBrand) {
            params.append('brand', currentBrand);
        }
        if (searchTerm) {
            params.append('search', searchTerm);
            // Update search input value
            const searchInput = document.getElementById('searchInput');
            if (searchInput && !sessionStorage.getItem('uploadedImage')) searchInput.value = searchTerm;
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allProducts = result.data;
            filteredProducts = result.data;
            itemsToShow = 6; // Reset số lượng hiển thị khi tải mới
            // Ghi nhận hành vi tìm kiếm cho cá nhân hóa gợi ý
            if (searchTerm && result.data && result.data.length > 0) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        const userId = user.ma_tai_khoan;
                        if (userId) {
                            // Chỉ lấy tối đa 3 sản phẩm đầu tiên để ghi nhận
                            const topProducts = result.data.slice(0, 3);
                            topProducts.forEach(product => {
                                fetch(`${API_URL}/recommendations/track`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({
                                        userId: userId,
                                        productId: product.ma_san_pham,
                                        actionType: 'search',
                                        actionValue: 1.5
                                    })
                                }).catch(err => console.error('Error tracking search interaction:', err));
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing user for tracking:', e);
                    }
                }
            }

            
            // Cập nhật UI cho category
            const categoryBtns = document.querySelectorAll('.category-btn');
            categoryBtns.forEach(btn => {
                const span = btn.querySelector('span:not(.text-2xl):not(.category-count)');
                if (!span) return;
                const isMatch = (!currentCategory && span.textContent === 'Tất cả') ||
                                (currentCategory && span.textContent.toLowerCase().includes(currentCategory.toLowerCase()));
                if (isMatch) {
                    btn.classList.add('active', 'bg-red-50', 'text-red-600', 'border-red-600');
                    btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
                } else {
                    btn.classList.remove('active', 'bg-red-50', 'text-red-600', 'border-red-600');
                    btn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
                }
            });

            // Áp dụng tất cả bộ lọc và sắp xếp
            applyAllFilters();
            
            // Cập nhật số lượng sản phẩm theo danh mục
            updateCategoryCounts();
            loadPersonalizedProductsOnProductPage();
        } else {
            showError('Không thể tải sản phẩm');
        }
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
        showError('Lỗi kết nối đến server. Vui lòng kiểm tra backend đang chạy.');
    } finally {
        hideLoading();
    }
}

function getCurrentUserIdForRecommendations() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return user && (user.ma_tai_khoan || user.id || user.userId);
    } catch (error) {
        return null;
    }
}

function getPersonalizedFallbackProducts(limit = 6) {
    return [...allProducts]
        .sort((a, b) => (b.ma_san_pham || 0) - (a.ma_san_pham || 0))
        .slice(0, limit);
}

function createPersonalizedProductCard(product) {
    let imageUrl = PLACEHOLDER_IMAGE;
    const productImage = product.anh_chinh || product.duong_dan_anh;
    if (productImage) {
        if (productImage.startsWith('http')) {
            imageUrl = productImage;
        } else {
            const cleanPath = productImage.startsWith('/') ? productImage : '/' + productImage;
            imageUrl = `${API_URL.replace('/api', '')}${cleanPath}`;
        }
    }

    const productId = product.ma_san_pham || product.id;
    const productName = product.ten_san_pham || product.name || 'Sản phẩm';
    const productPrice = product.gia || product.price || 0;
    const isOutOfStock = product.so_luong === 0;
    const outOfStockClass = isOutOfStock ? 'out-of-stock' : '';
    const outOfStockOverlay = isOutOfStock ? '<div class="out-of-stock-overlay">🚫 Hết hàng</div>' : '';

    const price = formatPrice(productPrice);
    const oldPriceValue = product.gia_cu || productPrice * 1.15;
    const oldPrice = formatPrice(oldPriceValue);
    const discount = Math.round(((oldPriceValue - productPrice) / oldPriceValue) * 100) || 15;
    const discountAmount = formatPrice(oldPriceValue - productPrice);
    
    const ratingValue = parseFloat(product.rating || product.diem_trung_binh || 5);
    const starString = '⭐'.repeat(Math.floor(ratingValue));

    return `
        <div class="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 relative group product-card ${outOfStockClass}">
            ${outOfStockOverlay}
            <!-- Freeship Badge -->
            <div class="absolute top-2 left-2 z-10">
                <div class="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <div class="text-center">
                        <div class="text-[10px] font-bold leading-tight">FREESHIP</div>
                        <div class="text-[8px] leading-tight">TOÀN QUỐC</div>
                    </div>
                </div>
            </div>
            
            <!-- Product Image -->
            <div class="relative p-4 bg-gray-50 ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'} overflow-hidden" ${isOutOfStock ? '' : `onclick="viewProduct(${productId})"`}>
                <img src="${imageUrl}" 
                     alt="${productName}" 
                     class="product-image w-full h-48 object-contain group-hover:scale-110 transition-transform duration-500"
                     onerror="this.onerror=null; this.src=PLACEHOLDER_IMAGE">
            </div>
            
            <!-- Product Info -->
            <div class="p-3">
                <!-- Pricing -->
                <div class="mb-2">
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-base text-gray-400 line-through price-old">${oldPrice}</span>
                        <span class="text-red-600 text-sm font-bold">-${discount}%</span>
                    </div>
                    <div class="text-2xl font-bold text-red-600 price-current">${price}</div>
                    <div class="text-sm text-green-600 font-medium">Giảm ${discountAmount}</div>
                </div>
                
                <!-- Product Name -->
                <h3 class="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer hover:text-red-600'} h-14" ${isOutOfStock ? '' : `onclick="viewProduct(${productId})"`}>
                    ${productName}
                </h3>
                
                <!-- Rating Stars -->
                <div class="flex items-center gap-1 mb-2">
                    <span class="text-sm font-bold">${starString}</span>
                    <span class="text-xs text-gray-500">(${ratingValue.toFixed(1)})</span>
                </div>
                
                <!-- Category & Brand -->
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    ${product.ten_danh_muc || product.category ? `
                    <span class="inline-block bg-blue-100 text-blue-800 text-sm px-2.5 py-1 rounded font-medium tag-label">
                        ${product.ten_danh_muc || product.category}
                    </span>
                    ` : ''}
                    ${product.thuong_hieu || product.brand ? `
                    <span class="inline-block bg-gray-100 text-gray-800 text-sm px-2.5 py-1 rounded font-medium tag-label">
                        ${product.thuong_hieu || product.brand}
                    </span>
                    ` : ''}
                </div>
                
                <!-- Tình trạng tồn kho -->
                ${isOutOfStock ? `
                <div class="mb-2">
                    <span class="inline-block bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-semibold">
                        🚫 Hết hàng
                    </span>
                </div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div class="flex flex-col gap-2 mt-4">
                    <!-- Nút Mua ngay (Lớn) -->
                    <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `buyNow(${productId})`}" 
                            class="w-full ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-lg shadow-md"
                            ${isOutOfStock ? 'disabled' : ''}>
                        MUA NGAY
                    </button>
                    
                    <div class="flex gap-2">
                        <!-- Nút Thêm vào giỏ (Icon) -->
                        <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `addToCart(${productId})`}" 
                                class="flex-1 ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white py-1.5 px-2 rounded-lg transition duration-200 flex items-center justify-center shadow-sm"
                                title="${isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}"
                                ${isOutOfStock ? 'disabled' : ''}>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </button>
                        
                        <!-- Nút Xem chi tiết -->
                        <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `viewProduct(${productId})`}" 
                                class="flex-1 ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white py-1.5 px-2 rounded-lg transition duration-200 flex items-center justify-center shadow-sm"
                                title="${isOutOfStock ? 'Sản phẩm hết hàng' : 'Xem chi tiết'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadPersonalizedProductsOnProductPage() {
    try {
        const userId = getCurrentUserIdForRecommendations();
        let products = [];

        if (userId) {
            const response = await fetch(`${API_URL}/recommendations/user/${userId}?limit=6`);
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                products = result.data.map(p => ({ ...p, isRecommended: true }));
            }
        }

        recommendedProducts = products;
        
        // Cập nhật lại bộ lọc để gộp sản phẩm gợi ý vào danh sách chính
        applyAllFilters();
    } catch (error) {
        console.error('Error loading personalized products:', error);
        recommendedProducts = [];
        applyAllFilters();
    }
}

// Load sản phẩm cùng danh mục khi user đã mua sản phẩm bất kỳ
async function loadInterestedCategoryProductsOnProductPage() {
    const panel = document.getElementById('interestedCategoryPanel');
    const grid = document.getElementById('interestedCategoryGridPage');
    const namesEl = document.getElementById('interestedCategoryNamesPage');
    const descEl = document.getElementById('interestedCategoryDescPage');
    if (!panel || !grid) return;

    try {
        const userId = getCurrentUserIdForRecommendations();
        if (!userId) return;

        const response = await fetch(`${API_URL}/recommendations/interested-categories/${userId}?limit=6`);
        const result = await response.json();

        if (!result.success || !result.hasInterest || !Array.isArray(result.products) || result.products.length === 0) {
            return;
        }

        const catNames = (result.categories || [])
            .map(c => c.ten_danh_muc)
            .filter(Boolean);
        if (namesEl) namesEl.textContent = catNames.length ? `"${catNames.join(', ')}"` : 'bạn yêu thích';
        if (descEl) {
            const totalPurchases = (result.categories || []).reduce((s, c) => s + (Number(c.total_purchases) || 0), 0);
            descEl.textContent = `Bạn đã mua ${totalPurchases} sản phẩm thuộc danh mục này — gợi ý sản phẩm cùng nhóm có thể bạn quan tâm.`;
        }

        grid.innerHTML = result.products.map(createPersonalizedProductCard).join('');
        panel.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading interested category products:', error);
    }
}

// Display products in grid
function displayProducts(products) {
    const container = document.getElementById('productGrid');
    const container2 = document.getElementById('productGrid2');
    
    if (!container && !container2) {
        console.error('Không tìm thấy container sản phẩm');
        return;
    }
    
    // Tính toán phân trang
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToShow = products.slice(startIndex, endIndex);
    
    const html = products.length === 0 ? `
        <div class="col-span-full text-center py-20">
            <svg class="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">Không tìm thấy sản phẩm</h3>
            <p class="text-gray-500">Vui lòng thử lại với bộ lọc khác</p>
        </div>
    ` : productsToShow.map(product => createProductCard(product)).join('');

    // Cập nhật cả 2 container
    if (container) container.innerHTML = html;
    if (container2) container2.innerHTML = html;

    // Cập nhật phân trang
    updatePagination(totalPages);
    
    // Cuộn lên đầu danh sách sản phẩm
    if (currentPage > 1) {
        const productSection = document.getElementById('content-san-pham');
        if (productSection) {
            productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Cập nhật phân trang
function updatePagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationContainer2 = document.getElementById('paginationContainer2');
    
    if (totalPages <= 1) {
        // Ẩn phân trang nếu chỉ có 1 trang
        if (paginationContainer) paginationContainer.classList.add('hidden');
        if (paginationContainer2) paginationContainer2.classList.add('hidden');
        return;
    }
    
    // Hiển thị phân trang
    if (paginationContainer) paginationContainer.classList.remove('hidden');
    if (paginationContainer2) paginationContainer2.classList.remove('hidden');
    
    // Tạo HTML cho phân trang
    let paginationHTML = '<div class="flex items-center justify-center gap-2">';
    
    // Nút Previous
    paginationHTML += `
        <button onclick="goToPage(${currentPage - 1})" 
                class="px-4 py-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
                ${currentPage === 1 ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
        </button>
    `;
    
    // Hiển thị các số trang
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Điều chỉnh lại nếu không đủ trang ở cuối
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Nút trang đầu và dấu ...
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" class="px-4 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 border-gray-300">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += '<span class="px-2 text-gray-500">...</span>';
        }
    }
    
    // Các trang ở giữa
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="goToPage(${i})" 
                    class="px-4 py-2 rounded-lg border font-semibold ${i === currentPage ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}">
                ${i}
            </button>
        `;
    }
    
    // Dấu ... và nút trang cuối
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="px-2 text-gray-500">...</span>';
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" class="px-4 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 border-gray-300">
                ${totalPages}
            </button>
        `;
    }
    
    // Nút Next
    paginationHTML += `
        <button onclick="goToPage(${currentPage + 1})" 
                class="px-4 py-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
                ${currentPage === totalPages ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
        </button>
    `;
    
    paginationHTML += '</div>';
    
    // Cập nhật cả 2 container
    if (paginationContainer) paginationContainer.innerHTML = paginationHTML;
    if (paginationContainer2) paginationContainer2.innerHTML = paginationHTML;
}

// Chuyển đến trang cụ thể
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayProducts(filteredProducts);
}

function createProductCard(product) {
    let imageUrl = PLACEHOLDER_IMAGE;
    const imgField = product.anh_chinh || product.duong_dan_anh;
    if (imgField) {
        // Nếu đường dẫn bắt đầu bằng http thì dùng trực tiếp
        if (imgField.startsWith('http')) {
            imageUrl = imgField;
        } else {
            // Xử lý đường dẫn từ database (có thể bắt đầu bằng / hoặc không)
            const cleanPath = imgField.startsWith('/') ? imgField : '/' + imgField;
            imageUrl = `${API_URL.replace('/api', '')}${cleanPath}`;
        }
    }
    
    const price = formatPrice(product.gia);
    const oldPriceValue = product.gia * 1.15;
    const oldPrice = formatPrice(oldPriceValue);
    const discount = 15;
    const discountAmount = formatPrice(oldPriceValue - product.gia);
    const ratingValue = parseFloat(product.rating || product.diem_trung_binh || 5);
    const starString = '⭐'.repeat(Math.floor(ratingValue));
    
    // Kiểm tra sản phẩm hết hàng
    const isOutOfStock = product.so_luong === 0;
    const outOfStockClass = isOutOfStock ? 'out-of-stock' : '';
    const outOfStockOverlay = isOutOfStock ? '<div class="out-of-stock-overlay">🚫 Hết hàng</div>' : '';
    
    return `
        <div class="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 relative group product-card ${outOfStockClass}">
            ${outOfStockOverlay}
            <!-- Freeship Badge -->
            <div class="absolute top-2 left-2 z-10">
                <div class="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <div class="text-center">
                        <div class="text-[10px] font-bold leading-tight">FREESHIP</div>
                        <div class="text-[8px] leading-tight">TOÀN QUỐC</div>
                    </div>
                </div>
            </div>
            
            <!-- Recommended Badge -->
            ${product.isRecommended ? `
            <div class="absolute top-2 right-2 z-10">
                <span class="bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1">
                    ✨ Gợi ý cho bạn
                </span>
            </div>
            ` : ''}
            
            <!-- Product Image -->
            <div class="relative p-4 bg-gray-50 ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'} overflow-hidden" ${isOutOfStock ? '' : `onclick="viewProduct(${product.ma_san_pham})"`}>
                <img src="${imageUrl}" 
                     alt="${product.ten_san_pham}" 
                     class="product-image w-full h-48 object-contain group-hover:scale-110 transition-transform duration-500"
                     onerror="this.onerror=null; this.src=PLACEHOLDER_IMAGE">
            </div>
            
            <!-- Product Info -->
            <div class="p-3">
                <!-- Pricing -->
                <div class="mb-2">
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-base text-gray-400 line-through price-old">${oldPrice}</span>
                        <span class="text-red-600 text-sm font-bold">-${discount}%</span>
                    </div>
                    <div class="text-2xl font-bold text-red-600 price-current">${price}</div>
                    <div class="text-sm text-green-600 font-medium">Giảm ${discountAmount}</div>
                </div>
                
                <!-- Product Name -->
                <h3 class="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer hover:text-red-600'} h-14" ${isOutOfStock ? '' : `onclick="viewProduct(${product.ma_san_pham})"`}>
                    ${product.ten_san_pham}
                </h3>
                
                <!-- Rating Stars -->
                <div class="flex items-center gap-1 mb-2">
                    <span class="text-sm font-bold">${starString}</span>
                    <span class="text-xs text-gray-500">(${ratingValue.toFixed(1)})</span>
                </div>
                
                <!-- Category & Brand -->
                <div class="flex items-center gap-2 mb-3">
                    ${product.ten_danh_muc ? `
                    <span class="inline-block bg-blue-100 text-blue-800 text-sm px-2.5 py-1 rounded font-medium tag-label">
                        ${product.ten_danh_muc}
                    </span>
                    ` : ''}
                    ${product.thuong_hieu ? `
                    <span class="inline-block bg-gray-100 text-gray-800 text-sm px-2.5 py-1 rounded font-medium tag-label">
                        ${product.thuong_hieu}
                    </span>
                    ` : ''}
                </div>
                
                <!-- Tình trạng tồn kho -->
                ${isOutOfStock ? `
                <div class="mb-2">
                    <span class="inline-block bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-semibold">
                        🚫 Hết hàng
                    </span>
                </div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div class="flex flex-col gap-2 mt-4">
                    <!-- Nút Mua ngay (Lớn) -->
                    <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `buyNow(${product.ma_san_pham})`}" 
                            class="w-full ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-lg shadow-md"
                            ${isOutOfStock ? 'disabled' : ''}>
                        MUA NGAY
                    </button>
                    
                    <div class="flex gap-2">
                        <!-- Nút Thêm vào giỏ (Icon) -->
                        <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `addToCart(${product.ma_san_pham})`}" 
                                class="flex-1 ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white py-1.5 px-2 rounded-lg transition duration-200 flex items-center justify-center shadow-sm"
                                title="${isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}"
                                ${isOutOfStock ? 'disabled' : ''}>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </button>
                        
                        <!-- Nút Xem chi tiết -->
                        <button onclick="${isOutOfStock ? 'showOutOfStockAlert()' : `viewProduct(${product.ma_san_pham})`}" 
                                class="flex-1 ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white py-1.5 px-2 rounded-lg transition duration-200 flex items-center justify-center shadow-sm"
                                title="${isOutOfStock ? 'Sản phẩm hết hàng' : 'Xem chi tiết'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Hiển thị thông báo sản phẩm hết hàng
function showOutOfStockAlert() {
    alert('⚠️ Sản phẩm này hiện đã hết hàng. Vui lòng quay lại sau!');
}

// Format price to Vietnamese currency
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// View product details
function viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

// Helper function to get full image URL
function getProductImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    if (imagePath.startsWith('http')) return imagePath;
    // Xử lý đường dẫn từ database (có thể bắt đầu bằng / hoặc không)
    const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    return `${API_URL.replace('/api', '')}${cleanPath}`;
}

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

// Add to cart
function addToCart(productOrId) {
    // Kiem tra dang nhap
    if (!isLoggedIn()) {
        showLoginRequired();
        return;
    }
    
    let product;
    
    // Kiem tra xem tham so la object product hay productId
    if (typeof productOrId === 'object' && productOrId !== null) {
        product = productOrId;
    } else {
        product = allProducts.find(p => p.ma_san_pham === productOrId);
    }
    
    if (!product) {
        console.error('Không tìm thấy sản phẩm');
        return;
    }
    
    const productId = product.ma_san_pham;
    const cartKey = getCartKey();
    
    // Get cart from localStorage
    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.ma_san_pham === productId);
    
    if (existingItem) {
        existingItem.so_luong = (parseInt(existingItem.so_luong) || 0) + 1;
    } else {
        cart.push({
            ma_san_pham: product.ma_san_pham,
            ten_san_pham: product.ten_san_pham,
            gia: product.gia,
            anh_chinh: getProductImageUrl(product.anh_chinh),
            so_luong: 1,
            trong_luong_kg: parseFloat(product.trong_luong_kg) || 0.5
        });
    }
    
    // Save to localStorage
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    // Show notification
    showNotification('Đã thêm sản phẩm vào giỏ hàng!');
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
                <h3 class="text-xl font-bold text-gray-900 mb-2">Yêu cầu đăng nhập</h3>
                <p class="text-gray-600 mb-6">Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng</p>
                <div class="flex gap-3">
                    <button id="closeLoginModalBtn" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition">
                        Để sau
                    </button>
                    <a href="login.html" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center inline-flex items-center justify-center">
                        Đăng nhập
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

// Update cart badge
function updateCartBadge() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.so_luong) || 0), 0);
    
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
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

// Handle search
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        window.location.href = `products.html?search=${encodeURIComponent(searchTerm)}`;
    }
}

// Handle mobile search
function handleMobileSearch() {
    const searchInput = document.getElementById('mobileSearchInput');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        window.location.href = `products.html?search=${encodeURIComponent(searchTerm)}`;
    }
}

// Show loading
function showLoading() {
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
            </div>
        `;
    }
}

// Hide loading
function hideLoading() {
    // Loading will be replaced by products
}

// Show error
function showError(message) {
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <svg class="w-24 h-24 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Có lỗi xảy ra</h3>
                <p class="text-gray-500 mb-4">${message}</p>
                <button onclick="loadProducts()" class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition">
                    Thử lại
                </button>
            </div>
        `;
    }
}

// Update result count
function updateResultCount(count) {
    const resultText = document.querySelector('.text-gray-500 strong');
    if (resultText) {
        resultText.textContent = count;
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');
    
    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        menuIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
    } else {
        mobileMenu.classList.add('hidden');
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
    }
}

// Switch tab
function switchTab(tabName) {
    // Hide all content
    const khamPha = document.getElementById('content-kham-pha');
    const sanPham = document.getElementById('content-san-pham');
    const baiViet = document.getElementById('content-bai-viet');
    
    // Ẩn tất cả bằng style.display
    if (khamPha) khamPha.style.display = 'none';
    if (sanPham) sanPham.style.display = 'none';
    if (baiViet) baiViet.style.display = 'none';
    
    // Show selected content
    if (tabName === 'kham-pha' && khamPha) {
        khamPha.style.display = 'block';
    } else if (tabName === 'san-pham' && sanPham) {
        sanPham.style.display = 'block';
        // Cập nhật productGrid2 với dữ liệu hiện tại khi chuyển tab (chỉ 1 lần)
        if (!sanPham.dataset.initialized) {
            sanPham.dataset.initialized = 'true';
            setTimeout(() => {
                displayProducts(filteredProducts);
            }, 10);
        }
    } else if (tabName === 'bai-viet' && baiViet) {
        baiViet.style.display = 'block';
        // Load bài viết từ API khi chuyển sang tab Bài viết
        if (typeof loadArticlesFromAPI === 'function') {
            loadArticlesFromAPI();
        }
    }
    
    // Update tab styles
    const tabs = ['kham-pha', 'san-pham', 'bai-viet'];
    tabs.forEach(tab => {
        const tabElement = document.getElementById(`tab-${tab}`);
        if (tabElement) {
            if (tab === tabName) {
                tabElement.classList.add('text-red-600', 'border-red-600', 'font-semibold');
                tabElement.classList.remove('text-gray-600', 'border-transparent');
            } else {
                tabElement.classList.remove('text-red-600', 'border-red-600', 'font-semibold');
                tabElement.classList.add('text-gray-600', 'border-transparent');
            }
        }
    });
}

// Toggle filter
function toggleFilter(filterId) {
    const filter = document.getElementById(filterId);
    const icon = document.getElementById(filterId + 'Icon');
    
    if (filter.classList.contains('hidden')) {
        filter.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        filter.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

// Initialize cart badge on page load
updateCartBadge();

function shouldOpenProductTabFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('category') || params.get('brand') || params.get('search'));
}

// Ghi nhận hành vi CLICK vào sản phẩm bằng cách lắng nghe click toàn cục trên các liên kết chi tiết sản phẩm
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
