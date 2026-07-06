const express = require('express');
const db = require('../config/database');
const RecommendationEngine = require('../utils/recommendationEngineJS');
const router = express.Router();

// ==========================================
// SEARCH SUGGESTIONS API
// ==========================================
router.get('/search/suggestions', async (req, res) => {
    try {
        const { q, limit = 8 } = req.query;
        
        if (!q) {
            return res.json({ success: true, data: [] });
        }

        const queryStr = `%${q}%`;
        const limitNum = parseInt(limit) || 8;

        const [products] = await db.query(`
            SELECT 
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.thuong_hieu,
                sp.gia,
                (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.trang_thai = 'hien_thi' 
              AND (sp.ten_san_pham LIKE ? OR dm.ten_danh_muc LIKE ? OR sp.thuong_hieu LIKE ?)
            ORDER BY sp.ten_san_pham LIKE ? DESC, sp.ten_san_pham ASC
            LIMIT ?
        `, [queryStr, queryStr, queryStr, `${q}%`, limitNum]);

        // Ghi nhận lịch sử tìm kiếm cho ML
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (token && products.length > 0) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                const userId = decoded.ma_tai_khoan;
                if (userId) {
                    const topMatches = products.slice(0, 3);
                    for (const p of topMatches) {
                        await RecommendationEngine.trackUserAction(userId, p.ma_san_pham, 'search', 1.5);
                    }
                }
            }
        } catch (err) {}
        
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Search suggestions error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});


// ==========================================
// FLASH SALE - PUBLIC API (phải đặt trước route /:id)
// ==========================================

