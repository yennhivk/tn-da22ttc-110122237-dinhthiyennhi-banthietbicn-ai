// Permissions Management System
const API_BASE_URL = window.location.origin;

// Permission modules configuration
const PERMISSION_MODULES = {
    orders: {
        title: 'Quản lý Đơn hàng',
        icon: '🛒',
        permissions: [
            { key: 'view_orders', label: 'Xem đơn hàng' },
            { key: 'create_orders', label: 'Tạo đơn hàng' },
            { key: 'edit_orders', label: 'Sửa đơn hàng' },
            { key: 'delete_orders', label: 'Xóa đơn hàng' },
            { key: 'cancel_orders', label: 'Hủy đơn hàng' }
        ]
    },
    customers: {
        title: 'Quản lý Khách hàng',
        icon: '👥',
        permissions: [
            { key: 'view_customers', label: 'Xem khách hàng' },
            { key: 'add_customer', label: 'Thêm khách hàng' },
            { key: 'edit_customer', label: 'Sửa khách hàng' },
            { key: 'delete_customer', label: 'Xóa khách hàng' }
        ]
    },
    warehouse: {
        title: 'Quản lý Kho',
        icon: '📦',
        permissions: [
            { key: 'view_warehouse', label: 'Xem kho' },
            { key: 'add_ingredient', label: 'Thêm nguyên liệu' },
            { key: 'edit_inventory', label: 'Sửa tồn kho' },
            { key: 'view_suppliers', label: 'Xem nhà cung cấp' }
        ]
    },
    employees: {
        title: 'Quản lý Nhân viên',
        icon: '👨‍💼',
        permissions: [
            { key: 'view_employees', label: 'Xem nhân viên' },
            { key: 'add_employee', label: 'Thêm nhân viên' },
            { key: 'edit_employee', label: 'Sửa nhân viên' },
            { key: 'delete_employee', label: 'Xóa nhân viên' }
        ]
    },
    products: {
        title: 'Quản lý Sản phẩm',
        icon: '📱',
        permissions: [
            { key: 'view_products', label: 'Xem sản phẩm' },
            { key: 'add_product', label: 'Thêm sản phẩm' },
            { key: 'edit_product', label: 'Sửa sản phẩm' },
            { key: 'delete_product', label: 'Xóa sản phẩm' }
        ]
    },
    reports: {
        title: 'Quản lý Báo cáo',
        icon: '📊',
        permissions: [
            { key: 'view_reports', label: 'Xem báo cáo' },
            { key: 'export_reports', label: 'Xuất báo cáo' },
            { key: 'view_financial', label: 'Xem tài chính' },
            { key: 'view_analytics', label: 'Xem phân tích' }
        ]
    },
    settings: {
        title: 'Cài đặt Hệ thống',
        icon: '⚙️',
        permissions: [
            { key: 'view_settings', label: 'Xem cài đặt' },
            { key: 'edit_settings', label: 'Sửa cài đặt' },
            { key: 'manage_permissions', label: 'Quản lý phân quyền' },
            { key: 'system_backup', label: 'Sao lưu hệ thống' }
        ]
    }
};

// Get employee ID from URL
function getEmployeeIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Current employee data
let currentEmployee = null;
let currentPermissions = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const employeeId = getEmployeeIdFromURL();
    
    console.log('=== PERMISSION PAGE INIT ===');
    console.log('Employee ID from URL:', employeeId);
    
    // Luôn dùng admin_token (xóa adminToken cũ nếu tồn tại)
    localStorage.removeItem('adminToken');
    const token = localStorage.getItem('admin_token');
    console.log('Admin Token (admin_token):', token ? 'Present' : 'Missing');
    console.log('API Base URL:', API_BASE_URL);
    
    if (!employeeId) {
        alert('⚠️ Không tìm thấy thông tin nhân viên trong URL.\n\nURL phải có dạng: permissions.html?id=<ma_nhan_vien>');
        window.location.href = 'admin.html';
        return;
    }

    if (!token) {
        alert('⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = 'admin-login.html';
        return;
    }

    // Kiểm tra token có hợp lệ không trước khi tải dữ liệu
    showLoading();
    try {
        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            const isExpired = errData.expired || verifyRes.status === 403;
            // Xóa token cũ đã hết hạn
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            alert(`⚠️ ${isExpired ? 'Token đã hết hạn' : 'Không có quyền admin'}. Vui lòng đăng nhập lại.`);
            window.location.href = 'admin-login.html';
            return;
        }
    } catch (err) {
        console.error('Token verification failed:', err);
        // Nếu không kết nối được, vẫn thử tiếp (có thể server đang khởi động)
    } finally {
        hideLoading();
    }

    await loadEmployeeData(employeeId);
    await loadEmployeePermissions(employeeId);
    renderEmployeeCard();
    renderPermissionsGrid();
});


