const express = require('express');
const RecommendationEngine = require('../utils/recommendationEngineJS');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import middleware từ auth.js
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { getUserPermissions } = require('../middleware/permissionMiddleware');

// ==========================================
// QUẢN LÝ PHÂN QUYỀN
// ==========================================

// Lấy quyền của user hiện tại
router.get('/my-permissions', authenticateToken, async (req, res) => {
    try {
        const permissions = await getUserPermissions(req);
        res.json({ 
            success: true, 
            data: {
                ma_nhan_vien: req.user?.ma_nhan_vien,
                ho_ten: req.user?.ho_ten || req.user?.ten_dang_nhap,
                chuc_vu: req.user?.chuc_vu || req.user?.vai_tro,
                permissions: permissions
            }
        });
    } catch (error) {
        console.error('Get my permissions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin quyền: ' + error.message 
        });
    }
});

// Lấy thông tin phân quyền của một nhân viên
router.get('/permissions/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`🔍 [Admin API] GET /permissions/${req.params.employeeId} requested by user ${req.user?.ma_tai_khoan} (${req.user?.email})`);
    try {
        const { employeeId } = req.params;

        // Lấy thông tin phân quyền
        const [permissions] = await db.query(`
            SELECT quyen 
            FROM phan_quyen 
            WHERE ma_nhan_vien = ?
        `, [employeeId]);

        if (permissions.length === 0) {
            console.log(`ℹ️ [Admin API] No permissions found in DB for employee ${employeeId}, returning empty object`);
            // Nếu chưa có phân quyền, trả về object rỗng
            return res.json({
                success: true,
                data: {
                    ma_nhan_vien: employeeId,
                    permissions: {}
                }
            });
        }

        const resolvedPermissions = typeof permissions[0].quyen === 'string' ? JSON.parse(permissions[0].quyen) : permissions[0].quyen;
        console.log(`✅ [Admin API] Loaded permissions for employee ${employeeId}:`, Object.keys(resolvedPermissions).filter(k => resolvedPermissions[k]));
        res.json({
            success: true,
            data: {
                ma_nhan_vien: employeeId,
                permissions: resolvedPermissions
            }
        });
    } catch (error) {
        console.error('❌ [Admin API] Get permissions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin phân quyền: ' + error.message 
        });
    }
});

// Cập nhật phân quyền cho nhân viên
router.put('/permissions/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`🔍 [Admin API] PUT /permissions/${req.params.employeeId} requested by user ${req.user?.ma_tai_khoan} (${req.user?.email})`);
    try {
        const { employeeId } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            console.log(`⚠️ [Admin API] Invalid permissions object provided`);
            return res.status(400).json({ 
                success: false, 
                message: 'Dữ liệu phân quyền không hợp lệ' 
            });
        }

        // Kiểm tra nhân viên có tồn tại không
        const [employee] = await db.query(`
            SELECT ma_nhan_vien, ho_ten as ten, chuc_vu as vai_tro 
            FROM nhan_vien 
            WHERE ma_nhan_vien = ?
        `, [employeeId]);

        if (employee.length === 0) {
            console.log(`⚠️ [Admin API] Employee ${employeeId} not found to update permissions`);
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy nhân viên' 
            });
        }

        // Lấy thông tin người cập nhật từ token
        const updatedBy = req.user?.ten_dang_nhap || 'Admin';

        // Kiểm tra xem đã có phân quyền chưa
        const [existing] = await db.query(`
            SELECT ma_phan_quyen 
            FROM phan_quyen 
            WHERE ma_nhan_vien = ?
        `, [employeeId]);

        if (existing.length > 0) {
            console.log(`ℹ️ [Admin API] Updating existing permissions for employee ${employeeId}`);
            // Cập nhật phân quyền hiện có
            await db.query(`
                UPDATE phan_quyen 
                SET quyen = ?, nguoi_cap_nhat = ?, ngay_cap_nhat = NOW()
                WHERE ma_nhan_vien = ?
            `, [JSON.stringify(permissions), updatedBy, employeeId]);
        } else {
            console.log(`ℹ️ [Admin API] Inserting new permissions for employee ${employeeId}`);
            // Tạo phân quyền mới
            await db.query(`
                INSERT INTO phan_quyen (ma_nhan_vien, quyen, nguoi_cap_nhat)
                VALUES (?, ?, ?)
            `, [employeeId, JSON.stringify(permissions), updatedBy]);
        }

        console.log(`✅ [Admin API] Permissions updated successfully for employee ${employeeId}`);
        res.json({
            success: true,
            message: 'Cập nhật phân quyền thành công',
            data: {
                ma_nhan_vien: employeeId,
                permissions: permissions
            }
        });
    } catch (error) {
        console.error('❌ [Admin API] Update permissions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật phân quyền: ' + error.message 
        });
    }
});

// Lấy danh sách tất cả nhân viên với phân quyền
router.get('/employees/permissions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [employees] = await db.query(`
            SELECT 
                nv.ma_nhan_vien,
                nv.ho_ten as ten,
                nv.chuc_vu as vai_tro,
                nv.email,
                nv.so_dien_thoai,
                nv.ngay_vao_lam,
                nv.trang_thai,
                pq.quyen,
                pq.ngay_cap_nhat as ngay_cap_nhat_quyen,
                pq.nguoi_cap_nhat
            FROM nhan_vien nv
            LEFT JOIN phan_quyen pq ON nv.ma_nhan_vien = pq.ma_nhan_vien
            WHERE nv.trang_thai = 1
            ORDER BY nv.ngay_vao_lam DESC
        `);

        // Parse JSON permissions
        const employeesWithPermissions = employees.map(emp => ({
            ...emp,
            quyen: emp.quyen ? (typeof emp.quyen === 'string' ? JSON.parse(emp.quyen) : emp.quyen) : {}
        }));

        res.json({
            success: true,
            data: employeesWithPermissions
        });
    } catch (error) {
        console.error('Get employees with permissions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy danh sách nhân viên: ' + error.message 
        });
    }
});

// Ghi log hoạt động
router.post('/activity-log', authenticateToken, async (req, res) => {
    try {
        const { action, target, target_id, description } = req.body;
        const ma_tai_khoan = req.user?.ma_tai_khoan;
        const ma_nhan_vien = req.user?.ma_nhan_vien;

        await db.query(`
            INSERT INTO log_hoat_dong 
            (ma_tai_khoan, ma_nhan_vien, hanh_dong, doi_tuong, ma_doi_tuong, mo_ta, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ma_tai_khoan || null,
            ma_nhan_vien || null,
            action,
            target,
            target_id,
            description,
            req.ip,
            req.get('user-agent')
        ]);

        res.json({ success: true, message: 'Đã ghi log hoạt động' });
    } catch (error) {
        console.error('Activity log error:', error);
        // Không trả lỗi vì log không ảnh hưởng đến chức năng chính
        res.json({ success: true });
    }
});

// Lấy log hoạt động
router.get('/activity-log', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, action, target } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (action) {
            whereClause += ' AND lg.hanh_dong = ?';
            params.push(action);
        }

        if (target) {
            whereClause += ' AND lg.doi_tuong = ?';
            params.push(target);
        }

        const [logs] = await db.query(`
            SELECT 
                lg.*,
                tk.ten_dang_nhap as ten_tai_khoan,
                nv.ten as ten_nhan_vien
            FROM log_hoat_dong lg
            LEFT JOIN tai_khoan tk ON lg.ma_tai_khoan = tk.ma_tai_khoan
            LEFT JOIN nhan_vien nv ON lg.ma_nhan_vien = nv.ma_nhan_vien
            WHERE ${whereClause}
            ORDER BY lg.ngay_tao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const [total] = await db.query(`
            SELECT COUNT(*) as count 
            FROM log_hoat_dong lg
            WHERE ${whereClause}
        `, params);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count
            }
        });
    } catch (error) {
        console.error('Get activity log error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy log hoạt động: ' + error.message 
        });
    }
});

// Cấu hình multer upload ảnh sản phẩm
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../images/products');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh'));
    }
});

// ==========================================
// DASHBOARD - THỐNG KÊ
// ==========================================
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📊 Dashboard request received');
        const { startDate, endDate } = req.query;
        console.log('📅 Date filters:', { startDate, endDate });
        
        // Xây dựng điều kiện lọc theo khoảng ngày
        // Sử dụng DATE(ngay_tao) thay vì CONVERT_TZ vì MySQL có thể không có timezone data
        let dateFilter = '';
        let dateFilterOrders = '';
        let dateFilterDH = ''; // Cho bảng don_hang với alias dh
        
        if (startDate && endDate) {
            dateFilter = `AND DATE(ngay_tao) BETWEEN '${startDate}' AND '${endDate}'`;
            dateFilterOrders = `WHERE DATE(ngay_tao) BETWEEN '${startDate}' AND '${endDate}'`;
            dateFilterDH = `AND DATE(dh.ngay_tao) BETWEEN '${startDate}' AND '${endDate}'`;
        } else if (startDate) {
            dateFilter = `AND DATE(ngay_tao) >= '${startDate}'`;
            dateFilterOrders = `WHERE DATE(ngay_tao) >= '${startDate}'`;
            dateFilterDH = `AND DATE(dh.ngay_tao) >= '${startDate}'`;
        } else if (endDate) {
            dateFilter = `AND DATE(ngay_tao) <= '${endDate}'`;
            dateFilterOrders = `WHERE DATE(ngay_tao) <= '${endDate}'`;
            dateFilterDH = `AND DATE(dh.ngay_tao) <= '${endDate}'`;
        }

        console.log('1️⃣ Query revenue...');
        // Tổng doanh thu (theo filter) - chỉ tính đơn đang giao và hoàn thành
        const [revenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total_revenue 
            FROM don_hang 
            WHERE trang_thai_don_hang IN ('hoan_thanh', 'dang_giao') ${dateFilter}
        `);
        console.log('✅ Revenue done:', revenue[0]);

        console.log('2️⃣ Query orders...');
        // Tổng đơn hàng (theo filter)
        const [orders] = await db.query(`
            SELECT COUNT(*) as total_orders FROM don_hang ${dateFilterOrders}
        `);
        console.log('✅ Orders done:', orders[0]);

        console.log('3️⃣ Query products...');
        // Tổng sản phẩm
        const [products] = await db.query(`SELECT COUNT(*) as total_products FROM san_pham`);
        console.log('✅ Products done');

        console.log('4️⃣ Query customers...');
        // Tổng khách hàng có đơn hàng trong khoảng thời gian
        let customerQuery = '';
        if (startDate || endDate) {
            customerQuery = `
                SELECT COUNT(DISTINCT ma_tai_khoan) as total_customers 
                FROM don_hang 
                WHERE ma_tai_khoan IS NOT NULL ${dateFilter}
            `;
        } else {
            customerQuery = `
                SELECT COUNT(DISTINCT ma_tai_khoan) as total_customers 
                FROM don_hang 
                WHERE ma_tai_khoan IS NOT NULL
            `;
        }
        const [customers] = await db.query(customerQuery);
        console.log('✅ Customers done:', customers[0]);

        console.log('5️⃣ Query ordersByStatus...');
        // Đơn hàng theo trạng thái (theo filter)
        let statusQuery = `SELECT trang_thai_don_hang as trang_thai, COUNT(*) as count FROM don_hang`;
        if (startDate || endDate) {
            statusQuery += ` ${dateFilterOrders}`;
        }
        statusQuery += ` GROUP BY trang_thai_don_hang`;
        const [ordersByStatus] = await db.query(statusQuery);
        console.log('✅ OrdersByStatus done');

        console.log('6️⃣ Query recentOrders...');
        // Đơn hàng gần đây
        const [recentOrders] = await db.query(`
            SELECT dh.*, dh.trang_thai_don_hang as trang_thai, tk.ten_dang_nhap, tk.email,
                   COALESCE((SELECT tt.phuong_thuc FROM thanh_toan tt WHERE tt.ma_don_hang = dh.ma_don_hang LIMIT 1), 'COD') as phuong_thuc_thanh_toan
            FROM don_hang dh
            LEFT JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
            ORDER BY dh.ngay_tao DESC
            LIMIT 10
        `);
        console.log('✅ RecentOrders done');

        console.log('7️⃣ Query topProducts...');
        // Sản phẩm bán chạy
        const [topProducts] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh,
                   COALESCE(SUM(ctdh.so_luong), 0) as total_sold
            FROM san_pham sp
            LEFT JOIN chi_tiet_don_hang ctdh ON sp.ma_san_pham = ctdh.ma_san_pham
            LEFT JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang AND dh.trang_thai_don_hang = 'hoan_thanh'
            GROUP BY sp.ma_san_pham, sp.ten_san_pham, sp.gia
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        console.log('✅ TopProducts done');

        console.log('8️⃣ Query topCustomers...');
        // Top 10 khách hàng mua nhiều nhất (tính cả đơn đang xử lý và hoàn thành)
        const [topCustomers] = await db.query(`
            SELECT 
                tk.ma_tai_khoan,
                tk.ten_dang_nhap as ho_ten,
                tk.email,
                COUNT(dh.ma_don_hang) as total_orders,
                COALESCE(SUM(dh.tong_tien), 0) as total_spent
            FROM tai_khoan tk
            JOIN don_hang dh ON tk.ma_tai_khoan = dh.ma_tai_khoan
            WHERE dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_xu_ly', 'dang_giao') ${dateFilterDH}
            GROUP BY tk.ma_tai_khoan, tk.ten_dang_nhap, tk.email
            ORDER BY total_spent DESC
            LIMIT 10
        `);
        console.log('✅ TopCustomers done');

        console.log('9️⃣ Query monthlyRevenue...');
        // Doanh thu theo tháng (12 tháng gần nhất - KHÔNG bị filter)
        const [monthlyRevenue] = await db.query(`
            SELECT 
                DATE_FORMAT(ngay_tao, '%Y-%m') as month,
                COALESCE(SUM(tong_tien), 0) as revenue
            FROM don_hang
            WHERE trang_thai_don_hang = 'hoan_thanh' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m')
            ORDER BY month ASC
        `);
        console.log('✅ MonthlyRevenue done:', monthlyRevenue.length, 'months');

        console.log('🔟 Query categoryStats...');
        // Thống kê sản phẩm theo danh mục (DỮ LIỆU THỰC)
        const [categoryStats] = await db.query(`
            SELECT 
                dm.ten_danh_muc,
                COUNT(sp.ma_san_pham) as so_san_pham,
                COALESCE(SUM(sp.so_luong), 0) as tong_ton_kho,
                COALESCE(SUM(sp.so_luong * sp.gia), 0) as gia_tri_ton_kho
            FROM danh_muc_san_pham dm
            LEFT JOIN san_pham sp ON dm.ma_danh_muc = sp.ma_danh_muc AND sp.trang_thai = 'hien_thi'
            GROUP BY dm.ma_danh_muc, dm.ten_danh_muc
            ORDER BY dm.ten_danh_muc
        `);
        console.log('✅ CategoryStats done');

        console.log('1️⃣1️⃣ Query categoryRevenue...');
        // Doanh thu theo danh mục (DỮ LIỆU THỰC)
        const [categoryRevenue] = await db.query(`
            SELECT 
                dm.ten_danh_muc,
                COALESCE(SUM(ctdh.so_luong * ctdh.gia_ban), 0) as doanh_thu
            FROM danh_muc_san_pham dm
            LEFT JOIN san_pham sp ON dm.ma_danh_muc = sp.ma_danh_muc
            LEFT JOIN chi_tiet_don_hang ctdh ON sp.ma_san_pham = ctdh.ma_san_pham
            LEFT JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang AND dh.trang_thai_don_hang = 'hoan_thanh'
            GROUP BY dm.ma_danh_muc, dm.ten_danh_muc
            ORDER BY doanh_thu DESC
        `);
        console.log('✅ CategoryRevenue done');

        console.log('1️⃣2️⃣ Query totalSold...');
        // Tổng số lượng sản phẩm đã bán (theo filter) - chỉ tính đơn đang giao và hoàn thành
        const [totalSold] = await db.query(`
            SELECT COALESCE(SUM(ctdh.so_luong), 0) as total_sold
            FROM chi_tiet_don_hang ctdh
            JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
            WHERE dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao') ${dateFilterDH}
        `);
        console.log('✅ TotalSold done');

        console.log('1️⃣3️⃣ Query newsStats...');
        // Thống kê tin tức theo danh mục
        let newsStats = [];
        try {
            const [news] = await db.query(`
                SELECT danh_muc, COUNT(*) as so_bai, SUM(luot_xem) as tong_luot_xem
                FROM tin_tuc
                WHERE trang_thai = 'hien_thi'
                GROUP BY danh_muc
                ORDER BY so_bai DESC
            `);
            newsStats = news;
        } catch (e) {
            console.log('⚠️ News stats error:', e.message);
        }
        console.log('✅ NewsStats done');

        console.log('1️⃣4️⃣ Query newsMonthlyStats...');
        // Thống kê bài viết theo tháng và danh mục (12 tháng gần nhất)
        let newsMonthlyStats = [];
        try {
            const [newsMonthly] = await db.query(`
                SELECT 
                    DATE_FORMAT(ngay_tao, '%Y-%m') as thang,
                    danh_muc,
                    COUNT(*) as so_bai
                FROM tin_tuc
                WHERE trang_thai = 'hien_thi' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m'), danh_muc
                ORDER BY thang ASC, danh_muc
            `);
            newsMonthlyStats = newsMonthly;
        } catch (e) {
            console.log('⚠️ News monthly stats error:', e.message);
        }
        console.log('✅ NewsMonthlyStats done');

        console.log('1️⃣5️⃣ Query topRatedProducts...');
        // Top sản phẩm được đánh giá cao nhất (theo điểm trung bình)
        let topRatedProducts = [];
        try {
            const [rated] = await db.query(`
                SELECT 
                    sp.ma_san_pham,
                    sp.ten_san_pham,
                    COUNT(dg.ma_danh_gia) as so_danh_gia,
                    ROUND(AVG(dg.so_sao), 1) as diem_trung_binh
                FROM san_pham sp
                JOIN danh_gia dg ON sp.ma_san_pham = dg.ma_san_pham
                GROUP BY sp.ma_san_pham, sp.ten_san_pham
                HAVING COUNT(dg.ma_danh_gia) >= 1
                ORDER BY diem_trung_binh DESC, so_danh_gia DESC
                LIMIT 10
            `);
            topRatedProducts = rated;
        } catch (e) {
            console.log('⚠️ Top rated products error:', e.message);
        }
        console.log('✅ TopRatedProducts done');

        console.log('1️⃣6️⃣ Query customerGrowth...');
        // Khách hàng mới theo ngày (60 ngày gần nhất, bao gồm cả ngày không có khách mới)
        let customerGrowth = [];
        try {
            // Lấy dữ liệu khách hàng mới theo ngày
            const [growth] = await db.query(`
                SELECT 
                    DATE_FORMAT(ngay_tao, '%d/%m') as ngay,
                    DATE_FORMAT(ngay_tao, '%Y-%m-%d') as ngay_full,
                    COUNT(*) as so_khach_moi
                FROM tai_khoan
                WHERE vai_tro = 'khach_hang' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m-%d'), DATE_FORMAT(ngay_tao, '%d/%m')
                ORDER BY ngay_full ASC
            `);
            customerGrowth = growth;
        } catch (e) {
            console.log('⚠️ Customer growth error:', e.message);
        }
        console.log('✅ CustomerGrowth done');

        console.log('1️⃣7️⃣ Query slowMovingProducts...');
        // Sản phẩm bán chậm (không có lượt bán trong 2 tháng gần nhất)
        let slowMovingProducts = [];
        try {
            const [slowProducts] = await db.query(`
                SELECT 
                    sp.ma_san_pham,
                    sp.ten_san_pham,
                    sp.gia,
                    sp.so_luong as ton_kho,
                    (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh,
                    COALESCE(MAX(dh.ngay_tao), sp.ngay_tao) as ngay_ban_cuoi
                FROM san_pham sp
                LEFT JOIN chi_tiet_don_hang ctdh ON sp.ma_san_pham = ctdh.ma_san_pham
                LEFT JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang 
                    AND dh.trang_thai_don_hang = 'hoan_thanh'
                    AND dh.ngay_tao >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
                WHERE sp.trang_thai = 'hien_thi'
                GROUP BY sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.so_luong, sp.ngay_tao
                HAVING MAX(dh.ngay_tao) IS NULL OR MAX(dh.ngay_tao) < DATE_SUB(NOW(), INTERVAL 2 MONTH)
                ORDER BY sp.so_luong DESC, sp.ngay_tao DESC
                LIMIT 10
            `);
            slowMovingProducts = slowProducts;
        } catch (e) {
            console.log('⚠️ Slow moving products error:', e.message);
        }
        console.log('✅ SlowMovingProducts done');

        console.log('✅ All queries done, sending response...');
        res.json({
            success: true,
            data: {
                stats: {
                    total_revenue: revenue[0].total_revenue,
                    total_orders: orders[0].total_orders,
                    total_products: products[0].total_products,
                    total_customers: customers[0].total_customers,
                    total_sold: totalSold[0].total_sold
                },
                orders_by_status: ordersByStatus,
                recent_orders: recentOrders,
                top_products: topProducts,
                top_customers: topCustomers,
                monthly_revenue: monthlyRevenue,
                category_stats: categoryStats,
                category_revenue: categoryRevenue,
                news_stats: newsStats,
                news_monthly_stats: newsMonthlyStats,
                top_rated_products: topRatedProducts,
                customer_growth: customerGrowth,
                slow_moving_products: slowMovingProducts
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error.message);
        console.error('Dashboard error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ SẢN PHẨM
// ==========================================

// Test route để debug
router.get('/test-image-route/:productId/images/:imageId', (req, res) => {
    res.json({ success: true, params: req.params, message: 'Route hoạt động!' });
});

// Lấy tất cả sản phẩm (admin - bao gồm cả ẩn)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 100, search, category, status } = req.query;

        console.log('🔍 Admin products search:', { search, category, status });

        let whereClause = '1=1';
        const params = [];

        if (search && search.trim()) {
            whereClause += ` AND (sp.ten_san_pham LIKE ? OR sp.thuong_hieu LIKE ? OR sp.mo_ta LIKE ? OR sp.ma_san_pham_code LIKE ? OR sp.barcode LIKE ?)`;
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        if (category) {
            whereClause += ` AND sp.ma_danh_muc = ?`;
            params.push(category);
        }
        if (status) {
            whereClause += ` AND sp.trang_thai = ?`;
            params.push(status);
        }

        const query = `
            SELECT sp.*, dm.ten_danh_muc,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE ${whereClause}
            ORDER BY sp.ma_san_pham DESC
            LIMIT ${parseInt(limit)}
        `;

        console.log('🔍 Query:', query);
        console.log('🔍 Params:', params);

        const [products] = await db.query(query, params);

        console.log('🔍 Found:', products.length, 'products');

        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: products.length
            }
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Lấy chi tiết sản phẩm
router.get('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT sp.*, dm.ten_danh_muc
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.ma_san_pham = ?
        `, [req.params.id]);

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const [images] = await db.query(`SELECT * FROM anh_san_pham WHERE ma_san_pham = ?`, [req.params.id]);

        res.json({
            success: true,
            data: { ...products[0], images }
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thêm sản phẩm mới
router.post('/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_san_pham, mo_ta, gia, gia_nhap, so_luong, thuong_hieu, ma_danh_muc, barcode, trang_thai = 'hien_thi', muc_dich_su_dung, trong_luong_kg = 0.5 } = req.body;

        if (!ten_san_pham || gia === undefined || gia === null) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }

        // Kiểm tra giá không được âm
        if (parseFloat(gia) < 0) {
            return res.status(400).json({ success: false, message: 'Giá sản phẩm không được âm' });
        }

        // Tạo mã sản phẩm tự động
        const [maxId] = await db.query('SELECT MAX(ma_san_pham) as max_id FROM san_pham');
        const nextId = (maxId[0].max_id || 0) + 1;
        const ma_san_pham_code = 'SP' + String(nextId).padStart(6, '0');

        const [result] = await db.query(`
            INSERT INTO san_pham (ten_san_pham, mo_ta, gia, gia_nhap, so_luong, thuong_hieu, ma_danh_muc, ma_san_pham_code, barcode, trang_thai, muc_dich_su_dung, trong_luong_kg, ngay_tao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [ten_san_pham, mo_ta, gia, gia_nhap || (gia * 0.7), so_luong || 0, thuong_hieu, ma_danh_muc, ma_san_pham_code, barcode, trang_thai, muc_dich_su_dung, trong_luong_kg]);

        res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công',
            data: { ma_san_pham: result.insertId, ma_san_pham_code }
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Cập nhật sản phẩm
router.put('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_san_pham, mo_ta, gia, gia_nhap, so_luong, thuong_hieu, ma_danh_muc, barcode, trang_thai, muc_dich_su_dung, trong_luong_kg } = req.body;

        // Kiểm tra giá không được âm
        if (gia !== undefined && gia !== null && parseFloat(gia) < 0) {
            return res.status(400).json({ success: false, message: 'Giá sản phẩm không được âm' });
        }

        await db.query(`
            UPDATE san_pham SET
                ten_san_pham = COALESCE(?, ten_san_pham),
                mo_ta = COALESCE(?, mo_ta),
                gia = COALESCE(?, gia),
                gia_nhap = COALESCE(?, gia_nhap),
                so_luong = COALESCE(?, so_luong),
                thuong_hieu = COALESCE(?, thuong_hieu),
                ma_danh_muc = COALESCE(?, ma_danh_muc),
                barcode = COALESCE(?, barcode),
                trang_thai = COALESCE(?, trang_thai),
                muc_dich_su_dung = COALESCE(?, muc_dich_su_dung),
                trong_luong_kg = COALESCE(?, trong_luong_kg),
                ngay_cap_nhat = NOW()
            WHERE ma_san_pham = ?
        `, [ten_san_pham, mo_ta, gia, gia_nhap, so_luong, thuong_hieu, ma_danh_muc, barcode, trang_thai, muc_dich_su_dung, trong_luong_kg, req.params.id]);

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ ẢNH SẢN PHẨM (đặt trước route xóa sản phẩm)
// ==========================================

// Xóa ảnh sản phẩm
router.delete('/products/:productId/images/:imageId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { productId, imageId } = req.params;
        
        console.log('🗑️ Delete image request:', { productId, imageId });

        // Kiểm tra ảnh có tồn tại không
        const [image] = await db.query('SELECT * FROM anh_san_pham WHERE ma_anh = ? AND ma_san_pham = ?', [imageId, productId]);
        
        console.log('🔍 Found image:', image);
        
        if (image.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hình ảnh' });
        }

        const wasMain = image[0].la_anh_chinh == 1 || image[0].la_anh_chinh === true;
        console.log('📌 Was main image:', wasMain);

        // Xóa ảnh
        const [deleteResult] = await db.query(`DELETE FROM anh_san_pham WHERE ma_anh = ?`, [imageId]);
        console.log('🗑️ Delete result:', deleteResult);

        // Nếu ảnh bị xóa là ảnh chính, đặt ảnh đầu tiên còn lại làm ảnh chính
        if (wasMain) {
            const [updateResult] = await db.query(`
                UPDATE anh_san_pham SET la_anh_chinh = 1 
                WHERE ma_san_pham = ? 
                ORDER BY ma_anh ASC 
                LIMIT 1
            `, [productId]);
            console.log('📌 Set new main image:', updateResult);
        }

        res.json({ success: true, message: 'Đã xóa hình ảnh' });
    } catch (error) {
        console.error('❌ Delete image error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa hình ảnh: ' + error.message });
    }
});

// Đặt ảnh chính
router.put('/products/:productId/images/:imageId/main', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { productId, imageId } = req.params;

        // Bỏ flag ảnh chính cũ
        await db.query(`UPDATE anh_san_pham SET la_anh_chinh = 0 WHERE ma_san_pham = ?`, [productId]);
        
        // Đặt ảnh mới làm ảnh chính
        await db.query(`UPDATE anh_san_pham SET la_anh_chinh = 1 WHERE ma_anh = ? AND ma_san_pham = ?`, [imageId, productId]);

        res.json({ success: true, message: 'Đã đặt làm ảnh chính' });
    } catch (error) {
        console.error('Set main image error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật: ' + error.message });
    }
});

