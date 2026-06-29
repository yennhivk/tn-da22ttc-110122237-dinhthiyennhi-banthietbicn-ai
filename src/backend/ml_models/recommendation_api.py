from flask import Flask, request, jsonify
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from hybrid_recommender import HybridRecommender
from data_loader import DataLoader
from config import MODEL_DIR
import pandas as pd

app = Flask(__name__)

# Load models khi khởi động
recommender = HybridRecommender()
models_loaded = False

def load_models():
    """Load các mô hình đã train"""
    global models_loaded
    try:
        success = recommender.load_models(MODEL_DIR)
        if success:
            models_loaded = True
            print("✅ Models loaded successfully")
        else:
            print("⚠️ Models not found. Please train models first.")
        return success
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False

# Load models khi start
load_models()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'models_loaded': models_loaded
    })

@app.route('/recommendations/user/<int:user_id>', methods=['GET'])
def get_user_recommendations(user_id):
    """Lấy gợi ý cho user"""
    if not models_loaded:
        return jsonify({
            'success': False,
            'message': 'Models not loaded. Please train models first.'
        }), 503
    
    try:
        limit = int(request.args.get('limit', 10))
        
        # Load user interactions
        loader = DataLoader()
        if not loader.connect():
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            interactions_df = loader.load_user_interactions()
            user_interactions = interactions_df[interactions_df['user_id'] == user_id]
            
            # Get recommendations
            recommendations = recommender.get_recommendations(
                user_id,
                user_interactions,
                limit
            )
            
            return jsonify({
                'success': True,
                'user_id': user_id,
                'recommendations': recommendations
            })
        finally:
            loader.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/recommendations/similar/<int:product_id>', methods=['GET'])
def get_similar_products(product_id):
    """Lấy sản phẩm tương tự"""
    if not models_loaded:
        return jsonify({
            'success': False,
            'message': 'Models not loaded'
        }), 503
    
    try:
        limit = int(request.args.get('limit', 10))
        
        recommendations = recommender.get_similar_products(product_id, limit)
        
        return jsonify({
            'success': True,
            'product_id': product_id,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/recommendations/trending', methods=['GET'])
def get_trending_products():
    """Lấy sản phẩm trending"""
    if not models_loaded:
        return jsonify({
            'success': False,
            'message': 'Models not loaded'
        }), 503
    
    try:
        limit = int(request.args.get('limit', 10))
        
        recommendations = recommender.get_trending_products(limit)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/recommendations/popular', methods=['GET'])
def get_popular_products():
    """Lấy sản phẩm phổ biến"""
    if not models_loaded:
        return jsonify({
            'success': False,
            'message': 'Models not loaded'
        }), 503
    
    try:
        limit = int(request.args.get('limit', 10))
        
        recommendations = recommender.pop_model.get_popular_products(limit)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/train', methods=['POST'])
def train_models():
    """Endpoint để retrain models"""
    try:
        from train_models import train_recommendation_models
        
        success = train_recommendation_models()
        
        if success:
            # Reload models
            load_models()
            return jsonify({
                'success': True,
                'message': 'Models trained successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Training failed'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    print("="*60)
    print("🚀 Starting Recommendation API Server")
    print("="*60)
    app.run(host='0.0.0.0', port=5000, debug=True)
