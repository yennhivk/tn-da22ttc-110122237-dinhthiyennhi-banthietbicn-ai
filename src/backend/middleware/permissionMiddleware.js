const db = require('../config/database');

/**
 * Middleware kiểm tra quyền của nhân viên
 * @param {string} permission - Tên quyền cần kiểm tra (vd: 'create_orders', 'view_products')
 * @returns {Function} Express middleware
 */
function checkPermission(permission) {
    return async (req, res, next) => {
        try {
            // Nếu là admin, cho phép tất cả
            if (req.user?.vai_tro === 'admin' || req.user?.chuc_vu?.toLowerCase().includes('admin')) {
                return next();
            }

            const employeeId = req.user?.ma_nhan_vien;
            
            if (!employeeId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Không tìm thấy thông tin nhân viên' 
                });
            }

            // Lấy phân quyền từ database
            const [permissions] = await db.query(
                'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', 
                [employeeId]
            );

            if (permissions.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Nhân viên chưa được phân quyền. Vui lòng liên hệ quản trị viên.' 
                });
            }

            const userPermissions = typeof permissions[0].quyen === 'string' ? JSON.parse(permissions[0].quyen) : permissions[0].quyen;

            // Kiểm tra quyền cụ thể
            if (userPermissions[permission]) {
                return next();
            }

            // Ghi log truy cập trái phép
            await logUnauthorizedAccess(req, employeeId, permission);

            res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền thực hiện hành động này',
                required_permission: permission
            });

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Lỗi kiểm tra quyền: ' + error.message 
            });
        }
    };
}

/**
 * Middleware kiểm tra một trong nhiều quyền
 * @param {string[]} permissions - Mảng các quyền, chỉ cần có 1 quyền là được
 * @returns {Function} Express middleware
 */
function checkAnyPermission(permissions) {
    return async (req, res, next) => {
        try {
            // Nếu là admin, cho phép tất cả
            if (req.user?.vai_tro === 'admin' || req.user?.chuc_vu?.toLowerCase().includes('admin')) {
                return next();
            }

            const employeeId = req.user?.ma_nhan_vien;
            
            if (!employeeId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Không tìm thấy thông tin nhân viên' 
                });
            }

            const [perms] = await db.query(
                'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', 
                [employeeId]
            );

            if (perms.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Nhân viên chưa được phân quyền' 
                });
            }

            const userPermissions = typeof perms[0].quyen === 'string' ? JSON.parse(perms[0].quyen) : perms[0].quyen;

            // Kiểm tra có ít nhất 1 quyền trong danh sách
            const hasPermission = permissions.some(perm => userPermissions[perm]);

            if (hasPermission) {
                return next();
            }

            await logUnauthorizedAccess(req, employeeId, permissions.join(', '));

            res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền thực hiện hành động này',
                required_permissions: permissions
            });

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Lỗi kiểm tra quyền: ' + error.message 
            });
        }
    };
}

/**
 * Middleware kiểm tra tất cả các quyền
 * @param {string[]} permissions - Mảng các quyền, cần có tất cả
 * @returns {Function} Express middleware
 */
function checkAllPermissions(permissions) {
    return async (req, res, next) => {
        try {
            if (req.user?.vai_tro === 'admin' || req.user?.chuc_vu?.toLowerCase().includes('admin')) {
                return next();
            }

            const employeeId = req.user?.ma_nhan_vien;
            
            if (!employeeId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Không tìm thấy thông tin nhân viên' 
                });
            }

            const [perms] = await db.query(
                'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', 
                [employeeId]
            );

            if (perms.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Nhân viên chưa được phân quyền' 
                });
            }

            const userPermissions = typeof perms[0].quyen === 'string' ? JSON.parse(perms[0].quyen) : perms[0].quyen;

            // Kiểm tra có tất cả các quyền
            const hasAllPermissions = permissions.every(perm => userPermissions[perm]);

            if (hasAllPermissions) {
                return next();
            }

            await logUnauthorizedAccess(req, employeeId, permissions.join(', '));

            res.status(403).json({ 
                success: false, 
                message: 'Bạn không có đủ quyền thực hiện hành động này',
                required_permissions: permissions
            });

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Lỗi kiểm tra quyền: ' + error.message 
            });
        }
    };
}

/**
 * Lấy danh sách quyền của user hiện tại
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Object chứa các quyền
 */
async function getUserPermissions(req) {
    try {
        const employeeId = req.user?.ma_nhan_vien;
        
        if (!employeeId) {
            return {};
        }

        // Admin có tất cả quyền
        if (req.user?.vai_tro === 'admin' || req.user?.chuc_vu?.toLowerCase().includes('admin')) {
            return getAllPermissions();
        }

        const [permissions] = await db.query(
            'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', 
            [employeeId]
        );

        if (permissions.length === 0) {
            return {};
        }

        return typeof permissions[0].quyen === 'string' ? JSON.parse(permissions[0].quyen) : permissions[0].quyen;
    } catch (error) {
        console.error('Get user permissions error:', error);
        return {};
    }
}

/**
 * Trả về object chứa tất cả quyền = true (cho admin)
 */
function getAllPermissions() {
    return {
        // Orders
        view_orders: true,
        create_orders: true,
        edit_orders: true,
        delete_orders: true,
        cancel_orders: true,
        
        // Customers
        view_customers: true,
        add_customer: true,
        edit_customer: true,
        delete_customer: true,
        
        // Warehouse
        view_warehouse: true,
        add_ingredient: true,
        edit_inventory: true,
        view_suppliers: true,
        
        // Employees
        view_employees: true,
        add_employee: true,
        edit_employee: true,
        delete_employee: true,
        
        // Products
        view_products: true,
        add_product: true,
        edit_product: true,
        delete_product: true,
        
        // Reports
        view_reports: true,
        export_reports: true,
        view_financial: true,
        view_analytics: true,
        
        // Settings
        view_settings: true,
        edit_settings: true,
        manage_permissions: true,
        system_backup: true
    };
}

/**
 * Ghi log truy cập trái phép
 */
async function logUnauthorizedAccess(req, employeeId, permission) {
    try {
        await db.query(`
            INSERT INTO log_hoat_dong 
            (ma_nhan_vien, hanh_dong, doi_tuong, mo_ta, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            employeeId,
            'unauthorized_access',
            'permission',
            `Truy cập trái phép: ${permission}`,
            req.ip,
            req.get('user-agent')
        ]);
    } catch (error) {
        console.error('Log unauthorized access error:', error);
    }
}

module.exports = {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    getUserPermissions,
    getAllPermissions
};