// Xóa sản phẩm
router.delete('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Kiểm tra sản phẩm có trong đơn hàng không
        const [orderCheck] = await db.query(
            `SELECT COUNT(*) as count FROM chi_tiet_don_hang WHERE ma_san_pham = ?`, 
            [productId]
        );
        
        if (orderCheck[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa sản phẩm này vì đã có trong đơn hàng. Hãy ẩn sản phẩm thay vì xóa.' 
            });
        }
        
        // Xóa các bản ghi liên quan
        await db.query(`DELETE FROM anh_san_pham WHERE ma_san_pham = ?`, [productId]);
        await db.query(`DELETE FROM danh_gia WHERE ma_san_pham = ?`, [productId]);
        await db.query(`DELETE FROM gio_hang WHERE ma_san_pham = ?`, [productId]);
        
        // Xóa sản phẩm
        await db.query(`DELETE FROM san_pham WHERE ma_san_pham = ?`, [productId]);

        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm: ' + error.message });
    }
});

// Upload ảnh sản phẩm
router.post('/products/:id/images', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const productId = req.params.id;
        const isMain = req.body.is_main === 'true' || req.body.is_main === '1';

        console.log('📸 Upload request - Product ID:', productId);
        console.log('📸 Files received:', req.files?.length || 0);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
        }

        // Kiểm tra sản phẩm tồn tại
        const [product] = await db.query('SELECT ma_san_pham FROM san_pham WHERE ma_san_pham = ?', [productId]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        // Tạo bảng anh_san_pham nếu chưa có
        await db.query(`
            CREATE TABLE IF NOT EXISTS anh_san_pham (
                ma_anh INT AUTO_INCREMENT PRIMARY KEY,
                ma_san_pham INT NOT NULL,
                duong_dan_anh VARCHAR(500) NOT NULL,
                la_anh_chinh TINYINT(1) DEFAULT 0,
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Nếu là ảnh chính, bỏ flag ảnh chính cũ
        if (isMain) {
            await db.query(`UPDATE anh_san_pham SET la_anh_chinh = 0 WHERE ma_san_pham = ?`, [productId]);
        }

        const insertedImages = [];
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const imagePath = '/images/products/' + file.filename;
            console.log('📸 Saving image:', imagePath);
            
            const [result] = await db.query(`
                INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh)
                VALUES (?, ?, ?)
            `, [productId, imagePath, isMain && i === 0 ? 1 : 0]);
            insertedImages.push({ ma_anh: result.insertId, duong_dan_anh: imagePath });
        }

        console.log('✅ Upload success:', insertedImages.length, 'images');
        res.json({ success: true, message: 'Upload ảnh thành công', data: insertedImages });
    } catch (error) {
        console.error('❌ Upload image error:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi upload: ' + error.message });
    }
});

// Thêm ảnh từ URL
router.post('/products/:id/images/url', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        const { url, is_main } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập URL hình ảnh' });
        }

        // Kiểm tra sản phẩm tồn tại
        const [product] = await db.query('SELECT ma_san_pham FROM san_pham WHERE ma_san_pham = ?', [productId]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        // Nếu là ảnh chính, bỏ flag ảnh chính cũ
        if (is_main) {
            await db.query(`UPDATE anh_san_pham SET la_anh_chinh = 0 WHERE ma_san_pham = ?`, [productId]);
        }

        // Kiểm tra xem đã có ảnh nào chưa
        const [existingImages] = await db.query('SELECT COUNT(*) as count FROM anh_san_pham WHERE ma_san_pham = ?', [productId]);
        const isFirstImage = existingImages[0].count === 0;

        const [result] = await db.query(`
            INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh)
            VALUES (?, ?, ?)
        `, [productId, url, is_main || isFirstImage ? 1 : 0]);

        res.json({ 
            success: true, 
            message: 'Thêm hình ảnh thành công', 
            data: { ma_anh: result.insertId, duong_dan_anh: url } 
        });
    } catch (error) {
        console.error('Add image URL error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm hình ảnh: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ DANH MỤC
// ==========================================

router.get('/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT dm.*, COUNT(sp.ma_san_pham) as so_san_pham
            FROM danh_muc_san_pham dm
            LEFT JOIN san_pham sp ON dm.ma_danh_muc = sp.ma_danh_muc
            GROUP BY dm.ma_danh_muc
            ORDER BY dm.ten_danh_muc
        `);
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_danh_muc, mo_ta } = req.body;
        if (!ten_danh_muc) {
            return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO danh_muc_san_pham (ten_danh_muc, mo_ta) VALUES (?, ?)
        `, [ten_danh_muc, mo_ta]);

        res.status(201).json({
            success: true,
            message: 'Thêm danh mục thành công',
            data: { ma_danh_muc: result.insertId }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_danh_muc, mo_ta } = req.body;
        await db.query(`
            UPDATE danh_muc_san_pham SET ten_danh_muc = ?, mo_ta = ? WHERE ma_danh_muc = ?
        `, [ten_danh_muc, mo_ta, req.params.id]);

        res.json({ success: true, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Kiểm tra có sản phẩm trong danh mục không
        const [products] = await db.query(`SELECT COUNT(*) as count FROM san_pham WHERE ma_danh_muc = ?`, [req.params.id]);
        if (products[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa danh mục có sản phẩm' });
        }

        await db.query(`DELETE FROM danh_muc_san_pham WHERE ma_danh_muc = ?`, [req.params.id]);
        res.json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});


// ==========================================
// QUẢN LÝ ĐƠN HÀNG
// ==========================================

// API thống kê đơn hàng chi tiết
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📊 Loading order stats...');
        
        // Khởi tạo giá trị mặc định
        let totalOrders = 0;
        let totalRevenue = 0;
        let completedRevenue = 0;
        let statusStats = [];
        let monthlyRevenue = [];
        let paymentStats = [];
        let recentOrders = [];

        // 1. Tổng đơn hàng và doanh thu
        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(tong_tien), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN trang_thai_don_hang = 'hoan_thanh' THEN tong_tien ELSE 0 END), 0) as completed_revenue
                FROM don_hang
            `);
            if (rows && rows[0]) {
                totalOrders = rows[0].total_orders || 0;
                totalRevenue = rows[0].total_revenue || 0;
                completedRevenue = rows[0].completed_revenue || 0;
            }
            console.log('✅ Total stats:', { totalOrders, totalRevenue, completedRevenue });
        } catch (e) {
            console.log('⚠️ Lỗi query tổng:', e.message);
        }

        // 2. Đơn hàng theo trạng thái
        try {
            const [rows] = await db.query(`
                SELECT trang_thai_don_hang as trang_thai, COUNT(*) as count, COALESCE(SUM(tong_tien), 0) as revenue
                FROM don_hang GROUP BY trang_thai_don_hang
            `);
            if (rows) statusStats = rows;
            console.log('✅ Status stats:', statusStats);
        } catch (e) {
            console.log('⚠️ Lỗi query trạng thái:', e.message);
        }

        // 3. Doanh thu theo tháng
        try {
            const [rows] = await db.query(`
                SELECT DATE_FORMAT(ngay_tao, '%Y-%m') as month, DATE_FORMAT(ngay_tao, '%m/%Y') as month_label,
                       COUNT(*) as order_count, COALESCE(SUM(tong_tien), 0) as revenue
                FROM don_hang WHERE ngay_tao >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m'), DATE_FORMAT(ngay_tao, '%m/%Y')
                ORDER BY month ASC
            `);
            if (rows) monthlyRevenue = rows;
            console.log('✅ Monthly revenue:', monthlyRevenue.length, 'months');
        } catch (e) {
            console.log('⚠️ Lỗi query tháng:', e.message);
        }

        // 4. Phương thức thanh toán - lấy từ bảng thanh_toan
        try {
            const [rows] = await db.query(`
                SELECT tt.phuong_thuc, COUNT(DISTINCT tt.ma_don_hang) as count, 
                       COALESCE(SUM(dh.tong_tien), 0) as revenue
                FROM thanh_toan tt
                LEFT JOIN don_hang dh ON tt.ma_don_hang = dh.ma_don_hang
                GROUP BY tt.phuong_thuc
            `);
            if (rows && rows.length > 0) {
                paymentStats = rows;
            } else {
                // Nếu không có dữ liệu trong bảng thanh_toan, mặc định COD
                paymentStats = [{ phuong_thuc: 'COD', count: totalOrders, revenue: totalRevenue }];
            }
            console.log('✅ Payment stats:', paymentStats);
        } catch (e) {
            console.log('⚠️ Lỗi query thanh toán:', e.message);
            paymentStats = [{ phuong_thuc: 'COD', count: totalOrders, revenue: totalRevenue }];
        }

        // 5. Đơn hàng gần đây
        try {
            const [rows] = await db.query(`
                SELECT dh.ma_don_hang, dh.tong_tien, dh.trang_thai_don_hang as trang_thai, dh.ngay_tao, tk.ten_dang_nhap
                FROM don_hang dh LEFT JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
                ORDER BY dh.ngay_tao DESC LIMIT 5
            `);
            if (rows) recentOrders = rows;
            console.log('✅ Recent orders:', recentOrders.length);
        } catch (e) {
            console.log('⚠️ Lỗi query recent:', e.message);
        }

        console.log('📊 Sending response...');
        res.json({
            success: true,
            data: {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                completed_revenue: completedRevenue,
                avg_order_value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
                status_stats: statusStats,
                monthly_revenue: monthlyRevenue,
                payment_stats: paymentStats,
                recent_orders: recentOrders
            }
        });
    } catch (error) {
        console.error('❌ Order stats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi: ' + error.message });
    }
});

router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT dh.*, dh.trang_thai_don_hang as trang_thai, dh.dia_chi_giao_hang as dia_chi_giao, 
                   tk.ten_dang_nhap, tk.email,
                   (SELECT COUNT(*) FROM chi_tiet_don_hang WHERE ma_don_hang = dh.ma_don_hang) as so_san_pham,
                   COALESCE((SELECT tt.phuong_thuc FROM thanh_toan tt WHERE tt.ma_don_hang = dh.ma_don_hang LIMIT 1), 'COD') as phuong_thuc_thanh_toan
            FROM don_hang dh
            LEFT JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND dh.trang_thai_don_hang = ?`;
            params.push(status);
        }
        if (search) {
            query += ` AND (CAST(dh.ma_don_hang AS CHAR) LIKE ? OR tk.ten_dang_nhap LIKE ? OR tk.email LIKE ? OR dh.dia_chi_giao_hang LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY dh.ngay_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await db.query(query, params);

        // Count total
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM don_hang`);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.post('/pos/orders', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const {
            items,
            ma_tai_khoan,
            dia_chi_giao_hang,
            phuong_thuc_thanh_toan,
            discount_percent
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        const paymentMethodMap = {
            cod: 'COD',
            cash: 'COD',
            bank: 'Ngan_Hang',
            momo: 'Momo',
            zalopay: 'ZaloPay'
        };
        const dbPaymentMethod = paymentMethodMap[phuong_thuc_thanh_toan] || 'COD';

        await connection.beginTransaction();

        let subtotal = 0;
        const normalizedItems = [];

        for (const item of items) {
            const productId = Number(item.ma_san_pham);
            const quantity = Number(item.so_luong) || 1;
            const requestedPrice = Number(item.gia_ban || item.gia) || 0;

            if (!productId || quantity <= 0) {
                throw new Error('Sản phẩm trong giỏ hàng không hợp lệ');
            }

            const [products] = await connection.query(`
                SELECT ma_san_pham, ten_san_pham, gia, so_luong
                FROM san_pham
                WHERE ma_san_pham = ?
                FOR UPDATE
            `, [productId]);

            if (products.length === 0) {
                throw new Error(`Sản phẩm mã ${productId} không tồn tại`);
            }

            const product = products[0];
            const stock = Number(product.so_luong) || 0;
            if (stock < quantity) {
                throw new Error(`Sản phẩm "${product.ten_san_pham}" chỉ còn ${stock} sản phẩm trong kho`);
            }

            const price = requestedPrice > 0 ? requestedPrice : Number(product.gia) || 0;
            subtotal += price * quantity;
            normalizedItems.push({
                ma_san_pham: productId,
                so_luong: quantity,
                gia_ban: price
            });
        }

        const discountPercent = Math.min(Math.max(Number(discount_percent) || 0, 0), 100);
        const discountAmount = Math.round(subtotal * discountPercent / 100);
        const shippingFee = subtotal === 0 ? 0 : (subtotal > 5000000 ? 0 : 30000);
        const total = subtotal - discountAmount + shippingFee;

        const [orderResult] = await connection.query(`
            INSERT INTO don_hang (
                ma_tai_khoan, tong_tien, trang_thai_thanh_toan,
                trang_thai_don_hang, dia_chi_giao_hang, ngay_tao
            )
            VALUES (?, ?, 'da_thanh_toan', 'hoan_thanh', ?, NOW())
        `, [ma_tai_khoan || null, total, dia_chi_giao_hang || 'Mua tại quầy']);

        const orderId = orderResult.insertId;

        for (const item of normalizedItems) {
            await connection.query(`
                INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
                VALUES (?, ?, ?, ?)
            `, [orderId, item.ma_san_pham, item.so_luong, item.gia_ban]);

            await connection.query(`
                UPDATE san_pham
                SET so_luong = so_luong - ?
                WHERE ma_san_pham = ?
            `, [item.so_luong, item.ma_san_pham]);
        }

        await connection.query(`
            INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
            VALUES (?, ?, ?, ?)
        `, [orderId, dbPaymentMethod, total, `POS${Date.now()}`]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Thanh toán POS thành công',
            data: {
                ma_don_hang: orderId,
                tong_tien: total,
                subtotal,
                discount_amount: discountAmount,
                shipping_fee: shippingFee
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create POS order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi server khi thanh toán POS'
        });
    } finally {
        connection.release();
    }
});

router.get('/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT dh.*, dh.trang_thai_don_hang as trang_thai, dh.dia_chi_giao_hang as dia_chi_giao,
                   tk.ten_dang_nhap, tk.email,
                   COALESCE((SELECT tt.phuong_thuc FROM thanh_toan tt WHERE tt.ma_don_hang = dh.ma_don_hang LIMIT 1), 'COD') as phuong_thuc_thanh_toan
            FROM don_hang dh
            LEFT JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
            WHERE dh.ma_don_hang = ?
        `, [req.params.id]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const [items] = await db.query(`
            SELECT ctdh.*, sp.ten_san_pham,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM chi_tiet_don_hang ctdh
            LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            WHERE ctdh.ma_don_hang = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: { ...orders[0], items }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { trang_thai } = req.body;
        const orderId = req.params.id;
        const validStatuses = ['dang_xu_ly', 'dang_giao', 'hoan_thanh', 'da_huy'];

        if (!validStatuses.includes(trang_thai)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        await db.query(`UPDATE don_hang SET trang_thai_don_hang = ? WHERE ma_don_hang = ?`,
            [trang_thai, orderId]);

        // ── Ghi nhận hành vi purchase khi đơn HOÀN THÀNH ──────────────────────
        // Đây là thời điểm chính xác nhất để ghi 'purchase' vào recommendation engine
        if (trang_thai === 'hoan_thanh') {
            try {
                const RecommendationEngine = require('../utils/recommendationEngineJS');

                // Lấy thông tin user + sản phẩm trong đơn hàng
                const [orderItems] = await db.query(`
                    SELECT dh.ma_tai_khoan, ctdh.ma_san_pham, ctdh.so_luong
                    FROM don_hang dh
                    JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
                    WHERE dh.ma_don_hang = ?
                `, [orderId]);

                for (const item of orderItems) {
                    await RecommendationEngine.trackUserAction(
                        item.ma_tai_khoan,
                        item.ma_san_pham,
                        'purchase',
                        5
                    );
                }
                console.log(`✅ [Recommendation] Tracked purchase for Order #${orderId} (${orderItems.length} items)`);
            } catch (trackErr) {
                console.error('❌ Lỗi ghi nhận purchase khi hoàn thành đơn:', trackErr);
            }
        }

        // ── Xóa purchase nếu đơn bị HỦY (dọn data sai nếu có) ────────────────
        if (trang_thai === 'da_huy') {
            try {
                const [orderItems] = await db.query(`
                    SELECT dh.ma_tai_khoan, ctdh.ma_san_pham
                    FROM don_hang dh
                    JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
                    WHERE dh.ma_don_hang = ?
                `, [orderId]);

                for (const item of orderItems) {
                    await db.query(`
                        DELETE FROM user_interactions
                        WHERE MaND = ? AND MaSP = ? AND LoaiTuongTac = 'purchase'
                          AND ThoiGian >= (
                              SELECT ngay_tao FROM don_hang WHERE ma_don_hang = ? LIMIT 1
                          )
                    `, [item.ma_tai_khoan, item.ma_san_pham, orderId]);
                }
                console.log(`🗑️ [Recommendation] Cleaned up purchase interactions for canceled Order #${orderId}`);
            } catch (cleanErr) {
                console.error('❌ Lỗi dọn dẹp purchase khi hủy đơn:', cleanErr);
            }
        }

        res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công' });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// QUẢN LÝ TÀI KHOẢN
// ==========================================

