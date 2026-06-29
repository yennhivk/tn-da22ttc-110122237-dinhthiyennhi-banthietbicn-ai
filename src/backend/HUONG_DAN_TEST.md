# HƯỚNG DẪN TEST HỆ THỐNG ĐĂNG KÝ/ĐĂNG NHẬP

## 1. CÀI ĐẶT VÀ KHỞI ĐỘNG

### Bước 1: Cài đặt dependencies
```bash
cd backend
npm install
```

### Bước 2: Kiểm tra file .env
Đảm bảo file `.env` có đầy đủ thông tin:
```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=CSDL_DoAnCN
DB_CHARSET=utf8mb4
```

### Bước 3: Import database
```bash
mysql -u root -p < CSDL_DoAnCN.sql
```

### Bước 4: Mã hóa mật khẩu mẫu (nếu cần)
```bash
node scripts/hash-passwords.js
```

### Bước 5: Khởi động server
```bash
npm start
```

Server sẽ chạy tại: http://localhost:3000

---

## 2. TEST API BẰNG POSTMAN/THUNDER CLIENT

### Test 1: Đăng ký tài khoản mới
**POST** `http://localhost:3000/api/auth/register`

**Body (JSON):**
```json
{
  "ten_dang_nhap": "testuser",
  "mat_khau": "123456",
  "email": "testuser@gmail.com",
  "vai_tro": "khach_hang"
}
```

**Kết quả mong đợi:**
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

### Test 2: Đăng nhập
**POST** `http://localhost:3000/api/auth/login`

**Body (JSON):**
```json
{
  "email": "testuser@gmail.com",
  "mat_khau": "123456"
}
```

**Kết quả mong đợi:**
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

### Test 3: Kiểm tra thông tin user
**GET** `http://localhost:3000/api/auth/me`

**Headers:**
```
Authorization: Bearer <token_từ_bước_đăng_nhập>
```

**Kết quả mong đợi:**
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

## 3. TEST TRÊN GIAO DIỆN WEB

### Bước 1: Mở trang đăng ký
Truy cập: `frontend/pages/register.html`

### Bước 2: Điền thông tin
- Họ và tên: Test User
- Số điện thoại: 0909123456
- Email: testuser@gmail.com
- Mật khẩu: 123456
- Xác nhận mật khẩu: 123456
- ✓ Đồng ý điều khoản

### Bước 3: Nhấn "Đăng ký ngay"
- Nếu thành công → Chuyển sang trang login
- Nếu lỗi → Hiển thị thông báo lỗi

### Bước 4: Đăng nhập
Truy cập: `frontend/pages/login.html`
- Số điện thoại: 0909123456
- Mật khẩu: 123456
- Nhấn "Tiếp tục"

### Bước 5: Kiểm tra trong database
```sql
SELECT * FROM tai_khoan WHERE ten_dang_nhap = 'testuser';
```

---

## 4. KIỂM TRA LỖI THƯỜNG GẶP

### Lỗi 1: Không kết nối được database
**Nguyên nhân:** Thông tin database sai hoặc MySQL chưa chạy

**Giải pháp:**
- Kiểm tra MySQL đã chạy chưa
- Kiểm tra thông tin trong file `.env`
- Test kết nối: `http://localhost:3000/api/test-db`

### Lỗi 2: CORS Error
**Nguyên nhân:** Frontend và Backend khác domain

**Giải pháp:** Server đã cấu hình CORS, đảm bảo server đang chạy

### Lỗi 3: Tài khoản đã tồn tại
**Nguyên nhân:** Email hoặc tên đăng nhập đã được sử dụng

**Giải pháp:** Dùng email/tên đăng nhập khác

### Lỗi 4: Mật khẩu không đúng
**Nguyên nhân:** Mật khẩu mẫu chưa được hash

**Giải pháp:** Chạy script hash password:
```bash
node scripts/hash-passwords.js
```

---

## 5. KIỂM TRA DỮ LIỆU TRONG DATABASE

```sql
-- Xem tất cả tài khoản
SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, trang_thai, ngay_tao 
FROM tai_khoan;

-- Xem tài khoản mới nhất
SELECT * FROM tai_khoan ORDER BY ngay_tao DESC LIMIT 5;

-- Đếm số tài khoản
SELECT COUNT(*) as tong_tai_khoan FROM tai_khoan;

-- Xem tài khoản theo vai trò
SELECT vai_tro, COUNT(*) as so_luong 
FROM tai_khoan 
GROUP BY vai_tro;
```

---

## 6. TÀI KHOẢN MẪU

Sau khi chạy script hash-passwords.js, bạn có thể dùng:

| Tên đăng nhập | Mật khẩu | Vai trò |
|---------------|----------|---------|
| admin         | 123456   | admin   |
| nguyenvana    | 123456   | khach_hang |
| lethib        | 123456   | khach_hang |

---

## 7. LƯU Ý QUAN TRỌNG

✅ **Đã hoàn thành:**
- Kết nối database MySQL
- API đăng ký tài khoản
- API đăng nhập
- Mã hóa mật khẩu bằng bcrypt
- Tạo JWT token
- Validation dữ liệu
- Giao diện đăng ký/đăng nhập

✅ **Tài khoản mới sẽ được lưu vào bảng `tai_khoan`** với:
- Mật khẩu được mã hóa (bcrypt)
- Vai trò mặc định: `khach_hang`
- Trạng thái: `1` (active)
- Ngày tạo: tự động

🔒 **Bảo mật:**
- Mật khẩu được hash bằng bcrypt (10 rounds)
- JWT token có thời hạn 24h
- Session được quản lý an toàn
