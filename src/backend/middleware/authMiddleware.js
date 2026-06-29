const jwt = require('jsonwebtoken');

// ==========================================
// MIDDLEWARE XÁC THỰC
// ==========================================
const authenticateToken = (req, res, next) => {
    // Log chi trong development mode
    if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [Auth] Checking token for:', req.path);
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        if (process.env.NODE_ENV === 'development') {
            console.log('❌ [Auth] No token found');
        }
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy token xác thực'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            // Chi log loi khong phai TokenExpiredError (expired la binh thuong)
            if (err.name !== 'TokenExpiredError') {
                console.log('❌ Token verification failed:', err.name, err.message);
            }
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({
                    success: false,
                    message: 'Token đã hết hạn, vui lòng đăng nhập lại',
                    expired: true
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
        // Log chi trong development mode de giam noise terminal
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ [Auth] Token valid for user:', user.ma_tai_khoan, user.vai_tro);
        }
        req.user = user;
        next();
    });
};

// ==========================================
// MIDDLEWARE KIỂM TRA QUYỀN ADMIN
// ==========================================
const requireAdmin = (req, res, next) => {
    // Nếu req.user chưa được set, gọi authenticateToken trước
    if (!req.user) {
        return authenticateToken(req, res, (err) => {
            if (err) return next(err);
            // Sau khi authenticate, kiểm tra quyền admin
            if (req.user.vai_tro !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }
            next();
        });
    }

    // Nếu req.user đã có, chỉ cần kiểm tra vai trò
    if (req.user.vai_tro !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin
};
