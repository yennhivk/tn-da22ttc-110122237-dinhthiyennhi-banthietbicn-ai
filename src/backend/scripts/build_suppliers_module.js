const fs = require('fs');
const path = require('path');

// Target file paths (resolved relative to workspace root)
const htmlPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'pages', 'admin.html');
const jsPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'js', 'admin.js');
const routesPath = path.resolve(__dirname, '..', '..', 'backend', 'routes', 'admin.js');

console.log('🚀 Starting Supplier Management premium module build...');

// ============================================================================
// 1. EXTEND BACKEND API ROUTES (backend/routes/admin.js)
// ============================================================================
if (fs.existsSync(routesPath)) {
    console.log(`Reading Backend Routes: ${routesPath}`);
    let routesContent = fs.readFileSync(routesPath, 'utf8');

    // Locate insertion anchor
    const targetAnchor = '// Lấy danh sách nhà cung cấp (để chọn trong form)';
    const anchorIdx = routesContent.indexOf(targetAnchor);

    if (anchorIdx !== -1) {
        console.log('✅ Found supplier route section anchor in backend! Injecting CRUD routes...');
        
        const newCrudRoutes = `// ==========================================
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
            const keyword = \`%\${search}%\`;
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
            const [rows] = await db.query(\`
                SELECT ma_phieu_nhap, ngay_nhap, tong_so_luong, tong_gia_tri, trang_thai
                FROM phieu_nhap_hang
                WHERE ma_nha_cung_cap = ?
                ORDER BY ngay_nhap DESC
                LIMIT 10
            \`, [supplierId]);
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

        const [result] = await db.query(\`
            INSERT INTO nha_cung_cap (ten_nha_cung_cap, so_dien_thoai, email, dia_chi, nguoi_lien_he, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        \`, [ten_nha_cung_cap, so_dien_thoai || null, email || null, dia_chi || null, nguoi_lien_he || null, trang_thai || 'hoat_dong', ghi_chu || null]);

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

        await db.query(\`
            UPDATE nha_cung_cap
            SET ten_nha_cung_cap = ?, so_dien_thoai = ?, email = ?, dia_chi = ?, nguoi_lien_he = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_nha_cung_cap = ?
        \`, [ten_nha_cung_cap, so_dien_thoai || null, email || null, dia_chi || null, nguoi_lien_he || null, trang_thai || 'hoat_dong', ghi_chu || null, supplierId]);

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

`;

        routesContent = routesContent.substring(0, anchorIdx) + newCrudRoutes + routesContent.substring(anchorIdx);
        fs.writeFileSync(routesPath, routesContent, 'utf8');
        console.log('✅ backend/routes/admin.js extended successfully!');
    } else {
        console.error('❌ Could not find anchor in backend routes! Skipping routes edit.');
    }
} else {
    console.error(`❌ Routes file does not exist: ${routesPath}`);
}

