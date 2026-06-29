// News API Configuration
const NEWS_API_URL = 'http://localhost:3000/api/news';

// Bi?n luu t?t c? tin t?c d? d?m theo danh m?c
let allNewsData = [];

// Format th?i gian
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'V?a xong';
    if (diffMins < 60) return `${diffMins} phút tru?c`;
    if (diffHours < 24) return `${diffHours} gi? tru?c`;
    if (diffDays < 7) return `${diffDays} ngày tru?c`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });
}

// L?y màu tag
function getTagColor(mauTag) {
    const colors = {
        'red': 'bg-red-600 text-white',
        'blue': 'bg-blue-600 text-white',
        'green': 'bg-green-600 text-white',
        'yellow': 'bg-yellow-400 text-red-700',
        'purple': 'bg-purple-600 text-white',
        'orange': 'bg-orange-600 text-white',
        'pink': 'bg-pink-600 text-white'
    };
    return colors[mauTag] || 'bg-gray-600 text-white';
}

// Load t?t c? tin t?c d? d?m theo danh m?c
async function loadNewsCategoryCounts() {
    try {
        // Load t?t c? tin t?c (không phân trang) d? d?m
        const response = await fetch(`${NEWS_API_URL}?limit=1000`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allNewsData = result.data;
            updateNewsCategoryCounts();
        }
    } catch (error) {
        console.error('L?i load news category counts:', error);
    }
}

