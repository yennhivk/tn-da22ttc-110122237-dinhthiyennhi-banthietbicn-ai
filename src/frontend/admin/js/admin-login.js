        const API_URL = window.location.port === '3000'
            ? window.location.origin + '/api'
            : 'http://localhost:3000/api';

        // Hiển thị thông báo
        function showAlert(message, type = 'error') {
            const alertDiv = document.getElementById('alert-message');
            alertDiv.className = `mb-6 p-4 rounded-lg ${
                type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
                'bg-green-100 text-green-700 border border-green-300'
            }`;
            alertDiv.textContent = message;
            alertDiv.classList.remove('hidden');

            setTimeout(() => {
                alertDiv.classList.add('hidden');
            }, 5000);
        }

        // Đăng nhập Google cho Admin - PHƯƠNG THỨC DUY NHẤT
        function loginWithGoogle() {
            console.log('🔐 [Admin Login] Bắt đầu đăng nhập Google OAuth');
            console.log('🔐 [Admin Login] API URL:', API_URL);
            console.log('🔐 [Admin Login] Redirect to:', `${API_URL}/auth/google-admin`);
            
            // Redirect đến Google OAuth cho admin
            window.location.href = `${API_URL}/auth/google-admin`;
        }

        // Kiểm tra nếu đã đăng nhập admin
        window.addEventListener('DOMContentLoaded', () => {
            const adminToken = localStorage.getItem('admin_token');
            const adminUser = localStorage.getItem('admin_user');

            if (adminToken && adminUser) {
                try {
                    const user = JSON.parse(adminUser);
                    if (user.vai_tro === 'admin') {
                        // Đã đăng nhập, chuyển về admin
                        window.location.href = 'admin.html';
                    }
                } catch (e) {
                    // Invalid data, clear it
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_user');
                }
            }

            // Kiểm tra message từ URL
            const urlParams = new URLSearchParams(window.location.search);
            const message = urlParams.get('message');
            if (message) {
                showAlert(decodeURIComponent(message));
            }

            // Tạo pháo hoa nhỏ
            createSparkles();
        });

        // Hàm tạo hiệu ứng pháo hoa nhỏ
        function createSparkles() {
            const numberOfSparkles = 30;
            const colors = ['#FFD700', '#FF6347', '#DC143C', '#FFA500'];

            for (let i = 0; i < numberOfSparkles; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.style.left = Math.random() * 100 + '%';
                sparkle.style.top = Math.random() * 100 + '%';
                sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
                sparkle.style.animationDelay = Math.random() * 3 + 's';
                sparkle.style.animationDuration = (Math.random() * 2 + 2) + 's';
                document.body.appendChild(sparkle);
            }
        }