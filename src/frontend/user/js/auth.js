// ==========================================
// QUAN LY XAC THUC NGUOI DUNG
// ==========================================

const API_URL = 'http://localhost:3000/api';

// Lay thong tin user tu localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Lay token
function getToken() {
    return localStorage.getItem('token');
}

// Kiem tra da Đăng nhập chua
function isLoggedIn() {
    return !!getToken();
}

// Đăng xuất
async function logout() {
    try {
        const token = getToken();
        
        if (token) {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // Xoa thong tin local
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Chuyen ve trang chu
        const path = window.location.pathname;
        if (path.includes('/user/pages/')) {
            window.location.href = '../../index.html';
        } else if (path.includes('/pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
        
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        // Van xoa thong tin local du co loi
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const path = window.location.pathname;
        if (path.includes('/user/pages/')) {
            window.location.href = '../../index.html';
        } else if (path.includes('/pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

// Cap nhat UI dua tren trang thai Đăng nhập
function updateAuthUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    
    if (!authButtons) return;
    
    if (user) {
        authButtons.innerHTML = `
            <span style="margin-right: 15px; color: #333;">
                Xin chào, <strong>${user.ten_dang_nhap}</strong>
            </span>
            <button onclick="logout()" class="btn-logout" style="
                padding: 8px 16px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">
                Đăng xuất
            </button>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="/frontend/pages/login.html" class="btn-login" style="
                padding: 8px 16px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-right: 10px;
            ">
                Đăng nhập
            </a>
            <a href="/frontend/pages/register.html" class="btn-register" style="
                padding: 8px 16px;
                background: #28a745;
                color: white;
                text-decoration: none;
                border-radius: 5px;
            ">
                Đăng ký
            </a>
        `;
    }
}

// Kiem tra quyen admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.vai_tro === 'admin';
}

// Yeu cau Đăng nhập (redirect neu Chưa đăng nhập)
function requireLogin() {
    if (!isLoggedIn()) {
        alert('Vui lòng đăng nhập để tiếp tục');
        window.location.href = '/frontend/pages/login.html';
        return false;
    }
    return true;
}

// Yeu cau quyen admin
function requireAdmin() {
    if (!isAdmin()) {
        alert('Bạn không có quyền truy cập trang này');
        window.location.href = '/frontend/index.html';
        return false;
    }
    return true;
}

// Goi API voi token
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        throw new Error('Chưa đăng nhập');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Neu token het han, Đăng xuất
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/frontend/pages/login.html';
        throw new Error('Phiên đăng nhập đã hết hạn');
    }
    
    return response;
}

// Khoi tao khi trang load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});
