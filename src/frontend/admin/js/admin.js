        const API_URL = window.location.port === '3000'
            ? window.location.origin + '/api'
            : 'http://localhost:3000/api';
        let adminToken = '';
        let adminUser = null;

        function showNotification(message, type = 'info') {
            const normalizedType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
            const colors = {
                success: 'bg-emerald-600',
                error: 'bg-red-600',
                warning: 'bg-amber-500',
                info: 'bg-blue-600'
            };
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            let container = document.getElementById('admin-notification-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'admin-notification-container';
                container.className = 'fixed top-5 right-5 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `${colors[normalizedType]} text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 transition-all duration-300 translate-x-4 opacity-0`;
            toast.innerHTML = `
                <span class="shrink-0 text-lg">${icons[normalizedType]}</span>
                <span class="flex-1 text-sm font-semibold leading-6">${message || 'Có thông báo mới'}</span>
                <button type="button" class="text-white/80 hover:text-white text-xl leading-none px-1" aria-label="Đóng thông báo">&times;</button>
            `;

            const closeToast = () => {
                toast.classList.add('translate-x-4', 'opacity-0');
                setTimeout(() => toast.remove(), 250);
            };

            toast.querySelector('button')?.addEventListener('click', closeToast);
            container.appendChild(toast);
            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-4', 'opacity-0');
            });
            setTimeout(closeToast, normalizedType === 'error' ? 5000 : 3200);
        }

        const showToast = showNotification;

        // Kiểm tra xác thực ngay lập tức - chạy trước khi DOM load
        (function immediateAuthCheck() {
            console.log('🔐 [Admin] === KIỂM TRA XÁC THỰC ===');
            const token = localStorage.getItem('admin_token');
            const userStr = localStorage.getItem('admin_user');
            
            console.log('🔐 [Admin] admin_token:', token ? 'Có (' + token.substring(0, 20) + '...)' : 'KHÔNG CÓ');
            console.log('🔐 [Admin] admin_user:', userStr);
            
            let user = null;
            try {
                user = JSON.parse(userStr);
                console.log('🔐 [Admin] Parsed user:', user);
                console.log('🔐 [Admin] Vai trò:', user?.vai_tro);
            } catch (e) {
                console.error('❌ [Admin] Lỗi parse user:', e);
            }
            
            if (!token || !user || (user.vai_tro !== 'admin' && user.vai_tro !== 'nhan_vien')) {
                console.error('❌ [Admin] Không có quyền truy cập!');
                console.log('❌ [Admin] Token exists:', !!token);
                console.log('❌ [Admin] User exists:', !!user);
                console.log('❌ [Admin] Is admin/employee:', user?.vai_tro === 'admin' || user?.vai_tro === 'nhan_vien');
                
                // Redirect ngay lập tức nếu không có quyền
                window.location.href = 'admin-login.html?message=' + encodeURIComponent('Vui lòng đăng nhập với tài khoản hợp lệ');
            } else {
                console.log('✅ [Admin] Xác thực cơ bản thành công');
            }
        })();

        // Auth
        document.addEventListener('DOMContentLoaded', checkAuth);

        async function checkAuth() {
            console.log('🔐 [Admin] === KIỂM TRA XÁC THỰC SERVER ===');
            adminToken = localStorage.getItem('admin_token');
            adminUser = JSON.parse(localStorage.getItem('admin_user') || 'null');

            console.log('🔐 [Admin] Token:', adminToken ? 'Có' : 'KHÔNG');
            console.log('🔐 [Admin] User:', adminUser);

            // Kiểm tra lại lần nữa
            if (!adminToken || !adminUser || (adminUser.vai_tro !== 'admin' && adminUser.vai_tro !== 'nhan_vien')) {
                console.error('❌ [Admin] Xác thực cục bộ thất bại');
                redirectToLogin('Vui lòng đăng nhập với tài khoản hợp lệ');
                return;
            }

            try {
                console.log('🔐 [Admin] Gọi API verify-admin...');
                const res = await fetch(`${API_URL}/auth/verify-admin`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                console.log('🔐 [Admin] Response status:', res.status);
                
                if (!res.ok) {
                    const errorData = await res.json();
                    console.error('❌ [Admin] Server từ chối:', errorData);
                    throw new Error('Token invalid');
                }
                
                const data = await res.json();
                console.log('✅ [Admin] Xác thực thành công:', data);
                
                // Xác thực thành công - hiển thị nội dung admin
                const adminContent = document.getElementById('admin-content');
                adminContent.style.cssText = 'display: flex !important; min-height: 100vh;';
                document.getElementById('loading-overlay').style.display = 'none';
                
                // Hiển thị tên hiển thị
                document.getElementById('admin-name').textContent = adminUser.ho_ten || adminUser.ten_dang_nhap || adminUser.email;
                
                // Hiển thị chức vụ thực tế
                const roleEl = document.getElementById('admin-role-text');
                if (roleEl) {
                    roleEl.textContent = adminUser.chuc_vu || (adminUser.vai_tro === 'admin' ? 'Quản trị viên' : 'Nhân viên');
                }
                
                // Áp dụng hệ thống phân quyền UI cho nhân viên
                await applyPermissionsToUI();
                
                console.log('✅ [Admin] Đã hiển thị nội dung admin và áp dụng phân quyền');
                
                // Hiển thị avatar
                const avatarEl = document.getElementById('admin-avatar');
                if (adminUser.hinh_anh) {
                    const avatarUrl = adminUser.hinh_anh.startsWith('http') ? adminUser.hinh_anh : window.location.origin + adminUser.hinh_anh;
                    avatarEl.innerHTML = `<img src="${avatarUrl}" referrerpolicy="no-referrer" class="w-full h-full object-cover rounded-full" alt="Avatar" onerror="this.parentElement.innerHTML='👤'">`;
                }
                
                initializeDateFilter();
                // RESTORE PERSISTED STATE
                if (typeof restoreAdminSessionState === 'function') {
                    restoreAdminSessionState();
                } else {
                    loadDashboard();
                }
                loadCategoriesForFilter();
            } catch (e) {
                console.error('❌ [Admin] Lỗi xác thực:', e);
                redirectToLogin('Phiên đăng nhập hết hạn');
            }
        }

        // Hàm ẩn/hiện các chức năng trên sidebar dựa trên phân quyền của nhân viên
        async function applyPermissionsToUI() {
            // Nếu là admin tối cao (vai_tro === 'admin'), hiển thị toàn bộ
            if (adminUser?.vai_tro === 'admin') {
                console.log('👑 [Permissions] Admin bypass - showing all sections');
                return;
            }
            
            console.log('🔐 [Permissions] Staff login detected - applying permission filters...');
            
            // Tải phân quyền nhân viên từ server
            const loaded = await window.permissionChecker.load();
            if (!loaded) {
                console.error('❌ [Permissions] Failed to load permissions for employee');
                return;
            }
            
            // Bản đồ ánh xạ giữa data-section của Sidebar và Quyền hệ thống
            const permissionMapping = {
                'financial-report': 'view_financial',
                'daily-expenses': 'view_financial',
                'expense-types': 'view_financial',
                'pos-machines': 'create_orders',
                'orders': 'view_orders',
                'order-placement': 'create_orders',
                'shipping-management': 'view_settings',
                'categories': 'view_products',
                'products-phone': 'view_products',
                'products-accessory': 'view_products',
                'products': 'view_products',
                'receiving': 'view_warehouse',
                'inventory': 'view_warehouse',
                'suppliers': 'view_warehouse',
                'components': 'view_warehouse',
                'employees': 'view_employees',
                'shifts': 'view_employees',
                'attendance': 'view_employees',
                'payroll': 'view_employees',
                'online-customers': 'view_customers',
                'store-customers': 'view_customers',
                'personalization': 'view_customers',
                'hybrid-config': 'view_settings',
                'popularity-stats': 'view_reports',
                'warranty': 'view_settings',
                'chatbot': 'view_settings'
            };

            // 1. Lọc các mục menu sidebar
            const sidebarItems = document.querySelectorAll('.sidebar-item');
            sidebarItems.forEach(item => {
                const section = item.getAttribute('data-section');
                const reqPermission = permissionMapping[section];
                
                if (reqPermission) {
                    if (window.permissionChecker.has(reqPermission)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                        // Nếu nhân viên đang ở trang bị ẩn, chuyển hướng về dashboard mặc định
                        if (item.classList.contains('active')) {
                            item.classList.remove('active');
                            const dashboardBtn = document.querySelector('.sidebar-item[data-section="dashboard"]');
                            if (dashboardBtn) dashboardBtn.classList.add('active');
                            showSection('dashboard');
                        }
                    }
                }
            });

            // 2. Ẩn các nhóm phân mục (tiêu đề <p>) nếu tất cả các phần tử bên trong nó đều bị ẩn
            const nav = document.querySelector('aside nav');
            if (nav) {
                let currentHeader = null;
                let hasVisibleItems = false;
                
                Array.from(nav.children).forEach(child => {
                    if (child.tagName === 'P' || child.tagName === 'p') {
                        // Cập nhật trạng thái hiển thị của nhóm trước đó trước khi đổi nhóm
                        if (currentHeader) {
                            currentHeader.style.display = hasVisibleItems ? '' : 'none';
                        }
                        currentHeader = child;
                        hasVisibleItems = false;
                    } else if (child.tagName === 'A' || child.tagName === 'a') {
                        if (child.style.display !== 'none') {
                            hasVisibleItems = true;
                        }
                    }
                });
                
                // Cập nhật hiển thị cho nhóm cuối cùng
                if (currentHeader) {
                    currentHeader.style.display = hasVisibleItems ? '' : 'none';
                }
            }
            
            console.log('✅ [Permissions] Sidebar filtered successfully');
        }

        function redirectToLogin(msg) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            if (typeof clearAllPersistenceData === 'function') clearAllPersistenceData();
            window.location.href = 'admin-login.html?message=' + encodeURIComponent(msg);
        }

        function handleLogout() {
            if (confirm('Đăng xuất?')) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                if (typeof clearAllPersistenceData === 'function') clearAllPersistenceData();
                window.location.href = 'admin-login.html';
            }
        }

        // Navigation
        function showSection(section) {
            let actualSection = section;
            let categoryFilterValue = null;

            if (section === 'products-phone') {
                actualSection = 'products';
                categoryFilterValue = 'phone';
            } else if (section === 'products-accessory') {
                actualSection = 'products';
                categoryFilterValue = 'accessory';
            } else if (section === 'online-customers') {
                actualSection = 'users';
            } else if (section === 'store-customers') {
                actualSection = 'store-customers';
            }

            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
            
            const sectionElement = document.getElementById('section-' + actualSection);
            const sidebarElement = document.querySelector(`[data-section="${section}"]`);
            
            if (sectionElement) {
                sectionElement.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'auto' });
            }
            
            const globalHeader = document.querySelector('main > header') || document.querySelector('header');
            if (globalHeader) {
                if (actualSection === 'warranty') {
                    globalHeader.classList.add('hidden');
                } else {
                    globalHeader.classList.remove('hidden');
                }
            }
            if (sidebarElement) {
                sidebarElement.classList.add('active');
                // Tự động cuộn thanh điều hướng phụ (Sidebar nav) mượt mà đến mục đang hoạt động
                setTimeout(() => {
                    const nav = sidebarElement.closest('nav');
                    if (!nav) return;
                    const itemTop = sidebarElement.offsetTop;
                    const itemBottom = itemTop + sidebarElement.offsetHeight;
                    const viewTop = nav.scrollTop;
                    const viewBottom = viewTop + nav.clientHeight;
                    if (itemTop < viewTop) {
                        nav.scrollTo({ top: Math.max(itemTop - 12, 0), behavior: 'smooth' });
                    } else if (itemBottom > viewBottom) {
                        nav.scrollTo({ top: itemBottom - nav.clientHeight + 12, behavior: 'smooth' });
                    }
                }, 150);
            }

            const titles = { 
                dashboard: 'Báo cáo bán hàng',
                'revenue-report': 'Báo cáo Doanh thu',
                'expense-report': 'Báo cáo Chi phí',
                'profit-report': 'Báo cáo Lợi nhuận',
                'daily-expenses': 'Chi phí hàng ngày',
                'expense-types': 'Quản lý loại chi phí',
                'pos-machines': 'Bán hàng tại quầy',
                products: 'Quản lý sản phẩm', 
                'products-phone': 'Danh sách Điện thoại', 
                'products-accessory': 'Danh sách Phụ kiện', 
                categories: 'Quản lý danh mục',
                inventory: '📋 Kiểm kê sản phẩm',
                suppliers: '🏭 Quản lý nhà cung cấp',
                components: '🔧 Quản lý linh kiện',
                receiving: '📥 Nhập kho (Nhận hàng)', 
                orders: 'Quản lý đơn hàng',
                'order-placement': 'Quản lý đặt hàng',
                users: 'Quản lý khách hàng', 
                'online-customers': 'Quản lý tài khoản khách hàng',
                'store-customers': 'Quản lý khách hàng tại cửa hàng',
                personalization: 'Quản lý Sở thích & Cảm xúc', 
                news: 'Quản lý tin tức', 
                articles: 'Quản lý bài viết', 
                reviews: 'Quản lý đánh giá', 
                promotions: 'Quản lý khuyến mãi',
                'flash-sale': 'Flash Sale - Giờ Vàng Giá Sốc',
                contacts: 'Quản lý liên hệ',
                employees: '👨‍💼 Quản lý nhân viên',
                shifts: '⏰ Quản lý ca làm việc',
                attendance: '✅ Điểm danh & Chấm công',
                payroll: '💵 Tính lương nhân viên',
                'shipping-management': '📦 Quản lý phí ship',
                'hybrid-config': '⚙️ Cấu hình gợi ý Hybrid',
                'popularity-stats': '🔥 Thống kê độ phổ biến',
                chatbot: 'Quản lý Chatbot RAG'
            };
            
            const subtitles = {
                dashboard: 'Tổng quan hoạt động kinh doanh',
                'revenue-report': 'Thống kê số tiền thu được từ việc bán hàng theo tháng',
                'expense-report': 'Thống kê số tiền chi ra để nhập hàng và mua vào theo tháng',
                'profit-report': 'Lợi nhuận = Doanh thu − Chi phí, theo dõi kết quả kinh doanh',
                'daily-expenses': 'Ghi nhận và theo dõi chi phí hàng ngày',
                'expense-types': 'Quản lý danh mục loại chi phí',
                'pos-machines': 'Hệ thống lập hóa đơn và thanh toán trực tiếp',
                products: 'Quản lý danh sách sản phẩm',
                'products-phone': 'Quản lý và xem danh sách các sản phẩm Điện thoại di động',
                'products-accessory': 'Quản lý và xem danh sách các sản phẩm Phụ kiện công nghệ',
                categories: 'Quản lý danh mục sản phẩm',
                inventory: 'Quy trình đối chiếu hệ thống - thực tế & cân bằng tồn kho tự động',
                suppliers: 'Theo dõi thông tin liên hệ, nguồn hàng và trạng thái hợp tác của nhà cung cấp',
                components: 'Quản lý kho linh kiện thay thế, giá nhập bán, vị trí kệ và tương thích thiết bị',
                receiving: 'Quản lý danh sách nhập kho, theo dõi nguồn cung và hàng hóa',
                orders: 'Theo dõi và xử lý đơn hàng',
                'order-placement': 'Tạo và theo dõi đơn đặt hàng trước',
                users: 'Quản lý thông tin khách hàng',
                'online-customers': 'Quản lý thông tin khách hàng đăng ký tài khoản trực tuyến',
                'store-customers': 'Quản lý thông tin mua hàng và kiểm tra thời hạn bảo hành của khách mua tại cửa hàng',
                personalization: 'Phân tích sở thích của khách hàng từ Khảo sát, Đánh giá, Tìm kiếm và Chatbot',
                employees: 'Xem danh sách, thêm sửa thông tin nhân sự và cập nhật trạng thái làm việc',
                shifts: 'Cấu hình khung giờ làm việc cố định và hệ số lương tăng ca',
                attendance: 'Ghi nhận check-in, check-out và phân loại trạng thái chuyên cần hàng ngày',
                payroll: 'Tính toán lương tự động dựa trên ngày công thực tế, phụ cấp, thưởng và khấu trừ',
                'shipping-management': 'Cấu hình phí vận chuyển, giảm giá và quản lý chi tiết các vùng giao hàng',
                'hybrid-config': 'Quản lý cấu hình trọng số thuật toán kết hợp CF, CB & POP',
                'popularity-stats': 'Hệ thống thống kê & xếp hạng sản phẩm phổ biến theo tương tác',
                chatbot: 'Xem và quản lý tài liệu RAG, cấu hình và lịch sử chat của hệ thống AI'
            };
            
            document.getElementById('page-title').textContent = titles[section] || section;
            document.getElementById('page-subtitle').textContent = subtitles[section] || '';
            
            // Hide all header controls
            document.getElementById('header-controls-default').classList.add('hidden');
            document.getElementById('header-controls-financial').classList.add('hidden');
            
            // Show appropriate controls
            const financialSections = ['revenue-report', 'expense-report', 'profit-report', 'financial-report'];
            if (financialSections.includes(actualSection)) {
                document.getElementById('header-controls-financial').classList.remove('hidden');
            } else {
                document.getElementById('header-controls-default').classList.remove('hidden');
            }

            if (actualSection === 'dashboard') {
                initializeDateFilter();
                loadDashboard();
            }
            else if (actualSection === 'revenue-report')  { initFinancialMonthYear(); loadRevenueReport(); }
            else if (actualSection === 'expense-report')  { initFinancialMonthYear(); loadExpenseReport(); }
            else if (actualSection === 'profit-report')   { initFinancialMonthYear(); loadProfitReport(); }
            else if (actualSection === 'financial-report'){ initFinancialMonthYear(); loadFinancialReport(); }
            else if (actualSection === 'daily-expenses') loadDailyExpenses();

            else if (actualSection === 'expense-types') loadExpenseTypes();
            else if (actualSection === 'pos-machines') loadPOSMachines();
            else if (actualSection === 'order-placement') loadPreOrders();
            else if (actualSection === 'receiving') loadReceivings();
            else if (actualSection === 'inventory') loadInventories();
            else if (actualSection === 'products') {
                // Ensure categories are loaded first so we have dynamic IDs
                loadCategoriesForFilter().then(() => {
                    const filterSelect = document.getElementById('product-category-filter');
                    if (filterSelect) {
                        if (categoryFilterValue === 'phone') {
                            const opt = Array.from(filterSelect.options).find(o => 
                                o.text.toLowerCase().includes('điện thoại') || 
                                o.text.toLowerCase().includes('phone') ||
                                o.text.toLowerCase().includes('dđ')
                            );
                            filterSelect.value = opt ? opt.value : '';
                        } else if (categoryFilterValue === 'accessory') {
                            const opt = Array.from(filterSelect.options).find(o => 
                                o.text.toLowerCase().includes('phụ kiện') || 
                                o.text.toLowerCase().includes('accessory') ||
                                o.text.toLowerCase().includes('pk')
                            );
                            filterSelect.value = opt ? opt.value : '';
                        } else {
                            filterSelect.value = '';
                        }
                    }
                    loadProducts();
                });
            }
            else if (actualSection === 'categories') loadCategories();
            else if (actualSection === 'suppliers') loadAdminSuppliers();
            else if (actualSection === 'components') loadAdminComponents();
            else if (actualSection === 'orders') loadOrders();
            else if (actualSection === 'users') loadUsers();
            else if (actualSection === 'store-customers') loadStoreCustomers();
            else if (actualSection === 'personalization') loadPersonalization();
            else if (actualSection === 'news') loadNews();
            else if (actualSection === 'articles') loadArticles();
            else if (actualSection === 'reviews') loadReviews();
            else if (actualSection === 'promotions') loadPromotions();
            else if (actualSection === 'flash-sale') loadFlashSales();
            else if (actualSection === 'employees') loadEmployees();
            else if (actualSection === 'shifts') loadShifts();
            else if (actualSection === 'attendance') {
                const dateInput = document.getElementById('att-date-filter');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                loadAttendance();
            }
            else if (actualSection === 'payroll') {
                const now = new Date();
                const monthSelect = document.getElementById('pay-month-filter');
                const yearSelect = document.getElementById('pay-year-filter');
                if (monthSelect) monthSelect.value = now.getMonth() + 1;
                if (yearSelect) yearSelect.value = now.getFullYear();
                loadPayroll();
            }
            else if (actualSection === 'shipping-management') {
                if (typeof switchShippingTab === 'function') {
                    switchShippingTab('zones');
                } else if (typeof loadZones === 'function') {
                    loadZones();
                }
            }
            else if (actualSection === 'hybrid-config') {
                loadRecommendationConfig();
                loadPreviewUsers();
                setTimeout(initDonutChart, 300); // Init donut after config loads
            }
            else if (actualSection === 'popularity-stats') {
                loadAlgorithmData();
            }
            else if (actualSection === 'chatbot') {
                loadChatbotManager();
            }
            else if (actualSection === 'warranty') {
                switchWarrantyTab('tickets');
            }
        }

        // Helpers
        function formatPrice(price) { return new Intl.NumberFormat('vi-VN').format(price || 0) + 'đ'; }
        // Placeholder image dạng SVG data URI - không cần kết nối internet
        const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3EẢnh%3C/text%3E%3C/svg%3E";
        function getImageUrl(path) {
            if (!path) return PLACEHOLDER_IMG;
            if (path.startsWith('http')) return path;
            return window.location.origin + '/' + (path.startsWith('/') ? path.slice(1) : path);
        }
        function formatDate(date) { return new Date(date).toLocaleDateString('vi-VN'); }
        function getStatusBadge(status) {
            const map = {
                'dang_xu_ly': '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">Đang xử lý</span>',
                'dang_giao': '<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">Đang giao</span>',
                'hoan_thanh': '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Hoàn thành</span>',
                'da_huy': '<span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">Đã hủy</span>'
            };
            return map[status] || status;
        }
        
        // Hiển thị badge cọc 50% cho đơn COD
        function getCODDepositBadge(paymentMethod, totalAmount) {
            if (paymentMethod === 'COD') {
                const depositAmount = Math.round(totalAmount * 0.5);
                const remainingAmount = totalAmount - depositAmount;
                return `<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs ml-1" title="Đã cọc: ${formatPrice(depositAmount)} - Còn lại: ${formatPrice(remainingAmount)}">💰 Cọc 50%</span>`;
            }
            return '';
        }
        
        // Format thông tin thanh toán COD
        function getCODPaymentInfo(paymentMethod, totalAmount) {
            if (paymentMethod === 'COD') {
                const depositAmount = Math.round(totalAmount * 0.5);
                const remainingAmount = totalAmount - depositAmount;
                return {
                    isDeposit: true,
                    depositAmount: depositAmount,
                    remainingAmount: remainingAmount
                };
            }
            return { isDeposit: false };
        }
        function getNextStatusButton(orderId, currentStatus) {
            const flow = {
                'dang_xu_ly': { next: 'dang_giao', label: '🚚 Giao hàng', cls: 'bg-purple-500 text-white' },
                'dang_giao': { next: 'hoan_thanh', label: '✅ Hoàn thành', cls: 'bg-green-500 text-white' },
                'hoan_thanh': null, 'da_huy': null
            };
            const nextStep = flow[currentStatus];
            if (!nextStep) return '<span class="text-gray-400 text-sm">Hoàn tất</span>';
            return `<button onclick="updateOrderStatus(${orderId}, '${nextStep.next}')" class="px-3 py-1 rounded text-sm ${nextStep.cls}">${nextStep.label}</button>
                    <button onclick="updateOrderStatus(${orderId}, 'da_huy')" class="px-2 py-1 rounded text-sm bg-red-100 text-red-600">❌</button>`;
        }

        async function apiCall(endpoint, method = 'GET', body = null) {
            const options = { method, headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(`${API_URL}${endpoint}`, options);
            return res.json();
        }

        // Dashboard
        let charts = {};
        let currentStartDate = '';
        let currentEndDate = '';
        let currentQuickFilter = 'thisYear';

        // Format date to YYYY-MM-DD
        function formatDateISO(date) {
            return date.toISOString().split('T')[0];
        }

        // Get date range for quick filters
        function getDateRangeForFilter(filterType) {
            const today = new Date();
            let startDate, endDate;
            
            switch(filterType) {
                case 'today':
                    startDate = endDate = formatDateISO(today);
                    break;
                case 'yesterday':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    startDate = endDate = formatDateISO(yesterday);
                    break;
                case '7days':
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                    startDate = formatDateISO(sevenDaysAgo);
                    endDate = formatDateISO(today);
                    break;
                case '30days':
                    const thirtyDaysAgo = new Date(today);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                    startDate = formatDateISO(thirtyDaysAgo);
                    endDate = formatDateISO(today);
                    break;
                case 'thisMonth':
                    startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
                    endDate = formatDateISO(today);
                    break;
                case 'lastMonth':
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                    startDate = formatDateISO(lastMonth);
                    endDate = formatDateISO(lastDayLastMonth);
                    break;
                case 'thisQuarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
                    startDate = formatDateISO(quarterStart);
                    endDate = formatDateISO(today);
                    break;
                case 'thisYear':
                    startDate = `${today.getFullYear()}-01-01`;
                    endDate = formatDateISO(today);
                    break;
                case 'lastYear':
                    const lastYear = today.getFullYear() - 1;
                    startDate = `${lastYear}-01-01`;
                    endDate = `${lastYear}-12-31`;
                    break;
                default:
                    startDate = `${today.getFullYear()}-01-01`;
                    endDate = formatDateISO(today);
            }
            return { startDate, endDate };
        }

        // Get filter label for display
        function getFilterLabel(filterType) {
            const labels = {
                'today': 'Hôm nay',
                'yesterday': 'Hôm qua',
                '7days': '7 ngày qua',
                '30days': '30 ngày qua',
                'thisMonth': 'Tháng này',
                'lastMonth': 'Tháng trước',
                'thisQuarter': 'Quý này',
                'thisYear': 'Năm nay',
                'lastYear': 'Năm trước',
                'custom': 'Tùy chỉnh'
            };
            return labels[filterType] || 'Tùy chỉnh';
        }

        // Set quick filter
        function setQuickFilter(filterType) {
            currentQuickFilter = filterType;
            const { startDate, endDate } = getDateRangeForFilter(filterType);
            currentStartDate = startDate;
            currentEndDate = endDate;
            
            // Update date inputs
            document.getElementById('filter-start-date').value = startDate;
            document.getElementById('filter-end-date').value = endDate;
            
            // Update button styles
            document.querySelectorAll('.quick-filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
            });
            const activeBtn = document.querySelector(`.quick-filter-btn[data-filter="${filterType}"]`);
            if (activeBtn) {
                activeBtn.classList.add('bg-blue-500', 'text-white');
            }
            
            // Update filter label
            document.getElementById('filter-label').textContent = getFilterLabel(filterType);
            
            loadDashboard();
        }

        // On date range change from inputs
        function onDateRangeChange() {
            // Clear quick filter selection when manually changing dates
            document.querySelectorAll('.quick-filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
            });
            currentQuickFilter = 'custom';
        }

        // Apply date filter from inputs
        function applyDateFilter() {
            const startInput = document.getElementById('filter-start-date').value;
            const endInput = document.getElementById('filter-end-date').value;
            
            if (!startInput || !endInput) {
                alert('Vui lòng chọn cả ngày bắt đầu và ngày kết thúc');
                return;
            }
            
            if (new Date(startInput) > new Date(endInput)) {
                alert('Ngày bắt đầu không được lớn hơn ngày kết thúc');
                return;
            }
            
            currentStartDate = startInput;
            currentEndDate = endInput;
            currentQuickFilter = 'custom';
            
            // Update filter label with custom range
            const startFormatted = new Date(startInput).toLocaleDateString('vi-VN');
            const endFormatted = new Date(endInput).toLocaleDateString('vi-VN');
            document.getElementById('filter-label').textContent = `${startFormatted} - ${endFormatted}`;
            
            loadDashboard();
        }

        // Reset all filters
        function resetAllFilters() {
            setQuickFilter('thisYear');
        }

        // Initialize date filter on page load
        function initializeDateFilter() {
            const { startDate, endDate } = getDateRangeForFilter('thisYear');
            currentStartDate = startDate;
            currentEndDate = endDate;
            document.getElementById('filter-start-date').value = startDate;
            document.getElementById('filter-end-date').value = endDate;
            
            // Set max date to today
            const today = formatDateISO(new Date());
            document.getElementById('filter-start-date').max = today;
            document.getElementById('filter-end-date').max = today;
        }

        async function loadDashboard() {
            try {
                let queryParams = [];
                if (currentStartDate) queryParams.push(`startDate=${currentStartDate}`);
                if (currentEndDate) queryParams.push(`endDate=${currentEndDate}`);
                const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
                
                const data = await apiCall('/admin/dashboard' + queryString);
                if (!data.success) return;
                const s = data.data.stats;
                document.getElementById('stat-revenue').textContent = formatPrice(s.total_revenue);
                document.getElementById('stat-orders').textContent = s.total_orders;
                document.getElementById('stat-customers').textContent = s.total_customers;
                document.getElementById('stat-products-sold').textContent = s.total_sold || 0;

                // Recent orders
                const ordersHtml = data.data.recent_orders.slice(0, 5).map(o => {
                    const codInfo = getCODPaymentInfo(o.phuong_thuc_thanh_toan, o.tong_tien);
                    const paymentBadge = o.phuong_thuc_thanh_toan === 'COD' 
                        ? `<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs">COD-Cọc50%</span>`
                        : `<span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">${o.phuong_thuc_thanh_toan || 'Đã TT'}</span>`;
                    const remainingInfo = codInfo.isDeposit 
                        ? `<p class="text-xs text-orange-600">Còn: ${formatPrice(codInfo.remainingAmount)}</p>` 
                        : '';
                    return `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                        <div>
                            <p class="font-semibold">#${o.ma_don_hang} - ${o.ten_dang_nhap || 'Khách'}</p>
                            <p class="text-xs text-gray-500">${formatDate(o.ngay_tao)}</p>
                            ${paymentBadge}
                        </div>
                        <div class="text-right flex flex-col gap-1">
                            <p class="font-bold text-green-600">${formatPrice(o.tong_tien)}</p>
                            ${remainingInfo}
                            <div>${getStatusBadge(o.trang_thai)}</div>
                        </div>
                    </div>
                `}).join('');
                document.getElementById('recent-orders').innerHTML = ordersHtml || '<p class="text-gray-500 text-center py-4">Chưa có đơn hàng</p>';

                // Top products with horizontal bars
                const maxSold = Math.max(...data.data.top_products.map(p => p.total_sold), 1);
                const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
                const productsHtml = data.data.top_products.map((p, i) => `
                    <div class="flex items-center gap-2 text-sm mb-2">
                        <span class="w-32 truncate font-medium text-gray-700" title="${p.ten_san_pham}">${p.ten_san_pham}</span>
                        <div class="flex-1 bg-gray-200 rounded-full h-5 relative">
                            <div class="h-5 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold" style="width: ${Math.max((p.total_sold/maxSold)*100, 15)}%; background: ${colors[i]}">
                                ${p.total_sold}
                            </div>
                        </div>
                    </div>
                `).join('');
                document.getElementById('top-products').innerHTML = productsHtml || '<p class="text-gray-500 text-center py-4">Chưa có dữ liệu</p>';

                // Slow moving products - Update Gauge Charts
                const slowProducts = data.data.slow_moving_products || [];
                updateSlowProductsGauges(slowProducts);

                // Draw charts với dữ liệu thực
                drawCharts(data.data);
            } catch (e) { console.error('Dashboard error:', e); }
        }

        // Function to update Gauge Charts for slow products
        function updateSlowProductsGauges(slowProducts) {
            const totalProducts = slowProducts.length;
            
            // Phân loại sản phẩm
            const needDiscount = slowProducts.filter(p => p.ton_kho >= 30).length; // Tồn kho cao - cần giảm giá
            const suggestFlashSale = slowProducts.filter(p => p.ton_kho >= 10).length; // Đề xuất flash sale
            
            // Tính giá trị so sánh (giả lập tuần trước)
            const lastWeekTotal = Math.max(0, totalProducts - Math.floor(Math.random() * 3));
            const lastWeekDiscount = Math.max(0, needDiscount - Math.floor(Math.random() * 2));
            const lastWeekFlashSale = Math.max(0, suggestFlashSale - Math.floor(Math.random() * 2));
            
            // Tính % dựa trên tổng số sản phẩm trong hệ thống (giả sử 100 SP)
            const totalProductsInSystem = 100;
            const percentTotal = Math.min(100, Math.round((totalProducts / totalProductsInSystem) * 100));
            const percentDiscount = totalProducts > 0 ? Math.round((needDiscount / totalProducts) * 100) : 0;
            const percentFlashSale = totalProducts > 0 ? Math.round((suggestFlashSale / totalProducts) * 100) : 0;
            
            // Arc length calculation (252 is full arc for new SVG)
            const arcLength = 252;
            
            // Update Gauge 1 - Tổng SP bán chậm
            document.getElementById('gauge-total-slow').textContent = totalProducts;
            document.getElementById('gauge-percent-total').textContent = percentTotal + '%';
            document.getElementById('gauge-arc-total').setAttribute('stroke-dasharray', `${(percentTotal / 100) * arcLength} ${arcLength}`);
            document.getElementById('stat-total-lastweek').textContent = lastWeekTotal + ' SP';
            
            // Update Gauge 2 - Cần giảm giá
            document.getElementById('gauge-need-discount').textContent = needDiscount;
            document.getElementById('gauge-percent-discount').textContent = percentDiscount + '%';
            document.getElementById('gauge-arc-discount').setAttribute('stroke-dasharray', `${(percentDiscount / 100) * arcLength} ${arcLength}`);
            document.getElementById('stat-discount-lastweek').textContent = lastWeekDiscount + ' SP';
            
            // Update Gauge 3 - Đề xuất Flash Sale
            document.getElementById('gauge-flash-sale').textContent = suggestFlashSale;
            document.getElementById('gauge-percent-flashsale').textContent = percentFlashSale + '%';
            document.getElementById('gauge-arc-flashsale').setAttribute('stroke-dasharray', `${(percentFlashSale / 100) * arcLength} ${arcLength}`);
            document.getElementById('stat-flash-lastweek').textContent = lastWeekFlashSale + ' SP';
            
            // Hàm cập nhật hiển thị xu hướng
            const updateTrendDisplay = (elementId, current, lastWeek) => {
                const el = document.getElementById(elementId);
                if (!el) return;
                
                const diff = current - lastWeek;
                let html = '';
                
                if (diff > 0) {
                    // Tăng = xấu (nhiều SP bán chậm hơn)
                    html = `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">↑ +${diff} SP</span>`;
                } else if (diff < 0) {
                    // Giảm = tốt (ít SP bán chậm hơn)
                    html = `<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded font-bold">↓ ${diff} SP</span>`;
                } else {
                    // Không đổi
                    html = `<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">→ Không đổi</span>`;
                }
                
                el.innerHTML = html;
            };
            
            updateTrendDisplay('stat-total-diff', totalProducts, lastWeekTotal);
            updateTrendDisplay('stat-discount-diff', needDiscount, lastWeekDiscount);
            updateTrendDisplay('stat-flash-diff', suggestFlashSale, lastWeekFlashSale);
        }

        function drawCharts(data) {
            console.log('drawCharts called with data:', data);
            // Kiểm tra data hợp lệ
            if (!data || !data.stats) {
                console.error('Invalid data for charts');
                return;
            }
            
            // Destroy existing charts safely
            Object.keys(charts).forEach(key => {
                if (charts[key] && typeof charts[key].destroy === 'function') {
                    try {
                        charts[key].destroy();
                    } catch(e) {
                        console.warn('Error destroying chart:', key, e);
                    }
                }
            });
            charts = {};

            // Global chart animation config
            const defaultAnimation = {
                duration: 500,
                easing: 'easeOutQuart'
            };

            // 1. Gauge Chart (KPI)
            const kpiPercent = Math.min(100, Math.round((data.stats.total_revenue / 500000000) * 100));
            document.getElementById('kpi-percent').textContent = kpiPercent + '%';
            const gaugeCtx = document.getElementById('gaugeChart').getContext('2d');
            charts.gauge = new Chart(gaugeCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [kpiPercent, 100 - kpiPercent],
                        backgroundColor: [kpiPercent >= 80 ? '#22c55e' : kpiPercent >= 50 ? '#f59e0b' : '#ef4444', '#e5e7eb'],
                        borderWidth: 0
                    }]
                },
                options: { 
                    circumference: 180, 
                    rotation: -90, 
                    cutout: '75%', 
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    animation: defaultAnimation
                }
            });

            // 2. Revenue Chart (Bar) - Dữ liệu thực từ database (12 tháng gần nhất)
            // Tạo labels cho 12 tháng gần nhất
            const now = new Date();
            const last12Months = [];
            const last12MonthsLabels = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                last12Months.push(monthKey);
                last12MonthsLabels.push(`T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`);
            }
            
            const revenueData = new Array(12).fill(0);
            const planData = new Array(12).fill(50000000);
            data.monthly_revenue?.forEach(m => {
                const idx = last12Months.indexOf(m.month);
                if (idx !== -1) {
                    revenueData[idx] = parseFloat(m.revenue) || 0;
                }
            });
            
            const revenueCtx = document.getElementById('revenueChart');
            const revenuePlaceholder = document.getElementById('revenueChartPlaceholder');
            const hasRevenueData = revenueData.some(v => v > 0);
            
            if (revenueCtx) {
                if (hasRevenueData) {
                    // Show canvas, hide placeholder
                    revenueCtx.style.display = 'block';
                    if (revenuePlaceholder) revenuePlaceholder.classList.add('hidden');
                    
                    charts.revenue = new Chart(revenueCtx, {
                        type: 'bar',
                        data: {
                            labels: last12MonthsLabels,
                            datasets: [
                                { label: 'Thực tế', data: revenueData, backgroundColor: '#3b82f6' },
                                { label: 'Kế hoạch', data: planData, backgroundColor: '#94a3b8' }
                            ]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false, 
                            plugins: { legend: { position: 'bottom' } }, 
                            scales: { y: { beginAtZero: true, ticks: { callback: v => (v/1000000) + 'tr' } } },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Show chart even with zero data to show the comparison with plan
                    revenueCtx.style.display = 'block';
                    if (revenuePlaceholder) revenuePlaceholder.classList.add('hidden');
                    
                    charts.revenue = new Chart(revenueCtx, {
                        type: 'bar',
                        data: {
                            labels: last12MonthsLabels,
                            datasets: [
                                { label: 'Thực tế', data: revenueData, backgroundColor: '#3b82f6' },
                                { label: 'Kế hoạch', data: planData, backgroundColor: '#94a3b8' }
                            ]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false, 
                            plugins: { legend: { position: 'bottom' } }, 
                            scales: { y: { beginAtZero: true, ticks: { callback: v => (v/1000000) + 'tr' } } },
                            animation: defaultAnimation
                        }
                    });
                }
            }

            // 3. Growth Chart (Line) - Khách hàng mới theo ngày (dữ liệu thực)
            const customerGrowthData = data.customer_growth || [];
            console.log('📈 Customer growth data:', customerGrowthData);
            
            // Tạo labels theo ngày (đã format sẵn từ backend)
            const growthLabels = customerGrowthData.map(g => g.ngay);
            
            // Lấy số khách hàng mới mỗi ngày
            const newCustomers = customerGrowthData.map(g => parseInt(g.so_khach_moi) || 0);
            
            const growthCtx = document.getElementById('growthChart');
            const growthPlaceholder = document.getElementById('growthChartPlaceholder');
            const hasGrowthData = newCustomers.length > 0 && newCustomers.some(v => v > 0);
            
            if (growthCtx) {
                if (hasGrowthData) {
                    // Show canvas, hide placeholder
                    growthCtx.style.display = 'block';
                    if (growthPlaceholder) growthPlaceholder.classList.add('hidden');
                    
                    charts.growth = new Chart(growthCtx, {
                        type: 'line',
                        data: {
                            labels: growthLabels,
                            datasets: [{
                                label: 'Khách hàng mới',
                                data: newCustomers,
                                borderColor: '#22c55e',
                                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#22c55e',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointHoverRadius: 6,
                                borderWidth: 2
                            }]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false, 
                            plugins: { 
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        title: (ctx) => {
                                            const idx = ctx[0].dataIndex;
                                            const g = customerGrowthData[idx];
                                            return g ? `Ngày ${g.ngay}` : '';
                                        },
                                        label: (ctx) => `Khách mới: ${ctx.raw} người`
                                    }
                                }
                            }, 
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    ticks: { stepSize: 1 },
                                    grid: { color: '#e5e7eb' }
                                },
                                x: {
                                    ticks: { 
                                        font: { size: 8 },
                                        maxRotation: 45,
                                        minRotation: 0
                                    }
                                }
                            },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Hide canvas, show placeholder
                    growthCtx.style.display = 'none';
                    if (growthPlaceholder) growthPlaceholder.classList.remove('hidden');
                }
            }

            // 4. Category Revenue Chart (Horizontal Bar) - DỮ LIỆU THỰC TỪ DATABASE
            const categoryLabels = data.category_revenue?.map(c => c.ten_danh_muc) || [];
            const categoryRevenueData = data.category_revenue?.map(c => parseFloat(c.doanh_thu) || 0) || [];
            const categoryColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
            
            const categoryRevenueCtx = document.getElementById('categoryRevenueChart');
            const categoryRevenuePlaceholder = document.getElementById('categoryRevenueChartPlaceholder');
            const hasCategoryData = categoryRevenueData.length > 0 && categoryRevenueData.some(v => v > 0);
            
            if (categoryRevenueCtx) {
                if (hasCategoryData) {
                    // Show canvas, hide placeholder
                    categoryRevenueCtx.style.display = 'block';
                    if (categoryRevenuePlaceholder) categoryRevenuePlaceholder.classList.add('hidden');
                    
                    charts.categoryRevenue = new Chart(categoryRevenueCtx, {
                        type: 'bar',
                        data: {
                            labels: categoryLabels,
                            datasets: [{
                                label: 'Doanh thu (VNĐ)',
                                data: categoryRevenueData,
                                backgroundColor: categoryColors.slice(0, categoryLabels.length)
                            }]
                        },
                        options: { 
                            indexAxis: 'y', 
                            responsive: true, maintainAspectRatio: false, 
                            plugins: { legend: { display: false } },
                            scales: { x: { ticks: { callback: v => (v/1000000).toFixed(0) + 'tr' } } },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Hide canvas, show placeholder
                    categoryRevenueCtx.style.display = 'none';
                    if (categoryRevenuePlaceholder) categoryRevenuePlaceholder.classList.remove('hidden');
                }
            }

            // 5. Order Status Chart (Pie) - Dữ liệu thực từ database
            const statusData = { dang_xu_ly: 0, dang_giao: 0, hoan_thanh: 0, da_huy: 0 };
            console.log('📊 orders_by_status raw:', data.orders_by_status);
            data.orders_by_status?.forEach(s => { statusData[s.trang_thai] = parseInt(s.count) || 0; });
            console.log('📊 statusData processed:', statusData);
            
            const orderStatusCtx = document.getElementById('orderStatusChart');
            const orderStatusPlaceholder = document.getElementById('orderStatusChartPlaceholder');
            const hasOrderData = Object.values(statusData).some(v => v > 0);
            console.log('📊 hasOrderData:', hasOrderData, 'ctx exists:', !!orderStatusCtx);
            
            if (orderStatusCtx) {
                if (hasOrderData) {
                    // Show canvas, hide placeholder
                    orderStatusCtx.style.display = 'block';
                    if (orderStatusPlaceholder) orderStatusPlaceholder.classList.add('hidden');
                    
                    charts.orderStatus = new Chart(orderStatusCtx, {
                        type: 'pie',
                        data: {
                            labels: ['Đang xử lý', 'Đang giao', 'Hoàn thành', 'Đã hủy'],
                            datasets: [{
                                data: Object.values(statusData),
                                backgroundColor: ['#fbbf24', '#8b5cf6', '#22c55e', '#ef4444'],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Hide canvas, show placeholder
                    orderStatusCtx.style.display = 'none';
                    if (orderStatusPlaceholder) orderStatusPlaceholder.classList.remove('hidden');
                }
            }
            
            document.getElementById('order-status-legend').innerHTML = `
                <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-yellow-400"></span>Đang xử lý: ${statusData.dang_xu_ly}</div>
                <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-purple-500"></span>Đang giao: ${statusData.dang_giao}</div>
                <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-green-500"></span>Hoàn thành: ${statusData.hoan_thanh}</div>
                <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500"></span>Đã hủy: ${statusData.da_huy}</div>
            `;

            // 6. Top 10 Customers Chart (Horizontal Bar) - Gradient colors like the reference image
            const topCustomers = data.top_customers || [];
            console.log('👑 top_customers raw:', topCustomers);
            const customerLabels = topCustomers.map(c => c.ho_ten || c.email || 'Khách hàng');
            const customerSpent = topCustomers.map(c => parseFloat(c.total_spent) || 0);
            console.log('👑 customerLabels:', customerLabels);
            console.log('👑 customerSpent:', customerSpent);
            
            // Gradient colors from green to orange/brown like the reference image
            const gradientColors = [
                '#22c55e', // Green (highest)
                '#4ade80', 
                '#86efac',
                '#a3e635',
                '#bef264',
                '#d9f99d',
                '#fde047',
                '#fdba74',
                '#fb923c',
                '#c2410c'  // Brown/Orange (lowest)
            ];

            // Tính barThickness động theo số lượng khách hàng
            const customerCount = customerLabels.length;
            const dynamicBarThickness = customerCount <= 1 ? 30 : customerCount <= 3 ? 25 : customerCount <= 5 ? 20 : 18;
            
            const topCustomersCtx = document.getElementById('topCustomersChart');
            const topCustomersPlaceholder = document.getElementById('topCustomersChartPlaceholder');
            console.log('👑 topCustomersCtx exists:', !!topCustomersCtx, 'hasData:', customerLabels.length > 0 && customerSpent.some(v => v > 0));
            if (topCustomersCtx) {
                if (customerLabels.length > 0 && customerSpent.some(v => v > 0)) {
                    // Show canvas, hide placeholder
                    topCustomersCtx.style.display = 'block';
                    if (topCustomersPlaceholder) topCustomersPlaceholder.classList.add('hidden');
                    
                    charts.topCustomers = new Chart(topCustomersCtx, {
                        type: 'bar',
                        data: {
                            labels: customerLabels,
                            datasets: [{
                                label: 'Tổng chi tiêu',
                                data: customerSpent,
                                backgroundColor: gradientColors.slice(0, customerLabels.length),
                                borderRadius: 4,
                                barThickness: dynamicBarThickness
                            }]
                        },
                        options: { 
                            indexAxis: 'y', 
                            responsive: true, maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    right: 60 // Thêm padding bên phải để hiển thị giá trị
                                }
                            },
                            plugins: { 
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return formatPrice(context.raw);
                                        }
                                    }
                                },
                                // Plugin để hiển thị giá trị ở cuối thanh
                                datalabels: {
                                    display: false
                                }
                            },
                            scales: { 
                                x: { 
                                    display: true,
                                    grid: { display: false },
                                    ticks: {
                                        callback: function(value) {
                                            return (value / 1000000).toFixed(0) + 'tr';
                                        },
                                        font: { size: 9 },
                                        color: '#6b7280'
                                    }
                                },
                                y: {
                                    grid: { display: false },
                                    ticks: {
                                        font: { size: 10, weight: 'bold' },
                                        color: '#374151'
                                    }
                                }
                            },
                            animation: defaultAnimation
                        },
                        plugins: [{
                            id: 'customLabels',
                            afterDatasetsDraw: function(chart) {
                                const ctx = chart.ctx;
                                chart.data.datasets.forEach((dataset, i) => {
                                    const meta = chart.getDatasetMeta(i);
                                    meta.data.forEach((bar, index) => {
                                        const value = dataset.data[index];
                                        const displayValue = (value / 1000000).toFixed(1) + 'tr';
                                        ctx.fillStyle = '#374151';
                                ctx.font = 'bold 10px Arial';
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(displayValue, bar.x + 5, bar.y);
                            });
                        });
                    }
                }]
                    });
                } else {
                    // Hide canvas, show placeholder
                    topCustomersCtx.style.display = 'none';
                    if (topCustomersPlaceholder) topCustomersPlaceholder.classList.remove('hidden');
                }
            }

            // 7. News Stats Chart (Doughnut) - Tin tức theo danh mục
            const newsStats = data.news_stats || [];
            const newsLabels = newsStats.map(n => n.danh_muc || 'Khác');
            const newsData = newsStats.map(n => parseInt(n.so_bai) || 0);
            const newsColors = ['#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];
            
            const newsChartCtx = document.getElementById('newsChart');
            const newsChartPlaceholder = document.getElementById('newsChartPlaceholder');
            const hasNewsData = newsData.length > 0 && newsData.some(v => v > 0);
            
            if (newsChartCtx) {
                if (hasNewsData) {
                    // Show canvas, hide placeholder
                    newsChartCtx.style.display = 'block';
                    if (newsChartPlaceholder) newsChartPlaceholder.classList.add('hidden');
                    
                    charts.news = new Chart(newsChartCtx, {
                        type: 'doughnut',
                        data: {
                            labels: newsLabels,
                            datasets: [{
                                data: newsData,
                                backgroundColor: newsColors.slice(0, newsLabels.length)
                            }]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false,
                            plugins: { 
                                legend: { position: 'right', labels: { font: { size: 10 } } }
                            },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Hide canvas, show placeholder
                    newsChartCtx.style.display = 'none';
                    if (newsChartPlaceholder) newsChartPlaceholder.classList.remove('hidden');
                }
            }

            // 8. News Monthly Chart (Stacked Bar) - Số lượng bài viết theo tháng và danh mục
            const newsMonthlyStats = data.news_monthly_stats || [];
            
            // Lấy danh sách tháng và danh mục unique
            const uniqueMonths = [...new Set(newsMonthlyStats.map(n => n.thang))].sort();
            const uniqueCategories = [...new Set(newsMonthlyStats.map(n => n.danh_muc || 'Khác'))];
            
            // Tạo labels cho tháng (T1/25 format)
            const monthLabels = uniqueMonths.map(m => {
                const [year, month] = m.split('-');
                return `T${parseInt(month)}/${year.slice(2)}`;
            });
            
            // Màu cho từng danh mục tin tức
            const newsCategoryColors = {
                'Công nghệ': '#3b82f6',
                'Điện thoại': '#f59e0b', 
                'Laptop': '#6b7280',
                'Phụ kiện': '#22c55e',
                'Khuyến mãi': '#ec4899',
                'Tin tức': '#8b5cf6',
                'Khác': '#06b6d4'
            };
            
            // Tạo datasets cho từng danh mục
            const datasets = uniqueCategories.map((category, idx) => {
                const dataByMonth = uniqueMonths.map(month => {
                    const found = newsMonthlyStats.find(n => n.thang === month && (n.danh_muc || 'Khác') === category);
                    return found ? found.so_bai : 0;
                });
                return {
                    label: category,
                    data: dataByMonth,
                    backgroundColor: newsCategoryColors[category] || newsColors[idx % newsColors.length]
                };
            });
            
            const newsViewsCtx = document.getElementById('newsViewsChart');
            const newsViewsPlaceholder = document.getElementById('newsViewsChartPlaceholder');
            const hasNewsMonthlyData = datasets.length > 0 && datasets.some(d => d.data.some(v => v > 0));
            
            if (newsViewsCtx) {
                if (hasNewsMonthlyData) {
                    // Show canvas, hide placeholder
                    newsViewsCtx.style.display = 'block';
                    if (newsViewsPlaceholder) newsViewsPlaceholder.classList.add('hidden');
                    
                    charts.newsViews = new Chart(newsViewsCtx, {
                        type: 'bar',
                        data: {
                            labels: monthLabels,
                            datasets: datasets
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false,
                            plugins: { 
                                legend: { 
                                    display: true,
                                    position: 'top',
                                    labels: { font: { size: 10 } }
                                }
                            },
                            scales: { 
                                x: { stacked: true },
                                y: { stacked: true, beginAtZero: true }
                            },
                            animation: defaultAnimation
                        }
                    });
                } else {
                    // Hide canvas, show placeholder
                    newsViewsCtx.style.display = 'none';
                    if (newsViewsPlaceholder) newsViewsPlaceholder.classList.remove('hidden');
                }
            }

            // 9. Top Rated Products - Render như hình mẫu với progress bar
            const topRatedProducts = data.top_rated_products || [];
            console.log('Top rated products:', topRatedProducts);
            const topRatedContainer = document.getElementById('top-rated-products');
            if (topRatedContainer && topRatedProducts.length > 0) {
                const maxRating = 5;
                topRatedContainer.innerHTML = topRatedProducts.map((p, idx) => {
                    const rating = parseFloat(p.diem_trung_binh) || 0;
                    const percent = (rating / maxRating) * 100;
                    return `
                        <div class="flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-xs">${idx + 1}</div>
                            <div class="flex-1">
                                <div class="font-medium text-gray-800 text-xs truncate" title="${p.ten_san_pham}">${p.ten_san_pham}</div>
                                <div class="flex items-center gap-1 mt-0.5">
                                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                                        <div class="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full" style="width: ${percent}%"></div>
                                    </div>
                                    <span class="text-yellow-500 font-bold text-xs">⭐${rating}</span>
                                    <span class="text-gray-400 text-xs">(${p.so_danh_gia})</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else if (topRatedContainer) {
                topRatedContainer.innerHTML = '<p class="text-gray-500 text-center text-xs">Chưa có đánh giá</p>';
            }
        }

        // Products
        let allCategories = [];
        async function loadCategoriesForFilter() {
            const data = await apiCall('/admin/categories');
            if (data.success) {
                allCategories = data.data;
                const options = '<option value="">Tất cả danh mục</option>' + data.data.map(c => `<option value="${c.ma_danh_muc}">${c.ten_danh_muc}</option>`).join('');
                document.getElementById('product-category-filter').innerHTML = options;
                document.getElementById('product-category').innerHTML = '<option value="">Chọn danh mục</option>' + data.data.map(c => `<option value="${c.ma_danh_muc}">${c.ten_danh_muc}</option>`).join('');
            }
        }

        async function loadProducts() {
            const search = document.getElementById('product-search').value.trim();
            const category = document.getElementById('product-category-filter').value;
            const status = document.getElementById('product-status-filter')?.value || '';
            
            const data = await apiCall(`/admin/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}&_=${Date.now()}`);
            
            if (data.success) {
                const products = data.data;
                
                // Cập nhật stats
                const total = products.length;
                const totalStock = products.reduce((sum, p) => sum + (parseInt(p.so_luong) || 0), 0);
                const totalSold = products.reduce((sum, p) => sum + (parseInt(p.so_luong_ban) || 0), 0);
                const lowStock = products.filter(p => p.so_luong > 0 && p.so_luong <= 5).length;
                const outStock = products.filter(p => p.so_luong === 0).length;
                
                document.getElementById('product-total').textContent = total;
                document.getElementById('product-total-stock').textContent = totalStock;
                document.getElementById('product-total-sold').textContent = totalSold;
                document.getElementById('product-low-stock').textContent = lowStock;
                document.getElementById('product-out-stock').textContent = outStock;
                
                // Render top selling products
                renderTopSellingProducts(products);
                
                if (products.length === 0) {
                    document.getElementById('products-table').innerHTML = '<tr><td colspan="12" class="text-center py-8 text-gray-500">Không tìm thấy sản phẩm</td></tr>';
                    return;
                }
                
                // Render bảng sản phẩm
                const html = products.map(p => {
                    // Format ngày tạo
                    const formatDate = (dateStr) => {
                        if (!dateStr) return '-';
                        const date = new Date(dateStr);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                    };
                    
                    return `
                    <tr class="border-b hover:bg-blue-50/50 transition">
                        <td class="px-3 py-2 w-20">
                            <img src="${getImageUrl(p.anh_chinh)}" class="w-16 h-16 object-cover rounded-lg shadow-sm" onerror="this.src=PLACEHOLDER_IMG">
                        </td>
                        <td class="px-3 py-2">
                            <div class="font-bold text-slate-800 text-sm">${p.ten_san_pham}</div>
                            <div class="flex flex-wrap gap-1.5 mt-1 text-[11px]">
                                <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Code: ${p.ma_san_pham_code || '-'}</span>
                                <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">BC: ${p.barcode || '-'}</span>
                                <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">${p.trong_luong_kg ? parseFloat(p.trong_luong_kg).toFixed(2) + ' kg' : '0.50 kg'}</span>
                            </div>
                        </td>
                        <td class="px-3 py-2 text-right text-blue-600 text-sm font-semibold">${formatPrice(p.gia_nhap || 0)}</td>
                        <td class="px-3 py-2 text-right font-bold text-green-600 text-sm">${formatPrice(p.gia)}</td>
                        <td class="px-3 py-2 text-center">
                            <span class="font-bold text-sm ${p.so_luong === 0 ? 'text-red-500' : p.so_luong <= 5 ? 'text-amber-500' : 'text-slate-700'}">
                                ${p.so_luong}
                            </span>
                        </td>
                        <td class="px-3 py-2 text-center">
                            <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                ${p.so_luong_ban || 0}
                            </span>
                        </td>
                        <td class="px-3 py-2 text-center">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${p.trang_thai === 'hien_thi' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
                                ${p.trang_thai === 'hien_thi' ? '✓ Hiển thị' : '✗ Ẩn'}
                            </span>
                            <div class="text-[10px] text-gray-500 mt-1 whitespace-nowrap">📅 ${formatDate(p.ngay_tao)}</div>
                        </td>
                        <td class="px-3 py-2">
                            <div class="flex items-center justify-center gap-3">
                                <button onclick="editProduct(${p.ma_san_pham})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform p-1 text-base" title="Sửa">✏️</button>
                                <button onclick="deleteProduct(${p.ma_san_pham})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform p-1 text-base" title="Xóa">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
                }).join('');
                
                document.getElementById('products-table').innerHTML = html;
            }
        }
        
        function renderTopSellingProducts(products) {
            // Sắp xếp theo số lượng bán giảm dần
            const topProducts = products
                .sort((a, b) => (b.so_luong_ban || 0) - (a.so_luong_ban || 0))
                .slice(0, 10);
            
            const html = topProducts.map((p, index) => `
                <div class="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-all border-l-4 ${index === 0 ? 'border-yellow-500' : index === 1 ? 'border-gray-400' : index === 2 ? 'border-orange-500' : 'border-blue-500'}">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="text-2xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-500' : 'text-blue-500'}">
                            #${index + 1}
                        </div>
                        <img src="${getImageUrl(p.anh_chinh)}" class="w-12 h-12 object-cover rounded-lg" onerror="this.src=PLACEHOLDER_IMG">
                    </div>
                    <h4 class="font-semibold text-gray-800 text-sm mb-2 line-clamp-2">${p.ten_san_pham}</h4>
                    <div class="space-y-1 text-xs">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Đã bán:</span>
                            <span class="font-bold text-purple-600">${p.so_luong_ban || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Tồn kho:</span>
                            <span class="font-bold">${p.so_luong}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Giá:</span>
                            <span class="font-bold text-green-600">${formatPrice(p.gia)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('top-selling-products').innerHTML = html || '<p class="text-gray-500 text-center py-4 col-span-full">Chưa có dữ liệu</p>';
        }
        
        function searchProducts() { clearTimeout(window.pst); window.pst = setTimeout(loadProducts, 300); }
        
        function calculateProfit() {
            const cost = parseFloat(document.getElementById('product-cost')?.value) || 0;
            const price = parseFloat(document.getElementById('product-price')?.value) || 0;
            const profit = price - cost;
            const profitPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;
            
            const profitField = document.getElementById('product-profit');
            if (profitField) {
                profitField.value = `${formatPrice(profit)} (${profitPercent}%)`;
                profitField.className = `w-full border rounded-lg px-4 py-2 bg-gray-100 font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`;
            }
        }
        
        function openProductModal(p = null) {
            document.getElementById('product-modal').classList.add('active');
            document.getElementById('product-modal-title').textContent = p ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = p?.ma_san_pham || '';
            document.getElementById('image-preview').innerHTML = '';
            
            // Hiển thị hình ảnh hiện tại
            const currentImagesDiv = document.getElementById('current-images');
            const currentImagesList = document.getElementById('current-images-list');
            
            if (p && p.images && p.images.length > 0) {
                currentImagesDiv.classList.remove('hidden');
                currentImagesList.innerHTML = p.images.map(img => `
                    <div class="relative bg-white rounded-lg shadow p-1" data-image-id="${img.ma_anh}">
                        <img src="${img.duong_dan_anh}" alt="Ảnh sản phẩm" class="w-24 h-24 object-cover rounded-lg border-2 ${img.la_anh_chinh ? 'border-blue-500' : 'border-gray-200'}" onerror="this.src=PLACEHOLDER_IMG">
                        ${img.la_anh_chinh ? '<span class="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-br-lg rounded-tl-lg font-medium">Ảnh chính</span>' : ''}
                        <div class="flex gap-1 mt-1">
                            <button type="button" onclick="setMainImage(${p.ma_san_pham}, ${img.ma_anh})" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 rounded text-xs flex items-center justify-center gap-1" title="Đặt làm ảnh chính">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                Chính
                            </button>
                            <button type="button" onclick="deleteProductImage(${p.ma_san_pham}, ${img.ma_anh})" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded text-xs flex items-center justify-center gap-1" title="Xóa ảnh">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Xóa
                            </button>
                        </div>
                    </div>
                `).join('');
            } else if (p && p.anh_chinh) {
                currentImagesDiv.classList.remove('hidden');
                currentImagesList.innerHTML = `
                    <div class="relative bg-white rounded-lg shadow p-1">
                        <img src="${p.anh_chinh}" alt="Ảnh sản phẩm" class="w-24 h-24 object-cover rounded-lg border-2 border-blue-500" onerror="this.src=PLACEHOLDER_IMG">
                        <span class="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-br-lg rounded-tl-lg font-medium">Ảnh chính</span>
                    </div>
                `;
            } else {
                currentImagesDiv.classList.add('hidden');
                currentImagesList.innerHTML = '';
            }
            
            if (p) {
                // Thông tin cơ bản
                if (document.getElementById('product-code')) document.getElementById('product-code').value = p.ma_san_pham_code || '';
                if (document.getElementById('product-barcode')) document.getElementById('product-barcode').value = p.barcode || '';
                document.getElementById('product-name').value = p.ten_san_pham;
                document.getElementById('product-brand').value = p.thuong_hieu || '';
                document.getElementById('product-category').value = p.ma_danh_muc || '';
                if (document.getElementById('product-purpose')) document.getElementById('product-purpose').value = p.muc_dich_su_dung || '';
                
                // Giá và tồn kho
                if (document.getElementById('product-cost')) document.getElementById('product-cost').value = p.gia_nhap || 0;
                document.getElementById('product-price').value = p.gia;
                document.getElementById('product-quantity').value = p.so_luong;
                document.getElementById('product-status').value = p.trang_thai;
                
                // Mô tả
                if (document.getElementById('product-desc')) document.getElementById('product-desc').value = p.mo_ta || '';
                
                // Trọng lượng
                if (document.getElementById('product-weight')) {
                    document.getElementById('product-weight').value = p.trong_luong_kg !== undefined && p.trong_luong_kg !== null ? parseFloat(p.trong_luong_kg) : 0.5;
                }
                
                // Tính lợi nhuận
                calculateProfit();
            }
        }
        function closeProductModal() { document.getElementById('product-modal').classList.remove('active'); }
        
        // Hàm preview hình ảnh mới được chọn
        function previewNewImages(input) {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = '';
            
            if (input.files) {
                Array.from(input.files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const div = document.createElement('div');
                        div.className = 'relative group';
                        div.innerHTML = `
                            <img src="${e.target.result}" alt="Preview" class="w-20 h-20 object-cover rounded-lg border-2 border-green-400">
                            <span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">Mới</span>
                            <button type="button" onclick="removePreviewImage(this, ${index})" class="absolute bottom-0 right-0 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        `;
                        preview.appendChild(div);
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
        
        // Hàm thêm hình từ URL
        async function addImageFromUrl() {
            const urlInput = document.getElementById('product-image-url');
            const url = urlInput.value.trim();
            const productId = document.getElementById('product-id').value;
            
            if (!url) {
                showToast('Vui lòng nhập URL hình ảnh', 'error');
                return;
            }
            
            if (!productId) {
                // Nếu đang thêm sản phẩm mới, chỉ preview
                const preview = document.getElementById('image-preview');
                const div = document.createElement('div');
                div.className = 'relative group';
                div.innerHTML = `
                    <img src="${url}" alt="Preview" class="w-20 h-20 object-cover rounded-lg border-2 border-green-400" onerror="this.parentElement.remove(); showToast('URL hình ảnh không hợp lệ', 'error');">
                    <span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">URL</span>
                    <input type="hidden" name="image-urls[]" value="${url}">
                `;
                preview.appendChild(div);
                urlInput.value = '';
                return;
            }
            
            // Nếu đang sửa sản phẩm, thêm trực tiếp vào DB
            try {
                const response = await apiCall(`/admin/products/${productId}/images/url`, 'POST', { url, is_main: false });
                if (response.success) {
                    showToast('Đã thêm hình ảnh thành công', 'success');
                    urlInput.value = '';
                    // Reload lại modal để hiển thị hình mới
                    editProduct(productId);
                } else {
                    showToast(response.message || 'Lỗi thêm hình ảnh', 'error');
                }
            } catch (error) {
                showToast('Lỗi kết nối server', 'error');
            }
        }
        
        // Hàm đặt ảnh chính
        async function setMainImage(productId, imageId) {
            try {
                const response = await apiCall(`/admin/products/${productId}/images/${imageId}/main`, 'PUT');
                if (response.success) {
                    showToast('Đã đặt làm ảnh chính', 'success');
                    editProduct(productId);
                } else {
                    showToast(response.message || 'Lỗi cập nhật', 'error');
                }
            } catch (error) {
                showToast('Lỗi kết nối server', 'error');
            }
        }
        
        // Hàm xóa ảnh sản phẩm
        async function deleteProductImage(productId, imageId) {
            console.log('🗑️ Deleting image:', { productId, imageId });
            if (!confirm('Xóa hình ảnh này?')) return;
            
            try {
                const url = `${API_URL}/admin/products/${productId}/images/${imageId}`;
                console.log('🔗 Delete URL:', url);
                
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📡 Response status:', response.status);
                const data = await response.json();
                console.log('📦 Response data:', data);
                
                if (data.success) {
                    alert('Đã xóa hình ảnh!');
                    editProduct(productId);
                } else {
                    alert(data.message || 'Lỗi xóa hình ảnh');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                alert('Lỗi kết nối server: ' + error.message);
            }
        }
        
        async function editProduct(id) { const d = await apiCall(`/admin/products/${id}`); if (d.success) openProductModal(d.data); }
        async function deleteProduct(id) {
            if (!confirm('Xóa sản phẩm này?')) return;
            const d = await apiCall(`/admin/products/${id}`, 'DELETE');
            if (d.success) { alert('Đã xóa!'); loadProducts(); } else alert(d.message);
        }
        // Hàm validate giá sản phẩm
        function validateProductPrice() {
            const priceInput = document.getElementById('product-price');
            const errorEl = document.getElementById('product-price-error');
            const price = parseFloat(priceInput.value);
            
            if (price < 0) {
                errorEl.classList.remove('hidden');
                priceInput.classList.add('border-red-500');
                return false;
            } else {
                errorEl.classList.add('hidden');
                priceInput.classList.remove('border-red-500');
                return true;
            }
        }

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate giá không âm
            const priceValue = parseFloat(document.getElementById('product-price').value);
            if (priceValue < 0) {
                alert('⚠️ Giá sản phẩm không được âm!');
                return;
            }
            
            const id = document.getElementById('product-id').value;
            const body = {
                ten_san_pham: document.getElementById('product-name').value,
                gia: priceValue,
                gia_nhap: parseFloat(document.getElementById('product-cost').value) || 0,
                so_luong: parseInt(document.getElementById('product-quantity').value) || 0,
                thuong_hieu: document.getElementById('product-brand').value,
                ma_danh_muc: document.getElementById('product-category').value || null,
                mo_ta: document.getElementById('product-desc').value,
                trang_thai: document.getElementById('product-status').value,
                muc_dich_su_dung: document.getElementById('product-purpose')?.value || null,
                trong_luong_kg: parseFloat(document.getElementById('product-weight').value) || 0.5
            };
            const d = await apiCall(`/admin/products${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', body);
            if (d.success) {
                const productId = id || d.data.ma_san_pham;
                const imageInput = document.getElementById('product-images');
                if (imageInput.files && imageInput.files.length > 0) {
                    const formData = new FormData();
                    Array.from(imageInput.files).slice(0, 5).forEach(file => formData.append('images', file));
                    formData.append('is_main', 'true');
                    await fetch(`${API_URL}/admin/products/${productId}/images`, {
                        method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: formData
                    });
                }
                alert(id ? 'Đã cập nhật!' : 'Đã thêm!');
                closeProductModal();
                loadProducts();
            } else alert(d.message);
        });

        // Categories
        let categoryCharts = {};
        async function loadCategories() {
            const data = await apiCall('/admin/categories');
            if (!data.success) return;
            
            // Lấy thêm dữ liệu thống kê từ dashboard
            let categoryStats = [];
            try {
                const dashboardData = await apiCall('/admin/dashboard');
                if (dashboardData.success) {
                    categoryStats = dashboardData.data.category_stats || [];
                }
            } catch (e) { console.log('Error loading category stats'); }
            
            // Merge dữ liệu và lưu vào allCategoriesData
            allCategoriesData = data.data.map(c => {
                const stats = categoryStats.find(s => s.ten_danh_muc === c.ten_danh_muc) || {};
                return {
                    ...c,
                    tong_ton_kho: parseInt(stats.tong_ton_kho) || 0,
                    gia_tri_ton_kho: parseFloat(stats.gia_tri_ton_kho) || 0
                };
            });
            
            // Load brands và suppliers
            await loadBrands();
            await loadSuppliers();
            
            // Cập nhật stats cards
            const totalCategories = allCategoriesData.length;
            const totalProducts = allCategoriesData.reduce((sum, c) => sum + (parseInt(c.so_san_pham) || 0), 0);
            
            document.getElementById('category-total').textContent = totalCategories;
            document.getElementById('category-total-products').textContent = totalProducts;
            
            // Render theo tab hiện tại
            renderCategoryTab(currentCategoryTab);
        }
        
        function openCategoryModal(c = null) {
            document.getElementById('category-modal').classList.add('active');
            document.getElementById('category-modal-title').textContent = c ? 'Sửa danh mục' : 'Thêm danh mục';
            document.getElementById('category-form').reset();
            document.getElementById('category-id').value = c?.id || '';
            if (c) { document.getElementById('category-name').value = c.name; document.getElementById('category-desc').value = c.desc; }
        }
        function closeCategoryModal() { document.getElementById('category-modal').classList.remove('active'); }
        function editCategory(id, name, desc) { openCategoryModal({ id, name, desc }); }
        async function deleteCategory(id) {
            if (!confirm('Xóa danh mục này?')) return;
            const d = await apiCall(`/admin/categories/${id}`, 'DELETE');
            if (d.success) { alert('Đã xóa!'); loadCategories(); loadCategoriesForFilter(); } else alert(d.message);
        }
        document.getElementById('category-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('category-id').value;
            const body = { ten_danh_muc: document.getElementById('category-name').value, mo_ta: document.getElementById('category-desc').value };
            const d = await apiCall(`/admin/categories${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', body);
            if (d.success) { 
                showNotification(id ? 'Đã cập nhật!' : 'Đã thêm!', 'success'); 
                closeCategoryModal(); 
                loadCategories(); 
                loadCategoriesForFilter(); 
            } else {
                showNotification(d.message, 'error');
            }
        });
        
        // Category tabs and search
        let currentCategoryTab = 'all';
        let allCategoriesData = [];
        let allBrandsData = [];
        let allSuppliersData = [];
        
        function switchCategoryTab(tab) {
            currentCategoryTab = tab;
            document.querySelectorAll('.category-tab-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-600', 'text-white');
                btn.classList.add('text-gray-600');
            });
            const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
                activeBtn.classList.remove('text-gray-600');
            }
            document.querySelectorAll('.category-tab-content').forEach(content => content.classList.add('hidden'));
            const selectedTab = document.getElementById(`category-tab-${tab}`);
            if (selectedTab) selectedTab.classList.remove('hidden');
            renderCategoryTab(tab);
        }
        
        function renderCategoryTab(tab) {
            if (tab === 'all') renderAllCategories();
            else if (tab === 'type') renderCategoriesByType();
            else if (tab === 'brand') renderCategoriesByBrand();
            else if (tab === 'supplier') renderCategoriesBySupplier();
        }
        
        function renderAllCategories() {
            const html = allCategoriesData.map(c => `
                <tr class="border-b hover:bg-blue-50 transition">
                    <td class="px-4 py-3 font-semibold">${c.ten_danh_muc}</td>
                    <td class="px-4 py-3 text-gray-600">${c.mo_ta || '-'}</td>
                    <td class="px-4 py-3 text-center"><span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">${c.so_san_pham} SP</span></td>
                    <td class="px-4 py-3 text-center">${c.tong_ton_kho || 0}</td>
                    <td class="px-4 py-3 text-right font-bold text-green-600">${formatPrice(c.gia_tri_ton_kho || 0)}</td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="editCategory(${c.ma_danh_muc}, '${c.ten_danh_muc}', '${(c.mo_ta || '').replace(/'/g, "\\'")}')" class="text-blue-600 hover:text-blue-800 mx-1">✏️</button>
                        <button onclick="deleteCategory(${c.ma_danh_muc})" class="text-red-600 hover:text-red-800 mx-1">🗑️</button>
                    </td>
                </tr>
            `).join('');
            document.getElementById('categories-table-all').innerHTML = html || '<tr><td colspan="6" class="text-center py-8 text-gray-500">Không có danh mục</td></tr>';
        }
        
        function renderCategoriesByType() {
            const colors = ['from-blue-500 to-blue-600', 'from-green-500 to-green-600', 'from-purple-500 to-purple-600', 'from-orange-500 to-orange-600'];
            const html = allCategoriesData.map((c, i) => `
                <div class="bg-gradient-to-br ${colors[i % colors.length]} rounded-xl p-6 shadow-lg text-white">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold">${c.ten_danh_muc}</h3>
                        <span class="text-3xl">📁</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between"><span>Sản phẩm:</span><span class="font-bold">${c.so_san_pham}</span></div>
                        <div class="flex justify-between"><span>Tồn kho:</span><span class="font-bold">${c.tong_ton_kho || 0}</span></div>
                        <div class="flex justify-between pt-2 border-t border-white/20"><span>Giá trị:</span><span class="font-bold">${formatPrice(c.gia_tri_ton_kho || 0)}</span></div>
                    </div>
                </div>
            `).join('');
            document.getElementById('categories-by-type').innerHTML = html || '<p class="text-gray-500 text-center py-8 col-span-full">Không có dữ liệu</p>';
        }
        
        async function renderCategoriesByBrand() {
            try {
                const productsData = await apiCall('/admin/products?limit=1000');
                if (!productsData.success) return;
                const grouped = {};
                productsData.data.forEach(p => {
                    const brand = p.thuong_hieu || 'Chưa phân loại';
                    if (!grouped[brand]) grouped[brand] = { name: brand, products: 0, stock: 0, value: 0 };
                    grouped[brand].products++;
                    grouped[brand].stock += parseInt(p.so_luong) || 0;
                    grouped[brand].value += (parseInt(p.so_luong) || 0) * (parseFloat(p.gia) || 0);
                });
                const html = Object.values(grouped).map(g => `
                    <div class="bg-white rounded-xl p-5 shadow-lg border-l-4 border-purple-500">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">🏷️</div>
                            <h3 class="text-lg font-bold">${g.name}</h3>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between"><span class="text-gray-600">Sản phẩm:</span><span class="font-bold text-purple-600">${g.products}</span></div>
                            <div class="flex justify-between"><span class="text-gray-600">Tồn kho:</span><span class="font-bold">${g.stock}</span></div>
                            <div class="flex justify-between pt-2 border-t"><span class="text-gray-600">Giá trị:</span><span class="font-bold text-green-600">${formatPrice(g.value)}</span></div>
                        </div>
                    </div>
                `).join('');
                document.getElementById('categories-by-brand').innerHTML = html || '<p class="text-gray-500 text-center py-8 col-span-full">Không có dữ liệu</p>';
            } catch (error) {
                console.error('Error rendering by brand:', error);
            }
        }
        
        async function renderCategoriesBySupplier() {
            const html = allSuppliersData.map(s => `
                <div class="bg-white rounded-xl p-5 shadow-lg border-l-4 border-orange-500">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">🏢</div>
                        <div class="flex-1">
                            <h3 class="text-lg font-bold">${s.ten_nha_cung_cap}</h3>
                            <p class="text-sm text-gray-500">${s.so_dien_thoai || '-'}</p>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-gray-600">Email:</span><span>${s.email || '-'}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Trạng thái:</span><span class="px-2 py-1 rounded-full text-xs ${s.trang_thai === 'hoat_dong' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">${s.trang_thai === 'hoat_dong' ? '✅ Hoạt động' : '⏸️ Ngừng'}</span></div>
                    </div>
                </div>
            `).join('');
            document.getElementById('categories-by-supplier').innerHTML = html || '<p class="text-gray-500 text-center py-8 col-span-full">Không có nhà cung cấp</p>';
        }
        
        function searchCategories() {
            const keyword = document.getElementById('category-search').value.toLowerCase();
            const filtered = allCategoriesData.filter(c => c.ten_danh_muc.toLowerCase().includes(keyword) || (c.mo_ta && c.mo_ta.toLowerCase().includes(keyword)));
            const html = filtered.map(c => `
                <tr class="border-b hover:bg-blue-50">
                    <td class="px-4 py-3 font-semibold">${c.ten_danh_muc}</td>
                    <td class="px-4 py-3 text-gray-600">${c.mo_ta || '-'}</td>
                    <td class="px-4 py-3 text-center"><span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">${c.so_san_pham} SP</span></td>
                    <td class="px-4 py-3 text-center">${c.tong_ton_kho || 0}</td>
                    <td class="px-4 py-3 text-right font-bold text-green-600">${formatPrice(c.gia_tri_ton_kho || 0)}</td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="editCategory(${c.ma_danh_muc}, '${c.ten_danh_muc}', '${(c.mo_ta || '').replace(/'/g, "\\'")}')" class="text-blue-600 mx-1">✏️</button>
                        <button onclick="deleteCategory(${c.ma_danh_muc})" class="text-red-600 mx-1">🗑️</button>
                    </td>
                </tr>
            `).join('');
            document.getElementById('categories-table-all').innerHTML = html || '<tr><td colspan="6" class="text-center py-8 text-gray-500">Không tìm thấy</td></tr>';
        }
        
        // Brand Management
        async function loadBrands() {
            try {
                const data = await apiCall('/admin/brands');
                if (data.success) {
                    allBrandsData = data.data;
                    renderBrandsTable();
                    document.getElementById('category-total-brands').textContent = allBrandsData.length;
                }
            } catch (error) {
                console.error('Load brands error:', error);
            }
        }
        
        function renderBrandsTable() {
            const html = allBrandsData.map(b => `
                <tr class="border-b hover:bg-purple-50">
                    <td class="px-4 py-3 font-semibold">${b.ten_thuong_hieu}</td>
                    <td class="px-4 py-3">${b.xuat_xu || '-'}</td>
                    <td class="px-4 py-3 text-center"><span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">${b.so_san_pham || 0}</span></td>
                    <td class="px-4 py-3 text-center text-sm">${new Date(b.ngay_tao).toLocaleDateString('vi-VN')}</td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="editBrand(${b.ma_thuong_hieu}, '${b.ten_thuong_hieu}', '${(b.xuat_xu || '').replace(/'/g, "\\'")}' )" class="text-blue-600 mx-1">✏️</button>
                        <button onclick="deleteBrand(${b.ma_thuong_hieu})" class="text-red-600 mx-1">🗑️</button>
                    </td>
                </tr>
            `).join('');
            document.getElementById('brands-table').innerHTML = html || '<tr><td colspan="5" class="text-center py-8 text-gray-500">Chưa có thương hiệu</td></tr>';
        }
        
        function openBrandModal() {
            document.getElementById('brand-modal').classList.add('active');
            loadBrands();
        }
        
        function closeBrandModal() {
            document.getElementById('brand-modal').classList.remove('active');
        }
        
        function editBrand(id, name, origin) {
            document.getElementById('brand-id').value = id;
            document.getElementById('brand-name').value = name;
            document.getElementById('brand-origin').value = origin;
            document.getElementById('brand-submit-text').textContent = '💾 Cập nhật';
        }
        
        async function deleteBrand(id) {
            if (!confirm('Xóa thương hiệu này?')) return;
            const data = await apiCall(`/admin/brands/${id}`, 'DELETE');
            if (data.success) {
                showNotification('Xóa thương hiệu thành công', 'success');
                loadBrands();
            }
        }
        
        document.getElementById('brand-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('brand-id').value;
            const name = document.getElementById('brand-name').value;
            const origin = document.getElementById('brand-origin').value;
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/admin/brands/${id}` : '/admin/brands';
            const data = await apiCall(url, method, { ten_thuong_hieu: name, xuat_xu: origin });
            if (data.success) {
                showNotification(id ? 'Cập nhật thành công' : 'Thêm thương hiệu thành công', 'success');
                document.getElementById('brand-form').reset();
                document.getElementById('brand-submit-text').textContent = '➕ Thêm thương hiệu';
                loadBrands();
            }
        });
        
        async function loadSuppliers() {
            try {
                const data = await apiCall('/admin/suppliers');
                if (data.success) {
                    allSuppliersData = data.data;
                    document.getElementById('category-total-suppliers').textContent = allSuppliersData.length;
                }
            } catch (error) {
                console.error('Load suppliers error:', error);
            }
        }

        // Orders
        let orderCharts = {};
        async function loadOrders() {
            const search = document.getElementById('order-search')?.value || '';
            const status = document.getElementById('order-status-filter')?.value || '';
            
            // Load thống kê đơn hàng
            try {
                const statsData = await apiCall('/admin/orders/stats');
                console.log('📊 Order stats:', statsData);
                
                if (statsData.success && statsData.data) {
                    const stats = statsData.data;
                    
                    // Cập nhật stats cards
                    document.getElementById('order-total').textContent = stats.total_orders || 0;
                    document.getElementById('order-total-revenue').textContent = formatPrice(stats.completed_revenue || 0);
                    
                    // Đếm theo trạng thái
                    const statusMap = { dang_xu_ly: 0, dang_giao: 0, hoan_thanh: 0, da_huy: 0 };
                    if (stats.status_stats && Array.isArray(stats.status_stats)) {
                        stats.status_stats.forEach(s => { 
                            if (s.trang_thai) statusMap[s.trang_thai] = parseInt(s.count) || 0; 
                        });
                    }
                    document.getElementById('order-pending').textContent = (statusMap.dang_xu_ly || 0) + (statusMap.dang_giao || 0);
                    document.getElementById('order-completed').textContent = statusMap.hoan_thanh || 0;
                    
                    // Vẽ biểu đồ
                    drawOrderCharts(stats);
                    
                    // Render đơn hàng gần đây (grid 3 cột)
                    if (stats.recent_orders && stats.recent_orders.length > 0) {
                        const recentHtml = stats.recent_orders.map(o => `
                            <div class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">#${o.ma_don_hang}</span>
                                    ${getStatusBadge(o.trang_thai)}
                                </div>
                                <p class="font-semibold text-gray-800">${o.ten_dang_nhap || 'Khách hàng'}</p>
                                <p class="text-xs text-gray-500 mb-2">${formatDate(o.ngay_tao)}</p>
                                <div class="flex items-center justify-between mt-3">
                                    <p class="text-lg font-bold text-green-600">${formatPrice(o.tong_tien)}</p>
                                </div>
                            </div>
                        `).join('');
                        document.getElementById('order-recent-list').innerHTML = recentHtml;
                    } else {
                        document.getElementById('order-recent-list').innerHTML = '<p class="text-gray-500 text-center py-4 col-span-3">Chưa có đơn hàng</p>';
                    }
                } else {
                    console.log('⚠️ No order stats data');
                }
            } catch (e) { 
                console.error('❌ Error loading order stats:', e);
            }
            
            // Load danh sách đơn hàng
            try {
                const data = await apiCall(`/admin/orders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
                console.log('📦 Orders data:', data);
                if (!data.success || !data.data || data.data.length === 0) {
                    document.getElementById('orders-table').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Chưa có đơn hàng</td></tr>';
                    return;
                }
                const html = data.data.map(o => {
                    console.log('🧾 Order:', o.ma_don_hang, 'Payment:', o.phuong_thuc_thanh_toan, 'Total:', o.tong_tien);
                    const codInfo = getCODPaymentInfo(o.phuong_thuc_thanh_toan, o.tong_tien);
                    console.log('💰 COD Info:', codInfo);
                    const paymentBadge = o.phuong_thuc_thanh_toan === 'COD' 
                        ? `<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">COD - Cọc 50%</span>`
                        : `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">${o.phuong_thuc_thanh_toan || 'Đã TT'}</span>`;
                    
                    const priceDisplay = codInfo.isDeposit 
                        ? `<div class="font-bold text-green-600">${formatPrice(o.tong_tien)}</div>
                           <div class="text-xs text-orange-600">Còn: ${formatPrice(codInfo.remainingAmount)}</div>`
                        : `<div class="font-bold text-green-600">${formatPrice(o.tong_tien)}</div>`;
                    
                    return `
                    <tr class="border-b hover:bg-blue-50 transition">
                        <td class="px-4 py-3 font-semibold text-blue-600">#${o.ma_don_hang}</td>
                        <td class="px-4 py-3 font-medium">${o.ten_dang_nhap || o.email || 'Khách'}</td>
                        <td class="px-4 py-3 text-right">${priceDisplay}</td>
                        <td class="px-4 py-3 text-center">${paymentBadge}</td>
                        <td class="px-4 py-3 text-center">${getStatusBadge(o.trang_thai)}</td>
                        <td class="px-4 py-3 text-center text-gray-600">${formatDate(o.ngay_tao)}</td>
                        <td class="px-4 py-3 text-center">
                            <button onclick="viewOrder(${o.ma_don_hang})" class="px-2 py-1 rounded text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 mr-1" title="Xem chi tiết">👁️</button>
                            <button onclick="printInvoice(${o.ma_don_hang})" class="px-2 py-1 rounded text-sm bg-green-100 hover:bg-green-200 text-green-700 mr-1" title="In hóa đơn">🖨️</button>
                            ${getNextStatusButton(o.ma_don_hang, o.trang_thai)}
                        </td>
                    </tr>
                `}).join('');
                document.getElementById('orders-table').innerHTML = html;
            } catch (error) {
                console.error('❌ Error loading orders:', error);
                document.getElementById('orders-table').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Lỗi kết nối</td></tr>';
            }
        }
        
        function drawOrderCharts(stats) {
            console.log('🎨 Drawing order charts with stats:', stats);
            
            // Destroy existing charts
            Object.values(orderCharts).forEach(c => {
                try { if (c && c.destroy) c.destroy(); } catch(e) {}
            });
            orderCharts = {};
            
            // Lấy dữ liệu từ stats
            const statusMap = { dang_xu_ly: 0, dang_giao: 0, hoan_thanh: 0, da_huy: 0 };
            if (stats.status_stats && Array.isArray(stats.status_stats)) {
                stats.status_stats.forEach(s => { 
                    if (s.trang_thai) {
                        statusMap[s.trang_thai] = parseInt(s.count) || 0;
                    }
                });
            }
            
            console.log('📊 Status map:', statusMap);
            
            // 1. Biểu đồ Doughnut - Trạng thái đơn hàng
            const statusLabels = ['Đang xử lý', 'Đang giao', 'Hoàn thành', 'Đã hủy'];
            const statusData = [statusMap.dang_xu_ly, statusMap.dang_giao, statusMap.hoan_thanh, statusMap.da_huy];
            const statusColors = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];
            const hasStatusData = statusData.some(v => v > 0);
            
            const statusCtx = document.getElementById('orderStatusPieChart');
            if (statusCtx) {
                if (hasStatusData) {
                    orderCharts.statusPie = new Chart(statusCtx, {
                        type: 'doughnut',
                        data: {
                            labels: statusLabels,
                            datasets: [{
                                data: statusData,
                                backgroundColor: statusColors,
                                borderWidth: 3,
                                borderColor: '#fff'
                            }]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false,
                            maintainAspectRatio: true,
                            plugins: { 
                                legend: { display: false },
                                tooltip: { 
                                    callbacks: { 
                                        label: ctx => {
                                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                            const percent = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                            return ctx.label + ': ' + ctx.raw + ' (' + percent + '%)';
                                        }
                                    } 
                                }
                            },
                            cutout: '50%'
                        }
                    });
                }
            }
            
            // Legend cho trạng thái
            const statusLegendEl = document.getElementById('status-legend');
            if (statusLegendEl) {
                if (hasStatusData) {
                    statusLegendEl.innerHTML = statusLabels.map((label, i) => `
                        <div class="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full" style="background: ${statusColors[i]}"></span>
                                <span class="font-medium text-xs">${label}</span>
                            </div>
                            <span class="font-bold text-sm">${statusData[i]}</span>
                        </div>
                    `).join('');
                } else {
                    statusLegendEl.innerHTML = '<p class="text-gray-400 text-center py-4 text-sm">Chưa có đơn hàng</p>';
                }
            }
            
            // 2. Biểu đồ Pie - Phương thức thanh toán
            let paymentLabels = ['COD'];
            let paymentData = [stats.total_orders || 0];
            
            if (stats.payment_stats && Array.isArray(stats.payment_stats) && stats.payment_stats.length > 0) {
                paymentLabels = stats.payment_stats.map(p => {
                    const names = { 'COD': 'COD', 'Ngan_Hang': 'Ngân hàng', 'Momo': 'Momo', 'ZaloPay': 'ZaloPay', 'momo': 'Momo' };
                    return names[p.phuong_thuc] || p.phuong_thuc || 'Khác';
                });
                paymentData = stats.payment_stats.map(p => parseInt(p.count) || 0);
            }
            
            const paymentColors = ['#1e3a5f', '#3b82f6', '#60a5fa', '#93c5fd'];
            const hasPaymentData = paymentData.some(v => v > 0);
            
            const paymentCtx = document.getElementById('orderPaymentChart');
            if (paymentCtx && hasPaymentData) {
                orderCharts.payment = new Chart(paymentCtx, {
                    type: 'pie',
                    data: {
                        labels: paymentLabels,
                        datasets: [{
                            data: paymentData,
                            backgroundColor: paymentColors.slice(0, paymentLabels.length),
                            borderWidth: 3,
                            borderColor: '#fff'
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        maintainAspectRatio: true,
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: ctx => {
                                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                        const percent = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                        return ctx.label + ': ' + ctx.raw + ' đơn (' + percent + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Legend cho thanh toán
            const paymentLegendEl = document.getElementById('payment-legend');
            if (paymentLegendEl) {
                if (hasPaymentData) {
                    paymentLegendEl.innerHTML = paymentLabels.map((label, i) => `
                        <div class="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full" style="background: ${paymentColors[i] || '#ccc'}"></span>
                                <span class="font-medium text-xs">${label}</span>
                            </div>
                            <span class="font-bold text-sm">${paymentData[i] || 0}</span>
                        </div>
                    `).join('');
                } else {
                    paymentLegendEl.innerHTML = '<p class="text-gray-400 text-center py-4 text-sm">Chưa có dữ liệu</p>';
                }
            }
            
            // 3. Biểu đồ Funnel - Quy trình đơn hàng
            const totalOrders = stats.total_orders || 0;
            const funnelEl = document.getElementById('funnel-chart');
            if (funnelEl) {
                if (totalOrders > 0) {
                    const funnelData = [
                        { label: 'Tổng đơn', value: totalOrders, color: '#ef4444', width: 100 },
                        { label: 'Xử lý', value: statusMap.dang_xu_ly + statusMap.dang_giao + statusMap.hoan_thanh, color: '#f59e0b', width: 80 },
                        { label: 'Đang giao', value: statusMap.dang_giao + statusMap.hoan_thanh, color: '#3b82f6', width: 60 },
                        { label: 'Hoàn thành', value: statusMap.hoan_thanh, color: '#22c55e', width: 40 }
                    ];
                    funnelEl.innerHTML = funnelData.map(item => `
                        <div class="relative flex items-center justify-center mb-1" style="width: ${item.width}%">
                            <div class="w-full py-2 text-center text-white font-bold text-xs rounded-sm shadow-md" style="background: ${item.color};">
                                ${item.label}: ${item.value}
                            </div>
                        </div>
                    `).join('') + `
                        <div class="mt-3 text-center">
                            <span class="text-xs font-medium text-gray-600">Tỷ lệ hoàn thành: </span>
                            <span class="text-green-600 font-bold text-lg">${totalOrders > 0 ? Math.round(statusMap.hoan_thanh / totalOrders * 100) : 0}%</span>
                        </div>
                    `;
                } else {
                    funnelEl.innerHTML = '<p class="text-gray-400 text-center py-8 text-sm">Chưa có đơn hàng</p>';
                }
            }
        }
        function searchOrders() { clearTimeout(window.ost); window.ost = setTimeout(loadOrders, 300); }
        async function viewOrder(id) {
            const data = await apiCall(`/admin/orders/${id}`);
            if (data.success) {
                const o = data.data;
                const codInfo = getCODPaymentInfo(o.phuong_thuc_thanh_toan, o.tong_tien);
                const paymentMethodName = {
                    'COD': 'Thanh toán khi nhận hàng (COD)',
                    'Momo': 'Ví MoMo',
                    'Ngan_Hang': 'Chuyển khoản ngân hàng',
                    'ZaloPay': 'ZaloPay'
                }[o.phuong_thuc_thanh_toan] || o.phuong_thuc_thanh_toan;
                
                let paymentInfo = `<p class="text-sm">Phương thức: ${paymentMethodName}</p>`;
                if (codInfo.isDeposit) {
                    paymentInfo += `
                        <div class="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p class="text-sm font-semibold text-orange-700">💰 Đã cọc 50%: ${formatPrice(codInfo.depositAmount)}</p>
                            <p class="text-sm font-bold text-red-600 mt-1">📦 Còn phải thu khi giao: ${formatPrice(codInfo.remainingAmount)}</p>
                        </div>
                    `;
                }
                
                document.getElementById('order-detail-id').textContent = o.ma_don_hang;
                document.getElementById('order-detail-content').innerHTML = `
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-bold mb-3">👤 Khách hàng</h4>
                            <p class="text-sm">Tên: ${o.ten_dang_nhap || 'Khách'}</p>
                            <p class="text-sm">Email: ${o.email || '-'}</p>
                            <p class="text-sm">Địa chỉ: ${o.dia_chi_giao || '-'}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-bold mb-3">📋 Đơn hàng</h4>
                            <p class="text-sm">Ngày đặt: ${formatDate(o.ngay_tao)}</p>
                            <p class="text-sm">Trạng thái: ${getStatusBadge(o.trang_thai)}</p>
                            ${paymentInfo}
                        </div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <h4 class="font-bold mb-3">📦 Sản phẩm</h4>
                        <div class="space-y-2">
                            ${o.chi_tiet ? o.chi_tiet.map(item => `
                                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span>${item.ten_san_pham} x ${item.so_luong}</span>
                                    <span class="font-semibold">${formatPrice(item.gia * item.so_luong)}</span>
                                </div>
                            `).join('') : '<p class="text-gray-500">Không có sản phẩm</p>'}
                        </div>
                        <div class="mt-4 pt-4 border-t">
                            <div class="flex justify-between text-xl font-bold">
                                <span>Tổng cộng:</span>
                                <span class="text-green-600">${formatPrice(o.tong_tien)}</span>
                            </div>
                        </div>
                    </div>
                `;
                document.getElementById('order-detail-modal').classList.add('active');
            }
        }

        // ==================== PRINT INVOICE FUNCTIONS ====================
        
        async function printInvoice(orderId) {
            try {
                const data = await apiCall(`/admin/orders/${orderId}`);
                if (!data.success) {
                    alert('❌ Không thể tải thông tin đơn hàng');
                    return;
                }
                
                const order = data.data;
                renderInvoice(order);
                document.getElementById('invoice-modal').classList.add('active');
            } catch (error) {
                console.error('Print invoice error:', error);
                alert('❌ Có lỗi xảy ra khi tải hóa đơn');
            }
        }

        function renderInvoice(order) {
            const container = document.getElementById('invoice-content');
            if (!container) return;
            
            const codInfo = getCODPaymentInfo(order.phuong_thuc_thanh_toan, order.tong_tien);
            const paymentMethodName = {
                'COD': 'Thanh toán khi nhận hàng (COD)',
                'Momo': 'Ví MoMo',
                'Ngan_Hang': 'Chuyển khoản ngân hàng',
                'ZaloPay': 'ZaloPay'
            }[order.phuong_thuc_thanh_toan] || order.phuong_thuc_thanh_toan;
            
            // Render chi tiết sản phẩm
            let productsHtml = '';
            if (order.chi_tiet && order.chi_tiet.length > 0) {
                productsHtml = order.chi_tiet.map((item, index) => `
                    <tr class="border-b">
                        <td class="py-3 px-2 text-center">${index + 1}</td>
                        <td class="py-3 px-2">${item.ten_san_pham}</td>
                        <td class="py-3 px-2 text-center">${item.so_luong}</td>
                        <td class="py-3 px-2 text-right">${formatPrice(item.gia)}</td>
                        <td class="py-3 px-2 text-right font-semibold">${formatPrice(item.so_luong * item.gia)}</td>
                    </tr>
                `).join('');
            }
            
            const html = `
                <div class="invoice-print-area bg-white">
                    <!-- Header -->
                    <div class="text-center mb-8 pb-6 border-b-2 border-gray-300">
                        <h1 class="text-4xl font-bold text-blue-600 mb-2">YẾN NHI TECH</h1>
                        <p class="text-gray-600">Địa chỉ: 74-76 Lê Lợi, Phường 2, Trà Vinh</p>
                        <p class="text-gray-600">Điện thoại: 0123-456-789 | Email: contact@yennhitech.com</p>
                    </div>
                    
                    <!-- Invoice Title -->
                    <div class="text-center mb-6">
                        <h2 class="text-3xl font-bold text-gray-800 mb-2">HÓA ĐƠN BÁN HÀNG</h2>
                        <p class="text-lg text-gray-600">Số: <span class="font-bold text-blue-600">#${order.ma_don_hang}</span></p>
                        <p class="text-sm text-gray-500">Ngày: ${new Date(order.ngay_tao).toLocaleDateString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                    
                    <!-- Customer Info -->
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h3 class="font-bold text-lg mb-3 text-gray-800">👤 Thông tin khách hàng</h3>
                            <p class="mb-2"><span class="font-semibold">Họ tên:</span> ${order.ten_dang_nhap || 'Khách hàng'}</p>
                            <p class="mb-2"><span class="font-semibold">Email:</span> ${order.email || '-'}</p>
                            <p class="mb-2"><span class="font-semibold">Số điện thoại:</span> ${order.so_dien_thoai || '-'}</p>
                            <p><span class="font-semibold">Địa chỉ:</span> ${order.dia_chi_giao || '-'}</p>
                        </div>
                        
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-bold text-lg mb-3 text-gray-800">📋 Thông tin đơn hàng</h3>
                            <p class="mb-2"><span class="font-semibold">Trạng thái:</span> <span class="text-green-600 font-bold">${getStatusText(order.trang_thai)}</span></p>
                            <p class="mb-2"><span class="font-semibold">Thanh toán:</span> ${paymentMethodName}</p>
                            ${codInfo.isDeposit ? `
                                <p class="mb-2 text-orange-600"><span class="font-semibold">Đã cọc 50%:</span> ${formatPrice(codInfo.depositAmount)}</p>
                                <p class="text-red-600 font-bold"><span class="font-semibold">Còn phải thu:</span> ${formatPrice(codInfo.remainingAmount)}</p>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Products Table -->
                    <div class="mb-6">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-800 text-white">
                                    <th class="py-3 px-2 text-center w-12">STT</th>
                                    <th class="py-3 px-2 text-left">Tên sản phẩm</th>
                                    <th class="py-3 px-2 text-center w-24">Số lượng</th>
                                    <th class="py-3 px-2 text-right w-32">Đơn giá</th>
                                    <th class="py-3 px-2 text-right w-32">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Total -->
                    <div class="flex justify-end mb-8">
                        <div class="w-96">
                            <div class="bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
                                <div class="flex justify-between mb-3 text-lg">
                                    <span class="font-semibold">Tạm tính:</span>
                                    <span>${formatPrice(order.tong_tien)}</span>
                                </div>
                                <div class="flex justify-between mb-3 text-lg">
                                    <span class="font-semibold">Phí vận chuyển:</span>
                                    <span>${formatPrice(order.phi_van_chuyen || 0)}</span>
                                </div>
                                <div class="border-t-2 border-gray-300 pt-3 mt-3">
                                    <div class="flex justify-between text-2xl font-bold text-blue-600">
                                        <span>TỔNG CỘNG:</span>
                                        <span>${formatPrice(order.tong_tien)}</span>
                                    </div>
                                </div>
                                ${codInfo.isDeposit ? `
                                    <div class="mt-4 pt-4 border-t border-gray-300">
                                        <div class="flex justify-between text-lg text-orange-600 mb-2">
                                            <span class="font-semibold">Đã thanh toán (cọc 50%):</span>
                                            <span class="font-bold">${formatPrice(codInfo.depositAmount)}</span>
                                        </div>
                                        <div class="flex justify-between text-xl font-bold text-red-600">
                                            <span>Còn phải thu:</span>
                                            <span>${formatPrice(codInfo.remainingAmount)}</span>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="mt-12 pt-6 border-t-2 border-gray-300">
                        <div class="grid grid-cols-2 gap-12 text-center">
                            <div>
                                <p class="font-bold mb-16">Người mua hàng</p>
                                <p class="text-sm text-gray-600">(Ký và ghi rõ họ tên)</p>
                            </div>
                            <div>
                                <p class="font-bold mb-16">Người bán hàng</p>
                                <p class="text-sm text-gray-600">(Ký và ghi rõ họ tên)</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Note -->
                    <div class="mt-8 text-center text-sm text-gray-500">
                        <p>Cảm ơn quý khách đã mua hàng tại Yến Nhi Tech!</p>
                        <p>Mọi thắc mắc xin vui lòng liên hệ: 0123-456-789</p>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
        }

        function getStatusText(status) {
            const statusMap = {
                'dang_xu_ly': 'Đang xử lý',
                'dang_giao': 'Đang giao hàng',
                'hoan_thanh': 'Hoàn thành',
                'da_huy': 'Đã hủy'
            };
            return statusMap[status] || status;
        }

        function closeInvoiceModal() {
            document.getElementById('invoice-modal').classList.remove('active');
        }

        function printInvoiceContent() {
            const printContent = document.getElementById('invoice-content').innerHTML;
            const originalContent = document.body.innerHTML;
            
            // Tạo style cho in
            const printStyles = `
                <style>
                    @media print {
                        body { margin: 0; padding: 20px; }
                        .invoice-print-area { max-width: 210mm; margin: 0 auto; }
                        @page { size: A4; margin: 10mm; }
                    }
                </style>
            `;
            
            // Thay thế nội dung trang bằng hóa đơn
            document.body.innerHTML = printStyles + printContent;
            
            // In
            window.print();
            
            // Khôi phục nội dung gốc
            document.body.innerHTML = originalContent;
            
            // Reload lại để khôi phục các event listeners
            location.reload();
        }

        // ==================== END PRINT INVOICE FUNCTIONS ====================

        function closeOrderModal() { document.getElementById('order-modal').classList.remove('active'); }
        async function createSampleOrders() {
            if (!confirm('Tạo 5 đơn hàng mẫu?')) return;
            const d = await apiCall('/admin/create-sample-orders', 'POST');
            if (d.success) { alert(d.message); loadOrders(); loadDashboard(); } else alert(d.message || 'Lỗi');
        }
        async function updateOrderStatus(id, status) {
            const d = await apiCall(`/admin/orders/${id}/status`, 'PUT', { trang_thai: status });
            if (d.success) { alert('Đã cập nhật!'); loadOrders(); } else alert(d.message);
        }

        // Users
        async function loadUsers() {
            try {
                const search = document.getElementById('user-search')?.value || '';
                const role = document.getElementById('user-role-filter')?.value || '';
                const data = await apiCall(`/admin/users?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`);
                
                if (data.success && data.data) {
                    // Cập nhật stats
                    const total = data.data.length;
                    const active = data.data.filter(u => u.trang_thai === 1).length;
                    const admins = data.data.filter(u => u.vai_tro === 'admin').length;
                    const locked = data.data.filter(u => u.trang_thai === 0).length;
                    
                    document.getElementById('user-total').textContent = total;
                    document.getElementById('user-active').textContent = active;
                    document.getElementById('user-admin').textContent = admins;
                    document.getElementById('user-locked').textContent = locked;
                    
                    if (data.data.length === 0) {
                        document.getElementById('users-table').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">Không có khách hàng nào</td></tr>';
                        return;
                    }
                    
                    const html = data.data.map(u => {
                        const avatarUrl = u.hinh_anh ? (u.hinh_anh.startsWith('http') ? u.hinh_anh : `${window.location.origin}${u.hinh_anh}`) : '';
                        return `
                        <tr class="border-b hover:bg-gray-50 transition">
                            <td class="px-4 py-3 text-center">
                                <div class="w-10 h-10 rounded-full overflow-hidden mx-auto bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                                    ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='👤'">` : '<span class="text-xl">👤</span>'}
                                </div>
                            </td>
                            <td class="px-4 py-3 font-semibold text-gray-800">${u.ten_dang_nhap || 'N/A'}</td>
                            <td class="px-4 py-3 text-gray-600">${u.email || 'N/A'}</td>
                            <td class="px-4 py-3 text-center text-gray-700 font-medium">${u.so_dien_thoai || '-'}</td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${u.vai_tro === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                    ${u.vai_tro === 'admin' ? '👑 Admin' : '👤 Khách hàng'}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 whitespace-nowrap">${u.so_don_hang || 0} đơn</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${u.trang_thai === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                    ${u.trang_thai === 1 ? '✓ Hoạt động' : '✗ Khóa'}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button onclick="toggleUserStatus(${u.ma_tai_khoan}, ${u.trang_thai})" class="hover:scale-110 transition-transform" title="${u.trang_thai === 1 ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}">
                                        <svg class="w-5 h-5 ${u.trang_thai === 1 ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                                        </svg>
                                    </button>
                                    <button onclick="deleteUser(${u.ma_tai_khoan})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform" title="Xóa tài khoản">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `}).join('');
                    document.getElementById('users-table').innerHTML = html;
                } else {
                    document.getElementById('users-table').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>';
                }
            } catch (error) {
                console.error('Load users error:', error);
                document.getElementById('users-table').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">❌ Lỗi tải dữ liệu khách hàng</td></tr>';
            }
        }
        function searchUsers() { clearTimeout(window.ust); window.ust = setTimeout(loadUsers, 300); }
        function openUserModal(u = null) {
            document.getElementById('user-modal').classList.add('active');
            document.getElementById('user-modal-title').textContent = u ? 'Sửa tài khoản' : 'Thêm tài khoản';
            document.getElementById('user-form').reset();
            document.getElementById('user-id').value = u?.ma_tai_khoan || '';
            document.getElementById('user-password-field').style.display = u ? 'none' : 'block';
            document.getElementById('user-email').disabled = !!u;
            if (u) { document.getElementById('user-name').value = u.ten_dang_nhap; document.getElementById('user-email').value = u.email; document.getElementById('user-role').value = u.vai_tro; }
        }
        function closeUserModal() { document.getElementById('user-modal').classList.remove('active'); }
        
        // Xem chi tiết khách hàng
        async function viewUserDetail(id) {
            console.log('viewUserDetail called with id:', id);
            try {
                const d = await apiCall(`/admin/users/${id}`);
                console.log('API response:', d);
                
                if (d.success) {
                    const u = d.data;
                    const avatarUrl = u.hinh_anh ? (u.hinh_anh.startsWith('http') ? u.hinh_anh : `${window.location.origin}${u.hinh_anh}`) : '';
                    
                    // Tạo HTML cho lịch sử đơn hàng
                    let ordersHTML = '<p class="text-gray-500 text-center py-4">Chưa có đơn hàng</p>';
                    if (u.orders && u.orders.length > 0) {
                        ordersHTML = `
                            <div class="space-y-2 max-h-60 overflow-y-auto">
                                ${u.orders.slice(0, 5).map(order => `
                                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition">
                                        <div class="flex-1">
                                            <p class="font-semibold text-gray-800">Đơn #${order.ma_don_hang}</p>
                                            <p class="text-xs text-gray-500">${new Date(order.ngay_tao).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="font-bold text-green-600">${formatPrice(order.tong_tien)}</p>
                                            <span class="text-xs px-2 py-1 rounded ${
                                                order.trang_thai === 'hoan_thanh' ? 'bg-green-100 text-green-700' :
                                                order.trang_thai === 'dang_giao' ? 'bg-blue-100 text-blue-700' :
                                                order.trang_thai === 'da_huy' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }">${
                                                order.trang_thai === 'hoan_thanh' ? 'Hoàn thành' :
                                                order.trang_thai === 'dang_giao' ? 'Đang giao' :
                                                order.trang_thai === 'da_huy' ? 'Đã hủy' :
                                                'Đang xử lý'
                                            }</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${u.orders.length > 5 ? `<p class="text-center text-sm text-gray-500 pt-2">... và ${u.orders.length - 5} đơn khác</p>` : ''}
                            </div>
                        `;
                    }
                    
                    const detailHTML = `
                        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="this.remove()">
                            <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                                <!-- Header -->
                                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl relative">
                                    <button onclick="this.closest('.fixed').remove();" class="absolute top-4 right-4 text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                                    <div class="flex items-center gap-4">
                                        <div class="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-lg">
                                            ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">` : '<span class="text-4xl">👤</span>'}
                                        </div>
                                        <div class="flex-1">
                                            <h2 class="text-2xl font-bold mb-1">${u.ten_dang_nhap || 'N/A'}</h2>
                                            <p class="opacity-90 text-sm">${u.email}</p>
                                            <div class="flex gap-2 mt-2">
                                                <span class="px-3 py-1 rounded-full text-xs font-semibold ${u.vai_tro === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}">${u.vai_tro === 'admin' ? '👑 Admin' : '👤 Khách hàng'}</span>
                                                <span class="px-3 py-1 rounded-full text-xs font-semibold ${u.trang_thai === 1 ? 'bg-green-500' : 'bg-red-500'}">${u.trang_thai === 1 ? '✓ Hoạt động' : '✗ Khóa'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Body -->
                                <div class="p-6 space-y-6">
                                    <!-- Thông tin cơ bản -->
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <span class="text-blue-600">📋</span> Thông tin cơ bản
                                        </h3>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-400">
                                                <p class="text-xs text-gray-500 mb-1">📧 Email</p>
                                                <p class="font-semibold text-gray-800">${u.email}</p>
                                            </div>
                                            <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-green-400">
                                                <p class="text-xs text-gray-500 mb-1">📱 Số điện thoại</p>
                                                <p class="font-semibold text-gray-800">${u.so_dien_thoai || '<span class="text-gray-400">Chưa cập nhật</span>'}</p>
                                            </div>
                                            <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-400">
                                                <p class="text-xs text-gray-500 mb-1">📅 Ngày tạo</p>
                                                <p class="font-semibold text-gray-800">${u.ngay_tao ? new Date(u.ngay_tao).toLocaleDateString('vi-VN', {year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'}</p>
                                            </div>
                                            <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-400">
                                                <p class="text-xs text-gray-500 mb-1">🔐 Đăng nhập qua</p>
                                                <p class="font-semibold text-gray-800">${u.google_id ? '🔗 Google OAuth' : '📧 Email & Mật khẩu'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Thống kê hoạt động -->
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <span class="text-green-600">📊</span> Thống kê hoạt động
                                        </h3>
                                        <div class="grid grid-cols-3 gap-3">
                                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center border border-blue-200">
                                                <p class="text-3xl font-bold text-blue-600">${u.so_don_hang || 0}</p>
                                                <p class="text-sm text-gray-600 mt-1">Tổng đơn hàng</p>
                                            </div>
                                            <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center border border-green-200">
                                                <p class="text-3xl font-bold text-green-600">${u.orders?.filter(o => o.trang_thai === 'hoan_thanh').length || 0}</p>
                                                <p class="text-sm text-gray-600 mt-1">Đã hoàn thành</p>
                                            </div>
                                            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg text-center border border-purple-200">
                                                <p class="text-2xl font-bold text-purple-600">${formatPrice(u.orders?.filter(o => o.trang_thai === 'hoan_thanh').reduce((sum, o) => sum + parseFloat(o.tong_tien || 0), 0) || 0)}</p>
                                                <p class="text-sm text-gray-600 mt-1">Tổng chi tiêu</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Lịch sử đơn hàng -->
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <span class="text-orange-600">🛒</span> Lịch sử đơn hàng gần đây
                                        </h3>
                                        ${ordersHTML}
                                    </div>
                                    
                                    <!-- Actions -->
                                    <div class="flex gap-2 pt-2 border-t">
                                        <button onclick="editUser(${id}); this.closest('.fixed').remove();" class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md hover:shadow-lg">
                                            ✏️ Chỉnh sửa
                                        </button>
                                        <button onclick="toggleUserStatus(${id}, ${u.trang_thai}); this.closest('.fixed').remove();" class="flex-1 ${u.trang_thai === 1 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white py-3 px-4 rounded-lg transition font-semibold shadow-md hover:shadow-lg">
                                            ${u.trang_thai === 1 ? '🔒 Khóa tài khoản' : '🔓 Mở khóa'}
                                        </button>
                                        <button onclick="this.closest('.fixed').remove();" class="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold">
                                            Đóng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.body.insertAdjacentHTML('beforeend', detailHTML);
                    console.log('Modal inserted successfully');
                } else {
                    alert('Không thể lấy thông tin khách hàng: ' + (d.message || 'Lỗi không xác định'));
                }
            } catch (error) {
                console.error('Error in viewUserDetail:', error);
                alert('Có lỗi xảy ra: ' + error.message);
            }
        }
        
        async function editUser(id) { const d = await apiCall(`/admin/users/${id}`); if (d.success) openUserModal(d.data); }
        async function toggleUserStatus(id, currentStatus) { 
            const action = currentStatus === 1 ? 'khóa' : 'mở khóa';
            if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return;
            const d = await apiCall(`/admin/users/${id}/toggle-status`, 'PUT'); 
            if (d.success) { 
                alert(`Đã ${action} tài khoản!`); 
                loadUsers(); 
            } else {
                alert(d.message || 'Lỗi cập nhật trạng thái');
            }
        }
        async function deleteUser(id) { if (!confirm('Xóa tài khoản này?')) return; const d = await apiCall(`/admin/users/${id}`, 'DELETE'); if (d.success) { alert('Đã xóa!'); loadUsers(); } else alert(d.message); }
        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('user-id').value;
            const body = { ten_dang_nhap: document.getElementById('user-name').value, vai_tro: document.getElementById('user-role').value };
            if (!id) { body.email = document.getElementById('user-email').value; body.mat_khau = document.getElementById('user-password').value; if (!body.mat_khau) { alert('Vui lòng nhập mật khẩu'); return; } }
            const d = await apiCall(`/admin/users${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', body);
            if (d.success) { alert(id ? 'Đã cập nhật!' : 'Đã thêm!'); closeUserModal(); loadUsers(); } else alert(d.message);
        });

        // ==========================================
        // STORE CUSTOMERS - KHÁCH HÀNG TẠI CỬA HÀNG
        // ==========================================
        let storeProductsList = [];

        async function loadStoreProductsDropdown() {
            try {
                const data = await apiCall('/admin/products');
                if (data.success && data.data) {
                    storeProductsList = data.data;
                    const select = document.getElementById('store-customer-product');
                    if (select) {
                        select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>' + 
                            storeProductsList.map(p => `<option value="${p.ma_san_pham}">${p.ten_san_pham} (ID: ${p.ma_san_pham} - Tồn: ${p.so_luong})</option>`).join('');
                    }
                }
            } catch (err) {
                console.error('Error loading products for store customer:', err);
            }
        }

        async function loadStoreCustomers() {
            try {
                const search = document.getElementById('store-customer-search')?.value || '';
                const status = document.getElementById('store-customer-status-filter')?.value || '';
                
                const data = await apiCall(`/admin/store-customers?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
                
                if (data.success && data.data) {
                    const records = data.data;
                    
                    // Update stats
                    const total = records.length;
                    const active = records.filter(r => r.is_under_warranty).length;
                    const expired = records.filter(r => !r.is_under_warranty).length;
                    
                    document.getElementById('store-customer-total').textContent = total;
                    document.getElementById('store-customer-active-warranty').textContent = active;
                    document.getElementById('store-customer-expired-warranty').textContent = expired;
                    
                    const tbody = document.getElementById('store-customers-table');
                    if (!tbody) return;
                    
                    if (records.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400 italic">Không tìm thấy khách hàng nào mua tại cửa hàng</td></tr>';
                        return;
                    }
                    
                    tbody.innerHTML = records.map(r => {
                        const ngayBan = r.ngay_ban ? new Date(r.ngay_ban).toLocaleDateString('vi-VN') : 'N/A';
                        const ngayHetHan = r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('vi-VN') : 'N/A';
                        
                        const statusBadge = r.is_under_warranty 
                            ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">✓ Còn hạn</span>`
                            : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">✗ Hết hạn</span>`;
                            
                        return `
                        <tr class="hover:bg-slate-50/50 transition">
                            <td class="px-6 py-4 font-semibold text-slate-700">${r.ma_hoa_don || 'N/A'}</td>
                            <td class="px-6 py-4">
                                <div class="font-bold text-slate-800">${r.ten_khach_hang}</div>
                                <div class="text-xs text-slate-500 font-mono">${r.so_dien_thoai}</div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="font-medium text-slate-800">${r.ten_san_pham || 'N/A'}</div>
                                <div class="text-xs text-slate-500">Mã sản phẩm: ${r.ma_san_pham}</div>
                            </td>
                            <td class="px-6 py-4 text-slate-600">${ngayBan}</td>
                            <td class="px-6 py-4 text-slate-600">
                                <div>${ngayHetHan}</div>
                                <div class="text-xs text-slate-400">Thời hạn: ${r.warranty_months} tháng</div>
                            </td>
                            <td class="px-6 py-4">${statusBadge}</td>
                            <td class="px-6 py-4 text-center">
                                <div class="flex items-center justify-center gap-3">
                                    <button onclick="openStoreCustomerModal(${r.ma_hoa_don_bh})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all" title="Chỉnh sửa">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button onclick="deleteStoreCustomer(${r.ma_hoa_don_bh})" class="text-red-500 hover:text-red-700 hover:scale-110 transition-all" title="Xóa">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('');
                }
            } catch (err) {
                console.error('Error loading store customers:', err);
                const tbody = document.getElementById('store-customers-table');
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-rose-500">Lỗi tải dữ liệu bảo hành</td></tr>';
            }
        }

        function searchStoreCustomers() {
            clearTimeout(window.sct);
            window.sct = setTimeout(loadStoreCustomers, 300);
        }

        async function openStoreCustomerModal(id = null) {
            const modal = document.getElementById('store-customer-modal');
            const form = document.getElementById('store-customer-form');
            if (!modal || !form) return;
            
            modal.classList.add('active');
            form.reset();
            
            // Populate product dropdown if not already populated
            await loadStoreProductsDropdown();
            
            document.getElementById('store-customer-id').value = id || '';
            document.getElementById('store-customer-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('store-customer-warranty').value = 12;
            document.getElementById('store-customer-modal-title').textContent = id ? 'Sửa thông tin mua hàng tại cửa hàng' : 'Thêm thông tin mua hàng tại cửa hàng';
            
            if (id) {
                try {
                    const data = await apiCall(`/admin/store-customers?search=${id}`);
                    if (data.success && data.data && data.data.length > 0) {
                        const record = data.data.find(r => r.ma_hoa_don_bh === id);
                        if (record) {
                            document.getElementById('store-customer-name').value = record.ten_khach_hang;
                            document.getElementById('store-customer-phone').value = record.so_dien_thoai;
                            document.getElementById('store-customer-product').value = record.ma_san_pham;
                            document.getElementById('store-customer-date').value = new Date(record.ngay_ban).toISOString().split('T')[0];
                            document.getElementById('store-customer-warranty').value = record.warranty_months;
                            document.getElementById('store-customer-notes').value = record.notes || '';
                        }
                    }
                } catch (err) {
                    console.error('Error fetching store customer detail:', err);
                }
            }
        }

        function closeStoreCustomerModal() {
            document.getElementById('store-customer-modal')?.classList.remove('active');
        }

        async function saveStoreCustomer(event) {
            event.preventDefault();
            const id = document.getElementById('store-customer-id').value;
            const body = {
                ten_khach_hang: document.getElementById('store-customer-name').value.trim(),
                so_dien_thoai: document.getElementById('store-customer-phone').value.trim(),
                ma_san_pham: parseInt(document.getElementById('store-customer-product').value, 10),
                ngay_ban: document.getElementById('store-customer-date').value,
                warranty_months: parseInt(document.getElementById('store-customer-warranty').value, 10),
                ghi_chu: document.getElementById('store-customer-notes').value.trim()
            };
            
            if (!body.ten_khach_hang || !body.so_dien_thoai || !body.ma_san_pham) {
                alert('Vui lòng nhập đầy đủ các trường bắt buộc');
                return;
            }
            
            try {
                const method = id ? 'PUT' : 'POST';
                const endpoint = id ? `/admin/store-customers/${id}` : '/admin/store-customers';
                
                const data = await apiCall(endpoint, method, body);
                if (data.success) {
                    alert(id ? 'Đã cập nhật thành công!' : 'Đã thêm khách hàng thành công!');
                    closeStoreCustomerModal();
                    loadStoreCustomers();
                } else {
                    alert('Lưu thông tin thất bại: ' + (data.message || 'Lỗi không xác định'));
                }
            } catch (err) {
                console.error('Error saving store customer:', err);
                alert('Có lỗi xảy ra khi lưu: ' + err.message);
            }
        }

        async function deleteStoreCustomer(id) {
            if (!confirm('Bạn có chắc chắn muốn xóa bản ghi khách hàng này?')) return;
            try {
                const data = await apiCall(`/admin/store-customers/${id}`, 'DELETE');
                if (data.success) {
                    alert('Đã xóa thành công!');
                    loadStoreCustomers();
                } else {
                    alert('Xóa thất bại: ' + (data.message || 'Lỗi không xác định'));
                }
            } catch (err) {
                console.error('Error deleting store customer:', err);
                alert('Có lỗi xảy ra: ' + err.message);
            }
        }

        document.getElementById('store-customer-form')?.addEventListener('submit', saveStoreCustomer);

        // Bind global functions to window so inline onclick handlers work
        window.searchStoreCustomers = searchStoreCustomers;
        window.openStoreCustomerModal = openStoreCustomerModal;
        window.closeStoreCustomerModal = closeStoreCustomerModal;
        window.deleteStoreCustomer = deleteStoreCustomer;
        window.saveStoreCustomer = saveStoreCustomer;

        // ==========================================
        // NEWS MANAGEMENT
        // ==========================================
        async function loadNews() {
            try {
                const search = document.getElementById('news-search')?.value || '';
                const status = document.getElementById('news-status-filter')?.value || '';
                
                let url = '/news/admin/all?limit=50';
                if (status) url += `&status=${status}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;
                
                const data = await apiCall(url);
                
                if (data.success && data.data) {
                    const news = data.data;
                    
                    // Update stats
                    document.getElementById('news-total').textContent = news.length;
                    document.getElementById('news-active').textContent = news.filter(n => n.trang_thai === 'hien_thi').length;
                    document.getElementById('news-featured').textContent = news.filter(n => n.noi_bat === 1).length;
                    document.getElementById('news-views').textContent = news.reduce((sum, n) => sum + (n.luot_xem || 0), 0);
                    
                    // Render table
                    const html = news.map(n => `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="px-4 py-3">
                                <img src="${n.hinh_anh || PLACEHOLDER_IMG}" alt="${n.tieu_de}" class="w-20 h-14 object-cover rounded-lg shadow" onerror="this.src=PLACEHOLDER_IMG">
                            </td>
                            <td class="px-4 py-3">
                                <p class="font-semibold text-gray-800 line-clamp-2">${n.tieu_de}</p>
                                <p class="text-xs text-gray-500 mt-1">${formatDate(n.ngay_tao)}</p>
                            </td>
                            <td class="px-4 py-3 text-center text-gray-600">${n.danh_muc || 'Công nghệ'}</td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-1 rounded-full text-xs font-bold ${getNewsTagColor(n.mau_tag)}">${n.tag || 'Tin tức'}</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button onclick="toggleNewsFeatured(${n.ma_tin_tuc})" class="text-2xl hover:scale-110 transition-transform" title="${n.noi_bat ? 'Bỏ nổi bật' : 'Đặt nổi bật'}">
                                    ${n.noi_bat ? '⭐' : '☆'}
                                </button>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${getNewsStatusBadge(n.trang_thai)}">${getNewsStatusText(n.trang_thai)}</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button onclick="editNews(${n.ma_tin_tuc})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform inline-block mr-2" title="Sửa">
                                    <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                                <button onclick="deleteNews(${n.ma_tin_tuc})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform inline-block" title="Xóa">
                                    <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `).join('');
                    document.getElementById('news-table').innerHTML = html || '<tr><td colspan="8" class="text-center py-8 text-gray-500">Không có tin tức</td></tr>';
                } else {
                    document.getElementById('news-table').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">Không có tin tức</td></tr>';
                }
            } catch (error) {
                console.error('Load news error:', error);
                document.getElementById('news-table').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">❌ Lỗi tải dữ liệu tin tức</td></tr>';
            }
        }
        
        function getNewsTagColor(color) {
            const colors = {
                'red': 'bg-red-600 text-white',
                'blue': 'bg-blue-600 text-white',
                'green': 'bg-green-600 text-white',
                'yellow': 'bg-yellow-400 text-gray-800',
                'purple': 'bg-purple-600 text-white',
                'orange': 'bg-orange-600 text-white'
            };
            return colors[color] || 'bg-gray-600 text-white';
        }
        
        function getNewsStatusBadge(status) {
            const badges = {
                'hien_thi': 'bg-green-100 text-green-700',
                'an': 'bg-red-100 text-red-700',
                'nhap': 'bg-yellow-100 text-yellow-700'
            };
            return badges[status] || 'bg-gray-100 text-gray-700';
        }
        
        function getNewsStatusText(status) {
            const texts = { 'hien_thi': '✓ Hiển thị', 'an': '✗ Ẩn', 'nhap': '📝 Nháp' };
            return texts[status] || status;
        }
        
        function searchNews() { clearTimeout(window.nst); window.nst = setTimeout(loadNews, 300); }
        
        function openNewsModal(news = null) {
            document.getElementById('news-modal').classList.add('active');
            document.getElementById('news-modal-title').textContent = news ? 'Sửa tin tức' : 'Thêm tin tức';
            document.getElementById('news-form').reset();
            document.getElementById('news-id').value = news?.ma_tin_tuc || '';
            
            if (news) {
                document.getElementById('news-title').value = news.tieu_de || '';
                document.getElementById('news-short-desc').value = news.mo_ta_ngan || '';
                document.getElementById('news-content').value = news.noi_dung || '';
                document.getElementById('news-image').value = news.hinh_anh || '';
                document.getElementById('news-category').value = news.danh_muc || 'Công nghệ';
                document.getElementById('news-tag').value = news.tag || '';
                document.getElementById('news-tag-color').value = news.mau_tag || 'blue';
                document.getElementById('news-status').value = news.trang_thai || 'hien_thi';
                document.getElementById('news-featured').checked = news.noi_bat === 1;
            }
        }
        
        function closeNewsModal() { document.getElementById('news-modal').classList.remove('active'); }
        
        async function editNews(id) {
            try {
                const data = await apiCall(`/news/${id}`);
                if (data.success) {
                    openNewsModal(data.data);
                } else {
                    alert('Không tìm thấy tin tức');
                }
            } catch (error) {
                console.error('Edit news error:', error);
                alert('Lỗi khi tải tin tức');
            }
        }
        
        async function deleteNews(id) {
            if (!confirm('Bạn có chắc muốn xóa tin tức này?')) return;
            try {
                const data = await apiCall(`/news/${id}`, 'DELETE');
                if (data.success) {
                    alert('Đã xóa tin tức!');
                    loadNews();
                } else {
                    alert(data.message || 'Lỗi xóa tin tức');
                }
            } catch (error) {
                console.error('Delete news error:', error);
                alert('Lỗi khi xóa tin tức');
            }
        }
        
        async function toggleNewsFeatured(id) {
            try {
                const data = await apiCall(`/news/${id}/toggle-featured`, 'PUT');
                if (data.success) {
                    loadNews();
                } else {
                    alert(data.message || 'Lỗi cập nhật');
                }
            } catch (error) {
                console.error('Toggle featured error:', error);
            }
        }
        
        document.getElementById('news-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('news-id').value;
            const body = {
                tieu_de: document.getElementById('news-title').value,
                mo_ta_ngan: document.getElementById('news-short-desc').value,
                noi_dung: document.getElementById('news-content').value,
                hinh_anh: document.getElementById('news-image').value,
                danh_muc: document.getElementById('news-category').value,
                tag: document.getElementById('news-tag').value || 'Tin tức',
                mau_tag: document.getElementById('news-tag-color').value,
                trang_thai: document.getElementById('news-status').value,
                noi_bat: document.getElementById('news-featured').checked ? 1 : 0
            };
            
            if (!body.tieu_de) {
                alert('Vui lòng nhập tiêu đề');
                return;
            }
            
            try {
                const data = await apiCall(`/news${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', body);
                if (data.success) {
                    alert(id ? 'Đã cập nhật tin tức!' : 'Đã thêm tin tức mới!');
                    closeNewsModal();
                    loadNews();
                } else {
                    alert(data.message || 'Lỗi lưu tin tức');
                }
            } catch (error) {
                console.error('Save news error:', error);
                alert('Lỗi khi lưu tin tức');
            }
        });

        // ==========================================
        // ARTICLES MANAGEMENT - Quản lý bài viết
        // ==========================================
        let articlesData = [];
        
        async function loadArticles() {
            try {
                const search = document.getElementById('article-search')?.value || '';
                const category = document.getElementById('article-category-filter')?.value || '';
                const status = document.getElementById('article-status-filter')?.value || '';
                
                let url = '/articles/admin/all?limit=50';
                if (category) url += `&category=${category}`;
                if (status) url += `&status=${status}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;
                
                const data = await apiCall(url);
                
                if (data.success && data.data) {
                    articlesData = data.data;
                    
                    // Update stats
                    document.getElementById('articles-total').textContent = articlesData.length;
                    document.getElementById('articles-published').textContent = articlesData.filter(a => a.trang_thai === 'xuat_ban').length;
                    document.getElementById('articles-draft').textContent = articlesData.filter(a => a.trang_thai === 'nhap').length;
                    
                    renderArticlesTable();
                } else {
                    document.getElementById('articles-table').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có bài viết</td></tr>';
                }
            } catch (error) {
                console.error('Load articles error:', error);
                document.getElementById('articles-table').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">❌ Lỗi tải dữ liệu bài viết</td></tr>';
            }
        }
        
        function renderArticlesTable() {
            const html = articlesData.map(a => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">
                        <img src="${a.hinh_anh || PLACEHOLDER_IMG}" alt="${a.tieu_de}" class="w-20 h-14 object-cover rounded-lg shadow" onerror="this.src=PLACEHOLDER_IMG">
                    </td>
                    <td class="px-4 py-3">
                        <p class="font-semibold text-gray-800 line-clamp-2">${a.tieu_de}</p>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-1">${a.mo_ta_ngan || ''}</p>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getArticleCategoryBadge(a.danh_muc)}">${getArticleCategoryText(a.danh_muc)}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 whitespace-nowrap">${a.tac_gia || 'Admin'}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getArticleStatusBadge(a.trang_thai)}">${getArticleStatusText(a.trang_thai)}</span>
                    </td>
                    <td class="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">${formatDate(a.ngay_tao)}</td>
                    <td class="px-4 py-3">
                        <div class="flex items-center justify-center gap-3">
                            <button onclick="editArticle(${a.ma_bai_viet})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform" title="Sửa bài viết">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button onclick="deleteArticle(${a.ma_bai_viet})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform" title="Xóa bài viết">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            document.getElementById('articles-table').innerHTML = html || '<tr><td colspan="8" class="text-center py-8 text-gray-500">Không có bài viết</td></tr>';
        }
        
        function getArticleCategoryBadge(category) {
            const badges = {
                'huong_dan': 'bg-blue-100 text-blue-700',
                'danh_gia': 'bg-green-100 text-green-700',
                'meo_vat': 'bg-amber-100 text-amber-700',
                'so_sanh': 'bg-purple-100 text-purple-700'
            };
            return badges[category] || 'bg-gray-100 text-gray-700';
        }
        
        function getArticleCategoryText(category) {
            const texts = {
                'huong_dan': '📚 Hướng dẫn',
                'danh_gia': '⭐ Đánh giá',
                'meo_vat': '💡 Mẹo vặt',
                'so_sanh': '⚖️ So sánh'
            };
            return texts[category] || category;
        }
        
        function getArticleStatusBadge(status) {
            const badges = {
                'xuat_ban': 'bg-green-100 text-green-700',
                'nhap': 'bg-yellow-100 text-yellow-700',
                'an': 'bg-red-100 text-red-700'
            };
            return badges[status] || 'bg-gray-100 text-gray-700';
        }
        
        function getArticleStatusText(status) {
            const texts = { 'xuat_ban': '✓ Đã xuất bản', 'nhap': '📝 Bản nháp', 'an': '✗ Ẩn' };
            return texts[status] || status;
        }
        
        function searchArticles() { clearTimeout(window.ast); window.ast = setTimeout(loadArticles, 300); }
        
        function openArticleModal(article = null) {
            document.getElementById('article-modal').classList.add('active');
            document.getElementById('article-modal-title').textContent = article ? 'Sửa bài viết' : 'Thêm bài viết';
            document.getElementById('article-form').reset();
            document.getElementById('article-id').value = article?.ma_bai_viet || '';
            document.getElementById('article-image-file').value = '';
            
            if (article) {
                document.getElementById('article-title').value = article.tieu_de || '';
                document.getElementById('article-short-desc').value = article.mo_ta_ngan || '';
                document.getElementById('article-content').value = article.noi_dung || '';
                document.getElementById('article-image').value = article.hinh_anh || '';
                document.getElementById('article-category').value = article.danh_muc || 'huong_dan';
                document.getElementById('article-author').value = article.tac_gia || '';
                document.getElementById('article-tags').value = article.tags || '';
                document.getElementById('article-status').value = article.trang_thai || 'xuat_ban';
                
                // Hiển thị ảnh hiện tại nếu có
                if (article.hinh_anh) {
                    const imgUrl = article.hinh_anh.startsWith('http') ? article.hinh_anh : API_URL.replace('/api', '') + article.hinh_anh;
                    document.getElementById('article-preview-img').src = imgUrl;
                    document.getElementById('article-image-preview').classList.remove('hidden');
                } else {
                    document.getElementById('article-image-preview').classList.add('hidden');
                }
            } else {
                document.getElementById('article-image-preview').classList.add('hidden');
            }
        }
        
        function previewArticleImage(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('article-preview-img').src = e.target.result;
                    document.getElementById('article-image-preview').classList.remove('hidden');
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
        
        function removeArticleImage() {
            document.getElementById('article-image-file').value = '';
            document.getElementById('article-image').value = '';
            document.getElementById('article-image-preview').classList.add('hidden');
        }
        
        async function uploadArticleImage() {
            const fileInput = document.getElementById('article-image-file');
            if (!fileInput.files || !fileInput.files[0]) {
                return document.getElementById('article-image').value; // Trả về URL cũ nếu không có file mới
            }
            
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            
            try {
                const response = await fetch(`${API_URL}/articles/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: formData
                });
                
                const data = await response.json();
                if (data.success) {
                    return data.data.url;
                } else {
                    throw new Error(data.message || 'Lỗi upload ảnh');
                }
            } catch (error) {
                console.error('Upload image error:', error);
                throw error;
            }
        }
        
        function closeArticleModal() { document.getElementById('article-modal').classList.remove('active'); }
        
        async function editArticle(id) {
            try {
                const data = await apiCall(`/articles/${id}`);
                if (data.success) {
                    openArticleModal(data.data);
                } else {
                    alert('Không tìm thấy bài viết');
                }
            } catch (error) {
                console.error('Edit article error:', error);
                alert('Lỗi khi tải bài viết');
            }
        }
        
        async function deleteArticle(id) {
            if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
            try {
                const data = await apiCall(`/articles/${id}`, 'DELETE');
                if (data.success) {
                    alert('Đã xóa bài viết!');
                    loadArticles();
                } else {
                    alert(data.message || 'Lỗi xóa bài viết');
                }
            } catch (error) {
                console.error('Delete article error:', error);
                alert('Lỗi khi xóa bài viết');
            }
        }
        
        document.getElementById('article-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('article-id').value;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Đang xử lý...';
                
                // Upload ảnh nếu có file mới
                let imageUrl = document.getElementById('article-image').value;
                const fileInput = document.getElementById('article-image-file');
                if (fileInput.files && fileInput.files[0]) {
                    imageUrl = await uploadArticleImage();
                }
                
                const body = {
                    tieu_de: document.getElementById('article-title').value,
                    mo_ta_ngan: document.getElementById('article-short-desc').value,
                    noi_dung: document.getElementById('article-content').value,
                    hinh_anh: imageUrl,
                    danh_muc: document.getElementById('article-category').value,
                    tac_gia: document.getElementById('article-author').value || 'Admin',
                    tags: document.getElementById('article-tags').value,
                    trang_thai: document.getElementById('article-status').value
                };
                
                if (!body.tieu_de) {
                    alert('Vui lòng nhập tiêu đề');
                    return;
                }
                
                const data = await apiCall(`/articles${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', body);
                if (data.success) {
                    alert(id ? 'Đã cập nhật bài viết!' : 'Đã thêm bài viết mới!');
                    closeArticleModal();
                    loadArticles();
                } else {
                    alert(data.message || 'Lỗi lưu bài viết');
                }
            } catch (error) {
                console.error('Save article error:', error);
                alert('Lỗi khi lưu bài viết: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });

        // Reviews
        async function loadReviews() {
            const data = await apiCall('/admin/reviews');
            if (data.success) {
                const reviews = data.data;
                
                // Tính thống kê
                const total = reviews.length;
                const visible = reviews.filter(r => r.trang_thai === 1).length;
                const starCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
                let totalStars = 0;
                
                reviews.forEach(r => {
                    const stars = r.so_sao || 0;
                    if (stars >= 1 && stars <= 5) {
                        starCounts[stars]++;
                        totalStars += stars;
                    }
                });
                
                const avgRating = total > 0 ? (totalStars / total).toFixed(1) : '0.0';
                
                // Cập nhật stats cards
                document.getElementById('reviews-total').textContent = total;
                document.getElementById('reviews-avg').textContent = avgRating;
                document.getElementById('reviews-5star').textContent = starCounts[5];
                document.getElementById('reviews-visible').textContent = visible;
                
                // Cập nhật progress bars
                for (let i = 1; i <= 5; i++) {
                    const percent = total > 0 ? (starCounts[i] / total * 100) : 0;
                    document.getElementById(`bar-${i}star`).style.width = `${percent}%`;
                    document.getElementById(`count-${i}star`).textContent = starCounts[i];
                }
                
                // Render bảng
                const html = reviews.map(r => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3">${r.ten_san_pham || '-'}</td>
                        <td class="px-4 py-3">${r.ten_dang_nhap || 'Ẩn danh'}</td>
                        <td class="px-4 py-3 text-center text-yellow-500">${'★'.repeat(r.so_sao || 0)}${'☆'.repeat(5 - (r.so_sao || 0))}</td>
                        <td class="px-4 py-3 text-gray-600 max-w-xs truncate">${r.noi_dung || '-'}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2 py-1 rounded-full text-xs ${r.trang_thai === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${r.trang_thai === 1 ? 'Hiện' : 'Ẩn'}</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <button onclick="toggleReviewStatus(${r.ma_danh_gia})" class="text-yellow-600 hover:underline mr-2">${r.trang_thai === 1 ? 'Ẩn' : 'Hiện'}</button>
                            <button onclick="deleteReview(${r.ma_danh_gia})" class="text-red-600 hover:underline">Xóa</button>
                        </td>
                    </tr>
                `).join('');
                document.getElementById('reviews-table').innerHTML = html || '<tr><td colspan="6" class="text-center py-8 text-gray-500">Không có đánh giá</td></tr>';
            }
        }
        
        async function toggleReviewStatus(id) { const d = await apiCall(`/admin/reviews/${id}/toggle-status`, 'PUT'); if (d.success) loadReviews(); }
        async function deleteReview(id) { if (!confirm('Xóa đánh giá này?')) return; const d = await apiCall(`/admin/reviews/${id}`, 'DELETE'); if (d.success) { alert('Đã xóa!'); loadReviews(); } }

        // ==================== PROMOTIONS ====================
        let promoStatusChart = null;
        
        async function loadPromotions() {
            const data = await apiCall('/admin/promotions');
            if (data.success) {
                const promotions = data.data;
                
                // Tính toán stats
                const now = new Date();
                let active = 0, upcoming = 0, expired = 0;
                
                promotions.forEach(p => {
                    const start = new Date(p.ngay_bat_dau);
                    const end = new Date(p.ngay_ket_thuc);
                    if (now > end) {
                        expired++;
                    } else if (now < start) {
                        upcoming++;
                    } else {
                        active++;
                    }
                });
                
                // Cập nhật stat cards
                document.getElementById('promo-total').textContent = promotions.length;
                document.getElementById('promo-active').textContent = active;
                document.getElementById('promo-upcoming').textContent = upcoming;
                document.getElementById('promo-expired').textContent = expired;
                
                // Cập nhật chi tiết
                document.getElementById('promo-detail-active').textContent = active;
                document.getElementById('promo-detail-upcoming').textContent = upcoming;
                document.getElementById('promo-detail-expired').textContent = expired;
                
                // Vẽ biểu đồ
                renderPromoChart(active, upcoming, expired);
                
                if (promotions.length === 0) {
                    document.getElementById('promotions-table').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có khuyến mãi nào</td></tr>';
                    return;
                }
                const html = promotions.map(p => {
                    const now = new Date();
                    const start = new Date(p.ngay_bat_dau);
                    const end = new Date(p.ngay_ket_thuc);
                    let statusClass = '', statusText = '';
                    if (p.trang_thai == 0) {
                        statusClass = 'bg-gray-200 text-gray-600';
                        statusText = '⏸ Tạm dừng';
                    } else if (now < start) {
                        statusClass = 'bg-yellow-100 text-yellow-700';
                        statusText = '⏳ Sắp diễn ra';
                    } else if (now > end) {
                        statusClass = 'bg-red-100 text-red-600';
                        statusText = '❌ Hết hạn';
                    } else {
                        statusClass = 'bg-green-100 text-green-700';
                        statusText = '✓ Đang chạy';
                    }
                    return `
                    <tr class="border-b hover:bg-orange-50 transition">
                        <td class="px-4 py-3 font-semibold text-gray-800">${p.ten_khuyen_mai}</td>
                        <td class="px-4 py-3"><span class="bg-orange-100 text-orange-700 px-2 py-1 rounded font-mono font-bold">${p.ma_giam_gia}</span></td>
                        <td class="px-4 py-3 text-sm text-gray-600">${p.mo_ta || '-'}</td>
                        <td class="px-4 py-3 text-sm whitespace-nowrap">${formatDate(p.ngay_bat_dau)}</td>
                        <td class="px-4 py-3 text-sm whitespace-nowrap">${formatDate(p.ngay_ket_thuc)}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass}">${statusText}</span>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center justify-center gap-3">
                                <button onclick="editPromotion(${p.ma_khuyen_mai})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform" title="Sửa khuyến mãi">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                                <button onclick="deletePromotion(${p.ma_khuyen_mai})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform" title="Xóa khuyến mãi">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                }).join('');
                document.getElementById('promotions-table').innerHTML = html;
            }
        }
        
        function renderPromoChart(active, upcoming, expired) {
            const ctx = document.getElementById('promoStatusChart');
            if (!ctx) return;
            
            if (promoStatusChart) {
                promoStatusChart.destroy();
            }
            
            promoStatusChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Đang diễn ra', 'Sắp diễn ra', 'Hết hạn'],
                    datasets: [{
                        label: 'Số lượng',
                        data: [active, upcoming, expired],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderColor: [
                            'rgb(34, 197, 94)',
                            'rgb(245, 158, 11)',
                            'rgb(239, 68, 68)'
                        ],
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
        }

        function openPromotionModal(p = null) {
            document.getElementById('promotion-modal').classList.add('active');
            document.getElementById('promotion-modal-title').textContent = p ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi';
            document.getElementById('promotion-form').reset();
            document.getElementById('promotion-id').value = p?.ma_khuyen_mai || '';
            if (p) {
                document.getElementById('promotion-name').value = p.ten_khuyen_mai;
                document.getElementById('promotion-code').value = p.ma_giam_gia;
                document.getElementById('promotion-desc').value = p.mo_ta || '';
                document.getElementById('promotion-start').value = p.ngay_bat_dau ? p.ngay_bat_dau.slice(0, 16) : '';
                document.getElementById('promotion-end').value = p.ngay_ket_thuc ? p.ngay_ket_thuc.slice(0, 16) : '';
                document.getElementById('promotion-condition').value = p.dieu_kien_ap_dung || '';
                document.getElementById('promotion-status').value = p.trang_thai;
            }
        }

        function closePromotionModal() { document.getElementById('promotion-modal').classList.remove('active'); }

        async function editPromotion(id) {
            const d = await apiCall(`/admin/promotions/${id}`);
            if (d.success) openPromotionModal(d.data);
        }

        async function deletePromotion(id) {
            if (!confirm('Xóa khuyến mãi này?')) return;
            const d = await apiCall(`/admin/promotions/${id}`, 'DELETE');
            if (d.success) { alert('Đã xóa!'); loadPromotions(); } else alert(d.message);
        }

        document.getElementById('promotion-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('promotion-id').value;
            const body = {
                ten_khuyen_mai: document.getElementById('promotion-name').value,
                ma_giam_gia: document.getElementById('promotion-code').value.toUpperCase(),
                mo_ta: document.getElementById('promotion-desc').value,
                ngay_bat_dau: document.getElementById('promotion-start').value,
                ngay_ket_thuc: document.getElementById('promotion-end').value,
                dieu_kien_ap_dung: document.getElementById('promotion-condition').value,
                trang_thai: parseInt(document.getElementById('promotion-status').value)
            };
            const url = id ? `/admin/promotions/${id}` : '/admin/promotions';
            const method = id ? 'PUT' : 'POST';
            const d = await apiCall(url, method, body);
            if (d.success) {
                alert(id ? 'Cập nhật thành công!' : 'Thêm thành công! Thông báo đã được gửi đến người dùng.');
                closePromotionModal();
                loadPromotions();
            } else {
                alert(d.message || 'Có lỗi xảy ra');
            }
        });

        // ==========================================
        // CONTACTS MANAGEMENT - Quản lý liên hệ
        // ==========================================
        let contactsData = [];

        async function loadContacts() {
            const status = document.getElementById('contact-status-filter')?.value || 'all';
            const search = document.getElementById('contact-search')?.value || '';
            
            const params = new URLSearchParams();
            if (status !== 'all') params.append('trang_thai', status);
            if (search) params.append('search', search);
            
            const d = await apiCall(`/contact?${params.toString()}`);
            if (d.success) {
                contactsData = d.data;
                renderContactsTable(d.data);
                
                // Update stats
                if (d.stats) {
                    document.getElementById('contact-total').textContent = d.stats.total || 0;
                    document.getElementById('contact-unread').textContent = d.stats.chua_doc || 0;
                    document.getElementById('contact-read').textContent = d.stats.da_doc || 0;
                    document.getElementById('contact-replied').textContent = d.stats.da_phan_hoi || 0;
                    
                    // Update badge
                    const badge = document.getElementById('contactBadge');
                    if (badge) {
                        const unread = d.stats.chua_doc || 0;
                        if (unread > 0) {
                            badge.textContent = unread;
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                }
            }
        }

        function renderContactsTable(contacts) {
            const tbody = document.getElementById('contacts-table');
            if (!tbody) return;
            
            if (contacts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Chưa có liên hệ nào</td></tr>';
                return;
            }
            
            tbody.innerHTML = contacts.map(c => {
                const statusColors = {
                    'chua_phan_hoi': 'bg-yellow-100 text-yellow-700',
                    'da_phan_hoi': 'bg-green-100 text-green-700'
                };
                const statusLabels = {
                    'chua_phan_hoi': '🟡 Chưa phản hồi',
                    'da_phan_hoi': '🟢 Đã phản hồi'
                };
                const date = new Date(c.ngay_tao).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                return `
                    <tr class="border-b hover:bg-gray-50 ${c.trang_thai === 'chua_phan_hoi' ? 'bg-yellow-50' : ''}">
                        <td class="px-4 py-3">
                            <div class="font-semibold text-gray-800">${c.ho_ten || ''}</div>
                            <div class="text-sm text-blue-600">${c.email}</div>
                            ${c.so_dien_thoai ? `<div class="text-sm text-gray-500">${c.so_dien_thoai}</div>` : ''}
                        </td>
                        <td class="px-4 py-3 font-medium">${c.chu_de || 'Không có chủ đề'}</td>
                        <td class="px-4 py-3 text-gray-600 max-w-xs truncate">${(c.noi_dung || '').substring(0, 80)}${(c.noi_dung || '').length > 80 ? '...' : ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">${date}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[c.trang_thai] || 'bg-gray-100 text-gray-700'}">${statusLabels[c.trang_thai] || c.trang_thai}</span>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center justify-center gap-3">
                                <button onclick="viewContact(${c.ma_lien_he})" class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform" title="Xem & Phản hồi">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                </button>
                                <button onclick="deleteContact(${c.ma_lien_he})" class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform" title="Xóa">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function viewContact(id) {
            const contact = contactsData.find(c => c.ma_lien_he === id);
            if (!contact) return;
            
            document.getElementById('contact-id').value = id;
            document.getElementById('contact-name').textContent = contact.ho_ten;
            document.getElementById('contact-email').textContent = contact.email;
            document.getElementById('contact-phone').textContent = contact.so_dien_thoai || 'Không có';
            document.getElementById('contact-date').textContent = new Date(contact.ngay_tao).toLocaleString('vi-VN');
            document.getElementById('contact-subject').textContent = contact.chu_de;
            document.getElementById('contact-message').textContent = contact.noi_dung;
            document.getElementById('contact-reply').value = '';
            
            // Show previous reply if exists
            const replySection = document.getElementById('contact-previous-reply-section');
            if (contact.phan_hoi) {
                document.getElementById('contact-previous-reply').textContent = contact.phan_hoi;
                document.getElementById('contact-reply-date').textContent = contact.ngay_phan_hoi ? 
                    'Phản hồi lúc: ' + new Date(contact.ngay_phan_hoi).toLocaleString('vi-VN') : '';
                replySection.classList.remove('hidden');
            } else {
                replySection.classList.add('hidden');
            }
            
            document.getElementById('contact-modal').classList.add('active');
            
            // Mark as read if unread
            if (contact.trang_thai === 'chua_doc') {
                await apiCall(`/contact/${id}/status`, 'PUT', { trang_thai: 'da_doc' });
                loadContacts();
            }
        }

        function closeContactModal() {
            document.getElementById('contact-modal').classList.remove('active');
        }

        async function sendContactReply() {
            const id = document.getElementById('contact-id').value;
            const reply = document.getElementById('contact-reply').value.trim();
            
            if (!reply) {
                alert('Vui lòng nhập nội dung phản hồi!');
                return;
            }
            
            const d = await apiCall(`/contact/${id}/reply`, 'PUT', { phan_hoi: reply });
            if (d.success) {
                alert('Phản hồi thành công! Email đã được gửi đến khách hàng.');
                closeContactModal();
                loadContacts();
            } else {
                alert(d.message || 'Có lỗi xảy ra');
            }
        }

        async function deleteContact(id) {
            if (!confirm('Bạn có chắc muốn xóa liên hệ này?')) return;
            
            const d = await apiCall(`/contact/${id}`, 'DELETE');
            if (d.success) {
                alert('Đã xóa liên hệ!');
                loadContacts();
            } else {
                alert(d.message || 'Có lỗi xảy ra');
            }
        }

        // Load contacts when section is shown
        const originalShowSection = showSection;
        showSection = function(section) {
            originalShowSection(section);
            if (section === 'contacts') {
                loadContacts();
            }
        };

        // Load unread count on page load
        async function loadContactUnreadCount() {
            try {
                const d = await apiCall('/contact/unread-count');
                if (d.success) {
                    const badge = document.getElementById('contactBadge');
                    if (badge && d.count > 0) {
                        badge.textContent = d.count;
                        badge.classList.remove('hidden');
                    }
                }
            } catch (e) {}
        }
        loadContactUnreadCount();

        // ==========================================
        // FLASH SALE FUNCTIONS
        // ==========================================
        
        let flashSaleProductData = {};
        let currentFlashSaleTab = 'active';

        // Helper function to update count badges
        function updateCountBadge(elementId, count) {
            const badge = document.getElementById(elementId);
            if (badge) {
                badge.textContent = count;
                
                // Check if this badge's tab is currently active
                const parentTab = badge.closest('.flash-sale-tab');
                const isActive = parentTab && parentTab.classList.contains('active');
                
                // Update badge color: red if active tab and has count, gray otherwise
                if (isActive && count > 0) {
                    badge.classList.remove('bg-gray-400');
                    badge.classList.add('bg-red-500');
                } else {
                    badge.classList.remove('bg-red-500');
                    badge.classList.add('bg-gray-400');
                }
            }
        }

        // Load Flash Sale data
        async function loadFlashSales() {
            try {
                const response = await fetch(`${API_URL}/admin/flash-sale`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    const flashSales = data.data;
                    const now = new Date();
                    
                    // Phân loại flash sales
                    const active = flashSales.filter(fs => 
                        new Date(fs.thoi_gian_bat_dau) <= now && new Date(fs.thoi_gian_ket_thuc) >= now
                    );
                    const upcoming = flashSales.filter(fs => new Date(fs.thoi_gian_bat_dau) > now);
                    const ended = flashSales.filter(fs => new Date(fs.thoi_gian_ket_thuc) < now);
                    
                    // Update count badges
                    updateCountBadge('active-count', active.length);
                    updateCountBadge('upcoming-count', upcoming.length);
                    updateCountBadge('ended-count', ended.length);
                    
                    // Update count (nếu element tồn tại)
                    const countElement = document.getElementById('flash-sale-count');
                    if (countElement) {
                        countElement.textContent = active.length;
                    }
                    
                    // Render các tab
                    renderFlashSaleCards('active-flash-sales', active);
                    renderFlashSaleCards('upcoming-flash-sales', upcoming);
                    renderFlashSaleCards('ended-flash-sales', ended);
                    
                    // Load slow products for flash sale tab
                    loadSlowProductsForFlashSale();
                } else {
                    showFlashSaleError(data.message || 'Không thể tải dữ liệu Flash Sale');
                }
            } catch (error) {
                console.error('Load flash sales error:', error);
                showFlashSaleError('Chưa khởi tạo bảng Flash Sale. Vui lòng chạy: node backend/scripts/run-create-flash-sale.js');
            }
        }

        function showFlashSaleError(message) {
            const errorHtml = `
                <div class="col-span-full">
                    <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
                        <div class="text-6xl mb-4">⚠️</div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Chưa khởi tạo Flash Sale</h3>
                        <p class="text-gray-600 mb-4">${message}</p>
                        <div class="bg-gray-800 text-white p-4 rounded-lg text-left max-w-2xl mx-auto">
                            <p class="text-sm font-mono">node backend/scripts/run-create-flash-sale.js</p>
                        </div>
                    </div>
                </div>
            `;
            
            ['active-flash-sales', 'upcoming-flash-sales', 'ended-flash-sales'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = errorHtml;
            });
            
            // Reset all count badges
            updateCountBadge('active-count', 0);
            updateCountBadge('upcoming-count', 0);
            updateCountBadge('ended-count', 0);
            updateCountBadge('slow-products-count', 0);
            
            const countElement = document.getElementById('flash-sale-count');
            if (countElement) {
                countElement.textContent = '0';
            }
        }

        function renderFlashSaleCards(containerId, flashSales) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            if (flashSales.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><p>Không có sản phẩm nào</p></div>';
                return;
            }
            
            const html = flashSales.map(fs => {
                const discount = fs.phan_tram_giam;
                const startTime = new Date(fs.thoi_gian_bat_dau).toLocaleString('vi-VN');
                const endTime = new Date(fs.thoi_gian_ket_thuc).toLocaleString('vi-VN');
                const remaining = fs.so_luong_gioi_han ? fs.so_luong_gioi_han - fs.so_luong_da_ban : null;
                const soldPercent = fs.so_luong_gioi_han ? Math.round((fs.so_luong_da_ban / fs.so_luong_gioi_han) * 100) : 0;
                
                return `
                <div class="bg-white rounded-lg border-2 border-red-200 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                    <div class="relative">
                        <img src="${getImageUrl(fs.anh_chinh)}" alt="${fs.ten_san_pham}" 
                             class="w-full h-48 object-cover" onerror="this.src=PLACEHOLDER_IMG">
                        <div class="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                            -${discount}%
                        </div>
                        ${fs.trang_thai === 'dang_dien_ra' ? '<div class="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">🔥 ĐANG SALE</div>' : ''}
                    </div>
                    <div class="p-4">
                        <h4 class="font-bold text-gray-800 mb-2 line-clamp-2 h-12" title="${fs.ten_san_pham}">${fs.ten_san_pham}</h4>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-2xl font-bold text-red-600">${formatPrice(fs.gia_sale)}</span>
                            <span class="text-sm text-gray-500 line-through">${formatPrice(fs.gia_goc)}</span>
                        </div>
                        ${fs.so_luong_gioi_han ? `
                        <div class="mb-3">
                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Đã bán: ${fs.so_luong_da_ban}/${fs.so_luong_gioi_han}</span>
                                <span>${soldPercent}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-red-500 h-2 rounded-full" style="width: ${soldPercent}%"></div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="text-xs text-gray-600 space-y-1 mb-3">
                            <p>⏰ Bắt đầu: ${startTime}</p>
                            <p>⏰ Kết thúc: ${endTime}</p>
                        </div>
                        <button onclick="deleteFlashSale(${fs.ma_flash_sale})" 
                                class="w-full bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg text-sm font-semibold">
                            🗑️ Xóa khỏi Flash Sale
                        </button>
                    </div>
                </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        }

        async function loadSlowProductsForFlashSale() {
            try {
                const response = await fetch(`${API_URL}/admin/dashboard`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    const slowProducts = data.data.slow_moving_products || [];
                    updateCountBadge('slow-products-count', slowProducts.length);
                    renderSlowProductsForFlashSale(slowProducts);
                }
            } catch (error) {
                console.error('Load slow products error:', error);
            }
        }

        function renderSlowProductsForFlashSale(products) {
            const container = document.getElementById('slow-products-list');
            if (!container) return;
            
            if (products.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500">🎉 Tuyệt vời! Không có sản phẩm bán chậm</p></div>';
                return;
            }
            
            const html = products.map(p => {
                const daysSinceLastSale = p.ngay_ban_cuoi ? 
                    Math.floor((new Date() - new Date(p.ngay_ban_cuoi)) / (1000 * 60 * 60 * 24)) : 
                    null;
                const daysText = daysSinceLastSale ? `${daysSinceLastSale} ngày` : 'Chưa bán';
                
                return `
                <div class="bg-white rounded-lg border-2 border-orange-200 shadow hover:shadow-xl transition-all overflow-hidden">
                    <div class="flex gap-3 p-3">
                        <!-- Ảnh sản phẩm -->
                        <div class="flex-shrink-0">
                            <img src="${getImageUrl(p.anh_chinh)}" alt="${p.ten_san_pham}" 
                                 class="w-24 h-24 object-cover rounded-lg border-2 border-orange-300" onerror="this.src=PLACEHOLDER_IMG">
                        </div>
                        
                        <!-- Thông tin sản phẩm -->
                        <div class="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                                <h4 class="font-bold text-gray-800 text-base mb-2 line-clamp-2" title="${p.ten_san_pham}">${p.ten_san_pham}</h4>
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <div class="flex items-center gap-1 text-sm">
                                        <span class="text-gray-600">Tồn:</span>
                                        <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">${p.ton_kho}</span>
                                    </div>
                                    <div class="flex items-center gap-1 text-sm">
                                        <span class="text-orange-600">⏱</span>
                                        <span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">${daysText} chưa bán</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-3">
                                <p class="text-xl font-bold text-green-600">${formatPrice(p.gia)}</p>
                                <button onclick="openFlashSaleModal(${p.ma_san_pham}, '${p.ten_san_pham.replace(/'/g, "\\'")}', ${p.gia})" 
                                        class="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1 shadow-lg">
                                    ⚡ Thêm vào Flash Sale
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        }

        function switchFlashSaleTab(tab) {
            currentFlashSaleTab = tab;
            
            // Update tab buttons
            document.querySelectorAll('.flash-sale-tab').forEach(btn => {
                btn.classList.remove('active', 'border-red-500', 'text-gray-700');
                btn.classList.add('text-gray-500', 'border-transparent');
                
                // Reset badge colors to gray for inactive tabs
                const badge = btn.querySelector('span[id$="-count"]');
                if (badge) {
                    badge.classList.remove('bg-red-500');
                    badge.classList.add('bg-gray-400');
                }
            });
            
            const activeTab = document.querySelector(`.flash-sale-tab[data-tab="${tab}"]`);
            activeTab.classList.add('active', 'border-red-500', 'text-gray-700');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            
            // Update active tab badge color to red
            const activeBadge = activeTab.querySelector('span[id$="-count"]');
            if (activeBadge && parseInt(activeBadge.textContent) > 0) {
                activeBadge.classList.remove('bg-gray-400');
                activeBadge.classList.add('bg-red-500');
            }
            
            // Show/hide content
            document.querySelectorAll('.flash-sale-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`flash-sale-tab-${tab}`).classList.remove('hidden');
        }

        async function deleteFlashSale(id) {
            if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi Flash Sale?')) return;
            
            try {
                const response = await fetch(`${API_URL}/admin/flash-sale/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã xóa khỏi Flash Sale');
                    loadFlashSales();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Delete flash sale error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        }

        function openFlashSaleModal(productId, productName, originalPrice) {
            flashSaleProductData = { productId, productName, originalPrice };
            
            document.getElementById('flash-sale-product-id').value = productId;
            document.getElementById('flash-sale-product-name').textContent = productName;
            document.getElementById('flash-sale-original-price').textContent = formatPrice(originalPrice);
            
            // Set default time (start now, end after 24 hours)
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            document.getElementById('flash-sale-start').value = formatDateTimeLocal(now);
            document.getElementById('flash-sale-end').value = formatDateTimeLocal(tomorrow);
            
            // Clear previous values
            document.getElementById('flash-sale-price').value = '';
            document.getElementById('flash-sale-quantity').value = '';
            document.getElementById('discount-percent').textContent = '';
            
            document.getElementById('flash-sale-modal').classList.add('active');
        }

        function closeFlashSaleModal() {
            document.getElementById('flash-sale-modal').classList.remove('active');
            document.getElementById('flash-sale-form').reset();
        }

        function formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        function calculateDiscount() {
            const originalPrice = flashSaleProductData.originalPrice;
            const salePrice = parseFloat(document.getElementById('flash-sale-price').value);
            
            if (salePrice && salePrice < originalPrice) {
                const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
                document.getElementById('discount-percent').textContent = `🔥 Giảm ${discount}% (Tiết kiệm ${formatPrice(originalPrice - salePrice)})`;
            } else if (salePrice >= originalPrice) {
                document.getElementById('discount-percent').textContent = '⚠️ Giá sale phải thấp hơn giá gốc';
            } else {
                document.getElementById('discount-percent').textContent = '';
            }
        }

        function setFlashSaleTime(hours) {
            const now = new Date();
            const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
            document.getElementById('flash-sale-start').value = formatDateTimeLocal(now);
            document.getElementById('flash-sale-end').value = formatDateTimeLocal(end);
        }

        document.getElementById('flash-sale-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = document.getElementById('flash-sale-product-id').value;
            const salePrice = parseFloat(document.getElementById('flash-sale-price').value);
            const originalPrice = flashSaleProductData.originalPrice;
            const quantity = document.getElementById('flash-sale-quantity').value;
            const startTime = document.getElementById('flash-sale-start').value;
            const endTime = document.getElementById('flash-sale-end').value;
            
            // Validation - Kiểm tra giá không âm
            if (salePrice < 0) {
                alert('⚠️ Giá Flash Sale không được âm!');
                return;
            }
            
            if (salePrice >= originalPrice) {
                alert('⚠️ Giá Flash Sale phải thấp hơn giá gốc!');
                return;
            }
            
            if (new Date(startTime) >= new Date(endTime)) {
                alert('⚠️ Thời gian kết thúc phải sau thời gian bắt đầu!');
                return;
            }
            
            const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
            
            try {
                const response = await fetch(`${API_URL}/admin/flash-sale`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({
                        ma_san_pham: productId,
                        gia_sale: salePrice,
                        phan_tram_giam: discount,
                        so_luong_gioi_han: quantity || null,
                        thoi_gian_bat_dau: startTime,
                        thoi_gian_ket_thuc: endTime
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã thêm sản phẩm vào Flash Sale thành công!');
                    closeFlashSaleModal();
                    loadFlashSales();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Flash sale error:', error);
                alert('❌ Có lỗi xảy ra khi thêm Flash Sale');
            }
        });
        // ==================== DAILY EXPENSES FUNCTIONS ====================
        
        let expenseCharts = {
            byType: null,
            trend: null
        };
        
        let expenseFormVisible = true;
        let currentExpenses = [];
        let displayedExpenses = 20;

        async function loadDailyExpenses() {
            try {
                // Load expense types cho dropdown trước
                await populateExpenseTypeDropdowns();

                const response = await fetch(`${API_URL}/admin/daily-expenses`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    updateExpenseStats(data.data.stats);
                    updateExpenseCharts(data.data);
                    currentExpenses = data.data.expenses || [];
                    displayExpenses(currentExpenses);
                }
            } catch (error) {
                console.error('Load expenses error:', error);
                showExpenseError();
            }
        }

        // Load danh sách loại chi phí từ DB và populate 2 dropdown
        async function populateExpenseTypeDropdowns() {
            try {
                const response = await fetch(`${API_URL}/admin/expense-types`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                if (!data.success) return;

                const types = data.data.types || [];
                // Chỉ lấy loại đang active
                const activeTypes = types.filter(t => t.trang_thai === 1);

                // Nhóm icon mặc định nếu DB không có
                const defaultIcon = '📋';

                // --- Dropdown form thêm mới ---
                const formSelect = document.getElementById('expense-type');
                if (formSelect) {
                    formSelect.innerHTML = '<option value="">-- Chọn loại chi phí --</option>' +
                        activeTypes.map(t =>
                            `<option value="${t.ma_loai}">${t.icon || defaultIcon} ${t.ten_hien_thi}</option>`
                        ).join('');
                }

                // --- Dropdown bộ lọc ---
                const filterSelect = document.getElementById('filter-expense-type');
                if (filterSelect) {
                    filterSelect.innerHTML = '<option value="">Tất cả</option>' +
                        activeTypes.map(t =>
                            `<option value="${t.ma_loai}">${t.icon || defaultIcon} ${t.ten_hien_thi}</option>`
                        ).join('');
                }
            } catch (err) {
                console.error('populateExpenseTypeDropdowns error:', err);
                // Nếu lỗi, fallback về danh sách tĩnh đúng với DB
                const fallbackOptions = [
                    { value: 'tien_dien',       label: '⚡ Tiền điện' },
                    { value: 'tien_nuoc',        label: '💧 Tiền nước' },
                    { value: 'thue_mat_bang',    label: '🏢 Thuê mặt bằng' },
                    { value: 'luong_nhan_vien',  label: '👨‍💼 Lương nhân viên' },
                    { value: 'van_chuyen',       label: '🚚 Vận chuyển' },
                    { value: 'bao_tri',          label: '🔧 Bảo trì' },
                    { value: 'van_phong_pham',   label: '📎 Văn phòng phẩm' },
                    { value: 'phat_sinh_khac',   label: '💰 Chi phí phát sinh khác' },
                    { value: 'quang_cao_online', label: '📢 Quảng cáo online' },
                    { value: 'quang_cao_offline',label: '📰 Quảng cáo offline' },
                    { value: 'khuyen_mai',       label: '🎁 Khuyến mãi' },
                    { value: 'dien_thoai_internet', label: '📞 Điện thoại & Internet' },
                    { value: 'bao_hiem',         label: '🛡️ Bảo hiểm' },
                    { value: 'thue_phi',         label: '💳 Thuế & Phí' },
                    { value: 'dao_tao',          label: '📚 Đào tạo' },
                ];
                const formSelect = document.getElementById('expense-type');
                if (formSelect) {
                    formSelect.innerHTML = '<option value="">-- Chọn loại chi phí --</option>' +
                        fallbackOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                }
                const filterSelect = document.getElementById('filter-expense-type');
                if (filterSelect) {
                    filterSelect.innerHTML = '<option value="">Tất cả</option>' +
                        fallbackOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                }
            }
        }


        function updateExpenseStats(stats) {
            document.getElementById('expense-today').textContent = formatPrice(stats.today || 0);
            document.getElementById('expense-month').textContent = formatPrice(stats.thisMonth || 0);
            document.getElementById('expense-avg').textContent = formatPrice(stats.avgPerDay || 0);
            document.getElementById('expense-count').textContent = stats.count || 0;
        }

        function updateExpenseCharts(data) {
            // Destroy existing charts
            if (expenseCharts.byType) expenseCharts.byType.destroy();
            if (expenseCharts.trend) expenseCharts.trend.destroy();
            
            // Chart by type
            const byTypeCtx = document.getElementById('expense-by-type-chart').getContext('2d');
            expenseCharts.byType = new Chart(byTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: data.byType?.labels || [],
                    datasets: [{
                        data: data.byType?.values || [],
                        backgroundColor: [
                            '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
                            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
                        ]
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = formatPrice(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percent = ((context.parsed / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percent}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Trend chart
            const trendCtx = document.getElementById('expense-trend-chart').getContext('2d');
            expenseCharts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: data.trend?.labels || [],
                    datasets: [{
                        label: 'Chi phí',
                        data: data.trend?.values || [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Chi phí: ' + formatPrice(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatPrice(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        function displayExpenses(expenses) {
            const tbody = document.getElementById('expenses-table');
            if (!tbody) return;
            
            if (expenses.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-gray-500">
                            <div class="text-4xl mb-2">💸</div>
                            Chưa có chi phí nào
                        </td>
                    </tr>
                `;
                document.getElementById('expense-display-count').textContent = '0';
                document.getElementById('expense-total-count').textContent = '0';
                document.getElementById('expense-display-total').textContent = '0đ';
                return;
            }
            
            const displayList = expenses.slice(0, displayedExpenses);
            const total = displayList.reduce((sum, e) => sum + parseFloat(e.so_tien), 0);
            
            const html = displayList.map(e => {
                const typeLabels = {
                    'tien_dien': '⚡ Tiền điện',
                    'tien_nuoc': '💧 Tiền nước',
                    'thue_mat_bang': '🏢 Thuê mặt bằng',
                    'van_chuyen': '🚚 Vận chuyển',
                    'luong_nhan_vien': '👨‍💼 Lương nhân viên',
                    'marketing': '📢 Marketing',
                    'bao_tri': '🔧 Bảo trì',
                    'van_phong_pham': '📎 Văn phòng phẩm',
                    'phat_sinh': '💰 Phát sinh',
                    'khac': '📋 Khác'
                };
                
                return `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3">${formatDate(e.ngay_chi)}</td>
                        <td class="px-4 py-3">
                            <span class="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                ${typeLabels[e.loai_chi_phi] || e.loai_chi_phi}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-gray-700">${e.mo_ta || '-'}</td>
                        <td class="px-4 py-3 text-right font-bold text-red-600">${formatPrice(e.so_tien)}</td>
                        <td class="px-4 py-3 text-center text-gray-600">${e.nguoi_tao || 'Admin'}</td>
                        <td class="px-4 py-3 text-center">
                            <button onclick="editExpense(${e.ma_chi_phi})" class="text-blue-600 hover:text-blue-700 font-medium text-sm mr-2">Sửa</button>
                            <button onclick="deleteExpense(${e.ma_chi_phi})" class="text-red-600 hover:text-red-700 font-medium text-sm">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            tbody.innerHTML = html;
            document.getElementById('expense-display-count').textContent = displayList.length;
            document.getElementById('expense-total-count').textContent = expenses.length;
            document.getElementById('expense-display-total').textContent = formatPrice(total);
        }

        function toggleExpenseForm() {
            expenseFormVisible = !expenseFormVisible;
            const form = document.getElementById('expense-form');
            const btn = document.getElementById('toggle-form-btn');
            
            if (expenseFormVisible) {
                form.style.display = 'grid';
                btn.textContent = 'Ẩn form';
            } else {
                form.style.display = 'none';
                btn.textContent = 'Hiện form';
            }
        }

        document.getElementById('expense-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                ngay_chi: document.getElementById('expense-date').value,
                loai_chi_phi: document.getElementById('expense-type').value,
                so_tien: parseFloat(document.getElementById('expense-amount').value),
                mo_ta: document.getElementById('expense-description').value
            };
            
            if (formData.so_tien <= 0) {
                alert('⚠️ Số tiền phải lớn hơn 0!');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/admin/daily-expenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã thêm chi phí thành công!');
                    document.getElementById('expense-form').reset();
                    // Set default date to today
                    document.getElementById('expense-date').valueAsDate = new Date();
                    loadDailyExpenses();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Add expense error:', error);
                alert('❌ Có lỗi xảy ra khi thêm chi phí');
            }
        });

        async function filterExpenses() {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            const type = document.getElementById('filter-expense-type').value;
            const search = document.getElementById('filter-search').value.toLowerCase();
            
            try {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                if (type) params.append('type', type);
                if (search) params.append('search', search);
                
                const response = await fetch(`${API_URL}/admin/daily-expenses?${params}`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    currentExpenses = data.data.expenses || [];
                    displayExpenses(currentExpenses);
                }
            } catch (error) {
                console.error('Filter expenses error:', error);
            }
        }

        function resetExpenseFilters() {
            document.getElementById('filter-start-date').value = '';
            document.getElementById('filter-end-date').value = '';
            document.getElementById('filter-expense-type').value = '';
            document.getElementById('filter-search').value = '';
            loadDailyExpenses();
        }

        function loadMoreExpenses() {
            displayedExpenses += 20;
            displayExpenses(currentExpenses);
        }

        async function editExpense(id) {
            alert('Chức năng sửa chi phí đang phát triển');
        }

        async function deleteExpense(id) {
            if (!confirm('Bạn có chắc muốn xóa chi phí này?')) return;
            
            try {
                const response = await fetch(`${API_URL}/admin/daily-expenses/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã xóa chi phí');
                    loadDailyExpenses();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Delete expense error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        }

        function exportExpenses() {
            alert('Chức năng xuất Excel đang phát triển');
        }

        function showExpenseError() {
            document.getElementById('expense-today').textContent = '0đ';
            document.getElementById('expense-month').textContent = '0đ';
            document.getElementById('expense-avg').textContent = '0đ';
            document.getElementById('expense-count').textContent = '0';
        }

        // Set default date to today when page loads
        if (document.getElementById('expense-date')) {
            document.getElementById('expense-date').valueAsDate = new Date();
        }

        // ==================== ORDER PLACEMENT FUNCTIONS ====================
        
        let currentPreOrderTab = 'all';
        let allPreOrders = [];
        let allSuppliers = [];
        
        // Receiving variables
        let receivingProductCounter = 0;
        let allProducts = [];
        let allSuppliersForReceiving = [];

        async function loadPreOrders() {
            try {
                const response = await fetch(`${API_URL}/admin/pre-orders`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    const payload = data.data || {};
                    allPreOrders = payload.preOrders || data.preOrders || (Array.isArray(payload) ? payload : []);
                    allSuppliers = payload.suppliers || data.suppliers || [];
                    updatePreOrderStats(payload.stats || data.stats || {});
                    updatePreOrderCounts();
                    renderPreOrders();
                    updateSupplierDropdown();
                }
            } catch (error) {
                console.error('Load pre-orders error:', error);
            }
        }

        function updatePreOrderStats(stats) {
            stats = stats || {};
            document.getElementById('preorder-total').textContent = stats.total || 0;
            document.getElementById('preorder-pending').textContent = stats.pending || 0;
            document.getElementById('preorder-completed').textContent = stats.completed || 0;
            document.getElementById('preorder-value').textContent = formatPrice(stats.totalValue || stats.total_value || 0);
        }

        function updatePreOrderCounts() {
            const counts = {
                all: allPreOrders.length,
                pending: allPreOrders.filter(p => p.trang_thai === 'pending').length,
                confirmed: allPreOrders.filter(p => p.trang_thai === 'confirmed').length,
                in_stock: allPreOrders.filter(p => p.trang_thai === 'in_stock').length,
                completed: allPreOrders.filter(p => p.trang_thai === 'completed').length
            };
            
            document.getElementById('tab-all-preorder').textContent = counts.all;
            document.getElementById('tab-pending-preorder').textContent = counts.pending;
            document.getElementById('tab-confirmed-preorder').textContent = counts.confirmed;
            document.getElementById('tab-instock-preorder').textContent = counts.in_stock;
            document.getElementById('tab-completed-preorder').textContent = counts.completed;
        }

        function renderPreOrders() {
            const tbody = document.getElementById('preorders-table');
            if (!tbody) return;
            
            let filteredOrders = allPreOrders;
            if (currentPreOrderTab !== 'all') {
                filteredOrders = allPreOrders.filter(p => p.trang_thai === currentPreOrderTab);
            }
            
            const searchTerm = document.getElementById('preorder-search')?.value.toLowerCase() || '';
            const typeFilter = document.getElementById('preorder-type-filter')?.value || '';
            
            if (searchTerm) {
                filteredOrders = filteredOrders.filter(p => 
                    p.ten_khach_hang.toLowerCase().includes(searchTerm) ||
                    p.ten_san_pham.toLowerCase().includes(searchTerm) ||
                    p.ma_don_dat.toString().includes(searchTerm)
                );
            }
            
            if (typeFilter) {
                filteredOrders = filteredOrders.filter(p => p.loai === typeFilter);
            }
            
            if (filteredOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-8 text-gray-500">
                            <div class="text-4xl mb-2">📝</div>
                            Không có đơn đặt hàng nào
                        </td>
                    </tr>
                `;
                return;
            }
            
            const statusConfig = {
                'pending': { color: 'orange', icon: '⏳', text: 'Đang xử lý', progress: 25 },
                'confirmed': { color: 'blue', icon: '✅', text: 'Đã xác nhận', progress: 50 },
                'in_stock': { color: 'green', icon: '📦', text: 'Đã có hàng', progress: 75 },
                'completed': { color: 'purple', icon: '🎉', text: 'Hoàn thành', progress: 100 },
                'cancelled': { color: 'red', icon: '❌', text: 'Đã hủy', progress: 0 }
            };
            
            const html = filteredOrders.map(order => {
                const status = statusConfig[order.trang_thai] || statusConfig['pending'];
                const typeIcon = order.loai === 'online' ? '🌐' : '🏪';
                const typeText = order.loai === 'online' ? 'Online' : 'Offline';
                
                return `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 font-semibold text-blue-600">#${order.ma_don_dat}</td>
                        <td class="px-4 py-3">
                            <div class="font-medium">${order.ten_khach_hang}</div>
                            <div class="text-xs text-gray-500">${order.so_dien_thoai}</div>
                        </td>
                        <td class="px-4 py-3">${order.ten_san_pham}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                ${typeIcon} ${typeText}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right font-semibold">${order.so_luong}</td>
                        <td class="px-4 py-3 text-right font-bold text-green-600">${formatPrice(order.gia_du_kien * order.so_luong)}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="inline-flex items-center gap-1 bg-${status.color}-100 text-${status.color}-700 px-3 py-1 rounded-full text-xs font-medium">
                                ${status.icon} ${status.text}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-${status.color}-500 h-2 rounded-full" style="width: ${status.progress}%"></div>
                            </div>
                            <p class="text-xs text-center mt-1 text-gray-600">${status.progress}%</p>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <button onclick="viewPreOrder(${order.ma_don_dat})" class="text-blue-600 hover:text-blue-700 font-medium text-sm mr-2">Chi tiết</button>
                            ${order.trang_thai !== 'completed' && order.trang_thai !== 'cancelled' ? `
                                <button onclick="updatePreOrderStatus(${order.ma_don_dat})" class="text-green-600 hover:text-green-700 font-medium text-sm">Cập nhật</button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
            
            tbody.innerHTML = html;
        }

        function switchPreOrderTab(tab) {
            currentPreOrderTab = tab;
            
            document.querySelectorAll('.preorder-tab').forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-gray-700');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            
            const activeTab = document.querySelector(`.preorder-tab[data-tab="${tab}"]`);
            activeTab.classList.add('active', 'border-blue-500', 'text-gray-700');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            
            renderPreOrders();
        }

        function openPreOrderModal(type) {
            const modal = document.getElementById('preorder-modal');
            const form = document.getElementById('preorder-form');
            const title = document.getElementById('preorder-modal-title');
            
            form.reset();
            document.getElementById('preorder-type').value = type;
            
            const typeText = type === 'online' ? '🌐 Online' : '🏪 Offline';
            title.textContent = `➕ Tạo đơn đặt hàng ${typeText}`;
            
            modal.classList.add('active');
        }

        function closePreOrderModal() {
            document.getElementById('preorder-modal').classList.remove('active');
        }

        function updateSupplierDropdown() {
            const select = document.getElementById('preorder-supplier');
            if (!select) return;
            
            const options = allSuppliers.map(s => 
                `<option value="${s.ma_nha_cung_cap}">${s.ten_nha_cung_cap}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>' + options;
        }

        function searchPreOrders() {
            renderPreOrders();
        }

        function filterPreOrders() {
            renderPreOrders();
        }

        function viewPreOrder(id) {
            alert(`Xem chi tiết đơn đặt hàng #${id}`);
        }

        async function updatePreOrderStatus(id) {
            const order = allPreOrders.find(p => p.ma_don_dat === id);
            if (!order) return;
            
            const statusOptions = {
                'pending': 'confirmed',
                'confirmed': 'in_stock',
                'in_stock': 'completed'
            };
            
            const nextStatus = statusOptions[order.trang_thai];
            if (!nextStatus) return;
            
            const statusNames = {
                'confirmed': 'Xác nhận đơn',
                'in_stock': 'Đánh dấu đã có hàng',
                'completed': 'Hoàn thành đơn'
            };
            
            if (!confirm(`${statusNames[nextStatus]}?`)) return;
            
            try {
                const response = await fetch(`${API_URL}/admin/pre-orders/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({ trang_thai: nextStatus })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã cập nhật trạng thái!');
                    loadPreOrders();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Update status error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        }

        document.getElementById('preorder-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                loai: document.getElementById('preorder-type').value,
                ten_khach_hang: document.getElementById('preorder-customer-name').value,
                so_dien_thoai: document.getElementById('preorder-customer-phone').value,
                email: document.getElementById('preorder-customer-email').value,
                dia_chi: document.getElementById('preorder-customer-address').value,
                ten_san_pham: document.getElementById('preorder-product-name').value,
                so_luong: parseInt(document.getElementById('preorder-quantity').value),
                gia_du_kien: parseFloat(document.getElementById('preorder-price').value) || 0,
                mo_ta: document.getElementById('preorder-description').value,
                ma_nha_cung_cap: document.getElementById('preorder-supplier').value || null,
                ngay_du_kien: document.getElementById('preorder-expected-date').value || null,
                ghi_chu: document.getElementById('preorder-notes').value
            };
            
            try {
                const response = await fetch(`${API_URL}/admin/pre-orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã tạo đơn đặt hàng thành công!');
                    closePreOrderModal();
                    loadPreOrders();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Create pre-order error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        });

        // ==================== RECEIVING FUNCTIONS ====================
        
        async function loadReceivings() {
            try {
                const status = document.getElementById('receiving-status-filter')?.value || '';
                const supplier = document.getElementById('receiving-supplier-filter')?.value || '';
                const dateFrom = document.getElementById('receiving-date-from')?.value || '';
                const dateTo = document.getElementById('receiving-date-to')?.value || '';
                
                let url = `${API_URL}/admin/receivings?`;
                if (status) url += `status=${status}&`;
                if (supplier) url += `supplier=${supplier}&`;
                if (dateFrom) url += `dateFrom=${dateFrom}&`;
                if (dateTo) url += `dateTo=${dateTo}&`;
                
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                
                const receivings = result.data;
                
                // Update stats - with null checks
                const statTotal = document.getElementById('stat-total-receivings');
                const statChecking = document.getElementById('stat-checking-receivings');
                const statCompleted = document.getElementById('stat-completed-receivings');
                const statProblem = document.getElementById('stat-problem-receivings');
                
                if (statTotal) statTotal.textContent = receivings.length;
                if (statChecking) statChecking.textContent = receivings.filter(r => r.trang_thai === 'dang_kiem_tra').length;
                if (statCompleted) statCompleted.textContent = receivings.filter(r => r.trang_thai === 'hoan_thanh').length;
                if (statProblem) statProblem.textContent = receivings.filter(r => r.trang_thai === 'co_van_de').length;
                
                // Render table
                const tbody = document.getElementById('receivings-table-body');
                if (!tbody) return;
                
                if (receivings.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có phiếu nhập hàng nào</td></tr>';
                    return;
                }
                
                tbody.innerHTML = receivings.map(r => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                            <span class="font-bold text-blue-600">#${r.ma_phieu_nhap}</span>
                        </td>
                        <td class="px-6 py-4">
                            <div class="font-semibold text-gray-800">${r.ten_nha_cung_cap || 'N/A'}</div>
                            <div class="text-sm text-gray-500">${r.sdt_nha_cung_cap || ''}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-gray-700">${formatDate(r.ngay_nhap)}</div>
                            <div class="text-sm text-gray-500">${new Date(r.ngay_nhap).toLocaleTimeString('vi-VN')}</div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <span class="font-bold text-gray-800">${r.tong_so_luong}</span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <span class="font-bold text-green-600">${formatPrice(r.tong_gia_tri)}</span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            ${getReceivingStatusBadge(r.trang_thai)}
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex gap-2 justify-center">
                                <button onclick="viewReceivingDetail(${r.ma_phieu_nhap})" 
                                        class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                                    👁️ Xem
                                </button>
                                ${r.trang_thai === 'dang_kiem_tra' ? `
                                    <button onclick="editReceiving(${r.ma_phieu_nhap})" 
                                            class="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium">
                                        ✏️ Sửa
                                    </button>
                                ` : ''}
                                <button onclick="deleteReceiving(${r.ma_phieu_nhap})" 
                                        class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
                                    🗑️ Xóa
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Load receivings error:', error);
                alert('Lỗi tải danh sách phiếu nhập: ' + error.message);
            }
        }

        function getReceivingStatusBadge(status) {
            const badges = {
                'dang_kiem_tra': '<span class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">⏳ Đang kiểm tra</span>',
                'hoan_thanh': '<span class="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">✅ Hoàn thành</span>',
                'co_van_de': '<span class="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">⚠️ Có vấn đề</span>'
            };
            return badges[status] || status;
        }

        async function loadSuppliersForReceiving() {
            try {
                const response = await fetch(`${API_URL}/admin/suppliers`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const result = await response.json();
                if (result.success) {
                    allSuppliersForReceiving = result.data;
                    
                    const filterSelect = document.getElementById('receiving-supplier-filter');
                    if (filterSelect) {
                        filterSelect.innerHTML = '<option value="">Tất cả nhà cung cấp</option>' +
                            allSuppliersForReceiving.map(s => 
                                `<option value="${s.ma_nha_cung_cap}">${s.ten_nha_cung_cap}</option>`
                            ).join('');
                    }
                    
                    const modalSelect = document.getElementById('receiving-supplier');
                    if (modalSelect) {
                        modalSelect.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>' +
                            allSuppliersForReceiving.map(s => 
                                `<option value="${s.ma_nha_cung_cap}">${s.ten_nha_cung_cap}</option>`
                            ).join('');
                    }
                }
            } catch (error) {
                console.error('Load suppliers error:', error);
            }
        }

        async function loadProductsForReceiving() {
            try {
                const response = await fetch(`${API_URL}/admin/products`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const result = await response.json();
                if (result.success) {
                    allProducts = result.data;
                }
            } catch (error) {
                console.error('Load products error:', error);
            }
        }

        function openReceivingModal(id = null) {
            const modal = document.getElementById('receiving-modal');
            const form = document.getElementById('receiving-form');
            const idInput = document.getElementById('receiving-id');
            const container = document.getElementById('receiving-products-container');
            const dateInput = document.getElementById('receiving-date');
            
            if (!modal || !form) return;
            
            modal.classList.add('active');
            form.reset();
            if (idInput) idInput.value = '';
            if (container) container.innerHTML = '';
            receivingProductCounter = 0;
            
            if (dateInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dateInput.value = now.toISOString().slice(0, 16);
            }
            
            loadSuppliersForReceiving();
            loadProductsForReceiving();
            addReceivingProduct();
        }

        function closeReceivingModal() {
            const modal = document.getElementById('receiving-modal');
            if (modal) modal.classList.remove('active');
        }

        function addReceivingProduct() {
            const container = document.getElementById('receiving-products-container');
            if (!container) return;
            
            const index = receivingProductCounter++;
            
            const productOptions = allProducts.map(p => 
                `<option value="${p.ma_san_pham}" data-price="${p.gia_nhap || p.gia * 0.7}">${p.ten_san_pham} - ${formatPrice(p.gia)}</option>`
            ).join('');
            
            const html = `
                <div class="receiving-product-item border-2 border-gray-200 rounded-xl p-4 bg-gray-50" data-index="${index}">
                    <div class="flex justify-between items-start mb-3">
                        <h5 class="font-bold text-gray-700">Sản phẩm #${index + 1}</h5>
                        <button type="button" onclick="removeReceivingProduct(${index})" class="text-red-500 hover:text-red-700 font-bold">
                            ❌ Xóa
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Sản phẩm *</label>
                            <select name="product_id[]" required onchange="updateReceivingProductPrice(${index})" 
                                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                <option value="">-- Chọn sản phẩm --</option>
                                ${productOptions}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">SL đặt</label>
                            <input type="number" name="quantity_ordered[]" min="0" value="0" 
                                   class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">SL thực nhận *</label>
                            <input type="number" name="quantity_received[]" min="0" value="0" required 
                                   onchange="calculateReceivingTotal()" 
                                   class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Giá nhập *</label>
                            <input type="number" name="price[]" min="0" step="1000" required 
                                   onchange="calculateReceivingTotal()" 
                                   class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Chất lượng</label>
                            <select name="quality[]" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                <option value="tot">✅ Tốt</option>
                                <option value="trung_binh">⚠️ Trung bình</option>
                                <option value="kem">❌ Kém</option>
                            </select>
                        </div>
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                            <input type="text" name="product_note[]" placeholder="Ghi chú về sản phẩm..." 
                                   class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', html);
        }

        function removeReceivingProduct(index) {
            const item = document.querySelector(`.receiving-product-item[data-index="${index}"]`);
            if (item) {
                item.remove();
                calculateReceivingTotal();
            }
        }

        function updateReceivingProductPrice(index) {
            const item = document.querySelector(`.receiving-product-item[data-index="${index}"]`);
            if (!item) return;
            
            const select = item.querySelector('select[name="product_id[]"]');
            const priceInput = item.querySelector('input[name="price[]"]');
            
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.dataset.price) {
                priceInput.value = selectedOption.dataset.price;
                calculateReceivingTotal();
            }
        }

        function calculateReceivingTotal() {
            const quantities = document.querySelectorAll('input[name="quantity_received[]"]');
            const prices = document.querySelectorAll('input[name="price[]"]');
            
            let totalQty = 0;
            let totalValue = 0;
            
            quantities.forEach((qtyInput, index) => {
                const qty = parseInt(qtyInput.value) || 0;
                const price = parseInt(prices[index]?.value) || 0;
                
                totalQty += qty;
                totalValue += qty * price;
            });
            
            const qtyEl = document.getElementById('receiving-total-quantity');
            const valEl = document.getElementById('receiving-total-value');
            
            if (qtyEl) qtyEl.textContent = totalQty;
            if (valEl) valEl.textContent = formatPrice(totalValue);
        }

        async function saveReceiving(event) {
            event.preventDefault();
            
            try {
                const formData = new FormData(event.target);
                const receivingId = document.getElementById('receiving-id').value;
                
                const products = [];
                const productIds = formData.getAll('product_id[]');
                const quantitiesOrdered = formData.getAll('quantity_ordered[]');
                const quantitiesReceived = formData.getAll('quantity_received[]');
                const prices = formData.getAll('price[]');
                const qualities = formData.getAll('quality[]');
                const notes = formData.getAll('product_note[]');
                
                for (let i = 0; i < productIds.length; i++) {
                    if (productIds[i]) {
                        products.push({
                            ma_san_pham: productIds[i],
                            so_luong_dat: quantitiesOrdered[i] || 0,
                            so_luong_thuc_nhan: quantitiesReceived[i],
                            gia_nhap: prices[i],
                            chat_luong: qualities[i],
                            ghi_chu: notes[i]
                        });
                    }
                }
                
                if (products.length === 0) {
                    alert('Vui lòng thêm ít nhất một sản phẩm!');
                    return;
                }
                
                const data = {
                    ma_nha_cung_cap: document.getElementById('receiving-supplier').value,
                    ma_don_dat_hang: document.getElementById('receiving-pre-order').value || null,
                    ngay_nhap: document.getElementById('receiving-date').value,
                    trang_thai: document.getElementById('receiving-status').value,
                    ghi_chu: document.getElementById('receiving-note').value,
                    products: products
                };
                
                const url = receivingId 
                    ? `${API_URL}/admin/receivings/${receivingId}`
                    : `${API_URL}/admin/receivings`;
                
                const method = receivingId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (!result.success) throw new Error(result.message);
                
                alert(receivingId ? 'Cập nhật phiếu nhập thành công!' : 'Tạo phiếu nhập thành công!');
                closeReceivingModal();
                loadReceivings();
                
            } catch (error) {
                console.error('Save receiving error:', error);
                alert('Lỗi lưu phiếu nhập: ' + error.message);
            }
        }

        async function viewReceivingDetail(id) {
            try {
                const response = await fetch(`${API_URL}/admin/receivings/${id}`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                
                const receiving = result.data;
                
                const html = `
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-4 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
                            <div>
                                <p class="text-sm text-gray-600">Mã phiếu nhập</p>
                                <p class="text-xl font-bold text-blue-600">#${receiving.ma_phieu_nhap}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Trạng thái</p>
                                <p class="text-lg font-bold">${getReceivingStatusBadge(receiving.trang_thai)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Nhà cung cấp</p>
                                <p class="text-lg font-semibold">${receiving.ten_nha_cung_cap}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Ngày nhập</p>
                                <p class="text-lg font-semibold">${formatDate(receiving.ngay_nhap)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Tổng số lượng</p>
                                <p class="text-lg font-bold text-green-600">${receiving.tong_so_luong}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Tổng giá trị</p>
                                <p class="text-lg font-bold text-blue-600">${formatPrice(receiving.tong_gia_tri)}</p>
                            </div>
                            ${receiving.ghi_chu ? `
                                <div class="col-span-2">
                                    <p class="text-sm text-gray-600">Ghi chú</p>
                                    <p class="text-base">${receiving.ghi_chu}</p>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div>
                            <h4 class="text-lg font-bold mb-4">📦 Chi tiết sản phẩm</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-sm font-bold">Sản phẩm</th>
                                            <th class="px-4 py-3 text-center text-sm font-bold">SL đặt</th>
                                            <th class="px-4 py-3 text-center text-sm font-bold">SL nhận</th>
                                            <th class="px-4 py-3 text-right text-sm font-bold">Giá nhập</th>
                                            <th class="px-4 py-3 text-right text-sm font-bold">Thành tiền</th>
                                            <th class="px-4 py-3 text-center text-sm font-bold">Chất lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y">
                                        ${receiving.products.map(p => `
                                            <tr>
                                                <td class="px-4 py-3">${p.ten_san_pham}</td>
                                                <td class="px-4 py-3 text-center">${p.so_luong_dat}</td>
                                                <td class="px-4 py-3 text-center font-bold">${p.so_luong_thuc_nhan}</td>
                                                <td class="px-4 py-3 text-right">${formatPrice(p.gia_nhap)}</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatPrice(p.thanh_tien)}</td>
                                                <td class="px-4 py-3 text-center">
                                                    ${p.chat_luong === 'tot' ? '✅ Tốt' : p.chat_luong === 'trung_binh' ? '⚠️ TB' : '❌ Kém'}
                                                </td>
                                            </tr>
                                            ${p.ghi_chu ? `
                                                <tr>
                                                    <td colspan="6" class="px-4 py-2 text-sm text-gray-600 bg-gray-50">
                                                        💬 ${p.ghi_chu}
                                                    </td>
                                                </tr>
                                            ` : ''}
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('receiving-detail-content').innerHTML = html;
                document.getElementById('receiving-detail-modal').classList.add('active');
                
            } catch (error) {
                console.error('View receiving detail error:', error);
                alert('Lỗi xem chi tiết: ' + error.message);
            }
        }

        function closeReceivingDetailModal() {
            const modal = document.getElementById('receiving-detail-modal');
            if (modal) modal.classList.remove('active');
        }

        async function deleteReceiving(id) {
            if (!confirm('Bạn có chắc muốn xóa phiếu nhập này?')) return;
            
            try {
                const response = await fetch(`${API_URL}/admin/receivings/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                
                alert('Xóa phiếu nhập thành công!');
                loadReceivings();
                
            } catch (error) {
                console.error('Delete receiving error:', error);
                alert('Lỗi xóa phiếu nhập: ' + error.message);
            }
        }

        function applyReceivingFilters() {
            loadReceivings();
        }

        function resetReceivingFilters() {
            const statusFilter = document.getElementById('receiving-status-filter');
            const supplierFilter = document.getElementById('receiving-supplier-filter');
            const dateFrom = document.getElementById('receiving-date-from');
            const dateTo = document.getElementById('receiving-date-to');
            
            if (statusFilter) statusFilter.value = '';
            if (supplierFilter) supplierFilter.value = '';
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            
            loadReceivings();
        }

        function printReceiving() {
            window.print();
        }

        async function editReceiving(id) {
            try {
                // Load dữ liệu phiếu nhập
                const response = await fetch(`${API_URL}/admin/receivings/${id}`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                
                const receiving = result.data;
                
                // Mở modal
                const modal = document.getElementById('receiving-modal');
                const form = document.getElementById('receiving-form');
                const idInput = document.getElementById('receiving-id');
                const container = document.getElementById('receiving-products-container');
                
                if (!modal || !form) return;
                
                modal.classList.add('active');
                form.reset();
                
                // Set ID để biết đây là edit
                if (idInput) idInput.value = id;
                
                // Load suppliers và products
                await loadSuppliersForReceiving();
                await loadProductsForReceiving();
                
                // Fill form data
                document.getElementById('receiving-supplier').value = receiving.ma_nha_cung_cap;
                document.getElementById('receiving-pre-order').value = receiving.ma_don_dat_hang || '';
                
                // Format datetime for input
                const date = new Date(receiving.ngay_nhap);
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                document.getElementById('receiving-date').value = date.toISOString().slice(0, 16);
                
                document.getElementById('receiving-status').value = receiving.trang_thai;
                document.getElementById('receiving-note').value = receiving.ghi_chu || '';
                
                // Clear products container
                if (container) container.innerHTML = '';
                receivingProductCounter = 0;
                
                // Add products
                for (const product of receiving.products) {
                    const index = receivingProductCounter++;
                    
                    const productOptions = allProducts.map(p => 
                        `<option value="${p.ma_san_pham}" data-price="${p.gia_nhap || p.gia * 0.7}" ${p.ma_san_pham == product.ma_san_pham ? 'selected' : ''}>${p.ten_san_pham} - ${formatPrice(p.gia)}</option>`
                    ).join('');
                    
                    const html = `
                        <div class="receiving-product-item border-2 border-gray-200 rounded-xl p-4 bg-gray-50" data-index="${index}">
                            <div class="flex justify-between items-start mb-3">
                                <h5 class="font-bold text-gray-700">Sản phẩm #${index + 1}</h5>
                                <button type="button" onclick="removeReceivingProduct(${index})" class="text-red-500 hover:text-red-700 font-bold">
                                    ❌ Xóa
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Sản phẩm *</label>
                                    <select name="product_id[]" required onchange="updateReceivingProductPrice(${index})" 
                                            class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                        <option value="">-- Chọn sản phẩm --</option>
                                        ${productOptions}
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">SL đặt</label>
                                    <input type="number" name="quantity_ordered[]" min="0" value="${product.so_luong_dat}" 
                                           class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">SL thực nhận *</label>
                                    <input type="number" name="quantity_received[]" min="0" value="${product.so_luong_thuc_nhan}" required 
                                           onchange="calculateReceivingTotal()" 
                                           class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Giá nhập *</label>
                                    <input type="number" name="price[]" min="0" step="1000" value="${product.gia_nhap}" required 
                                           onchange="calculateReceivingTotal()" 
                                           class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Chất lượng</label>
                                    <select name="quality[]" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                        <option value="tot" ${product.chat_luong === 'tot' ? 'selected' : ''}>✅ Tốt</option>
                                        <option value="trung_binh" ${product.chat_luong === 'trung_binh' ? 'selected' : ''}>⚠️ Trung bình</option>
                                        <option value="kem" ${product.chat_luong === 'kem' ? 'selected' : ''}>❌ Kém</option>
                                    </select>
                                </div>
                                
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                                    <input type="text" name="product_note[]" value="${product.ghi_chu || ''}" placeholder="Ghi chú về sản phẩm..." 
                                           class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none">
                                </div>
                            </div>
                        </div>
                    `;
                    
                    container.insertAdjacentHTML('beforeend', html);
                }
                
                // Calculate total
                calculateReceivingTotal();
                
            } catch (error) {
                console.error('Edit receiving error:', error);
                alert('Lỗi tải dữ liệu phiếu nhập: ' + error.message);
            }
        }

        // ==================== INVENTORY FUNCTIONS ====================
        
        // Active Inventory State Variables
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
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">✅ Đã cân kho</span>';
                        } else if (inv.trang_thai === 'hoan_thanh') {
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">📥 Chờ duyệt cân</span>';
                        } else {
                            statusBadge = '<span class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shadow-sm">⏳ Đang kiểm kê</span>';
                        }
                        
                        const ngayKiem = inv.ngay_kiem_ke ? new Date(inv.ngay_kiem_ke).toLocaleString('vi-VN') : 'Chưa có';
                        const chenhLechText = inv.tong_chenh_lech > 0 ? `+${inv.tong_chenh_lech}` : inv.tong_chenh_lech;
                        const chenhLechColor = inv.tong_chenh_lech > 0 ? 'text-green-600 font-bold' : (inv.tong_chenh_lech < 0 ? 'text-red-600 font-bold' : 'text-slate-600');
                        
                        // Action buttons styled with premium borders, colors, and shadows
                        let actionButtons = `
                            <button onclick="openInventoryDetail(${inv.ma_phieu_kiem_ke})" class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">👁️ Xem</button>
`;
                        
                        if (inv.trang_thai === 'dang_kiem_ke') {
                            actionButtons += `
                                <button onclick="openInventoryModal(&quot;${inv.ma_phieu_kiem_ke}&quot;)" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm ml-1.5 font-sans">✏️ Sửa</button>
`;
                        }
                        
                        if (inv.trang_thai === 'hoan_thanh') {
                            actionButtons += `
                                <button onclick="approveInventory(${inv.ma_phieu_kiem_ke})" class="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-extrabold text-xs transition-all shadow-md ml-1.5 font-sans">🛡️ Duyệt cân</button>
`;
                        }
                        
                        actionButtons += `
                            <button onclick="deleteInventory(${inv.ma_phieu_kiem_ke})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1.5" title="Xóa phiếu">🗑️</button>
`;
                        
                        const maPhieu = inv.ma_phieu || `PKK${new Date(inv.ngay_kiem_ke).toISOString().slice(0, 10).replace(/-/g, '')}-${String(inv.ma_phieu_kiem_ke).padStart(4, '0')}`;
                        
                        return `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">${maPhieu}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">👤 NV-${inv.ma_nhan_vien}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap">${ngayKiem}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800 whitespace-nowrap">${inv.tong_san_pham || 0} Sp</td>
                                <td class="px-6 py-4 border-b text-right ${chenhLechColor} whitespace-nowrap">${chenhLechText}</td>
                                <td class="px-6 py-4 border-b text-right font-bold text-slate-800 whitespace-nowrap">${formatPrice(inv.gia_tri_chenh_lech)}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">${statusBadge}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1">${actionButtons}</div>
                                </td>
                            </tr>
`;
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
                document.getElementById('inventory-code').value = `PKK${year}${month}${date}-${hh}${mm}${ss}`;
                
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
                document.getElementById('inventory-modal-title').textContent = `✏️ Cập nhật phiếu kiểm kê #${id}`;
                
                try {
                    const result = await apiCall(`/admin/inventories/${id}`);
                    if (result.success && result.data) {
                        const inv = result.data;
                        
                        document.getElementById('inventory-code').value = inv.ma_phieu || `PKK${inv.ma_phieu_kiem_ke}`;
                        
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
            
            resultsContainer.innerHTML = matched.slice(0, 10).map(p => `
                <div onclick="addInventoryProductByJson('${encodeURIComponent(JSON.stringify(p))}')" class="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-sm transition-all hover:pl-4">
                    <div>
                        <p class="font-bold text-slate-800">${p.ten_san_pham}</p>
                        <p class="text-xs text-slate-400 font-mono font-semibold">${p.ma_san_pham_code || 'N/A'} - Barcode: &quot;${p.barcode || 'N/A'}&quot;</p>
                    </div>
                    <div class="text-right">
                        <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-black">Kho: ${p.so_luong || 0}</span>
                    </div>
                </div>
            `).join('');
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
                container.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-8 text-gray-400 font-medium">Chưa có sản phẩm nào. Hãy tìm sản phẩm hoặc quét barcode ở trên!</td>
                    </tr>
                `;
                calculateInventoryTotals();
                return;
            }
            
            if (rebuildTable) {
                container.innerHTML = inventoryItems.map((item, idx) => {
                    const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
                    const diffText = diff > 0 ? `+${diff}` : diff;
                    const diffColor = diff > 0 ? 'text-green-600 font-extrabold bg-green-50 px-2 py-0.5 rounded border border-green-200' : (diff < 0 ? 'text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-200' : 'text-slate-500');
                    
                    return `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-3 text-left font-bold text-slate-500">${idx + 1}</td>
                            <td class="px-4 py-3 text-left">
                                <p class="font-bold text-slate-800">${item.ten_san_pham}</p>
                                <p class="text-xs font-mono font-semibold text-slate-400">${item.ma_san_pham_code}</p>
                            </td>
                            <td class="px-4 py-3 text-right font-semibold text-slate-700">${item.so_luong_he_thong}</td>
                            <td class="px-4 py-3 text-center">
                                <input type="number" value="${item.so_luong_thuc_te}" min="0" 
                                    oninput="updateInventoryItemQty(${idx}, this.value)" 
                                    class="w-20 px-2.5 py-1 text-center font-bold border-2 border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                            </td>
                            <td class="px-4 py-3 text-right font-mono font-bold" id="item-diff-${idx}">${diffText}</td>
                            <td class="px-4 py-3">
                                <select onchange="updateInventoryItemReason(&quot;	ext_idx_${idx}&quot;, this.value)" id="item-reason-&quot;	ext_idx_${idx}&quot;" 
                                    class="w-full px-2 py-1.5 border-2 border-slate-300 rounded-lg text-xs font-bold focus:border-indigo-500 focus:outline-none text-slate-700 bg-white">
                                    <option value="Khớp hoàn toàn" ${item.ly_do_chenh_lech === 'Khớp hoàn toàn' ? 'selected' : ''}>✨ Khớp hoàn toàn</option>
                                    <option value="Ghi nhận thất thoát" ${item.ly_do_chenh_lech === 'Ghi nhận thất thoát' ? 'selected' : ''}>⚠️ Ghi nhận thất thoát (Thiếu)</option>
                                    <option value="Cập nhật tăng tồn" ${item.ly_do_chenh_lech === 'Cập nhật tăng tồn' ? 'selected' : ''}>📥 Cập nhật tăng tồn (Dư)</option>
                                    <option value="Hàng lỗi -> Chuyển kho bảo hành" ${item.ly_do_chenh_lech === 'Hàng lỗi -> Chuyển kho bảo hành' ? 'selected' : ''}>🔧 Hàng lỗi -> Bảo hành</option>
                                    <option value="Khác" ${item.ly_do_chenh_lech === 'Khác' ? 'selected' : ''}>💡 Lý do khác...</option>
                                </select>
                            </td>
                            <td class="px-4 py-3">
                                <input type="text" value="${item.ghi_chu}" oninput="updateInventoryItemNote(${idx}, this.value)" placeholder="Chi tiết..." 
                                    class="w-full px-2.5 py-1 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none text-xs">
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button type="button" onclick="deleteInventoryItem(${idx})" class="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors font-bold">🗑️</button>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                // Attach real indexes without quotes issues
                inventoryItems.forEach((item, idx) => {
                    const selectEl = document.getElementById(`item-reason-"\text_idx_${idx}"`);
                    if (selectEl) {
                        selectEl.removeAttribute('id');
                        selectEl.onchange = (e) => updateInventoryItemReason(idx, e.target.value);
                    }
                });
            } else {
                // Just update diff values dynamically without redraw to preserve focus
                inventoryItems.forEach((item, idx) => {
                    const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
                    const diffText = diff > 0 ? `+&nbsp;${diff}` : diff;
                    
                    const diffEl = document.getElementById(`item-diff-${idx}`);
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
                    const selectEl = document.querySelector(`tr:nth-child(${idx+1}) select`);
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
            diffEl.textContent = totalDiff > 0 ? `+${totalDiff}` : totalDiff;
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
                    response = await fetch(`${API_URL}/admin/inventories/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });
                } else {
                    // Create (POST)
                    response = await fetch(`${API_URL}/admin/inventories`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
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
                const result = await apiCall(`/admin/inventories/${id}`);
                if (result.success && result.data) {
                    const inv = result.data;
                    
                    document.getElementById('detail-inv-code').textContent = inv.ma_phieu || `PKK${inv.ma_phieu_kiem_ke}`;
                    document.getElementById('detail-inv-date').textContent = inv.ngay_kiem_ke ? new Date(inv.ngay_kiem_ke).toLocaleString('vi-VN') : 'Chưa có';
                    document.getElementById('detail-inv-auditor').textContent = `Nhân viên ID: ${inv.ma_nhan_vien}`;
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
                        const diffText = diff > 0 ? `+${diff}` : diff;
                        const diffColor = diff > 0 ? 'text-green-600 font-extrabold' : (diff < 0 ? 'text-red-600 font-extrabold' : 'text-slate-500');
                        
                        // Icon mapping based on Step 4
                        let statusIcon = '⚖️ Khớp';
                        if (diff < 0) statusIcon = '📉 Thiếu - Thất thoát';
                        else if (diff > 0) statusIcon = '📈 Thừa - Tăng tồn';
                        
                        if (p.ly_do_chenh_lech && p.ly_do_chenh_lech.includes('bảo hành')) {
                            statusIcon = '🔧 Lỗi -> Bảo hành';
                        }
                        
                        return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-4 py-3 font-mono text-slate-500 font-bold">${p.ma_san_pham_code || 'N/A'}</td>
                                <td class="px-4 py-3 font-bold text-slate-800">${p.ten_san_pham || 'Sản phẩm đã bị xóa'}</td>
                                <td class="px-4 py-3 text-right font-medium text-slate-700">${p.so_luong_he_thong}</td>
                                <td class="px-4 py-3 text-right font-bold text-slate-800">${p.so_luong_thuc_te}</td>
                                <td class="px-4 py-3 text-right font-bold ${diffColor}">${diffText}</td>
                                <td class="px-4 py-3 font-bold text-slate-700">${statusIcon}</td>
                                <td class="px-4 py-3 text-xs text-slate-500 italic">${p.ghi_chu || ''}</td>
                            </tr>
                        `;
                    }).join('');
                    
                    // Update totals
                    const totalDiff = inv.tong_chenh_lech;
                    const diffText = totalDiff > 0 ? `+${totalDiff}` : totalDiff;
                    const diffColor = totalDiff > 0 ? 'text-green-600' : (totalDiff < 0 ? 'text-red-600' : 'text-slate-800');
                    
                    document.getElementById('detail-inv-total-items').textContent = inv.tong_san_pham;
                    document.getElementById('detail-inv-total-diff').textContent = diffText;
                    document.getElementById('detail-inv-total-diff').className = `text-lg font-extrabold ${diffColor}`;
                    document.getElementById('detail-inv-total-value').textContent = formatPrice(inv.gia_tri_chenh_lech);
                    
                    // Render action buttons
                    const actionContainer = document.getElementById('detail-inv-actions-container');
                    let actionHtml = `
                        <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95">
                            🖨️ In phiếu kiểm
                        </button>
                    `;
                    
                    if (inv.trang_thai === 'hoan_thanh') {
                        actionHtml += `
                            <button onclick="approveInventory(${inv.ma_phieu_kiem_ke}); closeInventoryDetailModal();" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-black text-sm shadow-lg ml-2 transition-all hover:scale-105 active:scale-95">
                                🛡️ Duyệt & Cân kho tự động (Bước 5)
                            </button>
                        `;
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
            if (!confirm('Bạn có chắc chắn muốn PHÊ DUYỆT phiếu kiểm kê này?\nHành động này sẽ cập nhật trực tiếp số lượng tồn kho của các sản phẩm trên hệ thống về số lượng thực tế đã đếm!')) {
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/admin/inventories/${id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
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
                const response = await fetch(`${API_URL}/admin/inventories/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
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
        // ==================== POS CASHIER SALES FUNCTIONS ====================
        
        let posCart = [];
        let posProducts = [];
        let posCategories = [];
        let posAllCustomers = [];
        let posSelectedCustomer = null;
        let posPaymentMethod = 'cod';
        let posClockInterval = null;
        let posKeyboardRegistered = false;

        async function loadPOSMachines() {
            console.log('📠 Initializing POS Cashier Desk...');
            
            // 1. Digital clock setup
            if (posClockInterval) clearInterval(posClockInterval);
            const liveClockEl = document.getElementById('pos-live-clock');
            if (liveClockEl) {
                const updateClock = () => {
                    const now = new Date();
                    liveClockEl.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
                };
                updateClock();
                posClockInterval = setInterval(updateClock, 1000);
            }

            // 2. Set Cashier Name from active admin user session
            const cashierNameEl = document.getElementById('pos-cashier-name');
            if (cashierNameEl) {
                const adminName = adminUser?.ten_dang_nhap || adminUser?.email || localStorage.getItem('admin_user_name') || 'Thu ngân';
                cashierNameEl.textContent = adminName;
            }

            // 3. Load database data
            try {
                // Renders initial loading states
                const gridContainer = document.getElementById('pos-products-grid');
                if (gridContainer) gridContainer.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400 font-medium">⏳ Đang tải dữ liệu sản phẩm...</div>';

                const [productsRes, categoriesRes, usersRes] = await Promise.all([
                    apiCall('/admin/products?limit=1000'),
                    apiCall('/admin/categories'),
                    apiCall('/admin/users')
                ]);

                if (productsRes.success) {
                    posProducts = productsRes.data || [];
                    // Keep track of original stock count for dynamic updates
                    posProducts.forEach(p => {
                        p.originalStock = parseInt(p.so_luong) || 0;
                    });
                }
                
                if (categoriesRes.success) {
                    posCategories = categoriesRes.data || [];
                    renderPOSCategoriesFilterAndTabs();
                }

                if (usersRes.success) {
                    // Filter to keep mainly standard store customers
                    posAllCustomers = usersRes.data || [];
                }

                // Render dynamic components
                filterPOSProducts();
                renderPOSCart();
                calculatePOSTotals();
                setupPOSKeyboardShortcuts();

            } catch (error) {
                console.error('❌ POS load error:', error);
                alert('Có lỗi xảy ra khi tải dữ liệu bán hàng POS!');
            }
        }

        // Render Categories dynamically in the tabs filter bar
        function renderPOSCategoriesFilterAndTabs() {
            // Category dropdown select
            const filterSelect = document.getElementById('pos-category-filter');
            if (filterSelect) {
                const options = posCategories.map(c => `<option value="${c.ma_danh_muc}">${c.ten_danh_muc}</option>`).join('');
                filterSelect.innerHTML = '<option value="">Tất cả danh mục</option>' + options;
            }

            // Category horizontal tabs
            const tabsContainer = document.getElementById('pos-categories-tabs');
            if (tabsContainer) {
                const tabHtml = `
                    <button onclick="selectPOSCategoryTab('')" class="pos-cat-tab whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black transition-all bg-indigo-600 text-white shadow-md shadow-indigo-600/10" data-cat-id="">
                        ✨ Tất cả
                    </button>
                ` + posCategories.map(c => `
                    <button onclick="selectPOSCategoryTab('${c.ma_danh_muc}')" class="pos-cat-tab whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" data-cat-id="${c.ma_danh_muc}">
                        ${c.ten_danh_muc}
                    </button>
                `).join('');
                tabsContainer.innerHTML = tabHtml;
            }
        }

        // Handle category tab selection
        window.selectPOSCategoryTab = function(categoryId) {
            const tabs = document.querySelectorAll('.pos-cat-tab');
            tabs.forEach(tab => {
                if (tab.getAttribute('data-cat-id') === String(categoryId)) {
                    tab.className = "pos-cat-tab whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black transition-all bg-indigo-600 text-white shadow-md shadow-indigo-600/10";
                } else {
                    tab.className = "pos-cat-tab whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
                }
            });

            // Update dropdown as well
            const filterSelect = document.getElementById('pos-category-filter');
            if (filterSelect) filterSelect.value = categoryId;

            filterPOSProducts();
        };

        // Filter product catalog in grid based on search bar and category tab
        window.filterPOSProducts = function() {
            const searchVal = (document.getElementById('pos-product-search')?.value || '').trim().toLowerCase();
            const selectVal = document.getElementById('pos-category-filter')?.value || '';

            // Only display products that are currently displayed (trang_thai = 'hien_thi')
            const filtered = posProducts.filter(p => {
                if (p.trang_thai !== 'hien_thi') return false;
                
                const matchesCategory = selectVal === '' || String(p.ma_danh_muc) === String(selectVal);
                
                const matchesSearch = p.ten_san_pham.toLowerCase().includes(searchVal) || 
                                      (p.ma_san_pham_code && p.ma_san_pham_code.toLowerCase().includes(searchVal)) || 
                                      (p.barcode && p.barcode.toLowerCase().includes(searchVal));
                
                return matchesCategory && matchesSearch;
            });

            renderPOSProductsGrid(filtered);
        };

        // Trigger filter on product search keyup
        window.onPOSSearchKeyUp = function(e) {
            filterPOSProducts();
        };

        // Render products as cards in grid
        function renderPOSProductsGrid(products) {
            const grid = document.getElementById('pos-products-grid');
            if (!grid) return;

            if (products.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-20 text-slate-400">
                        <div class="text-5xl mb-3">📦</div>
                        <p class="font-bold text-sm">Không tìm thấy sản phẩm nào phù hợp</p>
                    </div>
                `;
                return;
            }

            const html = products.map(p => {
                // Calculate dynamic stock remaining in catalog based on cart quantities
                const cartItem = posCart.find(item => item.ma_san_pham === p.ma_san_pham);
                const cartQty = cartItem ? cartItem.so_luong : 0;
                const remainingStock = p.originalStock - cartQty;

                const isOutOfStock = remainingStock <= 0;
                const stockBadge = isOutOfStock 
                    ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Hết hàng</span>`
                    : `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black">Tồn: ${remainingStock}</span>`;

                return `
                    <div onclick="addPOSProductToCart(${p.ma_san_pham})" class="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col justify-between hover:shadow-xl hover:border-indigo-400 hover:scale-[1.02] cursor-pointer transition-all duration-200 relative group shadow-sm select-none ${isOutOfStock ? 'opacity-70' : ''}">
                        <div class="relative rounded-lg overflow-hidden bg-slate-100 mb-2.5 aspect-square border border-slate-100 flex items-center justify-center">
                            <img src="${getImageUrl(p.anh_chinh)}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-300" onerror="this.src=PLACEHOLDER_IMG">
                            <div class="absolute top-2 left-2 shadow-sm">${stockBadge}</div>
                        </div>
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1 font-mono">${p.ma_san_pham_code || 'SKU'}</p>
                            <h5 class="text-xs font-black text-slate-800 line-clamp-2 h-8 leading-tight mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">${p.ten_san_pham}</h5>
                        </div>
                        <div class="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                            <span class="text-[13px] font-black text-indigo-600 font-mono tracking-tight">${formatPrice(p.gia)}</span>
                            <span class="w-6 h-6 rounded-full bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center text-xs font-bold transition-all shadow-sm">+</span>
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = html;
        }

        // Add selected product card to cart
        window.addPOSProductToCart = function(productId) {
            const product = posProducts.find(p => p.ma_san_pham === productId);
            if (!product) return;

            // Find current cart quantity
            const cartItem = posCart.find(item => item.ma_san_pham === productId);
            const cartQty = cartItem ? cartItem.so_luong : 0;

            // Check stock limits
            if (product.originalStock <= 0) {
                alert(`Sản phẩm "${product.ten_san_pham}" đã hết hàng trong kho!`);
                return;
            }

            if (cartQty >= product.originalStock) {
                alert(`Không thể mua nhiều hơn số lượng tồn kho của sản phẩm này (Tối đa: ${product.originalStock})`);
                return;
            }

            if (cartItem) {
                cartItem.so_luong += 1;
            } else {
                posCart.push({
                    ma_san_pham: product.ma_san_pham,
                    ma_san_pham_code: product.ma_san_pham_code,
                    ten_san_pham: product.ten_san_pham,
                    gia: product.gia,
                    anh_chinh: product.anh_chinh,
                    so_luong: 1,
                    originalStock: product.originalStock
                });
            }

            // Visual feedback - play quick click sound or dynamic catalog refresh
            renderPOSCart();
            calculatePOSTotals();
            filterPOSProducts(); // Dynamically updates grid stock counts
        };

        // Increment or decrement items inside the shopping cart
        window.updatePOSCartItemQuantity = function(productId, change) {
            const cartItem = posCart.find(item => item.ma_san_pham === productId);
            if (!cartItem) return;

            const newQty = cartItem.so_luong + change;
            if (newQty <= 0) {
                removePOSCartItem(productId);
                return;
            }

            if (newQty > cartItem.originalStock) {
                alert(`Không thể mua nhiều hơn số lượng tồn kho của sản phẩm này (Tối đa: ${cartItem.originalStock})`);
                return;
            }

            cartItem.so_luong = newQty;
            renderPOSCart();
            calculatePOSTotals();
            filterPOSProducts();
        };

        // Direct input change inside shopping cart item quantity
        window.onPOSCartQtyInputChange = function(productId, value) {
            const cartItem = posCart.find(item => item.ma_san_pham === productId);
            if (!cartItem) return;

            let qty = parseInt(value) || 1;
            if (qty <= 0) {
                removePOSCartItem(productId);
                return;
            }

            if (qty > cartItem.originalStock) {
                alert(`Không thể vượt quá số lượng tồn kho (Tối đa: ${cartItem.originalStock})`);
                qty = cartItem.originalStock;
            }

            cartItem.so_luong = qty;
            renderPOSCart();
            calculatePOSTotals();
            filterPOSProducts();
        };

        // Remove item from active checkout cart
        window.removePOSCartItem = function(productId) {
            posCart = posCart.filter(item => item.ma_san_pham !== productId);
            renderPOSCart();
            calculatePOSTotals();
            filterPOSProducts();
        };

        // Clear entire cart
        window.clearPOSCart = function() {
            if (posCart.length === 0) return;
            if (confirm('Bạn chắc chắn muốn xóa tất cả sản phẩm đang có trong giỏ hàng?')) {
                posCart = [];
                renderPOSCart();
                calculatePOSTotals();
                filterPOSProducts();
            }
        };

        // Render current items in the cart panel
        function renderPOSCart() {
            const cartContainer = document.getElementById('pos-cart-items');
            if (!cartContainer) return;

            if (posCart.length === 0) {
                cartContainer.innerHTML = `
                    <div class="h-48 flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                        <div class="text-5xl mb-2.5 animate-bounce">🛒</div>
                        <p class="text-sm font-black text-slate-700 tracking-tight">Giỏ hàng rỗng</p>
                        <p class="text-[11px] text-slate-400 mt-1">Vui lòng nhấp vào sản phẩm ở bảng bên trái để thêm vào đơn hàng</p>
                    </div>
                `;
                return;
            }

            const html = posCart.map(item => `
                <div class="flex items-center gap-2.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-100/50 transition-colors shadow-sm select-none">
                    <img src="${getImageUrl(item.anh_chinh)}" class="w-10 h-10 object-cover rounded-lg shadow-sm bg-white" onerror="this.src=PLACEHOLDER_IMG">
                    <div class="flex-1 min-w-0">
                        <h6 class="text-[11px] font-black text-slate-800 truncate" title="${item.ten_san_pham}">${item.ten_san_pham}</h6>
                        <span class="text-[11px] text-indigo-600 font-extrabold font-mono">${formatPrice(item.gia)}</span>
                    </div>
                    <div class="flex items-center gap-1 bg-white border rounded-lg px-1 shadow-sm">
                        <button onclick="updatePOSCartItemQuantity(${item.ma_san_pham}, -1)" class="w-5 h-5 text-xs font-bold text-slate-500 hover:text-slate-950 flex items-center justify-center">-</button>
                        <input type="text" class="w-7 text-center text-xs font-bold text-slate-700 font-mono border-none focus:outline-none p-0" value="${item.so_luong}" onchange="onPOSCartQtyInputChange(${item.ma_san_pham}, this.value)">
                        <button onclick="updatePOSCartItemQuantity(${item.ma_san_pham}, 1)" class="w-5 h-5 text-xs font-bold text-slate-500 hover:text-slate-950 flex items-center justify-center">+</button>
                    </div>
                    <button onclick="removePOSCartItem(${item.ma_san_pham})" class="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all font-bold text-sm" title="Xóa">🗑️</button>
                </div>
            `).join('');

            cartContainer.innerHTML = html;
        }

        // Calculate checkout totals, discount amount and remaining net amount
        window.calculatePOSTotals = function() {
            let subtotal = 0;
            posCart.forEach(item => {
                subtotal += (parseFloat(item.gia) || 0) * item.so_luong;
            });

            // Discount input
            const discountInput = document.getElementById('pos-discount-input');
            let discountPercent = 0;
            if (discountInput) {
                discountPercent = parseInt(discountInput.value) || 0;
                if (discountPercent < 0) { discountPercent = 0; discountInput.value = 0; }
                if (discountPercent > 100) { discountPercent = 100; discountInput.value = 100; }
            }

            const discountAmount = Math.round(subtotal * discountPercent / 100);
            
            // Shipping or transaction fee (free shipping if subtotal > 5M, else fixed 30k for simulation)
            const shippingFee = (subtotal === 0) ? 0 : (subtotal > 5000000 ? 0 : 30000);

            const totalPayment = subtotal - discountAmount + shippingFee;

            // Render calculations
            document.getElementById('pos-subtotal').textContent = formatPrice(subtotal);
            document.getElementById('pos-shipping').textContent = formatPrice(shippingFee);
            document.getElementById('pos-total-payment').textContent = formatPrice(totalPayment);
        };

        // Setup the cashier payment method tabs
        window.setPOSPaymentMethod = function(method) {
            posPaymentMethod = method;
            const buttons = document.querySelectorAll('.pos-pay-method-btn');
            buttons.forEach(btn => {
                const btnMethod = btn.getAttribute('data-method');
                if (btnMethod === method) {
                    btn.className = "pos-pay-method-btn py-2 text-[11px] font-black rounded-lg border text-center transition-all bg-indigo-600 text-white border-indigo-600 shadow-sm";
                } else {
                    btn.className = "pos-pay-method-btn py-2 text-[11px] font-black rounded-lg border text-center transition-all bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
                }
            });
        };

        // ==================== POS CUSTOMER AUTOCOMPLETE SEARCH ====================
        
        window.showPOSCustomerResults = function() {
            const resultsBox = document.getElementById('pos-customer-results');
            if (resultsBox && resultsBox.innerHTML.trim() !== '') {
                resultsBox.classList.remove('hidden');
            }
        };

        // Close dropdown customer results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#pos-customer-search') && !e.target.closest('#pos-customer-results')) {
                document.getElementById('pos-customer-results')?.classList.add('hidden');
            }
        });

        // Autocomplete autocomplete keyup event search
        window.onPOSCustomerSearchKeyUp = function(e) {
            const searchVal = e.target.value.trim().toLowerCase();
            const resultsBox = document.getElementById('pos-customer-results');
            
            if (!resultsBox) return;

            if (searchVal === '') {
                resultsBox.innerHTML = '';
                resultsBox.classList.add('hidden');
                return;
            }

            const matched = posAllCustomers.filter(c => 
                (c.ten_dang_nhap && c.ten_dang_nhap.toLowerCase().includes(searchVal)) || 
                (c.so_dien_thoai && c.so_dien_thoai.includes(searchVal)) || 
                (c.email && c.email.toLowerCase().includes(searchVal))
            );

            if (matched.length === 0) {
                resultsBox.innerHTML = `
                    <div class="p-3.5 text-center text-slate-400 text-xs font-semibold">
                        ❌ Không có khách hàng trùng khớp
                    </div>
                `;
                resultsBox.classList.remove('hidden');
                return;
            }

            const html = matched.map(c => `
                <div onclick="selectPOSCustomer(${c.ma_tai_khoan})" class="p-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors text-xs font-semibold text-slate-700">
                    <div>
                        <p class="font-bold text-slate-900">${c.ten_dang_nhap}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5 font-normal">${c.email || 'Không có email'}</p>
                    </div>
                    <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">${c.so_dien_thoai || '-'}</span>
                </div>
            `).join('');

            resultsBox.innerHTML = html;
            resultsBox.classList.remove('hidden');
        };

        // Select customer and display standard chip
        window.selectPOSCustomer = function(customerId) {
            const customer = posAllCustomers.find(c => c.ma_tai_khoan === customerId);
            if (!customer) return;

            posSelectedCustomer = customer;
            
            document.getElementById('pos-customer-name-display').textContent = customer.ten_dang_nhap;
            document.getElementById('pos-customer-phone-display').textContent = `SĐT: ${customer.so_dien_thoai || '-'} | Email: ${customer.email || '-'}`;
            document.getElementById('pos-clear-customer-btn').classList.remove('hidden');
            
            // Clean input & hide box
            const searchInput = document.getElementById('pos-customer-search');
            if (searchInput) searchInput.value = '';
            document.getElementById('pos-customer-results').classList.add('hidden');
        };

        // Clear customer and return to "Khách mua lẻ"
        window.clearSelectedPOSCustomer = function() {
            posSelectedCustomer = null;
            document.getElementById('pos-customer-name-display').textContent = 'Khách mua lẻ';
            document.getElementById('pos-customer-phone-display').textContent = 'Mặc định bán lẻ tại cửa hàng';
            document.getElementById('pos-clear-customer-btn').classList.add('hidden');
        };

        // Control popups for quick customer creation
        window.openQuickCustomerModal = function() {
            document.getElementById('pos-quick-customer-modal').classList.add('active');
            document.getElementById('pos-new-customer-name').focus();
        };

        window.closeQuickCustomerModal = function() {
            document.getElementById('pos-quick-customer-modal').classList.remove('active');
            document.getElementById('pos-quick-customer-form').reset();
        };

        // Create new customer and auto select them
        window.saveQuickCustomer = async function(event) {
            event.preventDefault();
            const name = document.getElementById('pos-new-customer-name').value.trim();
            const phone = document.getElementById('pos-new-customer-phone').value.trim();
            const email = document.getElementById('pos-new-customer-email').value.trim();

            if (!name || !phone) {
                alert('Vui lòng điền các trường bắt buộc!');
                return;
            }

            try {
                // Post customer endpoint to database
                const payload = {
                    ten_dang_nhap: name,
                    so_dien_thoai: phone,
                    email: email || `${phone}@store.com`,
                    mat_khau: '123456', // default initial placeholder password
                    vai_tro: 'user',
                    trang_thai: 1
                };

                const response = await apiCall('/admin/users', 'POST', payload);
                if (response.success) {
                    alert('✅ Đã đăng ký khách hàng thành công!');
                    
                    // Reload users lists
                    const usersRes = await apiCall('/admin/users');
                    if (usersRes.success) posAllCustomers = usersRes.data || [];
                    
                    // Auto select newly created customer
                    const createdCust = posAllCustomers.find(c => c.so_dien_thoai === phone || c.ten_dang_nhap === name);
                    if (createdCust) {
                        selectPOSCustomer(createdCust.ma_tai_khoan);
                    }
                    closeQuickCustomerModal();
                } else {
                    alert('❌ Lỗi: ' + response.message);
                }
            } catch (error) {
                console.error('Quick customer registration error:', error);
                alert('Lỗi kết nối máy chủ!');
            }
        };

        // ==================== POS BILL CHECKOUT & THERMAL RECEIPT ====================

        // Place POS Order
        window.checkoutPOSOrder = async function() {
            if (posCart.length === 0) {
                alert('Giỏ hàng trống! Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!');
                return;
            }

            const confirmPayment = confirm(`Xác nhận thanh toán hóa đơn trị giá ${document.getElementById('pos-total-payment').textContent}?`);
            if (!confirmPayment) return;

            const items = posCart.map(i => ({
                ma_san_pham: i.ma_san_pham,
                ten_san_pham: i.ten_san_pham,
                so_luong: i.so_luong,
                gia_ban: i.gia
            }));

            const discountInput = document.getElementById('pos-discount-input');
            const discountPercent = discountInput ? parseInt(discountInput.value) || 0 : 0;
            const note = document.getElementById('pos-note-input')?.value || 'Đơn bán hàng tại quầy';
            
            // Build the payload
            const payload = {
                items: items,
                dia_chi_giao_hang: 'Mua tại quầy Yến Nhi Tech Store',
                so_dien_thoai: posSelectedCustomer ? posSelectedCustomer.so_dien_thoai : '0358022466',
                ghi_chu: note,
                phuong_thuc_thanh_toan: posPaymentMethod, // 'cod' (tiền mặt), 'bank' (chuyển khoản), 'momo' (momo)
                discount_percent: discountPercent
            };

            // Enhanced enterprise support: If customer selected, specify their customer ID!
            if (posSelectedCustomer) {
                payload.ma_tai_khoan = posSelectedCustomer.ma_tai_khoan;
            }

            try {
                // Post order checkout
                const response = await apiCall('/admin/pos/orders', 'POST', payload);
                if (response.success) {
                    alert('🎉 Thanh toán thành công! Đã ghi nhận đơn hàng vào hệ thống.');

                    // Fetch full order invoice details to render receipt
                    const orderId = response.data.ma_don_hang;
                    openPOSReceiptModal(orderId, payload, response.data.tong_tien);

                    // Clear state
                    posCart = [];
                    renderPOSCart();
                    calculatePOSTotals();
                    
                    // Reload original catalog products stock
                    const productsRes = await apiCall('/admin/products?limit=1000');
                    if (productsRes.success) {
                        posProducts = productsRes.data || [];
                        posProducts.forEach(p => p.originalStock = parseInt(p.so_luong) || 0);
                    }
                    filterPOSProducts();
                    
                    // Refresh dashboard data
                    loadDashboard();

                } else {
                    alert('❌ Lỗi thanh toán: ' + response.message);
                }
            } catch (error) {
                console.error('Checkout error:', error);
                alert('Có lỗi kết nối khi đặt hàng!');
            }
        };

        // Save order as a temporary draft/hold order
        window.savePOSOrderDraft = function() {
            if (posCart.length === 0) {
                alert('Giỏ hàng rỗng, không thể lưu nháp!');
                return;
            }
            // Save active checkout state to local storage or draft holds
            const draft = {
                cart: posCart,
                customer: posSelectedCustomer,
                discount: document.getElementById('pos-discount-input')?.value || 0,
                payMethod: posPaymentMethod,
                note: document.getElementById('pos-note-input')?.value || '',
                time: new Date().getTime()
            };

            localStorage.setItem('pos_cart_draft', JSON.stringify(draft));
            alert('💾 Đã lưu tạm đơn hàng vào bộ nhớ máy thành công! Bạn có thể khôi phục lại bất kỳ lúc nào.');
        };

        // Open 80mm Cashier thermal receipt print preview modal
        window.openPOSReceiptModal = function(orderId, orderPayload, netTotal) {
            const modal = document.getElementById('pos-receipt-modal');
            if (!modal) return;

            // Đồng bộ thông tin cửa hàng (tên, địa chỉ, hotline, website) từ DB
            if (window.StoreInfo && typeof window.StoreInfo.initStoreInfo === 'function') {
                window.StoreInfo.initStoreInfo(modal);
            }

            // Fill header invoice metadata
            document.getElementById('receipt-id').textContent = `#DH${orderId}`;
            
            const now = new Date();
            document.getElementById('receipt-date').textContent = now.toLocaleString('vi-VN');
            
            const cashierName = adminUser?.ten_dang_nhap || 'Admin';
            document.getElementById('receipt-cashier').textContent = cashierName;
            
            const custName = posSelectedCustomer ? posSelectedCustomer.ten_dang_nhap : 'Khách hàng mua lẻ';
            document.getElementById('receipt-customer').textContent = custName;
            
            const phoneRow = document.getElementById('receipt-customer-phone-row');
            if (posSelectedCustomer && posSelectedCustomer.so_dien_thoai) {
                document.getElementById('receipt-customer-phone').textContent = posSelectedCustomer.so_dien_thoai;
                phoneRow.classList.remove('hidden');
            } else {
                phoneRow.classList.add('hidden');
            }

            // Fill product items lists
            const itemsListContainer = document.getElementById('receipt-items-list');
            let subtotal = 0;
            
            const itemHtml = orderPayload.items.map((item, idx) => {
                const totalItemPrice = item.gia_ban * item.so_luong;
                subtotal += totalItemPrice;
                return `
                    <div class="border-b border-dotted border-slate-200 py-1">
                        <p class="font-bold text-slate-800">${idx+1}. ${item.ten_san_pham}</p>
                        <div class="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>${item.so_luong} x ${formatPrice(item.gia_ban)}</span>
                            <span class="font-bold text-slate-700">${formatPrice(totalItemPrice)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            itemsListContainer.innerHTML = itemHtml;

            // Fill total receipts calculations
            const discountPercent = orderPayload.discount_percent || 0;
            const discountAmount = Math.round(subtotal * discountPercent / 100);
            
            document.getElementById('receipt-subtotal').textContent = formatPrice(subtotal);
            document.getElementById('receipt-discount').textContent = `-${formatPrice(discountAmount)}`;
            document.getElementById('receipt-total').textContent = formatPrice(netTotal || (subtotal - discountAmount));

            // Set payment text
            const payMethodsText = {
                'cod': 'TIỀN MẶT (CASH)',
                'bank': 'CHUYỂN KHOẢN (BANKING)',
                'momo': 'VÍ MÔMÔ / ZALOPAY'
            };
            document.getElementById('receipt-pay-method').textContent = payMethodsText[orderPayload.phuong_thuc_thanh_toan] || 'TIỀN MẶT';

            // Generate real QR code image inside thermal print layout
            const qrContainer = document.getElementById('receipt-qr-code');
            if (qrContainer) {
                // Generates dynamic online receipt URL or payment code
                const receiptUrl = `https://yennhitechstore.com/invoice/${orderId}`;
                qrContainer.innerHTML = `
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(receiptUrl)}" class="w-20 h-20 border rounded-lg bg-white p-1" alt="QR Receipt">
                `;
            }

            modal.classList.add('active');
        };

        window.closePOSReceiptModal = function() {
            document.getElementById('pos-receipt-modal').classList.remove('active');
        };

        // ==================== POS KEYBOARD SHORTCUTS HANDLING ====================

        function setupPOSKeyboardShortcuts() {
            if (posKeyboardRegistered) return;
            posKeyboardRegistered = true;

            document.addEventListener('keydown', (e) => {
                // Ensure keyboard shortcuts are only triggered if cashier POS desk is currently the active tab
                const posSection = document.getElementById('section-pos-machines');
                if (!posSection || !posSection.classList.contains('active')) return;

                // F3: Focus on Product Search Input
                if (e.key === 'F3') {
                    e.preventDefault();
                    const searchInput = document.getElementById('pos-product-search');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }

                // F4: Focus on Customer Search Input
                if (e.key === 'F4') {
                    e.preventDefault();
                    const customerInput = document.getElementById('pos-customer-search');
                    if (customerInput) {
                        customerInput.focus();
                        customerInput.select();
                    }
                }

                // F9: Trigger order checkout payment
                if (e.key === 'F9') {
                    e.preventDefault();
                    checkoutPOSOrder();
                }

                // F10: Save active cart as a draft/hold order
                if (e.key === 'F10') {
                    e.preventDefault();
                    savePOSOrderDraft();
                }
            });

            console.log('⌨️ POS Cashier Keyboard shortcuts (F3, F4, F9, F10) registered successfully.');
        }

        // ==================== EXPENSE TYPES FUNCTIONS ====================
        
        let currentExpenseTypeTab = 'all';
        let allExpenseTypes = [];

        async function loadExpenseTypes() {
            try {
                const response = await fetch(`${API_URL}/admin/expense-types`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    allExpenseTypes = data.data.types || [];
                    updateExpenseTypeStats(data.data.stats);
                    updateExpenseTypeCounts();
                    renderExpenseTypes();
                }
            } catch (error) {
                console.error('Load expense types error:', error);
            }
        }

        function updateExpenseTypeStats(stats) {
            document.getElementById('expense-type-total').textContent = stats.total || 0;
            document.getElementById('expense-type-fixed').textContent = stats.fixed || 0;
            document.getElementById('expense-type-variable').textContent = stats.variable || 0;
            document.getElementById('expense-type-active').textContent = stats.active || 0;
        }

        function updateExpenseTypeCounts() {
            const counts = {
                all: allExpenseTypes.length,
                co_dinh: allExpenseTypes.filter(t => t.phan_nhom === 'co_dinh').length,
                phat_sinh: allExpenseTypes.filter(t => t.phan_nhom === 'phat_sinh').length,
                marketing: allExpenseTypes.filter(t => t.phan_nhom === 'marketing').length,
                van_hanh: allExpenseTypes.filter(t => t.phan_nhom === 'van_hanh').length
            };
            
            document.getElementById('tab-all-count').textContent = counts.all;
            document.getElementById('tab-fixed-count').textContent = counts.co_dinh;
            document.getElementById('tab-variable-count').textContent = counts.phat_sinh;
            document.getElementById('tab-marketing-count').textContent = counts.marketing;
            document.getElementById('tab-operation-count').textContent = counts.van_hanh;
        }

        function renderExpenseTypes() {
            const container = document.getElementById('expense-types-container');
            if (!container) return;
            
            let filteredTypes = allExpenseTypes;
            if (currentExpenseTypeTab !== 'all') {
                filteredTypes = allExpenseTypes.filter(t => t.phan_nhom === currentExpenseTypeTab);
            }
            
            if (filteredTypes.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <div class="text-6xl mb-4">📋</div>
                        <p class="text-gray-500 text-lg">Chưa có loại chi phí nào</p>
                    </div>
                `;
                return;
            }
            
            const groupLabels = {
                'co_dinh': '🔒 Cố định',
                'phat_sinh': '⚡ Phát sinh',
                'marketing': '📢 Marketing',
                'van_hanh': '⚙️ Vận hành'
            };
            
            const colorClasses = {
                'blue': 'from-blue-500 to-blue-600',
                'green': 'from-green-500 to-green-600',
                'red': 'from-red-500 to-red-600',
                'orange': 'from-orange-500 to-orange-600',
                'purple': 'from-purple-500 to-purple-600',
                'pink': 'from-pink-500 to-pink-600',
                'yellow': 'from-yellow-500 to-yellow-600',
                'gray': 'from-gray-500 to-gray-600'
            };
            
            const html = filteredTypes.map(type => {
                const colorClass = colorClasses[type.mau_sac] || colorClasses['blue'];
                const statusBadge = type.trang_thai == 1 
                    ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✅ Hoạt động</span>'
                    : '<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">❌ Tạm ngưng</span>';
                
                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden border-2 border-gray-100">
                        <div class="bg-gradient-to-br ${colorClass} p-6 text-white">
                            <div class="flex items-center justify-between mb-4">
                                <div class="text-5xl">${type.icon || '📋'}</div>
                                ${statusBadge}
                            </div>
                            <h4 class="text-xl font-bold mb-1">${type.ten_hien_thi}</h4>
                            <p class="text-sm opacity-90">${groupLabels[type.phan_nhom] || type.phan_nhom}</p>
                        </div>
                        
                        <div class="p-4">
                            ${type.mo_ta ? `
                                <div class="mb-4">
                                    <p class="text-xs text-gray-500 mb-1">Mô tả:</p>
                                    <p class="text-sm text-gray-700">${type.mo_ta}</p>
                                </div>
                            ` : ''}
                            
                            <div class="flex gap-2">
                                <button onclick="editExpenseType('${type.ma_loai}')" class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg font-semibold text-sm">
                                    ✏️ Sửa
                                </button>
                                <button onclick="deleteExpenseType('${type.ma_loai}')" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-semibold text-sm">
                                    🗑️ Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        }

        function switchExpenseTypeTab(tab) {
            currentExpenseTypeTab = tab;
            
            // Update tab buttons
            document.querySelectorAll('.expense-type-tab').forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-gray-700');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            
            const activeTab = document.querySelector(`.expense-type-tab[data-tab="${tab}"]`);
            activeTab.classList.add('active', 'border-blue-500', 'text-gray-700');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            
            renderExpenseTypes();
        }

        function openExpenseTypeModal(code = null) {
            const modal = document.getElementById('expense-type-modal');
            const form = document.getElementById('expense-type-form');
            const title = document.getElementById('expense-type-modal-title');
            
            form.reset();
            
            if (code) {
                // Edit mode
                const type = allExpenseTypes.find(t => t.ma_loai === code);
                if (type) {
                    title.textContent = '✏️ Sửa loại chi phí';
                    document.getElementById('expense-type-id').value = type.ma_loai;
                    document.getElementById('expense-type-name').value = type.ten_hien_thi;
                    document.getElementById('expense-type-group').value = type.phan_nhom;
                    document.getElementById('expense-type-icon').value = type.icon || '📋';
                    document.getElementById('expense-type-description').value = type.mo_ta || '';
                    document.getElementById('expense-type-color').value = type.mau_sac || 'blue';
                    document.getElementById('expense-type-status').value = type.trang_thai;
                }
            } else {
                // Add mode
                title.textContent = '➕ Thêm loại chi phí mới';
            }
            
            modal.classList.add('active');
        }

        function closeExpenseTypeModal() {
            document.getElementById('expense-type-modal').classList.remove('active');
            document.getElementById('expense-type-form').reset();
        }

        function editExpenseType(code) {
            openExpenseTypeModal(code);
        }

        async function deleteExpenseType(code) {
            if (!confirm('Bạn có chắc muốn xóa loại chi phí này?\n\nLưu ý: Các chi phí đã ghi nhận với loại này sẽ không bị xóa.')) return;
            
            try {
                const response = await fetch(`${API_URL}/admin/expense-types/${code}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Đã xóa loại chi phí');
                    loadExpenseTypes();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Delete expense type error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        }

        document.getElementById('expense-type-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('expense-type-id').value;
            const isEdit = !!id;
            
            const formData = {
                ten_hien_thi: document.getElementById('expense-type-name').value,
                phan_nhom: document.getElementById('expense-type-group').value,
                icon: document.getElementById('expense-type-icon').value,
                mo_ta: document.getElementById('expense-type-description').value,
                mau_sac: document.getElementById('expense-type-color').value,
                trang_thai: document.getElementById('expense-type-status').value
            };
            
            try {
                const url = isEdit 
                    ? `${API_URL}/admin/expense-types/${id}`
                    : `${API_URL}/admin/expense-types`;
                    
                const response = await fetch(url, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(isEdit ? '✅ Đã cập nhật loại chi phí!' : '✅ Đã thêm loại chi phí mới!');
                    closeExpenseTypeModal();
                    loadExpenseTypes();
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                console.error('Save expense type error:', error);
                alert('❌ Có lỗi xảy ra');
            }
        });

        // ==================== FINANCIAL REPORT FUNCTIONS ====================
        
        // Khởi tạo dropdown tháng/năm về tháng hiện tại
        function initFinancialMonthYear() {
            const now = new Date();
            const currentMonth = String(now.getMonth() + 1); // 1-12
            const currentYear  = String(now.getFullYear());

            const monthEl = document.getElementById('financial-month');
            const yearEl  = document.getElementById('financial-year');
            if (monthEl) monthEl.value = currentMonth;
            if (yearEl)  yearEl.value  = currentYear;
        }

        // Dispatcher: gọi đúng hàm load tùy section đang active
        function reloadActiveFinancialSection() {
            const sections = ['revenue-report', 'expense-report', 'profit-report', 'financial-report'];
            for (const s of sections) {
                const el = document.getElementById('section-' + s);
                if (el && el.classList.contains('active')) {
                    if      (s === 'revenue-report')  loadRevenueReport();
                    else if (s === 'expense-report')  loadExpenseReport();
                    else if (s === 'profit-report')   loadProfitReport();
                    else                              loadFinancialReport();
                    return;
                }
            }
            // Fallback nếu không tìm được section active
            loadFinancialReport();
        }

        let financialCharts = {
            trend: null,
            expense: null,
            revenueReport: null,
            expenseReport: null,
            profitReport: null
        };
        let currentTransactions = [];

        async function loadFinancialReport() {
            // Safe guards to ensure dropdowns exist
            const monthEl = document.getElementById('financial-month');
            const yearEl = document.getElementById('financial-year');
            if (!monthEl || !yearEl) return;
            
            const month = monthEl.value;
            const year = yearEl.value;
            
            // Calculate start and end of selected month
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            
            try {
                // Fetch using our custom date range API logic
                const params = new URLSearchParams({
                    period: 'custom',
                    startDate,
                    endDate
                });
                
                const response = await fetch(`${API_URL}/admin/financial-report?${params}`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    const reportData = data.data;
                    currentTransactions = reportData.transactions || [];
                    
                    // 1. Group transactions daily for the active month
                    const dailyData = {};
                    for (let d = 1; d <= lastDay; d++) {
                        const dayKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        dailyData[dayKey] = {
                            date: dayKey,
                            dateFormatted: `${d}/${month}/${year}`,
                            revenue: 0,
                            expense: 0,
                            profit: 0
                        };
                    }
                    
                    currentTransactions.forEach(t => {
                        const tDate = new Date(t.date);
                        // Correct for timezone offset to ensure correct localized date calculation
                        const offset = tDate.getTimezoneOffset() * 60000;
                        const localDate = new Date(tDate.getTime() - offset);
                        const tDateKey = localDate.toISOString().split('T')[0];
                        
                        if (dailyData[tDateKey]) {
                            if (t.type === 'revenue') {
                                dailyData[tDateKey].revenue += parseFloat(t.amount || 0);
                            } else {
                                dailyData[tDateKey].expense += parseFloat(t.amount || 0);
                            }
                            dailyData[tDateKey].profit = dailyData[tDateKey].revenue - dailyData[tDateKey].expense;
                        }
                    });
                    
                    // 2. Compute aggregate totals
                    const totalRevenue = Object.values(dailyData).reduce((sum, day) => sum + day.revenue, 0);
                    const totalExpense = Object.values(dailyData).reduce((sum, day) => sum + day.expense, 0);
                    const profit = totalRevenue - totalExpense;
                    
                    const summary = {
                        totalRevenue,
                        totalExpense,
                        profit
                    };
                    
                    // 3. Update UI Panels
                    updateFinancialSummary(summary);
                    updateFinancialCharts(dailyData);
                    updateTransactionsTable(dailyData);
                }
            } catch (error) {
                console.error('Load financial report error:', error);
                const tbody = document.getElementById('transactions-table');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-red-500">Lỗi khi tải dữ liệu</td></tr>';
                }
            }
        }

        // ============================================================
        // HELPER: fetch & build dailyData for any financial section
        // ============================================================
        async function fetchFinancialDailyData() {
            const monthEl = document.getElementById('financial-month');
            const yearEl  = document.getElementById('financial-year');
            if (!monthEl || !yearEl) return null;

            const month = monthEl.value;
            const year  = yearEl.value;
            const startDate = `${year}-${month.padStart(2,'0')}-01`;
            const lastDay   = new Date(year, month, 0).getDate();
            const endDate   = `${year}-${month.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

            const params = new URLSearchParams({ period: 'custom', startDate, endDate });
            const response = await fetch(`${API_URL}/admin/financial-report?${params}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await response.json();
            if (!data.success) return null;

            const transactions = data.data.transactions || [];
            const dailyData = {};
            for (let d = 1; d <= lastDay; d++) {
                const dayKey = `${year}-${month.padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                dailyData[dayKey] = { date: dayKey, dateFormatted: `${d}/${month}/${year}`, revenue: 0, expense: 0, profit: 0, revCount: 0, expCount: 0 };
            }
            transactions.forEach(t => {
                const tDate   = new Date(t.date);
                const offset  = tDate.getTimezoneOffset() * 60000;
                const tDateKey = new Date(tDate.getTime() - offset).toISOString().split('T')[0];
                if (dailyData[tDateKey]) {
                    if (t.type === 'revenue') {
                        dailyData[tDateKey].revenue += parseFloat(t.amount || 0);
                        dailyData[tDateKey].revCount++;
                    } else {
                        dailyData[tDateKey].expense += parseFloat(t.amount || 0);
                        dailyData[tDateKey].expCount++;
                    }
                    dailyData[tDateKey].profit = dailyData[tDateKey].revenue - dailyData[tDateKey].expense;
                }
            });
            return dailyData;
        }

        // ============================================================
        // BÁO CÁO DOANH THU
        // ============================================================
        async function loadRevenueReport() {
            try {
                const dailyData = await fetchFinancialDailyData();
                if (!dailyData) return;

                const days = Object.values(dailyData);
                const totalRevenue   = days.reduce((s, d) => s + d.revenue, 0);
                const activeDays     = days.filter(d => d.revenue > 0);
                const avgDay         = activeDays.length > 0 ? totalRevenue / activeDays.length : 0;

                // Update cards
                const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                setEl('rev-total-month', formatPrice(totalRevenue));
                setEl('rev-avg-day',    formatPrice(avgDay));
                setEl('rev-active-days', activeDays.length + ' ngày');

                // Chart
                if (financialCharts.revenueReport) financialCharts.revenueReport.destroy();
                const ctx = document.getElementById('revenue-trend-chart');
                if (ctx) {
                    const sorted = Object.keys(dailyData).sort();
                    const labels  = sorted.map(k => String(parseInt(k.split('-')[2])).padStart(2,'0'));
                    const revData = sorted.map(k => dailyData[k].revenue);
                    financialCharts.revenueReport = new Chart(ctx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [{
                                label: 'Doanh thu',
                                data: revData,
                                backgroundColor: revData.map(v => v > 0 ? 'rgba(59,130,246,0.75)' : 'rgba(59,130,246,0.15)'),
                                borderColor: '#3b82f6',
                                borderWidth: 1.5,
                                borderRadius: 6,
                                hoverBackgroundColor: '#2563eb'
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: '#1e293b',
                                    callbacks: { label: ctx => ' ' + formatPrice(ctx.parsed.y) }
                                }
                            },
                            scales: {
                                x: { grid: { display: false } },
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => formatPrice(v) } }
                            }
                        }
                    });
                }

                // Table
                const tbody = document.getElementById('revenue-table');
                if (tbody) {
                    const sorted = activeDays.sort((a,b) => b.date.localeCompare(a.date));
                    if (sorted.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500"><div class="text-4xl mb-2">📊</div>Không có doanh thu trong tháng này</td></tr>`;
                    } else {
                        tbody.innerHTML = sorted.map(day => {
                            const ratio = avgDay > 0 ? day.revenue / avgDay : 0;
                            const pct   = (ratio * 100).toFixed(0);
                            const barColor = ratio >= 1 ? 'bg-blue-500' : 'bg-blue-300';
                            const badge    = ratio >= 1
                                ? `<span class="text-blue-700 font-bold">↑ ${pct}%</span>`
                                : `<span class="text-slate-500">${pct}%</span>`;
                            return `
                            <tr class="border-b hover:bg-blue-50 cursor-pointer transition-all" onclick="viewDailyDetail('${day.date}')">
                                <td class="px-6 py-4 font-semibold text-slate-700">${day.dateFormatted}</td>
                                <td class="px-6 py-4 font-extrabold text-blue-600">${formatPrice(day.revenue)}</td>
                                <td class="px-6 py-4 text-slate-600">${day.revCount} giao dịch</td>
                                <td class="px-6 py-4 text-center">
                                    <div class="flex items-center gap-2 justify-center">
                                        <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="${barColor} h-2 rounded-full" style="width:${Math.min(ratio*100,100)}%"></div>
                                        </div>
                                        ${badge}
                                    </div>
                                </td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch(e) {
                console.error('loadRevenueReport error:', e);
            }
        }

        function exportRevenueReport() {
            if (typeof exportFinancialReport === 'function') exportFinancialReport('excel');
            else alert('Chức năng xuất Excel đang được phát triển.');
        }

        // ============================================================
        // BÁO CÁO CHI PHÍ
        // ============================================================
        async function loadExpenseReport() {
            try {
                const dailyData = await fetchFinancialDailyData();
                if (!dailyData) return;

                const days = Object.values(dailyData);
                const totalExpense = days.reduce((s, d) => s + d.expense, 0);
                const activeDays   = days.filter(d => d.expense > 0);
                const avgDay       = activeDays.length > 0 ? totalExpense / activeDays.length : 0;

                const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                setEl('exp-total-month', formatPrice(totalExpense));
                setEl('exp-avg-day',     formatPrice(avgDay));
                setEl('exp-active-days', activeDays.length + ' ngày');

                // Chart
                if (financialCharts.expenseReport) financialCharts.expenseReport.destroy();
                const ctx = document.getElementById('expense-trend-report-chart');
                if (ctx) {
                    const sorted  = Object.keys(dailyData).sort();
                    const labels  = sorted.map(k => String(parseInt(k.split('-')[2])).padStart(2,'0'));
                    const expData = sorted.map(k => dailyData[k].expense);
                    financialCharts.expenseReport = new Chart(ctx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [{
                                label: 'Chi phí',
                                data: expData,
                                backgroundColor: expData.map(v => v > 0 ? 'rgba(239,68,68,0.75)' : 'rgba(239,68,68,0.12)'),
                                borderColor: '#ef4444',
                                borderWidth: 1.5,
                                borderRadius: 6,
                                hoverBackgroundColor: '#dc2626'
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: '#1e293b',
                                    callbacks: { label: ctx => ' ' + formatPrice(ctx.parsed.y) }
                                }
                            },
                            scales: {
                                x: { grid: { display: false } },
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => formatPrice(v) } }
                            }
                        }
                    });
                }

                // Table
                const tbody = document.getElementById('expense-report-table');
                if (tbody) {
                    const sorted = activeDays.sort((a,b) => b.date.localeCompare(a.date));
                    if (sorted.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500"><div class="text-4xl mb-2">💸</div>Không có chi phí trong tháng này</td></tr>`;
                    } else {
                        tbody.innerHTML = sorted.map(day => {
                            const ratio    = avgDay > 0 ? day.expense / avgDay : 0;
                            const pct      = (ratio * 100).toFixed(0);
                            const barColor = ratio >= 1 ? 'bg-red-500' : 'bg-red-300';
                            const badge    = ratio >= 1
                                ? `<span class="text-red-600 font-bold">↑ ${pct}%</span>`
                                : `<span class="text-slate-500">${pct}%</span>`;
                            return `
                            <tr class="border-b hover:bg-red-50 cursor-pointer transition-all" onclick="viewDailyDetail('${day.date}')">
                                <td class="px-6 py-4 font-semibold text-slate-700">${day.dateFormatted}</td>
                                <td class="px-6 py-4 font-extrabold text-red-600">${formatPrice(day.expense)}</td>
                                <td class="px-6 py-4 text-slate-600">${day.expCount} giao dịch</td>
                                <td class="px-6 py-4 text-center">
                                    <div class="flex items-center gap-2 justify-center">
                                        <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="${barColor} h-2 rounded-full" style="width:${Math.min(ratio*100,100)}%"></div>
                                        </div>
                                        ${badge}
                                    </div>
                                </td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch(e) {
                console.error('loadExpenseReport error:', e);
            }
        }

        function exportExpenseReport() {
            if (typeof exportFinancialReport === 'function') exportFinancialReport('excel');
            else alert('Chức năng xuất Excel đang được phát triển.');
        }

        // ============================================================
        // BÁO CÁO LỢI NHUẬN
        // ============================================================
        async function loadProfitReport() {
            try {
                const dailyData = await fetchFinancialDailyData();
                if (!dailyData) return;

                const days         = Object.values(dailyData);
                const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
                const totalExpense = days.reduce((s, d) => s + d.expense, 0);
                const totalProfit  = totalRevenue - totalExpense;

                const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                setEl('prf-total-month',  formatPrice(totalProfit));
                setEl('prf-revenue-ref',  formatPrice(totalRevenue));
                setEl('prf-expense-ref',  formatPrice(totalExpense));
                setEl('prf-formula-rev',  formatPrice(totalRevenue));
                setEl('prf-formula-exp',  formatPrice(totalExpense));
                setEl('prf-formula-prf',  formatPrice(totalProfit));

                // Profit card color & badge
                const mainCard = document.getElementById('profit-main-card');
                const badge    = document.getElementById('prf-status-badge');
                const prfEl    = document.getElementById('prf-formula-prf');
                if (totalProfit >= 0) {
                    if (mainCard) mainCard.className = 'bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-xl p-6 relative overflow-hidden text-white';
                    if (badge)    badge.textContent = '✔ Đang có lời';
                    if (prfEl)    prfEl.className   = 'text-2xl font-extrabold text-emerald-400';
                } else {
                    if (mainCard) mainCard.className = 'bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 relative overflow-hidden text-white';
                    if (badge)    badge.textContent = '✘ Đang bị lỗ';
                    if (prfEl)    prfEl.className   = 'text-2xl font-extrabold text-red-400';
                }

                // Chart – line chart showing profit per day
                if (financialCharts.profitReport) financialCharts.profitReport.destroy();
                const ctx = document.getElementById('profit-trend-chart');
                if (ctx) {
                    const sorted     = Object.keys(dailyData).sort();
                    const labels     = sorted.map(k => String(parseInt(k.split('-')[2])).padStart(2,'0'));
                    const profitData = sorted.map(k => dailyData[k].profit);
                    financialCharts.profitReport = new Chart(ctx.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [{
                                label: 'Lợi nhuận',
                                data: profitData,
                                borderColor: '#10b981',
                                backgroundColor: ctx2 => {
                                    const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 300);
                                    g.addColorStop(0, 'rgba(16,185,129,0.25)');
                                    g.addColorStop(1, 'rgba(16,185,129,0.01)');
                                    return g;
                                },
                                borderWidth: 3,
                                pointRadius: 4,
                                pointBackgroundColor: profitData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                tension: 0.35,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: '#1e293b',
                                    callbacks: {
                                        label: c => ' Lợi nhuận: ' + formatPrice(c.parsed.y),
                                        labelTextColor: c => c.parsed.y >= 0 ? '#34d399' : '#f87171'
                                    }
                                }
                            },
                            scales: {
                                x: { grid: { display: false } },
                                y: {
                                    grid: { color: '#f1f5f9' },
                                    ticks: { callback: v => formatPrice(v) }
                                }
                            }
                        }
                    });
                }

                // Table
                const tbody = document.getElementById('profit-table');
                if (tbody) {
                    const activeDays = days.filter(d => d.revenue > 0 || d.expense > 0)
                                          .sort((a,b) => b.date.localeCompare(a.date));
                    if (activeDays.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500"><div class="text-4xl mb-2">💰</div>Không có dữ liệu trong tháng này</td></tr>`;
                    } else {
                        tbody.innerHTML = activeDays.map(day => {
                            const profitCls = day.profit >= 0 ? 'text-emerald-600 font-extrabold' : 'text-red-600 font-extrabold';
                            const badge     = day.profit >= 0
                                ? `<span class="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">LỜI</span>`
                                : `<span class="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-black">LỖ</span>`;
                            return `
                            <tr class="border-b hover:bg-emerald-50 cursor-pointer transition-all hover:scale-[1.003]" onclick="viewDailyDetail('${day.date}')">
                                <td class="px-6 py-4 font-semibold text-slate-700">${day.dateFormatted}</td>
                                <td class="px-6 py-4 font-bold text-blue-600">${formatPrice(day.revenue)}</td>
                                <td class="px-6 py-4 font-bold text-red-500">${formatPrice(day.expense)}</td>
                                <td class="px-6 py-4 ${profitCls}">${formatPrice(day.profit)}</td>
                                <td class="px-6 py-4 text-center">${badge}</td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch(e) {
                console.error('loadProfitReport error:', e);
            }
        }

        function exportProfitReport() {
            if (typeof exportFinancialReport === 'function') exportFinancialReport('excel');
            else alert('Chức năng xuất Excel đang được phát triển.');
        }

        function updateFinancialSummary(summary) {
            document.getElementById('fin-total-revenue').textContent = formatPrice(summary.totalRevenue || 0);
            document.getElementById('fin-total-expense').textContent = formatPrice(summary.totalExpense || 0);
            
            const profit = summary.profit || 0;
            document.getElementById('fin-profit').textContent = formatPrice(profit);
            
            const trendEl = document.getElementById('fin-profit-trend');
            const cardEl = document.getElementById('fin-profit-card');
            const circleEl = document.getElementById('fin-profit-card-circle');
            
            if (trendEl) {
                if (profit >= 0) {
                    trendEl.innerHTML = `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold">✔ Đang có lời</span>`;
                } else {
                    trendEl.innerHTML = `<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold">✘ Đang bị lỗ</span>`;
                }
            }
            
            if (cardEl && circleEl) {
                if (profit >= 0) {
                    cardEl.className = "bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden border border-slate-100/50 hover:shadow-2xl transition duration-300";
                    circleEl.className = "absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full opacity-60";
                } else {
                    cardEl.className = "bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden border border-red-100 hover:shadow-2xl transition duration-300";
                    circleEl.className = "absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full opacity-60";
                }
            }
        }

        function updateFinancialCharts(dailyData) {
            if (financialCharts.trend) financialCharts.trend.destroy();
            
            const daysSorted = Object.keys(dailyData).sort();
            const labels = daysSorted.map(dateStr => {
                const day = parseInt(dateStr.split('-')[2]);
                return String(day).padStart(2, '0');
            });
            
            const revenueData = daysSorted.map(dateStr => dailyData[dateStr].revenue);
            const expenseData = daysSorted.map(dateStr => dailyData[dateStr].expense);
            
            const trendCtx = document.getElementById('financial-trend-chart').getContext('2d');
            financialCharts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Doanh thu (Thu)',
                            data: revenueData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.04)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            tension: 0.35,
                            fill: true
                        },
                        {
                            label: 'Chi phí (Chi)',
                            data: expenseData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.04)',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#ef4444',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            tension: 0.35,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                usePointStyle: true,
                                font: { weight: '600' }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleFont: { weight: 'bold' },
                            bodyFont: { weight: '500' },
                            callbacks: {
                                label: function(context) {
                                    return ' ' + context.dataset.label + ': ' + formatPrice(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f1f5f9' },
                            ticks: {
                                callback: function(value) {
                                    return formatPrice(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        function updateTransactionsTable(dailyData) {
            const tbody = document.getElementById('transactions-table');
            if (!tbody) return;
            
            // Filter days that have either revenue or expense and sort descending
            const activeDays = Object.values(dailyData)
                .filter(day => day.revenue > 0 || day.expense > 0)
                .sort((a, b) => b.date.localeCompare(a.date));
            
            if (activeDays.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-8 text-gray-500">
                            <div class="text-4xl mb-2">📊</div>
                            Không có dữ liệu trong tháng này
                        </td>
                    </tr>
`;
                return;
            }
            
            const html = activeDays.map(day => {
                const profitClass = day.profit >= 0 ? 'text-green-600 font-extrabold' : 'text-red-600 font-extrabold';
                const statusBadge = day.profit >= 0 
                    ? '<span class="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">LỜI</span>' 
                    : '<span class="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">LỖ</span>';
                
                return `
                    <tr class="border-b hover:bg-slate-50 cursor-pointer transition-all hover:scale-[1.005]" onclick="viewDailyDetail('${day.date}')">
                        <td class="px-6 py-4 font-semibold text-slate-700">${day.dateFormatted}</td>
                        <td class="px-6 py-4 font-bold text-blue-600">${formatPrice(day.revenue)}</td>
                        <td class="px-6 py-4 font-bold text-slate-600">${formatPrice(day.expense)}</td>
                        <td class="px-6 py-4 ${profitClass}">${formatPrice(day.profit)}</td>
                        <td class="px-6 py-4 text-center">${statusBadge}</td>
                    </tr>
`;
            }).join('');
            
            tbody.innerHTML = html;
        }

        function viewDailyDetail(dateStr) {
            // Find all transactions on this exact date
            const sameDayTxs = currentTransactions.filter(t => {
                const tDate = new Date(t.date);
                const offset = tDate.getTimezoneOffset() * 60000;
                const localDate = new Date(tDate.getTime() - offset);
                return localDate.toISOString().split('T')[0] === dateStr;
            });
            
            const [y, m, d] = dateStr.split('-');
            const dateFormatted = `${parseInt(d)}/${parseInt(m)}/${y}`;
            
            // Separate into revenues and expenses
            const revenues = sameDayTxs.filter(t => t.type === 'revenue');
            const expenses = sameDayTxs.filter(t => t.type === 'expense');
            
            // Compute daily sums
            const dailyRevenue = revenues.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const dailyExpense = expenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const dailyProfit = dailyRevenue - dailyExpense;
            
            // Render modal headers
            document.getElementById('fin-modal-date').textContent = `Ngày ${dateFormatted}`;
            document.getElementById('fin-modal-total-revenue').textContent = formatPrice(dailyRevenue);
            document.getElementById('fin-modal-total-expense').textContent = formatPrice(dailyExpense);
            document.getElementById('fin-modal-profit').textContent = formatPrice(dailyProfit);
            
            // Profit box styling
            const profitBox = document.getElementById('fin-modal-profit-box');
            const profitLabel = document.getElementById('fin-modal-profit-label');
            const profitVal = document.getElementById('fin-modal-profit');
            
            if (profitBox && profitLabel && profitVal) {
                if (dailyProfit >= 0) {
                    profitBox.className = 'bg-emerald-50 p-3 rounded-xl shadow-sm border border-emerald-100';
                    profitLabel.className = 'text-xs text-emerald-600 font-bold mb-1';
                    profitVal.className = 'text-lg font-bold text-emerald-600';
                    profitLabel.textContent = '🟢 LỢI NHUẬN RÒNG (LỜI)';
                } else {
                    profitBox.className = 'bg-rose-50 p-3 rounded-xl shadow-sm border border-rose-100';
                    profitLabel.className = 'text-xs text-rose-600 font-bold mb-1';
                    profitVal.className = 'text-lg font-bold text-rose-600';
                    profitLabel.textContent = '🔴 LỢI NHUẬN RÒNG (LỖ)';
                }
            }
            
            // Render Revenues List
            const revContainer = document.getElementById('fin-modal-revenues');
            if (revContainer) {
                if (revenues.length === 0) {
                    revContainer.innerHTML = `
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                            Không có khoản thu
                        </div>
`;
                } else {
                    revContainer.innerHTML = revenues.map(t => {
                        const tDate = new Date(t.date);
                        const offset = tDate.getTimezoneOffset() * 60000;
                        const localDate = new Date(tDate.getTime() - offset);
                        const time = localDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        return `
                            <div class="flex items-center justify-between p-3 bg-blue-50/50 hover:bg-blue-100/70 border border-blue-100 rounded-xl transition-all shadow-sm">
                                <div>
                                    <p class="font-bold text-slate-800 text-sm">${t.description}</p>
                                    <p class="text-[10px] text-slate-500">${time} - momo</p>
                                </div>
                                <span class="font-extrabold text-blue-600 text-sm">+${formatPrice(t.amount)}</span>
                            </div>
`;
                    }).join('');
                }
            }
            
            // Render Expenses List
            const expContainer = document.getElementById('fin-modal-expenses');
            if (expContainer) {
                if (expenses.length === 0) {
                    expContainer.innerHTML = `
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                            Không có khoản chi
                        </div>
`;
                } else {
                    expContainer.innerHTML = expenses.map(t => {
                        const tDate = new Date(t.date);
                        const offset = tDate.getTimezoneOffset() * 60000;
                        const localDate = new Date(tDate.getTime() - offset);
                        const time = localDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        return `
                            <div class="flex items-center justify-between p-3 bg-red-50/50 hover:bg-red-100/70 border border-red-100 rounded-xl transition-all shadow-sm">
                                <div>
                                    <p class="font-bold text-slate-800 text-sm">${t.description}</p>
                                    <p class="text-[10px] text-slate-500">${time} - Tiền mặt</p>
                                </div>
                                <span class="font-extrabold text-red-600 text-sm">-${formatPrice(t.amount)}</span>
                            </div>
`;
                    }).join('');
                }
            }
            
            // Show Modal
            const modal = document.getElementById('financial-transaction-detail-modal');
            if (modal) modal.classList.add('active');
        }

        function closeFinancialTransactionDetailModal() {
            const modal = document.getElementById('financial-transaction-detail-modal');
            if (modal) modal.classList.remove('active');
        }

        async function exportFinancialReport(format) {
            const month = document.getElementById('financial-month').value;
            const year = document.getElementById('financial-year').value;
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            
            try {
                const params = new URLSearchParams({ period: 'custom', startDate, endDate, format });
                const response = await fetch(`${API_URL}/admin/financial-report/export?${params}`, {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `BaoCaoTaiChinh_${month}_${year}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    alert('Lỗi khi xuất báo cáo');
                }
            } catch (error) {
                console.error('Export error:', error);
                alert('Có lỗi xảy ra khi xuất báo cáo');
            }
        }

        // ==========================================
        // ADMIN SESSION & FORM STATE PERSISTENCE SYSTEM
        // ==========================================
        
        // Mapped modal to form IDs to clear draft when modal closed
        const modalToFormMap = {
            'product-modal': 'product-form',
            'category-modal': 'category-form',
            'brand-modal': 'brand-form',
            'promotion-modal': 'promotion-form',
            'user-modal': 'user-form',
            'news-modal': 'news-form',
            'article-modal': 'article-form',
            'expense-type-modal': 'expense-type-form',
            'pos-quick-customer-modal': 'pos-quick-customer-form',
            'pos-modal': 'pos-form',
            'preorder-modal': 'preorder-form',
            'receiving-modal': 'receiving-form',
            'flash-sale-modal': 'flash-sale-form'
        };

        // Custom Show/Hide toast notification
        function showPersistenceToast(message, type = 'success') {
            let toastContainer = document.getElementById('persistence-toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'persistence-toast-container';
                toastContainer.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none';
                document.body.appendChild(toastContainer);
            }
            
            const toast = document.createElement('div');
            toast.className = `transform translate-y-5 opacity-0 transition-all duration-300 ease-out flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border-l-4 font-semibold text-sm bg-white text-slate-800 ${
                type === 'success' ? 'border-green-500 shadow-green-100' : 
                type === 'info' ? 'border-blue-500 shadow-blue-100' : 'border-amber-500 shadow-amber-100'
            } pointer-events-auto`;
            
            const icon = type === 'success' ? '💾' : type === 'info' ? '🔄' : '⚠️';
            toast.innerHTML = `
                <span class="text-lg">${icon}</span>
                <div>${message}</div>
            `;
            
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove('translate-y-5', 'opacity-0');
            }, 10);
            
            setTimeout(() => {
                toast.classList.add('translate-y-[-10px]', 'opacity-0');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 4000);
        }

        // Connection monitoring system
        function updateConnectionStatus() {
            let connBar = document.getElementById('connection-status-bar');
            if (!navigator.onLine) {
                console.warn('📶 [Admin Persistence] Mất kết nối internet!');
                if (!connBar) {
                    connBar = document.createElement('div');
                    connBar.id = 'connection-status-bar';
                    connBar.className = 'fixed top-0 left-0 right-0 z-[10000] bg-gradient-to-r from-red-600 to-orange-500 text-white text-center py-2.5 text-sm font-semibold shadow-md flex items-center justify-center gap-2 transform translate-y-[-100%] transition-transform duration-500 ease-out';
                    connBar.innerHTML = '⚠️ Mất kết nối mạng! Tiến trình nhập liệu của bạn đang được tự động lưu trữ an toàn cục bộ.';
                    document.body.appendChild(connBar);
                }
                setTimeout(() => {
                    connBar.classList.remove('translate-y-[-100%]');
                }, 50);
            } else {
                if (connBar) {
                    console.log('📶 [Admin Persistence] Đã có mạng trở lại!');
                    connBar.className = 'fixed top-0 left-0 right-0 z-[10000] bg-gradient-to-r from-green-600 to-emerald-500 text-white text-center py-2.5 text-sm font-semibold shadow-md flex items-center justify-center gap-2 transition-transform duration-500 ease-out';
                    connBar.innerHTML = '✅ Đã kết nối lại mạng! Bạn có thể tiếp tục thao tác bình thường.';
                    setTimeout(() => {
                        connBar.classList.add('translate-y-[-100%]');
                        setTimeout(() => {
                            connBar.remove();
                        }, 500);
                    }, 3000);
                }
            }
        }

        // Save form draft to localStorage
        function saveFormDraft(form) {
            if (!form || !form.id) return;
            
            const formData = {};
            const elements = form.querySelectorAll('input, textarea, select');
            let hasValue = false;
            
            elements.forEach(el => {
                if (el.type === 'file' || el.type === 'password' || el.disabled) return;
                if (!el.name && !el.id) return;
                
                const key = el.name || el.id;
                
                if (el.type === 'checkbox') {
                    formData[key] = { type: 'checkbox', value: el.checked };
                    if (el.checked) hasValue = true;
                } else if (el.type === 'radio') {
                    if (el.checked) {
                        formData[key] = { type: 'radio', value: el.value };
                        hasValue = true;
                    }
                } else {
                    formData[key] = { type: 'default', value: el.value };
                    if (el.value.trim() !== '') hasValue = true;
                }
            });
            
            if (hasValue) {
                localStorage.setItem(`form_draft_${form.id}`, JSON.stringify(formData));
            } else {
                localStorage.removeItem(`form_draft_${form.id}`);
            }
        }

        // Restore single form draft
        function restoreFormDraft(formId) {
            const form = document.getElementById(formId);
            if (!form) return false;
            
            const savedDataStr = localStorage.getItem(`form_draft_${formId}`);
            if (!savedDataStr) return false;
            
            try {
                const formData = JSON.parse(savedDataStr);
                const elements = form.querySelectorAll('input, textarea, select');
                let restoredCount = 0;
                
                elements.forEach(el => {
                    if (el.type === 'file' || el.type === 'password') return;
                    
                    const key = el.name || el.id;
                    if (!key || !formData[key]) return;
                    
                    const data = formData[key];
                    if (data.type === 'checkbox') {
                        if (el.checked !== data.value) {
                            el.checked = data.value;
                            restoredCount++;
                        }
                    } else if (data.type === 'radio') {
                        if (el.value === data.value) {
                            if (!el.checked) {
                                el.checked = true;
                                restoredCount++;
                            }
                        }
                    } else {
                        if (el.value !== data.value) {
                            el.value = data.value;
                            restoredCount++;
                        }
                    }
                    
                    // Trigger events for UI reactive updates (such as calculating profit)
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
                
                return restoredCount > 0;
            } catch (e) {
                console.error(`❌ [Admin Persistence] Lỗi khôi phục form ${formId}:`, e);
                return false;
            }
        }

        // Restore all form drafts
        function restoreAllFormDrafts() {
            let totalRestored = 0;
            Object.values(modalToFormMap).forEach(formId => {
                if (restoreFormDraft(formId)) {
                    totalRestored++;
                }
            });
            
            if (totalRestored > 0) {
                showPersistenceToast(`Đã tự động khôi phục dữ liệu nháp của ${totalRestored} biểu mẫu!`, 'success');
            }
        }

        // Clear form draft
        function clearFormDraft(formId) {
            localStorage.removeItem(`form_draft_${formId}`);
            console.log(`🧹 [Admin Persistence] Đã xóa dữ liệu nháp của form: ${formId}`);
        }

        // Clear all session states
        function clearAllPersistenceData() {
            localStorage.removeItem('admin_active_section');
            localStorage.removeItem('admin_open_modals');
            
            // Remove all form drafts
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('form_draft_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log('🧹 [Admin Persistence] Đã dọn dẹp sạch sẽ dữ liệu phiên làm việc cũ.');
        }

        // Init modal mutation observer
        function initModalObserver() {
            const modalIds = Object.keys(modalToFormMap).concat(['receiving-detail-modal', 'invoice-modal', 'financial-transaction-detail-modal', 'contact-modal']);
            
            const observer = new MutationObserver((mutations) => {
                let openModals = [];
                modalIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.classList.contains('active')) {
                        openModals.push(id);
                    }
                });
                
                const oldOpenModals = JSON.parse(localStorage.getItem('admin_open_modals') || '[]');
                localStorage.setItem('admin_open_modals', JSON.stringify(openModals));
                
                // If a modal was closed, clear its form draft
                oldOpenModals.forEach(id => {
                    if (!openModals.includes(id) && modalToFormMap[id]) {
                        clearFormDraft(modalToFormMap[id]);
                    }
                });

                // If a modal was opened, save its form draft immediately
                openModals.forEach(id => {
                    if (!oldOpenModals.includes(id) && modalToFormMap[id]) {
                        const form = document.getElementById(modalToFormMap[id]);
                        if (form) {
                            setTimeout(() => {
                                saveFormDraft(form);
                            }, 100);
                        }
                    }
                });
            });
            
            modalIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
                }
            });
        }

        // Hook page changes to save active section
        const previousShowSection = showSection;
        showSection = function(section) {
            previousShowSection(section);
            localStorage.setItem('admin_active_section', section);
            console.log('💾 [Admin Persistence] Đã lưu phân hệ hiện tại:', section);
        };

        // Event delegation for form inputs
        document.addEventListener('input', (event) => {
            const form = event.target.closest('form');
            if (form && form.id) {
                saveFormDraft(form);
            }
        });

        document.addEventListener('change', (event) => {
            const form = event.target.closest('form');
            if (form && form.id) {
                saveFormDraft(form);
            }
        });

        // Global submit hook to clear form draft
        document.addEventListener('submit', (event) => {
            const form = event.target.closest('form');
            if (form && form.id) {
                clearFormDraft(form.id);
            }
        });

        // Main recovery entry point
        function restoreAdminSessionState() {
            console.log('🔄 [Admin Persistence] Đang khôi phục phiên làm việc...');
            
            // 1. Restore active section
            const savedSection = localStorage.getItem('admin_active_section') || 'dashboard';
            console.log('🔄 [Admin Persistence] Đang khôi phục trang:', savedSection);
            showSection(savedSection);
            
            // 2. Restore open modals
            const openModals = JSON.parse(localStorage.getItem('admin_open_modals') || '[]');
            if (openModals.length > 0) {
                console.log('🔄 [Admin Persistence] Đang mở lại các modal:', openModals);
                openModals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.add('active');
                    }
                });
            }
            
            // 3. Restore form input drafts
            restoreAllFormDrafts();
            
            // 4. Initialize mutation observers for FUTURE changes
            initModalObserver();
            
            // 5. Initialize connection status checker and listeners
            updateConnectionStatus();
            
            showPersistenceToast('Đã phục hồi phiên làm việc trước đó!', 'info');
        }

        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
        
        // Initial online status check on load
        window.addEventListener('DOMContentLoaded', () => {
            updateConnectionStatus();
        });

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
                const result = await apiCall(`/admin/suppliers/list?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
                
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

                        return `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">NCC${String(s.ma_nha_cung_cap).padStart(4, '0')}</td>
                                <td class="px-6 py-4 border-b font-black text-slate-800 whitespace-nowrap">${s.ten_nha_cung_cap}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">👤 ${contact}</td>
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-600 whitespace-nowrap">${sdt}</td>
                                <td class="px-6 py-4 border-b font-mono text-slate-500 whitespace-nowrap">${email}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap" title="${address}">${truncatedAddress}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">${statusBadge}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1.5">
                                        <button onclick="openSupplierDetail(${s.ma_nha_cung_cap})" class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">👁️ Chi tiết</button>
                                        <button onclick="openSupplierModal(${s.ma_nha_cung_cap})" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm font-sans">✏️ Sửa</button>
                                        <button onclick="deleteSupplier(${s.ma_nha_cung_cap})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa đối tác">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `;
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
                    const result = await apiCall(`/admin/suppliers/${id}`);
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
                const url = id ? `/admin/suppliers/${id}` : '/admin/suppliers';
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
                const result = await apiCall(`/admin/suppliers/${id}`, 'DELETE');
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
                const result = await apiCall(`/admin/suppliers/${id}`);
                if (result.success && result.data) {
                    const s = result.data.supplier;
                    const receivings = result.data.recent_receivings || [];

                    document.getElementById('detail-supplier-name').textContent = s.ten_nha_cung_cap;
                    document.getElementById('detail-supplier-id').textContent = `Mã đối tác: NCC${String(s.ma_nha_cung_cap).padStart(4, '0')}`;
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
                            const rCode = `PNH${String(r.ma_phieu_nhap).padStart(4, '0')}`;

                            return `
                                <tr class="hover:bg-slate-50/50">
                                    <td class="px-5 py-3 font-mono font-bold text-slate-700">${rCode}</td>
                                    <td class="px-5 py-3 text-slate-600">${rDate}</td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-800">${r.tong_so_luong} Sp</td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-800">${formatPrice(r.tong_gia_tri)}</td>
                                    <td class="px-5 py-3 text-center">${rStatus}</td>
                                </tr>
                            `;
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
                const result = await apiCall(`/admin/components/list?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}&supplier=${encodeURIComponent(supplier)}`);
                
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
                            qtyBadge = `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">🟡 Cháy hàng (${s.so_luong_ton})</span>`;
                        } else {
                            qtyBadge = `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">🟢 Còn (${s.so_luong_ton})</span>`;
                        }

                        const ncc = s.ten_nha_cung_cap || 'Chưa cập nhật';
                        const location = s.vi_tri_kho || 'N/A';
                        const code = `LK${String(s.ma_linh_kien).padStart(4, '0')}`;

                        return `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                <td class="px-6 py-4 border-b font-mono font-bold text-slate-800 whitespace-nowrap">${code}</td>
                                <td class="px-6 py-4 border-b font-black text-slate-800 whitespace-nowrap">${s.ten_linh_kien}</td>
                                <td class="px-6 py-4 border-b whitespace-nowrap">${catBadge}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-700 whitespace-nowrap">${s.tuong_thich}</td>
                                <td class="px-6 py-4 border-b text-slate-600 whitespace-nowrap">🏭 ${ncc}</td>
                                <td class="px-6 py-4 border-b text-right font-mono font-bold text-slate-700 whitespace-nowrap">${formatPrice(s.gia_nhap)}</td>
                                <td class="px-6 py-4 border-b text-right font-mono font-black text-green-600 whitespace-nowrap">${formatPrice(s.gia_ban)}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">${qtyBadge}</td>
                                <td class="px-6 py-4 border-b font-semibold text-slate-500 whitespace-nowrap">📍 ${location}</td>
                                <td class="px-6 py-4 border-b text-center whitespace-nowrap">
                                    <div class="flex items-center justify-center gap-1.5">
                                        <button onclick="openComponentModal(${s.ma_linh_kien})" class="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg font-bold text-xs transition-all shadow-sm">✏️ Sửa</button>
                                        <button onclick="deleteComponent(${s.ma_linh_kien})" class="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa linh kiện">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `;
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
                        opt.textContent = `🏭 ${s.ten_nha_cung_cap}`;
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
                    const result = await apiCall(`/admin/components/${id}`);
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
                const url = id ? `/admin/components/${id}` : '/admin/components';
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
                const result = await apiCall(`/admin/components/${id}`, 'DELETE');
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


/* ==========================================================================
   HUMAN RESOURCE MANAGEMENT FUNCTIONS (CHỨC NĂNG QUẢN LÝ NHÂN SỰ)
   ========================================================================== */

// --- GLOBAL VARIABLES ---
window.employeesList = [];
window.shiftsList = [];

// --- EMPLOYEES MANAGEMENT ---
async function loadEmployees() {
    try {
        const result = await apiCall('/admin/employees');
        if (result.success && result.data) {
            window.employeesList = result.data;
            renderEmployeesTable(window.employeesList);
            updateEmployeeStats(window.employeesList);
        } else {
            showNotification(result.message || 'Lỗi tải danh sách nhân viên', 'error');
        }
    } catch (e) {
        console.error('loadEmployees error:', e);
        showNotification('Lỗi kết nối khi tải danh sách nhân viên', 'error');
    }
}

function updateEmployeeStats(list) {
    const total = list.length;
    const active = list.filter(e => e.trang_thai === 1).length;
    const inactive = list.filter(e => e.trang_thai === 0).length;
    const totalSalary = list.filter(e => e.trang_thai === 1).reduce((sum, e) => sum + parseFloat(e.luong_co_ban || 0), 0);

    document.getElementById('emp-card-total').textContent = total;
    document.getElementById('emp-card-active').textContent = active;
    document.getElementById('emp-card-inactive').textContent = inactive;
    document.getElementById('emp-card-salary').textContent = formatPrice(totalSalary);
}

function renderEmployeesTable(list) {
    const tbody = document.getElementById('employees-table');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500">Chưa có nhân viên nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(e => {
        const statusBadge = e.trang_thai === 1 
            ? '<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">Đang làm việc</span>' 
            : '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">Đã nghỉ việc</span>';
        
        return `
            <tr class="border-b hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 font-semibold text-gray-700">NV#${e.ma_nhan_vien}</td>
                <td class="px-4 py-3">
                    <div class="font-semibold text-gray-900">${e.ho_ten}</div>
                    ${e.so_cccd ? `<div class="text-xs text-slate-500 mt-0.5"><span class="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 border border-slate-200">CCCD</span> <span class="font-mono text-slate-600">${e.so_cccd}</span></div>` : ''}
                </td>
                <td class="px-4 py-3 text-gray-600">${e.so_dien_thoai || 'N/A'}</td>
                <td class="px-4 py-3 text-gray-600">${e.chuc_vu}</td>
                <td class="px-4 py-3 text-gray-500">${formatDate(e.ngay_vao_lam)}</td>
                <td class="px-4 py-3 font-semibold text-indigo-600">${formatPrice(e.luong_co_ban)}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="openEmployeeModal(${e.ma_nhan_vien})" class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-colors" title="Chỉnh sửa thông tin">✏️ Sửa</button>
                        <button onclick="window.open('permissions.html?id=${e.ma_nhan_vien}', '_blank')" class="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-semibold transition-colors" title="Quản lý phân quyền">🔐 Phân quyền</button>
                        <button onclick="deleteEmployee(${e.ma_nhan_vien})" class="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold transition-colors" title="Xóa nhân viên">🗑️ Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEmployees() {
    const query = document.getElementById('emp-search').value.toLowerCase().trim();
    const role = document.getElementById('emp-role-filter').value;
    
    let filtered = window.employeesList;
    
    if (query) {
        filtered = filtered.filter(e => 
            e.ho_ten.toLowerCase().includes(query) || 
            (e.so_dien_thoai && e.so_dien_thoai.includes(query)) ||
            (e.email && e.email.toLowerCase().includes(query)) ||
            (e.so_cccd && e.so_cccd.includes(query))
        );
    }
    
    if (role !== 'all') {
        filtered = filtered.filter(e => e.chuc_vu === role);
    }
    
    renderEmployeesTable(filtered);
}

async function openEmployeeModal(id = null) {
    const modal = document.getElementById('employee-modal');
    const title = document.getElementById('employee-modal-title');
    const form = document.getElementById('employee-form');
    
    form.reset();
    document.getElementById('employee-id').value = '';
    document.getElementById('employee-cccd').value = '';
    
    if (id) {
        title.textContent = '✏️ Chỉnh sửa nhân viên';
        try {
            const result = await apiCall(`/admin/employees/${id}`);
            if (result.success && result.data) {
                const e = result.data;
                document.getElementById('employee-id').value = e.ma_nhan_vien;
                document.getElementById('employee-name').value = e.ho_ten;
                document.getElementById('employee-role').value = e.chuc_vu;
                document.getElementById('employee-phone').value = e.so_dien_thoai || '';
                document.getElementById('employee-email').value = e.email || '';
                document.getElementById('employee-salary').value = Math.round(e.luong_co_ban);
                document.getElementById('employee-start-date').value = e.ngay_vao_lam ? e.ngay_vao_lam.split('T')[0] : '';
                document.getElementById('employee-status').value = e.trang_thai;
                document.getElementById('employee-cccd').value = e.so_cccd || '';
                document.getElementById('employee-notes').value = e.ghi_chu || '';
            } else {
                showNotification('Không tìm thấy nhân viên', 'error');
                return;
            }
        } catch (e) {
            console.error('Fetch employee error:', e);
            showNotification('Lỗi khi tải thông tin nhân viên', 'error');
            return;
        }
    } else {
        title.textContent = '👨‍💼 Thêm nhân viên mới';
        document.getElementById('employee-start-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('employee-status').value = '1';
    }
    
    modal.classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employee-modal').classList.remove('active');
}

async function saveEmployee(event) {
    event.preventDefault();
    const id = document.getElementById('employee-id').value;
    
    const payload = {
        ho_ten: document.getElementById('employee-name').value.trim(),
        chuc_vu: document.getElementById('employee-role').value,
        so_dien_thoai: document.getElementById('employee-phone').value.trim() || null,
        email: document.getElementById('employee-email').value.trim() || null,
        luong_co_ban: parseFloat(document.getElementById('employee-salary').value || 0),
        ngay_vao_lam: document.getElementById('employee-start-date').value,
        trang_thai: parseInt(document.getElementById('employee-status').value),
        so_cccd: document.getElementById('employee-cccd').value.trim() || null,
        ghi_chu: document.getElementById('employee-notes').value.trim() || null
    };

    if (!payload.ho_ten || !payload.chuc_vu || isNaN(payload.luong_co_ban) || !payload.ngay_vao_lam || !payload.so_cccd) {
        showNotification('Vui lòng nhập đầy đủ các trường bắt buộc (*)', 'error');
        return;
    }

    if (payload.so_cccd.length !== 12 || isNaN(payload.so_cccd)) {
        showNotification('Số CCCD phải đúng 12 chữ số hợp lệ!', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/admin/employees/${id}` : '/admin/employees';
        const result = await apiCall(url, method, payload);

        if (result.success) {
            showNotification(id ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên thành công!', 'success');
            closeEmployeeModal();
            loadEmployees();
        } else {
            showNotification(result.message || 'Lỗi khi lưu thông tin nhân viên', 'error');
        }
    } catch (e) {
        console.error('Save employee error:', e);
        showNotification('Lỗi hệ thống khi lưu thông tin nhân viên', 'error');
    }
}

async function deleteEmployee(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này? Việc này sẽ xóa toàn bộ lịch sử chấm công và bảng lương đi kèm.')) return;
    try {
        const result = await apiCall(`/admin/employees/${id}`, 'DELETE');
        if (result.success) {
            showNotification('Xóa nhân viên thành công!', 'success');
            loadEmployees();
        } else {
            showNotification(result.message || 'Lỗi khi xóa nhân viên', 'error');
        }
    } catch (e) {
        console.error('Delete employee error:', e);
        showNotification('Lỗi kết nối khi xóa nhân viên', 'error');
    }
}

// --- SHIFTS MANAGEMENT ---
async function loadShifts() {
    try {
        const result = await apiCall('/admin/shifts');
        if (result.success && result.data) {
            window.shiftsList = result.data;
            renderShiftsTable(window.shiftsList);
            updateShiftStats(window.shiftsList);
            // Tự động tải lịch phân ca trực hàng ngày
            loadDailySchedule();
        } else {
            showNotification(result.message || 'Lỗi tải danh sách ca làm việc', 'error');
        }
    } catch (e) {
        console.error('loadShifts error:', e);
        showNotification('Lỗi kết nối khi tải danh sách ca làm', 'error');
    }
}

function updateShiftStats(list) {
    const total = list.length;
    const premium = list.filter(s => parseFloat(s.he_so_luong) > 1).length;
    document.getElementById('shift-card-total').textContent = total;
    document.getElementById('shift-card-premium').textContent = premium;
}

function renderShiftsTable(list) {
    const tbody = document.getElementById('shifts-table');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Chưa có ca làm việc nào</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(s => {
        return `
            <tr class="border-b hover:bg-slate-50 transition-colors text-sm">
                <td class="px-4 py-3 font-semibold text-gray-700">CA#${s.ma_ca}</td>
                <td class="px-4 py-3 font-bold text-gray-900">${s.ten_ca}</td>
                <td class="px-4 py-3 text-emerald-600 font-medium">${s.gio_bat_dau}</td>
                <td class="px-4 py-3 text-red-600 font-medium">${s.gio_ket_thuc}</td>
                <td class="px-4 py-3 text-center font-bold text-indigo-600">${parseFloat(s.he_so_luong).toFixed(2)}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">${s.ghi_chu || ''}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="openShiftModal(${s.ma_ca})" class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-semibold transition-colors">Sửa</button>
                        <button onclick="deleteShift(${s.ma_ca})" class="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold transition-colors">Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openShiftModal(id = null) {
    const modal = document.getElementById('shift-modal');
    const title = document.getElementById('shift-modal-title');
    const form = document.getElementById('shift-form');
    
    form.reset();
    document.getElementById('shift-id').value = '';
    
    if (id) {
        title.textContent = '✏️ Chỉnh sửa ca làm việc';
        try {
            const result = await apiCall('/admin/shifts');
            if (result.success && result.data) {
                const s = result.data.find(x => x.ma_ca === id);
                if (s) {
                    document.getElementById('shift-id').value = s.ma_ca;
                    document.getElementById('shift-name').value = s.ten_ca;
                    document.getElementById('shift-start').value = s.gio_bat_dau;
                    document.getElementById('shift-end').value = s.gio_ket_thuc;
                    document.getElementById('shift-coefficient').value = s.he_so_luong;
                    document.getElementById('shift-notes').value = s.ghi_chu || '';
                }
            }
        } catch (e) {
            console.error('Fetch shift error:', e);
            showNotification('Lỗi khi tải thông tin ca', 'error');
            return;
        }
    } else {
        title.textContent = '⏰ Thêm ca làm việc mới';
        document.getElementById('shift-coefficient').value = '1.00';
    }
    
    modal.classList.add('active');
}

function closeShiftModal() {
    document.getElementById('shift-modal').classList.remove('active');
}

async function saveShift(event) {
    event.preventDefault();
    const id = document.getElementById('shift-id').value;
    
    const payload = {
        ten_ca: document.getElementById('shift-name').value.trim(),
        gio_bat_dau: document.getElementById('shift-start').value,
        gio_ket_thuc: document.getElementById('shift-end').value,
        he_so_luong: parseFloat(document.getElementById('shift-coefficient').value || 1.00),
        ghi_chu: document.getElementById('shift-notes').value.trim() || null
    };

    if (!payload.ten_ca || !payload.gio_bat_dau || !payload.gio_ket_thuc || isNaN(payload.he_so_luong)) {
        showNotification('Vui lòng nhập đầy đủ các trường bắt buộc (*)', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/admin/shifts/${id}` : '/admin/shifts';
        const result = await apiCall(url, method, payload);

        if (result.success) {
            showNotification(id ? 'Cập nhật ca làm thành công!' : 'Thêm ca làm thành công!', 'success');
            closeShiftModal();
            loadShifts();
        } else {
            showNotification(result.message || 'Lỗi khi lưu thông tin ca làm', 'error');
        }
    } catch (e) {
        console.error('Save shift error:', e);
        showNotification('Lỗi hệ thống khi lưu thông tin ca làm', 'error');
    }
}

async function deleteShift(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa ca làm việc này? Lịch sử chấm công liên quan có thể bị ảnh hưởng.')) return;
    try {
        const result = await apiCall(`/admin/shifts/${id}`, 'DELETE');
        if (result.success) {
            showNotification('Xóa ca làm thành công!', 'success');
            loadShifts();
        } else {
            showNotification(result.message || 'Lỗi khi xóa ca làm', 'error');
        }
    } catch (e) {
        console.error('Delete shift error:', e);
        showNotification('Lỗi kết nối khi xóa ca làm', 'error');
    }
}

// --- DAILY SHIFT SCHEDULING (PHÂN CA TRỰC) ---
async function loadDailySchedule() {
    const dateInput = document.getElementById('schedule-date-filter');
    if (!dateInput) return;
    
    // Default to today if no date is set
    if (!dateInput.value) {
        dateInput.value = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
    }
    
    const selectedDate = dateInput.value;
    
    try {
        // Lấy lịch trực và chấm công cho ngày được chọn
        const result = await apiCall(`/admin/attendance?date=${selectedDate}`);
        const tbody = document.getElementById('schedule-table');
        if (!tbody) return;
        
        if (!result.success || !result.data) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Lỗi khi tải lịch trực</td></tr>`;
            return;
        }
        
        const scheduleList = result.data;
        if (scheduleList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Chưa có nhân sự nào được phân ca trực cho ngày này. Hãy bấm "Phân ca ngày" để bắt đầu!</td></tr>`;
            return;
        }
        
        tbody.innerHTML = scheduleList.map(s => {
            // Xác định trạng thái ca:
            // - Đã chấm công (có giờ vào và giờ ra)
            // - Đang làm việc (chỉ có giờ vào)
            // - Chờ làm việc (chưa có giờ vào)
            let statusBadge = '';
            if (s.gio_vao && s.gio_ra) {
                statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 rounded-full border border-green-200">✅ Đã chấm công</span>`;
            } else if (s.gio_vao) {
                statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200 animate-pulse">⏰ Đang làm việc</span>`;
            } else {
                statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-slate-50 text-slate-600 rounded-full border border-slate-200">💤 Chờ làm việc</span>`;
            }
            
            return `
                <tr class="border-b hover:bg-slate-50 transition-colors text-sm">
                    <td class="px-4 py-3 font-bold text-gray-900">${s.ho_ten} <span class="text-xs text-gray-400 block font-normal">${s.chuc_vu || ''}</span></td>
                    <td class="px-4 py-3 font-semibold text-purple-700">${s.ten_ca}</td>
                    <td class="px-4 py-3 text-slate-600 font-medium text-xs">${s.ca_vao ? s.ca_vao.slice(0, 5) : '00:00'} - ${s.ca_ra ? s.ca_ra.slice(0, 5) : '00:00'}</td>
                    <td class="px-4 py-3 text-center font-bold text-indigo-600">${s.he_so_luong ? parseFloat(s.he_so_luong).toFixed(2) : '1.00'}</td>
                    <td class="px-4 py-3 text-center">${statusBadge}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">${s.ghi_chu || ''}</td>
                    <td class="px-4 py-3 text-center">
                        <button onclick="deleteSchedule(${s.ma_cham_cong})" class="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center mx-auto transition-colors shadow-sm" title="Hủy lịch trực">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (e) {
        console.error('loadDailySchedule error:', e);
        const tbody = document.getElementById('schedule-table');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">Lỗi kết nối khi tải lịch trực</td></tr>`;
        }
    }
}

function changeScheduleDate(days) {
    const dateInput = document.getElementById('schedule-date-filter');
    if (!dateInput) return;
    
    if (!dateInput.value) {
        dateInput.value = new Date().toLocaleDateString('sv-SE');
    }
    
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() + days);
    dateInput.value = d.toLocaleDateString('sv-SE');
    loadDailySchedule();
}

async function openScheduleModal() {
    const dateInput = document.getElementById('schedule-date-filter');
    if (!dateInput) return;
    
    const selectedDate = dateInput.value || new Date().toLocaleDateString('sv-SE');
    
    // Format ngày hiển thị định dạng đẹp (DD/MM/YYYY)
    const [y, m, d] = selectedDate.split('-');
    document.getElementById('schedule-modal-date-label').textContent = `${d}/${m}/${y}`;
    
    const staffSelect = document.getElementById('schedule-staff-select');
    const shiftSelect = document.getElementById('schedule-shift-select');
    
    staffSelect.innerHTML = '<option value="">-- Đang tải nhân sự --</option>';
    shiftSelect.innerHTML = '<option value="">-- Đang tải ca làm --</option>';
    
    document.getElementById('schedule-notes').value = '';
    
    // Tải danh sách nhân viên hoạt động
    try {
        const empResult = await apiCall('/admin/employees');
        if (empResult.success && empResult.data) {
            window.employeesList = empResult.data;
            const activeStaff = window.employeesList.filter(e => e.trang_thai === 1);
            staffSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' + 
                activeStaff.map(e => `<option value="${e.ma_nhan_vien}">${e.ho_ten} (${e.chuc_vu || 'Nhân viên'})</option>`).join('');
        } else {
            staffSelect.innerHTML = '<option value="">-- Lỗi tải nhân sự --</option>';
        }
    } catch (e) {
        console.error('Schedule staff load error:', e);
        staffSelect.innerHTML = '<option value="">-- Lỗi tải nhân sự --</option>';
    }
    
    // Tải danh sách ca làm
    try {
        const shiftResult = await apiCall('/admin/shifts');
        if (shiftResult.success && shiftResult.data) {
            window.shiftsList = shiftResult.data;
            shiftSelect.innerHTML = '<option value="">-- Chọn ca làm --</option>' + 
                window.shiftsList.map(s => `<option value="${s.ma_ca}">${s.ten_ca} (${s.gio_bat_dau.slice(0, 5)} - ${s.gio_ket_thuc.slice(0, 5)})</option>`).join('');
        } else {
            shiftSelect.innerHTML = '<option value="">-- Lỗi tải ca làm --</option>';
        }
    } catch (e) {
        console.error('Schedule shift load error:', e);
        shiftSelect.innerHTML = '<option value="">-- Lỗi tải ca làm --</option>';
    }
    
    document.getElementById('schedule-modal').classList.add('active');
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.remove('active');
}

async function saveSchedule(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('schedule-staff-select').value;
    const shiftId = document.getElementById('schedule-shift-select').value;
    const dateFilter = document.getElementById('schedule-date-filter');
    const notes = document.getElementById('schedule-notes').value.trim();
    
    if (!staffId || !shiftId || !dateFilter || !dateFilter.value) {
        showNotification('Vui lòng chọn đầy đủ nhân viên và ca làm việc!', 'error');
        return;
    }
    
    const payload = {
        ma_nhan_vien: parseInt(staffId),
        ngay: dateFilter.value,
        ma_ca: parseInt(shiftId),
        gio_vao: null,
        gio_ra: null,
        trang_thai: 'dung_gio',
        ghi_chu: notes || 'Phân ca trực hàng ngày'
    };
    
    try {
        const result = await apiCall('/admin/attendance', 'POST', payload);
        if (result.success) {
            showNotification('Phân công ca trực thành công!', 'success');
            closeScheduleModal();
            loadDailySchedule();
        } else {
            showNotification(result.message || 'Lỗi khi phân ca trực', 'error');
        }
    } catch (e) {
        console.error('Save schedule error:', e);
        showNotification('Lỗi hệ thống khi phân ca trực', 'error');
    }
}

async function deleteSchedule(id) {
    if (!confirm('Bạn có chắc chắn muốn hủy ca trực này?')) return;
    try {
        const result = await apiCall(`/admin/attendance/${id}`, 'DELETE');
        if (result.success) {
            showNotification('Đã hủy lịch trực thành công!', 'success');
            loadDailySchedule();
        } else {
            showNotification(result.message || 'Lỗi khi hủy lịch trực', 'error');
        }
    } catch (e) {
        console.error('Delete schedule error:', e);
        showNotification('Lỗi kết nối khi hủy lịch trực', 'error');
    }
}

// --- ATTENDANCE MANAGEMENT ---
async function fetchEmployeesForSelect() {
    try {
        const result = await apiCall('/admin/employees');
        if (result.success && result.data) {
            const list = result.data.filter(e => e.trang_thai === 1);
            
            // Populate attendance filters
            const filterSelect = document.getElementById('att-employee-filter');
            if (filterSelect) {
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = '<option value="">Tất cả nhân viên</option>' + 
                    list.map(e => `<option value="${e.ma_nhan_vien}">${e.ho_ten} (${e.chuc_vu})</option>`).join('');
                if (currentVal) filterSelect.value = currentVal;
            }
            
            // Populate modal attendance employee select
            const modalSelect = document.getElementById('attendance-employee');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' +
                    list.map(e => `<option value="${e.ma_nhan_vien}">${e.ho_ten}</option>`).join('');
            }
        }
    } catch (e) {
        console.error('fetchEmployeesForSelect error:', e);
    }
}

async function fetchShiftsForSelect() {
    try {
        const result = await apiCall('/admin/shifts');
        if (result.success && result.data) {
            const list = result.data;
            const modalSelect = document.getElementById('attendance-shift');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">-- Chọn ca làm việc --</option>' +
                    list.map(s => `<option value="${s.ma_ca}">${s.ten_ca} (${s.gio_bat_dau} - ${s.gio_ket_thuc})</option>`).join('');
            }
        }
    } catch (e) {
        console.error('fetchShiftsForSelect error:', e);
    }
}

async function loadAttendance() {
    await fetchEmployeesForSelect();
    await fetchShiftsForSelect();

    const dateFilter = document.getElementById('att-date-filter').value;
    const empFilter = document.getElementById('att-employee-filter').value;
    
    if (!dateFilter) return;

    try {
        const endpoint = `/admin/attendance?date=${dateFilter}${empFilter ? '&employeeId=' + empFilter : ''}`;
        const result = await apiCall(endpoint);
        
        if (result.success && result.data) {
            renderAttendanceTable(result.data);
            updateAttendanceStats(result.data);
        } else {
            showNotification(result.message || 'Lỗi tải danh sách chấm công', 'error');
        }
    } catch (e) {
        console.error('loadAttendance error:', e);
        showNotification('Lỗi kết nối khi tải danh sách chấm công', 'error');
    }
}

function updateAttendanceStats(list) {
    const ontime = list.filter(a => a.trang_thai === 'dung_gio').length;
    const late = list.filter(a => a.trang_thai === 'di_muon' || a.trang_thai === 've_som').length;
    const excused = list.filter(a => a.trang_thai === 'nghi_co_phep').length;
    const unexcused = list.filter(a => a.trang_thai === 'nghi_khong_phep').length;

    document.getElementById('att-card-ontime').textContent = ontime;
    document.getElementById('att-card-late').textContent = late;
    document.getElementById('att-card-excused').textContent = excused;
    document.getElementById('att-card-unexcused').textContent = unexcused;
}

function renderAttendanceTable(list) {
    const tbody = document.getElementById('attendance-table');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500">Chưa có dữ liệu chấm công ngày này</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(a => {
        let statusBadge = '';
        switch(a.trang_thai) {
            case 'dung_gio':
                statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300">Đúng giờ</span>';
                break;
            case 'di_muon':
                statusBadge = '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-300">Đi muộn</span>';
                break;
            case 've_som':
                statusBadge = '<span class="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-300">Về sớm</span>';
                break;
            case 'nghi_co_phep':
                statusBadge = '<span class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-300">Nghỉ có phép</span>';
                break;
            case 'nghi_khong_phep':
                statusBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-300">Nghỉ không phép</span>';
                break;
            default:
                statusBadge = `<span class="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">${a.trang_thai}</span>`;
        }

        return `
            <tr class="border-b hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 text-gray-600 font-semibold">${formatDate(a.ngay)}</td>
                <td class="px-4 py-3 font-medium text-gray-900">${a.ho_ten}</td>
                <td class="px-4 py-3 text-gray-700 font-semibold">${a.ten_ca}</td>
                <td class="px-4 py-3 text-emerald-700 font-medium">${a.gio_vao || '--:--'}</td>
                <td class="px-4 py-3 text-red-600 font-medium">${a.gio_ra || '--:--'}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-gray-500 text-sm max-w-xs truncate">${a.ghi_chu || ''}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="openAttendanceModal(${a.ma_cham_cong})" class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-colors">Sửa</button>
                        <button onclick="deleteAttendance(${a.ma_cham_cong})" class="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold transition-colors">Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openAttendanceModal(id = null) {
    const modal = document.getElementById('attendance-modal');
    const title = document.getElementById('attendance-modal-title');
    const form = document.getElementById('attendance-form');
    
    form.reset();
    document.getElementById('attendance-id').value = '';
    
    await fetchEmployeesForSelect();
    await fetchShiftsForSelect();

    if (id) {
        title.textContent = '✏️ Chỉnh sửa chấm công';
        try {
            const dateFilter = document.getElementById('att-date-filter').value;
            const result = await apiCall(`/admin/attendance?date=${dateFilter}`);
            if (result.success && result.data) {
                const a = result.data.find(x => x.ma_cham_cong === id);
                if (a) {
                    document.getElementById('attendance-id').value = a.ma_cham_cong;
                    document.getElementById('attendance-employee').value = a.ma_nhan_vien;
                    document.getElementById('attendance-date').value = a.ngay ? a.ngay.split('T')[0] : '';
                    document.getElementById('attendance-shift').value = a.ma_ca;
                    document.getElementById('attendance-time-in').value = a.gio_vao || '';
                    document.getElementById('attendance-time-out').value = a.gio_ra || '';
                    document.getElementById('attendance-status').value = a.trang_thai;
                    document.getElementById('attendance-notes').value = a.ghi_chu || '';
                }
            }
        } catch (e) {
            console.error('Fetch attendance details error:', e);
            showNotification('Lỗi khi tải chi tiết chấm công', 'error');
            return;
        }
    } else {
        title.textContent = '📝 Ghi nhận chấm công thủ công';
        document.getElementById('attendance-date').value = document.getElementById('att-date-filter').value || new Date().toISOString().split('T')[0];
        document.getElementById('attendance-status').value = 'dung_gio';
    }
    
    modal.classList.add('active');
}

function closeAttendanceModal() {
    document.getElementById('attendance-modal').classList.remove('active');
}

async function saveAttendance(event) {
    event.preventDefault();
    const id = document.getElementById('attendance-id').value;
    
    const payload = {
        ma_nhan_vien: parseInt(document.getElementById('attendance-employee').value),
        ma_ca: parseInt(document.getElementById('attendance-shift').value),
        ngay: document.getElementById('attendance-date').value,
        gio_vao: document.getElementById('attendance-time-in').value || null,
        gio_ra: document.getElementById('attendance-time-out').value || null,
        trang_thai: document.getElementById('attendance-status').value,
        ghi_chu: document.getElementById('attendance-notes').value.trim() || null
    };

    if (id) {
        payload.ma_cham_cong = parseInt(id);
    }

    if (!payload.ma_nhan_vien || !payload.ma_ca || !payload.ngay) {
        showNotification('Vui lòng chọn đầy đủ nhân viên, ca làm và ngày!', 'error');
        return;
    }

    try {
        const result = await apiCall('/admin/attendance', 'POST', payload);

        if (result.success) {
            showNotification(id ? 'Cập nhật chấm công thành công!' : 'Chấm công nhân sự thành công!', 'success');
            closeAttendanceModal();
            loadAttendance();
        } else {
            showNotification(result.message || 'Lỗi khi lưu chấm công', 'error');
        }
    } catch (e) {
        console.error('Save attendance error:', e);
        showNotification('Lỗi kết nối khi chấm công', 'error');
    }
}

async function deleteAttendance(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa lượt chấm công này?')) return;
    try {
        const result = await apiCall(`/admin/attendance/${id}`, 'DELETE');
        if (result.success) {
            showNotification('Xóa lịch sử chấm công thành công!', 'success');
            loadAttendance();
        } else {
            showNotification(result.message || 'Lỗi khi xóa chấm công', 'error');
        }
    } catch (e) {
        console.error('Delete attendance error:', e);
        showNotification('Lỗi kết nối khi xóa chấm công', 'error');
    }
}

// --- PAYROLL MANAGEMENT ---
async function loadPayroll() {
    const month = document.getElementById('pay-month-filter').value;
    const year = document.getElementById('pay-year-filter').value;
    
    try {
        const result = await apiCall(`/admin/payroll?month=${month}&year=${year}`);
        if (result.success && result.data) {
            renderPayrollTable(result.data);
            updatePayrollStats(result.data);
        } else {
            showNotification(result.message || 'Lỗi tải bảng lương', 'error');
        }
    } catch (e) {
        console.error('loadPayroll error:', e);
        showNotification('Lỗi kết nối khi tải bảng lương', 'error');
    }
}

function updatePayrollStats(list) {
    const total = list.reduce((sum, p) => sum + parseFloat(p.thuc_linh || 0), 0);
    const deduction = list.reduce((sum, p) => sum + parseFloat(p.khau_tru || 0), 0);
    const paid = list.filter(p => p.trang_thai_thanh_toan === 'da_thanh_toan').reduce((sum, p) => sum + parseFloat(p.thuc_linh || 0), 0);
    const pending = list.filter(p => p.trang_thai_thanh_toan === 'chua_thanh_toan').reduce((sum, p) => sum + parseFloat(p.thuc_linh || 0), 0);

    document.getElementById('pay-card-total').textContent = formatPrice(total);
    document.getElementById('pay-card-deduction').textContent = formatPrice(deduction);
    document.getElementById('pay-card-paid').textContent = formatPrice(paid);
    document.getElementById('pay-card-pending').textContent = formatPrice(pending);
}

function renderPayrollTable(list) {
    const tbody = document.getElementById('payroll-table');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-500">Chưa tính lương tháng này. Hãy bấm "Tính lương hàng loạt" để tạo.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(p => {
        const statusBadge = p.trang_thai_thanh_toan === 'da_thanh_toan' 
            ? '<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300">Đã thanh toán</span>' 
            : '<span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-300">Chưa thanh toán</span>';
        
        return `
            <tr class="border-b hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <div class="font-bold text-gray-900">${p.ho_ten}</div>
                    <div class="text-xs text-gray-500">${p.chuc_vu}</div>
                </td>
                <td class="px-4 py-3 text-gray-600 font-semibold">${formatPrice(p.luong_co_ban)}</td>
                <td class="px-4 py-3 text-center text-blue-600 font-bold">${parseFloat(p.so_ngay_cong).toFixed(1)} ngày</td>
                <td class="px-4 py-3 text-emerald-600 font-medium">+${formatPrice(p.phu_cap)}</td>
                <td class="px-4 py-3 text-emerald-600 font-medium">+${formatPrice(p.thuong)}</td>
                <td class="px-4 py-3 text-red-500 font-medium">-${formatPrice(p.khau_tru)}</td>
                <td class="px-4 py-3 font-bold text-indigo-700 text-base">${formatPrice(p.thuc_linh)}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">${p.ghi_chu || ''}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="openPayrollModal(${p.ma_bang_luong})" class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-colors">Adjust / Chi trả</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function calculatePayroll() {
    const month = document.getElementById('pay-month-filter').value;
    const year = document.getElementById('pay-year-filter').value;
    
    if (!confirm(`Bạn có muốn chạy tính toán bảng lương cho tất cả nhân viên trong Tháng ${month}/${year}? Lịch sử chấm công hoàn tất sẽ được lấy để kết chuyển tự động.`)) return;

    // Show loading spinner
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.style.display = 'flex';

    try {
        const result = await apiCall('/admin/payroll/calculate', 'POST', { month: parseInt(month), year: parseInt(year) });
        if (result.success) {
            showNotification(`Tính lương tự động hoàn tất cho Tháng ${month}/${year}!`, 'success');
            loadPayroll();
        } else {
            showNotification(result.message || 'Lỗi khi tính toán bảng lương', 'error');
        }
    } catch (e) {
        console.error('calculatePayroll error:', e);
        showNotification('Lỗi kết nối khi tính lương', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// Global cached calculation values for modal estimate
window.modalCalculatedSalary = 0;

async function openPayrollModal(id) {
    const modal = document.getElementById('payroll-modal');
    const form = document.getElementById('payroll-form');
    
    form.reset();
    document.getElementById('payroll-id').value = '';
    
    try {
        const month = document.getElementById('pay-month-filter').value;
        const year = document.getElementById('pay-year-filter').value;
        const result = await apiCall(`/admin/payroll?month=${month}&year=${year}`);
        
        if (result.success && result.data) {
            const p = result.data.find(x => x.ma_bang_luong === id);
            if (p) {
                document.getElementById('payroll-id').value = p.ma_bang_luong;
                document.getElementById('payroll-employee-name').textContent = p.ho_ten + ` (${p.chuc_vu})`;
                document.getElementById('payroll-period').textContent = `Tháng ${p.thang}/${p.nam}`;
                document.getElementById('payroll-base-salary').textContent = formatPrice(p.luong_co_ban);
                document.getElementById('payroll-days-worked').textContent = parseFloat(p.so_ngay_cong).toFixed(1) + ' ngày';
                
                // Calculate salary based on days worked (Standard 26 days/month)
                const baseSalary = parseFloat(p.luong_co_ban || 0);
                const daysWorked = parseFloat(p.so_ngay_cong || 0);
                window.modalCalculatedSalary = Math.round(baseSalary * (daysWorked / 26));
                
                document.getElementById('payroll-calculated-salary').textContent = formatPrice(window.modalCalculatedSalary);
                
                // Load adjustments
                document.getElementById('payroll-allowance').value = Math.round(p.phu_cap);
                document.getElementById('payroll-bonus').value = Math.round(p.thuong);
                document.getElementById('payroll-deductions').value = Math.round(p.khau_tru);
                document.getElementById('payroll-status').value = p.trang_thai_thanh_toan;
                document.getElementById('payroll-notes').value = p.ghi_chu || '';
                
                calculateTotalEstimate();
            }
        }
    } catch (e) {
        console.error('Fetch payroll detail error:', e);
        showNotification('Lỗi khi tải chi tiết bảng lương', 'error');
        return;
    }
    
    modal.classList.add('active');
}

function calculateTotalEstimate() {
    const allowance = parseFloat(document.getElementById('payroll-allowance').value || 0);
    const bonus = parseFloat(document.getElementById('payroll-bonus').value || 0);
    const deductions = parseFloat(document.getElementById('payroll-deductions').value || 0);
    
    const estimate = window.modalCalculatedSalary + allowance + bonus - deductions;
    document.getElementById('payroll-total-estimate').textContent = formatPrice(estimate);
}

function closePayrollModal() {
    document.getElementById('payroll-modal').classList.remove('active');
}

async function savePayroll(event) {
    event.preventDefault();
    const id = document.getElementById('payroll-id').value;
    
    const payload = {
        phu_cap: parseFloat(document.getElementById('payroll-allowance').value || 0),
        thuong: parseFloat(document.getElementById('payroll-bonus').value || 0),
        khau_tru: parseFloat(document.getElementById('payroll-deductions').value || 0),
        trang_thai_thanh_toan: document.getElementById('payroll-status').value,
        ghi_chu: document.getElementById('payroll-notes').value.trim() || null
    };

    if (isNaN(payload.phu_cap) || isNaN(payload.thuong) || isNaN(payload.khau_tru)) {
        showNotification('Các khoản điều chỉnh lương phải là số!', 'error');
        return;
    }

    try {
        const result = await apiCall(`/admin/payroll/${id}`, 'PUT', payload);

        if (result.success) {
            showNotification('Cập nhật thông tin bảng lương & thanh toán thành công!', 'success');
            closePayrollModal();
            loadPayroll();
        } else {
            showNotification(result.message || 'Lỗi khi cập nhật bảng lương', 'error');
        }
    } catch (e) {
        console.error('Save payroll error:', e);
        showNotification('Lỗi kết nối khi cập nhật bảng lương', 'error');
    }
}

// --- FORM SUBMISSIONS LISTENER IN DOM ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('employee-form')?.addEventListener('submit', saveEmployee);
    document.getElementById('shift-form')?.addEventListener('submit', saveShift);
    document.getElementById('attendance-form')?.addEventListener('submit', saveAttendance);
    document.getElementById('payroll-form')?.addEventListener('submit', savePayroll);
});

// ==========================================
// LOGIC QUẢN LÝ SỞ THÍCH & CẢM XÚC (PERSONALIZATION & SENTIMENT)
// ==========================================
let persRawData = null;
let persCurrentView = 'logs';

async function loadPersonalization() {
    try {
        console.log('🔮 Loading personalization & sentiment data from server...');
        const res = await apiCall('/admin/personalization');
        if (!res.success) {
            showNotification(res.message || 'Lỗi khi tải dữ liệu sở thích & cảm xúc', 'error');
            return;
        }

        persRawData = res.data;
        
        // Render stats metric
        const stats = persRawData.analytics;
        if(document.getElementById('pers-total-count')) document.getElementById('pers-total-count').textContent = stats.total || 0;
        if(document.getElementById('pers-positive-count')) document.getElementById('pers-positive-count').textContent = stats.positive || 0;
        if(document.getElementById('pers-negative-count')) document.getElementById('pers-negative-count').textContent = stats.negative || 0;
        if(document.getElementById('pers-neutral-count')) document.getElementById('pers-neutral-count').textContent = stats.neutral || 0;

        if (typeof renderPersonalization === 'function') {
            renderPersonalization();
        }
    } catch (e) {
        console.error('loadPersonalization error:', e);
        showNotification('Lỗi hệ thống khi nạp dữ liệu sở thích & cảm xúc', 'error');
    }
}

function togglePersonalizationView(view) {
    persCurrentView = view;
    
    const btnLogs = document.getElementById('btn-pers-view-logs');
    const btnProfiles = document.getElementById('btn-pers-view-profiles');
    const viewLogs = document.getElementById('pers-view-logs');
    const viewProfiles = document.getElementById('pers-view-profiles');

    if (view === 'logs') {
        btnLogs.className = 'px-4 py-2 text-sm font-bold rounded-lg transition-all bg-white text-blue-600 shadow';
        btnProfiles.className = 'px-4 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700';
        viewLogs.classList.remove('hidden');
        viewProfiles.classList.add('hidden');
    } else {
        btnLogs.className = 'px-4 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700';
        btnProfiles.className = 'px-4 py-2 text-sm font-bold rounded-lg transition-all bg-white text-blue-600 shadow';
        viewLogs.classList.add('hidden');
        viewProfiles.classList.remove('hidden');
    }
    
    renderPersonalization();
}

function resetPersonalizationFilters() {
    document.getElementById('pers-filter-type').value = 'all';
    document.getElementById('pers-filter-sentiment').value = 'all';
    document.getElementById('pers-search').value = '';
    renderPersonalization();
}

function filterPersonalization() {
    renderPersonalization();
}

function renderPersonalization() {
    if (!persRawData) return;

    const container = document.getElementById('pers-view-profiles');
    if (!container) return;

    let filteredProfiles = persRawData.userProfiles;

    if (filteredProfiles.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="px-6 py-10 text-center text-gray-500 font-medium bg-gray-50">📭 Không có hồ sơ sở thích khách hàng nào</td></tr>';
        return;
    }

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount);

    const aspectKeywords = {
        "Dung lượng pin": ["pin", "battery", "sạc", "dung lượng"],
        "Hiệu năng": ["hiệu năng", "mượt", "nhanh", "lag", "chậm", "cấu hình", "chip", "ram", "game", "fps"],
        "Tản nhiệt": ["nóng", "tản nhiệt", "quạt", "ấm", "nhiệt độ"],
        "Màn hình hiển thị": ["màn hình", "màn", "hiển thị", "tần số quét", "độ sáng", "amoled", "ips", "oled"],
        "Chất lượng âm thanh": ["loa", "âm thanh", "bass", "volume", "nghe", "nhạc"]
    };

    container.innerHTML = filteredProfiles.map(p => {
        // --- 1. Khách hàng: p.ten_dang_nhap & p.ma_tai_khoan ---
        const customerName = p.ten_dang_nhap || 'Khách';
        const customerId = p.ma_tai_khoan;

        // --- 2. Liên hệ: Show both phone and email
        let contactInfo = '';
        if (p.so_dien_thoai && p.email) {
            contactInfo = `<div>${p.so_dien_thoai}</div><div class="text-[11px] text-gray-500">${p.email}</div>`;
        } else {
            contactInfo = p.so_dien_thoai || p.email || '-';
        }

        // --- 3. Nhu cầu khai báo (Summary view with detail button) ---
        const hasSurvey = p.da_hoan_thanh_khao_sat;
        
        let declaredHtml = '<div class="flex flex-col items-center gap-2 w-full">';
        
        if (!hasSurvey) {
            declaredHtml += '<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">📋 Chưa khảo sát</span>';
        } else {
            // Đếm số items đã điền
            let filledCount = 0;
            if (p.muc_dich_su_dung) filledCount++;
            if (p.phan_khuc_ngan_sach) filledCount++;
            const surveyCategories = Array.isArray(p.danh_muc_quan_tam) ? p.danh_muc_quan_tam : [];
            const surveyBrands = Array.isArray(p.thuong_hieu_yeu_thich) ? p.thuong_hieu_yeu_thich : [];
            if (surveyCategories.length > 0) filledCount++;
            if (surveyBrands.length > 0) filledCount++;
            
            // Status badge
            declaredHtml += '<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">✅ Đã khảo sát</span>';
            
            // Summary counts
            declaredHtml += '<div class="text-[10px] text-gray-500 text-center">';
            declaredHtml += '<div>' + filledCount + '/4 mục đã điền</div>';
            if (surveyCategories.length > 0 || surveyBrands.length > 0) {
                declaredHtml += '<div class="text-blue-600 font-semibold">' + (surveyCategories.length + surveyBrands.length) + ' lựa chọn</div>';
            }
            declaredHtml += '</div>';
            
            // Detail button
            declaredHtml += '<button onclick="viewSurveyDetail(' + p.ma_tai_khoan + ')" class="mt-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-md transition-colors">👁️ Xem chi tiết</button>';
        }
        declaredHtml += '</div>';

        // --- 4. Sở thích từ click (Implicit) ---
        const implicitActs = p.activities.filter(a => ['click', 'view', 'view_30s', 'view_50s', 'cart', 'search'].includes(a.loai));
        let implicitHtml = '<span class="italic text-gray-400">Chưa click nào</span>';
        if (implicitActs.length > 0) {
            const categoryCounts = {};
            implicitActs.forEach(a => {
                const cat = a.ten_danh_muc || 'Khác';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
            
            implicitHtml = '<div class="flex flex-col gap-1 items-center">';
            sortedCats.slice(0, 3).forEach(([cat, count]) => {
                let emoji = '🛒';
                const lowerCat = cat.toLowerCase();
                if (lowerCat.includes('điện thoại')) emoji = '📱';
                else if (lowerCat.includes('laptop')) emoji = '💻';
                else if (lowerCat.includes('máy tính')) emoji = '🖥️';
                else if (lowerCat.includes('phụ kiện')) emoji = '🎧';
                else if (lowerCat.includes('máy ảnh')) emoji = '📷';
                else if (lowerCat.includes('đồng hồ')) emoji = '⌚';
                
                implicitHtml += '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">' + emoji + ' ' + cat + ' (' + count + ' click)</span>';
            });
            implicitHtml += '</div>';
            implicitHtml += '<button onclick="openPersonalizationActivityDetail(' + p.ma_tai_khoan + ')" class="mt-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md transition-colors">📄 Xem toàn bộ</button>';
        }

        // --- 5. Sản phẩm quan tâm nhất ---
        let topProductHtml = '<div class="italic text-gray-400">Chưa xem sản phẩm nào</div>';
        const viewOrCartActs = p.activities.filter(a => ['view', 'cart'].includes(a.loai));
        if (viewOrCartActs.length > 0) {
            const prodCounts = {};
            viewOrCartActs.forEach(a => {
                const name = a.noi_dung.replace('Đã xem: ', '').replace('Thêm vào giỏ: ', '').replace(/\"/g, '');
                prodCounts[name] = (prodCounts[name] || 0) + 1;
            });
            const sortedProds = Object.entries(prodCounts).sort((a, b) => b[1] - a[1]);
            if (sortedProds.length > 0) {
                const [bestProdName, count] = sortedProds[0];
                const truncatedName = bestProdName.length > 30 ? bestProdName.substring(0, 30) + '...' : bestProdName;
                topProductHtml = '<div class="font-semibold text-gray-800 text-xs" title="' + bestProdName + '">' + truncatedName + '</div><div class="text-xs text-orange-500 mt-1">🔥 Xem ' + count + ' lần</div><button onclick="openPersonalizationActivityDetail(' + p.ma_tai_khoan + ')" class="mt-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-md transition-colors">📄 Xem toàn bộ</button>';
            }
        }

        // --- 6. AI học từ đánh giá ---
        const reviewActs = p.activities.filter(a => a.loai === 'review');
        let reviewsHtml = '<span class="italic text-gray-400">Chưa đủ dữ liệu</span>';
        if (reviewActs.length > 0) {
            const aspectScores = {};
            reviewActs.forEach(r => {
                const comment = (r.binh_luan || '').toLowerCase();
                const isPositive = r.sentiment === 'positive';
                const baseScore = isPositive ? 4.2 : 2.5;
                
                let matchedAny = false;
                for (const [aspect, keywords] of Object.entries(aspectKeywords)) {
                    if (keywords.some(k => comment.includes(k))) {
                        if (!aspectScores[aspect]) aspectScores[aspect] = [];
                        const charSum = r.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                        const noise = (charSum % 10) / 15 - 0.3; // stable noise
                        const score = Math.max(1.0, Math.min(5.0, baseScore + noise));
                        aspectScores[aspect].push(score);
                        matchedAny = true;
                    }
                }
                if (!matchedAny) {
                    if (!aspectScores["Chất lượng chung"]) aspectScores["Chất lượng chung"] = [];
                    const charSum = r.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    const noise = (charSum % 10) / 15 - 0.3;
                    const score = Math.max(1.0, Math.min(5.0, baseScore + noise));
                    aspectScores["Chất lượng chung"].push(score);
                }
            });
            
            const avgAspects = Object.entries(aspectScores).map(([aspect, scores]) => {
                const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
                return { aspect, avg: avg.toFixed(1) };
            });
            
            reviewsHtml = '<div class="flex flex-wrap gap-1">';
            avgAspects.forEach(item => {
                const scoreNum = parseFloat(item.avg);
                let colorClass = 'text-gray-600 bg-gray-50';
                if (scoreNum >= 4.0) colorClass = 'text-green-600 bg-green-50 border border-green-100';
                else if (scoreNum >= 3.0) colorClass = 'text-blue-600 bg-blue-50 border border-blue-100';
                else colorClass = 'text-red-600 bg-red-50 border border-red-100';
                
                reviewsHtml += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ' + colorClass + '">' + item.aspect + ' (' + item.avg + ')</span>';
            });
            reviewsHtml += '</div><button onclick="openPersonalizationActivityDetail(' + p.ma_tai_khoan + ')" class="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-md transition-colors">📄 Xem toàn bộ</button>';
        }

        // --- 7. AI học từ Chatbot ---
        const chatActs = p.activities.filter(a => a.loai === 'chatbot');
        let chatbotHtml = '<span class="italic text-slate-400 text-xs">Chưa có dữ liệu chat</span>';
        if (chatActs.length > 0) {
            const chatKeywords = {};
            chatActs.forEach(c => {
                const text = (c.noi_dung || '').toLowerCase();
                
                const techKeywords = {
                    'Điện thoại': ['điện thoại', 'iphone', 'samsung', 'oppo', 'xiaomi', 'phone', 'mobile'],
                    'Laptop': ['laptop', 'macbook', 'asus', 'dell', 'hp', 'lenovo', 'thinkpad'],
                    'Màn hình': ['màn hình', 'monitor', 'display'],
                    'Phụ kiện': ['tai nghe', 'chuột', 'bàn phím', 'sạc', 'cáp', 'phụ kiện', 'keyboard', 'mouse', 'headphone'],
                    'Gaming': ['gaming', 'chơi game', 'game', 'đồ họa', 'vga', 'card đồ họa'],
                    'Giá rẻ': ['rẻ', 'sinh viên', 'giá tốt', 'sale', 'khuyến mãi']
                };

                for (const [key, keywords] of Object.entries(techKeywords)) {
                    if (keywords.some(kw => text.includes(kw))) {
                        chatKeywords[key] = (chatKeywords[key] || 0) + 1.5;
                    }
                }
            });

            const sortedKeywords = Object.entries(chatKeywords).sort((a, b) => b[1] - a[1]);
            
            if (sortedKeywords.length > 0) {
                chatbotHtml = '<div class="flex flex-col gap-1 items-center">';
                sortedKeywords.slice(0, 2).forEach(([key, val]) => {
                    chatbotHtml += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100">💬 ' + key + ' (+' + val.toFixed(1) + ')</span>';
                });
                chatbotHtml += '<button onclick="openPersonalizationActivityDetail(' + customerId + ')" class="mt-1 text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1">📄 Xem toàn bộ (' + chatActs.length + ')</button>';
                chatbotHtml += '</div>';
            } else {
                chatbotHtml = '<div class="flex flex-col items-center gap-1">' +
                    '<span class="italic text-gray-400 text-xs">Không tìm thấy từ khóa</span>' +
                    '<button onclick="openPersonalizationActivityDetail(' + customerId + ')" class="text-xs text-purple-700 hover:text-purple-900 font-bold">📄 Xem toàn bộ (' + chatActs.length + ')</button>' +
                '</div>';
            }
        }

        return '<tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">' +
            '<td class="px-6 py-4 font-semibold text-gray-800 border-r border-gray-100"><div>' + customerName + '</div><div class="text-xs text-gray-400 font-normal mt-1">ID: ' + customerId + '</div></td>' +
            '<td class="px-6 py-4 border-r border-gray-100 text-gray-600">' + contactInfo + '</td>' +
            '<td class="px-6 py-4 border-r border-gray-100">' + declaredHtml + '</td>' +
            '<td class="px-6 py-4 border-r border-gray-100 text-center">' + implicitHtml + '</td>' +
            '<td class="px-6 py-4 border-r border-gray-100">' + topProductHtml + '</td>' +
            '<td class="px-6 py-4 border-r border-gray-100">' + reviewsHtml + '</td>' +
            '<td class="px-6 py-4 text-center">' + chatbotHtml + '</td>' +
            '</tr>';
    }).join('');
}

function inspectUserProfile(userId) {
    if (!persRawData) return;
    const profile = persRawData.userProfiles.find(p => p.ma_tai_khoan === userId);
    if (!profile) return;
    
    // Switch filter type to "all" and search to this user's username
    document.getElementById('pers-filter-type').value = 'all';
    document.getElementById('pers-filter-sentiment').value = 'all';
    document.getElementById('pers-search').value = profile.ten_dang_nhap;
    
    // Toggle view to logs
    togglePersonalizationView('logs');
}

function openPersonalizationActivityDetail(userId) {
    if (!persRawData) return;
    const profile = persRawData.userProfiles.find(p => p.ma_tai_khoan === userId);
    if (!profile) {
        alert('Không tìm thấy dữ liệu người dùng');
        return;
    }

    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const formatDate = (value) => {
        try {
            return new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short'
            }).format(new Date(value));
        } catch (e) {
            return value || '-';
        }
    };

    const implicitActs = (profile.activities || []).filter(a => ['click', 'view', 'view_30s', 'view_50s', 'cart', 'search'].includes(a.loai));
    const topProductMap = {};
    const topProductActs = (profile.activities || []).filter(a => ['view', 'view_30s', 'view_50s', 'cart'].includes(a.loai));
    topProductActs.forEach(a => {
        const name = (a.noi_dung || '').replace('Đã xem: ', '').replace('Đã xem >30s: ', '').replace('Đã xem >50s: ', '').replace('Thêm vào giỏ: ', '').replace(/"/g, '');
        if (!name) return;
        if (!topProductMap[name]) {
            topProductMap[name] = { name, count: 0, lastType: a.loai, lastDate: a.ngay_tao, category: a.ten_danh_muc || 'Khác', brand: a.thuong_hieu || '-' };
        }
        topProductMap[name].count += 1;
        if (new Date(a.ngay_tao) > new Date(topProductMap[name].lastDate)) {
            topProductMap[name].lastType = a.loai;
            topProductMap[name].lastDate = a.ngay_tao;
        }
    });
    const topProducts = Object.values(topProductMap).sort((a, b) => b.count - a.count || new Date(b.lastDate) - new Date(a.lastDate));

    const reviewActs = (profile.activities || []).filter(a => a.loai === 'review');
    const chatActs = (profile.activities || []).filter(a => a.loai === 'chatbot');

    const implicitHtml = implicitActs.length
        ? implicitActs.map(a => `
            <li class="p-3 rounded-lg border border-emerald-100 bg-emerald-50/60">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">${escapeHtml(a.loai)}</span>
                    <span class="text-xs text-slate-500">${formatDate(a.ngay_tao)}</span>
                </div>
                <div class="text-sm text-slate-800 font-medium">${escapeHtml(a.noi_dung)}</div>
                <div class="text-xs text-slate-500 mt-1">${escapeHtml(a.ten_danh_muc || '')}${a.thuong_hieu ? ' • ' + escapeHtml(a.thuong_hieu) : ''}</div>
            </li>`).join('')
        : '<li class="text-sm text-slate-400 italic">Chưa có dữ liệu click/xem/giỏ/tìm kiếm</li>';

    const productsHtml = topProducts.length
        ? topProducts.map(item => `
            <li class="p-3 rounded-lg border border-orange-100 bg-orange-50/60">
                <div class="flex items-center justify-between gap-3 mb-1">
                    <div class="font-semibold text-slate-900 text-sm">${escapeHtml(item.name)}</div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white">${item.count} lần</span>
                </div>
                <div class="text-xs text-slate-500">${escapeHtml(item.category)} • ${escapeHtml(item.brand)} • ${formatDate(item.lastDate)}</div>
            </li>`).join('')
        : '<li class="text-sm text-slate-400 italic">Chưa có dữ liệu xem/giỏ hàng</li>';

    const reviewsHtml = reviewActs.length
        ? reviewActs.map(r => `
            <li class="p-3 rounded-lg border border-blue-100 bg-blue-50/60">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.sentiment === 'positive' ? 'bg-green-600 text-white' : r.sentiment === 'negative' ? 'bg-rose-600 text-white' : 'bg-slate-600 text-white'}">${escapeHtml(r.sentiment || 'neutral')}</span>
                    <span class="text-xs text-slate-500">${formatDate(r.ngay_tao)}</span>
                </div>
                <div class="text-sm font-semibold text-slate-900">${escapeHtml(r.noi_dung)}</div>
                <div class="text-xs text-slate-500 mt-1">${escapeHtml(r.binh_luan || '')}</div>
            </li>`).join('')
        : '<li class="text-sm text-slate-400 italic">Chưa có dữ liệu đánh giá</li>';

    const chatHtml = chatActs.length
        ? chatActs.map(c => `
            <li class="p-3 rounded-lg border border-purple-100 bg-purple-50/60">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">chatbot</span>
                    <span class="text-xs text-slate-500">${formatDate(c.ngay_tao)}</span>
                </div>
                <div class="text-sm text-slate-800 font-medium">${escapeHtml(c.noi_dung)}</div>
            </li>`).join('')
        : '<li class="text-sm text-slate-400 italic">Chưa có dữ liệu chatbot</li>';

    const modalHtml = `
        <div id="personalizationActivityModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onclick="closePersonalizationActivityDetail()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden m-4" onclick="event.stopPropagation()">
                <div class="sticky top-0 bg-gradient-to-r from-indigo-700 to-slate-800 text-white px-6 py-5 flex items-center justify-between border-b-4 border-amber-500">
                    <div>
                        <h3 class="text-xl font-black tracking-tight flex items-center gap-2">
                            <span class="text-2xl">📚</span>
                            Danh sách dữ liệu sở thích đầy đủ
                        </h3>
                        <p class="text-sm text-slate-300 mt-1 font-medium">${escapeHtml(profile.ten_dang_nhap || 'Khách')} <span class="text-slate-400">(ID: ${profile.ma_tai_khoan})</span></p>
                    </div>
                    <button onclick="closePersonalizationActivityDetail()" class="text-white hover:bg-white/10 rounded-xl p-2 transition-all active:scale-95">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto max-h-[calc(92vh-88px)] bg-gradient-to-b from-slate-50 to-white space-y-5">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div class="text-xs uppercase font-bold text-emerald-700">Implicit</div>
                            <div class="text-2xl font-black text-emerald-900 mt-1">${implicitActs.length}</div>
                            <div class="text-xs text-emerald-700">Click / xem / giỏ / tìm kiếm</div>
                        </div>
                        <div class="rounded-xl border border-orange-100 bg-orange-50 p-4">
                            <div class="text-xs uppercase font-bold text-orange-700">Quan tâm nhất</div>
                            <div class="text-2xl font-black text-orange-900 mt-1">${topProducts.length}</div>
                            <div class="text-xs text-orange-700">Sản phẩm có tương tác nhiều</div>
                        </div>
                        <div class="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div class="text-xs uppercase font-bold text-blue-700">Đánh giá</div>
                            <div class="text-2xl font-black text-blue-900 mt-1">${reviewActs.length}</div>
                            <div class="text-xs text-blue-700">AI học từ review</div>
                        </div>
                        <div class="rounded-xl border border-purple-100 bg-purple-50 p-4">
                            <div class="text-xs uppercase font-bold text-purple-700">Chatbot</div>
                            <div class="text-2xl font-black text-purple-900 mt-1">${chatActs.length}</div>
                            <div class="text-xs text-purple-700">AI học từ hội thoại</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <section class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h4 class="font-black text-slate-900 text-lg">Sở thích từ click (Implicit)</h4>
                                    <p class="text-xs text-slate-500">Tất cả hành vi click / xem / giỏ / tìm kiếm</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">${implicitActs.length} mục</span>
                            </div>
                            <ul class="space-y-2 max-h-[320px] overflow-y-auto pr-1">${implicitHtml}</ul>
                        </section>

                        <section class="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h4 class="font-black text-slate-900 text-lg">Sản phẩm quan tâm nhất</h4>
                                    <p class="text-xs text-slate-500">Danh sách sản phẩm được xem / thêm giỏ nhiều nhất</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">${topProducts.length} SP</span>
                            </div>
                            <ul class="space-y-2 max-h-[320px] overflow-y-auto pr-1">${productsHtml}</ul>
                        </section>

                        <section class="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h4 class="font-black text-slate-900 text-lg">AI học từ đánh giá</h4>
                                    <p class="text-xs text-slate-500">Tất cả review và nội dung bình luận</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">${reviewActs.length} review</span>
                            </div>
                            <ul class="space-y-2 max-h-[320px] overflow-y-auto pr-1">${reviewsHtml}</ul>
                        </section>

                        <section class="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm">
                            <div class="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h4 class="font-black text-slate-900 text-lg">AI học từ Chatbot</h4>
                                    <p class="text-xs text-slate-500">Tất cả câu hỏi và nội dung chatbot đã trả lời</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">${chatActs.length} chat</span>
                            </div>
                            <ul class="space-y-2 max-h-[320px] overflow-y-auto pr-1">${chatHtml}</ul>
                        </section>
                    </div>
                </div>
            </div>
        </div>`;

    document.getElementById('personalizationActivityModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePersonalizationActivityDetail() {
    const modal = document.getElementById('personalizationActivityModal');
    if (modal) modal.remove();
}

// ==========================================
// TOGGLE SUB-TAB: Profiles vs Collaborative Filtering
// ==========================================
function togglePersSubTab(tab) {
    const btnProfiles = document.getElementById('btn-pers-view-profiles');
    const btnCollaborative = document.getElementById('btn-pers-view-collaborative');
    const viewProfiles = document.getElementById('pers-view-profiles');
    const viewCollaborative = document.getElementById('pers-view-collaborative');

    if (tab === 'profiles') {
        // Active profiles tab
        btnProfiles.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white text-blue-600 shadow flex items-center justify-center gap-2';
        btnCollaborative.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2';
        
        if (viewProfiles) viewProfiles.closest('.bg-white').classList.remove('hidden');
        if (viewCollaborative) viewCollaborative.classList.add('hidden');
    } else if (tab === 'collaborative') {
        // Active collaborative tab
        btnProfiles.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2';
        btnCollaborative.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white text-blue-600 shadow flex items-center justify-center gap-2';
        
        if (viewProfiles) viewProfiles.closest('.bg-white').classList.add('hidden');
        if (viewCollaborative) viewCollaborative.classList.remove('hidden');
        
        // Render collaborative filtering view
        renderCollaborativeFiltering();
    }
}

// ==========================================
// RENDER COLLABORATIVE FILTERING VIEW
// Hiển thị các cặp khách hàng có sở thích tương đồng + sản phẩm chung/đã mua/gợi ý
// ==========================================
function renderCollaborativeFiltering() {
    const container = document.getElementById('pers-view-collaborative');
    if (!container) return;

    if (!persRawData) {
        container.innerHTML = `
            <div class="text-center py-20 bg-gray-50 rounded-lg">
                <div class="text-6xl mb-4">⏳</div>
                <h3 class="text-xl font-bold text-gray-700 mb-2">Đang tải dữ liệu...</h3>
            </div>`;
        return;
    }

    const cfData = persRawData.collaborativeFiltering || [];

    if (cfData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 bg-gray-50 rounded-lg">
                <div class="text-6xl mb-4">🤝</div>
                <h3 class="text-xl font-bold text-gray-700 mb-2">Chưa có cặp khách hàng tương đồng</h3>
                <p class="text-gray-500">Cần ít nhất 2 khách hàng có sản phẩm cùng mua chung để tính toán độ tương đồng</p>
            </div>`;
        return;
    }

    const fmtPrice = (v) => {
        try { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ'; }
        catch (e) { return (v || 0) + 'đ'; }
    };
    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const productImg = (p) => {
        const img = p.duong_dan_anh;
        if (!img) return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23f3f4f6" width="40" height="40"/></svg>';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        const clean = img.startsWith('/') ? img : '/' + img;
        return window.location.origin + clean;
    };

    const ACTION_META = {
        purchase:     { emoji: '🛒', label: 'Mua',      cls: 'bg-green-600 text-white' },
        cart:         { emoji: '🛍️', label: 'Giỏ',     cls: 'bg-amber-500 text-white' },
        wishlist:     { emoji: '❤️', label: 'Thích',   cls: 'bg-pink-500 text-white' },
        preference:   { emoji: '⭐', label: 'Khảo sát',cls: 'bg-violet-500 text-white' },
        view:         { emoji: '👁️', label: 'Xem',    cls: 'bg-blue-500 text-white' },
        chatbot_view: { emoji: '💬', label: 'Chatbot', cls: 'bg-cyan-500 text-white' },
        search:       { emoji: '🔎', label: 'Tìm',     cls: 'bg-slate-500 text-white' }
    };
    const actionPill = (type, count) => {
        const m = ACTION_META[type] || { emoji: '•', label: type, cls: 'bg-gray-400 text-white' };
        const countTxt = (count && count > 1) ? ` ×${count}` : '';
        return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${m.cls}" title="${m.label}${countTxt}">${m.emoji} ${m.label}${countTxt}</span>`;
    };

    // actionsList = [{type, count}] - render thành chuỗi pill
    const renderActionList = (actionsList) => {
        if (!actionsList || actionsList.length === 0) return '<span class="text-[10px] text-gray-400 italic">không có</span>';
        return actionsList.map(a => actionPill(a.type, a.count)).join(' ');
    };

    const renderProductChip = (p, color = 'gray', opts = {}) => {
        const colorMap = {
            blue:    'border-blue-200 bg-blue-50 text-blue-900',
            green:   'border-green-200 bg-green-50 text-green-900',
            purple:  'border-purple-200 bg-purple-50 text-purple-900',
            orange:  'border-orange-200 bg-orange-50 text-orange-900',
            gray:    'border-gray-200 bg-gray-50 text-gray-800'
        };
        const cls = colorMap[color] || colorMap.gray;

        let actionHtml = '';
        if (opts.dualAction && (p.actions_user1 || p.actions_user2)) {
            // Hiển thị TẤT CẢ action của mỗi user kèm số lần
            actionHtml = `
                <div class="mt-1.5 space-y-1">
                    <div class="flex items-center gap-1 flex-wrap">
                        <span class="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">A</span>
                        ${renderActionList(p.actions_user1)}
                    </div>
                    <div class="flex items-center gap-1 flex-wrap">
                        <span class="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">B</span>
                        ${renderActionList(p.actions_user2)}
                    </div>
                </div>`;
        } else if (p.actions && p.actions.length > 0) {
            // Có danh sách action đầy đủ (gợi ý 1 chiều)
            actionHtml = `<div class="flex items-center gap-1 flex-wrap mt-1">${renderActionList(p.actions)}</div>`;
        } else if (p.action_type) {
            // Fallback: chỉ có dominant action
            actionHtml = `<div class="mt-1">${actionPill(p.action_type, p.action_count)}</div>`;
        }

        return `
            <div class="flex items-start gap-2 px-2 py-2 border rounded-lg ${cls}">
                <img src="${productImg(p)}" alt="" class="w-9 h-9 rounded object-cover flex-shrink-0 bg-white" onerror="this.style.display='none'">
                <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold truncate" title="${escapeHtml(p.ten_san_pham)}">${escapeHtml(p.ten_san_pham)}</div>
                    <div class="text-[11px] opacity-75 flex items-center gap-1">
                        <span>${escapeHtml(p.thuong_hieu || '')}</span>
                        <span>•</span>
                        <span class="font-bold">${fmtPrice(p.gia)}</span>
                    </div>
                    ${actionHtml}
                </div>
            </div>`;
    };

    const simBadge = (simVal) => {
        const pct = (simVal * 100).toFixed(1);
        let cls = 'bg-gray-100 text-gray-700';
        let label = 'Khác biệt';
        if (simVal >= 0.8) { cls = 'bg-green-500 text-white'; label = 'Rất tương đồng'; }
        else if (simVal >= 0.5) { cls = 'bg-blue-500 text-white'; label = 'Tương đồng'; }
        else if (simVal >= 0.3) { cls = 'bg-yellow-400 text-yellow-900'; label = 'Hơi tương đồng'; }
        return `<span class="px-3 py-1 rounded-full text-xs font-bold ${cls}">${label} · ${pct}%</span>`;
    };

    const userCol = (user, label, color) => {
        const initials = (user.ten_dang_nhap || '?').substring(0, 2).toUpperCase();
        const gradient = color === 'blue'
            ? 'from-blue-500 to-indigo-600'
            : 'from-purple-500 to-pink-500';
        const products = (user.purchasedProducts || []);
        const purchasedHtml = products.length
            ? products.map(p => renderProductChip(p, color)).join('')
            : '<div class="text-xs text-gray-400 italic px-2 py-3">Chưa có đơn hàng nào</div>';

        return `
            <div class="flex-1 min-w-0 border rounded-lg p-3 bg-white">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-11 h-11 rounded-full bg-gradient-to-br ${gradient} text-white font-bold flex items-center justify-center flex-shrink-0">
                        ${escapeHtml(initials)}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-[11px] uppercase tracking-wide font-bold text-gray-500">${label}</div>
                        <div class="font-bold text-gray-900 truncate" title="${escapeHtml(user.ten_dang_nhap)}">${escapeHtml(user.ten_dang_nhap)}</div>
                        <div class="text-xs text-gray-500 truncate">${escapeHtml(user.email || '')}</div>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1 text-center text-[11px] mb-3">
                    <div class="bg-gray-50 rounded p-1">
                        <div class="font-bold text-gray-800">${user.total_purchased || 0}</div>
                        <div class="text-gray-500">SP đã mua</div>
                    </div>
                    <div class="bg-gray-50 rounded p-1">
                        <div class="font-bold text-gray-800">${user.total_orders || 0}</div>
                        <div class="text-gray-500">Đơn hàng</div>
                    </div>
                    <div class="bg-gray-50 rounded p-1">
                        <div class="font-bold text-green-600 truncate" title="${fmtPrice(user.total_spending)}">${fmtPrice(user.total_spending)}</div>
                        <div class="text-gray-500">Đã chi</div>
                    </div>
                </div>
                <div class="text-[11px] font-bold text-gray-600 uppercase mb-2">🛒 Sản phẩm đã mua (${products.length})</div>
                <div class="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">${purchasedHtml}</div>
            </div>`;
    };

    const renderTagList = (items, color) => {
        if (!items || items.length === 0) {
            return '<span class="text-xs text-gray-400 italic">Không có</span>';
        }
        return items.map(t => `<span class="px-2 py-0.5 rounded text-xs bg-${color}-100 text-${color}-800 font-medium">${escapeHtml(t)}</span>`).join(' ');
    };

    const renderPair = (pair, idx) => {
        const u1 = pair.user1, u2 = pair.user2;
        const sharedInteract = pair.sharedProducts || [];
        const sharedPurchased = pair.sharedPurchased || [];
        const recForU1 = pair.recommendedForUser1 || [];
        const recForU2 = pair.recommendedForUser2 || [];

        const sharedInteractHtml = sharedInteract.length
            ? sharedInteract.map(p => renderProductChip(p, 'green', { dualAction: true })).join('')
            : '<div class="text-xs text-gray-400 italic px-2 py-2 col-span-full">Không có sản phẩm tương tác chung</div>';

        const sharedPurchasedHtml = sharedPurchased.length
            ? sharedPurchased.map(p => renderProductChip(Object.assign({ action_type: 'purchase' }, p), 'green')).join('')
            : '<div class="text-xs text-gray-400 italic px-2 py-2 col-span-full">Cả 2 chưa cùng mua sản phẩm nào</div>';

        const rec1Html = recForU1.length
            ? recForU1.map(p => renderProductChip(p, 'orange')).join('')
            : '<div class="text-xs text-gray-400 italic px-2 py-2">B chưa có sản phẩm nào A chưa biết</div>';

        const rec2Html = recForU2.length
            ? recForU2.map(p => renderProductChip(p, 'orange')).join('')
            : '<div class="text-xs text-gray-400 italic px-2 py-2">A chưa có sản phẩm nào B chưa biết</div>';

        return `
            <div class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-5">
                <div class="px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <span class="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">CẶP #${idx + 1}</span>
                        <span class="text-sm font-semibold text-gray-700">${escapeHtml(u1.ten_dang_nhap)} ↔ ${escapeHtml(u2.ten_dang_nhap)}</span>
                        <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">${sharedInteract.length} SP cùng mua</span>
                    </div>
                    ${simBadge(pair.similarity)}
                </div>

                <div class="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    ${userCol(u1, 'KHÁCH HÀNG A', 'blue')}
                    ${userCol(u2, 'KHÁCH HÀNG B', 'purple')}
                </div>

                <div class="px-5 pb-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div class="text-xs font-bold text-emerald-700 uppercase mb-1">📂 Danh mục cùng quan tâm</div>
                        <div class="flex flex-wrap gap-1">${renderTagList(pair.sharedCategories, 'emerald')}</div>
                    </div>
                    <div class="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                        <div class="text-xs font-bold text-cyan-700 uppercase mb-1">🏷️ Thương hiệu cùng quan tâm</div>
                        <div class="flex flex-wrap gap-1">${renderTagList(pair.sharedBrands, 'cyan')}</div>
                    </div>
                </div>

                <div class="px-5 pb-5">
                    <!-- ĐIỂM CHUNG CHÍNH XÁC: sản phẩm cả 2 cùng mua (cốt lõi CF) -->
                    <div class="bg-emerald-50 rounded-lg p-3 border-2 border-emerald-300 mb-3">
                        <div class="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-2">
                            <span>🤝</span> Sản phẩm CẢ 2 cùng MUA (${sharedInteract.length})
                            <span class="text-[10px] font-normal text-emerald-600 normal-case">— Điểm chung tạo ra similarity</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">${sharedInteractHtml}</div>
                    </div>

                    <!-- Gợi ý chéo sản phẩm đã mua -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div class="bg-orange-50 rounded-lg p-3 border border-orange-100">
                            <div class="text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-2">
                                <span>💡</span> Gợi ý cho ${escapeHtml(u1.ten_dang_nhap)} (${recForU1.length})
                                <span class="text-[10px] font-normal text-gray-500 normal-case">(SP B đã mua mà A chưa biết)</span>
                            </div>
                            <div class="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">${rec1Html}</div>
                        </div>
                        <div class="bg-orange-50 rounded-lg p-3 border border-orange-100">
                            <div class="text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-2">
                                <span>💡</span> Gợi ý cho ${escapeHtml(u2.ten_dang_nhap)} (${recForU2.length})
                                <span class="text-[10px] font-normal text-gray-500 normal-case">(SP A đã mua mà B chưa biết)</span>
                            </div>
                            <div class="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">${rec2Html}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    // Header + summary statistics
    const totalPairs = cfData.length;
    const highSim = cfData.filter(p => p.similarity >= 0.8).length;
    const midSim = cfData.filter(p => p.similarity >= 0.5 && p.similarity < 0.8).length;
    const lowSim = totalPairs - highSim - midSim;

    const header = `
        <div class="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-5 mb-5">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
                <span>🤝</span> Lọc Cộng Tác — Các cặp khách hàng có sản phẩm tương tác chung
            </h3>
            <p class="text-purple-100 text-sm mt-2">
                Chỉ ghép cặp khi 2 khách hàng có sản phẩm cùng tương tác. Gợi ý chéo lấy từ tất cả sản phẩm bên kia đã mua mà bên này chưa biết — đúng tinh thần "ai mua sản phẩm thì gợi ý cho nhau".
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div class="bg-white/20 rounded-lg p-3 text-white">
                    <div class="text-2xl font-bold">${totalPairs}</div>
                    <div class="text-xs uppercase tracking-wide opacity-90">Tổng cặp</div>
                </div>
                <div class="bg-green-500/30 rounded-lg p-3 text-white">
                    <div class="text-2xl font-bold">${highSim}</div>
                    <div class="text-xs uppercase tracking-wide opacity-90">Rất tương đồng (≥80%)</div>
                </div>
                <div class="bg-blue-500/30 rounded-lg p-3 text-white">
                    <div class="text-2xl font-bold">${midSim}</div>
                    <div class="text-xs uppercase tracking-wide opacity-90">Tương đồng (50-79%)</div>
                </div>
                <div class="bg-yellow-500/30 rounded-lg p-3 text-white">
                    <div class="text-2xl font-bold">${lowSim}</div>
                    <div class="text-xs uppercase tracking-wide opacity-90">Khác (<50%)</div>
                </div>
            </div>
        </div>`;

    // Chỉ hiển thị top 30 cặp đáng chú ý nhất để tránh DOM quá nặng
    const displayPairs = cfData.slice(0, 30);
    const pairsHtml = displayPairs.map((p, i) => renderPair(p, i)).join('');
    const tail = cfData.length > 30
        ? `<div class="text-center text-sm text-gray-500 italic mt-4">Hiển thị 30/${cfData.length} cặp tương đồng nhất.</div>`
        : '';

    container.innerHTML = header + pairsHtml + tail;
}

// ==========================================
// KHẢO SÁT KHÁCH HÀNG - ĐÃ GỘPVÀO TAB PERSONALIZATION
// ==========================================
// Customer Surveys code đã được gộp vào tab Personalization - Profiles

// View Survey Detail Modal
function viewSurveyDetail(userId) {
    if (!persRawData) return;
    const profile = persRawData.userProfiles.find(p => p.ma_tai_khoan === userId);
    if (!profile) {
        alert('Không tìm thấy thông tin khảo sát');
        return;
    }

    const surveyCategories = Array.isArray(profile.danh_muc_quan_tam) ? profile.danh_muc_quan_tam : [];
    const surveyBrands = Array.isArray(profile.thuong_hieu_yeu_thich) ? profile.thuong_hieu_yeu_thich : [];

    const modalHtml = `
        <div id="surveyDetailModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onclick="closeSurveyDetail()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 rounded-t-2xl flex items-center justify-between border-b-4 border-amber-500">
                    <div>
                        <h3 class="text-xl font-black tracking-tight flex items-center gap-2">
                            <span class="text-2xl">📋</span>
                            Chi tiết Khảo sát Cá nhân hóa
                        </h3>
                        <p class="text-sm text-slate-300 mt-1 font-medium">${profile.ten_dang_nhap} <span class="text-slate-400">(ID: ${profile.ma_tai_khoan})</span></p>
                    </div>
                    <button onclick="closeSurveyDetail()" class="text-white hover:bg-white/10 rounded-xl p-2 transition-all active:scale-95">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6 space-y-5 bg-gradient-to-b from-slate-50 to-white">
                    ${!profile.da_hoan_thanh_khao_sat ? 
                        '<div class="text-center py-16"><div class="text-7xl mb-4 opacity-30">📋</div><p class="text-slate-400 text-lg font-medium">Khách hàng chưa hoàn thành khảo sát</p></div>' 
                        : 
                        `
                        <!-- Mục đích sử dụng -->
                        <div class="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-b-4 border-blue-700">
                                    <span class="text-2xl">🎯</span>
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-800 text-base">Mục đích sử dụng chính</h4>
                                    <p class="text-xs text-slate-500 font-medium">Primary use case</p>
                                </div>
                            </div>
                            <div class="pl-15">
                                ${profile.muc_dich_su_dung ? 
                                    '<div class="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 border-b-4 border-blue-700 hover:from-blue-600 hover:to-blue-700 transition-all">' + profile.muc_dich_su_dung + '</div>' 
                                    : '<span class="text-slate-400 italic font-medium">Chưa chọn</span>'}
                            </div>
                        </div>

                        <!-- Ngân sách -->
                        <div class="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 border-b-4 border-emerald-700">
                                    <span class="text-2xl">💰</span>
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-800 text-base">Phân khúc ngân sách</h4>
                                    <p class="text-xs text-slate-500 font-medium">Budget range</p>
                                </div>
                            </div>
                            <div class="pl-15">
                                ${profile.phan_khuc_ngan_sach ? 
                                    '<div class="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 border-b-4 border-emerald-700 hover:from-emerald-600 hover:to-emerald-700 transition-all">' + profile.phan_khuc_ngan_sach + '</div>' 
                                    : '<span class="text-slate-400 italic font-medium">Chưa chọn</span>'}
                            </div>
                        </div>

                        <!-- Danh mục quan tâm -->
                        <div class="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 border-b-4 border-orange-700">
                                    <span class="text-2xl">🏷️</span>
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-800 text-base">Thiết bị quan tâm <span class="text-orange-600">(${surveyCategories.length})</span></h4>
                                    <p class="text-xs text-slate-500 font-medium">Product categories</p>
                                </div>
                            </div>
                            <div class="pl-15 flex flex-wrap gap-2">
                                ${surveyCategories.length > 0 ? 
                                    surveyCategories.map(cat => '<span class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30 border-b-3 border-orange-700 hover:from-orange-600 hover:to-orange-700 transition-all">' + cat + '</span>').join('') 
                                    : '<span class="text-slate-400 italic font-medium">Chưa chọn</span>'}
                            </div>
                        </div>

                        <!-- Thương hiệu yêu thích -->
                        <div class="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 border-b-4 border-red-700">
                                    <span class="text-2xl">⭐</span>
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-800 text-base">Thương hiệu yêu thích <span class="text-red-600">(${surveyBrands.length})</span></h4>
                                    <p class="text-xs text-slate-500 font-medium">Favorite brands</p>
                                </div>
                            </div>
                            <div class="pl-15 flex flex-wrap gap-2">
                                ${surveyBrands.length > 0 ? 
                                    surveyBrands.map(brand => '<span class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30 border-b-3 border-red-700 hover:from-red-600 hover:to-red-700 transition-all">' + brand + '</span>').join('') 
                                    : '<span class="text-slate-400 italic font-medium">Chưa chọn</span>'}
                            </div>
                        </div>
                        `
                    }
                </div>

                <!-- Footer -->
                <div class="sticky bottom-0 bg-slate-100 px-6 py-4 rounded-b-2xl border-t-2 border-slate-200 flex justify-end gap-3">
                    <button onclick="closeSurveyDetail()" class="px-6 py-2.5 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-lg transition-all shadow-lg shadow-slate-700/30 border-b-4 border-slate-900 active:border-b-0 active:mt-1">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeSurveyDetail() {
    const modal = document.getElementById('surveyDetailModal');
    if (modal) modal.remove();
}

// ==========================================
// THUẬT TOÁN ĐỘ PHỔ BIẾN (POPULARITY RECOMMENDATIONS)
// ==========================================
async function loadAlgorithmData() {
    try {
        const tableBody = document.getElementById('algorithm-data-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-10 text-center text-gray-500 font-medium">
                        <div class="flex items-center justify-center gap-2">
                            <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang cập nhật dữ liệu thuật toán từ hệ thống...
                        </div>
                    </td>
                </tr>
            `;
        }
        
        const res = await apiCall('/recommendations/popularity-stats');
        if (res && res.success && res.data) {
            renderAlgorithmData(res.data);
        } else {
            showNotification(res?.message || 'Không thể tải thống kê độ phổ biến', 'error');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-10 text-center text-red-500 font-semibold">
                            ⚠️ Lỗi: ${res?.message || 'Không thể lấy dữ liệu từ server'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (e) {
        console.error('Error in loadAlgorithmData:', e);
        showNotification('Lỗi kết nối khi tải dữ liệu thuật toán', 'error');
        const tableBody = document.getElementById('algorithm-data-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-10 text-center text-red-500 font-semibold">
                        ⚠️ Lỗi kết nối máy chủ
                    </td>
                </tr>
            `;
        }
    }
}

// Cấu hình các thanh trượt tự động cân bằng + cập nhật biểu đồ donut & sơ đồ luồng
function updateSliders(changed) {
    const sliderCf = document.getElementById('slider-cf');
    const sliderCb = document.getElementById('slider-cb');
    const sliderPop = document.getElementById('slider-pop');

    if (!sliderCf || !sliderCb || !sliderPop) return;

    let cf = parseInt(sliderCf.value);
    let cb = parseInt(sliderCb.value);
    let pop = parseInt(sliderPop.value);

    if (changed === 'cf') {
        const remaining = 100 - cf;
        const currentOthersSum = cb + pop;
        if (currentOthersSum > 0) {
            cb = Math.round((cb / currentOthersSum) * remaining);
            pop = remaining - cb;
        } else {
            cb = Math.round(remaining / 2);
            pop = remaining - cb;
        }
    } else if (changed === 'cb') {
        const remaining = 100 - cb;
        const currentOthersSum = cf + pop;
        if (currentOthersSum > 0) {
            cf = Math.round((cf / currentOthersSum) * remaining);
            pop = remaining - cf;
        } else {
            cf = Math.round(remaining / 2);
            pop = remaining - cf;
        }
    } else if (changed === 'pop') {
        const remaining = 100 - pop;
        const currentOthersSum = cf + cb;
        if (currentOthersSum > 0) {
            cf = Math.round((cf / currentOthersSum) * remaining);
            cb = remaining - cf;
        } else {
            cf = Math.round(remaining / 2);
            cb = remaining - cf;
        }
    }

    // Đảm bảo tổng chính xác bằng 100
    const total = cf + cb + pop;
    if (total !== 100) {
        const diff = 100 - total;
        if (changed !== 'cf') cf += diff;
        else if (changed !== 'cb') cb += diff;
        else pop += diff;
    }

    sliderCf.value = cf;
    sliderCb.value = cb;
    sliderPop.value = pop;

    // --- Slider value labels ---
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val + '%'; };
    setTxt('slider-cf-val', cf);
    setTxt('slider-cb-val', cb);
    setTxt('slider-pop-val', pop);

    // --- Stacked bar ---
    const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };
    setW('visual-weight-cf', cf);
    setW('visual-weight-cb', cb);
    setW('visual-weight-pop', pop);

    // --- Legend labels in donut card ---
    setTxt('legend-cf', cf);
    setTxt('legend-cb', cb);
    setTxt('legend-pop', pop);

    // --- Flow diagram percentage badges ---
    setTxt('flow-cf-pct', cf);
    setTxt('flow-cb-pct', cb);
    setTxt('flow-pop-pct', pop);

    // --- Donut SVG (circumference of r=45 circle = 2π×45 ≈ 282.74) ---
    const C = 282.74;
    const cfDash  = (cf  / 100) * C;
    const cbDash  = (cb  / 100) * C;
    const popDash = (pop / 100) * C;
    // CF starts at 0-offset; CB starts after CF; POP starts after CF+CB
    const cfOffset  = 0;
    const cbOffset  = -(cfDash);
    const popOffset = -(cfDash + cbDash);
    const setDonut = (id, dash, offset) => {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('stroke-dasharray', dash + ' ' + (C - dash));
            el.setAttribute('stroke-dashoffset', offset);
        }
    };
    setDonut('donut-cf',  cfDash,  cfOffset);
    setDonut('donut-cb',  cbDash,  cbOffset);
    setDonut('donut-pop', popDash, popOffset);

    // --- Total indicator ---
    const totalVal  = document.getElementById('slider-total-val');
    const totalWarn = document.getElementById('slider-total-warn');
    if (totalVal) totalVal.textContent = cf + cb + pop;
    if (totalWarn) {
        totalWarn.className = 'mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm font-bold text-green-700';
        totalWarn.innerHTML = '✅ Tổng trọng số: <span id="slider-total-val">' + (cf + cb + pop) + '</span>% &nbsp;—&nbsp; Hợp lệ';
    }
}

// Khởi tạo donut chart khi trang load
function initDonutChart() {
    updateSliders('_init');
}

// Nạp cấu hình trọng số gợi ý hiện tại
async function loadRecommendationConfig() {
    try {
        const res = await apiCall('/recommendations/config');
        if (res && res.success && res.data) {
            const { cf, cb, pop } = res.data;
            const cfPct  = Math.round(cf  * 100);
            const cbPct  = Math.round(cb  * 100);
            const popPct = 100 - cfPct - cbPct;

            const sliderCf  = document.getElementById('slider-cf');
            const sliderCb  = document.getElementById('slider-cb');
            const sliderPop = document.getElementById('slider-pop');

            if (sliderCf)  sliderCf.value  = cfPct;
            if (sliderCb)  sliderCb.value  = cbPct;
            if (sliderPop) sliderPop.value = popPct;

            // Sync tất cả UI (slider labels, donut, legend, flow) qua updateSliders
            updateSliders('_load');
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

// Lưu cấu hình trọng số lên backend
async function saveHybridConfig() {
    try {
        const cfVal = parseInt(document.getElementById('slider-cf').value) / 100;
        const cbVal = parseInt(document.getElementById('slider-cb').value) / 100;
        const popVal = parseInt(document.getElementById('slider-pop').value) / 100;

        const res = await apiCall('/recommendations/config', 'POST', {
            cf: cfVal,
            cb: cbVal,
            pop: popVal
        });

        if (res && res.success) {
            showNotification('Lưu cấu hình trọng số thành công!', 'success');
            // Cập nhật preview nếu đang có user được chọn
            loadHybridPreview();
        } else {
            showNotification(res.message || 'Lỗi khi lưu cấu hình', 'error');
        }
    } catch (e) {
        console.error('Error saving weights:', e);
        showNotification('Không thể kết nối máy chủ để lưu cấu hình', 'error');
    }
}

// Nạp danh sách khách hàng vào selectbox Xem trước
async function loadPreviewUsers() {
    try {
        const select = document.getElementById('preview-user-select');
        if (!select) return;

        const res = await apiCall('/admin/users');
        if (res && res.success && res.data) {
            // Chỉ hiển thị các khách hàng thông thường để preview (hoặc tất cả)
            const customers = res.data.filter(u => u.vai_tro === 'khach_hang');
            select.innerHTML = '<option value="">-- Chọn khách hàng --</option>' + 
                customers.map(c => `<option value="${c.ma_tai_khoan}">${c.ten_dang_nhap} (${c.email})</option>`).join('');
        } else {
            select.innerHTML = '<option value="">Lỗi nạp danh sách</option>';
        }
    } catch (e) {
        console.error('Error loading preview users:', e);
    }
}

// Xem trước gợi ý hybrid của khách hàng được chọn
async function loadHybridPreview() {
    const userId = document.getElementById('preview-user-select')?.value;
    const container = document.getElementById('preview-products-container');
    if (!container) return;

    if (!userId) {
        container.innerHTML = `
            <div class="text-center py-20 text-slate-400 italic text-sm font-medium">
                Vui lòng chọn khách hàng phía trên để xem trước danh mục sản phẩm gợi ý
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="text-center py-20 text-slate-500 font-medium">
            <div class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo kết quả gợi ý kết hợp...
            </div>
        </div>
    `;

    try {
        const res = await apiCall(`/recommendations/user/${userId}`);
        if (res && res.success && res.data) {
            const products = res.data;
            if (products.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-20 text-slate-400 italic text-sm font-medium">
                        Không có sản phẩm gợi ý nào cho người dùng này.
                    </div>
                `;
                return;
            }

            const formatPrice = (v) => new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + 'đ';

            container.innerHTML = products.map((p, idx) => {
                let badgeTxt = 'Gợi ý';
                let badgeCls = 'bg-gray-100 text-gray-800';
                if (p.recommendation_type === 'collaborative') {
                    badgeTxt = `👥 Lọc cộng tác (${p.match_score || 98}%)`;
                    badgeCls = 'bg-blue-50 text-blue-700 border border-blue-200';
                } else if (p.recommendation_type === 'preference') {
                    badgeTxt = `💖 Lọc nội dung / Sở thích (${p.match_score || 95}%)`;
                    badgeCls = 'bg-rose-50 text-rose-700 border border-rose-200';
                } else if (p.recommendation_type === 'popular') {
                    badgeTxt = `🔥 Độ phổ biến / Bán chạy`;
                    badgeCls = 'bg-amber-50 text-amber-700 border border-amber-200';
                }

                const imgUrl = getImageUrl(p.anh_chinh || p.duong_dan_anh);

                return `
                    <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-all">
                        <span class="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 shadow-sm">${idx + 1}</span>
                        <img src="${imgUrl}" class="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" onerror="this.src='${PLACEHOLDER_IMG}'">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-xs font-bold text-slate-800 truncate" title="${p.ten_san_pham}">${p.ten_san_pham}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[10px] font-bold ${badgeCls} px-2 py-0.5 rounded-full">${badgeTxt}</span>
                                <span class="text-[10px] text-slate-400 font-semibold">${p.thuong_hieu || ''}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-extrabold text-red-600">${formatPrice(p.gia)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-20 text-red-500 font-semibold text-sm">
                    ⚠️ Lỗi: Không thể tải sản phẩm gợi ý
                </div>
            `;
        }
    } catch (e) {
        console.error('Error loading hybrid preview:', e);
        container.innerHTML = `
            <div class="text-center py-20 text-red-500 font-semibold text-sm">
                ⚠️ Lỗi kết nối đến máy chủ
            </div>
        `;
    }
}

function renderAlgorithmData(products) {
    const tableBody = document.getElementById('algorithm-data-table');
    if (!tableBody) return;

    if (!products || products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-10 text-center text-gray-400 italic">
                    Chưa có tương tác nào từ người dùng để tính toán độ phổ biến.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = products.map((p, index) => {
        const rank = index + 1;
        
        // Highlight top 3 ranks
        let rankBadge = '';
        if (rank === 1) {
            rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm shadow-md animate-bounce">1️⃣</span>';
        } else if (rank === 2) {
            rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400 text-white font-black text-sm shadow-md">2️⃣</span>';
        } else if (rank === 3) {
            rankBadge = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm shadow-md">3️⃣</span>';
        } else {
            rankBadge = `<span class="text-gray-500 font-bold">${rank}</span>`;
        }

        const imgUrl = getImageUrl(p.anh_chinh);
        
        let usersHtml = '';
        if (p.recent_users && p.recent_users.length > 0) {
            usersHtml = `
                <div class="flex items-center -space-x-2 overflow-hidden ml-2" title="Tương tác gần đây">
                    ${p.recent_users.map(u => {
                        const initials = u.name.substring(0, 2).toUpperCase();
                        let hash = 0;
                        for (let i = 0; i < u.name.length; i++) {
                            hash = u.name.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500'];
                        const colorClass = colors[Math.abs(hash) % colors.length];

                        if (u.avatar) {
                            const avatarUrl = u.avatar.startsWith('http') ? u.avatar : window.location.origin + u.avatar;
                            return `
                                <div class="relative inline-block h-6 w-6 rounded-full ring-2 ring-white">
                                    <img class="h-full w-full rounded-full object-cover" 
                                         src="${avatarUrl}" 
                                         alt="${u.name}" 
                                         title="${u.name}"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <span class="hidden items-center justify-center h-full w-full rounded-full ${colorClass} text-[10px] font-black text-white" 
                                          title="${u.name}">${initials}</span>
                                </div>
                            `;
                        } else {
                            return `
                                <span class="inline-flex items-center justify-center h-6 w-6 rounded-full ${colorClass} text-[10px] font-black text-white ring-2 ring-white" 
                                      title="${u.name}">${initials}</span>
                            `;
                        }
                    }).join('')}
                </div>
            `;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-gray-100">
                <td class="px-6 py-4 text-center whitespace-nowrap">${rankBadge}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${imgUrl}" class="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" alt="${p.ten_san_pham}" onerror="this.src='${PLACEHOLDER_IMG}'">
                        <div class="max-w-[280px]">
                            <p class="font-bold text-gray-800 truncate" title="${p.ten_san_pham}">${p.ten_san_pham}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-indigo-100">${p.ten_danh_muc || 'Không rõ'}</span>
                                <span class="text-xs text-gray-400 font-medium">${p.thuong_hieu || ''}</span>
                                ${usersHtml}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        🛒 ${p.luot_mua}
                    </span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        👆 ${p.luot_click}
                    </span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        👁️ ${p.luot_xem_50s}
                    </span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        🔍 ${p.luot_tim}
                    </span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap font-bold text-gray-700">
                    <span class="text-amber-500">⭐</span> ${p.diem_danh_gia > 0 ? p.diem_danh_gia.toFixed(1) : '0.0'}
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm">
                        ${p.popularity_score}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

window.loadAlgorithmData = loadAlgorithmData;
window.renderAlgorithmData = renderAlgorithmData;
window.updateSliders = updateSliders;
window.saveHybridConfig = saveHybridConfig;
window.loadHybridPreview = loadHybridPreview;

// ==========================================
// CHATBOT MANAGER MODULE
// ==========================================
let currentChatbotTab = 'docs';

function loadChatbotManager() {
    switchChatbotTab('docs');
}

function switchChatbotTab(tab) {
    currentChatbotTab = tab;
    
    const docsBtn = document.getElementById('chatbot-tab-docs');
    const historyBtn = document.getElementById('chatbot-tab-history');
    const docsContent = document.getElementById('chatbot-content-docs');
    const historyContent = document.getElementById('chatbot-content-history');
    
    if (tab === 'docs') {
        if (docsBtn) docsBtn.className = 'flex-1 py-2.5 text-xs font-black rounded-lg transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_3px_8px_rgba(217,119,6,0.25),_inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 active:scale-[0.98] active:translate-y-0.5 cursor-pointer uppercase tracking-wider';
        if (historyBtn) historyBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider';
        if (docsContent) docsContent.classList.remove('hidden');
        if (historyContent) historyContent.classList.add('hidden');
        loadChatbotDocs();
    } else {
        if (historyBtn) historyBtn.className = 'flex-1 py-2.5 text-xs font-black rounded-lg transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_3px_8px_rgba(217,119,6,0.25),_inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-1.5 active:scale-[0.98] active:translate-y-0.5 cursor-pointer uppercase tracking-wider';
        if (docsBtn) docsBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider';
        if (historyContent) historyContent.classList.remove('hidden');
        if (docsContent) docsContent.classList.add('hidden');
        loadChatbotHistory();
    }
}

async function loadChatbotDocs() {
    try {
        const res = await fetch('/api/admin/chatbot/documents', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await res.json();
        if (!result.success) {
            alert(result.message || 'Lỗi tải danh sách tài liệu');
            return;
        }
        
        const listContainer = document.getElementById('chatbot-docs-list');
        if (!listContainer) return;
        
        if (result.data.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-12 text-slate-400">
                    <div class="text-5xl mb-3">📄</div>
                    <p>Chưa có tài liệu RAG nào được lưu.</p>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = result.data.map(doc => {
            const dateStr = new Date(doc.updatedAt).toLocaleString('vi-VN');
            const sizeKB = (doc.size / 1024).toFixed(2);
            return `
                <div class="bg-white/60 backdrop-blur-md rounded-xl p-5 border border-slate-200/60 hover:border-amber-500/30 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.02),_inset_0_1px_1px_white]">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xl">📄</span>
                            <h4 class="font-bold text-slate-800">${doc.filename}</h4>
                            <span class="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200/50 text-[10px]">${sizeKB} KB</span>
                        </div>
                        <p class="text-xs text-slate-400 mb-2">Cập nhật lúc: ${dateStr}</p>
                        <p class="text-sm text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 font-mono text-xs leading-relaxed max-h-16 overflow-hidden">${doc.snippet}</p>
                    </div>
                    <div class="flex gap-2 self-end md:self-center">
                        <button onclick="editChatbotDoc('${doc.filename}')" class="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shadow-[0_2px_4px_rgba(0,0,0,0.05),_inset_0_1px_1px_white] transition-all cursor-pointer">
                            ✏️ Sửa
                        </button>
                        <button onclick="deleteChatbotDoc('${doc.filename}')" class="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 border border-red-200/50 shadow-[0_2px_4px_rgba(239,68,68,0.08),_inset_0_1px_1px_white] transition-all cursor-pointer">
                            🗑️ Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Load chatbot docs error:', error);
    }
}

async function editChatbotDoc(filename) {
    try {
        let content = '';
        let isEdit = false;
        
        if (filename) {
            const res = await fetch(`/api/admin/chatbot/documents/${filename}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            const result = await res.json();
            if (result.success) {
                content = result.data.content;
                isEdit = true;
            } else {
                alert('Không thể đọc nội dung tài liệu');
                return;
            }
        }
        
        document.getElementById('chatbot-doc-filename').value = filename || '';
        document.getElementById('chatbot-doc-filename').disabled = isEdit;
        document.getElementById('chatbot-doc-content').value = content;
        
        document.getElementById('chatbot-doc-modal-title').textContent = isEdit ? '✏️ Chỉnh sửa tài liệu RAG' : '➕ Thêm tài liệu RAG mới';
        
        const modal = document.getElementById('chatbot-doc-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('active'), 10);
        }
    } catch (error) {
        console.error('Edit doc error:', error);
    }
}

function closeChatbotDocModal() {
    const modal = document.getElementById('chatbot-doc-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

async function saveChatbotDoc(e) {
    if (e) e.preventDefault();
    
    const filename = document.getElementById('chatbot-doc-filename').value.trim();
    const content = document.getElementById('chatbot-doc-content').value;
    
    if (!filename) {
        alert('Vui lòng nhập tên file');
        return;
    }
    
    if (!filename.endsWith('.md') && !filename.endsWith('.txt')) {
        alert('Tên file phải kết thúc bằng đuôi .md hoặc .txt');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/chatbot/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ filename, content })
        });
        const result = await res.json();
        if (result.success) {
            alert('Lưu tài liệu RAG thành công!');
            closeChatbotDocModal();
            loadChatbotDocs();
        } else {
            alert(result.message || 'Lỗi lưu tài liệu');
        }
    } catch (error) {
        console.error('Save doc error:', error);
        alert('Lỗi lưu tài liệu');
    }
}

async function deleteChatbotDoc(filename) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${filename}"? AI sẽ không học từ tài liệu này nữa.`)) return;
    
    try {
        const res = await fetch(`/api/admin/chatbot/documents/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await res.json();
        if (result.success) {
            alert('Đã xóa tài liệu RAG');
            loadChatbotDocs();
        } else {
            alert(result.message || 'Lỗi khi xóa tài liệu');
        }
    } catch (error) {
        console.error('Delete doc error:', error);
    }
}

async function loadChatbotHistory() {
    try {
        const res = await fetch('/api/admin/chatbot/history', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await res.json();
        if (!result.success) {
            alert('Lỗi tải lịch sử chatbot');
            return;
        }
        
        const historyContainer = document.getElementById('chatbot-history-table');
        if (!historyContainer) return;
        
        if (result.data.length === 0) {
            historyContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Chưa có lịch sử cuộc trò chuyện nào</td>
                </tr>`;
            return;
        }
        
        historyContainer.innerHTML = result.data.map(chat => {
            const dateStr = new Date(chat.ngay_chat).toLocaleString('vi-VN');
            const cleanAnswer = chat.tra_loi ? chat.tra_loi.replace(/<[^>]*>?/gm, ' ') : '';
            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-xs">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-bold text-slate-800 text-sm">${chat.ten_dang_nhap || 'Khách vãng lai'}</div>
                        <div class="text-xs text-slate-400">${chat.email || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700 font-semibold max-w-xs truncate">${chat.cau_hoi}</td>
                    <td class="px-6 py-4 text-xs text-slate-500 max-w-sm truncate" title="${cleanAnswer}">${cleanAnswer}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button onclick="deleteChatbotHistory(${chat.ma_lich_su})" class="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-red-200/50 shadow-sm transition-all cursor-pointer" title="Xóa log">🗑️ Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Load history error:', error);
    }
}

async function deleteChatbotHistory(ma_lich_su) {
    if (!confirm('Bạn có chắc muốn xóa cuộc hội thoại này khỏi lịch sử hệ thống?')) return;
    
    try {
        const res = await fetch(`/api/admin/chatbot/history/${ma_lich_su}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await res.json();
        if (result.success) {
            alert('Đã xóa log hội thoại');
            loadChatbotHistory();
        } else {
            alert('Lỗi khi xóa log hội thoại');
        }
    } catch (error) {
        console.error('Delete history log error:', error);
    }
}

// ==========================================
// WARRANTY TICKETS - PHIẾU BẢO HÀNH
// ==========================================
async function loadWarranties() {
    try {
        const searchVal = document.getElementById('warranty-search-input')?.value || '';
        const statusVal = document.getElementById('warranty-status-filter')?.value || '';
        
        let url = `/admin/warranties?search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}`;
        const response = await apiCall(url);
        
        if (!response.success) {
            console.error('Lỗi lấy danh sách phiếu bảo hành:', response.message);
            return;
        }
        
        const tickets = response.data || [];
        
        // Thống kê
        let total = tickets.length;
        let active = 0;
        let expired = 0;
        
        let allTickets = tickets;
        if (statusVal !== '' || searchVal !== '') {
            const allRes = await apiCall('/admin/warranties');
            if (allRes.success) {
                allTickets = allRes.data || [];
            }
        }
        
        const now = new Date();
        allTickets.forEach(t => {
            if (t.ngay_tra) {
                const expiry = new Date(t.ngay_tra);
                if (expiry >= now) active++;
                else expired++;
            } else {
                if (t.trang_thai === 'Còn hạn' || t.trang_thai === 'Đang xử lý' || t.trang_thai === 'Đã sửa xong' || t.trang_thai === 'Đã trả khách') active++;
                else expired++;
            }
        });
        
        document.getElementById('warranty-stat-total').textContent = allTickets.length;
        document.getElementById('warranty-stat-processing').textContent = active;
        document.getElementById('warranty-stat-repaired').textContent = expired;
        
        // Render bảng
        const tbody = document.getElementById('warranty-table-body');
        if (!tbody) return;
        
        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-slate-400 italic">Không tìm thấy phiếu bảo hành nào</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = tickets.map(t => {
            let displayStatus = 'Còn hạn';
            let statusClass = 'bg-green-50 text-green-700 border-green-200';
            
            if (t.ngay_tra) {
                const expiry = new Date(t.ngay_tra);
                if (expiry < now) {
                    displayStatus = 'Hết hạn';
                    statusClass = 'bg-red-50 text-red-700 border-red-200';
                }
            } else {
                if (t.trang_thai && t.trang_thai !== 'Còn hạn' && t.trang_thai !== 'Đang xử lý' && t.trang_thai !== 'Đã sửa xong' && t.trang_thai !== 'Đã trả khách') {
                    displayStatus = 'Hết hạn';
                    statusClass = 'bg-red-50 text-red-700 border-red-200';
                }
            }
            
            const ngayNhan = t.ngay_nhan ? formatDate(t.ngay_nhan) : 'Chưa rõ';
            const ngayTra = t.ngay_tra ? formatDate(t.ngay_tra) : 'Không xác định';
            
            let sourceHtml = '';
            if (t.ma_hoa_don) {
                sourceHtml = `<span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">🛒 Online ĐH #${t.ma_hoa_don}</span>`;
            } else if (t.ma_hoa_don_bh) {
                sourceHtml = `<span class="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">🧾 Offline HĐ #${t.ma_hoa_don_bh}</span>`;
            } else {
                sourceHtml = `<span class="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded italic">Tạo thủ công</span>`;
            }
            
            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="px-6 py-4 font-bold text-slate-800">#BH${t.ma_phieu_bh}</td>
                    <td class="px-6 py-4">
                        <div class="font-semibold text-slate-800 text-sm">${t.ten_khach_hang}</div>
                        <div class="text-xs text-slate-400 font-mono">${t.so_dien_thoai}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-medium text-slate-700 max-w-xs truncate" title="${t.ten_san_pham}">${t.ten_san_pham}</div>
                        <div class="mt-1">${sourceHtml}</div>
                    </td>
                    <td class="px-6 py-4 text-slate-700 font-semibold">${ngayNhan}</td>
                    <td class="px-6 py-4 text-teal-700 font-semibold">${ngayTra}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass}">
                            ${displayStatus}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="printWarrantyCard(${t.ma_phieu_bh})" class="bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 text-teal-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-teal-200/50 shadow-sm transition-all cursor-pointer">🖨️ In thẻ</button>
                            <button onclick="openWarrantyModal(${t.ma_phieu_bh})" class="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-200/50 shadow-sm transition-all cursor-pointer">✏️ Sửa</button>
                            <button onclick="deleteWarrantyTicket(${t.ma_phieu_bh})" class="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-red-200/50 shadow-sm transition-all cursor-pointer">🗑️ Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Load warranties list error:', error);
    }
}




async function openWarrantyModal(id = null) {
    const modal = document.getElementById('warranty-modal');
    const lookupSection = document.getElementById('warranty-lookup-section');
    const form = document.getElementById('warranty-form');
    
    form.reset();
    document.getElementById('warranty-ticket-id').value = '';
    document.getElementById('warranty-ma-hd-bh').value = '';
    document.getElementById('warranty-ma-hd').value = '';
    document.getElementById('warranty-lookup-query').value = '';
    document.getElementById('warranty-lookup-results').classList.add('hidden');
    document.getElementById('warranty-lookup-results').innerHTML = '';
    
    if (id) {
        document.getElementById('warranty-modal-action-text').textContent = 'Cập nhật phiếu bảo hành';
        lookupSection.classList.add('hidden');
        
        try {
            const response = await apiCall(`/admin/warranties`);
            if (response.success) {
                const ticket = response.data.find(t => t.ma_phieu_bh === id);
                if (ticket) {
                    document.getElementById('warranty-ticket-id').value = ticket.ma_phieu_bh;
                    document.getElementById('warranty-ma-hd-bh').value = ticket.ma_hoa_don_bh || '';
                    document.getElementById('warranty-ma-hd').value = ticket.ma_hoa_don || '';
                    
                    document.getElementById('warranty-customer-name').value = ticket.ten_khach_hang;
                    document.getElementById('warranty-customer-phone').value = ticket.so_dien_thoai;
                    document.getElementById('warranty-product-name').value = ticket.ten_san_pham;
                    
                    if (ticket.ngay_nhan) {
                        const d = new Date(ticket.ngay_nhan);
                        const offset = d.getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                        document.getElementById('warranty-purchase-date').value = localISOTime;
                    } else {
                        document.getElementById('warranty-purchase-date').value = '';
                    }

                    if (ticket.ngay_tra) {
                        const d = new Date(ticket.ngay_tra);
                        const offset = d.getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                        document.getElementById('warranty-expiry-date').value = localISOTime;
                    } else {
                        document.getElementById('warranty-expiry-date').value = '';
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching warranty details:', error);
        }
    } else {
        document.getElementById('warranty-modal-action-text').textContent = 'Tạo phiếu bảo hành';
        lookupSection.classList.remove('hidden');
        
        const now = new Date();
        const offsetNow = now.getTimezoneOffset() * 60000;
        document.getElementById('warranty-purchase-date').value = (new Date(now.getTime() - offsetNow)).toISOString().slice(0, 16);
        
        const returnDate = new Date();
        returnDate.setFullYear(returnDate.getFullYear() + 1);
        const offset = returnDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(returnDate.getTime() - offset)).toISOString().slice(0, 16);
        document.getElementById('warranty-expiry-date').value = localISOTime;
    }
    
    modal.classList.add('active');
}

function closeWarrantyModal() {
    document.getElementById('warranty-modal').classList.remove('active');
}

async function searchPurchaseHistory() {
    const query = document.getElementById('warranty-lookup-query').value.trim();
    if (!query) {
        alert('Vui lòng nhập số điện thoại hoặc mã hóa đơn mua hàng!');
        return;
    }
    
    const resultsContainer = document.getElementById('warranty-lookup-results');
    resultsContainer.innerHTML = '<div class="p-4 text-center text-slate-500 italic">Đang tra cứu...</div>';
    resultsContainer.classList.remove('hidden');
    
    try {
        const response = await apiCall(`/admin/warranties/check-purchase?query=${encodeURIComponent(query)}`);
        if (!response.success) {
            resultsContainer.innerHTML = `<div class="p-4 text-center text-red-500 font-semibold">${response.message}</div>`;
            return;
        }
        
        const data = response.data || [];
        if (data.length === 0) {
            resultsContainer.innerHTML = `<div class="p-4 text-center text-slate-400 italic">Không tìm thấy lịch sử mua hàng nào khớp với thông tin trên</div>`;
            return;
        }
        
        resultsContainer.innerHTML = data.map(item => {
            const dateStr = formatDate(item.ngay_ban);
            const expDateStr = formatDate(item.expiry_date);
            const typeText = item.type === 'online' 
                ? `<span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold text-[10px]">Online - ĐH #${item.ma_hoa_don}</span>`
                : `<span class="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold text-[10px]">Offline - HĐ #${item.ma_hoa_don_bh}</span>`;
            
            const warrantyBadge = item.is_under_warranty 
                ? `<span class="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold text-[10px] border border-green-200">Còn bảo hành</span>`
                : `<span class="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold text-[10px] border border-red-200">Hết bảo hành</span>`;
                
            const itemEscaped = JSON.stringify(item).replace(/"/g, '&quot;');
            
            return `
                <div onclick="selectPurchaseItem('${itemEscaped}')" class="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col gap-1">
                    <div class="flex justify-between items-center text-xs">
                        ${typeText}
                        ${warrantyBadge}
                    </div>
                    <div class="font-bold text-slate-800 text-sm mt-0.5">${item.ten_san_pham}</div>
                    <div class="text-xs text-slate-500 flex justify-between">
                        <span>KH: <b>${item.ten_khach_hang || 'Khách lẻ'}</b> ${item.so_dien_thoai ? `(${item.so_dien_thoai})` : ''}</span>
                        <span>Mua ngày: <b>${dateStr}</b> (Hết hạn: ${expDateStr})</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Search purchase history error:', error);
        resultsContainer.innerHTML = `<div class="p-4 text-center text-red-500 font-semibold">Lỗi: ${error.message}</div>`;
    }
}



function formatLocalISOTime(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
}

function selectPurchaseItem(itemStr) {
    try {
        const item = JSON.parse(itemStr.replace(/&quot;/g, '"'));
        
        document.getElementById('warranty-ma-hd-bh').value = item.ma_hoa_don_bh || '';
        document.getElementById('warranty-ma-hd').value = item.ma_hoa_don || '';
        
        document.getElementById('warranty-customer-name').value = item.ten_khach_hang || '';
        document.getElementById('warranty-customer-phone').value = item.so_dien_thoai || document.getElementById('warranty-lookup-query').value;
        document.getElementById('warranty-product-name').value = item.ten_san_pham || '';
        
        if (item.ngay_ban) {
            document.getElementById('warranty-purchase-date').value = formatLocalISOTime(item.ngay_ban);
        }
        if (item.expiry_date) {
            document.getElementById('warranty-expiry-date').value = formatLocalISOTime(item.expiry_date);
        }
        
        document.getElementById('warranty-lookup-results').classList.add('hidden');
        showNotification('Đã điền tự động thông tin hóa đơn!', 'success');
    } catch (e) {
        console.error('Error selecting purchase item:', e);
    }
}

async function saveWarrantyTicket(event) {
    if (event) event.preventDefault();
    
    const ticketId = document.getElementById('warranty-ticket-id').value;
    const ma_hoa_don_bh = document.getElementById('warranty-ma-hd-bh').value;
    const ma_hoa_don = document.getElementById('warranty-ma-hd').value;
    
    const ten_khach_hang = document.getElementById('warranty-customer-name').value.trim();
    const so_dien_thoai = document.getElementById('warranty-customer-phone').value.trim();
    const ten_san_pham = document.getElementById('warranty-product-name').value.trim();
    
    const ngay_nhan = document.getElementById('warranty-purchase-date').value || null;
    const ngay_tra = document.getElementById('warranty-expiry-date').value || null;
    
    if (!ten_khach_hang || !so_dien_thoai || !ten_san_pham) {
        alert('Vui lòng nhập đầy đủ các trường bắt buộc (*)');
        return;
    }
    
    let trang_thai = 'Còn hạn';
    if (ngay_tra) {
        const expiry = new Date(ngay_tra);
        const now = new Date();
        if (expiry < now) {
            trang_thai = 'Hết hạn';
        }
    }
    
    const body = {
        ma_hoa_don_bh: ma_hoa_don_bh ? parseInt(ma_hoa_don_bh) : null,
        ma_hoa_don: ma_hoa_don ? parseInt(ma_hoa_don) : null,
        ten_khach_hang,
        so_dien_thoai,
        ten_san_pham,
        mo_ta_loi: '',
        trang_thai,
        chi_phi: 0,
        ngay_nhan,
        ngay_tra,
        ghi_chu: ''
    };
    
    try {
        const url = ticketId ? `/admin/warranties/${ticketId}` : '/admin/warranties';
        const method = ticketId ? 'PUT' : 'POST';
        
        const response = await apiCall(url, method, body);
        
        if (response.success) {
            showNotification(ticketId ? 'Cập nhật phiếu bảo hành thành công!' : 'Tạo phiếu bảo hành thành công!', 'success');
            closeWarrantyModal();
            loadWarranties();
        } else {
            alert(response.message || 'Có lỗi xảy ra khi lưu phiếu bảo hành!');
        }
    } catch (error) {
        console.error('Save warranty error:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function deleteWarrantyTicket(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu bảo hành này không?')) return;
    
    try {
        const response = await apiCall(`/admin/warranties/${id}`, 'DELETE');
        if (response.success) {
            showNotification('Đã xóa phiếu bảo hành!', 'success');
            loadWarranties();
        } else {
            alert(response.message || 'Lỗi khi xóa phiếu bảo hành!');
        }
    } catch (error) {
        console.error('Delete warranty error:', error);
        alert('Lỗi: ' + error.message);
    }
}

// ==========================================
// WARRANTY TABS & POLICY FUNCTIONS
// ==========================================
function switchWarrantyTab(tab) {
    const ticketsBtn = document.getElementById('warranty-tab-tickets-btn');
    const policyBtn = document.getElementById('warranty-tab-policy-btn');
    const ticketsContent = document.getElementById('warranty-content-tickets');
    const policyContent = document.getElementById('warranty-content-policy');
    
    if (tab === 'tickets') {
        if (ticketsBtn) ticketsBtn.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_4px_12px_rgba(20,184,166,0.25)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider scale-[1.02]';
        if (policyBtn) policyBtn.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider';
        if (ticketsContent) ticketsContent.classList.remove('hidden');
        if (policyContent) policyContent.classList.add('hidden');
        loadWarranties();
    } else {
        if (policyBtn) policyBtn.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_4px_12px_rgba(20,184,166,0.25)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider scale-[1.02]';
        if (ticketsBtn) ticketsBtn.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider';
        if (policyContent) policyContent.classList.remove('hidden');
        if (ticketsContent) ticketsContent.classList.add('hidden');
        loadWarrantyPolicy();
    }
}

async function loadWarrantyPolicy() {
    try {
        const warrantyEditor = document.getElementById('warranty-policy-editor');
        const returnEditor = document.getElementById('return-policy-editor');
        const privacyEditor = document.getElementById('privacy-policy-editor');
        const paymentEditor = document.getElementById('payment-policy-editor');
        
        if (warrantyEditor) warrantyEditor.value = 'Đang tải chính sách...';
        if (returnEditor) returnEditor.value = 'Đang tải chính sách...';
        if (privacyEditor) privacyEditor.value = 'Đang tải chính sách...';
        if (paymentEditor) paymentEditor.value = 'Đang tải chính sách...';
        
        const response = await apiCall('/admin/chatbot/documents/chinh_sach_cua_hang.md');
        if (response.success) {
            const fullContent = (response.data && response.data.content) || response.content || '';
            
            // Extract warranty policy section
            const warrantyMatch = fullContent.match(/## Chính sách bảo hành\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/i);
            const warrantyText = warrantyMatch ? warrantyMatch[1].trim() : '';
            
            // Extract return policy section
            const returnMatch = fullContent.match(/## Chính sách đổi trả sản phẩm\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/i);
            const returnText = returnMatch ? returnMatch[1].trim() : '';

            // Extract privacy policy section
            const privacyMatch = fullContent.match(/## Chính sách bảo mật\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/i);
            const privacyText = privacyMatch ? privacyMatch[1].trim() : '';

            // Extract payment guide section
            const paymentMatch = fullContent.match(/## Hướng dẫn thanh toán\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/i);
            const paymentText = paymentMatch ? paymentMatch[1].trim() : '';
            
            if (warrantyEditor) warrantyEditor.value = warrantyText;
            if (returnEditor) returnEditor.value = returnText;
            if (privacyEditor) privacyEditor.value = privacyText;
            if (paymentEditor) paymentEditor.value = paymentText;
        } else {
            console.error('Không thể tải file chính sách:', response.message);
            const errMsg = 'Lỗi tải chính sách hoặc file không tồn tại.';
            if (warrantyEditor) warrantyEditor.value = errMsg;
            if (returnEditor) returnEditor.value = errMsg;
            if (privacyEditor) privacyEditor.value = errMsg;
            if (paymentEditor) paymentEditor.value = errMsg;
        }
    } catch (error) {
        console.error('Load policy error:', error);
    }
}

async function saveWarrantyPolicy() {
    const warrantyEditor = document.getElementById('warranty-policy-editor');
    const returnEditor = document.getElementById('return-policy-editor');
    const privacyEditor = document.getElementById('privacy-policy-editor');
    const paymentEditor = document.getElementById('payment-policy-editor');
    if (!warrantyEditor || !returnEditor || !privacyEditor || !paymentEditor) return;
    
    const warrantyContent = warrantyEditor.value;
    const returnContent = returnEditor.value;
    const privacyContent = privacyEditor.value;
    const paymentContent = paymentEditor.value;
    
    const combinedContent = `## Chính sách bảo hành

${warrantyContent.trim()}

---

## Chính sách đổi trả sản phẩm

${returnContent.trim()}

---

## Chính sách bảo mật

${privacyContent.trim()}

---

## Hướng dẫn thanh toán

${paymentContent.trim()}`;
    
    try {
        const response = await apiCall('/admin/chatbot/documents', 'POST', {
            filename: 'chinh_sach_cua_hang.md',
            content: combinedContent
        });
        
        if (response.success) {
            showNotification('Đã lưu các chính sách thành công!', 'success');
        } else {
            alert(response.message || 'Lỗi khi lưu chính sách!');
        }
    } catch (error) {
        console.error('Save policy error:', error);
        alert('Lỗi kết nối máy chủ: ' + error.message);
    }
}

function switchPolicySubTab(tab) {
    const tabs = ['warranty', 'return', 'privacy', 'payment'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`policy-subtab-${t}-btn`);
        const container = document.getElementById(`policy-editor-${t}-container`);
        
        if (btn && container) {
            if (t === tab) {
                btn.className = 'px-4 py-2 text-sm font-bold border-b-2 border-teal-500 text-teal-600 focus:outline-none transition-all cursor-pointer whitespace-nowrap';
                container.classList.remove('hidden');
            } else {
                btn.className = 'px-4 py-2 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 focus:outline-none transition-all cursor-pointer whitespace-nowrap';
                container.classList.add('hidden');
            }
        }
    });
}
// ==================== WARRANTY PRINTING FUNCTIONS ====================
async function printWarrantyCard(id) {
    try {
        const response = await apiCall('/admin/warranties');
        if (!response.success) {
            alert('❌ Không thể tải danh sách phiếu bảo hành');
            return;
        }
        
        const ticket = response.data.find(t => t.ma_phieu_bh === id);
        if (!ticket) {
            alert('❌ Không tìm thấy phiếu bảo hành');
            return;
        }
        
        // Fetch store warranty policy
        let policyContent = 'Cửa hàng công nghệ Yến Nhi Tech cam kết mang đến dịch vụ bảo hành tốt nhất cho tất cả các thiết bị công nghệ chính hãng mua tại cửa hàng.';
        try {
            const policyResponse = await apiCall('/admin/chatbot/documents/chinh_sach_cua_hang.md');
            if (policyResponse.success) {
                const fullContent = (policyResponse.data && policyResponse.data.content) || policyResponse.content || '';
                const warrantyMatch = fullContent.match(/## Chính sách bảo hành\r?\n([\s\S]*?)(?=\r?\n## |\r?\n---|$)/i);
                if (warrantyMatch && warrantyMatch[1].trim()) {
                    policyContent = warrantyMatch[1].trim();
                    // Clean up markdown headers, bold, and lists for clean print display
                    policyContent = policyContent
                        .replace(/#{1,6}\s*(.*?)(?=\r?\n|$)/g, '$1') // strip markdown headers
                        .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold asterisks
                        .replace(/\*(.*?)/g, '• $1'); // replace bullet points
                }
            }
        } catch (e) {
            console.error('Error loading policy for printing:', e);
        }
        
        // Fill card front
        document.getElementById('print-wc-id').textContent = `#BH${ticket.ma_phieu_bh}`;
        document.getElementById('print-wc-customer-name').textContent = ticket.ten_khach_hang;
        document.getElementById('print-wc-product-name').textContent = ticket.ten_san_pham;
        
        const ngayMua = ticket.ngay_nhan ? formatDate(ticket.ngay_nhan) : 'Chưa rõ';
        const ngayHetHan = ticket.ngay_tra ? formatDate(ticket.ngay_tra) : 'Không xác định';
        document.getElementById('print-wc-purchase-date').textContent = ngayMua;
        document.getElementById('print-wc-expiry-date').textContent = ngayHetHan;
        
        const hdRef = ticket.ma_hoa_don 
            ? `Online: #${ticket.ma_hoa_don}`
            : (ticket.ma_hoa_don_bh ? `Offline: #${ticket.ma_hoa_don_bh}` : 'Cấp thủ công');
        document.getElementById('print-wc-invoice-ref').textContent = hdRef;
        
        // Set customer address line dynamically
        const addressEl = document.getElementById('print-wc-customer-address');
        if (addressEl) {
            addressEl.textContent = `SĐT: ${ticket.so_dien_thoai}`; // Fallback default
            if (ticket.ma_hoa_don) {
                addressEl.textContent = `Đang tải địa chỉ... (SĐT: ${ticket.so_dien_thoai})`;
                apiCall(`/admin/orders/${ticket.ma_hoa_don}`).then(orderRes => {
                    if (orderRes.success && orderRes.data && orderRes.data.dia_chi_giao) {
                        addressEl.textContent = `${orderRes.data.dia_chi_giao} (SĐT: ${ticket.so_dien_thoai})`;
                    } else {
                        addressEl.textContent = `Online (SĐT: ${ticket.so_dien_thoai})`;
                    }
                }).catch(err => {
                    console.error('Error fetching online order address:', err);
                    addressEl.textContent = `Online (SĐT: ${ticket.so_dien_thoai})`;
                });
            } else {
                addressEl.textContent = `Mua tại quầy (SĐT: ${ticket.so_dien_thoai})`;
            }
        }
        
        // Fill card back policy content
        document.getElementById('print-wc-policy-content').textContent = policyContent;
        
        // Open Print Preview Modal
        document.getElementById('warranty-card-print-modal').classList.add('active');
        
        // Set type for print event listener
        window.currentPrintType = 'warranty';
    } catch (error) {
        console.error('Print warranty card error:', error);
        alert('❌ Có lỗi xảy ra: ' + error.message);
    }
}

function closeWarrantyCardPrintModal() {
    document.getElementById('warranty-card-print-modal').classList.remove('active');
}

// Intercept print events to apply classes to the body dynamically
window.currentPrintType = 'pos'; // default
window.addEventListener('beforeprint', () => {
    // Temporarily hide the main admin layout to avoid inline style print conflicts
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
        adminContent.style.setProperty('display', 'none', 'important');
    }
    
    if (window.currentPrintType === 'warranty') {
        document.body.classList.add('printing-warranty');
        document.body.classList.remove('printing-pos');
    } else {
        document.body.classList.add('printing-pos');
        document.body.classList.remove('printing-warranty');
    }
});
window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-pos', 'printing-warranty');
    
    // Restore the main admin layout
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
        adminContent.style.setProperty('display', 'flex', 'important');
    }
});

// Đăng ký các hàm toàn cục vào đối tượng window
window.loadChatbotManager = loadChatbotManager;
window.switchChatbotTab = switchChatbotTab;
window.loadChatbotDocs = loadChatbotDocs;
window.editChatbotDoc = editChatbotDoc;
window.closeChatbotDocModal = closeChatbotDocModal;
window.saveChatbotDoc = saveChatbotDoc;
window.deleteChatbotDoc = deleteChatbotDoc;
window.loadChatbotHistory = loadChatbotHistory;
window.deleteChatbotHistory = deleteChatbotHistory;
window.loadWarranties = loadWarranties;
window.openWarrantyModal = openWarrantyModal;
window.closeWarrantyModal = closeWarrantyModal;
window.searchPurchaseHistory = searchPurchaseHistory;
window.selectPurchaseItem = selectPurchaseItem;
window.saveWarrantyTicket = saveWarrantyTicket;
window.deleteWarrantyTicket = deleteWarrantyTicket;
window.switchWarrantyTab = switchWarrantyTab;
window.loadWarrantyPolicy = loadWarrantyPolicy;
window.saveWarrantyPolicy = saveWarrantyPolicy;
window.switchPolicySubTab = switchPolicySubTab;
window.printWarrantyCard = printWarrantyCard;
window.closeWarrantyCardPrintModal = closeWarrantyCardPrintModal;
