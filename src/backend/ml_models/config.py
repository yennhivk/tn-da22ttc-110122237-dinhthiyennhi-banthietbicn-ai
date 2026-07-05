import os
from dotenv import load_dotenv

# Load .env thá»‘ng nháº¥t tá»« thÆ° mÃ»c backend
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'doan_csdl'),
    'port': int(os.getenv('DB_PORT', 3306))
}

# Model paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'trained_models')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Recommendation settings
MIN_INTERACTIONS = 3  # Số tương tác tối thiểu để đưa ra gợi ý
KNN_NEIGHBORS = 7     # Số lượng neighbors cho KNN
TOP_N = 20            # Số sản phẩm gợi ý mặc định
