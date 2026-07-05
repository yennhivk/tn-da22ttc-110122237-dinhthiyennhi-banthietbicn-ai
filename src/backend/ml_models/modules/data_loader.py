import mysql.connector
import pandas as pd
import numpy as np
from config import DB_CONFIG

class DataLoader:
    """Load và xử lý dữ liệu từ database"""
    
    def __init__(self):
        self.conn = None
        
    def connect(self):
        """Kết nối database"""
        try:
            self.conn = mysql.connector.connect(**DB_CONFIG)
            return True
        except Exception as e:
            print(f"Lỗi kết nối database: {e}")
            return False
    
    def close(self):
        """Đóng kết nối"""
        if self.conn:
            self.conn.close()
    
    def load_products(self):
        """Load thông tin sản phẩm"""
        query = """
        SELECT 
            ma_san_pham as product_id,
            ten_san_pham as product_name,
            mo_ta as description,
            gia as price,
            ma_danh_muc as category_id,
            thuong_hieu as brand,
            so_luong as stock
        FROM san_pham
        WHERE trang_thai != 'deleted' AND trang_thai != 'ngung_kinh_doanh' -- adjust based on your actual db
        """
        return pd.read_sql(query, self.conn)
    
    def load_user_interactions(self):
        """Load tương tác người dùng (purchases, preferences, views, cart, v.v.)"""
        query = """
        SELECT 
            ui.MaND as user_id,
            ui.MaSP as product_id,
            ui.LoaiTuongTac as action_type,
            ui.GiaTri as action_value,
            ui.ThoiGian as timestamp
        FROM user_interactions ui
        WHERE ui.ThoiGian >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND ui.LoaiTuongTac IN ('purchase', 'preference', 'cart', 'view', 'click', 'search', 'chatbot_view', 'wishlist', 'rating')
        ORDER BY ui.ThoiGian DESC
        """
        return pd.read_sql(query, self.conn)
    
    def load_orders(self):
        """Load lịch sử đơn hàng"""
        query = """
        SELECT 
            dh.ma_tai_khoan as user_id,
            ctdh.ma_san_pham as product_id,
            ctdh.so_luong as quantity,
            ctdh.gia_ban as price,
            dh.ngay_tao as order_date,
            dh.trang_thai_don_hang as status
        FROM don_hang dh
        JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
        WHERE dh.trang_thai_don_hang IN ('completed', 'delivered', 'hoan_thanh', 'giao_thanh_cong')
        """
        return pd.read_sql(query, self.conn)
    
    def load_product_categories(self):
        """Load danh mục sản phẩm"""
        query = """
        SELECT 
            ma_danh_muc as category_id,
            ten_danh_muc as category_name
        FROM danh_muc_san_pham
        """
        return pd.read_sql(query, self.conn)
    
    def get_user_profile(self, user_id):
        """Lấy thông tin profile người dùng"""
        query = f"""
        SELECT 
            ma_tai_khoan as user_id,
            ho_ten as name,
            email as email,
            ngay_tao as created_at
        FROM tai_khoan
        WHERE ma_tai_khoan = {user_id}
        """
        return pd.read_sql(query, self.conn)
