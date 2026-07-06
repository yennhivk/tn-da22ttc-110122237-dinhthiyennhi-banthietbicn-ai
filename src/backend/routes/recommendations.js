const express = require('express');
const router = express.Router();
const RecommendationEngine = require('../utils/recommendationEngineJS');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Tự động khởi tạo database nếu cần
RecommendationEngine.setupDatabase().catch(err => {
    console.error('Lỗi khi setupDatabase cho RecommendationEngine:', err.message);
});

// Lấy cấu hình trọng số gợi ý hiện tại
router.get('/config', async (req, res) => {
    try {
        const weights = await RecommendationEngine.getWeights();
        res.json({
            success: true,
            data: weights
        });
    } catch (error) {
        console.error('Lỗi khi lấy cấu hình trọng số:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy cấu hình trọng số gợi ý',
            error: error.message
        });
    }
});

// Lưu cấu hình trọng số gợi ý (Chỉ Admin mới có quyền)
router.post('/config', requireAdmin, async (req, res) => {
    try {
        const { cf, cb, pop } = req.body;
        
        // Validation cơ bản
        if (cf === undefined || cb === undefined || pop === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin trọng số cf, cb, hoặc pop'
            });
        }
        
        const cfNum = parseFloat(cf);
        const cbNum = parseFloat(cb);
        const popNum = parseFloat(pop);
        
        if (isNaN(cfNum) || isNaN(cbNum) || isNaN(popNum)) {
            return res.status(400).json({
                success: false,
                message: 'Trọng số phải là số hợp lệ'
            });
        }
        
        // Đảm bảo tổng trọng số xấp xỉ 1.0 (cho phép sai số nhỏ do làm tròn)
        const sum = cfNum + cbNum + popNum;
        if (Math.abs(sum - 1.0) > 0.05) {
            return res.status(400).json({
                success: false,
                message: 'Tổng các trọng số phải bằng 1.0 (hoặc 100%)'
            });
        }
        
        const success = await RecommendationEngine.saveWeights(cfNum, cbNum, popNum);
        if (success) {
            res.json({
                success: true,
                message: 'Đã lưu cấu hình trọng số gợi ý thành công',
                data: { cf: cfNum, cb: cbNum, pop: popNum }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Không thể lưu cấu hình vào cơ sở dữ liệu'
            });
        }
    } catch (error) {
        console.error('Lỗi khi lưu cấu hình trọng số:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu cấu hình trọng số gợi ý',
            error: error.message
        });
    }
});


// Quy đổi nhãn ngân sách (chuỗi tiếng Việt từ form khảo sát) sang khoảng giá VND
// Trả về {min, max} hoặc null nếu nhãn không hợp lệ
function parseBudgetRange(label) {
    if (!label) return null;
    const map = {
        'Dưới 5 triệu':   { min: 0,         max: 5_000_000 },
        '5 - 10 triệu':   { min: 5_000_000, max: 10_000_000 },
        '10 - 20 triệu':  { min: 10_000_000, max: 20_000_000 },
        '20 - 35 triệu':  { min: 20_000_000, max: 35_000_000 },
        'Trên 35 triệu':  { min: 35_000_000, max: 999_999_999 }
    };
    return map[label] || null;
}

// Lấy sản phẩm gợi ý cho người dùng
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const limit = parseInt(req.query.limit) || 10;
        
        const recommendations = await RecommendationEngine.getRecommendationsForUser(userId, limit);
        
        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('Error getting user recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm gợi ý',
            error: error.message
        });
    }
});

// Lấy sản phẩm tương tự
router.get('/similar/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const limit = parseInt(req.query.limit) || 10;
        
        const recommendations = await RecommendationEngine.getSimilarProducts(productId, limit);
        
        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('Error getting similar products:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm tương tự',
            error: error.message
        });
    }
});

// Lấy sản phẩm gợi ý theo sở thích (Content-Based) cho người dùng
router.get('/content-based/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const limit = parseInt(req.query.limit) || 8;
        
        const recommendations = await RecommendationEngine.getContentBasedRecommendations(userId, limit);
        
        // Đánh dấu loại gợi ý là preference
        recommendations.forEach(p => {
            p.recommendation_type = 'preference';
            p.match_score = 85 + Math.floor((p.ma_san_pham % 10) + Math.random() * 5);
        });

        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('Error getting content-based recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm gợi ý theo sở thích',
            error: error.message
        });
    }
});

