const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import database connection
const db = require('./config/database');
const passport = require('./config/passport');

// Khởi tạo Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Normalize double slashes in incoming request paths to prevent 404 route errors
app.use((req, res, next) => {
    if (req.url.startsWith('//')) {
        req.url = req.url.replace(/^\/+/, '/');
    }
    next();
});

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images'))); // Thêm dòng này để load ảnh frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pages', express.static(path.join(__dirname, '../frontend/admin/pages')));
app.use('/pages', express.static(path.join(__dirname, '../frontend/user/pages')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/user', express.static(path.join(__dirname, '../frontend/user')));
app.use('/js', express.static(path.join(__dirname, '../frontend/admin/js')));
app.use('/js', express.static(path.join(__dirname, '../frontend/user/js')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/includes', express.static(path.join(__dirname, '../frontend/includes')));
app.use('/videos', express.static(path.join(__dirname, '../frontend/videos')));

// Phục vụ trang chủ
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Phục vụ các trang HTML khác
app.get('/pages/:page', (req, res) => {
    const pageName = req.params.page;
    const adminPath = path.join(__dirname, '../frontend/admin/pages', pageName);
    const userPath = path.join(__dirname, '../frontend/user/pages', pageName);
    
    res.sendFile(adminPath, (err) => {
        if (err) {
            res.sendFile(userPath, (err2) => {
                if (err2) {
                    res.status(404).send('Trang không tồn tại');
                }
            });
        }
    });
});

// Test route API
app.get('/api/status', (req, res) => {
    res.json({
        message: 'Backend API đang chạy!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Test database connection route
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({
            message: 'Kết nối database thành công!',
            result: rows[0].result,
            database: process.env.DB_NAME
        });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi kết nối database',
            error: error.message
        });
    }
});

// Import routes
app.use('/api/products', require('./routes/products'));
const authRouter = require('./routes/auth');
console.log('Auth routes loaded:', authRouter.stack.map(r => r.route?.path).filter(Boolean));
app.use('/api/auth', authRouter);

// Log all admin routes
const adminRouter = require('./routes/admin');
console.log('Admin routes loaded:', adminRouter.stack.filter(r => r.route).map(r => ({path: r.route.path, methods: Object.keys(r.route.methods)})));
app.use('/api/admin', adminRouter);

app.use('/api/news', require('./routes/news'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/notifications', require('./routes/notifications'));

// Payment routes
try {
    const paymentRouter = require('./routes/payment');
    app.use('/api/payment', paymentRouter);
    console.log('✅ Payment routes loaded');
} catch (err) {
    console.error('❌ Error loading payment routes:', err.message);
}

// Recommendation routes
try {
    const recommendationRouter = require('./routes/recommendations');
    app.use('/api/recommendations', recommendationRouter);
    console.log('✅ Recommendation routes loaded');
} catch (err) {
    console.error('❌ Error loading recommendation routes:', err.message);
}

// Shipping config routes
try {
    const shippingConfigRouter = require('./routes/shipping-config');
    app.use('/api/shipping-config', shippingConfigRouter);
    console.log('✅ Shipping config routes loaded');
} catch (err) {
    console.error('❌ Error loading shipping config routes:', err.message);
}

// Orders routes
try {
    const ordersRouter = require('./routes/orders');
    app.use('/api/orders', ordersRouter);
    console.log('✅ Orders routes loaded');
} catch (err) {
    console.error('❌ Error loading orders routes:', err.message);
}

// app.use('/api/cart', require('./routes/cart'));

// 404 handler
app.use((req, res) => {
    // Không log cảnh báo cho các request tự động từ trình duyệt/DevTools để tránh spam console
    const ignoredPaths = ['/favicon.ico', '/robots.txt'];
    const isWellKnown = req.path.startsWith('/.well-known/');
    
    if (!ignoredPaths.includes(req.path) && !isWellKnown) {
        console.log(`⚠️ [404] Route không tồn tại: ${req.method} ${req.path}`);
    }
    
    res.status(404).json({
        message: 'Route không tồn tại',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Lỗi server:', err.stack);
    res.status(500).json({
        message: 'Lỗi server',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📅 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM nhận được, đang đóng server...');
    server.close(() => {
        console.log('✅ Server đã đóng');
        process.exit(0);
    });
});