// ============================================================================
// 2. INJECT FRONTEND HTML AND MODALS (frontend/admin/pages/admin.html)
// ============================================================================
if (fs.existsSync(htmlPath)) {
    console.log(`Reading HTML: ${htmlPath}`);
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Insertion target: Before inventory modal
    const htmlAnchor = '<!-- Modal tạo/sửa phiếu kiểm kê -->';
    const htmlAnchorIdx = htmlContent.indexOf(htmlAnchor);

    if (htmlAnchorIdx !== -1) {
        console.log('✅ Found modal anchor in admin.html! Injecting suppliers panel and modals...');
        
        const newHtmlBlock = `<!-- Suppliers Section - Quản lý nhà cung cấp -->
                <section id="section-suppliers" class="content-section">
                    <!-- Thống kê tổng quan - Premium 3D Metallic Glass Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <!-- Card 1: Tổng nhà cung cấp -->
                        <div class="card-3d-blue cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterSupplierByStatus('')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🏭</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Tổng số</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-total-suppliers">0</p>
                            <p class="text-[13px] text-blue-100/90 font-medium">Nhà cung cấp đã liên kết</p>
                        </div>
                        
                        <!-- Card 2: Đang hoạt động -->
                        <div class="card-3d-green cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterSupplierByStatus('hoat_dong')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🟢</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Hoạt động</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-active-suppliers">0</p>
                            <p class="text-[13px] text-green-100/90 font-medium">Đang hợp tác tích cực</p>
                        </div>
                        
                        <!-- Card 3: Ngừng hợp tác -->
                        <div class="card-3d-red cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterSupplierByStatus('ngung_hoat_dong')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🔴</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Tạm ngưng</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-inactive-suppliers">0</p>
                            <p class="text-[13px] text-red-100/90 font-medium">Ngừng hoặc tạm dừng hợp tác</p>
                        </div>
                        
                        <!-- Card 4: Mới trong tháng -->
                        <div class="card-3d-purple cursor-pointer transition-all hover:scale-105 active:scale-95">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">✨</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Mới</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-new-suppliers">0</p>
                            <p class="text-[13px] text-purple-100/90 font-medium">Đối tác mới đăng ký</p>
                        </div>
                    </div>

                    <!-- Filters và Actions - Sleek Matte Clay 3D styling -->
                    <div class="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-6">
                        <div class="flex flex-wrap gap-4 items-center justify-between">
                            <div class="flex flex-wrap gap-3 flex-1">
                                <div class="relative flex-1 min-w-[280px]">
                                    <input type="text" id="supplier-search-input" class="w-full pl-4 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-medium text-sm shadow-sm transition-all" placeholder="🔍 Tìm kiếm nhà cung cấp, SĐT, email..." oninput="applySupplierFilters()">
                                </div>

                                <div class="relative min-w-[180px]">
                                    <select id="supplier-status-filter" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" onchange="applySupplierFilters()">
                                        <option value="">📋 Tất cả trạng thái</option>
                                        <option value="hoat_dong">🟢 Đang hoạt động</option>
                                        <option value="ngung_hoat_dong">🔴 Ngừng hợp tác</option>
                                    </select>
                                </div>
                                
                                <button onclick="resetSupplierFilters()" class="btn-3d-secondary text-slate-500 font-semibold px-6 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                                    🔄 Reset
                                </button>
                            </div>
                            
                            <button onclick="openSupplierModal()" class="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl border border-emerald-750 border-b-4 hover:border-b-2 hover:translate-y-[1px] active:translate-y-[3px] active:border-b-0 shadow-lg hover:shadow-xl transition-all whitespace-nowrap">
                                ➕ Thêm nhà cung cấp
                            </button>
                        </div>
                    </div>

                    <!-- Danh sách nhà cung cấp - Non-wrapping Scrollable Premium 3D Table -->
                    <div class="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200/80">
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[1100px] border-collapse text-left text-sm text-slate-600">
                                <thead class="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Mã NCC</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Tên nhà cung cấp</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Người liên hệ</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Số điện thoại</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Email</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Địa chỉ</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Trạng thái</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody id="suppliers-table-body" class="divide-y divide-slate-100 bg-white">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Modal thêm/sửa nhà cung cấp -->
                <div id="supplier-modal" class="modal fixed inset-0 bg-black/50 z-50 items-center justify-center p-4">
                    <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in">
                        <div class="p-6 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
                            <h3 id="supplier-modal-title" class="text-2xl font-bold">🏭 Thêm nhà cung cấp mới</h3>
                            <button onclick="closeSupplierModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-6">
                            <form id="supplier-form" onsubmit="saveSupplier(event)" class="space-y-5">
                                <input type="hidden" id="supplier-id">
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Tên nhà cung cấp *</label>
                                    <input type="text" id="supplier-name" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-semibold text-slate-800" placeholder="Ví dụ: Công ty TNHH Apple Việt Nam">
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Người liên hệ</label>
                                        <input type="text" id="supplier-contact" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 font-medium" placeholder="Ví dụ: Nguyễn Văn A">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Số điện thoại *</label>
                                        <input type="text" id="supplier-phone" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-mono font-bold text-slate-700" placeholder="Ví dụ: 0987654321">
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                                        <input type="email" id="supplier-email" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-mono text-slate-700" placeholder="Ví dụ: contact@apple.vn">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Trạng thái hợp tác</label>
                                        <select id="supplier-status" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-slate-700 bg-white">
                                            <option value="hoat_dong">🟢 Đang hoạt động</option>
                                            <option value="ngung_hoat_dong">🔴 Ngừng hợp tác</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Địa chỉ</label>
                                    <textarea id="supplier-address" rows="2" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 font-medium" placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP.HCM"></textarea>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Ghi chú</label>
                                    <textarea id="supplier-note" rows="2" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 font-medium" placeholder="Nhập ghi chú hoặc mô tả về nhà cung cấp..."></textarea>
                                </div>
                                
                                <div class="pt-4 border-t flex justify-end gap-3 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                                    <button type="button" onclick="closeSupplierModal()" class="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold shadow-sm transition">Hủy bỏ</button>
                                    <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition">Lưu nhà cung cấp</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal xem chi tiết nhà cung cấp -->
                <div id="supplier-detail-modal" class="modal fixed inset-0 bg-black/50 z-50 items-center justify-center p-4">
                    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
                        <div class="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                            <h3 class="text-2xl font-bold flex items-center gap-2">🏭 Chi tiết nhà cung cấp</h3>
                            <button onclick="closeSupplierDetailModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-6 space-y-6">
                            <!-- Hồ sơ nhà cung cấp -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                                <div class="md:col-span-2 space-y-4">
                                    <div>
                                        <h4 class="text-2xl font-black text-slate-800" id="detail-supplier-name">-</h4>
                                        <p class="text-sm font-semibold text-slate-500" id="detail-supplier-id">Mã đối tác: -</p>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                                        <div class="flex items-center gap-2 text-slate-700">
                                            <span class="text-lg">👤</span>
                                            <span><strong>Người liên hệ:</strong> <span id="detail-supplier-contact">-</span></span>
                                        </div>
                                        <div class="flex items-center gap-2 text-slate-700">
                                            <span class="text-lg">📞</span>
                                            <span><strong>Điện thoại:</strong> <span id="detail-supplier-phone">-</span></span>
                                        </div>
                                        <div class="flex items-center gap-2 text-slate-700 sm:col-span-2">
                                            <span class="text-lg">✉️</span>
                                            <span><strong>Email:</strong> <span id="detail-supplier-email">-</span></span>
                                        </div>
                                        <div class="flex items-center gap-2 text-slate-700 sm:col-span-2">
                                            <span class="text-lg">📍</span>
                                            <span><strong>Địa chỉ:</strong> <span id="detail-supplier-address">-</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div class="border-l md:pl-6 space-y-4 flex flex-col justify-between">
                                    <div class="space-y-2">
                                        <span class="text-xs font-black text-slate-400 block uppercase tracking-wider">Trạng thái hợp tác</span>
                                        <div id="detail-supplier-status" class="inline-block">-</div>
                                    </div>
                                    <div class="space-y-2">
                                        <span class="text-xs font-black text-slate-400 block uppercase tracking-wider">Ghi chú đối tác</span>
                                        <p class="text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200/50" id="detail-supplier-note">-</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Lịch sử nhập hàng -->
                            <div class="space-y-4">
                                <h4 class="text-xl font-bold text-slate-800 flex items-center gap-2">📦 Lịch sử 10 lần nhập hàng gần đây</h4>
                                <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                                    <table class="w-full text-left text-sm text-slate-600">
                                        <thead class="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th class="px-5 py-3 font-bold text-slate-700">Mã phiếu nhập</th>
                                                <th class="px-5 py-3 font-bold text-slate-700">Ngày nhập</th>
                                                <th class="px-5 py-3 text-right font-bold text-slate-700">Tổng số lượng</th>
                                                <th class="px-5 py-3 text-right font-bold text-slate-700">Tổng giá trị</th>
                                                <th class="px-5 py-3 text-center font-bold text-slate-700">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody id="detail-supplier-receivings-body" class="divide-y divide-slate-100 bg-white">
                                            <tr>
                                                <td colspan="5" class="text-center py-6 text-slate-400 font-medium">Không có lịch sử nhập hàng nào.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                `;

        htmlContent = htmlContent.substring(0, htmlAnchorIdx) + newHtmlBlock + htmlContent.substring(htmlAnchorIdx);
        fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        console.log('✅ admin.html updated successfully with supplier panels!');
    } else {
        console.error('❌ Could not find modal anchor in admin.html!');
    }
} else {
    console.error(`❌ HTML file does not exist: ${htmlPath}`);
}

