const db = require('../config/database');

// Quy đổi nhãn ngân sách sang khoảng giá VND (đồng bộ với routes/recommendations.js)
function parseBudgetRange(label) {
    if (!label) return null;
    const map = {
        'Dưới 5 triệu':   { min: 0,          max: 5_000_000 },
        '5 - 10 triệu':   { min: 5_000_000,  max: 10_000_000 },
        '10 - 20 triệu':  { min: 10_000_000, max: 20_000_000 },
        '20 - 35 triệu':  { min: 20_000_000, max: 35_000_000 },
        'Trên 35 triệu':  { min: 35_000_000, max: 999_999_999 }
    };
    return map[label] || null;
}

class RecommendationEngineJS {
    static cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) return 0;
        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    static async getUserItemMatrix() {
        const [interactions] = await db.query(`
            SELECT MaND as user_id, MaSP as product_id, 
                   LoaiTuongTac as action_type, GiaTri as action_value
            FROM user_interactions
            WHERE ThoiGian >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
              AND LoaiTuongTac IN ('purchase', 'preference', 'cart', 'wishlist', 'view', 'click')
            UNION ALL
            SELECT dh.ma_tai_khoan as user_id, ctdh.ma_san_pham as product_id,
                   'purchase' as action_type, 5 * ctdh.so_luong as action_value
            FROM chi_tiet_don_hang ctdh
            JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
            WHERE dh.ngay_tao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
              AND dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao', 'cho_xac_nhan', 'da_xac_nhan')
        `);
        const scores = { 
            'purchase': 5.0,
            'preference': 4.0,
            'cart': 3.0,
            'wishlist': 2.5,
            'view': 1.0,
            'click': 1.0
        };
        const matrix = {};
        interactions.forEach(item => {
            const key = `${item.user_id}_${item.product_id}`;
            const score = (scores[item.action_type] || 1.0) * Number(item.action_value || 1);
            if (!matrix[key]) matrix[key] = { user_id: item.user_id, product_id: item.product_id, score: 0 };
            matrix[key].score += score;
        });
        return Object.values(matrix);
    }
    
    static async findSimilarUsers(userId, k = 100) {
        const matrix = await this.getUserItemMatrix();
        
        // Nhóm sản phẩm mua hàng theo từng user thành Set các product_id
        const userPurchases = {};
        matrix.forEach(m => {
            if (!userPurchases[m.user_id]) {
                userPurchases[m.user_id] = new Set();
            }
            userPurchases[m.user_id].add(m.product_id);
        });

        const targetUserSet = userPurchases[userId];
        if (!targetUserSet || targetUserSet.size === 0) return [];

        const similarities = [];
        for (const [otherUserId, otherSet] of Object.entries(userPurchases)) {
            const otherId = otherUserId === 'null' ? null : Number(otherUserId);
            if (otherId === userId || otherId === null) continue;

            // Tính số lượng sản phẩm mua chung (giao của 2 tập hợp)
            let intersectionSize = 0;
            for (const pid of targetUserSet) {
                if (otherSet.has(pid)) {
                    intersectionSize++;
                }
            }

            // Hai user được xem là giống nhau nếu có mua cùng sản phẩm
            if (intersectionSize > 0) {
                // Jaccard similarity = |A ∩ B| / |A ∪ B|
                const unionSize = targetUserSet.size + otherSet.size - intersectionSize;
                const similarity = intersectionSize / unionSize;
                similarities.push({ user_id: otherId, similarity });
            }
        }

        // Sắp xếp giảm dần theo độ tương đồng Jaccard và lấy top k
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
    }
    
    static async getCollaborativeRecommendations(userId, limit = 10) {
        try {
            // Lấy danh sách toàn bộ người dùng tương đồng (k = 100 để không bỏ sót sản phẩm gợi ý)
            const similarUsers = await this.findSimilarUsers(userId, 100);
            if (similarUsers.length === 0) return [];
            
            const similarUserIds = similarUsers.map(u => u.user_id);
            
            // Lấy toàn bộ sản phẩm của các người dùng tương tự mà user hiện tại chưa mua
            const [purchases] = await db.query(`
                SELECT cp.MaND as user_id, cp.MaSP as ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta,
                       a.duong_dan_anh
                FROM (
                    SELECT DISTINCT MaND, MaSP FROM user_interactions WHERE LoaiTuongTac = 'purchase'
                    UNION
                    SELECT DISTINCT dh.ma_tai_khoan as MaND, ctdh.ma_san_pham as MaSP
                    FROM chi_tiet_don_hang ctdh
                    JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang
                    WHERE dh.trang_thai_don_hang IN ('hoan_thanh', 'dang_giao', 'cho_xac_nhan', 'da_xac_nhan')
                ) cp
                JOIN san_pham sp ON cp.MaSP = sp.ma_san_pham
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                WHERE cp.MaND IN (?) 
                  AND cp.MaSP NOT IN (
                      SELECT MaSP FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                      UNION
                      SELECT ctdh.ma_san_pham FROM chi_tiet_don_hang ctdh JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang WHERE dh.ma_tai_khoan = ?
                  )
                  AND sp.trang_thai = 'hien_thi'
            `, [similarUserIds, userId, userId]);

            if (purchases.length === 0) return [];

            const productScores = {};
            const productDetails = {};

            purchases.forEach(p => {
                const simUser = similarUsers.find(su => su.user_id === p.user_id);
                const similarity = simUser ? simUser.similarity : 0;
                
                if (!productScores[p.ma_san_pham]) {
                    productScores[p.ma_san_pham] = {
                        score: 0,
                        user_count: 0
                    };
                    productDetails[p.ma_san_pham] = {
                        ma_san_pham: p.ma_san_pham,
                        ten_san_pham: p.ten_san_pham,
                        gia: p.gia,
                        thuong_hieu: p.thuong_hieu,
                        mo_ta: p.mo_ta,
                        duong_dan_anh: p.duong_dan_anh
                    };
                }
                productScores[p.ma_san_pham].score += similarity;
                productScores[p.ma_san_pham].user_count += 1;
            });

            // Map thành mảng kết quả
            const recommendations = Object.keys(productScores).map(productId => {
                const id = Number(productId);
                return {
                    ...productDetails[id],
                    total_score: parseFloat(productScores[id].score.toFixed(4)),
                    user_count: productScores[id].user_count
                };
            });

            // Sắp xếp theo score giảm dần, sau đó theo số lượng user mua chung giảm dần
            recommendations.sort((a, b) => {
                if (b.total_score !== a.total_score) {
                    return b.total_score - a.total_score;
                }
                if (b.user_count !== a.user_count) {
                    return b.user_count - a.user_count;
                }
                return b.ma_san_pham - a.ma_san_pham;
            });

            return recommendations.slice(0, limit);
        } catch (error) {
            console.error('CF error:', error);
            return [];
        }
    }
    
    static async getContentBasedRecommendations(userId, limit = 10) {
        try {
            // Tách biệt 2 nguồn danh mục:
            // - categoriesFromSurvey: từ khảo sát onboarding → áp dụng lọc ngân sách
            // - categoriesFromInteraction: từ hành vi thực (view/click/cart) → KHÔNG lọc ngân sách
            const categoriesFromSurvey = new Set();
            const categoriesFromInteraction = new Set();
            const brands = new Set();
            // Ngân sách từ khảo sát CHỈ dùng khi seed preference ban đầu,
            // KHÔNG dùng làm bộ lọc cứng trong CB filtering — khảo sát chỉ là gợi ý sở thích
            let purpose = null;

            // 1. Lấy dữ liệu từ khảo sát cá nhân hóa (chỉ lấy mục đích và danh mục/thương hiệu)
            const [surveyRows] = await db.query(
                'SELECT muc_dich_su_dung, danh_muc_quan_tam, thuong_hieu_yeu_thich FROM thong_tin_ca_nhan_hoa WHERE ma_tai_khoan = ? LIMIT 1',
                [userId]
            );

            if (surveyRows.length > 0) {
                const s = surveyRows[0];
                purpose = s.muc_dich_su_dung || null;

                const parseJson = v => {
                    if (!v) return [];
                    if (Array.isArray(v)) return v;
                    try { return JSON.parse(v) || []; } catch (e) { return []; }
                };

                const surveyCats = parseJson(s.danh_muc_quan_tam);
                const surveyBrands = parseJson(s.thuong_hieu_yeu_thich);

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

                const [dbCats] = await db.query('SELECT ma_danh_muc, ten_danh_muc FROM danh_muc_san_pham');
                
                surveyCats.forEach(sc => {
                    const mappedName = categoryMap[sc] || sc;
                    const match = dbCats.find(c => (c.ten_danh_muc || '').toLowerCase().includes(mappedName.toLowerCase()) || mappedName.toLowerCase().includes((c.ten_danh_muc || '').toLowerCase()));
                    if (match) categoriesFromSurvey.add(match.ma_danh_muc);
                });

                surveyBrands.forEach(b => brands.add(b));
            }

            // 2. Lấy danh mục và thương hiệu từ hành vi tương tác THỰC TẾ (view/click/cart)
            // Loại trừ 'preference' vì đây là do survey seed tạo ra, không phải hành vi thực
            const [interactRows] = await db.query(`
                SELECT sp.ma_danh_muc, sp.thuong_hieu, COUNT(*) as count
                FROM user_interactions ui
                JOIN san_pham sp ON ui.MaSP = sp.ma_san_pham
                WHERE ui.MaND = ? AND ui.LoaiTuongTac IN ('click', 'view', 'view_50s', 'view_30s', 'cart', 'purchase')
                GROUP BY sp.ma_danh_muc, sp.thuong_hieu
            `, [userId]);

            interactRows.forEach(row => {
                if (row.ma_danh_muc) categoriesFromInteraction.add(row.ma_danh_muc);
                if (row.thuong_hieu) brands.add(row.thuong_hieu);
            });

            // Gộp tất cả danh mục (survey + tương tác thực)
            const allCategories = new Set([...categoriesFromSurvey, ...categoriesFromInteraction]);

            if (allCategories.size === 0 && brands.size === 0 && !purpose) {
                return [];
            }

            const brandsArray = brands.size > 0 ? Array.from(brands) : [''];
            const selectParams = [brandsArray];
            if (purpose) selectParams.push(purpose);

            // Query duy nhất — KHÔNG lọc ngân sách — khảo sát chỉ là gợi ý sở thích
            // interaction_score: ưu tiên SP user đã view/click thực tế lên đầu pool
            let sql = `
                SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta,
                       a.duong_dan_anh AS anh_chinh, dm.ten_danh_muc,
                       CASE WHEN sp.thuong_hieu IN (?) THEN 2 ELSE 1 END as brand_score,
                       ${purpose ? 'CASE WHEN sp.muc_dich_su_dung = ? THEN 3 ELSE 1 END' : '1'} as purpose_score,
                       COALESCE((
                           SELECT SUM(CASE
                               WHEN ui2.LoaiTuongTac IN ('view_50s','view_30s') THEN 3
                               WHEN ui2.LoaiTuongTac = 'view' THEN 2
                               WHEN ui2.LoaiTuongTac IN ('click','cart') THEN 4
                               ELSE 0 END)
                           FROM user_interactions ui2
                           WHERE ui2.MaSP = sp.ma_san_pham AND ui2.MaND = ?
                             AND ui2.LoaiTuongTac IN ('click','view','view_50s','view_30s','cart')
                       ), 0) AS interaction_score
                FROM san_pham sp
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                WHERE sp.trang_thai = 'hien_thi'
            `;
            const sqlParams = [userId];
            const conditions = [];

            if (allCategories.size > 0) {
                conditions.push('sp.ma_danh_muc IN (?)');
                sqlParams.push(Array.from(allCategories));
            }

            conditions.push(`
                sp.ma_san_pham NOT IN (
                    SELECT MaSP FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                    UNION
                    SELECT ctdh.ma_san_pham FROM chi_tiet_don_hang ctdh JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang WHERE dh.ma_tai_khoan = ?
                )
            `);
            sqlParams.push(userId, userId);

            if (conditions.length > 0) {
                sql += ' AND ' + conditions.join(' AND ');
            }

            // Sắp xếp: sản phẩm đã tương tác thực tế lên đầu, sau đó theo sở thích, thương hiệu, mới nhất
            sql += ' ORDER BY interaction_score DESC, purpose_score DESC, brand_score DESC, sp.ngay_tao DESC LIMIT ?';

            const [recommendations] = await db.query(sql, [...selectParams, ...sqlParams, limit]);
            return recommendations;

        } catch (error) {
            console.error('CB error:', error);
            return [];
        }
    }


    static async getChatBasedRecommendations(userId, limit = 10) {
        try {
            // 1. Lấy từ khóa gợi ý từ Chatbot của user
            const [chatRows] = await db.query(
                'SELECT cau_hoi FROM lich_su_chatbot WHERE ma_tai_khoan = ? ORDER BY ngay_chat DESC LIMIT 15',
                [userId]
            );

            if (chatRows.length === 0) return [];

            const categories = new Set();
            const brands = new Set();

            const [dbCats] = await db.query('SELECT ma_danh_muc, ten_danh_muc FROM danh_muc_san_pham');
            const [allProducts] = await db.query('SELECT DISTINCT thuong_hieu FROM san_pham WHERE thuong_hieu IS NOT NULL');

            chatRows.forEach(c => {
                const text = (c.cau_hoi || '').toLowerCase();

                dbCats.forEach(cat => {
                    const name = (cat.ten_danh_muc || '').toLowerCase();
                    if (text.includes(name) || name.includes(text)) {
                        categories.add(cat.ma_danh_muc);
                    }
                });

                allProducts.forEach(p => {
                    const brand = p.thuong_hieu.toLowerCase();
                    if (text.includes(brand)) {
                        brands.add(p.thuong_hieu);
                    }
                });
            });

            if (categories.size === 0 && brands.size === 0) {
                return [];
            }

            const brandsArray = brands.size > 0 ? Array.from(brands) : [''];
            const selectParams = [brandsArray];

            let sql = `
                SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta,
                       a.duong_dan_anh AS anh_chinh, dm.ten_danh_muc,
                       CASE WHEN sp.thuong_hieu IN (?) THEN 2 ELSE 1 END as brand_score
                FROM san_pham sp
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                WHERE sp.trang_thai = 'hien_thi'
            `;

            const sqlParams = [];
            const conditions = [];

            if (categories.size > 0) {
                conditions.push('sp.ma_danh_muc IN (?)');
                sqlParams.push(Array.from(categories));
            }

            conditions.push(`
                sp.ma_san_pham NOT IN (
                    SELECT MaSP FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                    UNION
                    SELECT ctdh.ma_san_pham FROM chi_tiet_don_hang ctdh JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang WHERE dh.ma_tai_khoan = ?
                )
            `);
            sqlParams.push(userId, userId);

            if (conditions.length > 0) {
                sql += ' AND ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY brand_score DESC, sp.ngay_tao DESC LIMIT ?';

            const [recommendations] = await db.query(sql, [...selectParams, ...sqlParams, limit]);
            return recommendations;
        } catch (error) {
            console.error('Chat-based recommendations error:', error);
            return [];
        }
    }
    
    static async getPopularProducts(limit = 10) {
        try {
            const [products] = await db.query(`
                SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta, a.duong_dan_anh,
                       COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'purchase' THEN 1 ELSE 0 END), 0) AS luot_mua,
                       COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'click' THEN 1 ELSE 0 END), 0) AS luot_click,
                       COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'view_50s' THEN 1 ELSE 0 END), 0) AS luot_xem_50s,
                       COALESCE(SUM(CASE WHEN ui.LoaiTuongTac = 'search' THEN 1 ELSE 0 END), 0) AS luot_tim,
                       COALESCE(avg_rating.diem_danh_gia, 0.0) AS diem_danh_gia,
                       COALESCE(avg_rating.so_luong_danh_gia, 0) AS so_luong_danh_gia
                FROM san_pham sp
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                LEFT JOIN user_interactions ui ON sp.ma_san_pham = ui.MaSP
                LEFT JOIN (
                    SELECT ma_san_pham, 
                           AVG(so_sao) AS diem_danh_gia,
                           COUNT(*) AS so_luong_danh_gia
                    FROM danh_gia
                    WHERE trang_thai = 1
                    GROUP BY ma_san_pham
                ) avg_rating ON sp.ma_san_pham = avg_rating.ma_san_pham
                WHERE sp.trang_thai = 'hien_thi'
                GROUP BY sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta, a.duong_dan_anh, avg_rating.diem_danh_gia, avg_rating.so_luong_danh_gia
            `);
            
            // Calculate score in JS matching recommendations.js formula
            const m = 5; // ngưỡng tối thiểu
            const ratedProducts = products.filter(p => Number(p.so_luong_danh_gia || 0) > 0);
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
                
                const v = p.so_luong_danh_gia;
                const R = p.diem_danh_gia;
                const bayesian_rating = parseFloat(((v * R + m * C) / (v + m)).toFixed(2));
                p.popularity_score = Math.round((p.luot_mua * 40) + (p.luot_click * 20) + (p.luot_xem_50s * 20) + (p.luot_tim * 10) + (p.diem_danh_gia * 10));
            });
            
            // Sort by popularity_score DESC, then by luot_mua DESC, then by ma_san_pham DESC
            products.sort((a, b) => {
                if (b.popularity_score !== a.popularity_score) {
                    return b.popularity_score - a.popularity_score;
                }
                if (b.luot_mua !== a.luot_mua) {
                    return b.luot_mua - a.luot_mua;
                }
                return b.ma_san_pham - a.ma_san_pham;
            });
            
            return products.slice(0, limit);
        } catch (error) {
            console.error('Popular error:', error);
            return [];
        }
    }
    
    static async getTrendingProducts(limit = 10) {
        try {
            const [products] = await db.query(`
                SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta, a.duong_dan_anh,
                       COUNT(DISTINCT ui.MaND) as recent_users, SUM(ui.GiaTri) as recent_score
                FROM san_pham sp
                JOIN user_interactions ui ON sp.ma_san_pham = ui.MaSP AND ui.LoaiTuongTac = 'purchase'
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                WHERE sp.trang_thai = 'hien_thi' AND ui.ThoiGian >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta, a.duong_dan_anh
                ORDER BY recent_score DESC, recent_users DESC LIMIT ?
            `, [limit]);
            return products;
        } catch (error) {
            console.error('Trending error:', error);
            return await this.getPopularProducts(limit);
        }
    }
    
    static async getSimilarProducts(productId, limit = 10) {
        try {
            const [product] = await db.query('SELECT ma_danh_muc, thuong_hieu, gia, ten_san_pham, mo_ta FROM san_pham WHERE ma_san_pham = ?', [productId]);
            if (product.length === 0) return [];
            const { ma_danh_muc, thuong_hieu, gia, ten_san_pham, mo_ta } = product[0];
            
            // Lấy tất cả sản phẩm cùng danh mục
            const [candidates] = await db.query(`
                SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, sp.mo_ta, a.duong_dan_anh AS anh_chinh
                FROM san_pham sp
                LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                WHERE sp.ma_danh_muc = ? AND sp.ma_san_pham != ? AND sp.trang_thai = 'hien_thi'
            `, [ma_danh_muc, productId]);

            function getProductKeywordType(name, description) {
                const n = ((name || '') + ' ' + (description || '')).toLowerCase();
                if (n.includes('chuột') || n.includes('mouse')) return 'chuột';
                if (n.includes('bàn phím') || n.includes('keyboard') || n.includes('tkl')) return 'bàn phím';
                if (n.includes('tai nghe') || n.includes('headphone') || n.includes('buds') || n.includes('airpods') || n.includes('earphone') || n.includes('loa') || n.includes('speaker')) return 'tai nghe';
                if (n.includes('đồng hồ') || n.includes('watch') || n.includes('band')) return 'đồng hồ';
                if (n.includes('sạc') || n.includes('charger') || n.includes('cáp')) return 'sạc';
                if (n.includes('ốp') || n.includes('case') || n.includes('bao da')) return 'ốp lưng';
                return null;
            }

            const targetType = getProductKeywordType(ten_san_pham, mo_ta);
            const targetBrand = (thuong_hieu || '').toLowerCase().trim();
            const targetPrice = parseFloat(gia);

            candidates.forEach(p => {
                let score = 0;
                
                // 1. Khớp loại sản phẩm (ví dụ: chuột - chuột) -> Boost cực mạnh (5 điểm)
                const candidateType = getProductKeywordType(p.ten_san_pham, p.mo_ta);
                if (targetType && candidateType === targetType) {
                    score += 5;
                }
                
                // 2. Khớp thương hiệu (nếu có thương hiệu) -> Boost 3 điểm
                const candBrand = (p.thuong_hieu || '').toLowerCase().trim();
                if (targetBrand && candBrand && candBrand === targetBrand) {
                    score += 3;
                }
                
                // 3. Độ lệch giá
                const candPrice = parseFloat(p.gia);
                const priceDiff = Math.abs(candPrice - targetPrice) / (targetPrice || 1);
                if (priceDiff < 0.3) {
                    score += 2;
                } else if (priceDiff < 0.5) {
                    score += 1;
                }
                
                p.similarity_score = score;
            });

            // Sắp xếp theo score giảm dần, sau đó theo ngày tạo mới nhất
            candidates.sort((a, b) => {
                if (b.similarity_score !== a.similarity_score) {
                    return b.similarity_score - a.similarity_score;
                }
                return b.ma_san_pham - a.ma_san_pham;
            });

            return candidates.slice(0, limit);
        } catch (error) {
            console.error('Similar error:', error);
            return [];
        }
    }
    
    static async getWeights() {
        try {
            const [rows] = await db.query('SELECT trong_so_cf, trong_so_cb, trong_so_pop FROM cau_hinh_goi_y WHERE id = 1');
            if (rows.length > 0) {
                return {
                    cf: parseFloat(rows[0].trong_so_cf),
                    cb: parseFloat(rows[0].trong_so_cb),
                    pop: parseFloat(rows[0].trong_so_pop)
                };
            }
        } catch (error) {
            console.error('Error loading hybrid recommendation weights:', error.message);
        }
        return { cf: 0.5, cb: 0.3, pop: 0.2 }; // default fallback
    }

    static async saveWeights(cf, cb, pop) {
        try {
            await db.query(
                'UPDATE cau_hinh_goi_y SET trong_so_cf = ?, trong_so_cb = ?, trong_so_pop = ? WHERE id = 1',
                [cf, cb, pop]
            );
            return true;
        } catch (error) {
            console.error('Error saving hybrid recommendation weights:', error.message);
            return false;
        }
    }
    
    static async getRecommendationsForUser(userId, limit = 10) {
        try {
            const weights = await this.getWeights();
            
            // Định nghĩa quota theo yêu cầu (Collaborative: max 3, Content-based: max 3, Chat-based: max 2 cho limit = 8)
            let quotaCF = 3;
            let quotaCB = 3;
            let quotaChat = 2;
            
            if (limit !== 8) {
                // Tỉ lệ tương đương cho các giới hạn limit khác
                quotaCF = Math.max(1, Math.floor(limit * 3 / 8));
                quotaCB = Math.max(1, Math.floor(limit * 3 / 8));
                quotaChat = Math.max(0, limit - quotaCF - quotaCB);
            }
            
            // Query candidate pools
            const candidatePoolLimit = Math.max(20, limit * 3);

            const [cf, cb, chat, popRaw] = await Promise.all([
                this.getCollaborativeRecommendations(userId, candidatePoolLimit),
                this.getContentBasedRecommendations(userId, candidatePoolLimit),
                this.getChatBasedRecommendations(userId, candidatePoolLimit),
                this.getPopularProducts(candidatePoolLimit)
            ]);
            
            // Loại bỏ sản phẩm đã mua khỏi danh sách sản phẩm phổ biến
            const [purchasedProducts] = await db.query(`
                SELECT MaSP FROM user_interactions WHERE MaND = ? AND LoaiTuongTac = 'purchase'
                UNION
                SELECT ctdh.ma_san_pham FROM chi_tiet_don_hang ctdh JOIN don_hang dh ON ctdh.ma_don_hang = dh.ma_don_hang WHERE dh.ma_tai_khoan = ?
            `, [userId, userId]);
            const purchasedIds = new Set(purchasedProducts.map(p => p.MaSP));
            const pop = popRaw.filter(p => !purchasedIds.has(p.ma_san_pham));
            
            // Gán loại gợi ý và tính điểm độ trùng khớp (match_score) bảo toàn thứ tự rank của từng pool
            // Ưu tiên lọc nội dung (CB & Chat) trước lọc cộng tác (CF) bằng cách tăng điểm số cơ sở của CB/Chat
            cb.forEach((p, index) => {
                p.recommendation_type = 'preference';
                p.match_score = Math.round(85 + (weights.cb * 20) - index * 0.5);
            });
            chat.forEach((p, index) => {
                p.recommendation_type = 'chat_based';
                p.match_score = Math.round(80 + (weights.cb * 20) - index * 0.5);
            });
            cf.forEach((p, index) => {
                p.recommendation_type = 'collaborative';
                p.match_score = Math.round(70 + (weights.cf * 15) - index * 0.5);
            });
            pop.forEach((p, index) => {
                p.recommendation_type = 'popular';
                p.match_score = Math.round(60 + (weights.pop * 15) - index * 0.5);
            });

            const seen = new Set();
            const combined = [];

            // 1. Phân bổ Quota Món mới hợp khẩu vị (Content-based): Tối đa quotaCB
            let cbAdded = 0;
            for (const p of cb) {
                if (cbAdded >= quotaCB) break;
                if (!seen.has(p.ma_san_pham)) {
                    seen.add(p.ma_san_pham);
                    combined.push(p);
                    cbAdded++;
                }
            }

            // 2. Phân bổ Quota Món gợi ý từ Chatbot (Chat-based): Tối đa quotaChat
            let chatAdded = 0;
            for (const p of chat) {
                if (chatAdded >= quotaChat) break;
                if (!seen.has(p.ma_san_pham)) {
                    seen.add(p.ma_san_pham);
                    combined.push(p);
                    chatAdded++;
                }
            }

            // 3. Phân bổ Quota Lọc cộng tác (Collaborative): Tối đa quotaCF
            let cfAdded = 0;
            for (const p of cf) {
                if (cfAdded >= quotaCF) break;
                if (!seen.has(p.ma_san_pham)) {
                    seen.add(p.ma_san_pham);
                    combined.push(p);
                    cfAdded++;
                }
            }

            // 4. Món phổ biến (Trending): Điền vào chỗ trống để đạt đủ limit
            // Hạn chế thêm tối đa 10 sản phẩm phổ biến làm fallback khi limit lớn để tránh ô nhiễm nhãn Bán chạy
            let popAdded = 0;
            const maxPopFallback = limit > 10 ? 10 : limit;
            for (const p of pop) {
                if (combined.length >= limit || popAdded >= maxPopFallback) break;
                if (!seen.has(p.ma_san_pham)) {
                    seen.add(p.ma_san_pham);
                    combined.push(p);
                    popAdded++;
                }
            }

            // Sắp xếp kết quả cuối cùng theo match_score giảm dần
            combined.sort((a, b) => b.match_score - a.match_score);

            return combined;
        } catch (error) {
            console.error('Hybrid error:', error);
            return await this.getPopularProducts(limit);
        }
    }
    
    static async trackUserAction(userId, productId, actionType, actionValue = 1) {
        try {
            await db.query('INSERT INTO user_interactions (MaND, MaSP, LoaiTuongTac, GiaTri, ThoiGian) VALUES (?, ?, ?, ?, NOW())', 
                [userId, productId, actionType, actionValue]);
            return true;
        } catch (error) {
            console.error('Track error:', error);
            return false;
        }
    }
    
    static async setupDatabase() {
        try {
            // 1. Tạo bảng tương tác nếu chưa có
            await db.query(`CREATE TABLE IF NOT EXISTS user_interactions (
                id INT AUTO_INCREMENT PRIMARY KEY, MaND INT NOT NULL, MaSP INT NOT NULL,
                LoaiTuongTac VARCHAR(50) NOT NULL, GiaTri INT DEFAULT 1, ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (MaND), INDEX idx_product (MaSP), INDEX idx_time (ThoiGian), INDEX idx_action (LoaiTuongTac)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Table user_interactions ready');

            // 2. Tạo bảng cấu hình gợi ý nếu chưa có
            await db.query(`CREATE TABLE IF NOT EXISTS cau_hinh_goi_y (
                id INT AUTO_INCREMENT PRIMARY KEY,
                trong_so_cf FLOAT DEFAULT 0.5,
                trong_so_cb FLOAT DEFAULT 0.3,
                trong_so_pop FLOAT DEFAULT 0.2,
                ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Table cau_hinh_goi_y ready');

            // Chèn cấu hình mặc định ban đầu nếu trống
            const [rows] = await db.query('SELECT COUNT(*) as count FROM cau_hinh_goi_y');
            if (rows[0].count === 0) {
                await db.query('INSERT INTO cau_hinh_goi_y (id, trong_so_cf, trong_so_cb, trong_so_pop) VALUES (1, 0.5, 0.3, 0.2)');
                console.log('✅ Default hybrid weights (0.5, 0.3, 0.2) inserted');
            }
            
            return true;
        } catch (error) {
            console.error('Setup error:', error);
            return false;
        }
    }
}

module.exports = RecommendationEngineJS;
