// Mô phỏng chính xác frontend: limit=8 cho user 4
const RecommendationEngine = require('./utils/recommendationEngineJS');

(async () => {
    try {
        console.log('='.repeat(70));
        console.log('HYBRID FINAL cho user 4 với limit=8 (giống frontend)');
        console.log('='.repeat(70));

        // Chạy thử 3 lần xem có ngẫu nhiên không
        for (let run = 1; run <= 3; run++) {
            console.log(`\n--- Lần ${run} ---`);
            const final = await RecommendationEngine.getRecommendationsForUser(4, 8);
            const byType = { collaborative: 0, preference: 0, popular: 0 };
            final.forEach(p => {
                byType[p.recommendation_type] = (byType[p.recommendation_type] || 0) + 1;
                console.log(`  [${p.recommendation_type}] SP${p.ma_san_pham} | ${p.ten_san_pham} | match=${p.match_score}`);
            });
            console.log('  TÓM TẮT:', byType);
        }

        process.exit(0);
    } catch (e) {
        console.error('Lỗi:', e);
        process.exit(1);
    }
})();
