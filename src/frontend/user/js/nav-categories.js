// Dynamic Navigation Categories Loader
const NAV_API_BASE = 'http://localhost:3000/api';

function normalizeCategoryName(name) {
    if (!name) return name;
    
    // Check partial matches for corrupted encodings
    if (name.includes('tho?i') || name.includes('thoi') || name.includes('thoai') || name.includes('?i?n th') || name.includes('o?i')) return 'Điện thoại';
    if (name.includes('my') || name.includes('mAy') || name.includes('?i?n m')) return 'Điện máy';
    if (name.includes('hnh') || name.includes('hAnh') || name.includes('h?nh')) return 'Màn hình';
    if (name.includes('ki?n') || name.includes('kin') || name.includes('i?n')) return 'Phụ kiện';
    if (name.includes('Ngu?n') || name.includes('Ngu"n') || name.includes('Ngun') || name.includes('Ngu')) return 'Case, Nguồn';
    if (name.includes('lung') || name.includes('lng') || name.includes('?p l')) return 'Ốp lưng';
    if (name.includes('phm') || name.includes('phA-m') || name.includes('ph?m')) return 'Chuột, Bàn phím';
    if (name.includes('CPU') || name.includes('VGA')) return 'CPU, VGA';
    if (name.includes('Laptop')) return 'Laptop';
    if (name.includes('Gaming')) return 'PC Gaming';
    
    // Fallback dictionary for exact matches
    const corruptedMap = {
        'Mn hnh': 'Màn hình',
        'Case Ngu"n': 'Case, Nguồn',
        'Case, Ngu?n': 'Case, Nguồn',
        'Ph kin': 'Phụ kiện',
        'Ph? ki?n': 'Phụ kiện',
        '?in thoi': 'Điện thoại',
        'Di?n tho?i': 'Điện thoại',
        '?in mAy': 'Điện máy',
        'Di?n my': 'Điện máy',
        '?p lng': 'Ốp lưng',
        '?p lung': 'Ốp lưng',
        'ChuTt, BAn phA-m': 'Chuột, Bàn phím',
        'Chu?t, Bn phm': 'Chuột, Bàn phím',
        'CPU, VGA': 'CPU, VGA',
        'Laptop': 'Laptop',
        'PC Gaming': 'PC Gaming'
    };
    
    return corruptedMap[name] || name;
}

function getCategorySlugFromName(name) {
    const normalizedName = normalizeCategoryName(name);
    const slugMap = {
        'Laptop': 'laptop',
        'PC Gaming': 'pc-gaming',
        'Màn hình': 'man-hinh',
        'CPU, VGA': 'cpu-vga',
        'Case, Nguồn': 'case-nguon',
        'Phụ kiện': 'phu-kien',
        'Tai nghe': 'tai-nghe',
        'Điện thoại': 'dien-thoai',
        'Điện máy': 'dien-may',
        'Ốp lưng': 'op-lung',
        'Chuột, Bàn phím': 'chuot-ban-phim'
    };
    return slugMap[normalizedName] || normalizedName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function loadNavCategories() {
    const container = document.getElementById('dynamic-nav-categories');
    if (!container) return;
    
    // Detect if we're in pages folder or root
    const isInPages = window.location.pathname.includes('/pages/');
    const productsPath = isInPages ? 'products.html' : 'user/pages/products.html';
    
    try {
        const response = await fetch(`${NAV_API_BASE}/products/categories/all`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const categories = result.data;
            let html = '';
            
            categories.forEach((cat, index) => {
                const displayName = normalizeCategoryName(cat.ten_danh_muc);
                const slug = getCategorySlugFromName(displayName);
                html += `<a href="${productsPath}?category=${slug}" class="text-base font-bold text-red-500 hover:text-blue-600 transition">
                    <span class="text-yellow-400">💡</span> ${displayName}
                </a>`;
            });
            
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading nav categories:', error);
        // Fallback to static links
        container.innerHTML = `
            <a href="${productsPath}?category=laptop" class="text-base font-bold text-red-500 hover:text-blue-600 transition"><span class="text-yellow-400">💡</span> Laptop</a>
            <a href="${productsPath}?category=pc-gaming" class="text-base font-bold text-red-500 hover:text-blue-600 transition"><span class="text-yellow-400">💡</span> PC Gaming</a>
            <a href="${productsPath}?category=man-hinh" class="text-base font-bold text-red-500 hover:text-blue-600 transition"><span class="text-yellow-400">💡</span> Màn hình</a>
        `;
    }
}

// Auto-load when DOM is ready
document.addEventListener('DOMContentLoaded', loadNavCategories);