router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search, status } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                tk.ma_tai_khoan, 
                tk.ten_dang_nhap, 
                tk.email, 
                tk.vai_tro, 
                tk.trang_thai, 
                tk.hinh_anh, 
                tk.ngay_tao, 
                tk.google_id,
                tk.so_dien_thoai,
                COUNT(DISTINCT dh.ma_don_hang) as so_don_hang
            FROM tai_khoan tk
            LEFT JOIN don_hang dh ON tk.ma_tai_khoan = dh.ma_tai_khoan
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ` AND tk.vai_tro = ?`;
            params.push(role);
        }
        if (status !== undefined) {
            query += ` AND tk.trang_thai = ?`;
            params.push(parseInt(status));
        }
        if (search) {
            query += ` AND (tk.ten_dang_nhap LIKE ? OR tk.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` GROUP BY tk.ma_tai_khoan ORDER BY tk.ngay_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await db.query(query, params);
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM tai_khoan`);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                tk.ma_tai_khoan, 
                tk.ten_dang_nhap, 
                tk.email, 
                tk.vai_tro, 
                tk.trang_thai, 
                tk.hinh_anh, 
                tk.ngay_tao,
                tk.google_id,
                tk.so_dien_thoai,
                COUNT(DISTINCT dh.ma_don_hang) as so_don_hang
            FROM tai_khoan tk
            LEFT JOIN don_hang dh ON tk.ma_tai_khoan = dh.ma_tai_khoan
            WHERE tk.ma_tai_khoan = ?
            GROUP BY tk.ma_tai_khoan
        `, [req.params.id]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        // Lấy lịch sử đơn hàng
        const [orders] = await db.query(`
            SELECT ma_don_hang, tong_tien, trang_thai_don_hang as trang_thai, ngay_tao
            FROM don_hang WHERE ma_tai_khoan = ?
            ORDER BY ngay_tao DESC LIMIT 10
        `, [req.params.id]);

        res.json({
            success: true,
            data: { ...users[0], orders }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_dang_nhap, email, mat_khau, vai_tro = 'khach_hang' } = req.body;

        if (!ten_dang_nhap || !email || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }

        // Kiểm tra email tồn tại
        const [existing] = await db.query(`SELECT ma_tai_khoan FROM tai_khoan WHERE email = ?`, [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        const [result] = await db.query(`
            INSERT INTO tai_khoan (ten_dang_nhap, email, mat_khau, vai_tro, trang_thai, ngay_tao)
            VALUES (?, ?, ?, ?, 1, NOW())
        `, [ten_dang_nhap, email, hashedPassword, vai_tro]);

        res.status(201).json({
            success: true,
            message: 'Tạo tài khoản thành công',
            data: { ma_tai_khoan: result.insertId }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_dang_nhap, vai_tro, trang_thai } = req.body;

        await db.query(`
            UPDATE tai_khoan SET
                ten_dang_nhap = COALESCE(?, ten_dang_nhap),
                vai_tro = COALESCE(?, vai_tro),
                trang_thai = COALESCE(?, trang_thai)
            WHERE ma_tai_khoan = ?
        `, [ten_dang_nhap, vai_tro, trang_thai, req.params.id]);

        res.json({ success: true, message: 'Cập nhật tài khoản thành công' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/users/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`
            UPDATE tai_khoan SET trang_thai = IF(trang_thai = 1, 0, 1) WHERE ma_tai_khoan = ?
        `, [req.params.id]);

        res.json({ success: true, message: 'Đã thay đổi trạng thái tài khoản' });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Không cho xóa chính mình
        if (parseInt(req.params.id) === req.user.ma_tai_khoan) {
            return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản của chính mình' });
        }

        await db.query(`DELETE FROM khach_hang WHERE ma_tai_khoan = ?`, [req.params.id]);
        await db.query(`DELETE FROM tai_khoan WHERE ma_tai_khoan = ?`, [req.params.id]);

        res.json({ success: true, message: 'Xóa tài khoản thành công' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// QUẢN LÝ ĐÁNH GIÁ
// ==========================================

router.get('/reviews', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT dg.*, tk.ten_dang_nhap, sp.ten_san_pham
            FROM danh_gia dg
            LEFT JOIN tai_khoan tk ON dg.ma_tai_khoan = tk.ma_tai_khoan
            LEFT JOIN san_pham sp ON dg.ma_san_pham = sp.ma_san_pham
            WHERE 1=1
        `;
        const params = [];

        if (status !== undefined) {
            query += ` AND dg.trang_thai = ?`;
            params.push(parseInt(status));
        }

        query += ` ORDER BY dg.ngay_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [reviews] = await db.query(query, params);

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/reviews/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`UPDATE danh_gia SET trang_thai = IF(trang_thai = 1, 0, 1) WHERE ma_danh_gia = ?`, [req.params.id]);
        res.json({ success: true, message: 'Đã thay đổi trạng thái đánh giá' });
    } catch (error) {
        console.error('Toggle review status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.delete('/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`DELETE FROM danh_gia WHERE ma_danh_gia = ?`, [req.params.id]);
        res.json({ success: true, message: 'Xóa đánh giá thành công' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// TẠO ĐƠN HÀNG MẪU ĐỂ TEST
// ==========================================
router.post('/create-sample-orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Lấy ma_tai_khoan của admin hiện tại
        const adminId = req.user.ma_tai_khoan;

        // Tạo 5 đơn hàng mẫu với các trạng thái khác nhau (theo schema: dang_xu_ly, dang_giao, hoan_thanh, da_huy)
        const orders = [
            { tong_tien: 25990000, trang_thai: 'dang_xu_ly', dia_chi: '123 Nguyễn Văn A, Q.1, TP.HCM' },
            { tong_tien: 15500000, trang_thai: 'dang_xu_ly', dia_chi: '456 Lê Văn B, Q.3, TP.HCM' },
            { tong_tien: 34900000, trang_thai: 'dang_giao', dia_chi: '789 Trần Văn C, Q.7, TP.HCM' },
            { tong_tien: 8990000, trang_thai: 'hoan_thanh', dia_chi: '321 Phạm Văn D, Q.Bình Thạnh, TP.HCM' },
            { tong_tien: 12000000, trang_thai: 'da_huy', dia_chi: '654 Hoàng Văn E, Q.Tân Bình, TP.HCM' }
        ];

        const insertedOrders = [];
        for (const order of orders) {
            const [result] = await db.query(`
                INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
                VALUES (?, ?, ?, ?, NOW() - INTERVAL FLOOR(RAND() * 7) DAY)
            `, [adminId, order.tong_tien, order.trang_thai, order.dia_chi]);
            insertedOrders.push(result.insertId);
        }

        res.json({
            success: true,
            message: `Đã tạo ${insertedOrders.length} đơn hàng mẫu`,
            data: { order_ids: insertedOrders }
        });
    } catch (error) {
        console.error('Create sample orders error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo đơn hàng mẫu: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ KHUYẾN MÃI
// ==========================================

// Lấy tất cả khuyến mãi
router.get('/promotions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [promotions] = await db.query(`
            SELECT * FROM khuyen_mai ORDER BY ma_khuyen_mai DESC
        `);
        res.json({ success: true, data: promotions });
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khuyến mãi' });
    }
});

// Lấy chi tiết 1 khuyến mãi
router.get('/promotions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [promotions] = await db.query('SELECT * FROM khuyen_mai WHERE ma_khuyen_mai = ?', [req.params.id]);
        if (promotions.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
        }
        res.json({ success: true, data: promotions[0] });
    } catch (error) {
        console.error('Get promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy thông tin khuyến mãi' });
    }
});

// Thêm khuyến mãi mới
router.post('/promotions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung, trang_thai } = req.body;
        
        // Kiểm tra mã giảm giá đã tồn tại
        const [existing] = await db.query('SELECT ma_khuyen_mai FROM khuyen_mai WHERE ma_giam_gia = ?', [ma_giam_gia]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
        }

        const [result] = await db.query(`
            INSERT INTO khuyen_mai (ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung, trang_thai)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung, trang_thai || 1]);

        // Tự động tạo thông báo cho tất cả người dùng về khuyến mãi mới
        try {
            await db.query(`
                INSERT INTO thong_bao (ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan)
                VALUES (NULL, 'promotion', ?, ?, 'promotions.html')
            `, [`🎁 ${ten_khuyen_mai}`, `${mo_ta} - Mã: ${ma_giam_gia}`]);
        } catch (notifError) {
            console.log('Could not create notification:', notifError.message);
        }

        res.json({ success: true, message: 'Thêm khuyến mãi thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm khuyến mãi: ' + error.message });
    }
});

// Cập nhật khuyến mãi
router.put('/promotions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung, trang_thai } = req.body;
        
        // Kiểm tra mã giảm giá trùng với khuyến mãi khác
        const [existing] = await db.query('SELECT ma_khuyen_mai FROM khuyen_mai WHERE ma_giam_gia = ? AND ma_khuyen_mai != ?', [ma_giam_gia, req.params.id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã được sử dụng' });
        }

        await db.query(`
            UPDATE khuyen_mai 
            SET ten_khuyen_mai = ?, ma_giam_gia = ?, mo_ta = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, dieu_kien_ap_dung = ?, trang_thai = ?
            WHERE ma_khuyen_mai = ?
        `, [ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung, trang_thai, req.params.id]);

        res.json({ success: true, message: 'Cập nhật khuyến mãi thành công' });
    } catch (error) {
        console.error('Update promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật khuyến mãi: ' + error.message });
    }
});

// Xóa khuyến mãi
router.delete('/promotions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM khuyen_mai WHERE ma_khuyen_mai = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa khuyến mãi' });
    }
});

// API public cho trang frontend lấy khuyến mãi đang hoạt động
router.get('/public/promotions', async (req, res) => {
    try {
        const [promotions] = await db.query(`
            SELECT ma_khuyen_mai, ten_khuyen_mai, ma_giam_gia, mo_ta, ngay_bat_dau, ngay_ket_thuc, dieu_kien_ap_dung
            FROM khuyen_mai 
            WHERE trang_thai = 1 AND ngay_ket_thuc >= NOW()
            ORDER BY ngay_bat_dau ASC
        `);
        res.json({ success: true, data: promotions });
    } catch (error) {
        console.error('Get public promotions error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khuyến mãi' });
    }
});

// ==========================================
// API KIỂM TRA VÀ ÁP DỤNG MÃ GIẢM GIÁ (PUBLIC)
// ==========================================
router.post('/public/apply-promo', async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        
        if (!code) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });
        }
        
        // Tìm mã giảm giá trong database
        const [promos] = await db.query(`
            SELECT * FROM khuyen_mai 
            WHERE ma_giam_gia = ? AND trang_thai = 1
        `, [code.toUpperCase()]);
        
        if (promos.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa' 
            });
        }
        
        const promo = promos[0];
        const now = new Date();
        const startDate = new Date(promo.ngay_bat_dau);
        const endDate = new Date(promo.ngay_ket_thuc);
        
        // Kiểm tra mã chưa tới thời gian bắt đầu
        if (now < startDate) {
            return res.status(400).json({ 
                success: false, 
                message: `Mã giảm giá này sẽ có hiệu lực từ ngày ${startDate.toLocaleDateString('vi-VN')}` 
            });
        }
        
        // Kiểm tra mã đã hết hạn
        if (now > endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mã giảm giá đã hết hạn' 
            });
        }
        
        let discountAmount = 0;
        let discountPercent = 0;
        let message = '';
        
        // Phân tích mô tả để lấy % giảm giá
        // Ví dụ: "Giảm 20% cho tất cả đơn hàng trên 5 triệu"
        const percentMatch = promo.mo_ta.match(/(\d+)%/);
        if (percentMatch) {
            discountPercent = parseInt(percentMatch[1]);
        }
        
        // Kiểm tra điều kiện áp dụng
        const conditionMatch = promo.dieu_kien_ap_dung ? promo.dieu_kien_ap_dung.match(/>=?\s*([\d.,]+)/) : null;
        let minOrderValue = 0;
        
        if (conditionMatch) {
            // Chuyển đổi giá trị (ví dụ: "5.000.000" -> 5000000)
            minOrderValue = parseInt(conditionMatch[1].replace(/[.,]/g, ''));
        }
        
        // Kiểm tra đơn hàng có đủ điều kiện không
        if (minOrderValue > 0 && subtotal < minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng phải từ ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ để áp dụng mã này`,
                minOrderValue: minOrderValue
            });
        }
        
        // Tính số tiền giảm
        if (discountPercent > 0) {
            discountAmount = Math.round(subtotal * discountPercent / 100);
            message = `Giảm ${discountPercent}% (${new Intl.NumberFormat('vi-VN').format(discountAmount)}đ)`;
        } else {
            // Nếu không có %, giả sử giảm cố định (có thể mở rộng logic sau)
            discountAmount = 0;
            message = promo.mo_ta;
        }
        
        res.json({
            success: true,
            data: {
                code: promo.ma_giam_gia,
                name: promo.ten_khuyen_mai,
                description: promo.mo_ta,
                discountPercent: discountPercent,
                discountAmount: discountAmount,
                minOrderValue: minOrderValue,
                message: message,
                validUntil: promo.ngay_ket_thuc
            }
        });
        
    } catch (error) {
        console.error('Apply promo error:', error);
        res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã giảm giá' });
    }
});

// ==========================================
// QUẢN LÝ THÔNG BÁO (ADMIN)
// ==========================================

// Lấy tất cả thông báo
router.get('/notifications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [notifications] = await db.query(`
            SELECT tb.*, tk.ten_dang_nhap
            FROM thong_bao tb
            LEFT JOIN tai_khoan tk ON tb.ma_tai_khoan = tk.ma_tai_khoan
            ORDER BY tb.ngay_tao DESC
            LIMIT 100
        `);
        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo' });
    }
});

// Tạo thông báo mới (gửi cho tất cả hoặc 1 user cụ thể)
router.post('/notifications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan } = req.body;

        if (!tieu_de) {
            return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO thong_bao (ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan)
            VALUES (?, ?, ?, ?, ?)
        `, [ma_tai_khoan || null, loai_thong_bao || 'system', tieu_de, noi_dung, duong_dan]);

        res.json({ success: true, message: 'Tạo thông báo thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo thông báo: ' + error.message });
    }
});

// Xóa thông báo
router.delete('/notifications/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM thong_bao_da_doc WHERE ma_thong_bao = ?', [req.params.id]);
        await db.query('DELETE FROM thong_bao WHERE ma_thong_bao = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa thông báo thành công' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa thông báo' });
    }
});

// ==========================================
// FLASH SALE - GIỜ VÀNG GIÁ SỐC
// ==========================================

// Thêm sản phẩm vào flash sale
router.post('/flash-sale', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_san_pham, gia_sale, phan_tram_giam, so_luong_gioi_han, thoi_gian_bat_dau, thoi_gian_ket_thuc } = req.body;
        
        // Kiểm tra giá sale không được âm
        if (gia_sale !== undefined && parseFloat(gia_sale) < 0) {
            return res.status(400).json({ success: false, message: 'Giá Flash Sale không được âm' });
        }
        
        // Lấy giá gốc của sản phẩm
        const [product] = await db.query('SELECT gia FROM san_pham WHERE ma_san_pham = ?', [ma_san_pham]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        
        const gia_goc = product[0].gia;
        
        // Kiểm tra xem sản phẩm đã có trong flash sale đang hoạt động chưa
        const [existing] = await db.query(
            `SELECT * FROM flash_sale 
             WHERE ma_san_pham = ? 
             AND trang_thai IN ('cho_dien_ra', 'dang_dien_ra')
             AND thoi_gian_ket_thuc > NOW()`,
            [ma_san_pham]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Sản phẩm đã có trong flash sale đang hoạt động' 
            });
        }
        
        // Thêm vào flash sale
        const [result] = await db.query(
            `INSERT INTO flash_sale 
             (ma_san_pham, gia_goc, gia_sale, phan_tram_giam, so_luong_gioi_han, 
              thoi_gian_bat_dau, thoi_gian_ket_thuc, nguoi_tao) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [ma_san_pham, gia_goc, gia_sale, phan_tram_giam, so_luong_gioi_han, 
             thoi_gian_bat_dau, thoi_gian_ket_thuc, req.user.ten_dang_nhap]
        );
        
        res.json({ 
            success: true, 
            message: 'Đã thêm sản phẩm vào flash sale',
            ma_flash_sale: result.insertId
        });
    } catch (error) {
        console.error('Add flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách flash sale
router.get('/flash-sale', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [flashSales] = await db.query(
            `SELECT fs.*, sp.ten_san_pham, sp.so_luong as ton_kho,
                    (SELECT duong_dan_anh FROM anh_san_pham 
                     WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
             FROM flash_sale fs
             JOIN san_pham sp ON fs.ma_san_pham = sp.ma_san_pham
             ORDER BY fs.ngay_tao DESC`
        );
        
        res.json({ success: true, data: flashSales });
    } catch (error) {
        console.error('Get flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Xóa sản phẩm khỏi flash sale
router.delete('/flash-sale/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM flash_sale WHERE ma_flash_sale = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa khỏi flash sale' });
    } catch (error) {
        console.error('Delete flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// POS MACHINES - QUẢN LÝ MÁY POS
// ==========================================
// QUẢN LÝ BÁN HÀNG POS
// ==========================================

// Lấy thống kê và danh sách hóa đơn bán hàng
router.get('/pos-machines', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Thống kê hóa đơn
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN trang_thai = 'hoan_thanh' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN trang_thai = 'da_huy' THEN 1 ELSE 0 END) as offline
            FROM hoa_don_ban_hang
        `);
        
        // Số giao dịch hôm nay
        const [transactionsToday] = await db.query(`
            SELECT COUNT(*) as count
            FROM hoa_don_ban_hang
            WHERE DATE(ngay_ban) = CURDATE()
        `);
        
        // Danh sách hóa đơn gần đây
        const [transactions] = await db.query(`
            SELECT 
                hd.ma_hoa_don_bh,
                hd.ma_hoa_don,
                hd.ten_khach_hang,
                hd.so_dien_thoai,
                hd.ten_nhan_vien,
                hd.ngay_ban as thoi_gian,
                hd.thuc_thu as so_tien,
                hd.phuong_thuc_thanh_toan,
                hd.trang_thai,
                hd.ghi_chu,
                GROUP_CONCAT(CONCAT(ct.ten_san_pham, ' x', ct.so_luong) SEPARATOR ', ') as san_pham
            FROM hoa_don_ban_hang hd
            LEFT JOIN chi_tiet_hoa_don_bh ct ON hd.ma_hoa_don_bh = ct.ma_hoa_don_bh
            GROUP BY hd.ma_hoa_don_bh
            ORDER BY hd.ngay_ban DESC
            LIMIT 50
        `);
        
        // Danh sách nhân viên
        const [employees] = await db.query(`
            SELECT ma_nhan_vien, ho_ten, chuc_vu
            FROM nhan_vien
            WHERE trang_thai = 1
            ORDER BY ho_ten
        `).catch(() => [[]]);
        
        // Doanh thu hôm nay
        const [revenueToday] = await db.query(`
            SELECT COALESCE(SUM(thuc_thu), 0) as total
            FROM hoa_don_ban_hang
            WHERE DATE(ngay_ban) = CURDATE() AND trang_thai = 'hoan_thanh'
        `);
        
        res.json({
            success: true,
            data: {
                machines: [], // Không dùng máy POS nữa
                employees,
                stats: {
                    total: stats[0].total || 0,
                    active: stats[0].active || 0,
                    offline: stats[0].offline || 0,
                    transactionsToday: transactionsToday[0].count || 0,
                    revenueToday: revenueToday[0].total || 0
                },
                transactions
            }
        });
        
    } catch (error) {
        console.error('Get POS data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải dữ liệu bán hàng',
            error: error.message 
        });
    }
});

// Tạo hóa đơn bán hàng mới
router.post('/pos-machines', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            ma_khach_hang, ten_khach_hang, so_dien_thoai, 
            ma_nhan_vien, ten_nhan_vien,
            san_pham, // Array: [{ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia}]
            giam_gia_hd, // Giảm giá toàn hóa đơn
            phuong_thuc_thanh_toan,
            ghi_chu
        } = req.body;
        
        if (!san_pham || san_pham.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng chọn sản phẩm' 
            });
        }
        
        // Tính tổng tiền
        let tong_tien = 0;
        for (const sp of san_pham) {
            tong_tien += (sp.don_gia * sp.so_luong) - (sp.giam_gia || 0);
        }
        
        const thuc_thu = tong_tien - (giam_gia_hd || 0);
        
        // Tạo mã hóa đơn
        const ma_hoa_don = 'HD' + new Date().toISOString().slice(0,10).replace(/-/g, '') + 
                          Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        // Thêm hóa đơn
        const [result] = await db.query(`
            INSERT INTO hoa_don_ban_hang 
            (ma_hoa_don, ma_khach_hang, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien,
             tong_tien, giam_gia, thuc_thu, phuong_thuc_thanh_toan, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'hoan_thanh', ?)
        `, [ma_hoa_don, ma_khach_hang, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien,
            tong_tien, giam_gia_hd || 0, thuc_thu, phuong_thuc_thanh_toan, ghi_chu]);
        
        const ma_hoa_don_bh = result.insertId;
        
        // Thêm chi tiết hóa đơn và cập nhật tồn kho
        for (const sp of san_pham) {
            const thanh_tien = (sp.don_gia * sp.so_luong) - (sp.giam_gia || 0);
            
            await db.query(`
                INSERT INTO chi_tiet_hoa_don_bh 
                (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, thanh_tien)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [ma_hoa_don_bh, sp.ma_san_pham, sp.ten_san_pham, sp.so_luong, sp.don_gia, sp.giam_gia || 0, thanh_tien]);
            
            // Cập nhật tồn kho
            await db.query(`
                UPDATE san_pham 
                SET so_luong = so_luong - ? 
                WHERE ma_san_pham = ?
            `, [sp.so_luong, sp.ma_san_pham]);
        }
        
        res.json({
            success: true,
            message: 'Đã tạo hóa đơn thành công',
            data: { ma_hoa_don, ma_hoa_don_bh }
        });
        
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tạo hóa đơn',
            error: error.message 
        });
    }
});

// Cập nhật trạng thái hóa đơn (hủy hóa đơn)
router.put('/pos-machines/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai, ghi_chu } = req.body;
        
        // Nếu hủy hóa đơn, hoàn lại tồn kho
        if (trang_thai === 'da_huy') {
            const [chiTiet] = await db.query(`
                SELECT ma_san_pham, so_luong 
                FROM chi_tiet_hoa_don_bh 
                WHERE ma_hoa_don_bh = ?
            `, [id]);
            
            for (const ct of chiTiet) {
                await db.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong + ? 
                    WHERE ma_san_pham = ?
                `, [ct.so_luong, ct.ma_san_pham]);
            }
        }
        
        await db.query(`
            UPDATE hoa_don_ban_hang 
            SET trang_thai = ?, ghi_chu = ?
            WHERE ma_hoa_don_bh = ?
        `, [trang_thai, ghi_chu, id]);
        
        res.json({
            success: true,
            message: 'Đã cập nhật hóa đơn thành công'
        });
        
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật hóa đơn',
            error: error.message 
        });
    }
});

// Xóa hóa đơn (không khuyến khích, nên dùng hủy)
router.delete('/pos-machines/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Hoàn lại tồn kho trước khi xóa
        const [chiTiet] = await db.query(`
            SELECT ma_san_pham, so_luong 
            FROM chi_tiet_hoa_don_bh 
            WHERE ma_hoa_don_bh = ?
        `, [id]);
        
        for (const ct of chiTiet) {
            await db.query(`
                UPDATE san_pham 
                SET so_luong = so_luong + ? 
                WHERE ma_san_pham = ?
            `, [ct.so_luong, ct.ma_san_pham]);
        }
        
        await db.query('DELETE FROM hoa_don_ban_hang WHERE ma_hoa_don_bh = ?', [id]);
        
        res.json({
            success: true,
            message: 'Đã xóa hóa đơn thành công'
        });
        
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa hóa đơn',
            error: error.message 
        });
    }
});

// Lấy chi tiết hóa đơn
router.get('/pos-transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date, nhanVienId } = req.query;
        
        let whereClause = '1=1';
        if (date) {
            whereClause += ` AND DATE(hd.ngay_ban) = '${date}'`;
        }
        if (nhanVienId) {
            whereClause += ` AND hd.ma_nhan_vien = ${nhanVienId}`;
        }
        
        const [transactions] = await db.query(`
            SELECT 
                hd.*,
                GROUP_CONCAT(CONCAT(ct.ten_san_pham, ' x', ct.so_luong) SEPARATOR ', ') as san_pham
            FROM hoa_don_ban_hang hd
            LEFT JOIN chi_tiet_hoa_don_bh ct ON hd.ma_hoa_don_bh = ct.ma_hoa_don_bh
            WHERE ${whereClause}
            GROUP BY hd.ma_hoa_don_bh
            ORDER BY hd.ngay_ban DESC
            LIMIT 100
        `);
        
        res.json({
            success: true,
            data: { transactions }
        });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải danh sách hóa đơn',
            error: error.message 
        });
    }
});

// ==========================================
// STORE CUSTOMERS - KHÁCH HÀNG TẠI CỬA HÀNG
// ==========================================

