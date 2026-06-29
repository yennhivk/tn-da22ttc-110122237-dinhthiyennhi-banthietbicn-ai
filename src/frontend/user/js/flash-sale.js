// Flash Sale - Gio Vang Gia Soc
// Hien thi san pham flash sale dang dien ra va sap dien ra tren trang chu

// Helper function to get full image URL
function getFlashSaleImageUrl(imagePath) {
    if (!imagePath) return 'images/placeholder.png';
    if (imagePath.startsWith('http')) return imagePath;
    // Xử lý đường dẫn từ database (có thể bắt đầu bằng / hoặc không)
    const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    return `http://localhost:3000${cleanPath}`;
}

async function loadFlashSaleProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products/flash-sale');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            renderFlashSaleSection(data.data);
        } else {
            // Khong co flash sale, an section
            const section = document.getElementById('flash-sale-section');
            if (section) section.style.display = 'none';
        }
    } catch (error) {
        console.error('Load flash sale error:', error);
        const section = document.getElementById('flash-sale-section');
        if (section) section.style.display = 'none';
    }
}

function renderFlashSaleSection(products) {
    const section = document.getElementById('flash-sale-section');
    if (!section) return;
    
    section.style.display = 'block';
    
    const container = document.getElementById('flash-sale-products');
    if (!container) return;
    
    const html = products.map(product => {
        const discount = product.phan_tram_giam;
        const isUpcoming = product.trang_thai_flash === 'upcoming';
        const startTime = new Date(product.thoi_gian_bat_dau);
        const endTime = new Date(product.thoi_gian_ket_thuc);
        const now = new Date();
        
        // Tính thời gian còn lại (đến kết thúc nếu đang diễn ra, đến bắt đầu nếu sắp diễn ra)
        const targetTime = isUpcoming ? startTime : endTime;
        const timeLeft = Math.max(0, Math.floor((targetTime - now) / 1000)); // seconds
        
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        const remaining = product.so_luong_gioi_han ? 
            product.so_luong_gioi_han - product.so_luong_da_ban : null;
        const soldPercent = product.so_luong_gioi_han ? 
            Math.round((product.so_luong_da_ban / product.so_luong_gioi_han) * 100) : 0;
        
        // Format ngày bắt đầu cho flash sale sắp diễn ra
        const startDateStr = startTime.toLocaleDateString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="flash-sale-card bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all border-2 ${isUpcoming ? 'border-blue-300' : 'border-red-200'}" data-status="${product.trang_thai_flash}" data-target-time="${targetTime.getTime()}">
                <div class="relative">
                    <img src="${getFlashSaleImageUrl(product.anh_chinh)}" 
                         alt="${product.ten_san_pham}" 
                         class="w-full h-48 object-cover ${isUpcoming ? 'opacity-90' : ''}"
                        onerror="this.onerror=null; this.src='images/placeholder.png'">
                    <div class="absolute top-2 left-2 ${isUpcoming ? 'bg-blue-600' : 'bg-red-600'} text-white px-3 py-1 rounded-full font-bold text-lg shadow-lg">
                        -${discount}%
                    </div>
                    ${isUpcoming ? `
                    <div class="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                        ? S?P DI?N RA
                    </div>
                    ` : `
                    <div class="absolute top-2 right-2 bg-yellow-400 text-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">
                        ?? HOT
                    </div>
                    `}
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-gray-800 mb-2 line-clamp-2 h-12" title="${product.ten_san_pham}">
                        ${product.ten_san_pham}
                    </h3>
                    
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-2xl font-bold ${isUpcoming ? 'text-blue-600' : 'text-red-600'}">${formatPrice(product.gia_sale)}</span>
                        <span class="text-sm text-gray-500 line-through">${formatPrice(product.gia_goc)}</span>
                    </div>
                    
                    ${product.so_luong_gioi_han ? `
                    <div class="mb-3">
                        <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>${isUpcoming ? 'S? lu?ng:' : '�� b�n:'} ${isUpcoming ? product.so_luong_gioi_han : product.so_luong_da_ban + '/' + product.so_luong_gioi_han}</span>
                            ${!isUpcoming ? `<span>${soldPercent}%</span>` : ''}
                        </div>
                        ${!isUpcoming ? `
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-red-500 h-2 rounded-full transition-all" style="width: ${soldPercent}%"></div>
                        </div>
                        ${remaining > 0 ? `<p class="text-xs text-orange-600 mt-1">? Ch? c�n ${remaining} s?n ph?m</p>` : ''}
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="${isUpcoming ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded p-2 mb-3">
                        <p class="text-xs text-gray-600 mb-1">${isUpcoming ? '??? B?t d?u sau:' : '? K?t th�c sau:'}</p>
                        <div class="flex gap-1 text-center">
                            <div class="flex-1 ${isUpcoming ? 'bg-blue-600' : 'bg-red-600'} text-white rounded py-1">
                                <div class="text-lg font-bold countdown-hours">${hours.toString().padStart(2, '0')}</div>
                                <div class="text-[10px]">Gi?</div>
                            </div>
                            <div class="flex-1 ${isUpcoming ? 'bg-blue-600' : 'bg-red-600'} text-white rounded py-1">
                                <div class="text-lg font-bold countdown-minutes">${minutes.toString().padStart(2, '0')}</div>
                                <div class="text-[10px]">Ph�t</div>
                            </div>
                            <div class="flex-1 ${isUpcoming ? 'bg-blue-600' : 'bg-red-600'} text-white rounded py-1">
                                <div class="text-lg font-bold countdown-seconds">${seconds.toString().padStart(2, '0')}</div>
                                <div class="text-[10px]">Gi�y</div>
                            </div>
                        </div>
                        ${isUpcoming ? `<p class="text-xs text-blue-600 mt-2 text-center font-medium">?? ${startDateStr}</p>` : ''}
                    </div>
                    
                    ${isUpcoming ? `
                    <button disabled
                       class="block w-full bg-gray-300 text-gray-600 text-center py-2 rounded-lg font-bold cursor-not-allowed">
                        S?P M? B�N
                    </button>
                    ` : `
                    <a href="user/pages/product-detail.html?id=${product.ma_san_pham}" 
                       class="block w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-center py-2 rounded-lg font-bold transition-all">
                        MUA NGAY
                    </a>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Start countdown timers
    startCountdowns();
}

function startCountdowns() {
    setInterval(() => {
        document.querySelectorAll('.flash-sale-card').forEach((card) => {
            const hoursEl = card.querySelector('.countdown-hours');
            const minutesEl = card.querySelector('.countdown-minutes');
            const secondsEl = card.querySelector('.countdown-seconds');
            const status = card.dataset.status;
            const targetTime = parseInt(card.dataset.targetTime);
            
            if (!hoursEl || !minutesEl || !secondsEl || !targetTime) return;
            
            const now = Date.now();
            const timeLeft = Math.max(0, Math.floor((targetTime - now) / 1000));
            
            if (timeLeft <= 0) {
                // Flash sale ended or started, reload page to update
                hoursEl.textContent = '00'; minutesEl.textContent = '00'; secondsEl.textContent = '00';
                return;
            }
            
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            
            hoursEl.textContent = hours.toString().padStart(2, '0');
            minutesEl.textContent = minutes.toString().padStart(2, '0');
            secondsEl.textContent = seconds.toString().padStart(2, '0');
        });
    }, 1000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + 'd';
}

// Load flash sale khi trang load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFlashSaleProducts);
} else {
    loadFlashSaleProducts();
}
