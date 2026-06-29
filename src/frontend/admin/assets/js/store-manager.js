/**
 * STORE MANAGER - Quản lý thông tin cửa hàng với Auto Geocoding
 */

class StoreManager {
    constructor() {
        this.currentStore = null;
        this.isGeocoding = false;
    }
    
    /**
     * Load danh sách cửa hàng
     */
    async loadStores() {
        try {
            const response = await fetch('/api/shipping-config/stores', {
                headers: {
                    'Authorization': 'Bearer ' + this.getToken()
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.renderStoresTable(result.data);
            }
        } catch (error) {
            console.error('Load stores error:', error);
            this.showNotification('Lỗi khi tải danh sách cửa hàng', 'error');
        }
    }
    
    /**
     * Render bảng danh sách cửa hàng
     */
    renderStoresTable(stores) {
        const tbody = document.querySelector('#stores-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = stores.map(store => `
            <tr>
                <td>${store.ten_cua_hang}</td>
                <td>${store.dia_chi_day_du}</td>
                <td>${store.tinh_thanh || '-'}</td>
                <td>
                    <small>
                        Lat: ${store.vi_do}<br>
                        Lng: ${store.kinh_do}
                    </small>
                </td>
                <td>
                    ${store.la_mac_dinh ? '<span class="badge badge-primary">Mặc định</span>' : ''}
                    ${store.trang_thai === 'active' ? '<span class="badge badge-success">Hoạt động</span>' : '<span class="badge badge-secondary">Tạm dừng</span>'}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="storeManager.editStore(${store.ma_cua_hang})">
                        ✏️ Sửa
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    /**
     * Mở form chỉnh sửa cửa hàng
     */
    async editStore(storeId) {
        try {
            const response = await fetch(`/api/shipping-config/stores`, {
                headers: {
                    'Authorization': 'Bearer ' + this.getToken()
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentStore = result.data.find(s => s.ma_cua_hang === storeId);
                if (this.currentStore) {
                    this.showEditModal(this.currentStore);
                }
            }
        } catch (error) {
            console.error('Edit store error:', error);
        }
    }
    
    /**
     * Hiển thị modal chỉnh sửa
     */
    showEditModal(store) {
        const modal = document.getElementById('edit-store-modal');
        if (!modal) return;
        
        // Điền dữ liệu vào form
        document.getElementById('edit-store-id').value = store.ma_cua_hang;
        document.getElementById('edit-ten-cua-hang').value = store.ten_cua_hang;
        document.getElementById('edit-dia-chi').value = store.dia_chi_day_du;
        document.getElementById('edit-tinh-thanh').value = store.tinh_thanh || '';
        document.getElementById('edit-quan-huyen').value = store.quan_huyen || '';
        document.getElementById('edit-phuong-xa').value = store.phuong_xa || '';
        document.getElementById('edit-kinh-do').value = store.kinh_do;
        document.getElementById('edit-vi-do').value = store.vi_do;
        document.getElementById('edit-so-dien-thoai').value = store.so_dien_thoai || '';
        document.getElementById('edit-email').value = store.email || '';
        document.getElementById('edit-la-mac-dinh').checked = store.la_mac_dinh;
        document.getElementById('edit-trang-thai').value = store.trang_thai;
        
        // Hiển thị modal
        $(modal).modal('show');
    }
    
    /**
     * TỰ ĐỘNG GEOCODING khi địa chỉ thay đổi
     */
    async autoGeocodeAddress(addressFieldId, latFieldId, lngFieldId) {
        const addressField = document.getElementById(addressFieldId);
        const latField = document.getElementById(latFieldId);
        const lngField = document.getElementById(lngFieldId);
        
        if (!addressField || !latField || !lngField) return;
        
        const address = addressField.value.trim();
        
        if (!address || address.length < 10) {
            return;
        }
        
        if (this.isGeocoding) {
            console.log('Geocoding in progress...');
            return;
        }
        
        this.isGeocoding = true;
        this.showGeocodingStatus('Đang lấy tọa độ...', 'info');
        
        try {
            const response = await fetch('/api/shipping-config/geocode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getToken()
                },
                body: JSON.stringify({ address })
            });
            
            const result = await response.json();
            
            if (result.success) {
                latField.value = result.data.latitude;
                lngField.value = result.data.longitude;
                
                // Highlight fields to show they've been updated
                latField.classList.add('field-updated');
                lngField.classList.add('field-updated');
                
                setTimeout(() => {
                    latField.classList.remove('field-updated');
                    lngField.classList.remove('field-updated');
                }, 2000);
                
                this.showGeocodingStatus('✅ Đã lấy tọa độ tự động', 'success');
            } else {
                this.showGeocodingStatus('⚠️ Không tìm thấy tọa độ', 'warning');
            }
        } catch (error) {
            console.error('Auto geocode error:', error);
            this.showGeocodingStatus('❌ Lỗi khi lấy tọa độ', 'error');
        } finally {
            this.isGeocoding = false;
        }
    }
    
    /**
     * Lưu thay đổi cửa hàng
     */
    async saveStore() {
        const storeId = document.getElementById('edit-store-id').value;
        const formData = {
            ten_cua_hang: document.getElementById('edit-ten-cua-hang').value,
            dia_chi_day_du: document.getElementById('edit-dia-chi').value,
            tinh_thanh: document.getElementById('edit-tinh-thanh').value,
            quan_huyen: document.getElementById('edit-quan-huyen').value,
            phuong_xa: document.getElementById('edit-phuong-xa').value,
            kinh_do: parseFloat(document.getElementById('edit-kinh-do').value),
            vi_do: parseFloat(document.getElementById('edit-vi-do').value),
            so_dien_thoai: document.getElementById('edit-so-dien-thoai').value,
            email: document.getElementById('edit-email').value,
            la_mac_dinh: document.getElementById('edit-la-mac-dinh').checked,
            trang_thai: document.getElementById('edit-trang-thai').value,
            auto_geocode: document.getElementById('edit-auto-geocode').checked
        };
        
        try {
            const response = await fetch(`/api/shipping-config/stores/${storeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getToken()
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ Cập nhật cửa hàng thành công!', 'success');
                
                // Cập nhật tọa độ nếu có auto-geocode
                if (result.data && result.data.auto_geocoded) {
                    document.getElementById('edit-kinh-do').value = result.data.kinh_do;
                    document.getElementById('edit-vi-do').value = result.data.vi_do;
                }
                
                // Đóng modal và reload
                $('#edit-store-modal').modal('hide');
                setTimeout(() => this.loadStores(), 500);
            } else {
                this.showNotification('❌ ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Save store error:', error);
            this.showNotification('❌ Lỗi khi lưu thay đổi', 'error');
        }
    }
    
    /**
     * Hiển thị trạng thái geocoding
     */
    showGeocodingStatus(message, type) {
        const statusEl = document.getElementById('geocoding-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `geocoding-status ${type}`;
        statusEl.style.display = 'block';
        
        if (type === 'success' || type === 'warning') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Hiển thị notification
     */
    showNotification(message, type) {
        // Sử dụng toastr hoặc alert
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }
    
    /**
     * Lấy token từ localStorage
     */
    getToken() {
        return localStorage.getItem('admin_token') || '';
    }
}

// Initialize
const storeManager = new StoreManager();

// Auto-load on page ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stores-table')) {
        storeManager.loadStores();
    }
    
    // Setup auto-geocoding on address field change
    const addressField = document.getElementById('edit-dia-chi');
    if (addressField) {
        let geocodeTimeout;
        addressField.addEventListener('input', () => {
            clearTimeout(geocodeTimeout);
            geocodeTimeout = setTimeout(() => {
                const autoGeocode = document.getElementById('edit-auto-geocode');
                if (autoGeocode && autoGeocode.checked) {
                    storeManager.autoGeocodeAddress('edit-dia-chi', 'edit-vi-do', 'edit-kinh-do');
                }
            }, 1500); // Debounce 1.5 giây
        });
    }
});