// Lấy danh sách khách hàng tại cửa hàng & thông tin bảo hành
router.get('/store-customers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, status } = req.query;
        
        let queryStr = `
            SELECT 
                hd.ma_hoa_don_bh,
                hd.ma_hoa_don,
                hd.ten_khach_hang,
                hd.so_dien_thoai,
                hd.ngay_ban,
                hd.ghi_chu,
                hd.tong_tien,
                hd.thuc_thu,
                ct.ma_chi_tiet,
                ct.ma_san_pham,
                ct.ten_san_pham,
                ct.so_luong,
                ct.don_gia
            FROM hoa_don_ban_hang hd
            LEFT JOIN chi_tiet_hoa_don_bh ct ON hd.ma_hoa_don_bh = ct.ma_hoa_don_bh
            WHERE 1=1
        `;
        const params = [];
        
        if (search) {
            queryStr += ` AND (hd.ten_khach_hang LIKE ? OR hd.so_dien_thoai LIKE ? OR ct.ten_san_pham LIKE ? OR hd.ma_hoa_don LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        queryStr += ` ORDER BY hd.ngay_ban DESC`;
        
        const [rows] = await db.query(queryStr, params);
        
        const today = new Date();
        const records = rows.map(row => {
            let warrantyMonths = 12; // default
            let notes = '';
            if (row.ghi_chu) {
                try {
                    const parsed = JSON.parse(row.ghi_chu);
                    if (parsed && typeof parsed.warranty_months !== 'undefined') {
                        warrantyMonths = parseInt(parsed.warranty_months, 10);
                    }
                    if (parsed && parsed.notes !== undefined) {
                        notes = parsed.notes;
                    } else {
                        notes = row.ghi_chu;
                    }
                } catch (e) {
                    const match = row.ghi_chu.match(/(\d+)\s*tháng/i) || row.ghi_chu.match(/bảo hành\s*(\d+)/i);
                    if (match) {
                        warrantyMonths = parseInt(match[1], 10);
                    }
                    notes = row.ghi_chu;
                }
            }
            
            const ngayBanDate = new Date(row.ngay_ban);
            const expiryDate = new Date(ngayBanDate);
            expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
            
            const isUnderWarranty = expiryDate >= today;
            
            return {
                ma_hoa_don_bh: row.ma_hoa_don_bh,
                ma_hoa_don: row.ma_hoa_don,
                ten_khach_hang: row.ten_khach_hang || 'Khách lẻ',
                so_dien_thoai: row.so_dien_thoai || '',
                ngay_ban: row.ngay_ban,
                warranty_months: warrantyMonths,
                expiry_date: expiryDate,
                is_under_warranty: isUnderWarranty,
                notes: notes,
                ma_san_pham: row.ma_san_pham,
                ten_san_pham: row.ten_san_pham || '',
                so_luong: row.so_luong || 1,
                don_gia: row.don_gia || 0
            };
        });
        
        let filteredRecords = records;
        if (status === 'active') {
            filteredRecords = records.filter(r => r.is_under_warranty);
        } else if (status === 'expired') {
            filteredRecords = records.filter(r => !r.is_under_warranty);
        }
        
        res.json({
            success: true,
            data: filteredRecords
        });
        
    } catch (error) {
        console.error('Get store customers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải danh sách khách hàng tại cửa hàng',
            error: error.message 
        });
    }
});

// Thêm khách hàng tại cửa hàng (offline purchase record)
router.post('/store-customers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            ten_khach_hang, 
            so_dien_thoai, 
            ma_san_pham, 
            ngay_ban, 
            warranty_months, 
            ghi_chu 
        } = req.body;
        
        if (!ten_khach_hang || !so_dien_thoai || !ma_san_pham) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ tên, số điện thoại và sản phẩm' 
            });
        }
        
        const [products] = await db.query(
            `SELECT ten_san_pham, gia FROM san_pham WHERE ma_san_pham = ?`,
            [ma_san_pham]
        );
        if (products.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        const product = products[0];
        
        const saleDate = ngay_ban ? new Date(ngay_ban) : new Date();
        const warrantyVal = warranty_months !== undefined ? parseInt(warranty_months, 10) : 12;
        
        const ma_hoa_don = 'HD_OFF_' + Date.now() + Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        const noteObj = {
            warranty_months: warrantyVal,
            notes: ghi_chu || ''
        };
        const ghi_chu_json = JSON.stringify(noteObj);
        
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            
            const [hdResult] = await conn.query(`
                INSERT INTO hoa_don_ban_hang 
                (ma_hoa_don, ten_khach_hang, so_dien_thoai, ngay_ban, tong_tien, thuc_thu, phuong_thuc_thanh_toan, trang_thai, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, 'tien_mat', 'hoan_thanh', ?)
            `, [ma_hoa_don, ten_khach_hang, so_dien_thoai, saleDate, product.gia, product.gia, ghi_chu_json]);
            
            const ma_hoa_don_bh = hdResult.insertId;
            
            await conn.query(`
                INSERT INTO chi_tiet_hoa_don_bh 
                (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, thanh_tien)
                VALUES (?, ?, ?, 1, ?, ?)
            `, [ma_hoa_don_bh, ma_san_pham, product.ten_san_pham, product.gia, product.gia]);
            
            await conn.query(`
                UPDATE san_pham 
                SET so_luong = GREATEST(0, so_luong - 1) 
                WHERE ma_san_pham = ?
            `, [ma_san_pham]);
            
            await conn.commit();
            res.json({
                success: true,
                message: 'Thêm thông tin mua hàng thành công',
                data: { ma_hoa_don_bh }
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
        
    } catch (error) {
        console.error('Create store customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tạo thông tin mua hàng',
            error: error.message 
        });
    }
});

// Cập nhật thông tin khách hàng tại cửa hàng
router.put('/store-customers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            ten_khach_hang, 
            so_dien_thoai, 
            ma_san_pham, 
            ngay_ban, 
            warranty_months, 
            ghi_chu 
        } = req.body;
        
        if (!ten_khach_hang || !so_dien_thoai || !ma_san_pham) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ tên, số điện thoại và sản phẩm' 
            });
        }
        
        const [products] = await db.query(
            `SELECT ten_san_pham, gia FROM san_pham WHERE ma_san_pham = ?`,
            [ma_san_pham]
        );
        if (products.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        const product = products[0];
        
        const saleDate = ngay_ban ? new Date(ngay_ban) : new Date();
        const warrantyVal = warranty_months !== undefined ? parseInt(warranty_months, 10) : 12;
        
        const noteObj = {
            warranty_months: warrantyVal,
            notes: ghi_chu || ''
        };
        const ghi_chu_json = JSON.stringify(noteObj);
        
        const [oldDetails] = await db.query(
            `SELECT ma_san_pham, so_luong FROM chi_tiet_hoa_don_bh WHERE ma_hoa_don_bh = ?`,
            [id]
        );
        
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            
            if (oldDetails.length > 0) {
                const oldSp = oldDetails[0];
                await conn.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong + ? 
                    WHERE ma_san_pham = ?
                `, [oldSp.so_luong, oldSp.ma_san_pham]);
            }
            
            await conn.query(`
                UPDATE hoa_don_ban_hang 
                SET ten_khach_hang = ?, so_dien_thoai = ?, ngay_ban = ?, tong_tien = ?, thuc_thu = ?, ghi_chu = ?
                WHERE ma_hoa_don_bh = ?
            `, [ten_khach_hang, so_dien_thoai, saleDate, product.gia, product.gia, ghi_chu_json, id]);
            
            await conn.query(`DELETE FROM chi_tiet_hoa_don_bh WHERE ma_hoa_don_bh = ?`, [id]);
            
            await conn.query(`
                INSERT INTO chi_tiet_hoa_don_bh 
                (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, thanh_tien)
                VALUES (?, ?, ?, 1, ?, ?)
            `, [id, ma_san_pham, product.ten_san_pham, product.gia, product.gia]);
            
            await conn.query(`
                UPDATE san_pham 
                SET so_luong = GREATEST(0, so_luong - 1) 
                WHERE ma_san_pham = ?
            `, [ma_san_pham]);
            
            await conn.commit();
            res.json({
                success: true,
                message: 'Cập nhật thông tin mua hàng thành công'
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
        
    } catch (error) {
        console.error('Update store customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật thông tin mua hàng',
            error: error.message 
        });
    }
});

// Xóa thông tin khách hàng tại cửa hàng (offine record)
router.delete('/store-customers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [chiTiet] = await db.query(
            `SELECT ma_san_pham, so_luong FROM chi_tiet_hoa_don_bh WHERE ma_hoa_don_bh = ?`,
            [id]
        );
        
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            
            for (const ct of chiTiet) {
                await conn.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong + ? 
                    WHERE ma_san_pham = ?
                `, [ct.so_luong, ct.ma_san_pham]);
            }
            
            await conn.query(`DELETE FROM hoa_don_ban_hang WHERE ma_hoa_don_bh = ?`, [id]);
            
            await conn.commit();
            res.json({
                success: true,
                message: 'Xóa thông tin khách hàng tại cửa hàng thành công'
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
        
    } catch (error) {
        console.error('Delete store customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa thông tin khách hàng tại cửa hàng',
            error: error.message 
        });
    }
});

// ==========================================
// EXPENSE TYPES - QUẢN LÝ LOẠI CHI PHÍ
// ==========================================

// Lấy danh sách loại chi phí
router.get('/expense-types', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [types] = await db.query(`
            SELECT * FROM loai_chi_phi
            ORDER BY phan_nhom, ten_hien_thi
        `);
        
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN phan_nhom = 'co_dinh' THEN 1 ELSE 0 END) as fixed,
                SUM(CASE WHEN phan_nhom = 'phat_sinh' THEN 1 ELSE 0 END) as variable,
                SUM(CASE WHEN trang_thai = 1 THEN 1 ELSE 0 END) as active
            FROM loai_chi_phi
        `);
        
        res.json({
            success: true,
            data: {
                types,
                stats: stats[0]
            }
        });
        
    } catch (error) {
        console.error('Get expense types error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải loại chi phí',
            error: error.message 
        });
    }
});

// Thêm loại chi phí mới
router.post('/expense-types', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_loai, ten_hien_thi, phan_nhom, icon, mo_ta, mau_sac, trang_thai } = req.body;
        
        if (!ten_hien_thi || !phan_nhom) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin bắt buộc' 
            });
        }
        
        const createExpenseTypeCode = (name) => {
            const normalized = name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');

            return normalized || `loai_chi_phi_${Date.now()}`;
        };

        const baseCode = (ma_loai || createExpenseTypeCode(ten_hien_thi))
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '') || `loai_chi_phi_${Date.now()}`;
        let finalCode = baseCode;
        let suffix = 1;

        // Check if code already exists
        while (true) {
            const [existing] = await db.query('SELECT ma_loai FROM loai_chi_phi WHERE ma_loai = ?', [finalCode]);
            if (existing.length === 0) break;
            suffix += 1;
            finalCode = `${baseCode}_${suffix}`;
        }

        await db.query(`
            INSERT INTO loai_chi_phi (ma_loai, ten_hien_thi, phan_nhom, icon, mo_ta, mau_sac, trang_thai, ngay_tao)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [finalCode, ten_hien_thi, phan_nhom, icon || '📋', mo_ta || null, mau_sac || 'blue', trang_thai || 1]);
        
        res.json({
            success: true,
            message: 'Đã thêm loại chi phí thành công'
        });
        
    } catch (error) {
        console.error('Add expense type error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi thêm loại chi phí',
            error: error.message 
        });
    }
});

// Cập nhật loại chi phí
router.put('/expense-types/:code', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code } = req.params;
        const { ten_hien_thi, phan_nhom, icon, mo_ta, mau_sac, trang_thai } = req.body;
        
        await db.query(`
            UPDATE loai_chi_phi 
            SET ten_hien_thi = ?, phan_nhom = ?, icon = ?, mo_ta = ?, mau_sac = ?, trang_thai = ?, ngay_cap_nhat = NOW()
            WHERE ma_loai = ?
        `, [ten_hien_thi, phan_nhom, icon, mo_ta, mau_sac, trang_thai, code]);
        
        res.json({
            success: true,
            message: 'Đã cập nhật loại chi phí thành công'
        });
        
    } catch (error) {
        console.error('Update expense type error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật loại chi phí',
            error: error.message 
        });
    }
});

// Xóa loại chi phí
router.delete('/expense-types/:code', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code } = req.params;
        
        // Check if type is being used
        const [usage] = await db.query('SELECT COUNT(*) as count FROM chi_phi_hang_ngay WHERE loai_chi_phi = ?', [code]);
        if (usage[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Không thể xóa vì đã có ${usage[0].count} chi phí sử dụng loại này` 
            });
        }
        
        await db.query('DELETE FROM loai_chi_phi WHERE ma_loai = ?', [code]);
        
        res.json({
            success: true,
            message: 'Đã xóa loại chi phí thành công'
        });
        
    } catch (error) {
        console.error('Delete expense type error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa loại chi phí',
            error: error.message 
        });
    }
});

// ==========================================
// DAILY EXPENSES - CHI PHÍ HÀNG NGÀY
// ==========================================

// Lấy danh sách chi phí
router.get('/daily-expenses', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, type, search } = req.query;
        
        let whereClause = '1=1';
        if (startDate && endDate) {
            whereClause += ` AND DATE(cp.ngay_chi) BETWEEN '${startDate}' AND '${endDate}'`;
        } else if (startDate) {
            whereClause += ` AND DATE(cp.ngay_chi) >= '${startDate}'`;
        } else if (endDate) {
            whereClause += ` AND DATE(cp.ngay_chi) <= '${endDate}'`;
        }
        
        if (type) {
            whereClause += ` AND cp.loai_chi_phi = '${type}'`;
        }
        
        if (search) {
            whereClause += ` AND cp.mo_ta LIKE '%${search}%'`;
        }
        
        // Lấy danh sách chi phí với thông tin loại chi phí
        const [expenses] = await db.query(`
            SELECT cp.*, lcp.ten_hien_thi, lcp.icon, lcp.phan_nhom, lcp.mau_sac
            FROM chi_phi_hang_ngay cp
            LEFT JOIN loai_chi_phi lcp ON cp.loai_chi_phi = lcp.ma_loai
            WHERE ${whereClause}
            ORDER BY cp.ngay_chi DESC, cp.ngay_tao DESC
        `);
        
        // Thống kê
        const [statsToday] = await db.query(`
            SELECT COALESCE(SUM(so_tien), 0) as total
            FROM chi_phi_hang_ngay
            WHERE DATE(ngay_chi) = CURDATE()
        `);
        
        const [statsMonth] = await db.query(`
            SELECT COALESCE(SUM(so_tien), 0) as total, COUNT(*) as count
            FROM chi_phi_hang_ngay
            WHERE YEAR(ngay_chi) = YEAR(CURDATE()) AND MONTH(ngay_chi) = MONTH(CURDATE())
        `);
        
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const avgPerDay = statsMonth[0].total / daysInMonth;
        
        // Chi phí theo loại (tháng này)
        const [byType] = await db.query(`
            SELECT lcp.ten_hien_thi, lcp.icon, SUM(cp.so_tien) as total
            FROM chi_phi_hang_ngay cp
            LEFT JOIN loai_chi_phi lcp ON cp.loai_chi_phi = lcp.ma_loai
            WHERE YEAR(cp.ngay_chi) = YEAR(CURDATE()) AND MONTH(cp.ngay_chi) = MONTH(CURDATE())
            GROUP BY cp.loai_chi_phi, lcp.ten_hien_thi, lcp.icon
        `);
        
        // Xu hướng 30 ngày
        const [trend] = await db.query(`
            SELECT DATE(ngay_chi) as date, SUM(so_tien) as total
            FROM chi_phi_hang_ngay
            WHERE ngay_chi >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(ngay_chi)
            ORDER BY date
        `);
        
        // Lấy danh sách loại chi phí đang hoạt động
        const [expenseTypes] = await db.query(`
            SELECT ma_loai, ten_hien_thi, icon, phan_nhom
            FROM loai_chi_phi
            WHERE trang_thai = 1
            ORDER BY phan_nhom, ten_hien_thi
        `);
        
        res.json({
            success: true,
            data: {
                expenses,
                expenseTypes,
                stats: {
                    today: parseFloat(statsToday[0].total),
                    thisMonth: parseFloat(statsMonth[0].total),
                    avgPerDay: avgPerDay,
                    count: statsMonth[0].count
                },
                byType: {
                    labels: byType.map(t => `${t.icon} ${t.ten_hien_thi}`),
                    values: byType.map(t => parseFloat(t.total))
                },
                trend: {
                    labels: trend.map(t => new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })),
                    values: trend.map(t => parseFloat(t.total))
                }
            }
        });
        
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải chi phí',
            error: error.message 
        });
    }
});

// Thêm chi phí mới
router.post('/daily-expenses', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ngay_chi, loai_chi_phi, so_tien, mo_ta } = req.body;
        
        if (!ngay_chi || !loai_chi_phi || !so_tien) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin bắt buộc' 
            });
        }
        
        if (so_tien <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Số tiền phải lớn hơn 0' 
            });
        }
        
        const [result] = await db.query(`
            INSERT INTO chi_phi_hang_ngay (ngay_chi, loai_chi_phi, so_tien, mo_ta, nguoi_tao, ngay_tao)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [ngay_chi, loai_chi_phi, so_tien, mo_ta || null, req.user.username]);
        
        res.json({
            success: true,
            message: 'Đã thêm chi phí thành công',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('Add expense error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi thêm chi phí',
            error: error.message 
        });
    }
});

// Xóa chi phí
router.delete('/daily-expenses/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('DELETE FROM chi_phi_hang_ngay WHERE ma_chi_phi = ?', [id]);
        
        res.json({
            success: true,
            message: 'Đã xóa chi phí thành công'
        });
        
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa chi phí',
            error: error.message 
        });
    }
});

// ==========================================
// FINANCIAL REPORT - BÁO CÁO TÀI CHÍNH
// ==========================================
router.get('/financial-report', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        
        let start, end;
        const now = new Date();
        
        switch(period) {
            case 'today':
                start = end = now.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                start = end = yesterday.toISOString().split('T')[0];
                break;
            case '7days':
                end = now.toISOString().split('T')[0];
                const week = new Date(now);
                week.setDate(week.getDate() - 7);
                start = week.toISOString().split('T')[0];
                break;
            case '30days':
                end = now.toISOString().split('T')[0];
                const month = new Date(now);
                month.setDate(month.getDate() - 30);
                start = month.toISOString().split('T')[0];
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'lastMonth':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                start = lastMonth.toISOString().split('T')[0];
                end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                break;
            case 'thisQuarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'custom':
                start = startDate;
                end = endDate;
                break;
            default:
                end = now.toISOString().split('T')[0];
                const defaultMonth = new Date(now);
                defaultMonth.setDate(defaultMonth.getDate() - 30);
                start = defaultMonth.toISOString().split('T')[0];
        }
        
        const orderDateFilter = `DATE(ngay_tao) BETWEEN '${start}' AND '${end}'`;
        const expenseDateFilter = `DATE(ngay_chi) BETWEEN '${start}' AND '${end}'`;
        
        // 1. Tổng doanh thu (đơn hoàn thành + đang giao)
        const [revenueResult] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total
            FROM don_hang
            WHERE trang_thai_don_hang IN ('hoan_thanh', 'dang_giao') AND ${orderDateFilter}
        `);
        const totalRevenue = parseFloat(revenueResult[0].total);
        
        // 2. Tổng chi phí thực tế (chi phí hàng ngày + nhập hàng từ nhà cung cấp)
        const [expenseResult] = await db.query(`
            SELECT COALESCE(SUM(so_tien), 0) as total
            FROM chi_phi_hang_ngay
            WHERE ${expenseDateFilter}
        `);
        const dailyExpenseSum = parseFloat(expenseResult[0].total);
        
        const [receivingExpenseResult] = await db.query(`
            SELECT COALESCE(SUM(tong_gia_tri), 0) as total
            FROM phieu_nhap_hang
            WHERE trang_thai IN ('hoan_thanh', 'co_van_de') AND DATE(ngay_nhap) BETWEEN '${start}' AND '${end}'
        `);
        const receivingExpenseSum = parseFloat(receivingExpenseResult[0].total);
        
        const totalExpense = dailyExpenseSum + receivingExpenseSum;
        
        // 3. Lợi nhuận
        const profit = totalRevenue - totalExpense;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        
        // 4. Xu hướng so với kỳ trước (giả định để giữ tương thích)
        const revenueTrend = 0;
        const expenseTrend = 0;
        const profitTrend = 0;
        const marginTrend = 0;
        
        // 5. Dữ liệu biểu đồ xu hướng (12 tháng gần nhất) với số liệu thật từ db
        const [trendRevenueData] = await db.query(`
            SELECT 
                DATE_FORMAT(ngay_tao, '%Y-%m') as month,
                SUM(tong_tien) as total
            FROM don_hang
            WHERE trang_thai_don_hang IN ('hoan_thanh', 'dang_giao') AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m')
        `);
        
        const [trendExpenseData] = await db.query(`
            SELECT month, SUM(total) as total FROM (
                SELECT 
                    DATE_FORMAT(ngay_chi, '%Y-%m') as month,
                    SUM(so_tien) as total
                FROM chi_phi_hang_ngay
                WHERE ngay_chi >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(ngay_chi, '%Y-%m')
                
                UNION ALL
                
                SELECT 
                    DATE_FORMAT(ngay_nhap, '%Y-%m') as month,
                    SUM(tong_gia_tri) as total
                FROM phieu_nhap_hang
                WHERE trang_thai IN ('hoan_thanh', 'co_van_de') AND ngay_nhap >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(ngay_nhap, '%Y-%m')
            ) combined
            GROUP BY month
        `);
        
        const allMonths = Array.from(new Set([
            ...trendRevenueData.map(d => d.month),
            ...trendExpenseData.map(d => d.month)
        ])).sort();
        
        const trendLabels = allMonths;
        const trendRevenue = allMonths.map(m => {
            const found = trendRevenueData.find(d => d.month === m);
            return found ? parseFloat(found.total) : 0;
        });
        const trendExpense = allMonths.map(m => {
            const found = trendExpenseData.find(d => d.month === m);
            return found ? parseFloat(found.total) : 0;
        });
        const trendProfit = trendRevenue.map((r, i) => r - trendExpense[i]);
        
        // 6. Cơ cấu chi phí thật dựa trên loại chi phí được nhập + nhập hàng
        const [expenseStructData] = await db.query(`
            SELECT lcp.ten_hien_thi as category, SUM(cp.so_tien) as total
            FROM chi_phi_hang_ngay cp
            LEFT JOIN loai_chi_phi lcp ON cp.loai_chi_phi = lcp.ma_loai
            WHERE ${expenseDateFilter}
            GROUP BY cp.loai_chi_phi, lcp.ten_hien_thi
        `);
        
        const expenseStructCombined = expenseStructData.map(d => ({
            ten_hien_thi: d.category || 'Khác',
            total: parseFloat(d.total)
        }));
        
        if (receivingExpenseSum > 0) {
            expenseStructCombined.push({
                ten_hien_thi: 'Tiền Nhập hàng',
                total: receivingExpenseSum
            });
        }
        
        const expenseStructure = {
            labels: expenseStructCombined.map(d => d.ten_hien_thi),
            values: expenseStructCombined.map(d => d.total)
        };
        
        // Đảm bảo không bị trống cơ cấu chi phí
        if (expenseStructure.labels.length === 0) {
            expenseStructure.labels = ['Không có chi phí'];
            expenseStructure.values = [0];
        }
        
        // 7. Công nợ (giả lập tương thích)
        const debt = {
            customerTotal: 0,
            customerOverdue: 0,
            customerCurrent: 0,
            supplierTotal: 0,
            supplierOverdue: 0,
            supplierCurrent: 0,
            topCustomers: [],
            topSuppliers: []
        };
        
        // 8. KPI (Thống kê đơn hàng thực tế)
        const [orderStats] = await db.query(`
            SELECT 
                COUNT(*) as totalOrders,
                COUNT(CASE WHEN trang_thai_don_hang = 'hoan_thanh' THEN 1 END) as completedOrders,
                AVG(tong_tien) as avgOrderValue
            FROM don_hang
            WHERE ${orderDateFilter}
        `);
        
        const kpi = {
            roi: totalExpense > 0 ? (profit / totalExpense) * 100 : 0,
            inventoryTurnover: 0,
            avgOrderValue: parseFloat(orderStats[0].avgOrderValue) || 0,
            completionRate: orderStats[0].totalOrders > 0 
                ? (orderStats[0].completedOrders / orderStats[0].totalOrders) * 100 
                : 0
        };
        
        // 9. Giao dịch chi tiết: Ghép cả Đơn hàng (Thu), Chi phí hoạt động (Chi) và Nhập hàng (Chi) trong kỳ
        const [transactions] = await db.query(`
            (SELECT 
                ma_don_hang as id,
                ngay_tao as date,
                'revenue' as type,
                CONCAT('Đơn hàng #', ma_don_hang) as description,
                tong_tien as amount,
                'completed' as status
            FROM don_hang
            WHERE trang_thai_don_hang IN ('hoan_thanh', 'dang_giao') AND ${orderDateFilter})
            
            UNION ALL
            
            (SELECT 
                ma_chi_phi as id,
                ngay_chi as date,
                'expense' as type,
                COALESCE(mo_ta, 'Chi phí hàng ngày') as description,
                so_tien as amount,
                'completed' as status
            FROM chi_phi_hang_ngay
            WHERE ${expenseDateFilter})
            
            UNION ALL
            
            (SELECT 
                ma_phieu_nhap as id,
                ngay_nhap as date,
                'expense' as type,
                CONCAT('Nhập hàng - Phiếu #', ma_phieu_nhap, COALESCE(CONCAT(' (', ghi_chu, ')'), '')) as description,
                tong_gia_tri as amount,
                'completed' as status
            FROM phieu_nhap_hang
            WHERE trang_thai IN ('hoan_thanh', 'co_van_de') AND DATE(ngay_nhap) BETWEEN '${start}' AND '${end}')
            
            ORDER BY date DESC
            LIMIT 200
        `);
        
        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalExpense,
                    profit,
                    profitMargin,
                    revenueTrend,
                    expenseTrend,
                    profitTrend,
                    marginTrend
                },
                trendData: {
                    labels: trendLabels,
                    revenue: trendRevenue,
                    expense: trendExpense,
                    profit: trendProfit
                },
                expenseStructure,
                debt,
                kpi,
                transactions
            }
        });
        
    } catch (error) {
        console.error('Financial report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải báo cáo tài chính',
            error: error.message 
        });
    }
});

// Export báo cáo tài chính
router.get('/financial-report/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { format } = req.query;
        
        // Giả lập export - trong thực tế cần dùng thư viện như exceljs, pdfkit
        if (format === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=bao-cao-tai-chinh.xlsx');
            res.send('Excel file content here');
        } else if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=bao-cao-tai-chinh.pdf');
            res.send('PDF file content here');
        } else {
            res.status(400).json({ success: false, message: 'Format không hợp lệ' });
        }
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xuất báo cáo',
            error: error.message 
        });
    }
});

// ==========================================
// QUẢN LÝ ĐẶT HÀNG (PRE-ORDER)
// ==========================================

