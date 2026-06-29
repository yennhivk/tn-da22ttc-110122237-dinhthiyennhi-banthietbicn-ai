import mysql.connector
from config import DB_CONFIG

def setup_database():
    """Tạo bảng user_interactions nếu chưa có"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔄 Đang kiểm tra và tạo bảng user_interactions...")
        
        # Tạo bảng user_interactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_interactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                MaND INT NOT NULL,
                MaSP INT NOT NULL,
                LoaiTuongTac VARCHAR(50) NOT NULL,
                GiaTri INT DEFAULT 1,
                ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (MaND),
                INDEX idx_product (MaSP),
                INDEX idx_time (ThoiGian),
                INDEX idx_action (LoaiTuongTac)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """)
        
        print("✅ Bảng user_interactions đã sẵn sàng")
        
        # Kiểm tra có dữ liệu không
        cursor.execute("SELECT COUNT(*) FROM user_interactions")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("⚠️ Chưa có dữ liệu, đang thêm dữ liệu mẫu...")
            
            # Thêm dữ liệu mẫu
            sample_data = [
                (1, 1, 'view', 1),
                (1, 2, 'view', 1),
                (1, 3, 'purchase', 2),
                (2, 1, 'view', 1),
                (2, 2, 'cart', 1),
                (2, 4, 'purchase', 1),
                (3, 1, 'view', 1),
                (3, 5, 'cart', 1),
                (3, 2, 'purchase', 1),
            ]
            
            cursor.executemany(
                "INSERT INTO user_interactions (MaND, MaSP, LoaiTuongTac, GiaTri) VALUES (%s, %s, %s, %s)",
                sample_data
            )
            conn.commit()
            print(f"✅ Đã thêm {len(sample_data)} dữ liệu mẫu")
        else:
            print(f"✅ Đã có {count} dữ liệu trong bảng")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Setup database hoàn tất!")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi setup database: {e}")
        return False

if __name__ == "__main__":
    setup_database()
