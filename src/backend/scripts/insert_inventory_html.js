const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/admin/pages/admin.html');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `<!-- Products Section -->`;
if (!content.includes(targetStr)) {
    console.error('❌ Could not find the products section marker!');
    process.exit(1);
}

const inventoryHtml = `<!-- Inventory Section - Kiểm kê sản phẩm -->
                <section id="section-inventory" class="content-section">
                    
                    <!-- Thống kê tổng quan -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div class="card-3d-blue cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('')">
                            <div class="flex items-center justify-between mb-3">
                                <div class="bg-white/20 p-3 rounded-lg">
                                    <span class="text-3xl">📋</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-blue-100 text-sm font-semibold">Tổng số phiếu</p>
                                    <p id="stat-total-inventories" class="text-3xl font-bold">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-3d-orange cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('dang_kiem_ke')">
                            <div class="flex items-center justify-between mb-3">
                                <div class="bg-white/20 p-3 rounded-lg">
                                    <span class="text-3xl">⏳</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-orange-100 text-sm font-semibold">Đang kiểm kê</p>
                                    <p id="stat-checking-inventories" class="text-3xl font-bold">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-3d-purple cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('hoan_thanh')">
                            <div class="flex items-center justify-between mb-3">
                                <div class="bg-white/20 p-3 rounded-lg">
                                    <span class="text-3xl">📥</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-purple-100 text-sm font-semibold">Hoàn thành đếm</p>
                                    <p id="stat-completed-inventories" class="text-3xl font-bold">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-3d-green cursor-pointer transition-all hover:scale-105 active:scale-95" onclick="filterInventoryByStatus('da_duyet')">
                            <div class="flex items-center justify-between mb-3">
                                <div class="bg-white/20 p-3 rounded-lg">
                                    <span class="text-3xl">✅</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-green-100 text-sm font-semibold">Đã duyệt cân kho</p>
                                    <p id="stat-approved-inventories" class="text-3xl font-bold">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters và Actions -->
                    <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <div class="flex flex-wrap gap-4 items-center justify-between">
                            <div class="flex flex-wrap gap-3 flex-1">
                                <select id="inventory-status-filter" class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" onchange="applyInventoryFilters()">
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="dang_kiem_ke">Đang kiểm kê</option>
                                    <option value="hoan_thanh">Hoàn thành đếm</option>
                                    <option value="da_duyet">Đã duyệt cân kho</option>
                                </select>
                                
                                <input type="date" id="inventory-date-from" class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Từ ngày" onchange="applyInventoryFilters()">
                                <input type="date" id="inventory-date-to" class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Đến ngày" onchange="applyInventoryFilters()">
                                
                                <button onclick="applyInventoryFilters()" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 active:scale-95">
                                    🔍 Lọc
                                </button>
                                <button onclick="resetInventoryFilters()" class="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 active:scale-95">
                                    🔄 Reset
                                </button>
                            </div>
                            
                            <button onclick="openInventoryModal()" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 transform active:scale-95 transition-all hover:scale-105">
                                ➕ Tạo phiếu kiểm kê
                            </button>
                        </div>
                    </div>

                    <!-- Danh sách phiếu kiểm kê -->
                    <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                                    <tr>
                                        <th class="px-6 py-4 text-left text-sm font-bold text-gray-700">Mã phiếu</th>
                                        <th class="px-6 py-4 text-left text-sm font-bold text-gray-700">Người kiểm kê</th>
                                        <th class="px-6 py-4 text-left text-sm font-bold text-gray-700">Ngày kiểm kê</th>
                                        <th class="px-6 py-4 text-right text-sm font-bold text-gray-700">Tổng sản phẩm</th>
                                        <th class="px-6 py-4 text-right text-sm font-bold text-gray-700">Tổng chênh lệch</th>
                                        <th class="px-6 py-4 text-right text-sm font-bold text-gray-700">Giá trị chênh lệch</th>
                                        <th class="px-6 py-4 text-center text-sm font-bold text-gray-700">Trạng thái</th>
                                        <th class="px-6 py-4 text-center text-sm font-bold text-gray-700">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody id="inventory-table-body" class="divide-y divide-gray-200">
                                    <!-- Data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Modal tạo/sửa phiếu kiểm kê -->
                <div id="inventory-modal" class="modal fixed inset-0 bg-black/50 z-50 items-center justify-center p-4">
                    <div class="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
                        <div class="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                            <h3 id="inventory-modal-title" class="text-2xl font-bold">📋 Tạo phiếu kiểm kê</h3>
                            <button onclick="closeInventoryModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-6">
                            <!-- Quy trình Nghiệp vụ Tabs hiển thị các bước -->
                            <div class="flex items-center justify-between border-b pb-4 mb-6 text-sm font-semibold text-gray-500">
                                <div class="flex items-center gap-2 text-blue-600" id="step-tab-1">
                                    <span class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border border-blue-600">1</span>
                                    <span>Tạo phiếu kiểm kê</span>
                                </div>
                                <div class="h-0.5 flex-1 bg-gray-200 mx-4" id="step-line-1"></div>
                                <div class="flex items-center gap-2 font-semibold text-gray-500" id="step-tab-2">
                                    <span class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold border border-gray-300">2</span>
                                    <span>Kiểm đếm thực tế</span>
                                </div>
                                <div class="h-0.5 flex-1 bg-gray-200 mx-4" id="step-line-2"></div>
                                <div class="flex items-center gap-2 font-semibold text-gray-500" id="step-tab-3">
                                    <span class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold border border-gray-300 font-mono">3 & 4</span>
                                    <span>Đối chiếu & Xử lý chênh lệch</span>
                                </div>
                            </div>

                            <form id="inventory-form" onsubmit="saveInventory(event)" class="space-y-6">
                                <input type="hidden" id="inventory-id">
                                
                                <!-- Step 1 Content: General Info -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Mã phiếu kiểm kê</label>
                                        <input type="text" id="inventory-code" readonly class="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none text-gray-500 font-mono font-bold" placeholder="Tự động phát sinh">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Ngày kiểm kê *</label>
                                        <input type="datetime-local" id="inventory-date" required class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Người kiểm kê</label>
                                        <input type="text" id="inventory-auditor" readonly class="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none text-gray-500 font-semibold">
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-bold text-gray-700 mb-2">Ghi chú phiếu kiểm kê</label>
                                    <textarea id="inventory-note" rows="2" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Nhập ghi chú chung, ví dụ: Kiểm kê định kỳ kho hàng tháng..."></textarea>
                                </div>
                                
                                <!-- Step 2 & 3: Product Counting Grid -->
                                <div class="border-t border-gray-200 pt-6">
                                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                        <div>
                                            <h4 class="text-xl font-bold text-gray-800 flex items-center gap-2">🔍 Bước 2 & 3: Quét mã vạch / Tìm sản phẩm</h4>
                                            <p class="text-sm text-gray-500">Quét barcode/IMEI hoặc tìm tên sản phẩm để đưa vào danh sách đối chiếu</p>
                                        </div>
                                        <div class="relative w-full md:w-96">
                                            <input type="text" id="inventory-product-search" class="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm font-medium" placeholder="Quét barcode hoặc nhập tên sản phẩm..." oninput="searchInventoryProducts()">
                                            <span class="absolute left-3.5 top-3 text-gray-400">🔍</span>
                                            
                                            <!-- Kết quả tìm kiếm nhanh -->
                                            <div id="inventory-search-results" class="hidden absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                                                <!-- Search results dynamic -->
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Table count details -->
                                    <div class="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner">
                                        <table class="w-full text-sm">
                                            <thead class="bg-gray-100 border-b border-gray-200">
                                                <tr>
                                                    <th class="px-4 py-3 text-left font-bold text-gray-700 w-12">STT</th>
                                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Sản phẩm</th>
                                                    <th class="px-4 py-3 text-right font-bold text-gray-700 w-28">Tồn hệ thống</th>
                                                    <th class="px-4 py-3 text-center font-bold text-gray-700 w-36">Thực tế (Đếm)</th>
                                                    <th class="px-4 py-3 text-right font-bold text-gray-700 w-28">Chênh lệch</th>
                                                    <th class="px-4 py-3 text-left font-bold text-gray-700 w-64">Xử lý chênh lệch (Bước 4)</th>
                                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Ghi chú</th>
                                                    <th class="px-4 py-3 text-center font-bold text-gray-700 w-16">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody id="inventory-products-container" class="divide-y divide-gray-200 bg-white">
                                                <tr>
                                                    <td colspan="8" class="text-center py-8 text-gray-400 font-medium">Chưa có sản phẩm nào. Hãy tìm sản phẩm hoặc quét barcode ở trên!</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <!-- Tổng kết so sánh (Bước 3 & 4 Metrics) -->
                                    <div class="mt-6 p-6 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border-2 border-indigo-200 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                                        <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex justify-between items-center">
                                            <div>
                                                <p class="text-xs text-gray-500 font-bold uppercase">Tổng mã kiểm</p>
                                                <p id="inv-total-items" class="text-3xl font-extrabold text-slate-800">0</p>
                                            </div>
                                            <span class="text-3xl">📦</span>
                                        </div>
                                        <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex justify-between items-center">
                                            <div>
                                                <p class="text-xs text-gray-500 font-bold uppercase">Tổng chênh lệch</p>
                                                <p id="inv-total-diff" class="text-3xl font-extrabold text-slate-800">0</p>
                                            </div>
                                            <span id="inv-total-diff-icon" class="text-3xl">⚖️</span>
                                        </div>
                                        <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex justify-between items-center">
                                            <div>
                                                <p class="text-xs text-gray-500 font-bold uppercase">Giá trị lệch (vốn)</p>
                                                <p id="inv-total-value" class="text-3xl font-extrabold text-slate-800">0đ</p>
                                            </div>
                                            <span class="text-3xl">💰</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="flex gap-4 pt-6 border-t border-gray-200 sticky bottom-0 bg-white pb-2 z-10">
                                    <button type="button" onclick="saveInventoryDraft(event)" class="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                                        📥 Lưu nháp phiếu kiểm
                                    </button>
                                    <button type="submit" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                                        ✅ Hoàn thành & Chờ duyệt
                                    </button>
                                    <button type="button" onclick="closeInventoryModal()" class="px-8 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-bold text-gray-700 transition-all">
                                        ❌ Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal xem chi tiết phiếu kiểm kê -->
                <div id="inventory-detail-modal" class="modal fixed inset-0 bg-black/50 z-50 items-center justify-center p-4">
                    <div class="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div class="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <h3 class="text-2xl font-bold">📋 Chi tiết lịch sử kiểm kê kho</h3>
                            <button onclick="closeInventoryDetailModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-6 space-y-6">
                            <!-- Metadata Grid -->
                            <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm shadow-inner">
                                <div>
                                    <p class="text-slate-500 font-semibold mb-1">Mã phiếu:</p>
                                    <p id="detail-inv-code" class="font-mono font-bold text-slate-800"></p>
                                </div>
                                <div>
                                    <p class="text-slate-500 font-semibold mb-1">Ngày lập phiếu:</p>
                                    <p id="detail-inv-date" class="font-bold text-slate-800"></p>
                                </div>
                                <div>
                                    <p class="text-slate-500 font-semibold mb-1">Người kiểm kê:</p>
                                    <p id="detail-inv-auditor" class="font-bold text-slate-800"></p>
                                </div>
                                <div>
                                    <p class="text-slate-500 font-semibold mb-1">Trạng thái:</p>
                                    <div id="detail-inv-status"></div>
                                </div>
                            </div>

                            <!-- Ghi chú chung -->
                            <div>
                                <p class="text-sm font-bold text-gray-700 mb-1">📝 Ghi chú chung:</p>
                                <p id="detail-inv-note" class="text-sm bg-gray-50 border p-3 rounded-lg text-gray-600 italic"></p>
                            </div>

                            <!-- List products in detail -->
                            <div>
                                <h4 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">📦 Danh sách đối chiếu chi tiết</h4>
                                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <table class="w-full text-sm">
                                        <thead class="bg-slate-50 border-b border-gray-200">
                                            <tr>
                                                <th class="px-4 py-3 text-left font-bold text-gray-700">Mã SP</th>
                                                <th class="px-4 py-3 text-left font-bold text-gray-700">Tên sản phẩm</th>
                                                <th class="px-4 py-3 text-right font-bold text-gray-700">Tồn hệ thống</th>
                                                <th class="px-4 py-3 text-right font-bold text-gray-700">Thực tế (Đếm)</th>
                                                <th class="px-4 py-3 text-right font-bold text-gray-700">Chênh lệch</th>
                                                <th class="px-4 py-3 text-left font-bold text-gray-700">Lý do & Xử lý chênh lệch</th>
                                                <th class="px-4 py-3 text-left font-bold text-gray-700">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody id="detail-inv-table-body" class="divide-y divide-gray-200 bg-white">
                                            <!-- Data loaded dynamically -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Summary info -->
                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-bold">
                                <div class="flex gap-6">
                                    <p class="text-slate-600">Tổng sản phẩm kiểm: <span id="detail-inv-total-items" class="text-slate-800 text-lg">0</span></p>
                                    <p class="text-slate-600">Tổng lệch: <span id="detail-inv-total-diff" class="text-lg">0</span></p>
                                </div>
                                <p class="text-slate-600">Tổng giá trị lệch (vốn): <span id="detail-inv-total-value" class="text-indigo-600 text-xl">0đ</span></p>
                            </div>

                            <!-- Timeline history if approved -->
                            <div id="detail-inv-approved-box" class="hidden bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                                <div class="flex gap-2 items-center">
                                    <span class="text-lg">🛡️</span>
                                    <div>
                                        <p class="font-bold">Đã được phê duyệt & cân bằng kho tự động (Bước 5)</p>
                                        <p class="text-xs mt-0.5">Phê duyệt bởi: <span id="detail-inv-approver" class="font-bold">Admin</span> vào ngày <span id="detail-inv-approve-date" class="font-bold"></span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-6 border-t bg-slate-50 flex justify-between items-center gap-3">
                            <div class="flex gap-2" id="detail-inv-actions-container">
                                <!-- Approve / Print / Close buttons dynamically rendered -->
                            </div>
                            <button onclick="closeInventoryDetailModal()" class="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Products Section -->`;

const updatedContent = content.replace(targetStr, `${inventoryHtml}\n\n                ${targetStr}`);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('✅ HTML programmatically updated successfully!');
process.exit(0);