// Lấy danh sách đơn đặt hàng
router.get('/pre-orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        
        let whereClause = '1=1';
        const queryParams = [];
        if (status && status !== 'all') {
            whereClause = 'ddh.trang_thai = ?';
            queryParams.push(status);
        }
        
        const [orders] = await db.query(`
            SELECT 
                ddh.*,
                ncc.ten_nha_cung_cap,
                CASE 
                    WHEN ddh.trang_thai = 'pending' THEN 'Đang xử lý'
                    WHEN ddh.trang_thai = 'confirmed' THEN 'Đã xác nhận'
                    WHEN ddh.trang_thai = 'in_stock' THEN 'Đã có hàng'
                    WHEN ddh.trang_thai = 'completed' THEN 'Hoàn thành'
                    WHEN ddh.trang_thai = 'cancelled' THEN 'Đã hủy'
                    ELSE ddh.trang_thai
                END as trang_thai_text
            FROM don_dat_hang ddh
            LEFT JOIN nha_cung_cap ncc ON ddh.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE ${whereClause}
            ORDER BY ddh.ngay_tao DESC
        `, queryParams);
        
        // Thống kê
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN trang_thai = 'pending' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN trang_thai = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed,
                COALESCE(SUM(CASE WHEN trang_thai = 'in_stock' THEN 1 ELSE 0 END), 0) as in_stock,
                COALESCE(SUM(CASE WHEN trang_thai = 'completed' THEN 1 ELSE 0 END), 0) as completed,
                COALESCE(SUM(so_luong * gia_du_kien), 0) as total_value
            FROM don_dat_hang
        `);

        const [suppliers] = await db.query(`
            SELECT ma_nha_cung_cap, ten_nha_cung_cap
            FROM nha_cung_cap
            WHERE trang_thai = 'hoat_dong'
            ORDER BY ten_nha_cung_cap ASC
        `);

        const rawStats = statsRows[0] || {};
        const stats = {
            total: Number(rawStats.total) || 0,
            pending: Number(rawStats.pending) || 0,
            confirmed: Number(rawStats.confirmed) || 0,
            in_stock: Number(rawStats.in_stock) || 0,
            completed: Number(rawStats.completed) || 0,
            total_value: Number(rawStats.total_value) || 0,
            totalValue: Number(rawStats.total_value) || 0
        };
        
        res.json({
            success: true,
            data: {
                preOrders: orders,
                suppliers,
                stats
            },
            preOrders: orders,
            suppliers,
            stats
        });
        
    } catch (error) {
        console.error('Get pre-orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải danh sách đơn đặt hàng',
            error: error.message 
        });
    }
});

// Tạo đơn đặt hàng mới
router.post('/pre-orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            loai,
            ten_khach_hang,
            so_dien_thoai,
            email,
            dia_chi,
            ten_san_pham,
            so_luong,
            gia_du_kien,
            mo_ta,
            ma_nha_cung_cap,
            ngay_du_kien,
            ghi_chu
        } = req.body;
        
        // Validate
        if (!loai || !ten_khach_hang || !so_dien_thoai || !ten_san_pham || !so_luong) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc' 
            });
        }
        
        // Tạo mã đơn đặt hàng
        const ma_don_dat = 'DDH' + Date.now();
        
        const [result] = await db.query(`
            INSERT INTO don_dat_hang (
                ma_don_dat, loai, ten_khach_hang, so_dien_thoai, email, dia_chi,
                ten_san_pham, so_luong, gia_du_kien, mo_ta, ma_nha_cung_cap,
                ngay_du_kien, trang_thai, ghi_chu, ngay_tao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
        `, [
            ma_don_dat, loai, ten_khach_hang, so_dien_thoai, email, dia_chi,
            ten_san_pham, so_luong, gia_du_kien, mo_ta, ma_nha_cung_cap,
            ngay_du_kien, ghi_chu
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Tạo đơn đặt hàng thành công',
            data: { 
                ma_don_dat_hang: result.insertId,
                ma_don_dat 
            }
        });
        
    } catch (error) {
        console.error('Create pre-order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tạo đơn đặt hàng',
            error: error.message 
        });
    }
});

// Cập nhật trạng thái đơn đặt hàng
router.put('/pre-orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'in_stock', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Trạng thái không hợp lệ' 
            });
        }
        
        await db.query(`
            UPDATE don_dat_hang 
            SET trang_thai = ?, ngay_cap_nhat = NOW()
            WHERE ma_don_dat_hang = ?
        `, [status, id]);
        
        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        });
        
    } catch (error) {
        console.error('Update pre-order status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật trạng thái',
            error: error.message 
        });
    }
});

// ==========================================
// QUẢN LÝ NHÀ CUNG CẤP CRUD (SUPPLIERS)
// ==========================================

// Lấy toàn bộ danh sách nhà cung cấp (với bộ lọc & tìm kiếm)
router.get('/suppliers/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = 'SELECT * FROM nha_cung_cap WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (ten_nha_cung_cap LIKE ? OR so_dien_thoai LIKE ? OR email LIKE ? OR nguoi_lien_he LIKE ?)';
            const keyword = `%${search}%`;
            params.push(keyword, keyword, keyword, keyword);
        }

        if (status) {
            query += ' AND trang_thai = ?';
            params.push(status);
        }

        query += ' ORDER BY ngay_tao DESC';

        const [suppliers] = await db.query(query, params);
        res.json({ success: true, data: suppliers });
    } catch (error) {
        console.error('Get supplier list error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải danh sách nhà cung cấp' });
    }
});

// Lấy thông tin chi tiết một nhà cung cấp (kèm các phiếu nhập gần đây)
router.get('/suppliers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        const [supplier] = await db.query('SELECT * FROM nha_cung_cap WHERE ma_nha_cung_cap = ?', [supplierId]);
        
        if (supplier.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }

        // Lấy lịch sử phiếu nhập hàng gần nhất của nhà cung cấp này
        let receivings = [];
        try {
            const [rows] = await db.query(`
                SELECT ma_phieu_nhap, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai
                FROM phieu_nhap_hang
                WHERE ma_nha_cung_cap = ?
                ORDER BY ngay_nhap DESC
                LIMIT 10
            `, [supplierId]);
            receivings = rows;
        } catch (e) {
            console.warn('Warning: phieu_nhap_hang lookup failed (table might be empty or different):', e.message);
        }

        res.json({ 
            success: true, 
            data: { 
                supplier: supplier[0],
                recent_receivings: receivings
            } 
        });
    } catch (error) {
        console.error('Get supplier detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải chi tiết nhà cung cấp' });
    }
});

// Thêm nhà cung cấp mới
router.post('/suppliers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_nha_cung_cap, so_dien_thoai, email, dia_chi, nguoi_lien_he, trang_thai, ghi_chu } = req.body;
        
        if (!ten_nha_cung_cap) {
            return res.status(400).json({ success: false, message: 'Tên nhà cung cấp là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO nha_cung_cap (ten_nha_cung_cap, so_dien_thoai, email, dia_chi, nguoi_lien_he, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [ten_nha_cung_cap, so_dien_thoai || null, email || null, dia_chi || null, nguoi_lien_he || null, trang_thai || 'hoat_dong', ghi_chu || null]);

        res.status(201).json({ 
            success: true, 
            message: 'Thêm nhà cung cấp thành công', 
            data: { ma_nha_cung_cap: result.insertId } 
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm nhà cung cấp' });
    }
});

// Cập nhật nhà cung cấp
router.put('/suppliers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        const { ten_nha_cung_cap, so_dien_thoai, email, dia_chi, nguoi_lien_he, trang_thai, ghi_chu } = req.body;

        if (!ten_nha_cung_cap) {
            return res.status(400).json({ success: false, message: 'Tên nhà cung cấp là bắt buộc' });
        }

        await db.query(`
            UPDATE nha_cung_cap
            SET ten_nha_cung_cap = ?, so_dien_thoai = ?, email = ?, dia_chi = ?, nguoi_lien_he = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_nha_cung_cap = ?
        `, [ten_nha_cung_cap, so_dien_thoai || null, email || null, dia_chi || null, nguoi_lien_he || null, trang_thai || 'hoat_dong', ghi_chu || null, supplierId]);

        res.json({ success: true, message: 'Cập nhật nhà cung cấp thành công' });
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật nhà cung cấp' });
    }
});

// Xóa hoặc ngưng hoạt động nhà cung cấp
router.delete('/suppliers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Kiểm tra xem nhà cung cấp có liên kết với phiếu nhập hàng nào không
        let linkedCount = 0;
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM phieu_nhap_hang WHERE ma_nha_cung_cap = ?', [supplierId]);
            linkedCount = rows[0]?.count || 0;
        } catch (e) {
            console.warn('Warning: check linked count failed (phieu_nhap_hang might not exist yet):', e.message);
        }

        if (linkedCount > 0) {
            // Có liên kết -> chuyển sang trạng thái ngưng hoạt động (Soft delete)
            await db.query("UPDATE nha_cung_cap SET trang_thai = 'ngung_hoat_dong' WHERE ma_nha_cung_cap = ?", [supplierId]);
            return res.json({ 
                success: true, 
                message: 'Nhà cung cấp đã được chuyển sang trạng thái "Ngừng hợp tác" do đã có lịch sử nhập hàng.' 
            });
        }

        // Không có liên kết -> Xóa cứng
        await db.query('DELETE FROM nha_cung_cap WHERE ma_nha_cung_cap = ?', [supplierId]);
        res.json({ success: true, message: 'Xóa nhà cung cấp thành công' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa nhà cung cấp' });
    }
});

// Lấy danh sách nhà cung cấp (để chọn trong form)
router.get('/suppliers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [suppliers] = await db.query(`
            SELECT ma_nha_cung_cap, ten_nha_cung_cap, so_dien_thoai, email
            FROM nha_cung_cap
            WHERE trang_thai = 'hoat_dong'
            ORDER BY ten_nha_cung_cap
        `);
        
        res.json({
            success: true,
            data: suppliers
        });
        
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải danh sách nhà cung cấp',
            error: error.message 
        });
    }
});

// ==========================================
// ==========================================
// QUẢN LÝ LINH KIỆN CRUD (COMPONENTS)
// ==========================================

// Lấy danh sách linh kiện (với bộ lọc & tìm kiếm)
router.get('/components/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, category, status, supplier } = req.query;
        let query = `
            SELECT lk.*, ncc.ten_nha_cung_cap
            FROM linh_kien lk
            LEFT JOIN nha_cung_cap ncc ON lk.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (lk.ten_linh_kien LIKE ? OR lk.tuong_thich LIKE ?)';
            const keyword = `%${search}%`;
            params.push(keyword, keyword);
        }

        if (category) {
            query += ' AND lk.loai_linh_kien = ?';
            params.push(category);
        }

        if (status) {
            query += ' AND lk.trang_thai = ?';
            params.push(status);
        }

        if (supplier) {
            query += ' AND lk.ma_nha_cung_cap = ?';
            params.push(supplier);
        }

        query += ' ORDER BY lk.ngay_tao DESC';

        const [components] = await db.query(query, params);
        res.json({ success: true, data: components });
    } catch (error) {
        console.error('Get components list error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải danh sách linh kiện' });
    }
});

// Lấy thông tin chi tiết một linh kiện
router.get('/components/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const componentId = req.params.id;
        const [component] = await db.query('SELECT * FROM linh_kien WHERE ma_linh_kien = ?', [componentId]);
        
        if (component.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy linh kiện' });
        }

        res.json({ success: true, data: component[0] });
    } catch (error) {
        console.error('Get component detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải chi tiết linh kiện' });
    }
});

// Thêm linh kiện mới
router.post('/components', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_linh_kien, loai_linh_kien, tuong_thich, ma_nha_cung_cap, gia_nhap, gia_ban, so_luong_ton, vi_tri_kho, trang_thai, ghi_chu } = req.body;
        
        if (!ten_linh_kien || !loai_linh_kien || !tuong_thich) {
            return res.status(400).json({ success: false, message: 'Tên, loại linh kiện và dòng máy tương thích là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO linh_kien (ten_linh_kien, loai_linh_kien, tuong_thich, ma_nha_cung_cap, gia_nhap, gia_ban, so_luong_ton, vi_tri_kho, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ten_linh_kien, 
            loai_linh_kien, 
            tuong_thich, 
            ma_nha_cung_cap || null, 
            gia_nhap || 0, 
            gia_ban || 0, 
            so_luong_ton || 0, 
            vi_tri_kho || null, 
            trang_thai || 'con_hang', 
            ghi_chu || null
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Thêm linh kiện thành công', 
            data: { ma_linh_kien: result.insertId } 
        });
    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm linh kiện' });
    }
});

// Cập nhật linh kiện
router.put('/components/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const componentId = req.params.id;
        const { ten_linh_kien, loai_linh_kien, tuong_thich, ma_nha_cung_cap, gia_nhap, gia_ban, so_luong_ton, vi_tri_kho, trang_thai, ghi_chu } = req.body;

        if (!ten_linh_kien || !loai_linh_kien || !tuong_thich) {
            return res.status(400).json({ success: false, message: 'Tên, loại linh kiện và dòng máy tương thích là bắt buộc' });
        }

        await db.query(`
            UPDATE linh_kien
            SET ten_linh_kien = ?, loai_linh_kien = ?, tuong_thich = ?, ma_nha_cung_cap = ?, gia_nhap = ?, gia_ban = ?, so_luong_ton = ?, vi_tri_kho = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_linh_kien = ?
        `, [
            ten_linh_kien, 
            loai_linh_kien, 
            tuong_thich, 
            ma_nha_cung_cap || null, 
            gia_nhap || 0, 
            gia_ban || 0, 
            so_luong_ton || 0, 
            vi_tri_kho || null, 
            trang_thai || 'con_hang', 
            ghi_chu || null, 
            componentId
        ]);

        res.json({ success: true, message: 'Cập nhật linh kiện thành công' });
    } catch (error) {
        console.error('Update component error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật linh kiện' });
    }
});

// Xóa linh kiện
router.delete('/components/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const componentId = req.params.id;
        await db.query('DELETE FROM linh_kien WHERE ma_linh_kien = ?', [componentId]);
        res.json({ success: true, message: 'Xóa linh kiện thành công' });
    } catch (error) {
        console.error('Delete component error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa linh kiện. Linh kiện có thể đang được tham chiếu trong phiếu bảo hành/sửa chữa.' });
    }
});

// QUẢN LÝ THƯƠNG HIỆU (BRANDS)
// ==========================================

// Lấy danh sách thương hiệu
router.get('/brands', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [brands] = await db.query(`
            SELECT 
                th.*,
                COUNT(sp.ma_san_pham) as so_san_pham
            FROM thuong_hieu th
            LEFT JOIN san_pham sp ON th.ten_thuong_hieu = sp.thuong_hieu
            GROUP BY th.ma_thuong_hieu
            ORDER BY th.ten_thuong_hieu
        `);
        
        res.json({
            success: true,
            data: brands
        });
        
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải danh sách thương hiệu',
            error: error.message 
        });
    }
});

// Thêm thương hiệu mới
router.post('/brands', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_thuong_hieu, xuat_xu } = req.body;
        
        if (!ten_thuong_hieu) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập tên thương hiệu' 
            });
        }
        
        const [result] = await db.query(`
            INSERT INTO thuong_hieu (ten_thuong_hieu, xuat_xu, ngay_tao)
            VALUES (?, ?, NOW())
        `, [ten_thuong_hieu, xuat_xu]);
        
        res.status(201).json({
            success: true,
            message: 'Thêm thương hiệu thành công',
            data: { ma_thuong_hieu: result.insertId }
        });
        
    } catch (error) {
        console.error('Create brand error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi thêm thương hiệu',
            error: error.message 
        });
    }
});

// Cập nhật thương hiệu
router.put('/brands/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_thuong_hieu, xuat_xu } = req.body;
        
        await db.query(`
            UPDATE thuong_hieu 
            SET ten_thuong_hieu = ?, xuat_xu = ?, ngay_cap_nhat = NOW()
            WHERE ma_thuong_hieu = ?
        `, [ten_thuong_hieu, xuat_xu, id]);
        
        res.json({
            success: true,
            message: 'Cập nhật thương hiệu thành công'
        });
        
    } catch (error) {
        console.error('Update brand error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật thương hiệu',
            error: error.message 
        });
    }
});

// Xóa thương hiệu
router.delete('/brands/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra xem có sản phẩm nào đang dùng thương hiệu này không
        const [products] = await db.query(`
            SELECT COUNT(*) as count 
            FROM san_pham sp
            JOIN thuong_hieu th ON sp.thuong_hieu = th.ten_thuong_hieu
            WHERE th.ma_thuong_hieu = ?
        `, [id]);
        
        if (products[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Không thể xóa thương hiệu này vì có ${products[0].count} sản phẩm đang sử dụng` 
            });
        }
        
        await db.query(`DELETE FROM thuong_hieu WHERE ma_thuong_hieu = ?`, [id]);
        
        res.json({
            success: true,
            message: 'Xóa thương hiệu thành công'
        });
        
    } catch (error) {
        console.error('Delete brand error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi xóa thương hiệu',
            error: error.message 
        });
    }
});

// ==========================================
// INVENTORY CHECK - KIỂM KÊ
// ==========================================

// Lấy danh sách phiếu kiểm kê
router.get('/inventories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT pkk.*
            FROM phieu_kiem_ke pkk
            ORDER BY pkk.ngay_kiem_ke DESC
        `;
        
        const [inventories] = await db.query(query);
        
        res.json({
            success: true,
            data: inventories
        });
    } catch (error) {
        console.error('❌ Get inventories error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Lấy chi tiết phiếu kiểm kê
router.get('/inventories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [inventories] = await db.query(`
            SELECT pkk.*
            FROM phieu_kiem_ke pkk
            WHERE pkk.ma_phieu_kiem_ke = ?
        `, [req.params.id]);
        
        if (inventories.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu kiểm kê' });
        }
        
        const [products] = await db.query(`
            SELECT ctkk.*, sp.ten_san_pham, sp.ma_san_pham_code
            FROM chi_tiet_kiem_ke ctkk
            LEFT JOIN san_pham sp ON ctkk.ma_san_pham = sp.ma_san_pham
            WHERE ctkk.ma_phieu_kiem_ke = ?
        `, [req.params.id]);
        
        res.json({
            success: true,
            data: { ...inventories[0], products }
        });
    } catch (error) {
        console.error('❌ Get inventory error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Tạo phiếu kiểm kê mới
router.post('/inventories', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ngay_kiem_ke, trang_thai, ghi_chu, products } = req.body;
        
        if (!ngay_kiem_ke || !products || products.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        
        // Tính tổng
        const tong_san_pham = products.length;
        const tong_chenh_lech = products.reduce((sum, p) => sum + ((parseInt(p.so_luong_thuc_te) || 0) - (parseInt(p.so_luong_he_thong) || 0)), 0);
        const gia_tri_chenh_lech = products.reduce((sum, p) => {
            const diff = (parseInt(p.so_luong_thuc_te) || 0) - (parseInt(p.so_luong_he_thong) || 0);
            return sum + (diff * (parseFloat(p.gia_nhap) || 0));
        }, 0);
        
        // Tạo phiếu kiểm kê
        const [result] = await connection.query(`
            INSERT INTO phieu_kiem_ke (ma_nhan_vien, ngay_kiem_ke, trang_thai, tong_san_pham, tong_chenh_lech, gia_tri_chenh_lech, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.userId, ngay_kiem_ke, trang_thai || 'dang_kiem_ke', tong_san_pham, tong_chenh_lech, gia_tri_chenh_lech, ghi_chu]);
        
        const ma_phieu_kiem_ke = result.insertId;
        
        // Thêm chi tiết kiểm kê
        for (const product of products) {
            const chenh_lech = (parseInt(product.so_luong_thuc_te) || 0) - (parseInt(product.so_luong_he_thong) || 0);
            const gia_tri_cl = chenh_lech * (parseFloat(product.gia_nhap) || 0);
            
            await connection.query(`
                INSERT INTO chi_tiet_kiem_ke (ma_phieu_kiem_ke, ma_san_pham, so_luong_he_thong, so_luong_thuc_te, chenh_lech, gia_nhap, gia_tri_chenh_lech, ly_do_chenh_lech, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [ma_phieu_kiem_ke, product.ma_san_pham, product.so_luong_he_thong, product.so_luong_thuc_te, chenh_lech, product.gia_nhap, gia_tri_cl, product.ly_do_chenh_lech, product.ghi_chu]);
        }
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Tạo phiếu kiểm kê thành công',
            data: { ma_phieu_kiem_ke }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Create inventory error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        connection.release();
    }
});

// Cập nhật phiếu kiểm kê
router.put('/inventories/:id', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ngay_kiem_ke, trang_thai, ghi_chu, products } = req.body;
        
        // Tính tổng
        const tong_san_pham = products.length;
        const tong_chenh_lech = products.reduce((sum, p) => sum + ((parseInt(p.so_luong_thuc_te) || 0) - (parseInt(p.so_luong_he_thong) || 0)), 0);
        const gia_tri_chenh_lech = products.reduce((sum, p) => {
            const diff = (parseInt(p.so_luong_thuc_te) || 0) - (parseInt(p.so_luong_he_thong) || 0);
            return sum + (diff * (parseFloat(p.gia_nhap) || 0));
        }, 0);
        
        // Cập nhật phiếu kiểm kê
        await connection.query(`
            UPDATE phieu_kiem_ke 
            SET ngay_kiem_ke = ?, trang_thai = ?, tong_san_pham = ?, tong_chenh_lech = ?, gia_tri_chenh_lech = ?, ghi_chu = ?
            WHERE ma_phieu_kiem_ke = ?
        `, [ngay_kiem_ke, trang_thai, tong_san_pham, tong_chenh_lech, gia_tri_chenh_lech, ghi_chu, req.params.id]);
        
        // Xóa chi tiết cũ
        await connection.query('DELETE FROM chi_tiet_kiem_ke WHERE ma_phieu_kiem_ke = ?', [req.params.id]);
        
        // Thêm chi tiết mới
        for (const product of products) {
            const chenh_lech = (parseInt(product.so_luong_thuc_te) || 0) - (parseInt(product.so_luong_he_thong) || 0);
            const gia_tri_cl = chenh_lech * (parseFloat(product.gia_nhap) || 0);
            
            await connection.query(`
                INSERT INTO chi_tiet_kiem_ke (ma_phieu_kiem_ke, ma_san_pham, so_luong_he_thong, so_luong_thuc_te, chenh_lech, gia_nhap, gia_tri_chenh_lech, ly_do_chenh_lech, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [req.params.id, product.ma_san_pham, product.so_luong_he_thong, product.so_luong_thuc_te, chenh_lech, product.gia_nhap, gia_tri_cl, product.ly_do_chenh_lech, product.ghi_chu]);
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Cập nhật phiếu kiểm kê thành công'
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Update inventory error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        connection.release();
    }
});

// Duyệt phiếu kiểm kê và cập nhật tồn kho
router.post('/inventories/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Lấy chi tiết phiếu kiểm kê
        const [details] = await connection.query(`
            SELECT * FROM chi_tiet_kiem_ke WHERE ma_phieu_kiem_ke = ?
        `, [req.params.id]);
        
        if (details.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy chi tiết phiếu kiểm kê' });
        }
        
        // Cập nhật tồn kho theo số lượng thực tế
        for (const detail of details) {
            if (detail.ma_san_pham) {
                await connection.query(`
                    UPDATE san_pham 
                    SET so_luong = ?
                    WHERE ma_san_pham = ?
                `, [detail.so_luong_thuc_te, detail.ma_san_pham]);
            }
        }
        
        // Cập nhật trạng thái phiếu kiểm kê
        await connection.query(`
            UPDATE phieu_kiem_ke 
            SET trang_thai = 'da_duyet',
                nguoi_duyet = ?,
                ngay_duyet = NOW()
            WHERE ma_phieu_kiem_ke = ?
        `, [req.user.userId, req.params.id]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Duyệt phiếu kiểm kê thành công. Tồn kho đã được cập nhật.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Approve inventory error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        connection.release();
    }
});

// Xóa phiếu kiểm kê
router.delete('/inventories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM phieu_kiem_ke WHERE ma_phieu_kiem_ke = ?', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Xóa phiếu kiểm kê thành công'
        });
    } catch (error) {
        console.error('❌ Delete inventory error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// ==========================================
// RECEIVING - NHẬN HÀNG
// ==========================================

// Lấy danh sách phiếu nhập hàng
router.get('/receivings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, supplier, dateFrom, dateTo } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND pnh.trang_thai = ?';
            params.push(status);
        }
        if (supplier) {
            whereClause += ' AND pnh.ma_nha_cung_cap = ?';
            params.push(supplier);
        }
        if (dateFrom) {
            whereClause += ' AND DATE(pnh.ngay_nhap) >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            whereClause += ' AND DATE(pnh.ngay_nhap) <= ?';
            params.push(dateTo);
        }
        
        const [receivings] = await db.query(`
            SELECT pnh.*, ncc.ten_nha_cung_cap, ncc.so_dien_thoai as sdt_nha_cung_cap
            FROM phieu_nhap_hang pnh
            LEFT JOIN nha_cung_cap ncc ON pnh.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE ${whereClause}
            ORDER BY pnh.ngay_nhap DESC
        `, params);
        
        res.json({ success: true, data: receivings });
    } catch (error) {
        console.error('Get receivings error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Lấy chi tiết phiếu nhập hàng
router.get('/receivings/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [receivings] = await db.query(`
            SELECT pnh.*, ncc.ten_nha_cung_cap
            FROM phieu_nhap_hang pnh
            LEFT JOIN nha_cung_cap ncc ON pnh.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE pnh.ma_phieu_nhap = ?
        `, [req.params.id]);
        
        if (receivings.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
        }
        
        const [products] = await db.query(`
            SELECT ctp.*, sp.ten_san_pham
            FROM chi_tiet_phieu_nhap ctp
            JOIN san_pham sp ON ctp.ma_san_pham = sp.ma_san_pham
            WHERE ctp.ma_phieu_nhap = ?
        `, [req.params.id]);
        
        const receiving = receivings[0];
        receiving.products = products;
        
        res.json({ success: true, data: receiving });
    } catch (error) {
        console.error('Get receiving detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Tạo phiếu nhập hàng mới
router.post('/receivings', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ma_nha_cung_cap, ma_don_dat_hang, ngay_nhap, trang_thai, ghi_chu, products } = req.body;
        
        // Tính tổng
        let tong_so_luong = 0;
        let tong_gia_tri = 0;
        
        products.forEach(p => {
            tong_so_luong += parseInt(p.so_luong_thuc_nhan);
            tong_gia_tri += parseInt(p.so_luong_thuc_nhan) * parseFloat(p.gia_nhap);
        });
        
        // Tạo phiếu nhập
        const [result] = await connection.query(`
            INSERT INTO phieu_nhap_hang 
            (ma_nha_cung_cap, ma_don_dat_hang, ma_nhan_vien, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [ma_nha_cung_cap, ma_don_dat_hang, req.user.ma_tai_khoan, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai, ghi_chu]);
        
        const ma_phieu_nhap = result.insertId;
        
        // Thêm chi tiết
        for (const product of products) {
            const thanh_tien = parseInt(product.so_luong_thuc_nhan) * parseFloat(product.gia_nhap);
            
            await connection.query(`
                INSERT INTO chi_tiet_phieu_nhap 
                (ma_phieu_nhap, ma_san_pham, so_luong_dat, so_luong_thuc_nhan, gia_nhap, thanh_tien, chat_luong, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [ma_phieu_nhap, product.ma_san_pham, product.so_luong_dat, product.so_luong_thuc_nhan, 
                product.gia_nhap, thanh_tien, product.chat_luong, product.ghi_chu]);
            
            // Cập nhật tồn kho nếu hoàn thành
            if (trang_thai === 'hoan_thanh') {
                await connection.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong + ?, 
                        gia_nhap = ?
                    WHERE ma_san_pham = ?
                `, [product.so_luong_thuc_nhan, product.gia_nhap, product.ma_san_pham]);
            }
        }
        
        await connection.commit();
        res.json({ success: true, message: 'Tạo phiếu nhập thành công', data: { ma_phieu_nhap } });
        
    } catch (error) {
        await connection.rollback();
        console.error('Create receiving error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo phiếu nhập: ' + error.message });
    } finally {
        connection.release();
    }
});

