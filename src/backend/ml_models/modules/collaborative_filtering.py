import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import csr_matrix
import joblib
import os

class CollaborativeFiltering:
    """Lọc cộng tác sử dụng KNN"""
    
    def __init__(self, n_neighbors=10):
        self.n_neighbors = n_neighbors
        self.model = None
        self.user_item_matrix = None
        self.user_mapper = None
        self.item_mapper = None
        self.user_inv_mapper = None
        self.item_inv_mapper = None
        
    def create_user_item_matrix(self, interactions_df):
        """Tạo ma trận user-item từ interactions"""
        # Tính điểm tương tác
        interactions_df['score'] = interactions_df.apply(
            lambda x: self._calculate_interaction_score(x['action_type'], x['action_value']),
            axis=1
        )
        
        # Aggregate scores cho mỗi user-product pair
        user_item_df = interactions_df.groupby(['user_id', 'product_id'])['score'].sum().reset_index()
        
        # Tạo mappers
        users = user_item_df['user_id'].unique()
        products = user_item_df['product_id'].unique()
        
        self.user_mapper = {user: idx for idx, user in enumerate(users)}
        self.item_mapper = {item: idx for idx, item in enumerate(products)}
        self.user_inv_mapper = {idx: user for user, idx in self.user_mapper.items()}
        self.item_inv_mapper = {idx: item for item, idx in self.item_mapper.items()}
        
        # Tạo sparse matrix
        user_indices = user_item_df['user_id'].map(self.user_mapper)
        item_indices = user_item_df['product_id'].map(self.item_mapper)
        
        self.user_item_matrix = csr_matrix(
            (user_item_df['score'], (user_indices, item_indices)),
            shape=(len(users), len(products))
        )
        
        return self.user_item_matrix
    
    def _calculate_interaction_score(self, action_type, action_value):
        """Tính điểm cho mỗi loại tương tác"""
        scores = {
            'view': 1.0,
            'cart': 3.0,
            'purchase': 5.0,
            'wishlist': 2.0,
            'preference': 5.0,        # Onboarding preferences get high base score
            'chatbot_view': 2.0,      # Products shown by chatbot
            'search': 1.5,            # Search intent gets good score
            'rating': 1.0             # Rating will rely on its value
        }
        base_score = scores.get(action_type, 1.0)
        
        # Đặc biệt xử lý cho rating (chấp nhận cả giá trị âm để giảm điểm)
        if action_type == 'rating' and action_value is not None:
            try:
                val = float(action_value)
                return val
            except (ValueError, TypeError):
                return 1.0
            
        # Nếu có action_value, nhân thêm (chấp nhận cả số dương/âm)
        if action_value is not None:
            try:
                val = float(action_value)
                if val < 0:
                    return base_score * max(val, -5)
                else:
                    return base_score * min(val, 5)
            except (ValueError, TypeError):
                pass
                
        return base_score
    
    def train(self, interactions_df):
        """Huấn luyện mô hình KNN"""
        # Tạo user-item matrix
        self.create_user_item_matrix(interactions_df)
        
        # Train KNN model - Đảm bảo n_neighbors không vượt quá số user hiện có
        n_users = self.user_item_matrix.shape[0]
        self.current_n_neighbors = min(self.n_neighbors, n_users)
        
        self.model = NearestNeighbors(
            n_neighbors=self.current_n_neighbors,
            metric='cosine',
            algorithm='brute'
        )
        self.model.fit(self.user_item_matrix)
        
        print(f"✅ Collaborative Filtering trained with {self.user_item_matrix.shape[0]} users and {self.user_item_matrix.shape[1]} items")
        
    def get_recommendations(self, user_id, n_recommendations=10, exclude_interacted=True):
        """Lấy gợi ý sản phẩm cho user"""
        if user_id not in self.user_mapper:
            return []
        
        user_idx = self.user_mapper[user_id]
        user_vector = self.user_item_matrix[user_idx]
        
        # Tìm similar users - Đảm bảo số neighbors sử dụng không vượt quá số lượng user thực tế hiện có
        n_neighbors_to_use = min(self.current_n_neighbors, self.user_item_matrix.shape[0])
        distances, indices = self.model.kneighbors(
            user_vector,
            n_neighbors=n_neighbors_to_use
        )
        
        # Bỏ chính user đó
        similar_users = indices.flatten()
        similar_users = [idx for idx in similar_users if idx != user_idx]
        
        # Aggregate scores từ similar users
        recommendations = {}
        for similar_user_idx in similar_users:
            similar_user_items = self.user_item_matrix[similar_user_idx].toarray().flatten()
            
            for item_idx, score in enumerate(similar_user_items):
                if score > 0:
                    product_id = self.item_inv_mapper[item_idx]
                    if product_id not in recommendations:
                        recommendations[product_id] = 0
                    recommendations[product_id] += score
        
        # Loại bỏ sản phẩm đã tương tác
        if exclude_interacted:
            user_items = self.user_item_matrix[user_idx].toarray().flatten()
            interacted_items = [self.item_inv_mapper[i] for i, score in enumerate(user_items) if score > 0]
            for item in interacted_items:
                recommendations.pop(item, None)
        
        # Sort và lấy top N
        sorted_recommendations = sorted(
            recommendations.items(),
            key=lambda x: x[1],
            reverse=True
        )[:n_recommendations]
        
        return [{'product_id': pid, 'score': score} for pid, score in sorted_recommendations]
    
    def save_model(self, filepath):
        """Lưu mô hình"""
        model_data = {
            'model': self.model,
            'user_item_matrix': self.user_item_matrix,
            'user_mapper': self.user_mapper,
            'item_mapper': self.item_mapper,
            'user_inv_mapper': self.user_inv_mapper,
            'item_inv_mapper': self.item_inv_mapper
        }
        joblib.dump(model_data, filepath)
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load mô hình"""
        if not os.path.exists(filepath):
            return False
        
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.user_item_matrix = model_data['user_item_matrix']
        self.user_mapper = model_data['user_mapper']
        self.item_mapper = model_data['item_mapper']
        self.user_inv_mapper = model_data['user_inv_mapper']
        self.item_inv_mapper = model_data['item_inv_mapper']
        
        print(f"✅ Model loaded from {filepath}")
        return True
