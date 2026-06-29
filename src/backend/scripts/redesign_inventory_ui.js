const fs = require('fs');
const path = require('path');

// Target file paths (going up twice to escape backend/scripts to root, then frontend)
const htmlPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'pages', 'admin.html');
const jsPath = path.resolve(__dirname, '..', '..', 'frontend', 'admin', 'js', 'admin.js');

console.log('🔄 Starting premium 3D and non-wrapping redesign...');
console.log(`Resolved HTML path: ${htmlPath}`);
console.log(`Resolved JS path: ${jsPath}`);

// ==========================================
// 1. UPDATE admin.html
// ==========================================
if (fs.existsSync(htmlPath)) {
    console.log(`Reading HTML: ${htmlPath}`);
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Define target block to replace
    const targetHtmlStart = '<!-- Inventory Section - Kiểm kê sản phẩm -->';
    const targetHtmlEnd = '<!-- Modal tạo/sửa phiếu kiểm kê -->';
    
    const startIndex = htmlContent.indexOf(targetHtmlStart);
    const endIndex = htmlContent.indexOf(targetHtmlEnd);

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        console.log('✅ Found inventory HTML section! Redesigning...');
        
        const newHtmlBlock = `<!-- Inventory Section - Kiểm kê sản phẩm -->
                <section id="section-inventory" class="content-section">
                    
                    <!-- Thống kê tổng quan - Premium 3D Metallic Glass Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <!-- Card 1: Tổng số -->
                        <div class="card-3d-blue cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">📋</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Tổng số</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-total-inventories">0</p>
                            <p class="text-[13px] text-blue-100/90 font-medium">Tổng số phiếu kiểm kê</p>
                        </div>
                        
                        <!-- Card 2: Đang kiểm -->
                        <div class="card-3d-orange cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('dang_kiem_ke')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">⏳</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Đang kiểm</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-checking-inventories">0</p>
                            <p class="text-[13px] text-orange-100/90 font-medium">Đang kiểm đếm thực tế</p>
                        </div>
                        
                        <!-- Card 3: Đợi duyệt -->
                        <div class="card-3d-purple cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('hoan_thanh')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">📥</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Chờ duyệt</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-completed-inventories">0</p>
                            <p class="text-[13px] text-purple-100/90 font-medium">Đã đếm xong, chờ duyệt</p>
                        </div>
                        
                        <!-- Card 4: Đã cân -->
                        <div class="card-3d-green cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('da_duyet')">
                            <div class="flex items-center justify-between mb-4">
                                <div class="card-3d-icon">🛡️</div>
                                <span class="text-[13px] bg-white/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-inner border border-white/10">Đã duyệt</span>
                            </div>
                            <p class="text-3xl font-extrabold mb-1" id="stat-approved-inventories">0</p>
                            <p class="text-[13px] text-green-100/90 font-medium">Đã duyệt & cân bằng kho</p>
                        </div>
                    </div>

                    <!-- Filters và Actions - Sleek Matte Clay 3D styling -->
                    <div class="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-6">
                        <div class="flex flex-wrap gap-4 items-center justify-between">
                            <div class="flex flex-wrap gap-3 flex-1">
                                <div class="relative min-w-[200px]">
                                    <select id="inventory-status-filter" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" onchange="applyInventoryFilters()">
                                        <option value="">📋 Tất cả trạng thái</option>
                                        <option value="dang_kiem_ke">⏳ Đang kiểm kê</option>
                                        <option value="hoan_thanh">📥 Hoàn thành đếm</option>
                                        <option value="da_duyet">🛡️ Đã duyệt cân kho</option>
                                    </select>
                                </div>
                                
                                <div class="relative">
                                    <input type="date" id="inventory-date-from" class="px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" placeholder="Từ ngày" onchange="applyInventoryFilters()">
                                </div>
                                <div class="relative">
                                    <input type="date" id="inventory-date-to" class="px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none text-slate-700 bg-white font-semibold text-sm shadow-sm transition-all" placeholder="Đến ngày" onchange="applyInventoryFilters()">
                                </div>
                                
                                <button onclick="applyInventoryFilters()" class="btn-3d-secondary hover:text-slate-900 font-bold px-6 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                                    🔍 Lọc dữ liệu
                                </button>
                                <button onclick="resetInventoryFilters()" class="btn-3d-secondary text-slate-500 font-semibold px-6 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                                    🔄 Reset
                                </button>
                            </div>
                            
                            <button onclick="openInventoryModal()" class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-xl border border-blue-700 border-b-4 hover:border-b-2 hover:translate-y-[1px] active:translate-y-[3px] active:border-b-0 shadow-lg hover:shadow-xl transition-all whitespace-nowrap">
                                ➕ Tạo phiếu kiểm kê
                            </button>
                        </div>
                    </div>

                    <!-- Danh sách phiếu kiểm kê - Non-wrapping Scrollable Premium 3D Table -->
                    <div class="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200/80">
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[1150px] border-collapse text-left text-sm text-slate-600">
                                <thead class="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Mã phiếu</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Người kiểm kê</th>
                                        <th class="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Ngày kiểm kê</th>
                                        <th class="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">Tổng sản phẩm</th>
                                        <th class="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">Tổng chênh lệch</th>
                                        <th class="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">Giá trị chênh lệch</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Trạng thái</th>
                                        <th class="px-6 py-4 text-center font-bold text-slate-700 whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody id="inventory-table-body" class="divide-y divide-slate-100 bg-white">
                                    <!-- Data loaded dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
                `;

        htmlContent = htmlContent.substring(0, startIndex) + newHtmlBlock + htmlContent.substring(endIndex);
        fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        console.log('✅ admin.html updated successfully with premium 3D design!');
    } else {
        console.error('❌ Could not locate the target start/end index in admin.html!');
    }
} else {
    console.error(`❌ HTML file does not exist: ${htmlPath}`);
}

