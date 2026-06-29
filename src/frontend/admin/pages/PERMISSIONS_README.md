# Hệ thống Quản lý Phân quyền

## Tổng quan
Hệ thống phân quyền cho phép admin quản lý quyền hạn của từng nhân viên trong việc truy cập và thao tác với các chức năng khác nhau của hệ thống.

## Cài đặt

### 1. Chạy Migration Database
Trước tiên, cần tạo các bảng cần thiết trong database:

```bash
cd backend
node scripts/run_permissions_migration.js
```

Migration này sẽ tạo 2 bảng:
- `phan_quyen`: Lưu trữ phân quyền cho từng nhân viên
- `log_hoat_dong`: Ghi log các hoạt động trong hệ thống

### 2. Cấu trúc Database

#### Bảng `phan_quyen`
```sql
CREATE TABLE phan_quyen (
    ma_phan_quyen INT AUTO_INCREMENT PRIMARY KEY,
    ma_nhan_vien INT NOT NULL,
    quyen JSON NOT NULL,
    ngay_cap_nhat TIMESTAMP,
    nguoi_cap_nhat VARCHAR(100),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien)
);
```

#### Bảng `log_hoat_dong`
```sql
CREATE TABLE log_hoat_dong (
    ma_log INT AUTO_INCREMENT PRIMARY KEY,
    ma_tai_khoan INT,
    ma_nhan_vien INT,
    hanh_dong VARCHAR(100) NOT NULL,
    doi_tuong VARCHAR(50),
    ma_doi_tuong INT,
    mo_ta TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    ngay_tao TIMESTAMP
);
```

## Cách sử dụng

### 1. Truy cập trang quản lý phân quyền

Có 2 cách:

**Cách 1**: Từ trang danh sách nhân viên
- Vào trang Admin → Quản lý nhân sự → Nhân viên
- Tại mỗi nhân viên, nhấn nút "🔐 Phân quyền"

**Cách 2**: Truy cập trực tiếp
- URL: `http://localhost:3001/admin/pages/permissions.html?id=<ma_nhan_vien>`

### 2. Giao diện phân quyền

Giao diện bao gồm:

#### Header
- Thông tin nhân viên: Tên, vai trò, email, số điện thoại
- Số quyền đang được kích hoạt

#### Quick Actions
- **Bật tất cả**: Kích hoạt tất cả quyền
- **Tắt tất cả**: Vô hiệu hóa tất cả quyền
- **Đặt lại mặc định**: Đặt quyền về mặc định theo vai trò

#### Permissions Grid
Các module phân quyền được tổ chức thành các nhóm:

1. **Quản lý Đơn hàng** 🛒
   - Xem đơn hàng
   - Tạo đơn hàng
   - Sửa đơn hàng
   - Xóa đơn hàng
   - Hủy đơn hàng

2. **Quản lý Bán** 💰
   - Xem bán
   - Đặt bán
   - Sửa bán
   - Xóa bán

3. **Quản lý Menu** 🍽️
   - Xem menu
   - Thêm món
   - Sửa món
   - Xóa món

4. **Quản lý Khách hàng** 👥
   - Xem khách hàng
   - Thêm khách hàng
   - Sửa khách hàng
   - Xóa khách hàng

5. **Quản lý Kho** 📦
   - Xem kho
   - Thêm nguyên liệu
   - Sửa tồn kho
   - Xem nhà cung cấp

6. **Quản lý Nhân viên** 👨‍💼
   - Xem nhân viên
   - Thêm nhân viên
   - Sửa nhân viên
   - Xóa nhân viên

7. **Quản lý Sản phẩm** 📱
   - Xem sản phẩm
   - Thêm sản phẩm
   - Sửa sản phẩm
   - Xóa sản phẩm

8. **Quản lý Báo cáo** 📊
   - Xem báo cáo
   - Xuất báo cáo
   - Xem tài chính
   - Xem phân tích

9. **Cài đặt Hệ thống** ⚙️
   - Xem cài đặt
   - Sửa cài đặt
   - Quản lý phân quyền
   - Sao lưu hệ thống

### 3. Thiết lập phân quyền

1. Chọn các quyền muốn cấp bằng cách bật/tắt công tắc
2. Nhấn nút "💾 Lưu thay đổi" để lưu
3. Hoặc nhấn "Hủy" để quay lại mà không lưu