// Load employee data
async function loadEmployeeData(employeeId) {
    showLoading();
    try {
        console.log('Loading employee data for ID:', employeeId);
        
        // Lấy token chuẩn admin_token
        const token = localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/employees/${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error response:', errorData);
            let msg = 'Không thể tải thông tin nhân viên';
            try {
                const errObj = JSON.parse(errorData);
                if (errObj && errObj.message) {
                    msg += ` - ${errObj.message}`;
                } else {
                    msg += ` - Status: ${response.status}`;
                }
            } catch (e) {
                msg += ` - Status: ${response.status} (${errorData.substring(0, 50)})`;
            }
            throw new Error(msg);
        }

        const data = await response.json();
        console.log('Employee data received:', data);

        if (data.success && data.data) {
            currentEmployee = data.data;
        } else if (data.ma_nhan_vien) {
            // Trường hợp API trả về data trực tiếp không wrap trong success
            currentEmployee = data;
        } else {
            throw new Error('Không tìm thấy thông tin nhân viên');
        }

        console.log('Current employee set:', currentEmployee);
    } catch (error) {
        console.error('Error loading employee:', error);
        alert('Lỗi khi tải thông tin nhân viên: ' + error.message);
        window.location.href = 'admin.html';
    } finally {
        hideLoading();
    }
}

// Load employee permissions
async function loadEmployeePermissions(employeeId) {
    try {
        // Lấy token chuẩn admin_token
        const token = localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/permissions/${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentPermissions = data.data?.permissions || {};
        } else {
            // If no permissions exist, initialize with defaults
            currentPermissions = getDefaultPermissions();
        }
    } catch (error) {
        console.error('Error loading permissions:', error);
        currentPermissions = getDefaultPermissions();
    }
}

// Get default permissions based on role
function getDefaultPermissions() {
    const role = currentEmployee?.chuc_vu?.toLowerCase() || 'nhan_vien';
    const defaults = {};

    if (role.includes('admin') || role.includes('quản lý') || role.includes('quan ly')) {
        // Admin/Manager has all permissions
        Object.keys(PERMISSION_MODULES).forEach(module => {
            PERMISSION_MODULES[module].permissions.forEach(perm => {
                defaults[perm.key] = true;
            });
        });
    } else if (role.includes('manager') || role.includes('truong phong')) {
        // Manager has most permissions except system settings
        Object.keys(PERMISSION_MODULES).forEach(module => {
            if (module !== 'settings') {
                PERMISSION_MODULES[module].permissions.forEach(perm => {
                    defaults[perm.key] = true;
                });
            }
        });
    } else {
        // Regular employee has limited permissions
        defaults['view_orders'] = true;
        defaults['view_customers'] = true;
        defaults['view_products'] = true;
    }

    return defaults;
}

// Render employee card
function renderEmployeeCard() {
    if (!currentEmployee) return;

    const employeeCard = document.getElementById('employee-card');
    const roleClass = getRoleClass(currentEmployee.chuc_vu);
    
    const avatarHTML = currentEmployee.anh_dai_dien 
        ? `<img src="${currentEmployee.anh_dai_dien}" alt="${currentEmployee.ho_ten}" class="employee-avatar">`
        : `<div class="employee-avatar flex items-center justify-center bg-gray-300 text-white font-bold text-xl">
            ${currentEmployee.ho_ten.charAt(0)}
           </div>`;

    employeeCard.innerHTML = `
        ${avatarHTML}
        <div class="flex-1">
            <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-gray-800">${currentEmployee.ho_ten}</h2>
                <span class="role-badge ${roleClass}">${currentEmployee.chuc_vu}</span>
                <span class="status-active">Đang làm việc</span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>📧 ${currentEmployee.email || 'Chưa có email'}</span>
                <span>📱 ${currentEmployee.so_dien_thoai || 'Chưa có SĐT'}</span>
                <span>🆔 NV#${currentEmployee.ma_nhan_vien}</span>
                <span>📅 Ngày vào: ${formatDate(currentEmployee.ngay_vao_lam)}</span>
            </div>
        </div>
        <div class="text-right">
            <div class="permission-count" id="active-permissions-count">
                0 / ${getTotalPermissionsCount()} quyền
            </div>
        </div>
    `;

    updatePermissionCount();
}

// Render permissions grid
function renderPermissionsGrid() {
    const grid = document.getElementById('permissions-grid');
    grid.innerHTML = '';

    Object.keys(PERMISSION_MODULES).forEach(moduleKey => {
        const module = PERMISSION_MODULES[moduleKey];
        const card = createPermissionCard(moduleKey, module);
        grid.appendChild(card);
    });
}

