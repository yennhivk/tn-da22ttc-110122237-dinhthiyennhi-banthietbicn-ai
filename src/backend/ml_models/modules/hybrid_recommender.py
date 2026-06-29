import numpy as np
from collaborative_filtering import CollaborativeFiltering
from content_based_filtering import ContentBasedFiltering
from popularity_based import PopularityBased

class HybridRecommender:
    """Kết hợp các phương pháp recommendation"""
    
    def __init__(self):
        self.cf_model = CollaborativeFiltering()
        self.cb_model = ContentBasedFiltering()
        self.pop_model = PopularityBased()
        
        # Trọng số cho mỗi phương pháp
        self.weights = {
            'collaborative': 0.4,
            'content_based': 0.3,
            'popularity': 0.3
        }
    
    def train(self, products_df, interactions_df, orders_df):
        """Huấn luyện tất cả các mô hình"""
        print("🔄 Training Collaborative Filtering...")
        self.cf_model.train(interactions_df)
        
        print("🔄 Training Content-Based Filtering...")
        self.cb_model.train(products_df)
        
        print("🔄 Training Popularity-Based...")
        self.pop_model.train(products_df, interactions_df, orders_df)
        
        print("✅ All models trained successfully!")
    
    def get_recommendations(self, user_id, user_interactions, n_recommendations=10):
        """Lấy gợi ý hybrid cho user"""
        recommendations = {}
        
        # 1. Collaborative Filtering
        try:
            cf_recs = self.cf_model.get_recommendations(user_id, n_recommendations * 2)
            for rec in cf_recs:
                pid = rec['product_id']
                if pid not in recommendations:
                    recommendations[pid] = 0
                recommendations[pid] += rec['score'] * self.weights['collaborative']
        except Exception as e:
            print(f"CF error: {e}")
        
        # 2. Content-Based Filtering
        try:
            if len(user_interactions) > 0:
                cb_recs = self.cb_model.get_recommendations_for_user(
                    user_interactions,
                    None,  # products_df not needed if model is trained
                    n_recommendations * 2
                )
                for rec in cb_recs:
                    pid = rec['product_id']
                    if pid not in recommendations:
                        recommendations[pid] = 0
                    recommendations[pid] += rec['score'] * self.weights['content_based']
        except Exception as e:
            print(f"CB error: {e}")
        
        # 3. Popularity-Based (fallback)
        try:
            pop_recs = self.pop_model.get_popular_products(n_recommendations * 2)
            for rec in pop_recs:
                pid = rec['product_id']
                if pid not in recommendations:
                    recommendations[pid] = 0
                recommendations[pid] += rec['score'] * self.weights['popularity']
        except Exception as e:
            print(f"Pop error: {e}")
        
        # Sort và lấy top N
        sorted_recs = sorted(
            recommendations.items(),
            key=lambda x: x[1],
            reverse=True
        )[:n_recommendations]
        
        return [{'product_id': pid, 'score': score} for pid, score in sorted_recs]
    
    def get_similar_products(self, product_id, n_recommendations=10):
        """Lấy sản phẩm tương tự (chủ yếu dùng content-based)"""
        return self.cb_model.get_similar_products(product_id, n_recommendations)
    
    def get_trending_products(self, n_recommendations=10):
        """Lấy sản phẩm trending"""
        return self.pop_model.get_trending_products(n_recommendations)
    
    def save_models(self, model_dir):
        """Lưu tất cả các mô hình"""
        import os
        os.makedirs(model_dir, exist_ok=True)
        
        self.cf_model.save_model(os.path.join(model_dir, 'collaborative_filtering.pkl'))
        self.cb_model.save_model(os.path.join(model_dir, 'content_based_filtering.pkl'))
        self.pop_model.save_model(os.path.join(model_dir, 'popularity_based.pkl'))
        
        print(f"✅ All models saved to {model_dir}")
    
    def load_models(self, model_dir):
        """Load tất cả các mô hình"""
        import os
        
        cf_loaded = self.cf_model.load_model(os.path.join(model_dir, 'collaborative_filtering.pkl'))
        cb_loaded = self.cb_model.load_model(os.path.join(model_dir, 'content_based_filtering.pkl'))
        pop_loaded = self.pop_model.load_model(os.path.join(model_dir, 'popularity_based.pkl'))
        
        if cf_loaded and cb_loaded and pop_loaded:
            print(f"✅ All models loaded from {model_dir}")
            return True
        else:
            print(f"⚠️ Some models failed to load")
            return False