// Lấy danh sách sản phẩm Flash Sale đang diễn ra và sắp diễn ra (không cần auth)
router.get('/flash-sale', async (req, res) => {
    try {
        // Lấy flash sale đang diễn ra
        const [activeFlashSales] = await db.query(`
            SELECT 
                fs.*,
                sp.ten_san_pham,
                sp.mo_ta,
                sp.thuong_hieu,
                sp.trong_luong_kg,
                'active' as trang_thai_flash,
                (SELECT duong_dan_anh FROM anh_san_pham 
                 WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM flash_sale fs
            JOIN san_pham sp ON fs.ma_san_pham = sp.ma_san_pham
            WHERE fs.thoi_gian_bat_dau <= NOW() 
              AND fs.thoi_gian_ket_thuc >= NOW()
              AND sp.trang_thai = 'hien_thi'
            ORDER BY fs.phan_tram_giam DESC, fs.ngay_tao DESC
            LIMIT 20
        `);
        
        // Lấy flash sale sắp diễn ra (trong vòng 7 ngày tới)
        const [upcomingFlashSales] = await db.query(`
            SELECT 
                fs.*,
                sp.ten_san_pham,
                sp.mo_ta,
                sp.thuong_hieu,
                sp.trong_luong_kg,
                'upcoming' as trang_thai_flash,
                (SELECT duong_dan_anh FROM anh_san_pham 
                 WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM flash_sale fs
            JOIN san_pham sp ON fs.ma_san_pham = sp.ma_san_pham
            WHERE fs.thoi_gian_bat_dau > NOW() 
              AND fs.thoi_gian_bat_dau <= DATE_ADD(NOW(), INTERVAL 7 DAY)
              AND sp.trang_thai = 'hien_thi'
            ORDER BY fs.thoi_gian_bat_dau ASC, fs.phan_tram_giam DESC
            LIMIT 10
        `);
        
        // Gộp cả 2 danh sách: đang diễn ra trước, sắp diễn ra sau
        const allFlashSales = [...activeFlashSales, ...upcomingFlashSales];
        
        res.json({ success: true, data: allFlashSales });
    } catch (error) {
        console.error('Get flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// GET - Lấy tất cả sản phẩm với thông tin ảnh và danh mục
router.get('/', async (req, res) => {
    try {
        const { category, brand, minPrice, maxPrice, search, sort } = req.query;
        
        let query = `
            SELECT 
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.mo_ta,
                sp.gia,
                sp.so_luong,
                sp.thuong_hieu,
                sp.trang_thai,
                sp.trong_luong_kg,
                dm.ten_danh_muc,
                dm.ma_danh_muc,
                (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.trang_thai = 'hien_thi'
        `;
        
        const params = [];
        
        // Lọc theo danh mục
        if (category) {
            query += ` AND dm.ten_danh_muc LIKE ?`;
            params.push(`%${category}%`);
        }
        
        // Lọc theo thương hiệu
        if (brand) {
            query += ` AND sp.thuong_hieu LIKE ?`;
            params.push(`%${brand}%`);
        }
        
        // Lọc theo giá
        if (minPrice) {
            query += ` AND sp.gia >= ?`;
            params.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            query += ` AND sp.gia <= ?`;
            params.push(parseFloat(maxPrice));
        }
        
                // Tìm kiếm
        if (search) {
            const searchStr = search.trim();
            const words = searchStr.split(' ').filter(w => w.trim().length > 0);
            
            const searchPattern = `%${searchStr.replace(/\s+/g, '%')}%`;
            const exactPattern = `%${searchStr}%`;
            
            let searchCondition = `(sp.ten_san_pham LIKE ? OR dm.ten_danh_muc LIKE ? OR sp.thuong_hieu LIKE ?)`;
            params.push(exactPattern, exactPattern, exactPattern);
            
            if (words.length > 1) {
                let wordConditions = [];
                for (const word of words) {
                    if (word.length >= 2) {
                        wordConditions.push(`(sp.ten_san_pham LIKE ? OR dm.ten_danh_muc LIKE ? OR sp.thuong_hieu LIKE ?)`);
                        const wordPattern = `%${word}%`;
                        params.push(wordPattern, wordPattern, wordPattern);
                    }
                }
                if (wordConditions.length > 0) {
                    // Y�u c?u t�m M?T TRONG NH?NG t? d� cung du?c ph�p hi?n ra (OR)
                    searchCondition = `(${searchCondition} OR (${wordConditions.join(' AND ')}))`;
                }
            }
            
            query += ` AND (${searchCondition})`;
        }
        
        // Sắp xếp
        if (sort === 'price_asc') {
            query += ` ORDER BY sp.gia ASC`;
        } else if (sort === 'price_desc') {
            query += ` ORDER BY sp.gia DESC`;
        } else if (sort === 'newest') {
            query += ` ORDER BY sp.ngay_tao DESC`;
        } else {
            query += ` ORDER BY sp.ma_san_pham DESC`;
        }
        
        const [products] = await db.query(query, params);
        
        // ----------------------------------------------------
        // TÍCH HỢP TỰ ĐỘNG THEO DÕI HÀNH VI TÌM KIẾM (IMPLICIT)
        // ----------------------------------------------------
        if (search && products.length > 0) {
            try {
                const token = req.headers.authorization?.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                    const userId = decoded.ma_tai_khoan;
                    if (userId) {
                        const topMatches = products.slice(0, 3);
                        for (const p of topMatches) {
                            await RecommendationEngine.trackUserAction(userId, p.ma_san_pham, 'search', 1.5);
                        }
                    }
                }
            } catch (err) {
                console.error('Error in products search tracking:', err);
                // Token lỗi hoặc hết hạn thì bỏ qua, không crash API
            }
        }
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách sản phẩm:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách sản phẩm',
            error: error.message
        });
    }
});

// GET - Lấy chi tiết sản phẩm theo ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Lấy thông tin sản phẩm
        const [products] = await db.query(`
            SELECT 
                sp.*,
                dm.ten_danh_muc,
                dm.ma_danh_muc
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.ma_san_pham = ? AND sp.trang_thai = 'hien_thi'
        `, [id]);
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        // Lấy tất cả ảnh của sản phẩm
        const [images] = await db.query(`
            SELECT * FROM anh_san_pham 
            WHERE ma_san_pham = ?
            ORDER BY la_anh_chinh DESC
        `, [id]);
        
        // Lấy đánh giá của sản phẩm
        const [reviews] = await db.query(`
            SELECT 
                dg.*,
                tk.ten_dang_nhap
            FROM danh_gia dg
            LEFT JOIN tai_khoan tk ON dg.ma_tai_khoan = tk.ma_tai_khoan
            WHERE dg.ma_san_pham = ? AND dg.trang_thai = 1
            ORDER BY dg.ngay_tao DESC
        `, [id]);
        
        const product = {
            ...products[0],
            images: images,
            reviews: reviews
        };
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết sản phẩm',
            error: error.message
        });
    }
});