// Create permission card
function createPermissionCard(moduleKey, module) {
    const card = document.createElement('div');
    card.className = 'permission-card';

    const activeCount = module.permissions.filter(p => currentPermissions[p.key]).length;
    const totalCount = module.permissions.length;

    card.innerHTML = `
        <div class="section-header">
            <span class="permission-icon">${module.icon}</span>
            <span>${module.title}</span>
            <span class="permission-count ml-auto">${activeCount}/${totalCount}</span>
        </div>
        <div class="space-y-2">
            ${module.permissions.map(perm => createPermissionItem(perm)).join('')}
        </div>
    `;

    return card;
}

// Create permission item
function createPermissionItem(permission) {
    const isChecked = currentPermissions[permission.key] || false;

    return `
        <div class="permission-item">
            <span class="text-sm font-medium text-gray-700">${permission.label}</span>
            <label class="toggle-switch">
                <input type="checkbox" 
                       data-permission="${permission.key}" 
                       ${isChecked ? 'checked' : ''}
                       onchange="togglePermission('${permission.key}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </div>
    `;
}

// Toggle permission
function togglePermission(key, value) {
    currentPermissions[key] = value;
    updatePermissionCount();
    updateModuleCount();
}

// Enable all permissions
function enableAllPermissions() {
    Object.keys(PERMISSION_MODULES).forEach(moduleKey => {
        PERMISSION_MODULES[moduleKey].permissions.forEach(perm => {
            currentPermissions[perm.key] = true;
        });
    });
    renderPermissionsGrid();
    updatePermissionCount();
}

// Disable all permissions
function disableAllPermissions() {
    if (!confirm('Bạn có chắc chắn muốn tắt tất cả quyền?')) return;
    
    Object.keys(currentPermissions).forEach(key => {
        currentPermissions[key] = false;
    });
    renderPermissionsGrid();
    updatePermissionCount();
}

// Reset to default
function resetToDefault() {
    if (!confirm('Đặt lại quyền về mặc định dựa trên vai trò?')) return;
    
    currentPermissions = getDefaultPermissions();
    renderPermissionsGrid();
    updatePermissionCount();
}

// Update permission count
function updatePermissionCount() {
    const activeCount = Object.values(currentPermissions).filter(v => v).length;
    const totalCount = getTotalPermissionsCount();
    
    const countElement = document.getElementById('active-permissions-count');
    if (countElement) {
        countElement.textContent = `${activeCount} / ${totalCount} quyền`;
    }
}

// Update module count
function updateModuleCount() {
    Object.keys(PERMISSION_MODULES).forEach(moduleKey => {
        const module = PERMISSION_MODULES[moduleKey];
        const activeCount = module.permissions.filter(p => currentPermissions[p.key]).length;
        const totalCount = module.permissions.length;
        
        const countElements = document.querySelectorAll('.permission-count');
        countElements.forEach(el => {
            const parent = el.closest('.permission-card');
            if (parent && parent.querySelector('.section-header').textContent.includes(module.title)) {
                el.textContent = `${activeCount}/${totalCount}`;
            }
        });
    });
}

// Get total permissions count
function getTotalPermissionsCount() {
    return Object.keys(PERMISSION_MODULES).reduce((total, moduleKey) => {
        return total + PERMISSION_MODULES[moduleKey].permissions.length;
    }, 0);
}

// Save permissions
async function savePermissions() {
    const employeeId = getEmployeeIdFromURL();
    if (!employeeId) return;

    showLoading();

    try {
        // Lấy token chuẩn admin_token
        const token = localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/permissions/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                permissions: currentPermissions
            })
        });

        if (!response.ok) throw new Error('Không thể lưu phân quyền');

        alert('✅ Đã lưu phân quyền thành công!');
        
        // Log activity
        await logActivity(employeeId);
        
    } catch (error) {
        console.error('Error saving permissions:', error);
        alert('❌ Lỗi khi lưu phân quyền: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Log activity
async function logActivity(employeeId) {
    try {
        // Lấy token chuẩn admin_token
        const token = localStorage.getItem('admin_token');
        
        await fetch(`${API_BASE_URL}/api/admin/activity-log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'update_permissions',
                target: 'employee',
                target_id: employeeId,
                description: `Cập nhật phân quyền cho nhân viên ${currentEmployee?.ho_ten}`
            })
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Helper functions
function getRoleClass(role) {
    const roleLower = (role || '').toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('quản lý')) return 'role-admin';
    if (roleLower.includes('manager') || roleLower.includes('trưởng phòng')) return 'role-manager';
    return 'role-waiter';
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa rõ';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}
