# Thông tin sản phẩm và danh mục

## Định nghĩa sản phẩm mới nhất

**Sản phẩm mới nhất** hoặc **sản phẩm mới thêm** tại cửa hàng Yến Nhi Tech được định nghĩa như sau:

- Là các sản phẩm được thêm vào hệ thống trong vòng **15 ngày gần nhất** tính từ thời điểm hiện tại.
- Thời gian tính theo trường `ngay_tao` (ngày tạo) trong cơ sở dữ liệu.
- Các sản phẩm này thường là hàng mới về, model mới ra mắt hoặc sản phẩm độc quyền.

### Cách xác định sản phẩm mới nhất

Khi khách hàng hỏi về "sản phẩm mới", "sản phẩm mới nhất", "hàng mới về", "có gì mới", bạn cần:

1. **Truy vấn sản phẩm được thêm trong 15 ngày gần nhất** bằng SQL:
   ```sql
   SELECT ma_san_pham, ten_san_pham, gia, thuong_hieu, ngay_tao
   FROM san_pham
   WHERE trang_thai = 'hien_thi' 
   AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 15 DAY)
   ORDER BY ngay_tao DESC
   LIMIT 10
   ```

2. **Giới thiệu sản phẩm với ngữ cảnh phù hợp**:
   - "Đây là những sản phẩm mới nhất vừa về cửa hàng trong 15 ngày gần đây"
   - "Cửa hàng vừa nhập về những sản phẩm mới này"
   - Hiển thị ngày thêm để khách hàng thấy độ mới

3. **Nếu không có sản phẩm mới trong 15 ngày**:
   - Thông báo: "Hiện tại chưa có sản phẩm mới trong 15 ngày gần đây"
   - Có thể đề xuất sản phẩm bán chạy hoặc khuyến mãi thay thế

## Danh mục sản phẩm

Cửa hàng Yến Nhi Tech phân loại sản phẩm theo các danh mục chính:

### 1. Điện thoại (Smartphone)
- Điện thoại thông minh từ các thương hiệu: iPhone, Samsung, Xiaomi, OPPO, Vivo, Realme
- Các phân khúc: Flagship, Tầm trung, Giá rẻ

### 2. Laptop & Máy tính
- Laptop văn phòng, học tập, gaming
- Thương hiệu: MacBook, Dell, HP, Asus, Lenovo, Acer, MSI
- Các loại: Ultrabook, Gaming Laptop, Workstation

### 3. Phụ kiện công nghệ
- Tai nghe (có dây, bluetooth, gaming)
- Sạc và cáp (Type-C, Lightning, Micro USB)
- Bảo vệ: Ốp lưng, kính cường lực
- Thiết bị ngoại vi: Chuột, bàn phím, webcam

### 4. Thiết bị điện máy
- Tivi, màn hình
- Thiết bị gia dụng: Máy lạnh, tủ lạnh, máy giặt

## Lưu ý khi tư vấn sản phẩm

- Luôn kiểm tra tình trạng tồn kho (`so_luong`) trước khi giới thiệu
- Ưu tiên giới thiệu sản phẩm có `trang_thai = 'hien_thi'`
- Cung cấp thông tin giá, thương hiệu, hình ảnh rõ ràng
- Đề xuất sản phẩm phù hợp với nhu cầu và ngân sách khách hàng
