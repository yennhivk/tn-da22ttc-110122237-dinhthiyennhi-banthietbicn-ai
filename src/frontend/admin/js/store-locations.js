// ==========================================
// QUẢN LÝ ĐỊA CHỈ CỬA HÀNG
// ==========================================

// Load danh sách cửa hàng
async function loadStores() {
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_URL}/shipping-config/stores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayStores(result.data);
        }
    } catch (error) {
        console.error('Load stores error:', error);
    }
}

function buildStoreMapQuery(store = {}) {
    // Ưu tiên dùng địa chỉ text, không dùng tọa độ để tránh sai thứ tự
    const address = String(store.dia_chi_day_du || '').trim();
    if (address) return encodeURIComponent(address);
    
    // Nếu không có địa chỉ, sử dụng tọa độ với format chuẩn: latitude,longitude
    if (store.vi_do && store.kinh_do) {
        // Đảm bảo vĩ độ (latitude) luôn ở trước, kinh độ (longitude) sau
        const lat = parseFloat(store.vi_do);
        const lng = parseFloat(store.kinh_do);
        
        // Kiểm tra xem có bị nhầm lẫn không (latitude phải < 90, longitude có thể > 90 ở VN)
        if (lat > 90 && lng < 90) {
            // Nếu bị ngược, đảo lại
            console.warn(`Tọa độ có vẻ bị ngược cho cửa hàng ${store.ten_cua_hang}: lat=${lat}, lng=${lng}. Đang tự động sửa...`);
            return `${lng},${lat}`;
        }
        
        return `${lat},${lng}`;
    }
    
    return encodeURIComponent('74-76 Lê Lợi, Phường 2, Thành phố Trà Vinh, Trà Vinh');
}

function buildStoreGoogleMapsUrl(store = {}) {
    // Luôn ưu tiên sử dụng địa chỉ text thay vì tọa độ để tránh nhầm lẫn
    const query = buildStoreMapQuery(store);
    return `https://www.google.com/maps?q=${query}`;
}

