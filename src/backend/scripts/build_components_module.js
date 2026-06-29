const fs = require('fs');
const path = require('path');

// Target file paths (resolved relative to workspace root)
const htmlPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'pages', 'admin.html');
const jsPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'js', 'admin.js');
const routesPath = path.resolve(__dirname, '..', '..', 'backend', 'routes', 'admin.js');

console.log('🚀 Starting Components/Spare Parts Management premium module build...');

// ============================================================================
// 1. EXTEND BACKEND API ROUTES (backend/routes/admin.js)
// ============================================================================
if (fs.existsSync(routesPath)) {
    console.log(`Reading Backend Routes: ${routesPath}`);
    let routesContent = fs.readFileSync(routesPath, 'utf8');

    // Locate insertion anchor (right before QUẢN LÝ THƯƠNG HIỆU)
    const targetAnchor = '// ==========================================';
    const firstSplit = routesContent.split(targetAnchor);
    
    // Let's find the specific block: "// QUẢN LÝ THƯƠNG HIỆU"
    let anchorIdx = routesContent.indexOf('// QUẢN LÝ THƯƠNG HIỆU (BRANDS)');
    if (anchorIdx === -1) {
        // Fallback to searching for brands
        anchorIdx = routesContent.indexOf("/brands");
    }

    if (anchorIdx !== -1) {
        console.log('✅ Found anchor in backend! Injecting Component CRUD routes...');
        
        const newCrudRoutes = `// ==========================================
// QUẢN LÝ LINH KIỆN CRUD (COMPONENTS)
// ==========================================

// Lấy danh sách linh kiện (với bộ lọc & tìm kiếm)
router.get('/components/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, category, status, supplier } = req.query;
        let query = \`
            SELECT lk.*, ncc.ten_nha_cung_cap
            FROM linh_kien lk
            LEFT JOIN nha_cung_cap ncc ON lk.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE 1=1
        \`;
        const params = [];

        if (search) {
            query += ' AND (lk.ten_linh_kien LIKE ? OR lk.tuong_thich LIKE ?)';
            const keyword = \`%\${search}%\`;
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

        const [result] = await db.query(\`
            INSERT INTO linh_kien (ten_linh_kien, loai_linh_kien, tuong_thich, ma_nha_cung_cap, gia_nhap, gia_ban, so_luong_ton, vi_tri_kho, trang_thai, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`, [
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

        await db.query(\`
            UPDATE linh_kien
            SET ten_linh_kien = ?, loai_linh_kien = ?, tuong_thich = ?, ma_nha_cung_cap = ?, gia_nhap = ?, gia_ban = ?, so_luong_ton = ?, vi_tri_kho = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_linh_kien = ?
        \`, [
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

`;

        routesContent = routesContent.substring(0, anchorIdx) + newCrudRoutes + routesContent.substring(anchorIdx);
        fs.writeFileSync(routesPath, routesContent, 'utf8');
        console.log('✅ backend/routes/admin.js extended successfully with component CRUD!');
    } else {
        console.error('❌ Could not find brand anchor in backend routes! Skipping routes edit.');
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
        console.log('✅ Found modal anchor in admin.html! Injecting components panel and modals...');
        
        const newHtmlBlock = `<!-- Components Section - Quản lý linh kiện -->
                <section id="section-components" class="content-section">
                    <!-- Thống kê tổng quan - Premium 3D Metallic Glass Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <!-- Card 1: Tổng linh kiện -->
                        <div class="card-3d-blue cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterComponentByCategory('')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🔧</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Tổng mặt hàng</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-total-components">0</p>
                            <p class="text-[13px] text-blue-100/90 font-medium">Mã linh kiện trong kho</p>
                        </div>
                        
                        <!-- Card 2: Sẵn hàng -->
                        <div class="card-3d-green cursor-pointer transition-all hover:scale-105 active:scale-95">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🟢</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Sẵn hàng</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-active-components">0</p>
                            <p class="text-[13px] text-green-100/90 font-medium">Linh kiện còn trong kho</p>
                        </div>
                        
                        <!-- Card 3: Sắp hết/Hết hàng -->
                        <div class="card-3d-red cursor-pointer transition-all hover:scale-105 active:scale-95">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🔴</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Cảnh báo</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-warning-components">0</p>
                            <p class="text-[13px] text-red-100/90 font-medium">Mặt hàng hết hoặc sắp hết (&le;2)</p>
                        </div>
                        
                        <!-- Card 4: Giá trị tồn kho -->
                        <div class="card-3d-purple cursor-pointer transition-all hover:scale-105 active:scale-95">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">💰</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10 font-mono">Tồn kho</span>
                            </div>
                            <p class="text-2xl font-black mb-1" id="stat-value-components">0đ</p>
                            <p class="text-[13px] text-purple-100/90 font-medium">Tổng giá trị vốn lưu kho</p>
                        </div>
                    </div>

                    <!-- Filters và Actions - Sleek Matte Clay 3D styling -->
                    <div class="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-6">
                        <div class="flex flex-wrap gap-4 items-center justify-between">
                            <div class="flex flex-wrap gap-3 flex-1">
                                <div class="relative flex-1 min-w-[240px]">
                                    <input type="text" id="component-search-input" class="w-full pl-4 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-medium text-sm shadow-sm transition-all" placeholder="🔍 Tìm tên, dòng máy tương thích..." oninput="applyComponentFilters()">
                                </div>

                                <div class="relative min-w-[160px]">
                                    <select id="component-category-filter" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" onchange="applyComponentFilters()">
                                        <option value="">🔧 Tất cả loại</option>
                                        <option value="Màn hình">📱 Màn hình</option>
                                        <option value="Pin">🔋 Pin</option>
                                        <option value="Camera">📸 Camera</option>
                                        <option value="SSD/RAM">💾 SSD/RAM</option>
                                        <option value="Linh kiện khác">🛠️ Linh kiện khác</option>
                                    </select>
                                </div>

                                <div class="relative min-w-[160px]">
                                    <select id="component-status-filter" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" onchange="applyComponentFilters()">
                                        <option value="">📋 Tất cả trạng thái</option>
                                        <option value="con_hang">🟢 Còn hàng</option>
                                        <option value="het_hang">🔴 Hết hàng</option>
                                        <option value="ngung_su_dung">🚫 Ngừng sử dụng</option>
                                    </select>
                                </div>

                                <div class="relative min-w-[180px]">
                                    <select id="component-supplier-filter" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" onchange="applyComponentFilters()">
                                        <option value="">🏭 Tất cả nhà cung cấp</option>
                                    </select>
                                </div>
                                
                                <button onclick="resetComponentFilters()" class="btn-3d-secondary text-slate-500 font-semibold px-6 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                                    🔄 Reset
                                </button>
                            </div>
                            
                            <button onclick="openComponentModal()" class="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl border border-emerald-750 border-b-4 hover:border-b-2 hover:translate-y-[1px] active:translate-y-[3px] active:border-b-0 shadow-lg hover:shadow-xl transition-all whitespace-nowrap">
                                ➕ Thêm linh kiện
                            </button>
                        </div>
                    </div>

                    <!-- Danh sách linh kiện - Non-wrapping Scrollable Premium 3D Table -->
                    <div class="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200/80">
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[1100px] border-collapse text-left text-sm text-slate-600">
                                <thead class="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Mã LK</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Tên linh kiện</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Loại linh kiện</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Dòng máy tương thích</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Nhà cung cấp</th>
                                        <th class="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">Giá nhập</th>
                                        <th class="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">Giá bán/thay</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Tồn kho</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Vị trí kho</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody id="components-table-body" class="divide-y divide-slate-100 bg-white">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Modal thêm/sửa linh kiện -->
                <div id="component-modal" class="modal fixed inset-0 bg-black/50 z-50 items-center justify-center p-4">
                    <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in">
                        <div class="p-6 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
                            <h3 id="component-modal-title" class="text-2xl font-bold">🔧 Thêm linh kiện mới</h3>
                            <button onclick="closeComponentModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-6">
                            <form id="component-form" onsubmit="saveComponent(event)" class="space-y-5">
                                <input type="hidden" id="component-id">
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Tên linh kiện *</label>
                                    <input type="text" id="component-name" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-semibold text-slate-800" placeholder="Ví dụ: Màn hình Super Retina XDR OLED iPhone 15">
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Loại linh kiện *</label>
                                        <select id="component-category" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-slate-700 bg-white">
                                            <option value="Màn hình">📱 Màn hình</option>
                                            <option value="Pin">🔋 Pin</option>
                                            <option value="Camera">📸 Camera</option>
                                            <option value="SSD/RAM">💾 SSD/RAM</option>
                                            <option value="Linh kiện khác">🛠️ Linh kiện khác</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Dòng máy tương thích *</label>
                                        <input type="text" id="component-compatibility" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-semibold text-slate-700" placeholder="Ví dụ: iPhone 15 Pro Max">
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Nhà cung cấp *</label>
                                        <select id="component-supplier" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-slate-700 bg-white">
                                            <!-- Dynamically populated -->
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Trạng thái tồn kho</label>
                                        <select id="component-status" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-bold text-slate-700 bg-white">
                                            <option value="con_hang">🟢 Còn hàng</option>
                                            <option value="het_hang">🔴 Hết hàng</option>
                                            <option value="ngung_su_dung">🚫 Ngừng sử dụng</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Giá nhập *</label>
                                        <input type="number" id="component-price-in" required min="0" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-mono font-bold text-slate-700" placeholder="đ">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Giá bán/thay thế *</label>
                                        <input type="number" id="component-price-out" required min="0" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-mono font-bold text-slate-700" placeholder="đ">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Số lượng nhập *</label>
                                        <input type="number" id="component-quantity" required min="0" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none font-mono font-bold text-slate-700" placeholder="Số lượng">
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Vị trí kho kệ</label>
                                    <input type="text" id="component-location" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 font-medium" placeholder="Ví dụ: Kệ A - Ngăn 3">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Mô tả / Ghi chú</label>
                                    <textarea id="component-note" rows="2" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-700 font-medium" placeholder="Thông số kỹ thuật hoặc ghi chú..."></textarea>
                                </div>
                                
                                <div class="pt-4 border-t flex justify-end gap-3 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                                    <button type="button" onclick="closeComponentModal()" class="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold shadow-sm transition">Hủy bỏ</button>
                                    <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition">Lưu linh kiện</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                `;

        htmlContent = htmlContent.substring(0, htmlAnchorIdx) + newHtmlBlock + htmlContent.substring(htmlAnchorIdx);
        fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        console.log('✅ admin.html updated successfully with components panels!');
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
    const searchTitleKey = "suppliers: '🏭 Quản lý nhà cung cấp',";
    const replacementTitleKey = "suppliers: '🏭 Quản lý nhà cung cấp',\n                components: '🔧 Quản lý linh kiện',";
    if (jsContent.includes(searchTitleKey)) {
        jsContent = jsContent.replace(searchTitleKey, replacementTitleKey);
        console.log('✅ Added "components" title inside showSection.');
    }

    const searchSubtitleKey = "suppliers: 'Theo dõi thông tin liên hệ, nguồn hàng và trạng thái hợp tác của nhà cung cấp',";
    const replacementSubtitleKey = "suppliers: 'Theo dõi thông tin liên hệ, nguồn hàng và trạng thái hợp tác của nhà cung cấp',\n                components: 'Quản lý kho linh kiện thay thế, giá nhập bán, vị trí kệ và tương thích thiết bị',";
    if (jsContent.includes(searchSubtitleKey)) {
        jsContent = jsContent.replace(searchSubtitleKey, replacementSubtitleKey);
        console.log('✅ Added "components" subtitle inside showSection.');
    }

    // Section 3b: Add actualSection check loader inside showSection
    const searchLoaderKey = "else if (actualSection === 'suppliers') loadAdminSuppliers();";
    const replacementLoaderKey = "else if (actualSection === 'suppliers') loadAdminSuppliers();\n            else if (actualSection === 'components') loadAdminComponents();";
    if (jsContent.includes(searchLoaderKey)) {
        jsContent = jsContent.replace(searchLoaderKey, replacementLoaderKey);
        console.log('✅ Added actualSection component loader in showSection.');
    }

    // Section 3c: Append components state controllers to the end of the file
    const componentJsBlock = `
        // ============================================================================
        // MODULE: QUẢN LÝ LINH KIỆN CONTROLLER (COMPONENTS)
        // ============================================================================
        let activeComponentCategoryFilter = '';
        let activeComponentStatusFilter = '';
        let allComponentsListData = [];

        async function loadAdminComponents() {
            try {
                const tbody = document.getElementById('components-table-body');
                if (!tbody) return;

                tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6 text-slate-400 font-medium">⏳ Đang tải danh sách linh kiện phụ tùng...</td></tr>';

                const search = document.getElementById('component-search-input')?.value || '';
                const category = document.getElementById('component-category-filter')?.value || activeComponentCategoryFilter;
                const status = document.getElementById('component-status-filter')?.value || activeComponentStatusFilter;
                const supplier = document.getElementById('component-supplier-filter')?.value || '';

                // Load suppliers filter dynamically first if not already populated
                await populateComponentSupplierFilters();

                // Call backend CRUD list route
                const result = await apiCall(\`/admin/components/list?search=\${encodeURIComponent(search)}&category=\${encodeURIComponent(category)}&status=\${encodeURIComponent(status)}&supplier=\${encodeURIComponent(supplier)}\`);
                
                if (result.success && result.data) {
                    allComponentsListData = result.data;

                    // Update summary statistics
                    const totalCount = allComponentsListData.length;
                    const activeCount = allComponentsListData.filter(s => s.so_luong_ton > 0 && s.trang_thai === 'con_hang').length;
                    const warningCount = allComponentsListData.filter(s => s.so_luong_ton <= 2 || s.trang_thai === 'het_hang').length;
                    
                    // Total asset value
                    const totalValue = allComponentsListData.reduce((sum, item) => sum + (parseFloat(item.gia_nhap) * parseInt(item.so_luong_ton || 0)), 0);

                    document.getElementById('stat-total-components').textContent = totalCount;
                    document.getElementById('stat-active-components').textContent = activeCount;
                    document.getElementById('stat-warning-components').textContent = warningCount;
                    document.getElementById('stat-value-components').textContent = formatPrice(totalValue);

                    if (allComponentsListData.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-500 font-medium">📋 Không tìm thấy linh kiện nào trong kho.</td></tr>';
                        return;
                    }

                    tbody.innerHTML = allComponentsListData.map(s => {
                        let catBadge = '';
                        if (s.loai_linh_kien === 'Màn hình') {
                            catBadge = '<span class="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full font-bold text-xs">📱 Màn hình</span>';
                        } else if (s.loai_linh_kien === 'Pin') {
                            catBadge = '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs">🔋 Pin</span>';
                        } else if (s.loai_linh_kien === 'Camera') {
                            catBadge = '<span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full font-bold text-xs">📸 Camera</span>';
                        } else if (s.loai_linh_kien === 'SSD/RAM') {
                            catBadge = '<span class="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-xs">💾 SSD/RAM</span>';
                        } else {
                            catBadge = '<span class="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full font-bold text-xs">🛠️ Phụ tùng khác</span>';
                        }

                        let qtyBadge = '';
                        if (s.so_luong_ton === 0 || s.trang_thai === 'het_hang') {
                            qtyBadge = '<span class="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">🔴 Hết hàng</span>';
                        } else if (s.so_luong_ton <= 2) {
                            qtyBadge = \`<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">🟡 Cháy hàng (\${s.so_luong_ton})</span>\`;
                        } else {
                            qtyBadge = \`<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">🟢 Còn (\${s.so_luong_ton})</span>\`;
                        }

                        const ncc = s.ten_nha_cung_cap || 'Chưa cập nhật';
                        const location = s.vi_tri_kho || 'N/A';
                        const code = \`LK\${String(s.ma_linh_kien).padStart(4, '0')}\`;

                        return \`
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">\${code}</td>
                                <td class="px-6 py-4 border-b font-black text-slate-800 whitespace-nowrap">\${s.ten_linh_kien}</td>
                                <td class="px-6 py-4 border-b whitespace-nowrap">\${catBadge}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">\${s.tuong_thich}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap">🏭 \${ncc}</td>
                                <td class="px-6 py-4 border-b text-right font-mono font-bold text-slate-700 whitespace-nowrap">\${formatPrice(s.gia_nhap)}</td>
                                <td class="px-6 py-4 border-b text-right font-mono font-black text-green-600 whitespace-nowrap">\${formatPrice(s.gia_ban)}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">\${qtyBadge}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-500 whitespace-nowrap">📍 \${location}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1.5">
                                        <button onclick="openComponentModal(\${s.ma_linh_kien})" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm">✏️ Sửa</button>
                                        <button onclick="deleteComponent(\${s.ma_linh_kien})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa linh kiện">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6 text-red-500 font-medium">⚠️ Lỗi: Không thể tải danh sách linh kiện từ API.</td></tr>';
                }
            } catch (err) {
                console.error('loadAdminComponents error:', err);
            }
        }

        async function populateComponentSupplierFilters() {
            const filter = document.getElementById('component-supplier-filter');
            if (!filter || filter.options.length > 1) return; // Already populated

            try {
                const result = await apiCall('/admin/suppliers');
                if (result.success && result.data) {
                    result.data.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.ma_nha_cung_cap;
                        opt.textContent = \`🏭 \${s.ten_nha_cung_cap}\`;
                        filter.appendChild(opt);
                    });
                }
            } catch (e) {
                console.error('Populate supplier filters error:', e);
            }
        }

        function applyComponentFilters() {
            loadAdminComponents();
        }

        function resetComponentFilters() {
            const search = document.getElementById('component-search-input');
            const category = document.getElementById('component-category-filter');
            const status = document.getElementById('component-status-filter');
            const supplier = document.getElementById('component-supplier-filter');
            
            if (search) search.value = '';
            if (category) category.value = '';
            if (status) status.value = '';
            if (supplier) supplier.value = '';

            activeComponentCategoryFilter = '';
            activeComponentStatusFilter = '';
            loadAdminComponents();
        }

        function filterComponentByCategory(cat) {
            const filterSelect = document.getElementById('component-category-filter');
            if (filterSelect) filterSelect.value = cat;
            activeComponentCategoryFilter = cat;
            loadAdminComponents();
        }

        async function openComponentModal(id = null) {
            const modal = document.getElementById('component-modal');
            const form = document.getElementById('component-form');
            const title = document.getElementById('component-modal-title');
            
            if (!modal || !form || !title) return;
            form.reset();
            document.getElementById('component-id').value = '';

            // Populate suppliers dynamic dropdown in the form
            const supplierSelect = document.getElementById('component-supplier');
            if (supplierSelect) {
                supplierSelect.innerHTML = '<option value="">Chọn nhà cung cấp...</option>';
                try {
                    const res = await apiCall('/admin/suppliers');
                    if (res.success && res.data) {
                        res.data.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.ma_nha_cung_cap;
                            opt.textContent = s.ten_nha_cung_cap;
                            supplierSelect.appendChild(opt);
                        });
                    }
                } catch (e) {
                    console.error('Load suppliers in form error:', e);
                }
            }

            if (id) {
                title.textContent = '✏️ Chỉnh sửa linh kiện';
                try {
                    const result = await apiCall(\`/admin/components/\${id}\`);
                    if (result.success && result.data) {
                        const s = result.data;
                        document.getElementById('component-id').value = s.ma_linh_kien;
                        document.getElementById('component-name').value = s.ten_linh_kien;
                        document.getElementById('component-category').value = s.loai_linh_kien;
                        document.getElementById('component-compatibility').value = s.tuong_thich;
                        document.getElementById('component-supplier').value = s.ma_nha_cung_cap || '';
                        document.getElementById('component-status').value = s.trang_thai;
                        document.getElementById('component-price-in').value = Math.round(s.gia_nhap);
                        document.getElementById('component-price-out').value = Math.round(s.gia_ban);
                        document.getElementById('component-quantity').value = s.so_luong_ton;
                        document.getElementById('component-location').value = s.vi_tri_kho || '';
                        document.getElementById('component-note').value = s.ghi_chu || '';
                    } else {
                        showNotification('Không tìm thấy thông tin linh kiện', 'error');
                        return;
                    }
                } catch (e) {
                    console.error('Fetch component error:', e);
                    showNotification('Lỗi khi tải thông tin linh kiện', 'error');
                    return;
                }
            } else {
                title.textContent = '🔧 Thêm linh kiện mới';
            }

            modal.classList.add('active');
        }

        function closeComponentModal() {
            const modal = document.getElementById('component-modal');
            if (modal) modal.classList.remove('active');
        }

        async function saveComponent(event) {
            event.preventDefault();
            const id = document.getElementById('component-id').value;
            
            const payload = {
                ten_linh_kien: document.getElementById('component-name').value.trim(),
                loai_linh_kien: document.getElementById('component-category').value,
                tuong_thich: document.getElementById('component-compatibility').value.trim(),
                ma_nha_cung_cap: document.getElementById('component-supplier').value || null,
                trang_thai: document.getElementById('component-status').value,
                gia_nhap: parseFloat(document.getElementById('component-price-in').value || 0),
                gia_ban: parseFloat(document.getElementById('component-price-out').value || 0),
                so_luong_ton: parseInt(document.getElementById('component-quantity').value || 0),
                vi_tri_kho: document.getElementById('component-location').value.trim(),
                ghi_chu: document.getElementById('component-note').value.trim()
            };

            if (!payload.ten_linh_kien || !payload.loai_linh_kien || !payload.tuong_thich || !payload.ma_nha_cung_cap) {
                showNotification('Vui lòng nhập đầy đủ các trường bắt buộc (*)', 'error');
                return;
            }

            try {
                const method = id ? 'PUT' : 'POST';
                const url = id ? \`/admin/components/\${id}\` : '/admin/components';
                const result = await apiCall(url, method, payload);

                if (result.success) {
                    showNotification(id ? 'Cập nhật linh kiện thành công!' : 'Thêm linh kiện thành công!', 'success');
                    closeComponentModal();
                    loadAdminComponents();
                } else {
                    showNotification(result.message || 'Lỗi lưu linh kiện', 'error');
                }
            } catch (e) {
                console.error('Save component error:', e);
                showNotification('Lỗi hệ thống khi lưu linh kiện', 'error');
            }
        }

        async function deleteComponent(id) {
            if (!confirm('Bạn có chắc chắn muốn xóa linh kiện phụ tùng này?')) return;
            try {
                const result = await apiCall(\`/admin/components/\${id}\`, 'DELETE');
                if (result.success) {
                    showNotification('Xóa linh kiện thành công!', 'success');
                    loadAdminComponents();
                } else {
                    showNotification(result.message || 'Lỗi khi xóa linh kiện', 'error');
                }
            } catch (e) {
                console.error('Delete component error:', e);
                showNotification('Lỗi kết nối khi xóa linh kiện', 'error');
            }
        }
`;

    // Append our module functions to the end of the admin.js
    jsContent += componentJsBlock;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('✅ admin.js extended successfully with component modules!');
} else {
    console.error(`❌ JS file does not exist: ${jsPath}`);
}

console.log('✨ Components/Spare Parts Management module successfully integrated into the platform!');
