# Quick Start - Hệ thống Gợi ý Sản phẩm

## Bước 1: Cài đặt Python packages

```bash
cd backend/ml_models
pip install -r requirements.txt
```

## Bước 2: Cấu hình database

Tạo file `.env`:
```bash
cp .env.example .env
```

Sửa thông tin database trong `.env`

## Bước 3: Tạo bảng database

```bash
cd ../migrations
mysql -u root -p doan_csdl < add_recommendation_tables.sql
```

## Bước 4: Train models lần đầu

```bash
cd ../ml_models
python train_models.py
```

## Bước 5: Start Python API

```bash
python recommendation_api.py
```

Hoặc trên Windows:
```bash
start_api.bat
```

API sẽ chạy tại: http://localhost:5000

## Bước 6: Start Node.js backend

Mở terminal mới:

```bash
cd backend
npm start
```

## Test API

### Test Python API:
```bash
curl http://localhost:5000/health
```

### Test Node.js integration:
```bash
curl http://localhost:3000/api/recommendations/user/1?limit=5
```

## Lưu ý

- Python API phải chạy trước Node.js backend
- Nếu không có dữ liệu, hệ thống sẽ tự động tạo dữ liệu mẫu khi train
- Retrain models định kỳ để cập nhật với dữ liệu mới

## Troubleshooting

**Lỗi: Module not found**
```bash
pip install -r requirements.txt
```

**Lỗi: Database connection failed**
- Kiểm tra file `.env`
- Đảm bảo MySQL đang chạy

**Lỗi: Models not loaded**
```bash
python train_models.py
```
