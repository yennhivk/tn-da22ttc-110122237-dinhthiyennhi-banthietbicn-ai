import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import joblib
import os

class ContentBasedFiltering:
    """Lọc dựa trên nội dung sản phẩm"""
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        self.scaler = StandardScaler()
        self.product_features = None
        self.product_ids = None
        self.similarity_matrix = None
        
    def prepare_features(self, products_df):
        """Chuẩn bị features từ thông tin sản phẩm"""
        # Text features: tên + mô tả + thương hiệu
        products_df['text_features'] = (
            products_df['product_name'].fillna('') + ' ' +
            products_df['description'].fillna('') + ' ' +
            products_df['brand'].fillna('')
        )
        
        # TF-IDF cho text features
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(products_df['text_features'])
        
        # Numerical features: giá, category
        numerical_features = products_df[['price', 'category_id']].fillna(0)
        numerical_features_scaled = self.scaler.fit_transform(numerical_features)
        
        # Combine features
        self.product_features = np.hstack([
            tfidf_matrix.toarray(),
            numerical_features_scaled
        ])
        
        self.product_ids = products_df['product_id'].values
        
        return self.product_features
    
    def train(self, products_df):
        """Huấn luyện mô hình"""
        # Prepare features
        self.prepare_features(products_df)
        
        # Tính similarity matrix
        self.similarity_matrix = cosine_similarity(self.product_features)
        
        print(f"✅ Content-Based Filtering trained with {len(self.product_ids)} products")
    
    def get_similar_products(self, product_id, n_recommendations=10):
        """Lấy sản phẩm tương tự"""
        if product_id not in self.product_ids:
            return []
        
        # Tìm index của product
        product_idx = np.where(self.product_ids == product_id)[0][0]
        
        # Lấy similarity scores
        similarity_scores = self.similarity_matrix[product_idx]
        
        # Sort và lấy top N (bỏ chính nó)
        similar_indices = similarity_scores.argsort()[::-1][1:n_recommendations+1]
        
        recommendations = []
        for idx in similar_indices:
            recommendations.append({
                'product_id': int(self.product_ids[idx]),
                'score': float(similarity_scores[idx])
            })
        
        return recommendations
    
    def get_recommendations_for_user(self, user_interactions, products_df, n_recommendations=10):
        """Gợi ý sản phẩm dựa trên lịch sử tương tác của user"""
        # Lấy các sản phẩm user đã tương tác
        interacted_products = user_interactions['product_id'].unique()
        
        # Tính aggregate similarity cho tất cả sản phẩm
        product_scores = {}
        
        for product_id in interacted_products:
            if product_id not in self.product_ids:
                continue
            
            product_idx = np.where(self.product_ids == product_id)[0][0]
            similarity_scores = self.similarity_matrix[product_idx]
            
            for idx, score in enumerate(similarity_scores):
                pid = int(self.product_ids[idx])
                if pid not in interacted_products:  # Không gợi ý sản phẩm đã tương tác
                    if pid not in product_scores:
                        product_scores[pid] = 0
                    product_scores[pid] += score
        
        # Sort và lấy top N
        sorted_recommendations = sorted(
            product_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:n_recommendations]
        
        return [{'product_id': pid, 'score': score} for pid, score in sorted_recommendations]
    
    def save_model(self, filepath):
        """Lưu mô hình"""
        model_data = {
            'tfidf_vectorizer': self.tfidf_vectorizer,
            'scaler': self.scaler,
            'product_features': self.product_features,
            'product_ids': self.product_ids,
            'similarity_matrix': self.similarity_matrix
        }
        joblib.dump(model_data, filepath)
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load mô hình"""
        if not os.path.exists(filepath):
            return False
        
        model_data = joblib.load(filepath)
        self.tfidf_vectorizer = model_data['tfidf_vectorizer']
        self.scaler = model_data['scaler']
        self.product_features = model_data['product_features']
        self.product_ids = model_data['product_ids']
        self.similarity_matrix = model_data['similarity_matrix']
        
        print(f"✅ Model loaded from {filepath}")
        return True