// Hiển thị danh sách cửa hàng
function displayStores(stores) {
    const container = document.getElementById('stores-list');
    
    if (stores.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-400 mb-4">Chưa có cửa hàng nào</p>
                <button onclick="showAddStoreModal()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold">
                    ➕ Thêm cửa hàng đầu tiên
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = stores.map(store => `
        <div class="bg-white border-2 ${store.la_mac_dinh ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-6 hover:shadow-lg transition">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-xl text-gray-800 mb-1">${store.ten_cua_hang}</h3>
                    ${store.la_mac_dinh ? '<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">⭐ Mặc định</span>' : ''}
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${store.trang_thai === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                    ${store.trang_thai === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                </span>
            </div>
            
            <div class="space-y-3 mb-4">
                <div class="flex items-start gap-2">
                    <span class="text-gray-500 text-sm">📍</span>
                    <p class="text-sm text-gray-700 flex-1">${store.dia_chi_day_du}</p>
                </div>
                
                ${store.so_dien_thoai ? `
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500 text-sm">📞</span>
                        <p class="text-sm text-gray-700">${store.so_dien_thoai}</p>
                    </div>
                ` : ''}
                
                ${store.email ? `
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500 text-sm">✉️</span>
                        <p class="text-sm text-gray-700">${store.email}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="border-t pt-4">
                ${store.dia_chi_day_du ? `
                    <iframe 
                        width="100%" 
                        height="200" 
                        frameborder="0" 
                        style="border:0"
                        referrerpolicy="no-referrer-when-downgrade"
                        src="https://www.google.com/maps?q=${encodeURIComponent(store.dia_chi_day_du)}&output=embed&z=17"
                        class="rounded mb-3"
                        title="Bản đồ ${store.ten_cua_hang}">
                    </iframe>
                ` : `
                    <p class="text-sm text-gray-500 mb-3">Chưa có bản đồ (thiếu địa chỉ)</p>
                `}
                <div class="flex gap-2">
                    <a href="${buildStoreGoogleMapsUrl(store)}"
                       target="_blank"
                       class="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded text-sm font-semibold transition">
                        🗺️ Xem trên Google Maps
                    </a>
                </div>
            </div>
            
            <div class="flex gap-2 mt-4">
                <button onclick="editStore(${store.ma_cua_hang})" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm">
                    ✏️ Chỉnh sửa
                </button>
                ${!store.la_mac_dinh ? `
                    <button onclick="deleteStore(${store.ma_cua_hang})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm">
                        🗑️
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Hiển thị modal thêm cửa hàng
function showAddStoreModal() {
    const modal = document.createElement('div');
    modal.id = 'addStoreModal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-4">➕ Thêm Cửa Hàng Mới</h2>
                
                <form id="addStoreForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">Tên cửa hàng *</label>
                        <input type="text" id="add_ten_cua_hang" class="w-full border border-gray-300 rounded px-3 py-2" required>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Địa chỉ đầy đủ *</label>
                        <textarea id="add_dia_chi" rows="2" class="w-full border border-gray-300 rounded px-3 py-2" required placeholder="VD: 74-76 Lê Lợi, Phường 2, Trà Vinh"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Số điện thoại</label>
                            <input type="tel" id="add_so_dien_thoai" class="w-full border border-gray-300 rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Email</label>
                            <input type="email" id="add_email" class="w-full border border-gray-300 rounded px-3 py-2">
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="add_la_mac_dinh" class="w-4 h-4">
                        <label for="add_la_mac_dinh" class="text-sm font-semibold">Đặt làm cửa hàng mặc định (Origin)</label>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold">
                            💾 Thêm cửa hàng
                        </button>
                        <button type="button" onclick="closeAddStoreModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded font-semibold">
                            ❌ Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveNewStore();
    });
}

// Lưu cửa hàng mới
async function saveNewStore() {
    try {
        const token = localStorage.getItem('admin_token');
        
        const data = {
            ten_cua_hang: document.getElementById('add_ten_cua_hang').value,
            dia_chi_day_du: document.getElementById('add_dia_chi').value,
            so_dien_thoai: document.getElementById('add_so_dien_thoai').value,
            email: document.getElementById('add_email').value,
            la_mac_dinh: document.getElementById('add_la_mac_dinh').checked
        };
        
        const response = await fetch(`${API_URL}/shipping-config/stores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Thêm cửa hàng thành công!');
            closeAddStoreModal();
            loadStores();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Save store error:', error);
        alert('❌ Lỗi khi thêm cửa hàng');
    }
}

function closeAddStoreModal() {
    const modal = document.getElementById('addStoreModal');
    if (modal) modal.remove();
}

// Chỉnh sửa cửa hàng
async function editStore(id) {
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_URL}/shipping-config/stores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const store = result.data.find(s => s.ma_cua_hang === id);
        
        if (!store) return;
        
        const modal = document.createElement('div');
        modal.id = 'editStoreModal';
        modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-4">✏️ Chỉnh sửa: ${store.ten_cua_hang}</h2>
                    
                    <form id="editStoreForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Tên cửa hàng *</label>
                            <input type="text" id="edit_ten_cua_hang" value="${store.ten_cua_hang}" class="w-full border border-gray-300 rounded px-3 py-2" required>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">Địa chỉ đầy đủ *</label>
                            <textarea id="edit_dia_chi" rows="2" class="w-full border border-gray-300 rounded px-3 py-2" required>${store.dia_chi_day_du}</textarea>
                        </div>

                        ${store.dia_chi_day_du ? `
                        <div>
                            <label class="block text-sm font-semibold mb-2">🗺️ Bản đồ</label>
                            <iframe
                                width="100%"
                                height="220"
                                frameborder="0"
                                style="border:1px solid #e2e8f0; border-radius:8px"
                                referrerpolicy="no-referrer-when-downgrade"
                                src="https://www.google.com/maps?q=${encodeURIComponent(store.dia_chi_day_du)}&output=embed&z=17"
                                title="Bản đồ cửa hàng">
                            </iframe>
                        </div>
                        ` : ''}

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">Số điện thoại</label>
                                <input type="tel" id="edit_so_dien_thoai" value="${store.so_dien_thoai || ''}" class="w-full border border-gray-300 rounded px-3 py-2">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-2">Email</label>
                                <input type="email" id="edit_email" value="${store.email || ''}" class="w-full border border-gray-300 rounded px-3 py-2">
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="edit_la_mac_dinh" ${store.la_mac_dinh ? 'checked' : ''} class="w-4 h-4">
                            <label for="edit_la_mac_dinh" class="text-sm font-semibold">Đặt làm cửa hàng mặc định (Origin)</label>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-2">Trạng thái</label>
                            <select id="edit_trang_thai" class="w-full border border-gray-300 rounded px-3 py-2">
                                <option value="active" ${store.trang_thai === 'active' ? 'selected' : ''}>Hoạt động</option>
                                <option value="inactive" ${store.trang_thai === 'inactive' ? 'selected' : ''}>Tạm dừng</option>
                            </select>
                        </div>

                        <div class="flex gap-3 pt-4">
                            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold">
                                💾 Lưu thay đổi
                            </button>
                            <button type="button" onclick="closeEditStoreModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded font-semibold">
                                ❌ Hủy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('editStoreForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateStore(id);
        });
        
    } catch (error) {
        console.error('Edit store error:', error);
    }
}