// Cập nhật phiếu nhập hàng
router.put('/receivings/:id', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ma_nha_cung_cap, ma_don_dat_hang, ngay_nhap, trang_thai, ghi_chu, products } = req.body;
        
        // Lấy trạng thái cũ và chi tiết cũ trước khi xóa
        const [oldReceiving] = await connection.query('SELECT trang_thai FROM phieu_nhap_hang WHERE ma_phieu_nhap = ?', [req.params.id]);
        
        if (oldReceiving.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
        }
        
        const oldStatus = oldReceiving[0].trang_thai;
        
        // Nếu trạng thái cũ là hoàn thành, lấy chi tiết để trừ lại tồn kho
        let oldProducts = [];
        if (oldStatus === 'hoan_thanh') {
            [oldProducts] = await connection.query('SELECT ma_san_pham, so_luong_thuc_nhan FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [req.params.id]);
        }
        
        // Tính tổng
        let tong_so_luong = 0;
        let tong_gia_tri = 0;
        
        products.forEach(p => {
            tong_so_luong += parseInt(p.so_luong_thuc_nhan);
            tong_gia_tri += parseInt(p.so_luong_thuc_nhan) * parseFloat(p.gia_nhap);
        });
        
        // Cập nhật phiếu nhập
        await connection.query(`
            UPDATE phieu_nhap_hang 
            SET ma_nha_cung_cap = ?, ma_don_dat_hang = ?, ngay_nhap = ?, tong_so_luong = ?, tong_gia_tri = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_phieu_nhap = ?
        `, [ma_nha_cung_cap, ma_don_dat_hang, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai, ghi_chu, req.params.id]);
        
        // Xóa chi tiết cũ
        await connection.query('DELETE FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [req.params.id]);
        
        // Nếu trạng thái cũ là hoàn thành, trừ lại số lượng tồn kho
        if (oldStatus === 'hoan_thanh') {
            for (const oldProduct of oldProducts) {
                await connection.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong - ?
                    WHERE ma_san_pham = ?
                `, [oldProduct.so_luong_thuc_nhan, oldProduct.ma_san_pham]);
            }
        }
        
        // Thêm chi tiết mới
        for (const product of products) {
            const thanh_tien = parseInt(product.so_luong_thuc_nhan) * parseFloat(product.gia_nhap);
            
            await connection.query(`
                INSERT INTO chi_tiet_phieu_nhap 
                (ma_phieu_nhap, ma_san_pham, so_luong_dat, so_luong_thuc_nhan, gia_nhap, thanh_tien, chat_luong, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [req.params.id, product.ma_san_pham, product.so_luong_dat, product.so_luong_thuc_nhan, 
                product.gia_nhap, thanh_tien, product.chat_luong, product.ghi_chu]);
            
            // Cập nhật tồn kho nếu hoàn thành
            if (trang_thai === 'hoan_thanh') {
                await connection.query(`
                    UPDATE san_pham 
                    SET so_luong = so_luong + ?, 
                        gia_nhap = ?
                    WHERE ma_san_pham = ?
                `, [product.so_luong_thuc_nhan, product.gia_nhap, product.ma_san_pham]);
            }
        }
        
        await connection.commit();
        res.json({ success: true, message: 'Cập nhật phiếu nhập thành công' });
        
    } catch (error) {
        await connection.rollback();
        console.error('Update receiving error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật phiếu nhập: ' + error.message });
    } finally {
        connection.release();
    }
});

// Xóa phiếu nhập hàng
router.delete('/receivings/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM phieu_nhap_hang WHERE ma_phieu_nhap = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa phiếu nhập thành công' });
    } catch (error) {
        console.error('Delete receiving error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa phiếu nhập: ' + error.message });
    }
});

// ==========================================
// HUMAN RESOURCES (QUẢN LÝ NHÂN SỰ)
// ==========================================

// ------------------------------------------
// 1. NHÂN VIÊN (EMPLOYEES)
// ------------------------------------------

// Lấy tất cả nhân viên
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [employees] = await db.query('SELECT * FROM nhan_vien ORDER BY ma_nhan_vien DESC');
        res.json({ success: true, data: employees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách nhân viên' });
    }
});

// Lấy chi tiết nhân viên
router.get('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`🔍 [Admin API] GET /employees/${req.params.id} requested by user ${req.user?.ma_tai_khoan} (${req.user?.email})`);
    try {
        const [employees] = await db.query('SELECT * FROM nhan_vien WHERE ma_nhan_vien = ?', [req.params.id]);
        if (employees.length === 0) {
            console.log(`⚠️ [Admin API] Employee ID ${req.params.id} not found in DB`);
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
        }
        console.log(`✅ [Admin API] Found employee ${req.params.id}: ${employees[0].ho_ten}`);
        res.json({ success: true, data: employees[0] });
    } catch (error) {
        console.error('❌ [Admin API] Get employee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết nhân viên: ' + error.message });
    }
});

// Thêm nhân viên mới
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ho_ten, ten_dang_nhap, mat_khau, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai, ghi_chu, anh_cccd_truoc, anh_cccd_sau, so_cccd } = req.body;
        if (!ho_ten) {
            return res.status(400).json({ success: false, message: 'Họ tên là bắt buộc' });
        }
        
        let hashedPassword = null;
        if (mat_khau) {
            hashedPassword = await bcrypt.hash(mat_khau, 10);
        }

        const [result] = await db.query(
            `INSERT INTO nhan_vien (ho_ten, ten_dang_nhap, mat_khau, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai, ghi_chu, anh_cccd_truoc, anh_cccd_sau, so_cccd)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ho_ten, 
                ten_dang_nhap || null, 
                hashedPassword, 
                so_dien_thoai || null, 
                email || null, 
                chuc_vu || null, 
                ngay_vao_lam || null, 
                luong_co_ban || 0, 
                trang_thai !== undefined ? trang_thai : 1, 
                ghi_chu || null,
                anh_cccd_truoc || null,
                anh_cccd_sau || null,
                so_cccd || null
            ]
        );
        res.json({ success: true, message: 'Thêm nhân viên thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm nhân viên: ' + error.message });
    }
});

// Cập nhật nhân viên
router.put('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ho_ten, ten_dang_nhap, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai, ghi_chu, anh_cccd_truoc, anh_cccd_sau, so_cccd } = req.body;
        if (!ho_ten) {
            return res.status(400).json({ success: false, message: 'Họ tên là bắt buộc' });
        }
        await db.query(
            `UPDATE nhan_vien 
             SET ho_ten = ?, ten_dang_nhap = ?, so_dien_thoai = ?, email = ?, chuc_vu = ?, ngay_vao_lam = ?, luong_co_ban = ?, trang_thai = ?, ghi_chu = ?, anh_cccd_truoc = ?, anh_cccd_sau = ?, so_cccd = ?
             WHERE ma_nhan_vien = ?`,
            [
                ho_ten, 
                ten_dang_nhap || null, 
                so_dien_thoai || null, 
                email || null, 
                chuc_vu || null, 
                ngay_vao_lam || null, 
                luong_co_ban || 0, 
                trang_thai !== undefined ? trang_thai : 1, 
                ghi_chu || null, 
                anh_cccd_truoc || null,
                anh_cccd_sau || null,
                so_cccd || null,
                req.params.id
            ]
        );
        res.json({ success: true, message: 'Cập nhật nhân viên thành công' });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật nhân viên: ' + error.message });
    }
});

// Xóa nhân viên
router.delete('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM nhan_vien WHERE ma_nhan_vien = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa nhân viên thành công' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa nhân viên: ' + error.message });
    }
});

// Toggle khóa trạng thái nhân viên
router.put('/employees/:id/toggle-lock', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [emp] = await db.query('SELECT trang_thai FROM nhan_vien WHERE ma_nhan_vien = ?', [req.params.id]);
        if (emp.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
        }
        const newStatus = emp[0].trang_thai === 1 ? 0 : 1;
        await db.query('UPDATE nhan_vien SET trang_thai = ? WHERE ma_nhan_vien = ?', [newStatus, req.params.id]);
        res.json({ success: true, message: newStatus === 1 ? 'Mở khóa nhân viên thành công' : 'Khóa nhân viên thành công', data: { trang_thai: newStatus } });
    } catch (error) {
        console.error('Toggle lock employee error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khóa/mở khóa nhân viên: ' + error.message });
    }
});

// Đổi/Reset mật khẩu nhân viên
router.put('/employees/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { mat_khau_moi } = req.body;
        if (!mat_khau_moi || mat_khau_moi.trim().length < 4) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 4 ký tự trở lên' });
        }
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        await db.query('UPDATE nhan_vien SET mat_khau = ? WHERE ma_nhan_vien = ?', [hashedPassword, req.params.id]);
        res.json({ success: true, message: 'Đổi mật khẩu nhân viên thành công!' });
    } catch (error) {
        console.error('Reset employee password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu nhân viên: ' + error.message });
    }
});

// ------------------------------------------
// 1B. QUẢN LÝ TÀI KHOẢN ADMIN (ADMIN ACCOUNTS)
// ------------------------------------------

// Lấy tất cả tài khoản admin
router.get('/admins', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [admins] = await db.query(
            `SELECT ma_tai_khoan, ten_dang_nhap, ho_ten, email, vai_tro, trang_thai 
             FROM tai_khoan 
             WHERE vai_tro = 'admin' OR vai_tro = 'super_admin' 
             ORDER BY ma_tai_khoan DESC`
        );
        res.json({ success: true, data: admins });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài khoản admin' });
    }
});

// Thêm tài khoản admin mới
router.post('/admins', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_dang_nhap, ho_ten, email, mat_khau, vai_tro } = req.body;
        if (!ten_dang_nhap || !email || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập, email và mật khẩu là bắt buộc' });
        }

        // Kiểm tra xem tên đăng nhập hoặc email đã tồn tại chưa
        const [existing] = await db.query(
            'SELECT ma_tai_khoan FROM tai_khoan WHERE ten_dang_nhap = ? OR email = ?',
            [ten_dang_nhap, email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại trong hệ thống' });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        const adminRole = vai_tro || 'admin';

        const [result] = await db.query(
            `INSERT INTO tai_khoan (ten_dang_nhap, ho_ten, email, mat_khau, vai_tro, trang_thai)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [ten_dang_nhap, ho_ten || ten_dang_nhap, email, hashedPassword, adminRole]
        );
        res.json({ success: true, message: 'Tạo tài khoản admin thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo tài khoản admin: ' + error.message });
    }
});

// Reset mật khẩu tài khoản admin
router.put('/admins/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { mat_khau_moi } = req.body;
        if (!mat_khau_moi || mat_khau_moi.trim().length < 4) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 4 ký tự trở lên' });
        }
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        await db.query('UPDATE tai_khoan SET mat_khau = ? WHERE ma_tai_khoan = ?', [hashedPassword, req.params.id]);
        res.json({ success: true, message: 'Đổi mật khẩu tài khoản admin thành công!' });
    } catch (error) {
        console.error('Reset admin password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu admin: ' + error.message });
    }
});

// Xóa tài khoản admin
router.delete('/admins/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const adminId = parseInt(req.params.id);
        // Ngăn chặn admin tự xóa chính mình
        if (adminId === req.user.ma_tai_khoan) {
            return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
        }
        await db.query('DELETE FROM tai_khoan WHERE ma_tai_khoan = ?', [adminId]);
        res.json({ success: true, message: 'Xóa tài khoản admin thành công' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa tài khoản admin: ' + error.message });
    }
});

// ------------------------------------------
// 2. CA LÀM VIỆC (WORK SHIFTS)
// ------------------------------------------

// Lấy danh sách ca làm việc
router.get('/shifts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [shifts] = await db.query('SELECT * FROM ca_lam_viec ORDER BY ma_ca ASC');
        res.json({ success: true, data: shifts });
    } catch (error) {
        console.error('Get shifts error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách ca làm việc' });
    }
});

// Thêm ca làm việc mới
router.post('/shifts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong, ghi_chu } = req.body;
        if (!ten_ca || !gio_bat_dau || !gio_ket_thuc) {
            return res.status(400).json({ success: false, message: 'Tên ca, giờ bắt đầu và giờ kết thúc là bắt buộc' });
        }
        const [result] = await db.query(
            `INSERT INTO ca_lam_viec (ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong, ghi_chu)
             VALUES (?, ?, ?, ?, ?)`,
            [ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong || 1.00, ghi_chu || null]
        );
        res.json({ success: true, message: 'Thêm ca làm việc thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create shift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm ca làm việc: ' + error.message });
    }
});

// Cập nhật ca làm việc
router.put('/shifts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong, ghi_chu } = req.body;
        if (!ten_ca || !gio_bat_dau || !gio_ket_thuc) {
            return res.status(400).json({ success: false, message: 'Tên ca, giờ bắt đầu và giờ kết thúc là bắt buộc' });
        }
        await db.query(
            `UPDATE ca_lam_viec 
             SET ten_ca = ?, gio_bat_dau = ?, gio_ket_thuc = ?, he_so_luong = ?, ghi_chu = ?
             WHERE ma_ca = ?`,
            [ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong || 1.00, ghi_chu || null, req.params.id]
        );
        res.json({ success: true, message: 'Cập nhật ca làm việc thành công' });
    } catch (error) {
        console.error('Update shift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật ca làm việc: ' + error.message });
    }
});

// Xóa ca làm việc
router.delete('/shifts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM ca_lam_viec WHERE ma_ca = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa ca làm việc thành công' });
    } catch (error) {
        console.error('Delete shift error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa ca làm việc: ' + error.message });
    }
});

// ------------------------------------------
// 3. CHẤM CÔNG (ATTENDANCE)
// ------------------------------------------

// Lấy danh sách chấm công
router.get('/attendance', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date, employeeId } = req.query;
        let query = `
            SELECT cc.*, nv.ho_ten, nv.chuc_vu, ca.ten_ca, ca.gio_bat_dau as ca_vao, ca.gio_ket_thuc as ca_ra
            FROM cham_cong cc
            JOIN nhan_vien nv ON cc.ma_nhan_vien = nv.ma_nhan_vien
            JOIN ca_lam_viec ca ON cc.ma_ca = ca.ma_ca
            WHERE 1=1
        `;
        const params = [];
        if (date) {
            query += ' AND cc.ngay = ?';
            params.push(date);
        }
        if (employeeId) {
            query += ' AND cc.ma_nhan_vien = ?';
            params.push(employeeId);
        }
        query += ' ORDER BY cc.ngay DESC, nv.ho_ten ASC';
        
        const [attendance] = await db.query(query, params);
        res.json({ success: true, data: attendance });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách chấm công' });
    }
});