// GET - Lấy danh mục sản phẩm
router.get('/categories/all', async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT 
                dm.*,
                COUNT(sp.ma_san_pham) as so_luong_san_pham
            FROM danh_muc_san_pham dm
            LEFT JOIN san_pham sp ON dm.ma_danh_muc = sp.ma_danh_muc AND sp.trang_thai = 'hien_thi'
            GROUP BY dm.ma_danh_muc
            ORDER BY dm.ten_danh_muc
        `);
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Lỗi lấy danh mục:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh mục',
            error: error.message
        });
    }
});

// POST - Gửi đánh giá sản phẩm
router.post('/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;
        const { so_sao, noi_dung } = req.body;
        
        // Kiểm tra token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để đánh giá'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
        
        const userId = decoded.ma_tai_khoan;
        
        // Validate input
        if (!so_sao || so_sao < 1 || so_sao > 5) {
            return res.status(400).json({
                success: false,
                message: 'Số sao phải từ 1 đến 5'
            });
        }
        
        if (!noi_dung || noi_dung.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung đánh giá phải có ít nhất 10 ký tự'
            });
        }
        
        // Kiểm tra sản phẩm tồn tại
        const [products] = await db.query('SELECT ma_san_pham FROM san_pham WHERE ma_san_pham = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        // Kiểm tra xem user đã đánh giá sản phẩm này chưa
        const [existingReview] = await db.query(
            'SELECT ma_danh_gia FROM danh_gia WHERE ma_san_pham = ? AND ma_tai_khoan = ?',
            [productId, userId]
        );
        
        if (existingReview.length > 0) {
            // Cập nhật đánh giá cũ
            await db.query(
                'UPDATE danh_gia SET so_sao = ?, noi_dung = ?, ngay_tao = NOW() WHERE ma_san_pham = ? AND ma_tai_khoan = ?',
                [so_sao, noi_dung.trim(), productId, userId]
            );
            // Ghi nhận tương tác đánh giá (rating) cho cá nhân hóa gợi ý
            try {
                const ratingWeights = { 5: 5.0, 4: 4.0, 3: 2.0, 2: -5.0, 1: -5.0 };
                const actionValue = ratingWeights[so_sao] || 1.0;
                await RecommendationEngine.trackUserAction(userId, productId, 'rating', actionValue);
                console.log(`⭐ [Personalization] Tracked review update for User ${userId}, Product ${productId}, Stars ${so_sao}, Value ${actionValue}`);
            } catch (trackErr) {
                console.error('❌ [Personalization] Failed to track review interaction:', trackErr.message);
            }

            
            return res.json({
                success: true,
                message: 'Đã cập nhật đánh giá của bạn'
            });
        }
        
        // Thêm đánh giá mới
        await db.query(
            'INSERT INTO danh_gia (ma_san_pham, ma_tai_khoan, so_sao, noi_dung, trang_thai) VALUES (?, ?, ?, ?, 1)',
            [productId, userId, so_sao, noi_dung.trim()]
        );
        // Ghi nhận tương tác đánh giá (rating) cho cá nhân hóa gợi ý
        try {
            const ratingWeights = { 5: 5.0, 4: 4.0, 3: 2.0, 2: -5.0, 1: -5.0 };
            const actionValue = ratingWeights[so_sao] || 1.0;
            await RecommendationEngine.trackUserAction(userId, productId, 'rating', actionValue);
            console.log(`⭐ [Personalization] Tracked review insert for User ${userId}, Product ${productId}, Stars ${so_sao}, Value ${actionValue}`);
        } catch (trackErr) {
            console.error('❌ [Personalization] Failed to track review interaction:', trackErr.message);
        }

        
        res.json({
            success: true,
            message: 'Đánh giá của bạn đã được gửi thành công'
        });
        
    } catch (error) {
        console.error('Lỗi gửi đánh giá:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi gửi đánh giá',
            error: error.message
        });
    }
});

// GET - Lấy danh sách khuyến mãi sắp diễn ra và đang diễn ra (public)
router.get('/promotions/upcoming', async (req, res) => {
    try {
        const [promotions] = await db.query(`
            SELECT 
                ma_khuyen_mai,
                ten_khuyen_mai,
                ma_giam_gia,
                mo_ta,
                ngay_bat_dau,
                ngay_ket_thuc,
                dieu_kien_ap_dung,
                CASE 
                    WHEN ngay_bat_dau > NOW() THEN 'upcoming'
                    WHEN ngay_bat_dau <= NOW() AND ngay_ket_thuc >= NOW() THEN 'active'
                    ELSE 'expired'
                END as trang_thai_hien_thi
            FROM khuyen_mai 
            WHERE trang_thai = 1 AND ngay_ket_thuc >= NOW()
            ORDER BY ngay_bat_dau ASC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: promotions
        });
    } catch (error) {
        console.error('Lỗi lấy khuyến mãi:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy khuyến mãi'
        });
    }
});

module.exports = router;
