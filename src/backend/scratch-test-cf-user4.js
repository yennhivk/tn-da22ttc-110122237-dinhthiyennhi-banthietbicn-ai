// Test thực tế CF cho user 4 (yennhivk82@gmail.com)
const RecommendationEngine = require('./utils/recommendationEngineJS');
const db = require('./config/database');

(async () => {
    try {
        console.log('='.repeat(70));
        console.log('1) USER-ITEM MATRIX (chỉ tính purchase trong 6 tháng)');
        console.log('='.repeat(70));
        const matrix = await RecommendationEngine.getUserItemMatrix();
        // Lọc các user liên quan
        const allUsers = [...new Set(matrix.map(m => m.user_id))];
        console.log('Tất cả user có purchases:', allUsers);
        console.log('\nMa trận chi tiết:');
        allUsers.forEach(uid => {
            const items = matrix.filter(m => m.user_id === uid);
            console.log(`  User ${uid}: ${items.map(i => `SP${i.product_id}(${i.score})`).join(', ')}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('2) SIMILAR USERS cho user 4 (yennhivk82@gmail.com)');
        console.log('='.repeat(70));
        const sims4 = await RecommendationEngine.findSimilarUsers(4, 5);
        console.log('Similar users (top 5):');
        sims4.forEach(s => console.log(`  user_id=${s.user_id}, cosine_sim=${s.similarity.toFixed(4)}`));

        console.log('\n' + '='.repeat(70));
        console.log('3) CF RECOMMENDATIONS cho user 4');
        console.log('='.repeat(70));
        const cfRecs = await RecommendationEngine.getCollaborativeRecommendations(4, 30);
        console.log(`Tổng số CF recs: ${cfRecs.length}`);
        cfRecs.forEach(r => {
            console.log(`  SP${r.ma_san_pham} | ${r.ten_san_pham} | score=${r.total_score} | user_count=${r.user_count}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('4) Tất cả sản phẩm user 9 (dinhthiyennhitv84) và user 17 đã mua');
        console.log('='.repeat(70));
        const [u9items] = await db.query(`
            SELECT DISTINCT sp.ma_san_pham, sp.ten_san_pham, sp.trang_thai
            FROM user_interactions ui
            JOIN san_pham sp ON ui.MaSP = sp.ma_san_pham
            WHERE ui.MaND = 9 AND ui.LoaiTuongTac = 'purchase'
        `);
        console.log('User 9 đã mua:');
        u9items.forEach(p => console.log(`  SP${p.ma_san_pham} | ${p.ten_san_pham} | trang_thai='${p.trang_thai}'`));

        const [u17items] = await db.query(`
            SELECT DISTINCT sp.ma_san_pham, sp.ten_san_pham, sp.trang_thai
            FROM user_interactions ui
            JOIN san_pham sp ON ui.MaSP = sp.ma_san_pham
            WHERE ui.MaND = 17 AND ui.LoaiTuongTac = 'purchase'
        `);
        console.log('User 17 đã mua:');
        u17items.forEach(p => console.log(`  SP${p.ma_san_pham} | ${p.ten_san_pham} | trang_thai='${p.trang_thai}'`));

        console.log('\n' + '='.repeat(70));
        console.log('5) HYBRID FINAL cho user 4 (limit=10)');
        console.log('='.repeat(70));
        const final = await RecommendationEngine.getRecommendationsForUser(4, 10);
        console.log(`Tổng số: ${final.length}`);
        const byType = { collaborative: 0, preference: 0, popular: 0 };
        final.forEach(p => {
            byType[p.recommendation_type] = (byType[p.recommendation_type] || 0) + 1;
            console.log(`  [${p.recommendation_type}] SP${p.ma_san_pham} | ${p.ten_san_pham} | match=${p.match_score}`);
        });
        console.log('\nTÓM TẮT theo loại:', byType);

        process.exit(0);
    } catch (e) {
        console.error('Lỗi:', e);
        process.exit(1);
    }
})();
