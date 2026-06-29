const axios = require('axios');
const db = require('../config/db');

// Python ML API endpoint
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

class RecommendationEngine {
    /**
     * Lấy gợi ý sản phẩm cho người dùng từ Python ML API
     */
    static async getRecommendationsForUser(userId, limit = 10) {
        try {
            // Gọi Python API
            const response = await axios.get(
                `${ML_API_URL}/recommendations/user/${userId}`,
                { params: { limit }, timeout: 5000 }
            );
            
            if (response.data.success && response.data.recommendations) {
                const productIds = response.data.recommendations.map(r => r.product_id);
                
                // Lấy thông tin chi tiết sản phẩm từ database
                if (productIds.length > 0) {
                    const [products] = await db.query(
                        `SELECT MaSP, TenSP, Gia, HinhAnh, MoTa, ThuongHieu 
                         FROM sanpham 
                         WHERE MaSP IN (?) AND TrangThai = 'active'`,
                        [productIds]
                    );
                    
                    // Map scores vào products
                    const scoreMap = {};
                    response.data.recommendations.forEach(r => {
                        scoreMap[r.product_id] = r.score;
                    });
                    
                    return products.map(p => ({
                        ...p,
                        recommendationScore: scoreMap[p.MaSP] || 0
                    }));
                }
            }
            
            // Fallback: trả về sản phẩm phổ biến
            return await this.getPopularProducts(limit);
            
        } catch (error) {
            console.error('Error getting ML recommendations:', error.message);
            // Fallback: trả về sản phẩm phổ biến
            return await this.getPopularProducts(limit);
        }
    }
    
    /**
     * Lấy sản phẩm tương tự
     */
    static async getSimilarProducts(productId, limit = 10) {
        try {
            const response = await axios.get(
                `${ML_API_URL}/recommendations/similar/${productId}`,
                { params: { limit }, timeout: 5000 }
            );
            
            if (response.data.success && response.data.recommendations) {
                const productIds = response.data.recommendations.map(r => r.product_id);
                
                if (productIds.length > 0) {
                    const [products] = await db.query(
                        `SELECT MaSP, TenSP, Gia, HinhAnh, MoTa, ThuongHieu 
                         FROM sanpham 
                         WHERE MaSP IN (?) AND TrangThai = 'active'`,
                        [productIds]
                    );
                    
                    const scoreMap = {};
                    response.data.recommendations.forEach(r => {
                        scoreMap[r.product_id] = r.score;
                    });
                    
                    return products.map(p => ({
                        ...p,
                        similarityScore: scoreMap[p.MaSP] || 0
                    }));
                }
            }
            
            // Fallback: sản phẩm cùng danh mục
            return await this.getProductsByCategory(productId, limit);
            
        } catch (error) {
            console.error('Error getting similar products:', error.message);
            return await this.getProductsByCategory(productId, limit);
        }
    }
    
    /**
     * Lấy sản phẩm trending
     */
    static async getTrendingProducts(limit = 10) {
        try {
            const response = await axios.get(
                `${ML_API_URL}/recommendations/trending`,
                { params: { limit }, timeout: 5000 }
            );
            
            if (response.data.success && response.data.recommendations) {
                const productIds = response.data.recommendations.map(r => r.product_id);
                
                if (productIds.length > 0) {
                    const [products] = await db.query(
                        `SELECT MaSP, TenSP, Gia, HinhAnh, MoTa, ThuongHieu 
                         FROM sanpham 
                         WHERE MaSP IN (?) AND TrangThai = 'active'`,
                        [productIds]
                    );
                    
                    return products;
                }
            }
            
            return await this.getPopularProducts(limit);
            
        } catch (error) {
            console.error('Error getting trending products:', error.message);
            return await this.getPopularProducts(limit);
        }
    }
    
    /**
     * Ghi nhận hành vi người dùng
     */
    static async trackUserAction(userId, productId, actionType, actionValue = 1) {
        try {
            await db.query(
                `INSERT INTO user_interactions (MaND, MaSP, LoaiTuongTac, GiaTri, ThoiGian)
                 VALUES (?, ?, ?, ?, NOW())`,
                [userId, productId, actionType, actionValue]
            );
            return true;
        } catch (error) {
            console.error('Error tracking user action:', error);
            return false;
        }
    }
    
    /**
     * Fallback: Lấy sản phẩm phổ biến từ database
     */
    static async getPopularProducts(limit = 10) {
        try {
            const [products] = await db.query(
                `SELECT sp.MaSP, sp.TenSP, sp.Gia, sp.HinhAnh, sp.MoTa, sp.ThuongHieu,
                        COUNT(DISTINCT ctdh.MaDH) as order_count
                 FROM sanpham sp
                 LEFT JOIN chitietdonhang ctdh ON sp.MaSP = ctdh.MaSP
                 WHERE sp.TrangThai = 'active'
                 GROUP BY sp.MaSP
                 ORDER BY order_count DESC, sp.NgayTao DESC
                 LIMIT ?`,
                [limit]
            );
            return products;
        } catch (error) {
            console.error('Error getting popular products:', error);
            return [];
        }
    }
    
    /**
     * Fallback: Lấy sản phẩm cùng danh mục
     */
    static async getProductsByCategory(productId, limit = 10) {
        try {
            const [products] = await db.query(
                `SELECT sp2.MaSP, sp2.TenSP, sp2.Gia, sp2.HinhAnh, sp2.MoTa, sp2.ThuongHieu
                 FROM sanpham sp1
                 JOIN sanpham sp2 ON sp1.MaDM = sp2.MaDM
                 WHERE sp1.MaSP = ? AND sp2.MaSP != ? AND sp2.TrangThai = 'active'
                 ORDER BY RAND()
                 LIMIT ?`,
                [productId, productId, limit]
            );
            return products;
        } catch (error) {
            console.error('Error getting products by category:', error);
            return [];
        }
    }
}

module.exports = RecommendationEngine;