// Cập nhật cửa hàng
async function updateStore(id) {
    try {
        const token = localStorage.getItem('admin_token');
        
        const data = {
            ten_cua_hang: document.getElementById('edit_ten_cua_hang').value,
            dia_chi_day_du: document.getElementById('edit_dia_chi').value,
            so_dien_thoai: document.getElementById('edit_so_dien_thoai').value,
            email: document.getElementById('edit_email').value,
            la_mac_dinh: document.getElementById('edit_la_mac_dinh').checked,
            trang_thai: document.getElementById('edit_trang_thai').value
        };
        
        const response = await fetch(`${API_URL}/shipping-config/stores/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Cập nhật thành công!');
            closeEditStoreModal();
            loadStores();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Update store error:', error);
        alert('❌ Lỗi khi cập nhật');
    }
}

function closeEditStoreModal() {
    const modal = document.getElementById('editStoreModal');
    if (modal) modal.remove();
}

// Xóa cửa hàng
async function deleteStore(id) {
    if (!confirm('Bạn có chắc muốn xóa cửa hàng này?')) return;
    
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_URL}/shipping-config/stores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Xóa thành công!');
            loadStores();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Delete store error:', error);
        alert('❌ Lỗi khi xóa');
    }
}

// Switch tabs trong shipping config
function switchShippingTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.shipping-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.remove('text-gray-600');
        } else {
            btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.add('text-gray-600');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.shipping-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    if (tab === 'zones') {
        document.getElementById('shipping-zones-tab').classList.remove('hidden');
        loadShippingZones();
    } else if (tab === 'discounts') {
        document.getElementById('shipping-discounts-tab').classList.remove('hidden');
        loadShippingDiscounts();
    }
}

// Switch tabs in store form modals (for add/edit store forms with multiple tabs)
function switchStoreFormTab(tabName) {
    // Get all tab buttons and contents in the current modal
    const modal = document.querySelector('#addStoreModal, #editStoreModal');
    if (!modal) {
        console.warn('No store modal found');
        return;
    }
    
    // Update tab buttons
    modal.querySelectorAll('[data-store-tab-btn]').forEach(btn => {
        if (btn.dataset.storeTabBtn === tabName) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-700');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
    
    // Update tab contents
    modal.querySelectorAll('[data-store-tab-content]').forEach(content => {
        if (content.dataset.storeTabContent === tabName) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

