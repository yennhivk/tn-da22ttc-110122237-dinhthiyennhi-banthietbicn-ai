/**
 * Test script để kiểm tra route recommendations có load được không
 */

const express = require('express');
const app = express();

console.log('🧪 Testing recommendations route...\n');

try {
    const recommendationRouter = require('./routes/recommendations');
    console.log('✅ Module loaded successfully');
    
    app.use('/api/recommendations', recommendationRouter);
    console.log('✅ Route registered successfully');
    
    // List all routes
    console.log('\n📋 Registered routes:');
    recommendationRouter.stack.forEach((r) => {
        if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
            console.log(`   ${methods} /api/recommendations${r.route.path}`);
        }
    });
    
    console.log('\n✅ Test passed! Route should work when server starts.\n');
    process.exit(0);
} catch (err) {
    console.error('❌ Error loading module:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
}
