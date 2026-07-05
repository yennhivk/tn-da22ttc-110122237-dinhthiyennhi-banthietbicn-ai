const jwt = require('jsonwebtoken');
const db = require('../config/database');

// ==========================================
// MIDDLEWARE XÁC THỰC
// ==========================================
const authenticateToken = (req, res, next) => {
    // Log chi trong development mode
    if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [Auth] Checking token for:', req.path);
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        if (process.env.NODE_ENV === 'development') {
            console.log('❌ [Auth] No token found');
        }
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy token xác thực'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            // Chi log loi khong phai TokenExpiredError (expired la binh thuong)
            if (err.name !== 'TokenExpiredError') {
                console.log('❌ Token verification failed:', err.name, err.message);
            }
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({
                    success: false,
                    message: 'Token đã hết hạn, vui lòng đăng nhập lại',
                    expired: true
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
        // Log chi trong development mode de giam noise terminal
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ [Auth] Token valid for user:', user.ma_tai_khoan, user.vai_tro);
        }
        req.user = user;
        next();
    });
};

// ==========================================
// MIDDLEWARE KIỂM TRA QUYỀN ADMIN HOẶC NHÂN VIÊN ĐƯỢC PHÂN QUYỀN
// ==========================================
const requireAdmin = async (req, res, next) => {
    const performCheck = async () => {
        // 1. Nếu là admin tối cao (vai_tro === 'admin'), cho phép ngay lập tức
        if (req.user.vai_tro === 'admin' || req.user.chuc_vu?.toLowerCase().includes('admin')) {
            return next();
        }

        // 2. Nếu là nhân viên thường, kiểm tra phân quyền chi tiết từ database
        if (req.user.vai_tro === 'nhan_vien') {
            const employeeId = req.user.ma_nhan_vien;
            if (!employeeId) {
                return res.status(403).json({
                    success: false,
                    message: 'Không tìm thấy thông tin nhân viên'
                });
            }

            // Ánh xạ API path & method sang Quyền tương ứng
            const permission = getRequiredPermission(req.method, req.path, req);
            
            if (!permission) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập chức năng quản trị này'
                });
            }

            try {
                // Lấy phân quyền của nhân viên này từ DB
                const [permissions] = await db.query(
                    'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?',
                    [employeeId]
                );

                if (permissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Nhân viên chưa được phân quyền. Vui lòng liên hệ Admin.'
                    });
                }

                const userPermissions = typeof permissions[0].quyen === 'string'
                    ? JSON.parse(permissions[0].quyen)
                    : permissions[0].quyen;

                // Kiểm tra xem nhân viên có quyền cụ thể này không
                if (userPermissions && userPermissions[permission] === true) {
                    return next();
                }

                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện hành động này',
                    required_permission: permission
                });

            } catch (error) {
                console.error('❌ [AuthMiddleware] Database permission check failed:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Lỗi kiểm tra quyền hạn nhân viên: ' + error.message
                });
            }
        }

        // 3. Các vai trò khác đều bị từ chối
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập'
        });
    };

    // Nếu req.user chưa được set (chưa đi qua authenticateToken), tiến hành xác thực trước
    if (!req.user) {
        return authenticateToken(req, res, async (err) => {
            if (err) return next(err);
            await performCheck();
        });
    }

    await performCheck();
};

/**
 * Hàm phân tích và ánh xạ API Path + Method sang Quyền tương ứng
 */
function getRequiredPermission(method, urlPath, req) {
    // Chuẩn hóa path (bỏ query parameters, bỏ slash cuối)
    let cleanPath = urlPath.split('?')[0];
    if (cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }

    // 1. Quản lý phân quyền & log hoạt động
    if (cleanPath.startsWith('permissions')) {
        return 'manage_permissions';
    }
    if (cleanPath.startsWith('activity-log')) {
        return 'view_settings';
    }

    // 2. Dashboard
    if (cleanPath === 'dashboard') {
        return 'view_reports';
    }

    // 3. Nhân viên & Ca làm, lương, điểm danh
    if (cleanPath.startsWith('employees') || cleanPath.startsWith('shifts') || cleanPath.startsWith('attendance') || cleanPath.startsWith('payroll')) {
        if (method === 'GET') return 'view_employees';
        if (method === 'POST') return 'add_employee';
        if (method === 'PUT' || method === 'PATCH') return 'edit_employee';
        if (method === 'DELETE') return 'delete_employee';
        return 'view_employees';
    }

    // 4. Sản phẩm & Danh mục (products, categories, reviews, promotions)
    if (cleanPath.startsWith('products') || cleanPath.startsWith('categories') || cleanPath.startsWith('reviews') || cleanPath.startsWith('promotions')) {
        if (method === 'GET') return 'view_products';
        if (method === 'POST') return 'add_product';
        if (method === 'PUT' || method === 'PATCH') return 'edit_product';
        if (method === 'DELETE') return 'delete_product';
        return 'view_products';
    }

    // 5. Đơn hàng & POS (orders, pos/orders, pos-machines)
    if (cleanPath.startsWith('orders') || cleanPath.startsWith('pos')) {
        if (method === 'GET') return 'view_orders';
        if (method === 'POST') return 'create_orders';
        if (method === 'PUT' || method === 'PATCH') {
            // Kiểm tra trạng thái hủy đơn hàng trong body
            const status = req.body?.status || req.body?.trang_thai;
            if (status === 'cancelled' || status === 'huy' || status === 'da_huy') {
                return 'cancel_orders';
            }
            return 'edit_orders';
        }
        if (method === 'DELETE') return 'delete_orders';
        return 'view_orders';
    }
    if (cleanPath.startsWith('pos-machines')) {
        if (method === 'GET') return 'view_settings';
        return 'create_orders';
    }

    // 6. Khách hàng (users, online-customers, store-customers, personalization)
    if (cleanPath.startsWith('users')) {
        if (method === 'GET') return 'view_customers';
        if (method === 'POST') return 'add_customer';
        if (method === 'PUT' || method === 'PATCH') return 'edit_customer';
        if (method === 'DELETE') return 'delete_customer';
        return 'view_customers';
    }

    // 7. Kho (receiving, inventory, suppliers, components)
    if (cleanPath.startsWith('receiving') || cleanPath.startsWith('inventory') || cleanPath.startsWith('suppliers') || cleanPath.startsWith('components')) {
        if (method === 'GET') {
            if (cleanPath.startsWith('suppliers')) return 'view_suppliers';
            return 'view_warehouse';
        }
        if (method === 'POST') return 'add_ingredient';
        if (method === 'PUT' || method === 'PATCH') return 'edit_inventory';
        return 'view_warehouse';
    }

    // 8. Cài đặt hệ thống (settings, notifications, flash-sale)
    if (cleanPath.startsWith('settings') || cleanPath.startsWith('notifications') || cleanPath.startsWith('flash-sale')) {
        if (method === 'GET') return 'view_settings';
        return 'edit_settings';
    }

    return null;
}

module.exports = {
    authenticateToken,
    requireAdmin
};