// Thêm/cập nhật chấm công
router.post('/attendance', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_nhan_vien, ngay, ma_ca, gio_vao, gio_ra, trang_thai, ghi_chu } = req.body;
        if (!ma_nhan_vien || !ngay || !ma_ca) {
            return res.status(400).json({ success: false, message: 'Mã nhân viên, ngày và ca là bắt buộc' });
        }
        
        // Kiểm tra xem đã có bản ghi chấm công nào chưa
        const [existing] = await db.query(
            'SELECT ma_cham_cong FROM cham_cong WHERE ma_nhan_vien = ? AND ngay = ? AND ma_ca = ?',
            [ma_nhan_vien, ngay, ma_ca]
        );
        
        if (existing.length > 0) {
            await db.query(
                `UPDATE cham_cong 
                 SET gio_vao = ?, gio_ra = ?, trang_thai = ?, ghi_chu = ?
                 WHERE ma_cham_cong = ?`,
                [gio_vao || null, gio_ra || null, trang_thai || 'dung_gio', ghi_chu || null, existing[0].ma_cham_cong]
            );
            res.json({ success: true, message: 'Cập nhật chấm công thành công' });
        } else {
            const [result] = await db.query(
                `INSERT INTO cham_cong (ma_nhan_vien, ngay, ma_ca, gio_vao, gio_ra, trang_thai, ghi_chu)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [ma_nhan_vien, ngay, ma_ca, gio_vao || null, gio_ra || null, trang_thai || 'dung_gio', ghi_chu || null]
            );
            res.json({ success: true, message: 'Ghi nhận chấm công thành công', data: { id: result.insertId } });
        }
    } catch (error) {
        console.error('Create attendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi chấm công: ' + error.message });
    }
});

// Xóa chấm công
router.delete('/attendance/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM cham_cong WHERE ma_cham_cong = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa chấm công thành công' });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa chấm công' });
    }
});

// ------------------------------------------
// 4. BẢNG LƯƠNG (PAYROLL)
// ------------------------------------------

// Lấy danh sách bảng lương theo tháng/năm
router.get('/payroll', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { thang, nam } = req.query;
        if (!thang || !nam) {
            return res.status(400).json({ success: false, message: 'Tháng và năm là bắt buộc' });
        }
        const [payroll] = await db.query(
            `SELECT bl.*, nv.ho_ten, nv.chuc_vu, nv.luong_co_ban
             FROM bang_luong bl
             JOIN nhan_vien nv ON bl.ma_nhan_vien = nv.ma_nhan_vien
             WHERE bl.thang = ? AND bl.nam = ?
             ORDER BY nv.ho_ten ASC`,
            [thang, nam]
        );
        res.json({ success: true, data: payroll });
    } catch (error) {
        console.error('Get payroll error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách bảng lương' });
    }
});

// Tính toán bảng lương hàng loạt cho 1 tháng/năm
router.post('/payroll/calculate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { thang, nam } = req.body;
        if (!thang || !nam) {
            return res.status(400).json({ success: false, message: 'Tháng và năm là bắt buộc' });
        }

        // Lấy tất cả nhân viên đang hoạt động
        const [employees] = await db.query('SELECT * FROM nhan_vien WHERE trang_thai = 1');
        
        const startDate = `${nam}-${String(thang).padStart(2, '0')}-01`;
        const endDate = `${nam}-${String(thang).padStart(2, '0')}-31`;

        for (const emp of employees) {
            // Lấy thống kê chấm công của nhân viên trong tháng
            const [attendanceStats] = await db.query(
                `SELECT 
                    COUNT(CASE WHEN cc.trang_thai IN ('dung_gio', 'di_muon', 've_som') THEN 1 END) as ca_lam_viec,
                    COUNT(CASE WHEN cc.trang_thai = 'di_muon' THEN 1 END) as di_muon,
                    COUNT(CASE WHEN cc.trang_thai = 've_som' THEN 1 END) as ve_som,
                    COUNT(CASE WHEN cc.trang_thai = 'nghi_khong_phep' THEN 1 END) as nghi_khong_phep
                 FROM cham_cong cc
                 WHERE cc.ma_nhan_vien = ? AND cc.ngay BETWEEN ? AND ?`,
                [emp.ma_nhan_vien, startDate, endDate]
            );

            const stats = attendanceStats[0];
            const so_ngay_cong = (stats.ca_lam_viec || 0) * 0.5;
            const luong_theo_cong = Math.round((emp.luong_co_ban * so_ngay_cong) / 26);
            const khau_tru = ((stats.di_muon || 0) * 20000) + ((stats.ve_som || 0) * 20000) + ((stats.nghi_khong_phep || 0) * 150000);
            
            const [existing] = await db.query(
                'SELECT * FROM bang_luong WHERE ma_nhan_vien = ? AND thang = ? AND nam = ?',
                [emp.ma_nhan_vien, thang, nam]
            );

            if (existing.length > 0) {
                const current = existing[0];
                const finalThucLinh = Math.max(0, luong_theo_cong + parseFloat(current.phu_cap) + parseFloat(current.thuong) - khau_tru);
                await db.query(
                    `UPDATE bang_luong 
                     SET so_ngay_cong = ?, khau_tru = ?, thuc_linh = ?
                     WHERE ma_bang_luong = ?`,
                    [so_ngay_cong, khau_tru, finalThucLinh, current.ma_bang_luong]
                );
            } else {
                const finalThucLinh = Math.max(0, luong_theo_cong - khau_tru);
                await db.query(
                    `INSERT INTO bang_luong (ma_nhan_vien, thang, nam, so_ngay_cong, phu_cap, thuong, khau_tru, thuc_linh, trang_thai)
                     VALUES (?, ?, ?, ?, 0.00, 0.00, ?, ?, 'chua_thanh_toan')`,
                    [emp.ma_nhan_vien, thang, nam, so_ngay_cong, khau_tru, finalThucLinh]
                );
            }
        }

        res.json({ success: true, message: `Đã tính toán bảng lương tháng ${thang}/${nam} cho tất cả nhân viên` });
    } catch (error) {
        console.error('Calculate payroll error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tính lương: ' + error.message });
    }
});

// Cập nhật chi tiết bảng lương
router.put('/payroll/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { phu_cap, thuong, khau_tru, trang_thai, ghi_chu } = req.body;
        
        const [payroll] = await db.query(
            `SELECT bl.*, nv.luong_co_ban 
             FROM bang_luong bl
             JOIN nhan_vien nv ON bl.ma_nhan_vien = nv.ma_nhan_vien
             WHERE bl.ma_bang_luong = ?`,
            [req.params.id]
        );

        if (payroll.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bảng lương' });
        }

        const pl = payroll[0];
        const valPhuCap = phu_cap !== undefined ? parseFloat(phu_cap) : parseFloat(pl.phu_cap);
        const valThuong = thuong !== undefined ? parseFloat(thuong) : parseFloat(pl.thuong);
        const valKhauTru = khau_tru !== undefined ? parseFloat(khau_tru) : parseFloat(pl.khau_tru);
        
        const luong_theo_cong = Math.round((pl.luong_co_ban * pl.so_ngay_cong) / 26);
        const thuc_linh = Math.max(0, luong_theo_cong + valPhuCap + valThuong - valKhauTru);

        let ngay_thanh_toan = pl.ngay_thanh_toan;
        if (trang_thai === 'da_thanh_toan' && pl.trang_thai !== 'da_thanh_toan') {
            ngay_thanh_toan = new Date();
        } else if (trang_thai === 'chua_thanh_toan') {
            ngay_thanh_toan = null;
        }

        await db.query(
            `UPDATE bang_luong 
             SET phu_cap = ?, thuong = ?, khau_tru = ?, thuc_linh = ?, trang_thai = ?, ngay_thanh_toan = ?, ghi_chu = ?
             WHERE ma_bang_luong = ?`,
            [valPhuCap, valThuong, valKhauTru, thuc_linh, trang_thai || pl.trang_thai, ngay_thanh_toan, ghi_chu || null, req.params.id]
        );

        res.json({ success: true, message: 'Cập nhật bảng lương thành công' });
    } catch (error) {
        console.error('Update payroll error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật bảng lương: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ SỞ THÍCH & CẢM XÚC KHÁCH HÀNG (PERSONALIZATION & SENTIMENT)
// ==========================================
router.get('/personalization', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔮 Personalization & Sentiment Analysis request received');

        // Helper function for keyword-based sentiment classification
        function classifySentiment(text, type, score = 5) {
            if (type === 'form') {
                return 'positive'; // Preferences selected in the onboarding form are intrinsically positive interest
            }
            if (type === 'review') {
                return score >= 4 ? 'positive' : 'negative';
            }
            
            const content = (text || '').toLowerCase();
            
            // Negative keywords
            const negWords = ['lỗi', 'hỏng', 'kém', 'chậm', 'lag', 'đắt', 'tệ', 'chán', 'không hài lòng', 'hoàn tiền', 'trả hàng', 'bảo hành', 'khiếu nại', 'thất vọng', 'fake', 'lừa', 'không hoạt động', 'hư', 'sửa', 'bị hư', 'trầy', 'móp', 'nứt', 'vỡ', 'chết nguồn', 'yếu', 'nóng', 'ồn', 'error', 'fail'];
            
            // Positive keywords
            const posWords = ['mua', 'tốt', 'ok', 'ngon', 'đẹp', 'mượt', 'thích', 'yêu', 'hài lòng', 'phù hợp', 'cám ơn', 'cảm ơn', 'recommen', 'gợi ý', 'tư vấn', 'chính hãng', 'uy tín', 'rẻ', 'sale', 'giảm giá', 'lấy', 'chốt', 'tuyệt vời', 'hoàn hảo', 'ưng ý', 'đáng mua', 'nhanh', 'mát', 'êm'];

            let negCount = 0;
            let posCount = 0;
            
            negWords.forEach(w => {
                if (content.includes(w)) negCount++;
            });
            posWords.forEach(w => {
                if (content.includes(w)) posCount++;
            });
            
            if (negCount > posCount) return 'negative';
            if (posCount > negCount) return 'positive';
            return 'neutral';
        }

        // 1. Fetch Form Onboarding Preferences
        const [preferences] = await db.query(`
            SELECT ui.MaND, ui.MaSP, ui.ThoiGian, ui.LoaiTuongTac, tk.ten_dang_nhap, tk.email, tk.so_dien_thoai, sp.ten_san_pham, sp.thuong_hieu, dm.ten_danh_muc
            FROM user_interactions ui
            JOIN tai_khoan tk ON ui.MaND = tk.ma_tai_khoan
            JOIN san_pham sp ON ui.MaSP = sp.ma_san_pham
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE ui.LoaiTuongTac IN ('preference', 'click', 'view', 'view_30s', 'view_50s', 'cart', 'purchase', 'search')
            ORDER BY ui.ThoiGian DESC
            LIMIT 200
        `);

        const formattedPrefs = preferences.map(p => ({
            id: `form_${p.MaND}_${p.MaSP}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            ma_tai_khoan: p.MaND,
            ten_dang_nhap: p.ten_dang_nhap,
            email: p.email,
            so_dien_thoai: p.so_dien_thoai,
            loai: p.LoaiTuongTac === 'preference' ? 'form' : p.LoaiTuongTac,
            noi_dung: p.LoaiTuongTac === 'preference' ? `Sở thích chọn từ khảo sát: "${p.ten_san_pham}" hãng ${p.thuong_hieu}` : p.LoaiTuongTac === 'click' ? `Đã click: ${p.ten_san_pham}` : p.LoaiTuongTac === 'view' ? `Đã xem: ${p.ten_san_pham}` : p.LoaiTuongTac === 'view_30s' ? `Đã xem >30s: ${p.ten_san_pham}` : p.LoaiTuongTac === 'view_50s' ? `Đã xem >50s: ${p.ten_san_pham}` : p.LoaiTuongTac === 'cart' ? `Thêm vào giỏ: ${p.ten_san_pham}` : p.LoaiTuongTac === 'purchase' ? `Đã mua: ${p.ten_san_pham}` : `Tìm kiếm: ${p.ten_san_pham}`,
            sentiment: 'positive',
            ngay_tao: p.ThoiGian,
            ten_danh_muc: p.ten_danh_muc,
            thuong_hieu: p.thuong_hieu
        }));

        // 2. Fetch Product Reviews
        const [reviews] = await db.query(`
            SELECT dg.ma_danh_gia, dg.ma_tai_khoan, dg.so_sao, dg.noi_dung, dg.ngay_tao, tk.ten_dang_nhap, tk.email, sp.ten_san_pham
            FROM danh_gia dg
            LEFT JOIN tai_khoan tk ON dg.ma_tai_khoan = tk.ma_tai_khoan
            LEFT JOIN san_pham sp ON dg.ma_san_pham = sp.ma_san_pham
            ORDER BY dg.ngay_tao DESC
            LIMIT 200
        `);

        const formattedReviews = reviews.map(r => ({
            id: `review_${r.ma_danh_gia}`,
            ma_tai_khoan: r.ma_tai_khoan || 0,
            ten_dang_nhap: r.ten_dang_nhap || 'Ẩn danh',
            email: r.email || '',
            loai: 'review',
            noi_dung: `Đánh giá ${r.so_sao}⭐ sản phẩm "${r.ten_san_pham || 'Ẩn'}" - Nội dung: "${r.noi_dung || '(Không có bình luận)'}"`,
            sentiment: r.so_sao >= 4 ? 'positive' : 'negative',
            ngay_tao: r.ngay_tao,
            binh_luan: r.noi_dung
        }));

        // 3. Fetch Search Queries
        const [searches] = await db.query(`
            SELECT s.ma_tim_kiem, s.ma_tai_khoan, s.tu_khoa, s.ket_qua_tra_ve, s.ngay_tim_kiem, tk.ten_dang_nhap, tk.email
            FROM du_lieu_tim_kiem s
            LEFT JOIN tai_khoan tk ON s.ma_tai_khoan = tk.ma_tai_khoan
            ORDER BY s.ngay_tim_kiem DESC
            LIMIT 200
        `);

        const formattedSearches = searches.map(s => {
            const hasResults = s.ket_qua_tra_ve > 0;
            const keywordSentiment = classifySentiment(s.tu_khoa, 'search');
            let sentiment = 'positive';
            if (!hasResults || keywordSentiment === 'negative') {
                sentiment = 'negative';
            } else if (keywordSentiment === 'neutral') {
                sentiment = 'neutral';
            }
            return {
                id: `search_${s.ma_tim_kiem}`,
                ma_tai_khoan: s.ma_tai_khoan || 0,
                ten_dang_nhap: s.ten_dang_nhap || 'Khách vãng lai',
                email: s.email || '',
                loai: 'search',
                noi_dung: `Tìm kiếm từ khóa: "${s.tu_khoa}" - Trả về ${s.ket_qua_tra_ve} sản phẩm`,
                sentiment: sentiment,
                ngay_tao: s.ngay_tim_kiem
            };
        });

        // 4. Fetch Chatbot Conversations
        const [chats] = await db.query(`
            SELECT c.ma_lich_su, c.ma_tai_khoan, c.cau_hoi, c.tra_loi, c.ngay_chat, tk.ten_dang_nhap, tk.email
            FROM lich_su_chatbot c
            LEFT JOIN tai_khoan tk ON c.ma_tai_khoan = tk.ma_tai_khoan
            ORDER BY c.ngay_chat DESC
            LIMIT 200
        `);

        const formattedChats = chats.map(c => {
            const sentiment = classifySentiment(c.cau_hoi, 'chatbot');
            return {
                id: `chatbot_${c.ma_lich_su}`,
                ma_tai_khoan: c.ma_tai_khoan || 0,
                ten_dang_nhap: c.ten_dang_nhap || 'Khách vãng lai',
                email: c.email || '',
                loai: 'chatbot',
                noi_dung: `Khách hỏi: "${c.cau_hoi}" | Chatbot trả lời: "${c.tra_loi ? (c.tra_loi.substring(0, 120) + '...') : ''}"`,
                sentiment: sentiment,
                ngay_tao: c.ngay_chat
            };
        });

        // Combine all lists
        let allData = [
            ...formattedPrefs,
            ...formattedReviews,
            ...formattedSearches,
            ...formattedChats
        ];

        // Sort by ngay_tao DESC
        allData.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));

        // Get analytics counts
        const total = allData.length;
        const positive = allData.filter(d => d.sentiment === 'positive').length;
        const negative = allData.filter(d => d.sentiment === 'negative').length;
        const neutral = allData.filter(d => d.sentiment === 'neutral').length;

        // Group by user for preferences view
        const userMap = {};
        allData.forEach(d => {
            if (d.ma_tai_khoan) {
                if (!userMap[d.ma_tai_khoan]) {
                    userMap[d.ma_tai_khoan] = {
                        ma_tai_khoan: d.ma_tai_khoan,
                        ten_dang_nhap: d.ten_dang_nhap,
                        email: d.email,
                        so_dien_thoai: d.so_dien_thoai,
                        positiveCount: 0,
                        negativeCount: 0,
                        neutralCount: 0,
                        activities: []
                    };
                }
                userMap[d.ma_tai_khoan].activities.push(d);
                if (d.sentiment === 'positive') userMap[d.ma_tai_khoan].positiveCount++;
                else if (d.sentiment === 'negative') userMap[d.ma_tai_khoan].negativeCount++;
                else userMap[d.ma_tai_khoan].neutralCount++;
            }
        });

        // Lấy TẤT CẢ users từ DB (bao gồm cả user chưa có activities)
        const [allUsers] = await db.query(`
            SELECT ma_tai_khoan, ten_dang_nhap, email, so_dien_thoai
            FROM tai_khoan
            WHERE vai_tro = 'khach_hang'
            ORDER BY ma_tai_khoan DESC
        `);

        // Thêm users chưa có activities vào userMap
        allUsers.forEach(u => {
            if (!userMap[u.ma_tai_khoan]) {
                userMap[u.ma_tai_khoan] = {
                    ma_tai_khoan: u.ma_tai_khoan,
                    ten_dang_nhap: u.ten_dang_nhap,
                    email: u.email,
                    so_dien_thoai: u.so_dien_thoai,
                    positiveCount: 0,
                    negativeCount: 0,
                    neutralCount: 0,
                    activities: []
                };
            }
        });

        // Nạp thêm trường từ hồ sơ khảo sát (thong_tin_ca_nhan_hoa) và số liệu mua hàng từ DB
        const userIds = Object.keys(userMap);
        if (userIds.length > 0) {
            // Số điện thoại và thông tin liên hệ vẫn lấy từ tai_khoan
            const [usersDemographics] = await db.query(
                'SELECT ma_tai_khoan, so_dien_thoai FROM tai_khoan WHERE ma_tai_khoan IN (?)',
                [userIds]
            );

            // Hồ sơ khảo sát cá nhân hóa (nguồn dữ liệu chính cho cột Nhu cầu khai báo)
            const [surveyProfiles] = await db.query(
                `SELECT ma_tai_khoan, muc_dich_su_dung, phan_khuc_ngan_sach, danh_muc_quan_tam, thuong_hieu_yeu_thich, da_hoan_thanh_khao_sat
                 FROM thong_tin_ca_nhan_hoa
                 WHERE ma_tai_khoan IN (?)`,
                [userIds]
            );

            // Truy vấn số lượng đơn hàng và tổng số tiền chi tiêu từ các đơn hàng hoàn thành
            const [userOrders] = await db.query(
                `SELECT ma_tai_khoan, COUNT(ma_don_hang) as total_orders,
                        COALESCE(SUM(CASE WHEN trang_thai_don_hang = 'hoan_thanh' THEN tong_tien ELSE 0 END), 0) as total_spending
                 FROM don_hang
                 WHERE ma_tai_khoan IN (?)
                 GROUP BY ma_tai_khoan`,
                [userIds]
            );

            const ordersMap = {};
            userOrders.forEach(o => {
                ordersMap[o.ma_tai_khoan] = {
                    total_orders: o.total_orders,
                    total_spending: o.total_spending
                };
            });

            const surveyMap = {};
            surveyProfiles.forEach(s => {
                const parseJson = v => {
                    if (!v) return [];
                    if (Array.isArray(v)) return v;
                    try { return JSON.parse(v) || []; } catch (e) { return []; }
                };
                surveyMap[s.ma_tai_khoan] = {
                    muc_dich_su_dung: s.muc_dich_su_dung,
                    phan_khuc_ngan_sach: s.phan_khuc_ngan_sach,
                    danh_muc_quan_tam: parseJson(s.danh_muc_quan_tam),
                    thuong_hieu_yeu_thich: parseJson(s.thuong_hieu_yeu_thich),
                    da_hoan_thanh_khao_sat: s.da_hoan_thanh_khao_sat === 1
                };
            });

            usersDemographics.forEach(ud => {
                if (userMap[ud.ma_tai_khoan]) {
                    userMap[ud.ma_tai_khoan].so_dien_thoai = ud.so_dien_thoai || userMap[ud.ma_tai_khoan].so_dien_thoai;

                    const survey = surveyMap[ud.ma_tai_khoan] || {};
                    userMap[ud.ma_tai_khoan].muc_dich_su_dung = survey.muc_dich_su_dung || null;
                    userMap[ud.ma_tai_khoan].phan_khuc_ngan_sach = survey.phan_khuc_ngan_sach || null;
                    userMap[ud.ma_tai_khoan].danh_muc_quan_tam = survey.danh_muc_quan_tam || [];
                    userMap[ud.ma_tai_khoan].thuong_hieu_yeu_thich = survey.thuong_hieu_yeu_thich || [];
                    userMap[ud.ma_tai_khoan].da_hoan_thanh_khao_sat = !!survey.da_hoan_thanh_khao_sat;

                    const ord = ordersMap[ud.ma_tai_khoan] || { total_orders: 0, total_spending: 0 };
                    userMap[ud.ma_tai_khoan].total_orders = ord.total_orders;
                    userMap[ud.ma_tai_khoan].total_spending = ord.total_spending;
                }
            });
        }

        // 5. TÍNH TOÁN LỌC CỘNG TÁC (COLLABORATIVE FILTERING - COUSINE SIMILARITY)
        const allUserIds = Object.keys(userMap).map(Number);
        
        // Helper lấy tất cả danh mục và thương hiệu được người dùng quan tâm (qua sản phẩm đã mua)
        function getUserInterests(userId) {
            const profile = userMap[userId];
            if (!profile) return { categories: new Set(), brands: new Set() };
            const categories = new Set();
            const brands = new Set();
            
            profile.activities.forEach(act => {
                if (act.ten_danh_muc) categories.add(act.ten_danh_muc);
                if (act.thuong_hieu) brands.add(act.thuong_hieu);
            });
            
            return { categories, brands };
        }

        const userInterestsMap = {};
        allUserIds.forEach(uid => {
            userInterestsMap[uid] = getUserInterests(uid);
        });

        // Nạp ma trận hành vi Người dùng - Sản phẩm từ DB thông qua RecommendationEngineJS
        const matrix = await RecommendationEngine.getUserItemMatrix();
        
        // Nhóm điểm số tương tác theo từng người dùng để tính toán Cosine Similarity nhanh hơn
        const userMatrixMap = {};
        matrix.forEach(m => {
            if (!userMatrixMap[m.user_id]) userMatrixMap[m.user_id] = {};
            userMatrixMap[m.user_id][m.product_id] = m.score;
        });

        function computeJaccardSimilarity(uidA, uidB) {
            const scoresA = userMatrixMap[uidA] || {};
            const scoresB = userMatrixMap[uidB] || {};
            
            const pidsA = Object.keys(scoresA);
            const pidsB = Object.keys(scoresB);
            if (pidsA.length === 0 || pidsB.length === 0) return 0;

            const setA = new Set(pidsA);
            const setB = new Set(pidsB);

            let intersectionSize = 0;
            for (const pid of pidsA) {
                if (setB.has(pid)) {
                    intersectionSize++;
                }
            }

            if (intersectionSize === 0) return 0;

            const unionSize = setA.size + setB.size - intersectionSize;
            return intersectionSize / unionSize;
        }

        // Tính toán các "Taste Twins" theo đúng Collaborative Filtering chuẩn:
        // Chỉ ghép cặp khi 2 user có CÙNG TƯƠNG TÁC trên ÍT NHẤT 1 sản phẩm chung.
        // KHÔNG fallback theo danh mục/thương hiệu (cái đó là Content-based, không phải CF).
        allUserIds.forEach(uid => {
            const profile = userMap[uid];
            const interestsA = userInterestsMap[uid];
            const scoresA = userMatrixMap[uid] || {};
            const pidsA = Object.keys(scoresA);
            const similarities = [];

            allUserIds.forEach(otherUid => {
                if (uid === otherUid) return;

                const scoresB = userMatrixMap[otherUid] || {};
                const pidsB = Object.keys(scoresB);

                // Bắt buộc có ít nhất 1 sản phẩm chung trong tương tác
                const sharedProductIds = pidsA.filter(pid => scoresB[pid] !== undefined);
                if (sharedProductIds.length === 0) return;

                const similarityScore = computeJaccardSimilarity(uid, otherUid);
                if (similarityScore <= 0) return;

                const otherProfile = userMap[otherUid];
                const interestsB = userInterestsMap[otherUid];
                const sharedCats = [...interestsA.categories].filter(c => interestsB.categories.has(c));
                const sharedBrands = [...interestsA.brands].filter(b => interestsB.brands.has(b));

                similarities.push({
                    ma_tai_khoan: otherUid,
                    ten_dang_nhap: otherProfile.ten_dang_nhap,
                    email: otherProfile.email,
                    so_dien_thoai: otherProfile.so_dien_thoai,
                    similarity: parseFloat(similarityScore.toFixed(3)),
                    sharedProductIds: sharedProductIds.map(Number),
                    sharedCategories: sharedCats,
                    sharedBrands: sharedBrands
                });
            });

            // Sắp xếp người dùng tương đồng nhất giảm dần
            const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);
            profile.allSimilarUsers = sortedSimilarities; // dùng để tính gợi ý đầy đủ
            profile.similarUsers = sortedSimilarities.slice(0, 8); // dùng để hiển thị trên UI
        });

        // Tạo danh sách sản phẩm gợi ý cộng tác (Collaborative Recommendations)
        allUserIds.forEach(uid => {
            const profile = userMap[uid];
            const interactedPids = new Set(Object.keys(userMatrixMap[uid] || {}));
            const candidateProducts = {};
            
            // Dùng toàn bộ user tương đồng (không giới hạn ở top 8) để không bỏ sót bất kỳ sản phẩm nào
            const simUsersToUse = profile.allSimilarUsers || [];
            simUsersToUse.forEach(simUser => {
                const simScore = simUser.similarity;
                const otherUid = simUser.ma_tai_khoan;
                const otherScores = userMatrixMap[otherUid] || {};
                
                Object.entries(otherScores).forEach(([pid, score]) => {
                    if (interactedPids.has(pid)) return; // Bỏ qua sản phẩm chính user này đã tương tác
                    if (!candidateProducts[pid]) candidateProducts[pid] = 0;
                    // Điểm cộng dồn theo Jaccard similarity của người mua chung
                    candidateProducts[pid] += simScore;
                });
            });

            profile.collaborativeRecommendations = Object.entries(candidateProducts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([pid]) => Number(pid));
        });

        // Nạp chi tiết sản phẩm cho danh sách gợi ý
        const allRecommendedPids = new Set();
        allUserIds.forEach(uid => {
            userMap[uid].collaborativeRecommendations.forEach(pid => allRecommendedPids.add(pid));
        });

        if (allRecommendedPids.size > 0) {
            const [recommendedProducts] = await db.query(
                `SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, a.duong_dan_anh
                 FROM san_pham sp
                 LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                 WHERE sp.ma_san_pham IN (?)`,
                [[...allRecommendedPids]]
            );

            const productDetailsMap = {};
            recommendedProducts.forEach(p => {
                productDetailsMap[p.ma_san_pham] = p;
            });

            allUserIds.forEach(uid => {
                const profile = userMap[uid];
                profile.collaborativeRecommendations = profile.collaborativeRecommendations
                    .map(pid => productDetailsMap[pid])
                    .filter(Boolean);
            });
        } else {
            allUserIds.forEach(uid => {
                userMap[uid].collaborativeRecommendations = [];
            });
        }

        // ==========================================
        // TÍNH TOÁN CÁC CẶP NGƯỜI DÙNG TƯƠNG ĐỒNG (PAIR-WISE COLLABORATIVE FILTERING)
        // Logic CF chuẩn: chỉ ghép cặp khi 2 user có cùng tương tác (mua/thích/xem) trên >=1 SP chung.
        // Gợi ý chéo lấy từ tất cả tương tác tích cực, không chỉ purchase.
        // ==========================================
        let collaborativeFiltering = [];
        try {
            // 1) Lấy chi tiết hành động trên TỪNG sản phẩm cho từng user (loại tương tác, lần cuối)
            const [interactionRows] = await db.query(`
                SELECT ui.MaND as user_id,
                       ui.MaSP as product_id,
                       ui.LoaiTuongTac as action_type,
                       COUNT(*) as action_count,
                       SUM(ui.GiaTri) as total_value,
                       MAX(ui.ThoiGian) as last_time
                FROM user_interactions ui
                WHERE ui.LoaiTuongTac = 'purchase'
                  AND EXISTS (
                      -- Safety net: chỉ tính purchase từ đơn hàng đã xác nhận, loại trừ đơn bị hủy
                      SELECT 1
                      FROM don_hang dh
                      JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
                      WHERE dh.ma_tai_khoan = ui.MaND
                        AND ctdh.ma_san_pham = ui.MaSP
                        AND dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao', 'da_xac_nhan')
                  )
                GROUP BY ui.MaND, ui.MaSP, ui.LoaiTuongTac
            `);

            // userActions[uid][pid] = { actions: {purchase: 1}, dominantAction, lastTime }
            const userActions = {};
            const ACTION_PRIORITY = { purchase: 5 };

            interactionRows.forEach(r => {
                if (!userActions[r.user_id]) userActions[r.user_id] = {};
                if (!userActions[r.user_id][r.product_id]) {
                    userActions[r.user_id][r.product_id] = { actions: {}, lastTime: r.last_time };
                }
                userActions[r.user_id][r.product_id].actions[r.action_type] = r.action_count;
                if (r.last_time > userActions[r.user_id][r.product_id].lastTime) {
                    userActions[r.user_id][r.product_id].lastTime = r.last_time;
                }
            });

            // Tính action mạnh nhất cho mỗi (user, product) để hiển thị
            Object.values(userActions).forEach(prodMap => {
                Object.values(prodMap).forEach(rec => {
                    let best = 'view', bestPri = -1;
                    Object.keys(rec.actions).forEach(a => {
                        const pri = ACTION_PRIORITY[a] != null ? ACTION_PRIORITY[a] : 0;
                        if (pri > bestPri) { bestPri = pri; best = a; }
                    });
                    rec.dominantAction = best;
                });
            });

            // 2) Lấy chi tiết sản phẩm cho TẤT CẢ pids xuất hiện trong matrix
            const allInteractedPids = new Set();
            Object.values(userActions).forEach(prodMap => {
                Object.keys(prodMap).forEach(pid => allInteractedPids.add(Number(pid)));
            });


            const productMap = {};
            if (allInteractedPids.size > 0) {
                const [productRows] = await db.query(`
                    SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu,
                           dm.ten_danh_muc, a.duong_dan_anh
                    FROM san_pham sp
                    LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                    LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                    WHERE sp.ma_san_pham IN (?)
                `, [[...allInteractedPids]]);
                productRows.forEach(p => { productMap[p.ma_san_pham] = p; });
            }

            // 3) Lấy SP đã mua (chi_tiet_don_hang) để hiển thị side-info "đã mua"
            const [purchasedRows] = await db.query(`
                SELECT dh.ma_tai_khoan,
                       ctdh.ma_san_pham,
                       sp.ten_san_pham,
                       sp.gia,
                       sp.thuong_hieu,
                       dm.ten_danh_muc,
                       a.duong_dan_anh,
                       MAX(dh.ngay_tao) as ngay_mua_cuoi,
                       SUM(ctdh.so_luong) as tong_so_luong
                FROM chi_tiet_don_hang ctdh
                JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
                JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
                LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                WHERE dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao', 'cho_xac_nhan', 'da_xac_nhan')
                GROUP BY dh.ma_tai_khoan, ctdh.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, dm.ten_danh_muc, a.duong_dan_anh
            `);

            const purchasesByUser = {};
            const purchasedIdsByUser = {};
            purchasedRows.forEach(r => {
                const pid = Number(r.ma_san_pham);
                if (!purchasesByUser[r.ma_tai_khoan]) purchasesByUser[r.ma_tai_khoan] = [];
                purchasesByUser[r.ma_tai_khoan].push({
                    ma_san_pham: r.ma_san_pham,
                    ten_san_pham: r.ten_san_pham,
                    gia: r.gia,
                    thuong_hieu: r.thuong_hieu,
                    ten_danh_muc: r.ten_danh_muc,
                    duong_dan_anh: r.duong_dan_anh,
                    so_luong: r.tong_so_luong,
                    ngay_mua_cuoi: r.ngay_mua_cuoi
                });
                
                if (!purchasedIdsByUser[r.ma_tai_khoan]) purchasedIdsByUser[r.ma_tai_khoan] = new Set();
                purchasedIdsByUser[r.ma_tai_khoan].add(pid);
            });

            // *** QUAN TRỌNG: Bổ sung productMap với các SP chỉ có trong đơn hàng ***
            // Đảm bảo productMap chứa đầy đủ sản phẩm, kể cả những SP
            // chỉ có trong chi_tiet_don_hang mà không có trong user_interactions
            const missingPids = [];
            Object.values(purchasedIdsByUser).forEach(pidSet => {
                pidSet.forEach(pid => {
                    if (!productMap[pid]) missingPids.push(pid);
                });
            });
            if (missingPids.length > 0) {
                const [extraProducts] = await db.query(`
                    SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu,
                           dm.ten_danh_muc, a.duong_dan_anh
                    FROM san_pham sp
                    LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                    LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                    WHERE sp.ma_san_pham IN (?)
                `, [[...new Set(missingPids)]]);
                extraProducts.forEach(p => { productMap[p.ma_san_pham] = p; });
            }

            allUserIds.forEach(uid => {
                userMap[uid].purchasedProducts = purchasesByUser[uid] || [];
            });

            // 4) Helper bọc thông tin sản phẩm + DANH SÁCH đầy đủ các action user đã làm trên SP
            function buildInteractedProduct(uid, pid) {
                const prod = productMap[pid];
                if (!prod) return null;
                const rec = (userActions[uid] || {})[pid];
                const allActions = rec ? { ...rec.actions } : {};

                // Đánh dấu thêm action 'purchase' nếu có trong chi_tiet_don_hang nhưng chưa có trong user_interactions
                const purchaseRecord = (purchasesByUser[uid] || []).find(p => p.ma_san_pham === Number(pid));
                if (purchaseRecord && !allActions.purchase) {
                    allActions.purchase = Number(purchaseRecord.so_luong) || 1;
                }

                // Build mảng [{type, count}] sắp theo độ mạnh action giảm dần
                const actionsList = Object.entries(allActions)
                    .map(([type, count]) => ({ type, count: Number(count) || 0 }))
                    .sort((a, b) => (ACTION_PRIORITY[b.type] || 0) - (ACTION_PRIORITY[a.type] || 0));

                // Action mạnh nhất để sort gợi ý
                const dominantAction = actionsList[0] ? actionsList[0].type : 'view';

                return {
                    ma_san_pham: prod.ma_san_pham,
                    ten_san_pham: prod.ten_san_pham,
                    gia: prod.gia,
                    thuong_hieu: prod.thuong_hieu,
                    ten_danh_muc: prod.ten_danh_muc,
                    duong_dan_anh: prod.duong_dan_anh,
                    action_type: dominantAction,
                    actions: actionsList
                };
            }

            // 5) Xây danh sách cặp (chỉ giữ A_id < B_id để không trùng lặp)
            const seenPairs = new Set();
            allUserIds.forEach(uidA => {
                const profileA = userMap[uidA];
                if (!profileA.similarUsers || profileA.similarUsers.length === 0) return;

                profileA.similarUsers.forEach(simEntry => {
                    const uidB = simEntry.ma_tai_khoan;
                    const pairKey = uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
                    if (seenPairs.has(pairKey)) return;
                    seenPairs.add(pairKey);

                    const profileB = userMap[uidB];
                    if (!profileB) return;

                    // Merge user_interactions pids VÀ purchased pids từ chi_tiet_don_hang
                    // Đảm bảo TẤT CẢ sản phẩm đã mua đều nằm trong danh sách ứng viên gợi ý
                    const setA = new Set([
                        ...Object.keys(userActions[uidA] || {}),
                        ...(purchasedIdsByUser[uidA] ? [...purchasedIdsByUser[uidA]].map(String) : [])
                    ]);
                    const setB = new Set([
                        ...Object.keys(userActions[uidB] || {}),
                        ...(purchasedIdsByUser[uidB] ? [...purchasedIdsByUser[uidB]].map(String) : [])
                    ]);
                    const aPids = [...setA];
                    const bPids = [...setB];

                    // Sản phẩm cả 2 cùng tương tác — trả về danh sách action ĐẦY ĐỦ của mỗi user
                    const sharedIds = aPids.filter(pid => setB.has(pid));
                    const sharedProducts = sharedIds
                        .map(pid => {
                            const aProd = buildInteractedProduct(uidA, pid);
                            const bProd = buildInteractedProduct(uidB, pid);
                            if (!aProd || !bProd) return null;
                            return {
                                ma_san_pham: aProd.ma_san_pham,
                                ten_san_pham: aProd.ten_san_pham,
                                gia: aProd.gia,
                                thuong_hieu: aProd.thuong_hieu,
                                ten_danh_muc: aProd.ten_danh_muc,
                                duong_dan_anh: aProd.duong_dan_anh,
                                actions_user1: aProd.actions,   // [{type:'view', count:3}, {type:'cart', count:1}, ...]
                                actions_user2: bProd.actions
                            };
                        })
                        .filter(Boolean);

                    // SP của B (đã mua) mà A chưa có → gợi ý cho A
                    const aPurchases = purchasedIdsByUser[uidA] || new Set();
                    const bPurchases = purchasedIdsByUser[uidB] || new Set();
                    const recommendedForA = bPids
                        .filter(pid => !aPurchases.has(Number(pid)) && bPurchases.has(Number(pid)))
                        .map(pid => buildInteractedProduct(uidB, pid))
                        .filter(Boolean);

                    // SP của A (đã mua) mà B chưa có → gợi ý cho B
                    const recommendedForB = aPids
                        .filter(pid => !bPurchases.has(Number(pid)) && aPurchases.has(Number(pid)))
                        .map(pid => buildInteractedProduct(uidA, pid))
                        .filter(Boolean);

                    // SP cả 2 cùng MUA (giao của 2 purchase list)
                    const purA = purchasesByUser[uidA] || [];
                    const purB = purchasesByUser[uidB] || [];
                    const purBSet = new Set(purB.map(p => p.ma_san_pham));
                    const sharedPurchased = purA.filter(p => purBSet.has(p.ma_san_pham));

                    collaborativeFiltering.push({
                        pair_key: pairKey,
                        similarity: simEntry.similarity,
                        user1: {
                            ma_tai_khoan: uidA,
                            ten_dang_nhap: profileA.ten_dang_nhap,
                            email: profileA.email,
                            so_dien_thoai: profileA.so_dien_thoai,
                            total_purchased: purA.length,
                            total_interacted: aPids.length,
                            total_orders: profileA.total_orders || 0,
                            total_spending: profileA.total_spending || 0,
                            purchasedProducts: purA
                        },
                        user2: {
                            ma_tai_khoan: uidB,
                            ten_dang_nhap: profileB.ten_dang_nhap,
                            email: profileB.email,
                            so_dien_thoai: profileB.so_dien_thoai,
                            total_purchased: purB.length,
                            total_interacted: bPids.length,
                            total_orders: profileB.total_orders || 0,
                            total_spending: profileB.total_spending || 0,
                            purchasedProducts: purB
                        },
                        sharedCategories: simEntry.sharedCategories || [],
                        sharedBrands: simEntry.sharedBrands || [],
                        sharedProducts,
                        sharedPurchased,
                        recommendedForUser1: recommendedForA,
                        recommendedForUser2: recommendedForB
                    });
                });
            });

            collaborativeFiltering.sort((a, b) => b.similarity - a.similarity);
        } catch (cfError) {
            console.error('Collaborative filtering pair build error:', cfError);
            collaborativeFiltering = [];
        }

        const userProfiles = Object.values(userMap);

        res.json({
            success: true,
            data: {
                analytics: {
                    total,
                    positive,
                    negative,
                    neutral
                },
                activities: allData,
                userProfiles,
                collaborativeFiltering
            }
        });

    } catch (error) {
        console.error('Get personalization & sentiment error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi nạp dữ liệu sở thích & cảm xúc: ' + error.message });
    }
});

