/**
 * Search Suggestions - Tìm kiếm gợi ý giống YouTube
 * Hiển thị dropdown gợi ý sản phẩm khi người dùng gõ vào thanh tìm kiếm
 */

(function() {
    'use strict';
    
    const API_URL = 'http://localhost:3000/api';
    let debounceTimer = null;
    let currentFocus = -1;
    
    // Khởi tạo khi DOM ready và khi header được load xong để bắt input linh động
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearchSuggestions);
    } else {
        initSearchSuggestions();
    }
    document.addEventListener('headerLoaded', initSearchSuggestions);

    function initSearchSuggestions() {
        const searchInputs = document.querySelectorAll('#searchInput, #headerSearch, #mobileSearchInput');

        searchInputs.forEach(input => {
            if (!input || input.dataset.suggestionsInit) return;
            input.dataset.suggestionsInit = 'true';
            
            // Tắt gợi ý mặc định của trình duyệt
            input.setAttribute('autocomplete', 'off');
            
            console.log('Init search suggestions for:', input.id);

            createSuggestionsDropdown(input);
            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeydown);
            input.addEventListener('focus', handleFocus);
        });

        document.removeEventListener('click', handleClickOutside);
        document.addEventListener('click', handleClickOutside);
    }
    
    function createSuggestionsDropdown(input) {
        // Tìm parent container của input
        const parent = input.parentElement;
        parent.style.position = 'relative';
        
        // Tạo dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'search-suggestions-dropdown';
        dropdown.id = `suggestions-${input.id}`;
        dropdown.innerHTML = '';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            max-height: 480px;
            overflow-y: auto;
            z-index: 9999;
            display: none;
            margin-top: 2px;
        `;
        
        parent.appendChild(dropdown);
    }
    
        function handleInput(e) {
        const input = e.target;
        const query = input.value.trim();

        if (debounceTimer) clearTimeout(debounceTimer);

        if (query.length < 1) {
            showSearchHistory(input);
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchSuggestions(input, query);
        }, 300);
    }

    function handleKeydown(e) {
        const input = e.target;
        const dropdown = document.getElementById(`suggestions-${input.id}`);
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus++;
            if (currentFocus >= items.length) currentFocus = 0;
            setActiveSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus--;
            if (currentFocus < 0) currentFocus = items.length - 1;
            setActiveSuggestion(items);
        } else if (e.key === 'Enter') {
            if (currentFocus > -1 && items[currentFocus]) {
                e.preventDefault();
                items[currentFocus].click();
            }
        } else if (e.key === 'Escape') {
            hideDropdown(input);
        }
    }
    
        function handleFocus(e) {
        const input = e.target;
        const query = input.value.trim();
        if (query.length >= 1) {
            fetchSuggestions(input, query);
        } else {
            showSearchHistory(input);
        }
    }

    function handleClickOutside(e) {
        const dropdowns = document.querySelectorAll('.search-suggestions-dropdown');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target) && !e.target.matches('#searchInput, #headerSearch, #mobileSearchInput')) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    function setActiveSuggestion(items) {
        items.forEach((item, index) => {
            if (index === currentFocus) {
                item.classList.add('bg-gray-100');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-gray-100');
            }
        });
    }

    async function fetchSuggestions(input, query) { console.log("Fetching for:", query);
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`${API_URL}/products/search/suggestions?q=${encodeURIComponent(query)}&limit=8`, {
                headers: headers
            });
            const result = await response.json();
            
            if (result.success) {
                showSuggestions(input, result.data, query);
            } else {
                hideDropdown(input);
            }
        } catch (error) {
            console.error('Lỗi tìm kiếm gợi ý:', error);
            hideDropdown(input);
        }
    }
    
    function showSuggestions(input, products, query) {
        const dropdown = document.getElementById(`suggestions-${input.id}`);
        if (!dropdown) return;
        
        currentFocus = -1;
        
        // Xác định đường dẫn base dựa trên vị trí trang hiện tại
        const isInPages = window.location.pathname.includes('/pages/');
        const basePath = isInPages ? '' : 'pages/';
        const apiBasePath = API_URL.replace('/api', '');
        
        let html = `
            <div class="p-3 border-b border-gray-100">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <span>Kết quả cho "<strong class="text-gray-700">${escapeHtml(query)}</strong>"</span>
                </div>
            </div>
        `;
        
        if (products.length === 0) {
            html += `
                <div class="p-4 text-center text-gray-500 text-sm">
                    Không tìm thấy sản phẩm
                </div>
            `;
        } else {
            products.forEach((product, index) => {
            const imageUrl = getImageUrl(product.anh_chinh, apiBasePath);
            const price = formatPrice(product.gia);
            const highlightedName = highlightMatch(product.ten_san_pham, query);
            
            html += `
                <div class="suggestion-item flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                     onclick="goToProduct(${product.ma_san_pham})"
                     data-index="${index}">
                    <div class="w-14 h-14 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img src="${imageUrl}" 
                             alt="${escapeHtml(product.ten_san_pham)}" 
                             class="w-full h-full object-contain"
                             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-800 text-sm line-clamp-2">${highlightedName}</div>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-red-600 font-bold text-sm">${price}</span>
                            ${product.ten_danh_muc ? `<span class="text-xs text-gray-400">• ${escapeHtml(product.ten_danh_muc)}</span>` : ''}
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            `;
        });
        }

        // Nút xem tất cả kết quả
        html += `
            <div class="p-3 bg-gray-50 rounded-b-xl">
                <button onclick="searchAll('${escapeHtml(query)}')" 
                        class="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm py-2 hover:bg-blue-50 rounded-lg transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    Xem tất cả kết quả cho "${escapeHtml(query)}"
                </button>
            </div>
        `;
        
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }
    
    function hideDropdown(input) {
        const dropdown = document.getElementById(`suggestions-${input.id}`);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        currentFocus = -1;
    }
    
    function getImageUrl(imagePath, apiBasePath) {
        if (!imagePath) return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
        return `${apiBasePath}${cleanPath}`;
    }
    
    function formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
    }
    
        // Load lịch sử tìm kiếm từ Local storage
    function getSearchHistory() {
        try {
             return JSON.parse(localStorage.getItem('searchHistory')) || [];
        } catch {
             return [];
        }
    }
    
    function saveSearchHistory(query) {
        if (!query || query.trim() === '') return;
        let history = getSearchHistory();
        // Xóa nếu đã có để move lên trực
        history = history.filter(item => item !== query);
        history.unshift(query);
        // giữ tối đa 5
        if (history.length > 5) history.pop();
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }
    
    function removeSearchHistory(query, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        let history = getSearchHistory();
        history = history.filter(item => item !== query);
        localStorage.setItem('searchHistory', JSON.stringify(history));
        // tìm input gắn với đang mở để cập nhật
        const inputs = document.querySelectorAll('#searchInput, #headerSearch, #mobileSearchInput');
        inputs.forEach(input => {
            const dropdown = document.getElementById('suggestions-' + input.id);
            if (dropdown && dropdown.style.display === 'block') {
               showSearchHistory(input);
            }
        });
    }

    window.removeSearchHistory = removeSearchHistory;

    function showSearchHistory(input) {
        const history = getSearchHistory();
        const dropdown = document.getElementById('suggestions-' + input.id);
        if (!dropdown) return;

        if (history.length === 0) {
            hideDropdown(input);
            return;
        }

        currentFocus = -1;

        let html = '<div class="p-3 border-b border-gray-100 text-sm font-semibold text-gray-500">Lịch sử tìm kiếm</div>';
        
                history.forEach((item, index) => {
            html += `
                <div class="suggestion-item flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                     onclick="searchAllHistory('${escapeHtml(item)}')" data-index="${index}">
                    <div class="flex items-center gap-3">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="text-gray-700 text-sm">${escapeHtml(item)}</span>
                    </div>
                    <button onclick="removeSearchHistory('${escapeHtml(item)}', event)" class="p-1 hover:bg-gray-200 rounded-full text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `;
        });
        
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }
    
    function goToProduct(productId) {
        const isInPages = window.location.pathname.includes('/pages/');
        const target = isInPages ? 'product-detail.html' : 'user/pages/product-detail.html';
        window.location.href = target + '?id=' + productId;
    }
    window.goToProduct = goToProduct;

    function doSearch(query) {
        saveSearchHistory(query);
        const isInPages = window.location.pathname.includes('/pages/');
        const target = isInPages ? 'products.html' : 'user/pages/products.html';
        window.location.href = target + '?search=' + encodeURIComponent(query);
    }
    
    window.searchAll = doSearch;
    window.searchAllHistory = doSearch;
    
    window.handleSearch = function() {
        const input = document.getElementById('searchInput');
        if (input && input.value.trim()) doSearch(input.value.trim());
    };
    
    window.handleMobileSearch = function() {
        const input = document.getElementById('mobileSearchInput');
        if (input && input.value.trim()) doSearch(input.value.trim());
    };
})();
