import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from data_loader import DataLoader
from hybrid_recommender import HybridRecommender
from config import MODEL_DIR
import pandas as pd

def train_recommendation_models():
    """Train tất cả các mô hình recommendation"""
    print("="*60)
    print("🚀 BẮT ĐẦU HUẤN LUYỆN MÔ HÌNH RECOMMENDATION")
    print("="*60)
    
    # 1. Load data
    print("\n📊 Đang load dữ liệu từ database...")
    loader = DataLoader()
    
    if not loader.connect():
        print("❌ Không thể kết nối database!")
        return False
    
    try:
        products_df = loader.load_products()
        interactions_df = loader.load_user_interactions()
        orders_df = loader.load_orders()
        
        print(f"✅ Loaded {len(products_df)} products")
        print(f"✅ Loaded {len(interactions_df)} interactions")
        print(f"✅ Loaded {len(orders_df)} orders")
        
        # Kiểm tra dữ liệu
        if len(products_df) == 0:
            print("⚠️ Không có sản phẩm nào!")
            return False
        
        if len(interactions_df) == 0:
            print("⚠️ Không có interaction nào! Tạo dữ liệu mẫu...")
            # Tạo một số interactions mẫu
            interactions_df = pd.DataFrame({
                'user_id': [1, 1, 2, 2, 3],
                'product_id': products_df['product_id'].head(5).tolist(),
                'action_type': ['view', 'purchase', 'view', 'cart', 'purchase'],
                'action_value': [1, 2, 1, 1, 1],
                'timestamp': pd.Timestamp.now()
            })
        
        if len(orders_df) == 0:
            print("⚠️ Không có đơn hàng nào! Tạo dữ liệu mẫu...")
            orders_df = pd.DataFrame({
                'user_id': [1, 2],
                'product_id': products_df['product_id'].head(2).tolist(),
                'quantity': [1, 2],
                'price': products_df['price'].head(2).tolist(),
                'order_date': pd.Timestamp.now(),
                'status': 'completed'
            })
        
        # 2. Train models
        print("\n🤖 Đang huấn luyện các mô hình...")
        recommender = HybridRecommender()
        recommender.train(products_df, interactions_df, orders_df)
        
        # 3. Save models
        print(f"\n💾 Đang lưu mô hình vào {MODEL_DIR}...")
        recommender.save_models(MODEL_DIR)
        
        # 4. Test recommendations
        print("\n🧪 Test recommendations...")
        if len(interactions_df) > 0:
            test_user_id = interactions_df['user_id'].iloc[0]
            user_interactions = interactions_df[interactions_df['user_id'] == test_user_id]
            
            recs = recommender.get_recommendations(test_user_id, user_interactions, 5)
            print(f"\n📋 Top 5 recommendations for user {test_user_id}:")
            for i, rec in enumerate(recs, 1):
                print(f"  {i}. Product ID: {rec['product_id']}, Score: {rec['score']:.4f}")
        
        # Test similar products
        if len(products_df) > 0:
            test_product_id = products_df['product_id'].iloc[0]
            similar = recommender.get_similar_products(test_product_id, 5)
            print(f"\n📋 Top 5 similar products to {test_product_id}:")
            for i, rec in enumerate(similar, 1):
                print(f"  {i}. Product ID: {rec['product_id']}, Score: {rec['score']:.4f}")
        
        print("\n" + "="*60)
        print("✅ HOÀN THÀNH HUẤN LUYỆN MÔ HÌNH!")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Lỗi khi train models: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        loader.close()

if __name__ == "__main__":
    success = train_recommendation_models()
    sys.exit(0 if success else 1)