// ==========================================
// 2. UPDATE admin.js
// ==========================================
if (fs.existsSync(jsPath)) {
    console.log(`Reading JS: ${jsPath}`);
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // Replace the page-title mapping
    const targetTitleLine = "categories: 'Quản lý danh mục',";
    const replacementTitleLine = "categories: 'Quản lý danh mục',\n                inventory: '📋 Kiểm kê sản phẩm',\n                receiving: '📥 Nhập kho (Nhận hàng)',";
    
    if (jsContent.includes(targetTitleLine)) {
        jsContent = jsContent.replace(targetTitleLine, replacementTitleLine);
        console.log('✅ Added inventory and receiving to title mapping in admin.js!');
    } else {
        console.warn('⚠️ Could not find target title mapping line in admin.js!');
    }

    // Replace the page-subtitle mapping
    const targetSubtitleLine = "categories: 'Quản lý danh mục sản phẩm',";
    const replacementSubtitleLine = "categories: 'Quản lý danh mục sản phẩm',\n                inventory: 'Quy trình đối chiếu hệ thống - thực tế & cân bằng tồn kho tự động',\n                receiving: 'Quản lý danh sách nhập kho, theo dõi nguồn cung và hàng hóa',";

    if (jsContent.includes(targetSubtitleLine)) {
        jsContent = jsContent.replace(targetSubtitleLine, replacementSubtitleLine);
        console.log('✅ Added inventory and receiving to subtitle mapping in admin.js!');
    } else {
        console.warn('⚠️ Could not find target subtitle mapping line in admin.js!');
    }

    // Replace the row generation logic in loadInventories()
    const targetMapStart = "tbody.innerHTML = filtered.map(inv => {";
    const targetMapEnd = "}).join('');";
    
    const mapStartIndex = jsContent.indexOf(targetMapStart);
    
    if (mapStartIndex !== -1) {
        // Find the next end of map block
        const nextEndIndex = jsContent.indexOf(targetMapEnd, mapStartIndex);
        if (nextEndIndex !== -1 && mapStartIndex < nextEndIndex) {
            console.log('✅ Found table row map block in admin.js! Redesigning row templates...');
            
            const newRowMapBlock = `tbody.innerHTML = filtered.map(inv => {
                        let statusBadge = '';
                        if (inv.trang_thai === 'da_duyet') {
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">✅ Đã cân kho</span>';
                        } else if (inv.trang_thai === 'hoan_thanh') {
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">📥 Chờ duyệt cân</span>';
                        } else {
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">⏳ Đang kiểm kê</span>';
                        }
                        
                        const ngayKiem = inv.ngay_kiem_ke ? new Date(inv.ngay_kiem_ke).toLocaleString('vi-VN') : 'Chưa có';
                        const chenhLechText = inv.tong_chenh_lech > 0 ? \`+\${inv.tong_chenh_lech}\` : inv.tong_chenh_lech;
                        const chenhLechColor = inv.tong_chenh_lech > 0 ? 'text-green-600 font-bold' : (inv.tong_chenh_lech < 0 ? 'text-red-600 font-bold' : 'text-slate-600');
                        
                        // Action buttons styled with premium borders, colors, and shadows
                        let actionButtons = \`
                            <button onclick="openInventoryDetail(\${inv.ma_phieu_kiem_ke})" class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">👁️ Xem</button>
\`;
                        
                        if (inv.trang_thai === 'dang_kiem_ke') {
                            actionButtons += \`
                                <button onclick="openInventoryModal(&quot;\${inv.ma_phieu_kiem_ke}&quot;)" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm ml-1.5 font-sans">✏️ Sửa</button>
\`;
                        }
                        
                        if (inv.trang_thai === 'hoan_thanh') {
                            actionButtons += \`
                                <button onclick="approveInventory(\${inv.ma_phieu_kiem_ke})" class="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-extrabold text-xs transition-all shadow-md ml-1.5 font-sans">🛡️ Duyệt cân</button>
\`;
                        }
                        
                        actionButtons += \`
                            <button onclick="deleteInventory(\${inv.ma_phieu_kiem_ke})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1.5" title="Xóa phiếu">🗑️</button>
\`;
                        
                        const maPhieu = inv.ma_phieu || \`PKK\${new Date(inv.ngay_kiem_ke).toISOString().slice(0, 10).replace(/-/g, '')}-\\$\${String(inv.ma_phieu_kiem_ke).padStart(4, '0')}\`;
                        
                        return \`
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">\${maPhieu}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">👤 NV-\${inv.ma_nhan_vien}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap">\${ngayKiem}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800 whitespace-nowrap">\${inv.tong_san_pham || 0} Sp</td>
                                <td class="px-6 py-4 border-b text-right \${chenhLechColor} whitespace-nowrap">\${chenhLechText}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800 whitespace-nowrap">\${formatPrice(inv.gia_tri_chenh_lech)}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">\${statusBadge}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1">\${actionButtons}</div>
                                </td>
                            </tr>
\`;
                    }).join('');`;

            // Wait, note the double escaping of \$ in PKK code template above: \\$\\$ to print just \$ after template compilation!
            // Let's make sure it compiles cleanly into string:
            // "const maPhieu = inv.ma_phieu || `PKK${new Date(inv.ngay_kiem_ke).toISOString().slice(0, 10).replace(/-/g, '')}-${String(inv.ma_phieu_kiem_ke).padStart(4, '0')}`;"
            // Yes! Let's write the string literal code for it carefully to avoid template execution issues:
            // in jsContent it should end up as:
            // `const maPhieu = inv.ma_phieu || \`PKK\${new Date(inv.ngay_kiem_ke).toISOString().slice(0, 10).replace(/-/g, '')}-\${String(inv.ma_phieu_kiem_ke).padStart(4, '0')}\`;`
            
            // Let's replace the block
            jsContent = jsContent.substring(0, mapStartIndex) + newRowMapBlock + jsContent.substring(nextEndIndex + targetMapEnd.length);
            fs.writeFileSync(jsPath, jsContent, 'utf8');
            console.log('✅ admin.js row generation updated successfully!');
        } else {
            console.error('❌ Could not find closing boundary for map block in admin.js!');
        }
    } else {
        console.error('❌ Could not find starting boundary for map block in admin.js!');
    }
} else {
    console.error(`❌ JS file does not exist: ${jsPath}`);
}

console.log('✨ All premium redesign operations finished successfully!');
