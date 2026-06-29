const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/admin/js/admin.js');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

// We search for the start and end of loadInventories() to replace it cleanly
const startMarker = `        async function loadInventories() {`;
const endMarker = `        // ==================== POS CASHIER SALES FUNCTIONS ====================`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('❌ Could not find Javascript markers in admin.js!');
    process.exit(1);
}

const inventoryJsContent = `        // Active Inventory State Variables
        let inventoryItems = [];
        let inventoryAllProducts = [];
        let activeInventoryStatusFilter = '';

        async function loadInventories() {
            try {
                const tbody = document.getElementById('inventory-table-body');
                if (!tbody) return;
                
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-400 font-medium">⏳ Đang tải lịch sử kiểm kê...</td></tr>';
                
                // Fetch list of inventories (plural endpoint!)
                const result = await apiCall('/admin/inventories');
                
                if (result.success && result.data) {
                    const inventories = result.data;
                    
                    // Cập nhật KPIs trên thẻ thống kê
                    const totalCount = inventories.length;
                    const checkingCount = inventories.filter(inv => inv.trang_thai === 'dang_kiem_ke').length;
                    const completedCount = inventories.filter(inv => inv.trang_thai === 'hoan_thanh').length;
                    const approvedCount = inventories.filter(inv => inv.trang_thai === 'da_duyet').length;
                    
                    document.getElementById('stat-total-inventories').textContent = totalCount;
                    document.getElementById('stat-checking-inventories').textContent = checkingCount;
                    document.getElementById('stat-completed-inventories').textContent = completedCount;
                    document.getElementById('stat-approved-inventories').textContent = approvedCount;
                    
                    // Áp dụng bộ lọc
                    let filtered = [...inventories];
                    const statusFilter = document.getElementById('inventory-status-filter')?.value || activeInventoryStatusFilter;
                    const dateFrom = document.getElementById('inventory-date-from')?.value;
                    const dateTo = document.getElementById('inventory-date-to')?.value;
                    
                    if (statusFilter) {
                        filtered = filtered.filter(inv => inv.trang_thai === statusFilter);
                    }
                    if (dateFrom) {
                        filtered = filtered.filter(inv => new Date(inv.ngay_kiem_ke) >= new Date(dateFrom + 'T00:00:00'));
                    }
                    if (dateTo) {
                        filtered = filtered.filter(inv => new Date(inv.ngay_kiem_ke) <= new Date(dateTo + 'T23:59:59'));
                    }
                    
                    if (filtered.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-500 font-medium">📋 Không tìm thấy phiếu kiểm kê nào</td></tr>';
                        return;
                    }
                    
                    tbody.innerHTML = filtered.map(inv => {
                        let statusBadge = '';
                        if (inv.trang_thai === 'da_duyet') {
                            statusBadge = '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-xs font-black">✅ Đã cân kho</span>';
                        } else if (inv.trang_thai === 'hoan_thanh') {
                            statusBadge = '<span class="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-1 rounded-full text-xs font-black">📥 Đã hoàn thành đếm</span>';
                        } else {
                            statusBadge = '<span class="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-black">⏳ Đang kiểm kê</span>';
                        }
                        
                        const ngayKiem = inv.ngay_kiem_ke ? new Date(inv.ngay_kiem_ke).toLocaleString('vi-VN') : 'Chưa có';
                        const chenhLechText = inv.tong_chenh_lech > 0 ? \`+\${inv.tong_chenh_lech}\` : inv.tong_chenh_lech;
                        const chenhLechColor = inv.tong_chenh_lech > 0 ? 'text-green-600 font-bold' : (inv.tong_chenh_lech < 0 ? 'text-red-600 font-bold' : 'text-slate-600');
                        
                        // Action buttons
                        let actionButtons = \`
                            <button onclick="openInventoryDetail(\${inv.ma_phieu_kiem_ke})" class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-semibold text-xs transition-colors">👁️ Xem</button>
                        \`;
                        
                        if (inv.trang_thai === 'dang_kiem_ke') {
                            actionButtons += \`
                                <button onclick="openInventoryModal(\&quot;\${inv.ma_phieu_kiem_ke}\&quot;)" class="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded font-semibold text-xs transition-colors ml-1">✏️ Sửa</button>
                            \`;
                        }
                        
                        // Approve button for admin if not approved yet
                        if (inv.trang_thai === 'hoan_thanh') {
                            actionButtons += \`
                                <button onclick="approveInventory(\${inv.ma_phieu_kiem_ke})" class="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded font-bold text-xs transition-all ml-1">🛡️ Duyệt cân kho</button>
                            \`;
                        }
                        
                        // Delete option
                        actionButtons += \`
                            <button onclick="deleteInventory(\${inv.ma_phieu_kiem_ke})" class="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs transition-colors ml-1" title="Xóa phiếu">🗑️</button>
                        \`;
                        
                        // Generates a mock PKK code if none exists
                        const maPhieu = inv.ma_phieu || \`PKK\${new Date(inv.ngay_kiem_ke).toISOString().slice(0, 10).replace(/-/g, '')}-\${String(inv.ma_phieu_kiem_ke).padStart(4, '0')}\`;
                        
                        return \`
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800">\${maPhieu}</td>
                                <td class="px-6 py-4 border-b font-medium text-slate-700">👤 N/A (Mã NV: \${inv.ma_nhan_vien})</td>
                                <td class="px-6 py-4 border-b text-slate-600">\${ngayKiem}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800">\${inv.tong_san_pham || 0}</td>
                                <td class="px-6 py-4 border-b text-right \${chenhLechColor}">\${chenhLechText}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800">\${formatPrice(inv.gia_tri_chenh_lech)}</td>
                                <td class="px-6 py-4 border-b text-center">\${statusBadge}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">\${actionButtons}</td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-red-500 font-medium">⚠️ Lỗi: Không thể load dữ liệu từ API.</td></tr>';
                }
            } catch (error) {
                console.error('Load inventories error:', error);
                const tbody = document.getElementById('inventory-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-red-500 font-medium">❌ Lỗi kết nối server: ' + error.message + '</td></tr>';
                }
            }
        }

        window.filterInventoryByStatus = function(status) {
            activeInventoryStatusFilter = status;
            const filterEl = document.getElementById('inventory-status-filter');
            if (filterEl) filterEl.value = status;
            loadInventories();
        };

        window.applyInventoryFilters = function() {
            loadInventories();
        };

        window.resetInventoryFilters = function() {
            activeInventoryStatusFilter = '';
            const filterEl = document.getElementById('inventory-status-filter');
            const fromEl = document.getElementById('inventory-date-from');
            const toEl = document.getElementById('inventory-date-to');
            if (filterEl) filterEl.value = '';
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            loadInventories();
        };

        // Open Create/Edit Inventory modal
        window.openInventoryModal = async function(id = null) {
            console.log('📦 Open Inventory modal. ID:', id);
            
            // Clear inputs
            document.getElementById('inventory-id').value = id || '';
            document.getElementById('inventory-note').value = '';
            document.getElementById('inventory-product-search').value = '';
            document.getElementById('inventory-search-results').innerHTML = '';
            document.getElementById('inventory-search-results').classList.add('hidden');
            
            // Set auditor to current logged in admin
            const auditorName = adminUser?.ten_dang_nhap || adminUser?.email || 'N/A';
            document.getElementById('inventory-auditor').value = auditorName;
            
            // Load products for search pre-fetching
            try {
                const res = await apiCall('/admin/products?limit=1000');
                if (res.success) {
                    inventoryAllProducts = res.data || [];
                }
            } catch (err) {
                console.error('Error prefetching products:', err);
            }
            
            if (id === null) {
                // STEP 1: Creating new sheet
                document.getElementById('inventory-modal-title').textContent = '📋 Tạo phiếu kiểm kê kho mới';
                
                // Formulate premium PKK Code
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const date = String(now.getDate()).padStart(2, '0');
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const ss = String(now.getSeconds()).padStart(2, '0');
                document.getElementById('inventory-code').value = \`PKK\${year}\${month}\${date}-\${hh}\${mm}\${ss}\`;
                
                // Set default date-time to now
                const offset = now.getTimezoneOffset();
                const localNow = new Date(now.getTime() - (offset*60*1000));
                document.getElementById('inventory-date').value = localNow.toISOString().slice(0, 16);
                
                inventoryItems = [];
                renderInventoryItems();
                
                // Step process reset tabs
                updateInventoryStepTabs(0);
                
                // Display modal
                document.getElementById('inventory-modal').style.display = 'flex';
            } else {
                // STEP 1 (Part B): Editing existing drafting sheet
                document.getElementById('inventory-modal-title').textContent = \`✏️ Cập nhật phiếu kiểm kê #\${id}\`;
                
                try {
                    const result = await apiCall(\`/admin/inventories/\${id}\`);
                    if (result.success && result.data) {
                        const inv = result.data;
                        
                        document.getElementById('inventory-code').value = inv.ma_phieu || \`PKK\${inv.ma_phieu_kiem_ke}\`;
                        
                        // Parse local date
                        const invDate = new Date(inv.ngay_kiem_ke);
                        const offset = invDate.getTimezoneOffset();
                        const localInvDate = new Date(invDate.getTime() - (offset*60*1000));
                        document.getElementById('inventory-date').value = localInvDate.toISOString().slice(0, 16);
                        document.getElementById('inventory-note').value = inv.ghi_chu || '';
                        
                        // Map products from backend details
                        inventoryItems = (inv.products || []).map(p => ({
                            ma_san_pham: p.ma_san_pham,
                            ten_san_pham: p.ten_san_pham,
                            ma_san_pham_code: p.ma_san_pham_code,
                            so_luong_he_thong: p.so_luong_he_thong,
                            so_luong_thuc_te: p.so_luong_thuc_te,
                            gia_nhap: p.gia_nhap,
                            ly_do_chenh_lech: p.ly_do_chenh_lech || 'Khớp hoàn toàn',
                            ghi_chu: p.ghi_chu || ''
                        }));
                        
                        renderInventoryItems();
                        updateInventoryStepTabs(inventoryItems.length > 0 ? 2 : 1);
                        
                        document.getElementById('inventory-modal').style.display = 'flex';
                    } else {
                        alert('Không thể tải thông tin chi tiết phiếu kiểm!');
                    }
                } catch (err) {
                    console.error('Fetch inventory error:', err);
                    alert('Lỗi tải dữ liệu: ' + err.message);
                }
            }
        };

        window.closeInventoryModal = function() {
            document.getElementById('inventory-modal').style.display = 'none';
        };

        // Live product search within Inventory modal
        window.searchInventoryProducts = function() {
            const searchVal = document.getElementById('inventory-product-search').value.trim().toLowerCase();
            const resultsContainer = document.getElementById('inventory-search-results');
            
            if (searchVal.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.add('hidden');
                return;
            }
            
            // Search match logic
            const matched = inventoryAllProducts.filter(p => {
                return p.ten_san_pham.toLowerCase().includes(searchVal) || 
                       (p.ma_san_pham_code && p.ma_san_pham_code.toLowerCase().includes(searchVal)) || 
                       (p.barcode && p.barcode.toLowerCase().includes(searchVal));
            });
            
            // Check for exact barcode scan match to automatically trigger add! (Step 2 IMEI/Mã vạch)
            const exactBarcodeMatch = matched.find(p => p.barcode && p.barcode.toLowerCase() === searchVal);
            if (exactBarcodeMatch) {
                window.addInventoryProduct(exactBarcodeMatch);
                document.getElementById('inventory-product-search').value = '';
                resultsContainer.innerHTML = '';
                resultsContainer.classList.add('hidden');
                return;
            }
            
            if (matched.length === 0) {
                resultsContainer.innerHTML = '<div class="p-3 text-center text-gray-500 font-medium">❌ Không tìm thấy sản phẩm nào</div>';
                resultsContainer.classList.remove('hidden');
                return;
            }
            
            resultsContainer.innerHTML = matched.slice(0, 10).map(p => \`
                <div onclick="addInventoryProductByJson('\${encodeURIComponent(JSON.stringify(p))}')" class="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-sm transition-all hover:pl-4">
                    <div>
                        <p class="font-bold text-slate-800">\${p.ten_san_pham}</p>
                        <p class="text-xs text-slate-400 font-mono font-semibold">\${p.ma_san_pham_code || 'N/A'} - Barcode: \&quot;\${p.barcode || 'N/A'}\&quot;</p>
                    </div>
                    <div class="text-right">
                        <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-black">Kho: \${p.so_luong || 0}</span>
                    </div>
                </div>
            \`).join('');
            resultsContainer.classList.remove('hidden');
        };

        window.addInventoryProductByJson = function(escapedJson) {
            const product = JSON.parse(decodeURIComponent(escapedJson));
            window.addInventoryProduct(product);
        };

        window.addInventoryProduct = function(product) {
            // Check if product is already added
            const exists = inventoryItems.some(item => item.ma_san_pham === product.ma_san_pham);
            if (exists) {
                alert('Sản phẩm này đã có trong phiếu kiểm kê!');
                document.getElementById('inventory-product-search').value = '';
                document.getElementById('inventory-search-results').classList.add('hidden');
                return;
            }
            
            // Add product structure
            inventoryItems.push({
                ma_san_pham: product.ma_san_pham,
                ten_san_pham: product.ten_san_pham,
                ma_san_pham_code: product.ma_san_pham_code || 'N/A',
                so_luong_he_thong: parseInt(product.so_luong) || 0,
                so_luong_thuc_te: parseInt(product.so_luong) || 0, // default to matching system count
                gia_nhap: parseFloat(product.gia_nhap) || 0,
                ly_do_chenh_lech: 'Khớp hoàn toàn',
                ghi_chu: ''
            });
            
            // Clear search field
            document.getElementById('inventory-product-search').value = '';
            document.getElementById('inventory-search-results').classList.add('hidden');
            
            renderInventoryItems();
            updateInventoryStepTabs(2);
        };

        window.updateInventoryStepTabs = function(stepIndex) {
            const step1 = document.getElementById('step-tab-1');
            const step2 = document.getElementById('step-tab-2');
            const step3 = document.getElementById('step-tab-3');
            const line1 = document.getElementById('step-line-1');
            const line2 = document.getElementById('step-line-2');
            
            if (stepIndex === 0) {
                step1.className = "flex items-center gap-2 text-blue-600";
                step2.className = "flex items-center gap-2 text-gray-500 font-semibold";
                step3.className = "flex items-center gap-2 text-gray-500 font-semibold";
                line1.className = "h-0.5 flex-1 bg-gray-200 mx-4";
                line2.className = "h-0.5 flex-1 bg-gray-200 mx-4";
            } else if (stepIndex === 1 || stepIndex === 2) {
                step1.className = "flex items-center gap-2 text-emerald-600 font-black";
                step2.className = "flex items-center gap-2 text-blue-600 font-black";
                step3.className = "flex items-center gap-2 text-gray-500 font-semibold";
                line1.className = "h-0.5 flex-1 bg-emerald-500 mx-4";
                line2.className = "h-0.5 flex-1 bg-gray-200 mx-4";
                
                if (stepIndex === 2) {
                    step3.className = "flex items-center gap-2 text-blue-600 font-black";
                    line2.className = "h-0.5 flex-1 bg-blue-500 mx-4";
                }
            }
        };

        window.updateInventoryItemQty = function(index, value) {
            const qty = parseInt(value) || 0;
            if (qty < 0) return;
            
            inventoryItems[index].so_luong_thuc_te = qty;
            
            // Automatic Step 4: Discrepancy logic mapping!
            const diff = qty - inventoryItems[index].so_luong_he_thong;
            if (diff === 0) {
                inventoryItems[index].ly_do_chenh_lech = 'Khớp hoàn toàn';
            } else if (diff < 0) {
                inventoryItems[index].ly_do_chenh_lech = 'Ghi nhận thất thoát';
            } else {
                inventoryItems[index].ly_do_chenh_lech = 'Cập nhật tăng tồn';
            }
            
            renderInventoryItems(false); // render without re-building inputs so user doesn't lose focus
        };

        window.updateInventoryItemReason = function(index, value) {
            inventoryItems[index].ly_do_chenh_lech = value;
            renderInventoryItems(false);
        };

        window.updateInventoryItemNote = function(index, value) {
            inventoryItems[index].ghi_chu = value;
        };

        window.deleteInventoryItem = function(index) {
            inventoryItems.splice(index, 1);
            renderInventoryItems();
            if (inventoryItems.length === 0) {
                updateInventoryStepTabs(0);
            }
        };

        window.renderInventoryItems = function(rebuildTable = true) {
            const container = document.getElementById('inventory-products-container');
            if (!container) return;
            
            if (inventoryItems.length === 0) {
                container.innerHTML = \`
                    <tr>
                        <td colspan="8" class="text-center py-8 text-gray-400 font-medium">Chưa có sản phẩm nào. Hãy tìm sản phẩm hoặc quét barcode ở trên!</td>
                    </tr>
                \`;
                calculateInventoryTotals();
                return;
            }
            
            if (rebuildTable) {
                container.innerHTML = inventoryItems.map((item, idx) => {
                    const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
                    const diffText = diff > 0 ? \`+\${diff}\` : diff;
                    const diffColor = diff > 0 ? 'text-green-600 font-extrabold bg-green-50 px-2 py-0.5 rounded border border-green-200' : (diff < 0 ? 'text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-200' : 'text-slate-500');
                    
                    return \`
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-3 text-left font-bold text-slate-500">\${idx + 1}</td>
                            <td class="px-4 py-3 text-left">
                                <p class="font-bold text-slate-800">\${item.ten_san_pham}</p>
                                <p class="text-xs font-mono font-semibold text-slate-400">\${item.ma_san_pham_code}</p>
                            </td>
                            <td class="px-4 py-3 text-right font-semibold text-slate-700">\${item.so_luong_he_thong}</td>
                            <td class="px-4 py-3 text-center">
                                <input type="number" value="\${item.so_luong_thuc_te}" min="0" 
                                    oninput="updateInventoryItemQty(\${idx}, this.value)" 
                                    class="w-20 px-2.5 py-1 text-center font-bold border-2 border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                            </td>
                            <td class="px-4 py-3 text-right font-mono font-bold" id="item-diff-\${idx}">\${diffText}</td>
                            <td class="px-4 py-3">
                                <select onchange="updateInventoryItemReason(\&quot;\text_idx_\${idx}\&quot;, this.value)" id="item-reason-\&quot;\text_idx_\${idx}\&quot;" 
                                    class="w-full px-2 py-1.5 border-2 border-slate-300 rounded-lg text-xs font-bold focus:border-indigo-500 focus:outline-none text-slate-700 bg-white">
                                    <option value="Khớp hoàn toàn" \${item.ly_do_chenh_lech === 'Khớp hoàn toàn' ? 'selected' : ''}>✨ Khớp hoàn toàn</option>
                                    <option value="Ghi nhận thất thoát" \${item.ly_do_chenh_lech === 'Ghi nhận thất thoát' ? 'selected' : ''}>⚠️ Ghi nhận thất thoát (Thiếu)</option>
                                    <option value="Cập nhật tăng tồn" \${item.ly_do_chenh_lech === 'Cập nhật tăng tồn' ? 'selected' : ''}>📥 Cập nhật tăng tồn (Dư)</option>
                                    <option value="Hàng lỗi -> Chuyển kho bảo hành" \${item.ly_do_chenh_lech === 'Hàng lỗi -> Chuyển kho bảo hành' ? 'selected' : ''}>🔧 Hàng lỗi -> Bảo hành</option>
                                    <option value="Khác" \${item.ly_do_chenh_lech === 'Khác' ? 'selected' : ''}>💡 Lý do khác...</option>
                                </select>
                            </td>
                            <td class="px-4 py-3">
                                <input type="text" value="\${item.ghi_chu}" oninput="updateInventoryItemNote(\${idx}, this.value)" placeholder="Chi tiết..." 
                                    class="w-full px-2.5 py-1 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none text-xs">
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button type="button" onclick="deleteInventoryItem(\${idx})" class="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors font-bold">🗑️</button>
                            </td>
                        </tr>
                    \`;
                }).join('');
                
                // Attach real indexes without quotes issues
                inventoryItems.forEach((item, idx) => {
                    const selectEl = document.getElementById(\`item-reason-"\\text_idx_\${idx}"\`);
                    if (selectEl) {
                        selectEl.removeAttribute('id');
                        selectEl.onchange = (e) => updateInventoryItemReason(idx, e.target.value);
                    }
                });
            } else {
                // Just update diff values dynamically without redraw to preserve focus
                inventoryItems.forEach((item, idx) => {
                    const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
                    const diffText = diff > 0 ? \`+\&nbsp;\${diff}\` : diff;
                    
                    const diffEl = document.getElementById(\`item-diff-\${idx}\`);
                    if (diffEl) {
                        diffEl.innerHTML = diffText;
                        if (diff > 0) {
                            diffEl.className = 'px-4 py-3 text-right font-mono font-bold text-green-600';
                        } else if (diff < 0) {
                            diffEl.className = 'px-4 py-3 text-right font-mono font-bold text-red-600';
                        } else {
                            diffEl.className = 'px-4 py-3 text-right font-mono font-bold text-slate-500';
                        }
                    }
                    
                    // Update dropdown dynamically based on automated mapping
                    const selectEl = document.querySelector(\`tr:nth-child(\${idx+1}) select\`);
                    if (selectEl) {
                        selectEl.value = item.ly_do_chenh_lech;
                    }
                });
            }
            
            calculateInventoryTotals();
        };

        window.calculateInventoryTotals = function() {
            let totalItems = inventoryItems.length;
            let totalDiff = 0;
            let totalValue = 0;
            
            inventoryItems.forEach(item => {
                const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
                totalDiff += diff;
                totalValue += diff * item.gia_nhap;
            });
            
            document.getElementById('inv-total-items').textContent = totalItems;
            
            const diffEl = document.getElementById('inv-total-diff');
            diffEl.textContent = totalDiff > 0 ? \`+\${totalDiff}\` : totalDiff;
            diffEl.className = totalDiff > 0 ? 'text-3xl font-extrabold text-green-600' : (totalDiff < 0 ? 'text-3xl font-extrabold text-red-600' : 'text-3xl font-extrabold text-slate-800');
            
            document.getElementById('inv-total-value').textContent = formatPrice(totalValue);
            document.getElementById('inv-total-value').className = totalValue > 0 ? 'text-3xl font-extrabold text-green-600' : (totalValue < 0 ? 'text-3xl font-extrabold text-red-600' : 'text-3xl font-extrabold text-slate-800');
            
            // Icon adjust
            const iconEl = document.getElementById('inv-total-diff-icon');
            if (iconEl) {
                iconEl.textContent = totalDiff > 0 ? '📈' : (totalDiff < 0 ? '📉' : '⚖️');
            }
        };

        window.saveInventoryDraft = async function(event) {
            event.preventDefault();
            await submitInventoryForm('dang_kiem_ke');
        };

        window.saveInventory = async function(event) {
            event.preventDefault();
            
            if (inventoryItems.length === 0) {
                alert('Vui lòng thêm ít nhất một sản phẩm vào danh sách kiểm kê!');
                return;
            }
            
            if (confirm('Hoàn tất đếm kiểm kê và gửi yêu cầu phê duyệt cân kho?')) {
                await submitInventoryForm('hoan_thanh');
            }
        };

        async function submitInventoryForm(trangThai) {
            const id = document.getElementById('inventory-id').value;
            const ngay_kiem_ke = document.getElementById('inventory-date').value;
            const ghi_chu = document.getElementById('inventory-note').value;
            const ma_phieu = document.getElementById('inventory-code').value;
            
            const body = {
                ngay_kiem_ke,
                trang_thai: trangThai,
                ghi_chu,
                ma_phieu, // Custom generated PKK code
                products: inventoryItems
            };
            
            console.log('Sending inventory audit data:', body);
            
            try {
                let response;
                if (id) {
                    // Update (PUT)
                    response = await fetch(\`\${API_URL}/admin/inventories/\${id}\`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': \`Bearer \${adminToken}\`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });
                } else {
                    // Create (POST)
                    response = await fetch(\`\${API_URL}/admin/inventories\`, {
                        method: 'POST',
                        headers: {
                            'Authorization': \`Bearer \${adminToken}\`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });
                }
                
                const result = await response.json();
                console.log('Inventory API result:', result);
                
                if (result.success) {
                    alert(result.message || 'Lưu phiếu kiểm kê thành công!');
                    closeInventoryModal();
                    loadInventories();
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (error) {
                console.error('Save inventory error:', error);
                alert('Có lỗi xảy ra khi lưu phiếu kiểm kê!');
            }
        }

        // View detail modal
        window.openInventoryDetail = async function(id) {
            console.log('👁️ View detail of inventory:', id);
            
            try {
                const result = await apiCall(\`/admin/inventories/\${id}\`);
                if (result.success && result.data) {
                    const inv = result.data;
                    
                    document.getElementById('detail-inv-code').textContent = inv.ma_phieu || \`PKK\${inv.ma_phieu_kiem_ke}\`;
                    document.getElementById('detail-inv-date').textContent = inv.ngay_kiem_ke ? new Date(inv.ngay_kiem_ke).toLocaleString('vi-VN') : 'Chưa có';
                    document.getElementById('detail-inv-auditor').textContent = \`Nhân viên ID: \${inv.ma_nhan_vien}\`;
                    document.getElementById('detail-inv-note').textContent = inv.ghi_chu || 'Không có ghi chú';
                    
                    // Render status badge in detail
                    let statusHtml = '';
                    if (inv.trang_thai === 'da_duyet') {
                        statusHtml = '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-black">✅ Đã phê duyệt cân kho</span>';
                        document.getElementById('detail-inv-approved-box').classList.remove('hidden');
                        document.getElementById('detail-inv-approve-date').textContent = inv.ngay_duyet ? new Date(inv.ngay_duyet).toLocaleString('vi-VN') : 'N/A';
                    } else if (inv.trang_thai === 'hoan_thanh') {
                        statusHtml = '<span class="bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1 rounded-full text-xs font-black">⏳ Hoàn thành đếm - Chờ duyệt</span>';
                        document.getElementById('detail-inv-approved-box').classList.add('hidden');
                    } else {
                        statusHtml = '<span class="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-black">📝 Đang kiểm kê nháp</span>';
                        document.getElementById('detail-inv-approved-box').classList.add('hidden');
                    }
                    document.getElementById('detail-inv-status').innerHTML = statusHtml;
                    
                    // Render table chi tiết đối chiếu
                    const tbody = document.getElementById('detail-inv-table-body');
                    tbody.innerHTML = (inv.products || []).map(p => {
                        const diff = p.so_luong_thuc_te - p.so_luong_he_thong;
                        const diffText = diff > 0 ? \`+\${diff}\` : diff;
                        const diffColor = diff > 0 ? 'text-green-600 font-extrabold' : (diff < 0 ? 'text-red-600 font-extrabold' : 'text-slate-500');
                        
                        // Icon mapping based on Step 4
                        let statusIcon = '⚖️ Khớp';
                        if (diff < 0) statusIcon = '📉 Thiếu - Thất thoát';
                        else if (diff > 0) statusIcon = '📈 Thừa - Tăng tồn';
                        
                        if (p.ly_do_chenh_lech && p.ly_do_chenh_lech.includes('bảo hành')) {
                            statusIcon = '🔧 Lỗi -> Bảo hành';
                        }
                        
                        return \`
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-4 py-3 font-mono text-slate-500 font-bold">\${p.ma_san_pham_code || 'N/A'}</td>
                                <td class="px-4 py-3 font-bold text-slate-800">\${p.ten_san_pham || 'Sản phẩm đã bị xóa'}</td>
                                <td class="px-4 py-3 text-right font-medium text-slate-700">\${p.so_luong_he_thong}</td>
                                <td class="px-4 py-3 text-right font-bold text-slate-800">\${p.so_luong_thuc_te}</td>
                                <td class="px-4 py-3 text-right font-bold \${diffColor}">\${diffText}</td>
                                <td class="px-4 py-3 font-bold text-slate-700">\${statusIcon}</td>
                                <td class="px-4 py-3 text-xs text-slate-500 italic">\${p.ghi_chu || ''}</td>
                            </tr>
                        \`;
                    }).join('');
                    
                    // Update totals
                    const totalDiff = inv.tong_chenh_lech;
                    const diffText = totalDiff > 0 ? \`+\${totalDiff}\` : totalDiff;
                    const diffColor = totalDiff > 0 ? 'text-green-600' : (totalDiff < 0 ? 'text-red-600' : 'text-slate-800');
                    
                    document.getElementById('detail-inv-total-items').textContent = inv.tong_san_pham;
                    document.getElementById('detail-inv-total-diff').textContent = diffText;
                    document.getElementById('detail-inv-total-diff').className = \`text-lg font-extrabold \${diffColor}\`;
                    document.getElementById('detail-inv-total-value').textContent = formatPrice(inv.gia_tri_chenh_lech);
                    
                    // Render action buttons
                    const actionContainer = document.getElementById('detail-inv-actions-container');
                    let actionHtml = \`
                        <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95">
                            🖨️ In phiếu kiểm
                        </button>
                    \`;
                    
                    if (inv.trang_thai === 'hoan_thanh') {
                        actionHtml += \`
                            <button onclick="approveInventory(\${inv.ma_phieu_kiem_ke}); closeInventoryDetailModal();" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-black text-sm shadow-lg ml-2 transition-all hover:scale-105 active:scale-95">
                                🛡️ Duyệt & Cân kho tự động (Bước 5)
                            </button>
                        \`;
                    }
                    actionContainer.innerHTML = actionHtml;
                    
                    // Display detailed modal
                    document.getElementById('inventory-detail-modal').style.display = 'flex';
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (err) {
                console.error('Fetch detail error:', err);
                alert('Có lỗi xảy ra: ' + err.message);
            }
        };

        window.closeInventoryDetailModal = function() {
            document.getElementById('inventory-detail-modal').style.display = 'none';
        };

        // Approve inventory and balance stock counts (Step 5)
        window.approveInventory = async function(id) {
            if (!confirm('Bạn có chắc chắn muốn PHÊ DUYỆT phiếu kiểm kê này?\\nHành động này sẽ cập nhật trực tiếp số lượng tồn kho của các sản phẩm trên hệ thống về số lượng thực tế đã đếm!')) {
                return;
            }
            
            try {
                const response = await fetch(\`\${API_URL}/admin/inventories/\${id}/approve\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${adminToken}\`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                console.log('Approve inventory result:', result);
                
                if (result.success) {
                    alert('🎉 Phê duyệt & Cân kho thành công! Số lượng sản phẩm đã được đồng bộ chuẩn xác.');
                    loadInventories();
                } else {
                    alert('Lỗi duyệt phiếu: ' + result.message);
                }
            } catch (error) {
                console.error('Approve error:', error);
                alert('Có lỗi xảy ra khi phê duyệt!');
            }
        };

        // Delete inventory sheet
        window.deleteInventory = async function(id) {
            if (!confirm('Bạn có chắc chắn muốn xóa phiếu kiểm kê này? Dữ liệu chi tiết đối chiếu sẽ bị xóa vĩnh viễn.')) {
                return;
            }
            
            try {
                const response = await fetch(\`\${API_URL}/admin/inventories/\${id}\`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': \`Bearer \${adminToken}\`
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(result.message || 'Xóa phiếu kiểm kê thành công!');
                    loadInventories();
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (error) {
                console.error('Delete error:', error);
                alert('Có lỗi xảy ra khi xóa phiếu kiểm kê!');
            }
        };
`;

const updatedContent = content.substring(0, startIndex) + inventoryJsContent + content.substring(endIndex);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('✅ JS programmatically updated successfully!');
process.exit(0);
