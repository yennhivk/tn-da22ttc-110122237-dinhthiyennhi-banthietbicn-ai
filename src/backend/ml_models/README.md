# Hệ thống Gợi ý Sản phẩm (Product Recommendation System)

Hệ thống gợi ý sản phẩm sử dụng Machine Learning với các thuật toán:
- **Collaborative Filtering** (Lọc cộng tác) - KNN
- **Content-Based Filtering** (Lọc dựa trên nội dung) - TF-IDF + Cosine Similarity
- **Popularity-Based** (Dựa trên độ phổ biến)
- **Hybrid Approach** (Kết hợp các phương pháp)

## Cài đặt

### 1. Cài đặt Python dependencies

```bash
cd backend/ml_models
pip install -r requirements.txt
```

### 2. Cấu hình database

Copy file `.env.example` thành `.env` và cập nhật thông tin database:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=doan_csdl
DB_PORT=3306
```

### 3. Tạo bảng user_interactions

Chạy migration SQL:
```bash
mysql -u root -p doan_csdl < ../migrations/add_recommendation_tables.sql
```

## Huấn luyện Models

### Train tất cả models:

```bash
python train_models.py
```

Models sẽ được lưu vào thư mục `trained_models/`:
- `collaborative_filtering.pkl`
- `content_based_filtering.pkl`
- `popularity_based.pkl`

## Chạy API Server

### Start Flask API:

```bash
python recommendation_api.py
```

API sẽ chạy tại `http://localhost:5000`

### Endpoints:

1. **Health Check**
   ```
   GET /health
   ```

2. **Gợi ý cho người dùng**
   ```
   GET /recommendations/user/<user_id>?limit=10
   ```

3. **Sản phẩm tương tự**
   ```
   GET /recommendations/similar/<product_id>?limit=10
   ```

4. **Sản phẩm trending**
   ```
   GET /recommendations/trending?limit=10
   ```

5. **Sản phẩm phổ biến**
   ```
   GET /recommendations/popular?limit=10
   ```

6. **Retrain models**
   ```
   POST /train
   ```

## Tích hợp với Node.js Backend

Node.js backend sẽ tự động gọi Python API thông qua `recommendationEngine.js`.

Đảm bảo Python API đang chạy trước khi start Node.js server.

### Cấu hình trong Node.js:

Thêm vào file `.env` của backend:
```
ML_API_URL=http://localhost:5000
```

## Cấu trúc thư mục

```
ml_models/
├── modules/                    # Các module ML
│   ├── data_loader.py         # Load dữ liệu từ DB
│   ├── collaborative_filtering.py  # Lọc cộng tác (KNN)
│   ├── content_based_filtering.py  # Lọc nội dung (TF-IDF)
│   ├── popularity_based.py    # Dựa trên độ phổ biến
│   └── hybrid_recommender.py  # Kết hợp các phương pháp
├── trained_models/            # Models đã train
├── data/                      # Dữ liệu cache (nếu có)
├── config.py                  # Cấu hình
├── train_models.py           # Script train models
├── recommendation_api.py     # Flask API server
├── requirements.txt          # Python dependencies
└── README.md                 # File này
```

## Thuật toán

### 1. Collaborative Filtering (KNN)
- Tìm K người dùng tương tự dựa trên lịch sử tương tác
- Sử dụng Cosine Similarity
- Gợi ý sản phẩm mà người dùng tương tự đã thích

### 2. Content-Based Filtering
- Phân tích đặc trưng sản phẩm (tên, mô tả, thương hiệu, giá, danh mục)
- Sử dụng TF-IDF cho text features
- Tính similarity giữa các sản phẩm

### 3. Popularity-Based
- Tính điểm phổ biến dựa trên:
  - Số lượt xem
  - Số lượt mua
  - Số lượt thêm vào giỏ hàng
- Trending: sản phẩm hot trong 30 ngày gần đây

### 4. Hybrid Approach
- Kết hợp 3 phương pháp trên với trọng số:
  - Collaborative: 40%
  - Content-Based: 30%
  - Popularity: 30%

## Retrain Models

Models nên được retrain định kỳ (ví dụ: mỗi tuần) để cập nhật với dữ liệu mới.

### Tự động retrain:

Có thể setup cron job hoặc scheduled task:

**Linux/Mac (crontab):**
```bash
# Retrain mỗi Chủ nhật lúc 2 giờ sáng
0 2 * * 0 cd /path/to/backend/ml_models && python train_models.py
```

**Windows (Task Scheduler):**
Tạo task chạy `train_models.py` theo lịch

### Manual retrain:

```bash
python train_models.py
```

hoặc gọi API:
```bash
curl -X POST http://localhost:5000/train
```

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra thông tin trong file `.env`
- Đảm bảo MySQL đang chạy
- Kiểm tra user có quyền truy cập database

### Models không load được
- Chạy `python train_models.py` để train models
- Kiểm tra thư mục `trained_models/` có các file `.pkl`

### API không phản hồi
- Kiểm tra Python API có đang chạy không
- Kiểm tra port 5000 có bị chiếm không
- Xem logs để debug

## Performance

- Collaborative Filtering: O(n*m) với n users, m products
- Content-Based: O(m²) cho similarity matrix
- Recommend query: O(k) với k là số recommendations

Với dataset lớn (>100k users, >10k products), nên:
- Sử dụng caching
- Precompute similarity matrices
- Sử dụng approximate KNN (Annoy, FAISS)