// ============================================================================
// 3. EXTEND FRONTEND CONTROLLER (frontend/admin/js/admin.js)
// ============================================================================
if (fs.existsSync(jsPath)) {
    console.log(`Reading JS: ${jsPath}`);
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // Section 3a: Add titles & subtitles mapping in showSection
    const searchTitleKey = "inventory: '📋 Kiểm kê sản phẩm',";
    const replacementTitleKey = "inventory: '📋 Kiểm kê sản phẩm',\n                suppliers: '🏭 Quản lý nhà cung cấp',";
    if (jsContent.includes(searchTitleKey)) {
        jsContent = jsContent.replace(searchTitleKey, replacementTitleKey);
        console.log('✅ Added "suppliers" title inside showSection.');
    }

    const searchSubtitleKey = "inventory: 'Quy trình đối chiếu hệ thống - thực tế & cân bằng tồn kho tự động',";
    const replacementSubtitleKey = "inventory: 'Quy trình đối chiếu hệ thống - thực tế & cân bằng tồn kho tự động',\n                suppliers: 'Theo dõi thông tin liên hệ, nguồn hàng và trạng thái hợp tác của nhà cung cấp',";
    if (jsContent.includes(searchSubtitleKey)) {
        jsContent = jsContent.replace(searchSubtitleKey, replacementSubtitleKey);
        console.log('✅ Added "suppliers" subtitle inside showSection.');
    }

    // Section 3b: Add actualSection check loader inside showSection
    const searchLoaderKey = "else if (actualSection === 'categories') loadCategories();";
    const replacementLoaderKey = "else if (actualSection === 'categories') loadCategories();\n            else if (actualSection === 'suppliers') loadAdminSuppliers();";
    if (jsContent.includes(searchLoaderKey)) {
        jsContent = jsContent.replace(searchLoaderKey, replacementLoaderKey);
        console.log('✅ Added actualSection supplier loader in showSection.');
    }

    // Section 3c: Append supplier state controllers to the end of the file
    // Locate the very end of the main script or file
    const supplierJsBlock = `
        // ============================================================================
        // MODULE: QUẢN LÝ NHÀ CUNG CẤP CONTROLLER (SUPPLIERS)
        // ============================================================================
        let activeSupplierStatusFilter = '';
        let allSuppliersListData = [];

        async function loadAdminSuppliers() {
            try {
                const tbody = document.getElementById('suppliers-table-body');
                if (!tbody) return;

                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-400 font-medium">⏳ Đang tải danh sách đối tác nhà cung cấp...</td></tr>';

                const search = document.getElementById('supplier-search-input')?.value || '';
                const status = document.getElementById('supplier-status-filter')?.value || activeSupplierStatusFilter;

                // Call backend CRUD list route
                const result = await apiCall(\`/admin/suppliers/list?search=\${encodeURIComponent(search)}&status=\${encodeURIComponent(status)}\`);
                
                if (result.success && result.data) {
                    allSuppliersListData = result.data;

                    // Update summary statistics
                    const totalCount = allSuppliersListData.length;
                    const activeCount = allSuppliersListData.filter(s => s.trang_thai === 'hoat_dong').length;
                    const inactiveCount = allSuppliersListData.filter(s => s.trang_thai === 'ngung_hoat_dong').length;
                    
                    // New in current month
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const newCount = allSuppliersListData.filter(s => {
                        const date = new Date(s.ngay_tao);
                        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                    }).length;

                    document.getElementById('stat-total-suppliers').textContent = totalCount;
                    document.getElementById('stat-active-suppliers').textContent = activeCount;
                    document.getElementById('stat-inactive-suppliers').textContent = inactiveCount;
                    document.getElementById('stat-new-suppliers').textContent = newCount;

                    if (allSuppliersListData.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500 font-medium">📋 Không tìm thấy nhà cung cấp nào.</td></tr>';
                        return;
                    }

                    tbody.innerHTML = allSuppliersListData.map(s => {
                        let statusBadge = '';
                        if (s.trang_thai === 'hoat_dong') {
                            statusBadge = '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-black shadow-sm whitespace-nowrap">🟢 Đang hoạt động</span>';
                        } else {
                            statusBadge = '<span class="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 px-3 py-1.5 rounded-full text-xs font-black shadow-sm whitespace-nowrap">🔴 Ngừng hợp tác</span>';
                        }

                        const sdt = s.so_dien_thoai || 'Chưa có';
                        const email = s.email || 'Chưa có';
                        const contact = s.nguoi_lien_he || 'N/A';
                        const address = s.dia_chi || 'Chưa có';
                        const truncatedAddress = address.length > 30 ? address.slice(0, 30) + '...' : address;

                        return \`
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">NCC\${String(s.ma_nha_cung_cap).padStart(4, '0')}</td>
                                <td class="px-6 py-4 border-b font-black text-slate-800 whitespace-nowrap">\${s.ten_nha_cung_cap}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">👤 \${contact}</td>
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-600 whitespace-nowrap">\${sdt}</td>
                                <td class="px-6 py-4 border-b font-mono text-slate-500 whitespace-nowrap">\${email}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap" title="\${address}">\${truncatedAddress}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">\${statusBadge}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1.5">
                                        <button onclick="openSupplierDetail(\${s.ma_nha_cung_cap})" class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">👁️ Chi tiết</button>
                                        <button onclick="openSupplierModal(\${s.ma_nha_cung_cap})" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">✏️ Sửa</button>
                                        <button onclick="deleteSupplier(\${s.ma_nha_cung_cap})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa đối tác">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-red-500 font-medium">⚠️ Lỗi: Không thể tải danh sách nhà cung cấp từ API.</td></tr>';
                }
            } catch (err) {
                console.error('loadAdminSuppliers error:', err);
            }
        }

        function applySupplierFilters() {
            loadAdminSuppliers();
        }

        function resetSupplierFilters() {
            const search = document.getElementById('supplier-search-input');
            const status = document.getElementById('supplier-status-filter');
            if (search) search.value = '';
            if (status) status.value = '';
            activeSupplierStatusFilter = '';
            loadAdminSuppliers();
        }

        function filterSupplierByStatus(status) {
            const filterSelect = document.getElementById('supplier-status-filter');
            if (filterSelect) filterSelect.value = status;
            activeSupplierStatusFilter = status;
            loadAdminSuppliers();
        }

        async function openSupplierModal(id = null) {
            const modal = document.getElementById('supplier-modal');
            const form = document.getElementById('supplier-form');
            const title = document.getElementById('supplier-modal-title');
            
            if (!modal || !form || !title) return;
            form.reset();
            document.getElementById('supplier-id').value = '';

            if (id) {
                title.textContent = '✏️ Chỉnh sửa nhà cung cấp';
                try {
                    const result = await apiCall(\`/admin/suppliers/\${id}\`);
                    if (result.success && result.data && result.data.supplier) {
                        const s = result.data.supplier;
                        document.getElementById('supplier-id').value = s.ma_nha_cung_cap;
                        document.getElementById('supplier-name').value = s.ten_nha_cung_cap;
                        document.getElementById('supplier-contact').value = s.nguoi_lien_he || '';
                        document.getElementById('supplier-phone').value = s.so_dien_thoai || '';
                        document.getElementById('supplier-email').value = s.email || '';
                        document.getElementById('supplier-status').value = s.trang_thai;
                        document.getElementById('supplier-address').value = s.dia_chi || '';
                        document.getElementById('supplier-note').value = s.ghi_chu || '';
                    } else {
                        showNotification('Không tìm thấy thông tin đối tác', 'error');
                        return;
                    }
                } catch (e) {
                    console.error('Fetch supplier error:', e);
                    showNotification('Lỗi khi tải thông tin đối tác', 'error');
                    return;
                }
            } else {
                title.textContent = '🏭 Thêm nhà cung cấp mới';
            }

            modal.classList.add('active');
        }

        function closeSupplierModal() {
            const modal = document.getElementById('supplier-modal');
            if (modal) modal.classList.remove('active');
        }

        async function saveSupplier(event) {
            event.preventDefault();
            const id = document.getElementById('supplier-id').value;
            
            const payload = {
                ten_nha_cung_cap: document.getElementById('supplier-name').value.trim(),
                nguoi_lien_he: document.getElementById('supplier-contact').value.trim(),
                so_dien_thoai: document.getElementById('supplier-phone').value.trim(),
                email: document.getElementById('supplier-email').value.trim(),
                trang_thai: document.getElementById('supplier-status').value,
                dia_chi: document.getElementById('supplier-address').value.trim(),
                ghi_chu: document.getElementById('supplier-note').value.trim()
            };

            if (!payload.ten_nha_cung_cap || !payload.so_dien_thoai || !payload.email) {
                showNotification('Vui lòng nhập đầy đủ các trường bắt buộc (*)', 'error');
                return;
            }

            try {
                const method = id ? 'PUT' : 'POST';
                const url = id ? \`/admin/suppliers/\${id}\` : '/admin/suppliers';
                const result = await apiCall(url, method, payload);

                if (result.success) {
                    showNotification(id ? 'Cập nhật đối tác thành công!' : 'Thêm nhà cung cấp thành công!', 'success');
                    closeSupplierModal();
                    loadAdminSuppliers();
                } else {
                    showNotification(result.message || 'Lỗi lưu thông tin', 'error');
                }
            } catch (e) {
                console.error('Save supplier error:', e);
                showNotification('Lỗi hệ thống khi lưu nhà cung cấp', 'error');
            }
        }

        async function deleteSupplier(id) {
            if (!confirm('Bạn có chắc chắn muốn xóa đối tác nhà cung cấp này?')) return;
            try {
                const result = await apiCall(\`/admin/suppliers/\${id}\`, 'DELETE');
                if (result.success) {
                    showNotification(result.message || 'Xóa nhà cung cấp thành công!', 'success');
                    loadAdminSuppliers();
                } else {
                    showNotification(result.message || 'Lỗi khi xóa đối tác', 'error');
                }
            } catch (e) {
                console.error('Delete supplier error:', e);
                showNotification('Lỗi kết nối khi xóa đối tác', 'error');
            }
        }

        async function openSupplierDetail(id) {
            const modal = document.getElementById('supplier-detail-modal');
            if (!modal) return;

            try {
                const result = await apiCall(\`/admin/suppliers/\${id}\`);
                if (result.success && result.data) {
                    const s = result.data.supplier;
                    const receivings = result.data.recent_receivings || [];

                    document.getElementById('detail-supplier-name').textContent = s.ten_nha_cung_cap;
                    document.getElementById('detail-supplier-id').textContent = \`Mã đối tác: NCC\${String(s.ma_nha_cung_cap).padStart(4, '0')}\`;
                    document.getElementById('detail-supplier-contact').textContent = s.nguoi_lien_he || 'Chưa cập nhật';
                    document.getElementById('detail-supplier-phone').textContent = s.so_dien_thoai || 'Chưa cập nhật';
                    document.getElementById('detail-supplier-email').textContent = s.email || 'Chưa cập nhật';
                    document.getElementById('detail-supplier-address').textContent = s.dia_chi || 'Chưa cập nhật';
                    document.getElementById('detail-supplier-note').textContent = s.ghi_chu || 'Không có ghi chú đặc biệt.';

                    const statusContainer = document.getElementById('detail-supplier-status');
                    if (s.trang_thai === 'hoat_dong') {
                        statusContainer.innerHTML = '<span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black shadow-sm">🟢 Đang hoạt động</span>';
                    } else {
                        statusContainer.innerHTML = '<span class="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black shadow-sm">🔴 Ngừng hợp tác</span>';
                    }

                    const recBody = document.getElementById('detail-supplier-receivings-body');
                    if (receivings.length === 0) {
                        recBody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400 font-medium">Không có lịch sử nhập hàng nào.</td></tr>';
                    } else {
                        recBody.innerHTML = receivings.map(r => {
                            let rStatus = '';
                            if (r.trang_thai === 'da_nhap') {
                                rStatus = '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black border border-emerald-200">✅ Đã nhập kho</span>';
                            } else if (r.trang_thai === 'cho_duyet') {
                                rStatus = '<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black border border-amber-200">⏳ Chờ duyệt</span>';
                            } else {
                                rStatus = '<span class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold border border-gray-200">Nháp</span>';
                            }

                            const rDate = r.ngay_nhap ? new Date(r.ngay_nhap).toLocaleDateString('vi-VN') : 'N/A';
                            const rCode = \`PNH\${String(r.ma_phieu_nhap).padStart(4, '0')}\`;

                            return \`
                                <tr class="hover:bg-slate-50/50">
                                    <td class="px-5 py-3 font-mono font-bold text-slate-700">\${rCode}</td>
                                    <td class="px-5 py-3 text-slate-600">\${rDate}</td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-800">\${r.tong_so_luong} Sp</td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-800">\${formatPrice(r.tong_gia_tri)}</td>
                                    <td class="px-5 py-3 text-center">\${rStatus}</td>
                                </tr>
                            \`;
                        }).join('');
                    }

                    modal.classList.add('active');
                } else {
                    showNotification('Không thể tải chi tiết nhà cung cấp', 'error');
                }
            } catch (e) {
                console.error('Fetch supplier details error:', e);
                showNotification('Lỗi kết nối khi tải chi tiết đối tác', 'error');
            }
        }

        function closeSupplierDetailModal() {
            const modal = document.getElementById('supplier-detail-modal');
            if (modal) modal.classList.remove('active');
        }
`;

    // Append our module functions to the end of the admin.js
    jsContent += supplierJsBlock;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('✅ admin.js extended successfully with supplier modules!');
} else {
    console.error(`❌ JS file does not exist: ${jsPath}`);
}

console.log('✨ Supplier Management module successfully integrated into the platform!');