// ==========================================
// KHẢO SÁT KHÁCH HÀNG (Customer Survey)
// ==========================================

// Danh sách kết quả khảo sát cá nhân hóa
router.get('/customer-surveys', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, purpose, budget } = req.query;
        let whereClause = 'ttch.da_hoan_thanh_khao_sat = 1';
        const params = [];

        if (search && search.trim()) {
            whereClause += ' AND (tk.ten_dang_nhap LIKE ? OR tk.email LIKE ?)';
            const s = `%${search.trim()}%`;
            params.push(s, s);
        }
        if (purpose) { whereClause += ' AND ttch.muc_dich_su_dung = ?'; params.push(purpose); }
        if (budget) { whereClause += ' AND ttch.phan_khuc_ngan_sach = ?'; params.push(budget); }

        const [rows] = await db.query(`
            SELECT
                ttch.ma_tai_khoan,
                tk.ten_dang_nhap,
                tk.email,
                tk.so_dien_thoai,
                ttch.muc_dich_su_dung,
                ttch.phan_khuc_ngan_sach,
                ttch.danh_muc_quan_tam,
                ttch.thuong_hieu_yeu_thich,
                ttch.thoi_gian_tao,
                ttch.thoi_gian_cap_nhat
            FROM thong_tin_ca_nhan_hoa ttch
            INNER JOIN tai_khoan tk ON ttch.ma_tai_khoan = tk.ma_tai_khoan
            WHERE ${whereClause}
            ORDER BY ttch.thoi_gian_cap_nhat DESC
        `, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get customer surveys error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Thống kê tổng hợp khảo sát
router.get('/customer-surveys/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [byPurpose] = await db.query(`
            SELECT muc_dich_su_dung AS label, COUNT(*) AS value
            FROM thong_tin_ca_nhan_hoa
            WHERE da_hoan_thanh_khao_sat = 1 AND muc_dich_su_dung IS NOT NULL
            GROUP BY muc_dich_su_dung ORDER BY value DESC
        `);
        const [byBudget] = await db.query(`
            SELECT phan_khuc_ngan_sach AS label, COUNT(*) AS value
            FROM thong_tin_ca_nhan_hoa
            WHERE da_hoan_thanh_khao_sat = 1 AND phan_khuc_ngan_sach IS NOT NULL
            GROUP BY phan_khuc_ngan_sach ORDER BY value DESC
        `);
        const [totalRow] = await db.query(`
            SELECT COUNT(*) AS total FROM thong_tin_ca_nhan_hoa WHERE da_hoan_thanh_khao_sat = 1
        `);

        const [allRows] = await db.query(`
            SELECT danh_muc_quan_tam, thuong_hieu_yeu_thich
            FROM thong_tin_ca_nhan_hoa WHERE da_hoan_thanh_khao_sat = 1
        `);

        function countJsonItems(rows, field) {
            const counter = {};
            rows.forEach(r => {
                let arr = r[field];
                if (!arr) return;
                if (typeof arr === 'string') {
                    try { arr = JSON.parse(arr); } catch (e) { return; }
                }
                if (!Array.isArray(arr)) return;
                arr.forEach(item => { counter[item] = (counter[item] || 0) + 1; });
            });
            return Object.entries(counter)
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => b.value - a.value);
        }

        const byCategory = countJsonItems(allRows, 'danh_muc_quan_tam');
        const byBrand = countJsonItems(allRows, 'thuong_hieu_yeu_thich');

        res.json({
            success: true,
            data: {
                total: totalRow[0].total,
                byPurpose, byBudget, byCategory, byBrand
            }
        });
    } catch (error) {
        console.error('Customer surveys stats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Xóa 1 khảo sát của khách hàng
router.delete('/customer-surveys/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM thong_tin_ca_nhan_hoa WHERE ma_tai_khoan = ?', [req.params.userId]);
        res.json({ success: true, message: 'Đã xóa kết quả khảo sát' });
    } catch (error) {
        console.error('Delete customer survey error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// ==========================================
// QUẢN LÝ CHATBOT RAG & LỊCH SỬ
// ==========================================

// 1. Lấy danh sách tài liệu RAG
router.get('/chatbot/documents', authenticateToken, requireAdmin, (req, res) => {
    try {
        const docsDir = path.join(__dirname, '../data/documents');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
            return res.json({ success: true, data: [] });
        }

        const files = fs.readdirSync(docsDir);
        const data = files
            .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
            .map(f => {
                const filePath = path.join(docsDir, f);
                const stat = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf-8');
                return {
                    filename: f,
                    size: stat.size,
                    updatedAt: stat.mtime,
                    snippet: content.substring(0, 150) + (content.length > 150 ? '...' : '')
                };
            });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get RAG docs error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài liệu: ' + error.message });
    }
});

// 2. Lấy nội dung chi tiết 1 tài liệu RAG
router.get('/chatbot/documents/:filename', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        // Bảo vệ chống Path Traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ success: false, message: 'Tên file không hợp lệ' });
        }
        
        const filePath = path.join(__dirname, '../data/documents', filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Tài liệu không tồn tại' });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ success: true, data: { filename, content } });
    } catch (error) {
        console.error('Get RAG doc content error:', error);
        res.status(500).json({ success: false, message: 'Lỗi đọc tài liệu: ' + error.message });
    }
});

// 3. Tạo hoặc cập nhật tài liệu RAG
router.post('/chatbot/documents', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { filename, content } = req.body;
        if (!filename || typeof content !== 'string') {
            return res.status(400).json({ success: false, message: 'Thiếu tên file hoặc nội dung' });
        }
        
        // Bảo vệ chống Path Traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ success: false, message: 'Tên file không hợp lệ' });
        }

        if (!filename.endsWith('.md') && !filename.endsWith('.txt')) {
            return res.status(400).json({ success: false, message: 'Định dạng file phải là .md hoặc .txt' });
        }

        const docsDir = path.join(__dirname, '../data/documents');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        const filePath = path.join(docsDir, filename);
        fs.writeFileSync(filePath, content, 'utf-8');

        res.json({ success: true, message: 'Lưu tài liệu thành công' });
    } catch (error) {
        console.error('Save RAG doc error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lưu tài liệu: ' + error.message });
    }
});

// 4. Xóa tài liệu RAG
router.delete('/chatbot/documents/:filename', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        // Bảo vệ chống Path Traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ success: false, message: 'Tên file không hợp lệ' });
        }

        const filePath = path.join(__dirname, '../data/documents', filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Tài liệu không tồn tại' });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Đã xóa tài liệu' });
    } catch (error) {
        console.error('Delete RAG doc error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa tài liệu: ' + error.message });
    }
});

// 5. Lấy lịch sử tất cả các đoạn trò chuyện của khách hàng với chatbot
router.get('/chatbot/history', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.ma_lich_su, c.ma_tai_khoan, c.cau_hoi, c.tra_loi, c.ngay_chat, tk.ten_dang_nhap, tk.email
            FROM lich_su_chatbot c
            LEFT JOIN tai_khoan tk ON c.ma_tai_khoan = tk.ma_tai_khoan
            ORDER BY c.ngay_chat DESC
            LIMIT 500
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get chatbot history error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử chatbot: ' + error.message });
    }
});

// 6. Xóa lịch sử chatbot
router.delete('/chatbot/history/:ma_lich_su', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_lich_su } = req.params;
        await db.query('DELETE FROM lich_su_chatbot WHERE ma_lich_su = ?', [ma_lich_su]);
        res.json({ success: true, message: 'Đã xóa lịch sử cuộc trò chuyện' });
    } catch (error) {
        console.error('Delete chatbot history item error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa lịch sử cuộc trò chuyện: ' + error.message });
    }
});

// ==========================================
// WARRANTY TICKETS - PHIẾU BẢO HÀNH
// ==========================================

// Setup table
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS phieu_bao_hanh (
                ma_phieu_bh INT AUTO_INCREMENT PRIMARY KEY,
                ma_hoa_don_bh INT DEFAULT NULL,
                ma_hoa_don INT DEFAULT NULL,
                ten_khach_hang VARCHAR(255) NOT NULL,
                so_dien_thoai VARCHAR(20) NOT NULL,
                ten_san_pham VARCHAR(255) NOT NULL,
                mo_ta_loi TEXT,
                ngay_nhan DATETIME DEFAULT CURRENT_TIMESTAMP,
                ngay_tra DATETIME DEFAULT NULL,
                trang_thai VARCHAR(50) DEFAULT 'Đang xử lý',
                chi_phi DECIMAL(15,2) DEFAULT 0.00,
                ghi_chu TEXT
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Table phieu_bao_hanh ready');
    } catch (e) {
        console.error('❌ Error creating phieu_bao_hanh table:', e.message);
    }
})();

// 1. Get all warranty tickets
router.get('/warranties', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, status } = req.query;
        let queryStr = `SELECT * FROM phieu_bao_hanh WHERE 1=1`;
        const params = [];
        
        if (status) {
            queryStr += ` AND trang_thai = ?`;
            params.push(status);
        }
        
        if (search) {
            queryStr += ` AND (ten_khach_hang LIKE ? OR so_dien_thoai LIKE ? OR ten_san_pham LIKE ? OR ma_hoa_don_bh LIKE ? OR ma_hoa_don LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        queryStr += ` ORDER BY ngay_nhan DESC`;
        const [rows] = await db.query(queryStr, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get warranties error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phiếu bảo hành: ' + error.message });
    }
});

// 2. Create warranty ticket
router.post('/warranties', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ma_hoa_don_bh, ma_hoa_don, ten_khach_hang, so_dien_thoai, ten_san_pham, mo_ta_loi, trang_thai, chi_phi, ghi_chu, ngay_tra, ngay_nhan } = req.body;
        
        if (!ten_khach_hang || !so_dien_thoai || !ten_san_pham) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tên khách hàng, số điện thoại và tên sản phẩm' });
        }
        
        const [result] = await db.query(`
            INSERT INTO phieu_bao_hanh (ma_hoa_don_bh, ma_hoa_don, ten_khach_hang, so_dien_thoai, ten_san_pham, mo_ta_loi, trang_thai, chi_phi, ghi_chu, ngay_tra, ngay_nhan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ma_hoa_don_bh || null,
            ma_hoa_don || null,
            ten_khach_hang,
            so_dien_thoai,
            ten_san_pham,
            mo_ta_loi || null,
            trang_thai || 'Đang xử lý',
            chi_phi || 0.00,
            ghi_chu || null,
            ngay_tra || null,
            ngay_nhan || new Date()
        ]);
        
        res.json({ success: true, message: 'Tạo phiếu bảo hành thành công', data: { ma_phieu_bh: result.insertId } });
    } catch (error) {
        console.error('Create warranty ticket error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo phiếu bảo hành: ' + error.message });
    }
});

// 3. Update warranty ticket
router.put('/warranties/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_khach_hang, so_dien_thoai, ten_san_pham, mo_ta_loi, trang_thai, chi_phi, ghi_chu, ngay_tra, ngay_nhan } = req.body;
        
        if (!ten_khach_hang || !so_dien_thoai || !ten_san_pham) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }
        
        await db.query(`
            UPDATE phieu_bao_hanh
            SET ten_khach_hang = ?, so_dien_thoai = ?, ten_san_pham = ?, mo_ta_loi = ?, trang_thai = ?, chi_phi = ?, ghi_chu = ?, ngay_tra = ?, ngay_nhan = ?
            WHERE ma_phieu_bh = ?
        `, [
            ten_khach_hang,
            so_dien_thoai,
            ten_san_pham,
            mo_ta_loi || null,
            trang_thai,
            chi_phi || 0.00,
            ghi_chu || null,
            ngay_tra || null,
            ngay_nhan || null,
            id
        ]);
        
        res.json({ success: true, message: 'Cập nhật phiếu bảo hành thành công' });
    } catch (error) {
        console.error('Update warranty error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật phiếu bảo hành: ' + error.message });
    }
});

// 4. Delete warranty ticket
router.delete('/warranties/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM phieu_bao_hanh WHERE ma_phieu_bh = ?', [id]);
        res.json({ success: true, message: 'Đã xóa phiếu bảo hành' });
    } catch (error) {
        console.error('Delete warranty error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa phiếu bảo hành: ' + error.message });
    }
});

// 5. Check purchase history for warranty registration
router.get('/warranties/check-purchase', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { query } = req.query; // phone or invoice code
        if (!query) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại hoặc mã hóa đơn' });
        }
        
        const results = [];
        
        // A. Search in In-Store (hoa_don_ban_hang)
        const [offlineRows] = await db.query(`
            SELECT 
                hd.ma_hoa_don_bh,
                hd.ten_khach_hang,
                hd.so_dien_thoai,
                hd.ngay_ban,
                hd.ghi_chu,
                ct.ten_san_pham,
                ct.ma_san_pham
            FROM hoa_don_ban_hang hd
            JOIN chi_tiet_hoa_don_bh ct ON hd.ma_hoa_don_bh = ct.ma_hoa_don_bh
            WHERE hd.so_dien_thoai = ? OR hd.ma_hoa_don = ? OR hd.ma_hoa_don_bh = ?
        `, [query, query, query]);
        
        offlineRows.forEach(row => {
            let warrantyMonths = 12;
            if (row.ghi_chu) {
                try {
                    const parsed = JSON.parse(row.ghi_chu);
                    if (parsed && typeof parsed.warranty_months !== 'undefined') {
                        warrantyMonths = parseInt(parsed.warranty_months, 10);
                    }
                } catch(e) {
                    const match = row.ghi_chu.match(/(\d+)\s*tháng/i);
                    if (match) warrantyMonths = parseInt(match[1], 10);
                }
            }
            
            const saleDate = new Date(row.ngay_ban);
            const expiryDate = new Date(saleDate);
            expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
            const isUnderWarranty = expiryDate >= new Date();
            
            results.push({
                type: 'offline',
                ma_hoa_don_bh: row.ma_hoa_don_bh,
                ma_hoa_don: null,
                ten_khach_hang: row.ten_khach_hang || 'Khách lẻ',
                so_dien_thoai: row.so_dien_thoai,
                ten_san_pham: row.ten_san_pham,
                ngay_ban: row.ngay_ban,
                warranty_months: warrantyMonths,
                expiry_date: expiryDate,
                is_under_warranty: isUnderWarranty
            });
        });
        
        // B. Search in Online (don_hang)
        const [onlineRows] = await db.query(`
            SELECT 
                dh.ma_don_hang,
                dh.ngay_tao,
                sp.ten_san_pham,
                sp.ma_san_pham,
                tk.email,
                tk.ten_dang_nhap
            FROM don_hang dh
            JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
            JOIN san_pham sp ON ct.ma_san_pham = sp.ma_san_pham
            JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
            WHERE dh.ma_don_hang = ? OR tk.email = ?
        `, [query, query]);
        
        onlineRows.forEach(row => {
            const warrantyMonths = 12; // default online order warranty
            const saleDate = new Date(row.ngay_tao);
            const expiryDate = new Date(saleDate);
            expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
            const isUnderWarranty = expiryDate >= new Date();
            
            results.push({
                type: 'online',
                ma_hoa_don_bh: null,
                ma_hoa_don: row.ma_don_hang,
                ten_khach_hang: row.ten_dang_nhap || row.email,
                so_dien_thoai: '', 
                ten_san_pham: row.ten_san_pham,
                ngay_ban: row.ngay_tao,
                warranty_months: warrantyMonths,
                expiry_date: expiryDate,
                is_under_warranty: isUnderWarranty
            });
        });
        
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Check purchase history error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tra cứu lịch sử mua hàng: ' + error.message });
    }
});

module.exports = router;
