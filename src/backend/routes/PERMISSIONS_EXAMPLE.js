/**
 * VÍ DỤ SỬ DỤNG PERMISSION MIDDLEWARE
 * File này là ví dụ minh họa cách sử dụng middleware kiểm tra quyền
 * KHÔNG import file này vào server.js
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
    checkPermission, 
    checkAnyPermission, 
    checkAllPermissions,
    getUserPermissions 
} = require('../middleware/permissionMiddleware');

// ==========================================
// VÍ DỤ 1: KIỂM TRA MỘT QUYỀN CỤ THỂ
// ==========================================

// Chỉ cho phép user có quyền 'view_orders' truy cập
router.get('/orders', 
    authenticateToken, 
    checkPermission('view_orders'), 
    async (req, res) => {
        // Logic xử lý đơn hàng
        res.json({ success: true, message: 'Danh sách đơn hàng' });
    }
);

// Chỉ cho phép user có quyền 'create_orders' tạo đơn
router.post('/orders', 
    authenticateToken, 
    checkPermission('create_orders'), 
    async (req, res) => {
        // Logic tạo đơn hàng
        res.json({ success: true, message: 'Tạo đơn hàng thành công' });
    }
);

// ==========================================
// VÍ DỤ 2: KIỂM TRA MỘT TRONG NHIỀU QUYỀN
// ==========================================

// Cho phép user có một trong các quyền: view_products hoặc view_warehouse
router.get('/inventory', 
    authenticateToken, 
    checkAnyPermission(['view_products', 'view_warehouse']), 
    async (req, res) => {
        // Logic xem tồn kho
        res.json({ success: true, message: 'Thông tin tồn kho' });
    }
);

// ==========================================
// VÍ DỤ 3: KIỂM TRA TẤT CẢ CÁC QUYỀN
// ==========================================

// Yêu cầu user có cả 3 quyền: view_reports, view_financial, export_reports
router.get('/financial-report', 
    authenticateToken, 
    checkAllPermissions(['view_reports', 'view_financial', 'export_reports']), 
    async (req, res) => {
        // Logic xuất báo cáo tài chính
        res.json({ success: true, message: 'Báo cáo tài chính' });
    }
);

// ==========================================
// VÍ DỤ 4: KIỂM TRA QUYỀN TRONG CONTROLLER
// ==========================================

router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Lấy quyền của user
        const permissions = await getUserPermissions(req);

        // Tùy chỉnh dữ liệu trả về dựa trên quyền
        const dashboardData = {
            overview: permissions.view_reports ? getOverviewData() : null,
            orders: permissions.view_orders ? getOrdersData() : null,
            products: permissions.view_products ? getProductsData() : null,
            financial: permissions.view_financial ? getFinancialData() : null
        };

        res.json({ success: true, data: dashboardData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// VÍ DỤ 5: KIỂM TRA QUYỀN ĐỘNG
// ==========================================

router.put('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const permissions = await getUserPermissions(req);
        const { status } = req.body;

        // Kiểm tra quyền khác nhau tùy theo hành động
        if (status === 'cancelled') {
            if (!permissions.cancel_orders) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Bạn không có quyền hủy đơn hàng' 
                });
            }
        } else {
            if (!permissions.edit_orders) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Bạn không có quyền sửa đơn hàng' 
                });
            }
        }

        // Logic cập nhật đơn hàng
        res.json({ success: true, message: 'Cập nhật đơn hàng thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// VÍ DỤ 6: API TRẢ VỀ QUYỀN CỦA USER
// ==========================================

router.get('/my-permissions', authenticateToken, async (req, res) => {
    try {
        const permissions = await getUserPermissions(req);
        res.json({ 
            success: true, 
            data: {
                ma_nhan_vien: req.user.ma_nhan_vien,
                ho_ten: req.user.ho_ten,
                permissions: permissions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// VÍ DỤ 7: KẾT HỢP NHIỀU MIDDLEWARE
// ==========================================

// Vừa kiểm tra admin vừa kiểm tra quyền
const { requireAdmin } = require('../middleware/authMiddleware');

router.delete('/products/:id', 
    authenticateToken,
    // Nếu là admin thì cho phép, không thì kiểm tra quyền delete_product
    (req, res, next) => {
        if (req.user?.vai_tro === 'admin') {
            return next();
        }
        checkPermission('delete_product')(req, res, next);
    },
    async (req, res) => {
        // Logic xóa sản phẩm
        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    }
);

// ==========================================
// DANH SÁCH CÁC QUYỀN TRONG HỆ THỐNG
// ==========================================

/*
ORDERS:
- view_orders: Xem đơn hàng
- create_orders: Tạo đơn hàng
- edit_orders: Sửa đơn hàng
- delete_orders: Xóa đơn hàng
- cancel_orders: Hủy đơn hàng

CUSTOMERS:
- view_customers: Xem khách hàng
- add_customer: Thêm khách hàng
- edit_customer: Sửa khách hàng
- delete_customer: Xóa khách hàng

WAREHOUSE:
- view_warehouse: Xem kho
- add_ingredient: Thêm nguyên liệu
- edit_inventory: Sửa tồn kho
- view_suppliers: Xem nhà cung cấp

EMPLOYEES:
- view_employees: Xem nhân viên
- add_employee: Thêm nhân viên
- edit_employee: Sửa nhân viên
- delete_employee: Xóa nhân viên

PRODUCTS:
- view_products: Xem sản phẩm
- add_product: Thêm sản phẩm
- edit_product: Sửa sản phẩm
- delete_product: Xóa sản phẩm

REPORTS:
- view_reports: Xem báo cáo
- export_reports: Xuất báo cáo
- view_financial: Xem tài chính
- view_analytics: Xem phân tích

SETTINGS:
- view_settings: Xem cài đặt
- edit_settings: Sửa cài đặt
- manage_permissions: Quản lý phân quyền
- system_backup: Sao lưu hệ thống
*/

// Mock functions
function getOverviewData() { return { total: 100 }; }
function getOrdersData() { return []; }
function getProductsData() { return []; }
function getFinancialData() { return { revenue: 0 }; }

module.exports = router;
