// Seasonal Effects - Hoa Mai
(function() {
    'use strict';

    // Cấu hình
    const CONFIG = {
        hoaMaiCount: 10,      // Số lượng hoa mai emoji
        hoaMaiImageCount: 8,  // Số lượng hoa mai hình ảnh
        enabled: false         // Bật/tắt hiệu ứng
    };

    // Emoji hoa mai
    const HOA_MAI_EMOJIS = ['🌸', '🏵️', '💮', '🌺'];
    
    // Hình ảnh hoa mai
    const HOA_MAI_IMAGE = 'images/Tổng-hợp-những-hình-ảnh-hoa-mai-vàng-đẹp-nhất-13-removebg-preview.png';

    let container = null;
    let isPaused = false;

    // Tạo container cho hiệu ứng
    function createContainer() {
        container = document.createElement('div');
        container.className = 'seasonal-effects';
        container.id = 'seasonalEffects';
        document.body.appendChild(container);
    }

    // Tạo một hoa mai emoji
    function createHoaMai() {
        const hoaMai = document.createElement('div');
        hoaMai.className = 'hoa-mai';
        hoaMai.innerHTML = HOA_MAI_EMOJIS[Math.floor(Math.random() * HOA_MAI_EMOJIS.length)];
        
        // Random vị trí và kích thước
        const size = Math.random() * 20 + 15; // 15-35px
        const left = Math.random() * 100;
        const duration = Math.random() * 5 + 8; // 8-13s
        const delay = Math.random() * 10;
        
        hoaMai.style.cssText = `
            left: ${left}%;
            font-size: ${size}px;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
        `;
        
        return hoaMai;
    }

    // Tạo hoa mai từ hình ảnh
    function createHoaMaiImage() {
        const hoaMai = document.createElement('img');
        hoaMai.className = 'hoa-mai-image';
        
        // Xác định đường dẫn dựa trên vị trí trang
        let imagePath = HOA_MAI_IMAGE;
        if (window.location.pathname.includes('/pages/')) {
            imagePath = '../' + HOA_MAI_IMAGE;
        }
        hoaMai.src = imagePath;
        hoaMai.alt = 'Hoa mai';
        
        // Random vị trí và kích thước
        const size = Math.random() * 30 + 40; // 40-70px
        const left = Math.random() * 100;
        const duration = Math.random() * 6 + 10; // 10-16s
        const delay = Math.random() * 12;
        
        hoaMai.style.cssText = `
            left: ${left}%;
            width: ${size}px;
            height: auto;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
        `;
        
        return hoaMai;
    }

    // Tạo nút toggle
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.className = 'effects-toggle';
        btn.id = 'effectsToggle';
        btn.innerHTML = '🌸';
        btn.title = 'Bật/Tắt hiệu ứng mùa xuân';
        btn.onclick = toggleEffects;
        document.body.appendChild(btn);
    }

    // Bật/tắt hiệu ứng
    function toggleEffects() {
        isPaused = !isPaused;
        const btn = document.getElementById('effectsToggle');
        
        if (isPaused) {
            container.style.display = 'none';
            btn.classList.add('paused');
            btn.innerHTML = '⏸️';
            btn.title = 'Bật hiệu ứng mùa xuân';
        } else {
            container.style.display = 'block';
            btn.classList.remove('paused');
            btn.innerHTML = '🌸';
            btn.title = 'Tắt hiệu ứng mùa xuân';
        }
        
        // Lưu trạng thái
        localStorage.setItem('seasonalEffectsPaused', isPaused);
    }

    // Khởi tạo hiệu ứng
    function init() {
        if (!CONFIG.enabled) return;

        // Kiểm tra trạng thái đã lưu
        const savedState = localStorage.getItem('seasonalEffectsPaused');
        if (savedState === 'true') {
            isPaused = true;
        }

        // Tạo container
        createContainer();

        // Tạo hoa mai emoji
        for (let i = 0; i < CONFIG.hoaMaiCount; i++) {
            container.appendChild(createHoaMai());
        }

        // Tạo hoa mai hình ảnh
        for (let i = 0; i < CONFIG.hoaMaiImageCount; i++) {
            container.appendChild(createHoaMaiImage());
        }

        // Không tạo nút toggle - hiệu ứng luôn bật
    }

    // Chạy khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
