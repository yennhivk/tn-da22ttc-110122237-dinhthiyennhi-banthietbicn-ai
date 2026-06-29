const API_URL = window.location.port === '3000'
    ? window.location.origin + '/api'
    : 'http://localhost:3000/api';

function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alert-message');
    alertDiv.className = `alert show ${
        type === 'error' ? 'alert-error' : 'alert-success'
    }`;
    alertDiv.textContent = message;
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 5000);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    
    if (!email || !password) {
        showAlert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Đang đăng nhập...';
        
        console.log('Sending login request for:', email);
        
        // Gọi API employee-login
        const response = await fetch(`${API_URL}/auth/employee-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: email,
                mat_khau: password
            })
        });
        
        const data = await response.json();
        console.log('Response:', data);
        
        if (response.ok && data.success) {
            showAlert('Đăng nhập thành công! Đang chuyển hướng...', 'success');
            
            // Lưu token admin
            localStorage.setItem('admin_token', data.data.token);
            localStorage.setItem('admin_user', JSON.stringify(data.data.user));
            
            // Đồng bộ sang token user thông thường
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!');
        }
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        showAlert('Không thể kết nối đến server. Vui lòng thử lại sau!');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Đăng nhập';
    }
}
