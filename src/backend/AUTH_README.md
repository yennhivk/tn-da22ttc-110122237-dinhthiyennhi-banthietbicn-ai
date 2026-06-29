# Hướng dẫn sử dụng API Đăng ký & Đăng nhập

## 📋 Mục lục
1. [Cấu hình](#cấu-hình)
2. [API Endpoints](#api-endpoints)
3. [Cách sử dụng](#cách-sử-dụng)
4. [Test API](#test-api)

---

## ⚙️ Cấu hình

### 1. Cài đặt dependencies
```bash
cd backend
npm install
```

### 2. Cấu hình file .env
Tạo file `.env` từ `.env.example` rồi điền thông tin thực tế:
```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=CSDL_DoAnCN
JWT_SECRET=your_jwt_secret_key_here_change_in_production
```

### 3. Import database
```bash
mysql -u root -p < CSDL_DoAnCN.sql
```

### 4. Chạy server
```bash
npm start
```
Server sẽ chạy tại: `http://localhost:3000`

---

## 🔌 API Endpoints

### 1. Đăng ký tài khoản
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "ten_dang_nhap": "testuser",
  "mat_khau": "123456",
  "email": "testuser@gmail.com",
  "vai_tro": "khach_hang"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công",
  "data": {
    "ma_tai_khoan": 4,
    "ten_dang_nhap": "testuser",
    "email": "testuser@gmail.com",
    "vai_tro": "khach_hang"
  }
}
```

**Response Error (409):**
```json
{
  "success": false,
  "message": "Tên đăng nhập đã tồn tại"
}
```

---

### 2. Đăng nhập
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "testuser@gmail.com",
  "mat_khau": "123456"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "ma_tai_khoan": 4,
      "ten_dang_nhap": "testuser",
      "email": "testuser@gmail.com",
      "vai_tro": "khach_hang"
    }
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "message": "Tên đăng nhập hoặc mật khẩu không đúng"
}
```

---

### 3. Kiểm tra trạng thái đăng nhập
**GET** `/api/auth/me`

**Headers (khuyến nghị):**
```
Authorization: Bearer <token_từ_đăng_nhập>
```

**Response Success (200):**
```json
{
  "success": true,
  "user": {
    "ma_tai_khoan": 4,
    "ten_dang_nhap": "testuser",
    "email": "testuser@gmail.com",
    "vai_tro": "khach_hang"
  }
}
```

---

### 4. Đăng xuất
**POST** `/api/auth/logout`

**Response Success (200):**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

---

## 🎯 Cách sử dụng

### Frontend - Đăng ký
1. Mở file: `frontend/pages/register.html`
2. Điền thông tin đăng ký
3. Nhấn "Đăng ký"

### Frontend - Đăng nhập
1. Mở file: `frontend/pages/login.html`
2. Nhập email và mật khẩu
3. Nhấn "Đăng nhập"
4. Token sẽ được lưu vào localStorage

### Sử dụng trong JavaScript
```javascript
// Import auth.js
<script src="../js/auth.js"></script>

// Kiểm tra đã đăng nhập
if (isLoggedIn()) {
    console.log('Đã đăng nhập');
}

// Lấy thông tin user
const user = getCurrentUser();
console.log(user.ten_dang_nhap);

// Gọi API với token
const response = await fetchWithAuth('http://localhost:3000/api/cart', {
    method: 'GET'
});

// Đăng xuất
logout();
```

---

## 🧪 Test API

### Sử dụng file test-auth.http
1. Cài đặt extension "REST Client" trong VS Code
2. Mở file `backend/test-auth.http`
3. Click "Send Request" để test từng API

### Sử dụng Postman
1. Import collection từ file `test-auth.http`
2. Test từng endpoint

### Test bằng curl
```bash
# Đăng ký
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"ten_dang_nhap":"testuser","mat_khau":"123456","email":"test@gmail.com"}'

# Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","mat_khau":"123456"}'
```

---

## 🔐 Bảo mật

### Mật khẩu
- Mật khẩu được mã hóa bằng bcrypt với salt rounds = 10
- Không lưu mật khẩu dạng plain text

### JWT Token
- Token có thời gian hết hạn: 24 giờ
- Token được lưu trong localStorage
- Mỗi request cần gửi token trong header: `Authorization: Bearer <token>`

### Session
- Session được lưu trên server
- Thời gian hết hạn: 24 giờ

---

## 📝 Tài khoản mẫu

Database đã có sẵn các tài khoản:

| Tên đăng nhập | Mật khẩu | Vai trò |
|---------------|----------|---------|
| admin | 123456 | admin |
| nguyenvana | 123456 | khach_hang |
| lethib | 123456 | khach_hang |

---

## ❗ Lưu ý

1. **Đổi JWT_SECRET trong production**: File `.env` cần thay đổi `JWT_SECRET` trước khi deploy
2. **CORS**: Hiện tại cho phép tất cả origin (`*`), cần giới hạn trong production
3. **HTTPS**: Nên sử dụng HTTPS trong production để bảo mật token
4. **Validation**: Đã có validation cơ bản, có thể mở rộng thêm

---

## 🐛 Xử lý lỗi

| Mã lỗi | Ý nghĩa |
|--------|---------|
| 400 | Thiếu thông tin hoặc dữ liệu không hợp lệ |
| 401 | Chưa đăng nhập hoặc sai mật khẩu |
| 403 | Không có quyền truy cập |
| 409 | Tên đăng nhập hoặc email đã tồn tại |
| 500 | Lỗi server |

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Server đã chạy chưa (`npm start`)
2. Database đã import chưa
3. Thông tin kết nối database trong `.env` đúng chưa
4. Console log để xem lỗi chi tiết