// Lấy sản phẩm theo danh mục người dùng đã mua
// Trả về: { hasInterest, categories: [{ma_danh_muc, ten_danh_muc, purchase_count}], products: [...] }
router.get('/interested-categories/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 8;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Thiếu userId' });
        }

        // Tìm các sản phẩm user đã mua, group theo danh mục
        const [interestedCats] = await db.query(`
            SELECT sp.ma_danh_muc,
                   dm.ten_danh_muc,
                   COUNT(DISTINCT purchase_per_product.MaSP) as product_count,
                   SUM(purchase_per_product.purchase_count) as total_purchases
            FROM (
                SELECT MaSP, SUM(purchase_count) as purchase_count
                FROM (
                    SELECT MaSP, COUNT(*) as purchase_count
                    FROM user_interactions
                    WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                    GROUP BY MaSP
                    UNION ALL
                    SELECT ctdh.ma_san_pham as MaSP, SUM(ctdh.so_luong) as purchase_count
                    FROM chi_tiet_don_hang ctdh
                    JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
                    WHERE dh.ma_tai_khoan = ? AND dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao', 'cho_xac_nhan', 'da_xac_nhan')
                    GROUP BY ctdh.ma_san_pham
                ) combined_purchases
                GROUP BY MaSP
            ) purchase_per_product
            JOIN san_pham sp ON sp.ma_san_pham = purchase_per_product.MaSP
            LEFT JOIN danh_muc_san_pham dm ON dm.ma_danh_muc = sp.ma_danh_muc
            GROUP BY sp.ma_danh_muc, dm.ten_danh_muc
            ORDER BY total_purchases DESC
        `, [userId, userId, userId]);

        if (interestedCats.length === 0) {
            return res.json({
                success: true,
                hasInterest: false,
                categories: [],
                products: []
            });
        }

        const categoryIds = interestedCats.map(c => c.ma_danh_muc).filter(Boolean);
        if (categoryIds.length === 0) {
            return res.json({
                success: true,
                hasInterest: false,
                categories: [],
                products: []
            });
        }

        // Lấy sản phẩm cùng danh mục, loại trừ sản phẩm đã mua
        const [products] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta,
                   sp.trong_luong_kg,
                   sp.ma_danh_muc, dm.ten_danh_muc, a.duong_dan_anh
            FROM san_pham sp
            LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
            LEFT JOIN danh_muc_san_pham dm ON dm.ma_danh_muc = sp.ma_danh_muc
            WHERE sp.ma_danh_muc IN (?)
              AND sp.trang_thai = 'hien_thi'
              AND sp.ma_san_pham NOT IN (
                  SELECT MaSP FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                  UNION
                  SELECT ctdh.ma_san_pham FROM chi_tiet_don_hang ctdh JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang WHERE dh.ma_tai_khoan = ?
              )
            ORDER BY sp.ngay_tao DESC
            LIMIT ?
        `, [categoryIds, userId, userId, limit]);

        // Đánh dấu loại gợi ý để frontend hiển thị badge phù hợp
        products.forEach(p => {
            p.recommendation_type = 'interested_category';
            p.match_score = 90 + Math.floor((p.ma_san_pham % 10));
        });

        res.json({
            success: true,
            hasInterest: true,
            categories: interestedCats.map(c => ({
                ma_danh_muc: c.ma_danh_muc,
                ten_danh_muc: c.ten_danh_muc,
                product_count: c.product_count,
                total_purchases: c.total_purchases
            })),
            products
        });
    } catch (error) {
        console.error('Error getting interested categories:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh mục quan tâm',
            error: error.message
        });
    }
});

// Ghi nhận hành vi người dùng
router.post('/track', async (req, res) => {
    try {
        const { userId, productId, actionType, actionValue } = req.body;
        
        if (!userId || !productId || !actionType) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }
        
        await RecommendationEngine.trackUserAction(userId, productId, actionType, actionValue);
        
        let isHighlyInterested = false;
        let productName = '';
        let categoryName = '';

        if (actionType === 'view') {
            // Đếm số lượt xem của người dùng đối với sản phẩm này
            const [rows] = await db.query(
                "SELECT COUNT(*) as count FROM user_interactions WHERE MaND = ? AND MaSP = ? AND LoaiTuongTac = 'view'",
                [userId, productId]
            );
            
            const viewCount = rows[0]?.count || 0;
            
            if (viewCount === 5) {
                isHighlyInterested = true;
                // Lấy thông tin sản phẩm và danh mục để trả về cho frontend
                const [prodRows] = await db.query(
                    `SELECT sp.ten_san_pham, dm.ten_danh_muc 
                     FROM san_pham sp 
                     LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc 
                     WHERE sp.ma_san_pham = ?`,
                    [productId]
                );
                if (prodRows.length > 0) {
                    productName = prodRows[0].ten_san_pham;
                    categoryName = prodRows[0].ten_danh_muc;
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Đã ghi nhận hành vi',
            isHighlyInterested,
            productName,
            categoryName
        });
    } catch (error) {
        console.error('Error tracking user action:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi ghi nhận hành vi',
            error: error.message
        });
    }
});

// Kiểm tra trạng thái khảo sát của người dùng (nguồn sự thật: DB)
router.get('/preferences/status/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'Thiếu userId' });
        }

        const [rows] = await db.query(
            `SELECT muc_dich_su_dung, phan_khuc_ngan_sach, danh_muc_quan_tam, thuong_hieu_yeu_thich, da_hoan_thanh_khao_sat 
             FROM thong_tin_ca_nhan_hoa 
             WHERE ma_tai_khoan = ? LIMIT 1`,
            [userId]
        );

        // Nếu chưa có record trong DB
        if (rows.length === 0) {
            return res.json({ 
                success: true, 
                completed: false,
                nextStep: 1, // Bắt đầu từ bước 1
                filledSteps: []
            });
        }

        const data = rows[0];
        const filledSteps = [];
        
        // Kiểm tra từng trường
        if (data.muc_dich_su_dung) filledSteps.push(1);
        if (data.phan_khuc_ngan_sach) filledSteps.push(2);
        
        // Parse JSON cho categories và brands
        let categories = [];
        let brands = [];
        try {
            if (data.danh_muc_quan_tam) {
                categories = typeof data.danh_muc_quan_tam === 'string' 
                    ? JSON.parse(data.danh_muc_quan_tam) 
                    : data.danh_muc_quan_tam;
            }
            if (data.thuong_hieu_yeu_thich) {
                brands = typeof data.thuong_hieu_yeu_thich === 'string' 
                    ? JSON.parse(data.thuong_hieu_yeu_thich) 
                    : data.thuong_hieu_yeu_thich;
            }
        } catch (e) {
            console.error('Parse JSON error:', e);
        }
        
        if (Array.isArray(categories) && categories.length > 0) filledSteps.push(3);
        if (Array.isArray(brands) && brands.length > 0) filledSteps.push(4);
        
        // Tính bước tiếp theo
        let nextStep = 1;
        for (let i = 1; i <= 4; i++) {
            if (!filledSteps.includes(i)) {
                nextStep = i;
                break;
            }
        }
        
        // Hoàn thành khi đủ 4 bước
        const completed = filledSteps.length === 4;

        res.json({ 
            success: true, 
            completed,
            nextStep: completed ? 4 : nextStep,
            filledSteps,
            currentData: {
                purpose: data.muc_dich_su_dung || null,
                budget: data.phan_khuc_ngan_sach || null,
                categories: categories,
                brands: brands
            }
        });
    } catch (error) {
        console.error('Check preference status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Lưu sở thích ban đầu của người dùng (Cold Start) - Support partial update
router.post('/preferences', async (req, res) => {
    try {
        const { userId, categories, brands, purpose, budget } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId'
            });
        }

        // Kiểm tra xem user đã có record chưa
        const [existing] = await db.query(
            `SELECT * FROM thong_tin_ca_nhan_hoa WHERE ma_tai_khoan = ? LIMIT 1`,
            [userId]
        );

        if (existing.length === 0) {
            // INSERT mới với các trường được cung cấp
            const danhMucJson = categories ? JSON.stringify(categories) : null;
            const thuongHieuJson = brands ? JSON.stringify(brands) : null;
            
            await db.query(`
                INSERT INTO thong_tin_ca_nhan_hoa
                (ma_tai_khoan, danh_muc_quan_tam, thuong_hieu_yeu_thich, muc_dich_su_dung, phan_khuc_ngan_sach, da_hoan_thanh_khao_sat)
                VALUES (?, ?, ?, ?, ?, 0)
            `, [userId, danhMucJson, thuongHieuJson, purpose || null, budget || null]);
        } else {
            // UPDATE chỉ các trường được cung cấp
            const updates = [];
            const params = [];
            
            if (purpose !== undefined) {
                updates.push('muc_dich_su_dung = ?');
                params.push(purpose);
            }
            if (budget !== undefined) {
                updates.push('phan_khuc_ngan_sach = ?');
                params.push(budget);
            }
            if (categories !== undefined) {
                updates.push('danh_muc_quan_tam = ?');
                params.push(JSON.stringify(categories));
            }
            if (brands !== undefined) {
                updates.push('thuong_hieu_yeu_thich = ?');
                params.push(JSON.stringify(brands));
            }
            
            if (updates.length > 0) {
                params.push(userId);
                await db.query(
                    `UPDATE thong_tin_ca_nhan_hoa SET ${updates.join(', ')} WHERE ma_tai_khoan = ?`,
                    params
                );
            }
        }
        
        // Kiểm tra xem đã đủ 4 trường chưa để cập nhật da_hoan_thanh_khao_sat
        const [check] = await db.query(
            `SELECT muc_dich_su_dung, phan_khuc_ngan_sach, danh_muc_quan_tam, thuong_hieu_yeu_thich 
             FROM thong_tin_ca_nhan_hoa WHERE ma_tai_khoan = ?`,
            [userId]
        );
        
        if (check.length > 0) {
            const d = check[0];
            let cats = [];
            let brs = [];
            try {
                if (d.danh_muc_quan_tam) {
                    cats = Array.isArray(d.danh_muc_quan_tam) ? d.danh_muc_quan_tam :
                           (typeof d.danh_muc_quan_tam === 'string' ? JSON.parse(d.danh_muc_quan_tam) : []);
                }
                if (d.thuong_hieu_yeu_thich) {
                    brs = Array.isArray(d.thuong_hieu_yeu_thich) ? d.thuong_hieu_yeu_thich :
                          (typeof d.thuong_hieu_yeu_thich === 'string' ? JSON.parse(d.thuong_hieu_yeu_thich) : []);
                }
            } catch (e) {}
            
            const isComplete = d.muc_dich_su_dung && d.phan_khuc_ngan_sach && cats.length > 0 && brs.length > 0;
            
            await db.query(
                `UPDATE thong_tin_ca_nhan_hoa SET da_hoan_thanh_khao_sat = ? WHERE ma_tai_khoan = ?`,
                [isComplete ? 1 : 0, userId]
            );
        }
        
        console.log(`👤 [Data Mining] Updated profile for User ${userId}`);

        // Tìm các sản phẩm thuộc danh mục hoặc thương hiệu được chọn để tạo tương tác giả lập (chỉ khi hoàn thành đủ 4 bước)
        if (check.length > 0 && check[0].muc_dich_su_dung && check[0].phan_khuc_ngan_sach) {
            let cats = [];
            let brs = [];
            try {
                if (check[0].danh_muc_quan_tam) {
                    cats = Array.isArray(check[0].danh_muc_quan_tam) ? check[0].danh_muc_quan_tam :
                           (typeof check[0].danh_muc_quan_tam === 'string' ? JSON.parse(check[0].danh_muc_quan_tam) : []);
                }
                if (check[0].thuong_hieu_yeu_thich) {
                    brs = Array.isArray(check[0].thuong_hieu_yeu_thich) ? check[0].thuong_hieu_yeu_thich :
                          (typeof check[0].thuong_hieu_yeu_thich === 'string' ? JSON.parse(check[0].thuong_hieu_yeu_thich) : []);
                }
            } catch (e) {}
            
            if (cats.length > 0 && brs.length > 0) {
                let products = [];
                const conditions = [];
                const params = [];

                // Lấy tất cả danh mục từ DB để thực hiện chuẩn hóa chống lỗi font chữ / bảng mã tiếng Việt
                const [dbCategories] = await db.query('SELECT ma_danh_muc, ten_danh_muc FROM danh_muc_san_pham');
                
                function normalizeCategoryName(name) {
                    if (!name) return '';
                    if (name.includes('tho?i') || name.includes('thoi') || name.includes('thoai') || name.includes('?i?n th') || name.includes('o?i')) return 'Điện thoại';
                    if (name.includes('my') || name.includes('mAy') || name.includes('?i?n m')) return 'Điện máy';
                    if (name.includes('hnh') || name.includes('hAnh') || name.includes('h?nh')) return 'Màn hình';
                    if (name.includes('ki?n') || name.includes('kin') || name.includes('i?n')) return 'Phụ kiện';
                    if (name.includes('Ngu?n') || name.includes('Ngu"n') || name.includes('Ngun') || name.includes('Ngu')) return 'Case, Nguồn';
                    if (name.includes('lung') || name.includes('lng') || name.includes('?p l')) return 'Ốp lưng';
                    if (name.includes('phm') || name.includes('phA-m') || name.includes('ph?m')) return 'Chuột, Bàn phím';
                    if (name.includes('CPU') || name.includes('VGA')) return 'CPU, VGA';
                    if (name.includes('Laptop')) return 'Laptop';
                    if (name.includes('Gaming')) return 'PC Gaming';
                    return name;
                }

                const categoryMap = {
                    'phone': 'Điện thoại',
                    'laptop': 'Laptop',
                    'appliances': 'Điện máy',
                    'accessories': 'Phụ kiện',
                    'pc-gaming': 'PC Gaming',
                    'man-hinh': 'Màn hình',
                    'cpu-vga': 'CPU, VGA',
                    'case-nguon': 'Case, Nguồn',
                    'op-lung': 'Ốp lưng',
                    'Tai nghe, Loa': 'Phụ kiện',
                    'Chuột, Bàn phím': 'Phụ kiện'
                };

                if (cats.length > 0) {
                    // Chuẩn hóa danh mục đầu vào của user
                    const normalizedInputCats = cats.map(c => categoryMap[c] || c);
                    
                    // Tìm các ID danh mục tương ứng từ DB đã được chuẩn hóa
                    const matchedCategoryIds = [];
                    for (const dbCat of dbCategories) {
                        const normDbName = normalizeCategoryName(dbCat.ten_danh_muc);
                        
                        const isMatch = normalizedInputCats.some(inputCat => {
                            return inputCat.toLowerCase().trim() === normDbName.toLowerCase().trim() ||
                                   (inputCat === 'Linh kiện (CPU, VGA, Nguồn...)' && (normDbName === 'CPU, VGA' || normDbName === 'Case, Nguồn')) ||
                                   (inputCat === 'Gaming Gear & Phụ kiện' && (normDbName === 'Phụ kiện' || normDbName === 'Chuột, Bàn phím'));
                        });
                        
                        if (isMatch) {
                            matchedCategoryIds.push(dbCat.ma_danh_muc);
                        }
                    }

                    if (matchedCategoryIds.length > 0) {
                        conditions.push('ma_danh_muc IN (?)');
                        params.push(matchedCategoryIds);
                    }
                }

                if (brs.length > 0) {
                    conditions.push('thuong_hieu IN (?)');
                    params.push(brs);
                }

                // Filter theo ngân sách (AND): chỉ lấy SP trong khoảng giá người dùng chọn
                const budgetRange = parseBudgetRange(check[0].phan_khuc_ngan_sach);

                if (conditions.length > 0) {
                    // Ưu tiên AND: sản phẩm phải khớp CẢ danh mục VÀ thương hiệu
                    // Điều này đảm bảo không tạo interactions sai (vd: Samsung Phụ kiện khi user chọn Điện thoại + Samsung)
                    let query, finalParams;

                    const catConditions = conditions.filter(c => c.startsWith('ma_danh_muc'));
                    const brandConditions = conditions.filter(c => c.startsWith('thuong_hieu'));
                    const catParams = params.slice(0, catConditions.length);
                    const brandParams = params.slice(catConditions.length);

                    if (catConditions.length > 0 && brandConditions.length > 0) {
                        // Cả 2: dùng AND (khớp danh mục VÀ thương hiệu)
                        query = `
                            SELECT ma_san_pham FROM san_pham
                            WHERE ${catConditions.join(' AND ')} AND ${brandConditions.join(' AND ')} AND trang_thai = 'hien_thi'
                        `;
                        finalParams = [...catParams, ...brandParams];
                        if (budgetRange) {
                            query += ' AND gia BETWEEN ? AND ?';
                            finalParams.push(budgetRange.min, budgetRange.max);
                        }
                        query += ' LIMIT 20';
                        const [andRows] = await db.query(query, finalParams);

                        if (andRows.length > 0) {
                            products = andRows;
                        } else {
                            // Fallback: chỉ theo danh mục (bỏ filter thương hiệu để tránh trống)
                            let fallbackQuery = `
                                SELECT ma_san_pham FROM san_pham
                                WHERE ${catConditions.join(' AND ')} AND trang_thai = 'hien_thi'
                            `;
                            const fallbackParams = [...catParams];
                            if (budgetRange) {
                                fallbackQuery += ' AND gia BETWEEN ? AND ?';
                                fallbackParams.push(budgetRange.min, budgetRange.max);
                            }
                            fallbackQuery += ' LIMIT 20';
                            const [catRows] = await db.query(fallbackQuery, fallbackParams);
                            products = catRows;
                        }
                    } else {
                        // Chỉ có 1 điều kiện: dùng trực tiếp
                        query = `
                            SELECT ma_san_pham FROM san_pham
                            WHERE (${conditions.join(' OR ')}) AND trang_thai = 'hien_thi'
                        `;
                        finalParams = [...params];
                        if (budgetRange) {
                            query += ' AND gia BETWEEN ? AND ?';
                            finalParams.push(budgetRange.min, budgetRange.max);
                        }
                        query += ' LIMIT 20';
                        const [rows] = await db.query(query, finalParams);
                        products = rows;
                    }
                }

                // Tạo tương tác giả lập với điểm tương tác cao (GiaTri = 3)
                if (products.length > 0) {
                    // Xóa preference cũ để tránh dữ liệu ô nhiễm khi lưu lại
                    await db.query(
                        `DELETE FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'preference'`,
                        [userId]
                    );
                    for (const p of products) {
                        await RecommendationEngine.trackUserAction(userId, p.ma_san_pham, 'preference', 3);
                    }
                    console.log(`✅ [Personalization] Saved ${products.length} preferences interactions for User ${userId}`);
                }
            }
        }

        res.json({
            success: true,
            message: 'Đã lưu thông tin khảo sát'
        });
    } catch (error) {
        console.error('Error saving user preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu sở thích ban đầu',
            error: error.message
        });
    }
});

// Lấy sản phẩm nổi bật theo độ phổ biến (Popularity Score) cho phía người dùng
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const products = await RecommendationEngine.getPopularProducts(limit);
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error getting popular products:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sản phẩm nổi bật',
            error: error.message
        });
    }
});

// Lấy thống kê chi tiết độ phổ biến cho admin dashboard
router.get('/popularity-stats', async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT 
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.gia,
                sp.thuong_hieu,
                sp.ma_danh_muc,
                dm.ten_danh_muc,
                a.duong_dan_anh AS anh_chinh,
                COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'purchase' THEN 1 ELSE 0 END), 0) AS luot_mua,
                COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'click' THEN 1 ELSE 0 END), 0) AS luot_click,
                COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'view_50s' THEN 1 ELSE 0 END), 0) AS luot_xem_50s,
                COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'search' THEN 1 ELSE 0 END), 0) AS luot_tim,
                COALESCE(avg_rating.diem_danh_gia, 0.0) AS diem_danh_gia,
                COALESCE(avg_rating.so_luong_danh_gia, 0) AS so_luong_danh_gia,
                GROUP_CONCAT(DISTINCT CONCAT(tk.ten_dang_nhap, ':', COALESCE(tk.hinh_anh, '')) ORDER BY ui.ThoiGian DESC) AS recent_interactions
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
            LEFT JOIN user_interactions ui ON sp.ma_san_pham = ui.MaSP
            LEFT JOIN tai_khoan tk ON ui.MaND = tk.ma_tai_khoan
            LEFT JOIN (
                SELECT ma_san_pham,
                       ROUND(AVG(so_sao), 2) AS diem_danh_gia,
                       COUNT(*) AS so_luong_danh_gia
                FROM danh_gia
                WHERE trang_thai = 1
                GROUP BY ma_san_pham
            ) avg_rating ON sp.ma_san_pham = avg_rating.ma_san_pham
            WHERE sp.trang_thai = 'hien_thi'
            GROUP BY sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.ma_danh_muc, dm.ten_danh_muc, a.duong_dan_anh, avg_rating.diem_danh_gia, avg_rating.so_luong_danh_gia
        `);

        // ── Bayesian Average cho điểm đánh giá ──────────────────────────────
        // Công thức: bayesian = (v*R + m*C) / (v + m)
        //   v = số lượng đánh giá của sản phẩm
        //   R = điểm trung bình của sản phẩm (1-5 sao)
        //   m = ngưỡng tối thiểu đánh giá cần thiết (5 reviews)
        //   C = điểm trung bình toàn hệ thống
        const m = 5; // ngưỡng tối thiểu
        const ratedProducts = products.filter(p => Number(p.so_luong_danh_gia) > 0);
        const C = ratedProducts.length > 0
            ? ratedProducts.reduce((sum, p) => sum + Number(p.diem_danh_gia), 0) / ratedProducts.length
            : 3.0; // mặc định 3.0 nếu chưa có đánh giá nào

        products.forEach(p => {
            p.luot_mua = Number(p.luot_mua);
            p.luot_click = Number(p.luot_click);
            p.luot_xem_50s = Number(p.luot_xem_50s);
            p.luot_tim = Number(p.luot_tim);
            p.diem_danh_gia = Number(p.diem_danh_gia || 0);
            p.so_luong_danh_gia = Number(p.so_luong_danh_gia || 0);

            // Bayesian Average rating (thang 0-5)
            // Sản phẩm càng nhiều đánh giá thì điểm càng gần điểm thực, ít đánh giá thì kéo về C
            const v = p.so_luong_danh_gia;
            const R = p.diem_danh_gia;
            p.bayesian_rating = parseFloat(((v * R + m * C) / (v + m)).toFixed(2));

            // Tính điểm phổ biến dựa trên điểm đánh giá trung bình hiển thị (diem_danh_gia) để khớp với giao diện
            p.popularity_score = Math.round((p.luot_mua * 40) + (p.luot_click * 20) + (p.luot_xem_50s * 20) + (p.luot_tim * 10) + (p.diem_danh_gia * 10));
            
            // Parse recent interactions
            p.recent_users = [];
            if (p.recent_interactions) {
                const uniqueUsers = new Set();
                p.recent_interactions.split(',').forEach(item => {
                    const parts = item.split(':');
                    const name = parts[0];
                    const avatar = parts.slice(1).join(':');
                    if (name && !uniqueUsers.has(name)) {
                        uniqueUsers.add(name);
                        p.recent_users.push({ name, avatar });
                    }
                });
                p.recent_users = p.recent_users.slice(0, 4);
            }
            delete p.recent_interactions;
        });

        // Sort by popularity score DESC, then by luot_mua DESC
        products.sort((a, b) => {
            if (b.popularity_score !== a.popularity_score) {
                return b.popularity_score - a.popularity_score;
            }
            if (b.luot_mua !== a.luot_mua) {
                return b.luot_mua - a.luot_mua;
            }
            return b.ma_san_pham - a.ma_san_pham;
        });

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error getting popularity stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê độ phổ biến',
            error: error.message
        });
    }
});

module.exports = router;
