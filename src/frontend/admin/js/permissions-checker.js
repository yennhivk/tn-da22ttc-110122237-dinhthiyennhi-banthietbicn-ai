/**
 * Permission Checker - Frontend Utility
 * Kiểm tra và quản lý quyền ở phía frontend
 */

class PermissionChecker {
    constructor() {
        this.permissions = {};
        this.loaded = false;
    }

    /**
     * Load quyền từ server
     */
    async load() {
        try {
            // Lấy token với cả 2 tên
            const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
            if (!token) {
                console.warn('No admin token found');
                return false;
            }

            const response = await fetch(window.location.origin + '/api/admin/my-permissions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.permissions = data.data.permissions || {};
                    this.loaded = true;
                    
                    // Lưu vào localStorage để cache
                    localStorage.setItem('userPermissions', JSON.stringify(this.permissions));
                    
                    console.log('✅ Permissions loaded:', Object.keys(this.permissions).length, 'permissions');
                    return true;
                }
            }

            console.warn('Failed to load permissions from server');
            return false;
        } catch (error) {
            console.error('Error loading permissions:', error);
            
            // Fallback: load từ localStorage
            const cached = localStorage.getItem('userPermissions');
            if (cached) {
                this.permissions = JSON.parse(cached);
                this.loaded = true;
                console.log('✅ Using cached permissions');
                return true;
            }
            
            return false;
        }
    }

    /**
     * Kiểm tra có quyền không
     */
    has(permission) {
        if (!this.loaded) {
            console.warn('Permissions not loaded yet. Call load() first.');
            return false;
        }
        return this.permissions[permission] === true;
    }

    /**
     * Kiểm tra có ít nhất 1 trong các quyền
     */
    hasAny(permissions) {
        return permissions.some(perm => this.has(perm));
    }

    /**
     * Kiểm tra có tất cả các quyền
     */
    hasAll(permissions) {
        return permissions.every(perm => this.has(perm));
    }

    /**
     * Ẩn/hiện element dựa trên quyền
     */
    toggleElement(elementId, permission) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (this.has(permission)) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    }

    /**
     * Ẩn/hiện nhiều elements dựa trên quyền
     */
    toggleElements(selector, permission) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (this.has(permission)) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Disable/enable button dựa trên quyền
     */
    toggleButton(buttonId, permission, disabledText = 'Không có quyền') {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (this.has(permission)) {
            button.disabled = false;
            button.removeAttribute('title');
        } else {
            button.disabled = true;
            button.setAttribute('title', disabledText);
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.5';
        }
    }

    /**
     * Tạo permission badge HTML
     */
    createBadge(permission, label) {
        const hasPermission = this.has(permission);
        const color = hasPermission ? 'green' : 'gray';
        const icon = hasPermission ? '✓' : '✗';
        
        return `
            <span class="permission-badge" style="
                background: ${hasPermission ? '#dcfce7' : '#f3f4f6'};
                color: ${hasPermission ? '#166534' : '#6b7280'};
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            ">
                ${icon} ${label}
            </span>
        `;
    }

    /**
     * Hiển thị tất cả quyền trong console
     */
    debug() {
        console.log('Current Permissions:');
        console.table(this.permissions);
    }

    /**
     * Export quyền sang CSV
     */
    exportToCSV() {
        const rows = [['Permission', 'Granted']];
        Object.entries(this.permissions).forEach(([key, value]) => {
            rows.push([key, value ? 'Yes' : 'No']);
        });
        
        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_permissions.csv';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Reset và clear cache
     */
    clear() {
        this.permissions = {};
        this.loaded = false;
        localStorage.removeItem('userPermissions');
    }
}

// Tạo instance global
window.permissionChecker = new PermissionChecker();

// Auto-load khi trang được load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.permissionChecker.load();
    });
} else {
    window.permissionChecker.load();
}

// Helper functions để sử dụng trực tiếp
window.hasPermission = (permission) => window.permissionChecker.has(permission);
window.hasAnyPermission = (permissions) => window.permissionChecker.hasAny(permissions);
window.hasAllPermissions = (permissions) => window.permissionChecker.hasAll(permissions);