### 4. Phân quyền mặc định theo vai trò

#### Admin / Quản lý
- Có toàn bộ quyền trong hệ thống

#### Trưởng phòng / Manager
- Có hầu hết quyền, trừ "Cài đặt Hệ thống"

#### Nhân viên thường
- Chỉ có các quyền xem (view) cơ bản:
  - Xem đơn hàng
  - Xem bán
  - Xem menu
  - Xem khách hàng
  - Xem sản phẩm

## API Endpoints

### 1. Lấy phân quyền của nhân viên
```
GET /api/admin/permissions/:employeeId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "ma_nhan_vien": 1,
    "permissions": {
      "view_orders": true,
      "create_orders": true,
      ...
    }
  }
}
```

### 2. Cập nhật phân quyền
```
PUT /api/admin/permissions/:employeeId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "permissions": {
    "view_orders": true,
    "create_orders": false,
    ...
  }
}

Response:
{
  "success": true,
  "message": "Cập nhật phân quyền thành công",
  "data": {
    "ma_nhan_vien": 1,
    "permissions": {...}
  }
}
```

### 3. Lấy danh sách nhân viên với phân quyền
```
GET /api/admin/employees/permissions
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "ma_nhan_vien": 1,
      "ten": "Nguyễn Văn A",
      "vai_tro": "Nhân viên",
      "quyen": {...},
      ...
    }
  ]
}
```

### 4. Ghi log hoạt động
```
POST /api/admin/activity-log
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "action": "update_permissions",
  "target": "employee",
  "target_id": 1,
  "description": "Cập nhật phân quyền cho nhân viên Nguyễn Văn A"
}

Response:
{
  "success": true,
  "message": "Đã ghi log hoạt động"
}
```

### 5. Xem log hoạt động
```
GET /api/admin/activity-log?page=1&limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

## Bảo mật

- Tất cả API endpoints yêu cầu token xác thực
- Chỉ tài khoản Admin mới có quyền truy cập
- Mọi thay đổi phân quyền đều được ghi log
- Log bao gồm: IP address, User Agent, thời gian, người thực hiện

## Mở rộng

### Thêm module phân quyền mới

Chỉnh sửa file `frontend/admin/js/permissions.js`, thêm vào object `PERMISSION_MODULES`:

```javascript
PERMISSION_MODULES.new_module = {
    title: 'Tên Module',
    icon: '🎯',
    permissions: [
        { key: 'view_something', label: 'Xem' },
        { key: 'create_something', label: 'Tạo mới' },
        { key: 'edit_something', label: 'Chỉnh sửa' },
        { key: 'delete_something', label: 'Xóa' }
    ]
};
```

### Kiểm tra quyền trong code

Backend:
```javascript
// Middleware kiểm tra quyền
function checkPermission(permission) {
    return async (req, res, next) => {
        const employeeId = req.user.ma_nhan_vien;
        const [perms] = await db.query(
            'SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', 
            [employeeId]
        );
        
        if (perms.length > 0) {
            const permissions = JSON.parse(perms[0].quyen);
            if (permissions[permission]) {
                return next();
            }
        }
        
        res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền thực hiện hành động này' 
        });
    };
}

// Sử dụng
router.post('/orders', authenticateToken, checkPermission('create_orders'), createOrder);
```

Frontend:
```javascript
// Lấy quyền từ localStorage hoặc API
const permissions = JSON.parse(localStorage.getItem('permissions') || '{}');

// Kiểm tra quyền
if (permissions.create_orders) {
    // Hiển thị nút tạo đơn hàng
}
```

## Troubleshooting

### Lỗi: "Không tìm thấy thông tin nhân viên"
- Kiểm tra ID nhân viên trong URL
- Đảm bảo nhân viên tồn tại trong database

### Lỗi: "Không thể lưu phân quyền"
- Kiểm tra token xác thực
- Kiểm tra quyền admin của tài khoản
- Xem log server để biết chi tiết lỗi

### Lỗi database
- Chạy lại migration: `node scripts/run_permissions_migration.js`
- Kiểm tra kết nối database trong file `.env`

## Tác giả
Hệ thống Yến Nhi Tech - 2026
