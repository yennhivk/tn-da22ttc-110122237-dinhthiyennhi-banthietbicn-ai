const RecommendationEngine = require('./utils/recommendationEngineJS');

async function testRecommendation() {
    try {
        const userId = 22; // sushinhi13@gmail.com
        console.log(`=== RUNNING HYBRID RECOMMENDATION FOR USER ID ${userId} (sushinhi13@gmail.com) ===`);
        
        const recommendations = await RecommendationEngine.getRecommendationsForUser(userId, 10);
        console.log(`\nRecommendations found (${recommendations.length}):`);
        recommendations.forEach((p, idx) => {
            console.log(`${idx + 1}. [${p.recommendation_type}] SP${p.ma_san_pham} | ${p.ten_san_pham} | gia: ${p.gia} | match_score: ${p.match_score}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

testRecommendation();
