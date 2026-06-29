import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import os

class PopularityBased:
    """Gợi ý dựa trên độ phổ biến"""
    
    def __init__(self):
        self.popular_products = None
        self.trending_products = None
        self.category_popular = {}
        
    def calculate_popularity_score(self, products_df, interactions_df, orders_df):
        """Tính điểm phổ biến cho sản phẩm"""
        # Điểm từ interactions
        interaction_scores = interactions_df.groupby('product_id').agg({
            'action_type': 'count',
            'action_value': 'sum'
        }).rename(columns={'action_type': 'interaction_count', 'action_value': 'interaction_value'})
        
        # Điểm từ orders
        order_scores = orders_df.groupby('product_id').agg({
            'quantity': 'sum',
            'price': 'mean'
        }).rename(columns={'quantity': 'total_sold'})
        
        # Merge scores
        popularity_df = products_df[['product_id', 'category_id', 'price']].copy()
        popularity_df = popularity_df.merge(interaction_scores, on='product_id', how='left')
        popularity_df = popularity_df.merge(order_scores, on='product_id', how='left')
        
        # Fill NaN
        popularity_df['interaction_count'] = popularity_df['interaction_count'].fillna(0)
        popularity_df['interaction_value'] = popularity_df['interaction_value'].fillna(0)
        popularity_df['total_sold'] = popularity_df['total_sold'].fillna(0)
        
        # Tính popularity score
        popularity_df['popularity_score'] = (
            popularity_df['interaction_count'] * 0.3 +
            popularity_df['interaction_value'] * 0.2 +
            popularity_df['total_sold'] * 0.5
        )
        
        return popularity_df
    
    def calculate_trending_score(self, interactions_df, orders_df, days=30):
        """Tính điểm trending (sản phẩm đang hot)"""
        # Lọc dữ liệu gần đây
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_interactions = interactions_df[
            pd.to_datetime(interactions_df['timestamp']) >= cutoff_date
        ]
        recent_orders = orders_df[
            pd.to_datetime(orders_df['order_date']) >= cutoff_date
        ]
        
        # Tính trending score
        interaction_trend = recent_interactions.groupby('product_id').size()
        order_trend = recent_orders.groupby('product_id')['quantity'].sum()
        
        trending_df = pd.DataFrame({
            'product_id': list(set(interaction_trend.index) | set(order_trend.index))
        })
        
        trending_df = trending_df.merge(
            interaction_trend.rename('interaction_trend'),
            on='product_id',
            how='left'
        )
        trending_df = trending_df.merge(
            order_trend.rename('order_trend'),
            on='product_id',
            how='left'
        )
        
        trending_df['interaction_trend'] = trending_df['interaction_trend'].fillna(0)
        trending_df['order_trend'] = trending_df['order_trend'].fillna(0)
        
        trending_df['trending_score'] = (
            trending_df['interaction_trend'] * 0.4 +
            trending_df['order_trend'] * 0.6
        )
        
        return trending_df
    
    def train(self, products_df, interactions_df, orders_df):
        """Huấn luyện mô hình"""
        # Calculate popularity
        popularity_df = self.calculate_popularity_score(products_df, interactions_df, orders_df)
        self.popular_products = popularity_df.sort_values('popularity_score', ascending=False)
        
        # Calculate trending
        trending_df = self.calculate_trending_score(interactions_df, orders_df)
        self.trending_products = trending_df.sort_values('trending_score', ascending=False)
        
        # Calculate popularity by category
        for category_id in products_df['category_id'].unique():
            category_products = popularity_df[popularity_df['category_id'] == category_id]
            self.category_popular[category_id] = category_products.sort_values(
                'popularity_score',
                ascending=False
            )
        
        print(f"✅ Popularity-Based model trained with {len(self.popular_products)} products")
    
    def get_popular_products(self, n_recommendations=10):
        """Lấy sản phẩm phổ biến nhất"""
        if self.popular_products is None:
            return []
        
        top_products = self.popular_products.head(n_recommendations)
        return [
            {
                'product_id': int(row['product_id']),
                'score': float(row['popularity_score'])
            }
            for _, row in top_products.iterrows()
        ]
    
    def get_trending_products(self, n_recommendations=10):
        """Lấy sản phẩm đang trending"""
        if self.trending_products is None:
            return []
        
        top_products = self.trending_products.head(n_recommendations)
        return [
            {
                'product_id': int(row['product_id']),
                'score': float(row['trending_score'])
            }
            for _, row in top_products.iterrows()
        ]
    
    def get_popular_by_category(self, category_id, n_recommendations=10):
        """Lấy sản phẩm phổ biến theo danh mục"""
        if category_id not in self.category_popular:
            return []
        
        top_products = self.category_popular[category_id].head(n_recommendations)
        return [
            {
                'product_id': int(row['product_id']),
                'score': float(row['popularity_score'])
            }
            for _, row in top_products.iterrows()
        ]
    
    def save_model(self, filepath):
        """Lưu mô hình"""
        model_data = {
            'popular_products': self.popular_products,
            'trending_products': self.trending_products,
            'category_popular': self.category_popular
        }
        joblib.dump(model_data, filepath)
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load mô hình"""
        if not os.path.exists(filepath):
            return False
        
        model_data = joblib.load(filepath)
        self.popular_products = model_data['popular_products']
        self.trending_products = model_data['trending_products']
        self.category_popular = model_data['category_popular']
        
        print(f"✅ Model loaded from {filepath}")
        return True
