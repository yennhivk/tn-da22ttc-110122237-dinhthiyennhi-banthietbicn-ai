"""
Script tìm giá trị K tối ưu cho KNN Collaborative Filtering
Sử dụng Cross-Validation
"""

import numpy as np
from sklearn.model_selection import KFold
from sklearn.metrics import mean_squared_error
from modules.data_loader import DataLoader
from modules.collaborative_filtering import CollaborativeFiltering
import matplotlib.pyplot as plt

def find_optimal_k(min_k=3, max_k=51, step=2):
    """
    Tìm K tối ưu bằng Cross-Validation
    
    Args:
        min_k: Giá trị K nhỏ nhất để thử
        max_k: Giá trị K lớn nhất để thử
        step: Bước nhảy (nên là 2 để giữ K lẻ)
    """
    print("🔍 Đang tìm giá trị K tối ưu...")
    
    # Load dữ liệu
    data_loader = DataLoader()
    if not data_loader.connect():
        print("❌ Không thể kết nối database!")
        return 5
        
    try:
        interactions_df = data_loader.load_user_interactions()
    finally:
        data_loader.close()
    
    if len(interactions_df) < 100:
        print(f"⚠️ Dữ liệu quá ít ({len(interactions_df)} tương tác), sử dụng K mặc định = 5")
        return 5
    
    # Các giá trị K cần thử
    k_values = range(min_k, max_k, step)
    scores = []
    
    # Cross-validation với 5 folds
    kfold = KFold(n_splits=5, shuffle=True, random_state=42)
    
    for k in k_values:
        fold_scores = []
        
        print(f"  Đang thử K = {k}...")
        
        for train_idx, test_idx in kfold.split(interactions_df):
            train_data = interactions_df.iloc[train_idx]
            test_data = interactions_df.iloc[test_idx]
            
            # Train model với K hiện tại
            cf_model = CollaborativeFiltering(n_neighbors=k)
            cf_model.train(train_data)
            
            # Đánh giá trên test set
            predictions = []
            actuals = []
            
            for _, row in test_data.iterrows():
                user_id = row['user_id']
                actual_product = row['product_id']
                
                # Lấy recommendations
                recs = cf_model.get_recommendations(user_id, n_recommendations=10)
                
                # Kiểm tra xem sản phẩm thực tế có trong top 10 không
                rec_products = [r['product_id'] for r in recs]
                
                if actual_product in rec_products:
                    # Tính vị trí (rank) của sản phẩm
                    rank = rec_products.index(actual_product) + 1
                    predictions.append(1.0 / rank)  # Điểm cao hơn nếu rank cao
                else:
                    predictions.append(0)
                
                actuals.append(1)
            
            # Tính Mean Reciprocal Rank (MRR)
            mrr = np.mean(predictions)
            fold_scores.append(mrr)
        
        # Điểm trung bình của K này
        avg_score = np.mean(fold_scores)
        scores.append(avg_score)
        print(f"    → MRR Score: {avg_score:.4f}")
    
    # Tìm K tốt nhất
    best_idx = np.argmax(scores)
    best_k = list(k_values)[best_idx]
    best_score = scores[best_idx]
    
    print(f"\n✅ K tối ưu: {best_k} (MRR Score: {best_score:.4f})")
    
    # Vẽ biểu đồ
    plot_k_scores(k_values, scores, best_k)
    
    return best_k

def plot_k_scores(k_values, scores, best_k):
    """Vẽ biểu đồ điểm số theo K"""
    plt.figure(figsize=(10, 6))
    plt.plot(list(k_values), scores, marker='o', linewidth=2, markersize=6)
    plt.axvline(x=best_k, color='r', linestyle='--', label=f'K tối ưu = {best_k}')
    plt.xlabel('Giá trị K', fontsize=12)
    plt.ylabel('MRR Score', fontsize=12)
    plt.title('Tìm K tối ưu cho KNN Collaborative Filtering', fontsize=14, fontweight='bold')
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    
    # Lưu biểu đồ
    plt.savefig('optimal_k_plot.png', dpi=300)
    print(f"📊 Biểu đồ đã lưu: optimal_k_plot.png")
    plt.close()

def quick_estimate_k():
    """
    Ước lượng nhanh K dựa trên quy tắc căng bậc hai
    """
    data_loader = DataLoader()
    if not data_loader.connect():
        print("❌ Không thể kết nối database!")
        return 5
        
    try:
        interactions_df = data_loader.load_user_interactions()
    finally:
        data_loader.close()
    
    n_samples = len(interactions_df)
    estimated_k = int(np.sqrt(n_samples))
    
    # Làm tròn thành số lẻ
    if estimated_k % 2 == 0:
        estimated_k += 1
    
    print(f"📊 Số lượng tương tác: {n_samples}")
    print(f"📐 K ước lượng (√n): {estimated_k}")
    
    return estimated_k

if __name__ == "__main__":
    print("=" * 60)
    print("TÌM GIÁ TRỊ K TỐI ƯU CHO KNN")
    print("=" * 60)
    
    # Phương pháp 1: Ước lượng nhanh
    print("\n1️⃣ PHƯƠNG PHÁP ƯỚC LƯỢNG NHANH (Square Root Rule)")
    print("-" * 60)
    estimated_k = quick_estimate_k()
    
    # Phương pháp 2: Cross-validation (chính xác hơn nhưng chậm hơn)
    print("\n2️⃣ PHƯƠNG PHÁP CROSS-VALIDATION (Chính xác)")
    print("-" * 60)
    print("⚠️ Phương pháp này có thể mất vài phút...")
    
    user_choice = input("\nBạn có muốn chạy Cross-Validation? (y/n): ").lower()
    
    if user_choice == 'y':
        optimal_k = find_optimal_k(min_k=3, max_k=min(51, estimated_k * 2), step=2)
        print(f"\n🎯 KẾT LUẬN:")
        print(f"   - K ước lượng: {estimated_k}")
        print(f"   - K tối ưu (CV): {optimal_k}")
        print(f"   - Khuyến nghị: Sử dụng K = {optimal_k}")
    else:
        print(f"\n🎯 KẾT LUẬN:")
        print(f"   - Khuyến nghị: Sử dụng K = {estimated_k} (dựa trên √n)")
