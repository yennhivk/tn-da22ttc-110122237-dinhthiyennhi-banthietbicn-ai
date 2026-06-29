        (function() {
            // Lấy token và user từ URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const userStr = urlParams.get('user');
            const error = urlParams.get('error');

            console.log('🔐 [Admin Callback] === BẮT ĐẦU XỬ LÝ ===');
            console.log('🔐 [Admin Callback] Full URL:', window.location.href);
            console.log('🔐 [Admin Callback] Token:', token ? 'Có (' + token.substring(0, 20) + '...)' : 'KHÔNG CÓ');
            console.log('🔐 [Admin Callback] User string:', userStr);
            console.log('🔐 [Admin Callback] Error:', error);

            if (error) {
                console.error('❌ [Admin Callback] Có lỗi:', error);
                alert('Đăng nhập Admin thất bại: ' + error);
                window.location.replace('admin-login.html');
                return;
            }
            
            if (token && userStr) {
                try {
                    const decodedUserStr = decodeURIComponent(userStr);
                    console.log('✅ [Admin Callback] Decoded user:', decodedUserStr);
                    
                    const user = JSON.parse(decodedUserStr);
                    console.log('✅ [Admin Callback] Parsed user:', user);
                    console.log('✅ [Admin Callback] Vai trò:', user.vai_tro);
                    console.log('✅ [Admin Callback] Email:', user.email);
                    
                    // Kiểm tra quyền admin
                    if (user.vai_tro !== 'admin') {
                        console.error('❌ [Admin Callback] User không có quyền admin!');
                        alert('Tài khoản này không có quyền admin!\nEmail: ' + user.email + '\nVai trò: ' + user.vai_tro);
                        window.location.replace('admin-login.html?message=' + encodeURIComponent('Bạn không có quyền truy cập'));
                        return;
                    }
                    
                    console.log('✅ [Admin Callback] Xác nhận admin thành công!');
                    
                    // Lưu vào localStorage với prefix admin_
                    localStorage.setItem('admin_token', token);
                    localStorage.setItem('admin_user', JSON.stringify(user));
                    
                    console.log('✅ [Admin Callback] Đã lưu vào localStorage');
                    console.log('✅ [Admin Callback] admin_token:', localStorage.getItem('admin_token') ? 'Có' : 'Không');
                    console.log('✅ [Admin Callback] admin_user:', localStorage.getItem('admin_user'));
                    
                    // Chuyển về trang admin
                    console.log('✅ [Admin Callback] Đang chuyển đến admin.html...');
                    setTimeout(function() {
                        window.location.href = 'admin.html';
                    }, 500);
                } catch (e) {
                    console.error('[Admin Callback] Lỗi xử lý dữ liệu:', e);
                    alert('Có lỗi xảy ra khi xử lý đăng nhập: ' + e.message);
                    window.location.replace('admin-login.html');
                }
            } else {
                alert('Không tìm thấy thông tin đăng nhập');
                window.location.replace('admin-login.html');
            }
        })();