// C?p nh?t s? lu?ng tin t?c theo danh m?c
function updateNewsCategoryCounts() {
    // Ð?m s? tin t?c theo t?ng danh m?c
    const categoryCounts = {};
    let totalCount = allNewsData.length;
    
    allNewsData.forEach(news => {
        const category = news.danh_muc || 'Khác';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // C?p nh?t s? li?u trên giao di?n
    const categoryCountElements = document.querySelectorAll('.news-category-count');
    categoryCountElements.forEach(el => {
        const categoryName = el.getAttribute('data-category');
        if (categoryName === 'all') {
            el.textContent = `(${totalCount})`;
        } else if (categoryCounts[categoryName] !== undefined) {
            el.textContent = `(${categoryCounts[categoryName]})`;
        } else {
            el.textContent = '(0)';
        }
    });
    
    console.log('?? News category counts:', categoryCounts);
    console.log('?? Total news:', totalCount);
}

// Load tin t?c n?i b?t
async function loadFeaturedNews() {
    try {
        const response = await fetch(`${NEWS_API_URL}/featured`);
        const result = await response.json();
        
        if (!result.success || !result.data.length) {
            console.log('Không có tin n?i b?t');
            return;
        }

        const featured = result.data;
        const container = document.getElementById('featuredNews');
        if (!container) return;

        // Tin l?n bên trái
        const mainNews = featured[0];
        const sideNews = featured.slice(1, 4);

        container.innerHTML = `
            <!-- Featured News - Large -->
            <article class="news-card bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer relative" onclick="window.location.href='news-detail.html?id=${mainNews.ma_tin_tuc}'">
                <div class="relative h-72 overflow-hidden">
                    <img src="${mainNews.hinh_anh}" alt="${mainNews.tieu_de}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <span class="absolute top-4 left-4 ${getTagColor(mainNews.mau_tag)} px-3 py-1 rounded-full text-xs font-bold ${mainNews.tag === 'HOT' ? 'animate-pulse' : ''}">${mainNews.tag === 'HOT' ? '?? ' : ''}${mainNews.tag}</span>
                    <div class="absolute bottom-4 left-4 right-4 text-white">
                        <div class="flex items-center gap-2 text-xs mb-2 opacity-90">
                            <span>?? ${formatTimeAgo(mainNews.ngay_tao)}</span>
                            <span>•</span>
                            <span>${mainNews.danh_muc}</span>
                        </div>
                        <h3 class="font-bold text-lg line-clamp-2 group-hover:text-yellow-300 transition">${mainNews.tieu_de}</h3>
                    </div>
                </div>
            </article>

            <!-- Featured News - Small Stack -->
            <div class="space-y-4">
                ${sideNews.map(news => `
                    <article class="news-card bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer flex" onclick="window.location.href='news-detail.html?id=${news.ma_tin_tuc}'">
                        <div class="relative w-32 h-24 flex-shrink-0 overflow-hidden">
                            <img src="${news.hinh_anh}" alt="${news.tieu_de}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                            <span class="absolute top-1 left-1 ${getTagColor(news.mau_tag)} px-2 py-0.5 rounded text-xs font-bold">${news.tag}</span>
                        </div>
                        <div class="p-3 flex flex-col justify-center">
                            <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <span>?? ${formatTimeAgo(news.ngay_tao)}</span>
                            </div>
                            <h3 class="font-bold text-sm text-gray-800 line-clamp-2 group-hover:text-red-600 transition">${news.tieu_de}</h3>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('L?i load tin n?i b?t:', error);
    }
}

    // Load tin m?i nh?t hôm nay
async function loadTodayNews() {
    try {
        const response = await fetch(`${NEWS_API_URL}/today`);
        const result = await response.json();
        
        if (!result.success || !result.data.length) {
            console.log('Không có tin hôm nay');
            return;
        }

        const container = document.getElementById('todayNews');
        if (!container) return;

        container.innerHTML = result.data.map(news => `
            <article class="news-card bg-white rounded-lg shadow-md overflow-hidden group cursor-pointer" onclick="window.location.href='news-detail.html?id=${news.ma_tin_tuc}'">
                <div class="relative h-32 overflow-hidden">
                    <img src="${news.hinh_anh}" alt="${news.tieu_de}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                    <div class="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">${formatTimeAgo(news.ngay_tao)}</div>
                </div>
                <div class="p-3">
                    <h3 class="font-bold text-sm text-gray-800 line-clamp-2 group-hover:text-red-600 transition">${news.tieu_de}</h3>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error('L?i load tin hôm nay:', error);
    }
}

    // Load t?t c? tin t?c (grid)
async function loadAllNews(page = 1, categories = [], search = '', time = 'all') {
    try {
        let url = `${NEWS_API_URL}?page=${page}&limit=6`;
        
        if (categories && categories.length > 0) {
            url += `&category=${encodeURIComponent(categories.join(','))}`;
        }
        
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        if (time && time !== 'all') {
            url += `&time=${time}`;
        }

        console.log('?? Loading news with URL:', url);

        const response = await fetch(url);
        const result = await response.json();
        
        console.log('?? News API Response:', result);

        if (!result.success) {
            console.log('Không có tin t?c');
            return;
        }

        const container = document.getElementById('newsGrid');
        if (!container) return;

        if (result.data.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">??</div>
                    <p class="text-gray-500 text-lg font-semibold">Không tìm th?y tin t?c nào</p>
                    <p class="text-gray-400 text-sm mt-2">Th? thay d?i b? l?c ho?c t? khóa tìm ki?m</p>
                </div>
            `;
            updateSearchInfo(0, search, categories, time);
            return;
        }

        container.innerHTML = result.data.map(news => `
            <article class="news-card bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer" onclick="window.location.href='news-detail.html?id=${news.ma_tin_tuc}'">
                <div class="relative h-48 overflow-hidden">
                    <img src="${news.hinh_anh}" alt="${news.tieu_de}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x200?text=Tin+tuc'">
                    <span class="absolute top-3 left-3 ${getTagColor(news.mau_tag)} px-3 py-1 rounded-full text-xs font-bold">${news.tag}</span>
                </div>
                <div class="p-4">
                    <div class="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>?? ${formatTimeAgo(news.ngay_tao)}</span>
                        <span>•</span>
                        <span>${news.danh_muc}</span>
                    </div>
                    <h3 class="font-bold text-base mb-2 text-gray-800 line-clamp-2 group-hover:text-red-600 transition">${news.tieu_de}</h3>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${news.mo_ta_ngan || ''}</p>
                    <a href="news-detail.html?id=${news.ma_tin_tuc}" class="inline-flex items-center gap-1 text-red-600 font-semibold text-sm hover:text-red-700">
                        Ð?c thêm <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </article>
        `).join('');

        // Update pagination
        updatePagination(result.pagination);

        // Update search result info
        updateSearchInfo(result.pagination.total, search, categories, time);
    } catch (error) {
        console.error('L?i load tin t?c:', error);
        const container = document.getElementById('newsGrid');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">?</div>
                    <p class="text-red-500 text-lg font-semibold">L?i t?i tin t?c</p>
                    <p class="text-gray-400 text-sm mt-2">Vui lòng th? l?i sau</p>
                </div>
            `;
        }
    }
}

// Update pagination
function updatePagination(pagination) {
    const container = document.getElementById('newsPagination');
    if (!container) return;

    const { page, totalPages } = pagination;
    let html = '';

    // Previous button
    html += `<button onclick="changePage(${page - 1})" ${page <= 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg ${page <= 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
    </button>`;

    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button onclick="changePage(${i})" class="px-4 py-2 rounded-lg ${i === page ? 'bg-red-600 text-white font-bold' : 'bg-white text-gray-700 hover:bg-gray-100'} transition font-semibold">${i}</button>`;
    }

    // Next button
    html += `<button onclick="changePage(${page + 1})" ${page >= totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-lg ${page >= totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </button>`;

    container.innerHTML = html;
}

// Update search info
function updateSearchInfo(total, search, categories = [], time = 'all') {
    const container = document.getElementById('searchInfo');
    if (!container) return;

    let filterInfo = [];
    
    // Thông tin tìm ki?m
    if (search) {
        filterInfo.push(`t? khóa <span class="font-bold text-blue-600">"${search}"</span>`);
    }
    
    // Thông tin danh m?c
    if (categories && categories.length > 0) {
        filterInfo.push(`danh m?c <span class="font-bold text-green-600">${categories.join(', ')}</span>`);
    }
    
    // Thông tin th?i gian
    const timeLabels = {
        'today': 'hôm nay',
        'week': 'tu?n này',
        'month': 'tháng này'
    };
    if (time && time !== 'all' && timeLabels[time]) {
        filterInfo.push(`th?i gian <span class="font-bold text-purple-600">${timeLabels[time]}</span>`);
    }

    if (filterInfo.length > 0) {
        container.innerHTML = `Tìm th?y <span class="font-bold text-red-600">${total}</span> k?t qu? v?i ${filterInfo.join(', ')}`;
    } else {
        container.innerHTML = `Hi?n th? <span class="font-bold text-red-600">${total}</span> tin t?c`;
    }
}

// Change page
let currentPage = 1;
let currentCategories = [];
let currentSearch = '';
let currentTime = 'all';

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    loadAllNews(currentPage, currentCategories, currentSearch, currentTime);
    window.scrollTo({ top: document.getElementById('newsGrid').offsetTop - 100, behavior: 'smooth' });
}

// Filter by category
function updateCategoryFilter() {
    const selectedRadio = document.querySelector('.category-radio:checked');
    const selectedValue = selectedRadio ? selectedRadio.value : '';
    currentCategories = selectedValue ? [selectedValue] : [];
    currentPage = 1;
    loadAllNews(currentPage, currentCategories, currentSearch, currentTime);
    
    // Highlight selected category
    document.querySelectorAll('.category-radio').forEach(radio => {
        const label = radio.closest('label');
        if (radio.checked) {
            label.classList.add('bg-red-50', 'border-red-200');
            label.classList.remove('hover:bg-gray-50');
        } else {
            label.classList.remove('bg-red-50', 'border-red-200');
            label.classList.add('hover:bg-gray-50');
        }
    });
}

// Filter by time
function updateTimeFilter(time) {
    currentTime = time;
    currentPage = 1;
    loadAllNews(currentPage, currentCategories, currentSearch, currentTime);
    
    // Highlight selected time filter
    document.querySelectorAll('input[name="timeFilter"]').forEach(radio => {
        const label = radio.closest('label');
        if (radio.checked) {
            label.classList.add('bg-red-50', 'border-red-200');
            label.classList.remove('hover:bg-gray-50');
        } else {
            label.classList.remove('bg-red-50', 'border-red-200');
            label.classList.add('hover:bg-gray-50');
        }
    });
}

// Search news
function searchNews(query) {
    currentSearch = query;
    currentPage = 1;
    loadAllNews(currentPage, currentCategories, currentSearch, currentTime);
}

// Reset all filters
function resetFilters() {
    // Reset variables
    currentPage = 1;
    currentCategories = [];
    currentSearch = '';
    currentTime = 'all';
    
    // Reset search input
    const searchInput = document.getElementById('newsSearchInput');
    if (searchInput) searchInput.value = '';
    
    // Reset time filter to "all"
    const allTimeRadio = document.querySelector('input[name="timeFilter"][value="all"]');
    if (allTimeRadio) allTimeRadio.checked = true;
    
    // Reset category filter to "T?t c? danh m?c"
    const allCategoryRadio = document.querySelector('.category-radio[value=""]');
    if (allCategoryRadio) allCategoryRadio.checked = true;
    
    document.querySelectorAll('.category-radio').forEach(radio => {
        const label = radio.closest('label');
        if (radio.value === '') {
            label.classList.add('bg-red-50', 'border-red-200');
            label.classList.remove('hover:bg-gray-50');
        } else {
            label.classList.remove('bg-red-50', 'border-red-200');
            label.classList.add('hover:bg-gray-50');
        }
    });
    
    // Reset time filter highlights
    document.querySelectorAll('input[name="timeFilter"]').forEach(radio => {
        const label = radio.closest('label');
        if (radio.value === 'all') {
            label.classList.add('bg-red-50', 'border-red-200');
        } else {
            label.classList.remove('bg-red-50', 'border-red-200');
            label.classList.add('hover:bg-gray-50');
        }
    });
    
    // Reload news
    loadAllNews();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedNews();
    loadTodayNews();
    loadAllNews();
    loadNewsCategoryCounts(); // Load s? lu?ng tin t?c theo danh m?c

    // Setup search
    const searchInput = document.getElementById('newsSearchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => searchNews(this.value), 500);
        });
    }

    // Setup category filter
    const categoryRadios = document.querySelectorAll('.category-radio');
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', updateCategoryFilter);
    });
    
    // Initial highlight for "T?t c? danh m?c" category filter
    const allCategoryRadio = document.querySelector('.category-radio[value=""]');
    if (allCategoryRadio) {
        const label = allCategoryRadio.closest('label');
        label.classList.add('bg-red-50', 'border-red-200');
    }

    // Setup time filter
    const timeRadios = document.querySelectorAll('input[name="timeFilter"]');
    timeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateTimeFilter(this.value);
        });
    });
    
    // Initial highlight for "T?t c?" time filter
    const allTimeRadio = document.querySelector('input[name="timeFilter"][value="all"]');
    if (allTimeRadio) {
        const label = allTimeRadio.closest('label');
        label.classList.add('bg-red-50', 'border-red-200');
        label.classList.remove('hover:bg-gray-50');
    }
});
