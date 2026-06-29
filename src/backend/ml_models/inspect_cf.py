"""Kiểm tra model CF: ai gần user 4, gợi ý gì cho user 4"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

import joblib
import numpy as np
from collaborative_filtering import CollaborativeFiltering

# Load trained CF model trực tiếp
cf = CollaborativeFiltering()
cf.load_model(os.path.join(os.path.dirname(__file__), 'trained_models', 'collaborative_filtering.pkl'))

# `current_n_neighbors` không lưu trong pickle, set tay
cf.current_n_neighbors = min(10, cf.user_item_matrix.shape[0])

print("="*60)
print("USERS in user_mapper:", sorted(cf.user_mapper.keys()))
print("Total users:", len(cf.user_mapper))
print("Total items:", len(cf.item_mapper))
print("ITEMS in item_mapper:", sorted(cf.item_mapper.keys()))
print()

# user 4 (yennhivk82@gmail.com) - admin
TARGET = 4
print(f"=== USER {TARGET} (yennhivk82@gmail.com) ===")
if TARGET in cf.user_mapper:
    idx = cf.user_mapper[TARGET]
    vec = cf.user_item_matrix[idx].toarray().flatten()
    interacted = [(cf.item_inv_mapper[i], s) for i, s in enumerate(vec) if s > 0]
    print(f"  Interacted items (in CF matrix): {interacted}")

    # Tìm similar users
    print(f"  n_neighbors_to_use: {cf.current_n_neighbors}")
    distances, indices = cf.model.kneighbors(
        cf.user_item_matrix[idx], n_neighbors=cf.current_n_neighbors
    )
    print(f"  Distances: {distances.flatten()}")
    print(f"  Indices: {indices.flatten()}")
    print(f"  Similar users (user_id, distance):")
    for d, i in zip(distances.flatten(), indices.flatten()):
        uid = cf.user_inv_mapper[i]
        marker = " (SELF)" if uid == TARGET else ""
        print(f"    user_id={uid}, cosine_dist={d:.4f}, cosine_sim={1-d:.4f}{marker}")

    # Lấy recommendations
    recs = cf.get_recommendations(TARGET, n_recommendations=20, exclude_interacted=True)
    print(f"\n  CF recommendations for user {TARGET} (top 20):")
    for r in recs:
        print(f"    product_id={r['product_id']}, score={r['score']:.4f}")
    print(f"  TOTAL CF RECOMMENDATIONS: {len(recs)}")
else:
    print(f"  USER {TARGET} NOT IN CF MODEL!")

print()
TARGET2 = 9
print(f"=== USER {TARGET2} (dinhthiyennhitv84@gmail.com) ===")
if TARGET2 in cf.user_mapper:
    idx = cf.user_mapper[TARGET2]
    vec = cf.user_item_matrix[idx].toarray().flatten()
    interacted = [(cf.item_inv_mapper[i], s) for i, s in enumerate(vec) if s > 0]
    print(f"  Interacted items (in CF matrix): {interacted}")
else:
    print(f"  USER {TARGET2} NOT IN CF MODEL!")
