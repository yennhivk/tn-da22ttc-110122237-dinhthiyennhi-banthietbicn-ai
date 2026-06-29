const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendOTPEmail, sendWelcomeEmail } = require('../config/mailer');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { calculateShipping } = require('../utils/shipping');

// Lưu trữ OTP tạm thời (trong production nên dùng Redis)
const otpStore = new Map();

// Cấu hình multer để upload ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
    }
});

// ==========================================
// GỬI OTP XÁC NHẬN EMAIL ĐĂNG KÝ
// ==========================================
router.post('/send-register-otp', async (req, res) => {
    try {
        const ten_dang_nhap = req.body.ten_dang_nhap;
        const mat_khau = req.body.mat_khau;
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        
        console.log('📝 Send OTP request:', { ten_dang_nhap, email });

        // Validate input
        if (!ten_dang_nhap || !mat_khau || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Kiểm tra email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Kiểm tra độ dài mật khẩu
        if (mat_khau.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }

        // Kiểm tra email đã tồn tại
        const [existingEmail] = await db.query(
            'SELECT ma_tai_khoan FROM tai_khoan WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Tạo OTP 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 300000; // 5 phút (300 giây)

        // Mã hóa mật khẩu trước khi lưu tạm
        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        // Lưu thông tin đăng ký tạm thời
        otpStore.set(email, {
            otp,
            expiresAt,
            registerData: {
                ten_dang_nhap,
                mat_khau: hashedPassword,
                email,
                vai_tro: 'khach_hang'
            }
        });

        // Gửi email OTP
        try {
            await sendOTPEmail(email, otp, ten_dang_nhap);
            console.log(`✅ Đã gửi OTP đăng ký đến ${email}`);
        } catch (emailError) {
            console.error('❌ Lỗi gửi email:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Không thể gửi email xác nhận. Vui lòng thử lại.'
            });
        }

        res.json({
            success: true,
            message: 'Đã gửi mã xác nhận đến email của bạn'
        });

    } catch (error) {
        console.error('❌ Lỗi gửi OTP đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ==========================================
// XÁC NHẬN OTP VÀ TẠO TÀI KHOẢN
// ==========================================
router.post('/verify-register-otp', async (req, res) => {
    try {
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const otp = req.body.otp ? req.body.otp.trim() : '';

        console.log('📧 Verify OTP request:', { email, otp, emailLength: email.length, otpLength: otp.length });
        console.log('📦 OTP Store keys:', Array.from(otpStore.keys()));

        const storedData = otpStore.get(email);

        if (!storedData) {
            console.log('❌ Không tìm thấy OTP cho email:', email);
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng đăng ký lại.'
            });
        }

        console.log('✅ Found stored OTP:', storedData.otp, 'User input:', otp);
        console.log('⏰ Expires at:', new Date(storedData.expiresAt), 'Now:', new Date());

        // Kiểm tra hết hạn
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            console.log('❌ OTP đã hết hạn');
            return res.status(400).json({
                success: false,
                message: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại.'
            });
        }

        // Kiểm tra OTP - so sánh cả string
        if (String(storedData.otp) !== String(otp)) {
            console.log('❌ OTP không khớp. Stored:', storedData.otp, 'Input:', otp);
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không đúng'
            });
        }

        // OTP đúng - tạo tài khoản
        const { ten_dang_nhap, mat_khau, vai_tro } = storedData.registerData;

        const [result] = await db.query(
            'INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, email, vai_tro, trang_thai) VALUES (?, ?, ?, ?, 1)',
            [ten_dang_nhap, mat_khau, email, vai_tro]
        );

        // Xóa OTP
        otpStore.delete(email);

        // Gửi email chào mừng
        try {
            await sendWelcomeEmail(email, ten_dang_nhap);
            console.log(`✅ Đã gửi email chào mừng đến ${email}`);
        } catch (emailError) {
            console.error('⚠️ Không thể gửi email chào mừng:', emailError.message);
            // Không throw error vì đăng ký đã thành công
        }

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.',
            data: {
                ma_tai_khoan: result.insertId,
                ten_dang_nhap,
                email,
                vai_tro
            }
        });

    } catch (error) {
        console.error('❌ Lỗi xác nhận OTP đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ==========================================
// ĐĂNG KÝ TÀI KHOẢN MỚI (giữ lại cho tương thích)
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau, email, vai_tro = 'khach_hang' } = req.body;

        // Validate input
        if (!ten_dang_nhap || !mat_khau || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Kiểm tra email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Kiểm tra độ dài mật khẩu
        if (mat_khau.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }

        // Kiểm tra email đã tồn tại
        const [existingEmail] = await db.query(
            'SELECT ma_tai_khoan FROM tai_khoan WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        // Thêm tài khoản mới vào database
        const [result] = await db.query(
            'INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, email, vai_tro, trang_thai) VALUES (?, ?, ?, ?, 1)',
            [ten_dang_nhap, hashedPassword, email, vai_tro]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công',
            data: {
                ma_tai_khoan: result.insertId,
                ten_dang_nhap,
                email,
                vai_tro
            }
        });

    } catch (error) {
        console.error('❌ Lỗi đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// ĐĂNG NHẬP
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, mat_khau } = req.body;

        // Validate input
        if (!email || !mat_khau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        // Tìm tài khoản trong database bằng email
        const [users] = await db.query(
            'SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.mat_khau, tk.email, tk.vai_tro, tk.trang_thai, tk.hinh_anh, tt.da_hoan_thanh_khao_sat FROM tai_khoan tk LEFT JOIN thong_tin_ca_nhan_hoa tt ON tk.ma_tai_khoan = tt.ma_tai_khoan WHERE tk.email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        const user = users[0];

        // Kiểm tra trạng thái tài khoản
        if (user.trang_thai !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        // So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(mat_khau, user.mat_khau);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        // Tạo JWT token
        const token = jwt.sign(
            {
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                vai_tro: user.vai_tro
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        // Lưu thông tin vào session
        req.session.user = {
            ma_tai_khoan: user.ma_tai_khoan,
            ten_dang_nhap: user.ten_dang_nhap,
            email: user.email,
            vai_tro: user.vai_tro
        };

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    ma_tai_khoan: user.ma_tai_khoan,
                    ten_dang_nhap: user.ten_dang_nhap,
                    email: user.email,
                    vai_tro: user.vai_tro,
                    hinh_anh: user.hinh_anh || null,
                    da_hoan_thanh_khao_sat: user.da_hoan_thanh_khao_sat ? true : false
                }
            }
        });

    } catch (error) {
        console.error('❌ Lỗi đăng nhập:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// ĐĂNG XUẤT
// ==========================================
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi đăng xuất'
            });
        }
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    });
});

// ==========================================
// KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
// ==========================================
router.get('/me', async (req, res) => {
    try {
        // Hỗ trợ cả session và JWT token
        let userId = req.session?.user?.ma_tai_khoan;

        if (!userId) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Chưa đăng nhập'
                });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                userId = decoded.ma_tai_khoan;
            } catch (verifyError) {
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn'
                });
            }
        }

        // Lấy thông tin user từ database (bao gồm thông tin cá nhân nếu có bảng khach_hang)
        let users;
        try {
            [users] = await db.query(
                `SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.email, tk.vai_tro, tk.trang_thai, tk.hinh_anh, tt.da_hoan_thanh_khao_sat,
                        kh.ho_ten, kh.so_dien_thoai, kh.dia_chi, kh.tinh_thanh, kh.quan_huyen
                 FROM tai_khoan tk
                 LEFT JOIN khach_hang kh ON tk.ma_tai_khoan = kh.ma_tai_khoan
                 LEFT JOIN thong_tin_ca_nhan_hoa tt ON tk.ma_tai_khoan = tt.ma_tai_khoan
                 WHERE tk.ma_tai_khoan = ?`,
                [userId]
            );
        } catch (dbError) {
            if (dbError.code !== 'ER_NO_SUCH_TABLE') {
                throw dbError;
            }

            // Fallback cho trường hợp schema chưa có bảng khach_hang
            [users] = await db.query(
                `SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.email, tk.vai_tro, tk.trang_thai, tk.hinh_anh, tt.da_hoan_thanh_khao_sat,
                        NULL AS ho_ten, NULL AS so_dien_thoai, NULL AS dia_chi, NULL AS tinh_thanh, NULL AS quan_huyen
                 FROM tai_khoan tk
                 LEFT JOIN thong_tin_ca_nhan_hoa tt ON tk.ma_tai_khoan = tt.ma_tai_khoan
                 WHERE tk.ma_tai_khoan = ?`,
                [userId]
            );
        }
        if (users.length === 0) {
            req.session.destroy();
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        const user = users[0];

        if (user.trang_thai !== 1) {
            req.session.destroy();
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        res.json({
            success: true,
            user: {
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                email: user.email,
                vai_tro: user.vai_tro,
                hinh_anh: user.hinh_anh,
                da_hoan_thanh_khao_sat: user.da_hoan_thanh_khao_sat ? true : false,
                ho_ten: user.ho_ten,
                so_dien_thoai: user.so_dien_thoai,
                dia_chi: user.dia_chi,
                tinh_thanh: user.tinh_thanh,
                quan_huyen: user.quan_huyen
            }
        });

    } catch (error) {
        console.error('❌ Lỗi kiểm tra trạng thái:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// ==========================================
// XÁC THỰC TOKEN
// ==========================================
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        // Lấy thông tin user từ database
        const [users] = await db.query(
            'SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, hinh_anh FROM tai_khoan WHERE ma_tai_khoan = ?',
            [req.user.ma_tai_khoan]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            message: 'Token hợp lệ',
            user: {
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                email: user.email,
                vai_tro: user.vai_tro,
                hinh_anh: user.hinh_anh
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ==========================================
// CẬP NHẬT THÔNG TIN TÀI KHOẢN
// ==========================================
router.put('/update-profile', authenticateToken, async (req, res) => {
    try {
        const { ten_dang_nhap } = req.body;
        const userId = req.user.ma_tai_khoan;

        await db.query(
            'UPDATE tai_khoan SET ten_dang_nhap = ? WHERE ma_tai_khoan = ?',
            [ten_dang_nhap, userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công'
        });
    } catch (error) {
        console.error('❌ Lỗi cập nhật profile:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thông tin'
        });
    }
});

// ==========================================
// UPLOAD AVATAR
// ==========================================
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file ảnh'
            });
        }

        const userId = req.user.ma_tai_khoan;
        const avatarPath = '/uploads/avatars/' + req.file.filename;

        await db.query(
            'UPDATE tai_khoan SET hinh_anh = ? WHERE ma_tai_khoan = ?',
            [avatarPath, userId]
        );

        res.json({
            success: true,
            message: 'Upload avatar thành công',
            data: { hinh_anh: avatarPath }
        });
    } catch (error) {
        console.error('❌ Lỗi upload avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi upload avatar'
        });
    }
});

// ==========================================
// ĐỔI MẬT KHẨU
// ==========================================
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { mat_khau_cu, mat_khau_moi } = req.body;
        const userId = req.user.ma_tai_khoan;

        // Lấy mật khẩu hiện tại
        const [users] = await db.query(
            'SELECT mat_khau FROM tai_khoan WHERE ma_tai_khoan = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        // Kiểm tra mật khẩu cũ
        const isValid = await bcrypt.compare(mat_khau_cu, users[0].mat_khau);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);

        await db.query(
            'UPDATE tai_khoan SET mat_khau = ? WHERE ma_tai_khoan = ?',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('❌ Lỗi đổi mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đổi mật khẩu'
        });
    }
});

// ==========================================
// GOOGLE OAUTH
// ==========================================
const passport = require('passport');

function isGoogleStrategyReady() {
    return !!passport._strategy('google');
}

// Bắt đầu đăng nhập Google
router.get('/google', (req, res, next) => {
    if (!isGoogleStrategyReady()) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth chưa được cấu hình trên server'
        });
    }

    // Lưu redirect parameter vào session
    const redirect = req.query.redirect;
    if (redirect) {
        req.session.oauth_redirect = redirect;
    }
    
    // Lưu origin URL để xử lý redirect chính xác
    if (req.headers.referer) {
        try {
            const url = new URL(req.headers.referer);
            const basePath = url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/'));
            req.session.frontend_base = basePath;
        } catch (e) { console.error('URL parse error:', e); }
    }

    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

// Callback từ Google
router.get('/google/callback', 
    (req, res, next) => {
        if (!isGoogleStrategyReady()) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/user/pages/login.html?error=google_not_configured`);
        }
        next();
    },
    passport.authenticate('google', { failureRedirect: '/admin/pages/admin-login.html?error=google_failed' }),
    (req, res) => {
        try {
            const user = req.user;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
            
            console.log('📝 [CALLBACK] === XỬ LÝ GOOGLE CALLBACK ===');
            console.log('📝 [CALLBACK] User Email:', user.email);
            console.log('📝 [CALLBACK] User Role:', user.vai_tro);
            console.log('📝 [CALLBACK] Frontend URL:', frontendUrl);
            
            // Kiểm tra state từ query parameter
            const state = req.query.state;
            const isAdminLogin = (state === 'admin_login') || (req.session.oauth_state === 'admin_login');
            
            console.log('📝 [CALLBACK] State from query:', state);
            console.log('📝 [CALLBACK] State from session:', req.session.oauth_state);
            console.log('📝 [CALLBACK] Is Admin Login:', isAdminLogin);
            
            // Xóa state từ session
            delete req.session.oauth_state;
            
            // Nếu là admin login, kiểm tra quyền
            if (isAdminLogin) {
                console.log('🔐 [CALLBACK] Kiểm tra quyền admin...');
                if (user.vai_tro !== 'admin') {
                    console.error('❌ [CALLBACK] User không có quyền admin!');
                    console.error('❌ [CALLBACK] Email:', user.email);
                    console.error('❌ [CALLBACK] Vai trò:', user.vai_tro);
                    return res.redirect(`${frontendUrl}/admin/pages/admin-login.html?message=${encodeURIComponent('Tài khoản không có quyền admin')}`);
                }
                console.log('✅ [CALLBACK] User có quyền admin!');
            }
            
            // Đăng nhập trực tiếp (không cần xác nhận OTP)
            const token = jwt.sign(
                {
                    ma_tai_khoan: user.ma_tai_khoan,
                    ten_dang_nhap: user.ten_dang_nhap,
                    vai_tro: user.vai_tro,
                    is_admin: isAdminLogin
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: process.env.JWT_EXPIRE || '24h' }
            );

            console.log('🎟️ [CALLBACK] JWT Token created');

            if (isAdminLogin) {
                req.session.admin = {
                    ma_tai_khoan: user.ma_tai_khoan,
                    ten_dang_nhap: user.ten_dang_nhap,
                    email: user.email,
                    vai_tro: user.vai_tro
                };
                console.log('✅ [CALLBACK] Admin session created');
            } else {
                req.session.user = {
                    ma_tai_khoan: user.ma_tai_khoan,
                    ten_dang_nhap: user.ten_dang_nhap,
                    email: user.email,
                    vai_tro: user.vai_tro
                };
                console.log('✅ [CALLBACK] User session created');
            }

            const userData = encodeURIComponent(JSON.stringify({
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                email: user.email,
                vai_tro: user.vai_tro,
                hinh_anh: user.hinh_anh
            }));
            
            // Redirect đến callback tương ứng
            const callbackPage = isAdminLogin ? 'admin-callback.html' : 'auth-callback.html';
            
            let redirectUrl;
            delete req.session.frontend_base;
            if (isAdminLogin) {
                redirectUrl = `${frontendUrl}/admin/pages/${callbackPage}?token=${token}&user=${userData}`;
            } else {
                redirectUrl = `${frontendUrl}/user/pages/${callbackPage}?token=${token}&user=${userData}`;
            }

            console.log('🔄 [CALLBACK] Redirect to:', callbackPage);
            console.log('🔄 [CALLBACK] Full URL:', redirectUrl.substring(0, 100) + '...');
            
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ [CALLBACK] Error:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/user/pages/login.html?error=server_error`);
        }
    }
);

// ==========================================
// XÁC NHẬN OTP
// ==========================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const storedData = otpStore.get(email);
        
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không tồn tại hoặc đã hết hạn'
            });
        }
        
        // Kiểm tra hết hạn
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            // Xóa user khỏi database nếu chưa xác nhận
            await db.query('DELETE FROM tai_khoan WHERE email = ? AND trang_thai = 0', [email]);
            return res.status(400).json({
                success: false,
                message: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại.'
            });
        }
        
        // Kiểm tra OTP
        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không đúng'
            });
        }
        
        // OTP đúng - kích hoạt tài khoản
        await db.query('UPDATE tai_khoan SET trang_thai = 1 WHERE email = ?', [email]);
        
        // Xóa OTP
        otpStore.delete(email);
        
        // Tạo token và trả về
        const userData = storedData.userData;
        const token = jwt.sign(
            {
                ma_tai_khoan: userData.ma_tai_khoan,
                ten_dang_nhap: userData.ten_dang_nhap,
                vai_tro: userData.vai_tro
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );
        
        res.json({
            success: true,
            message: 'Xác nhận thành công! Chào mừng bạn đến với Yến Nhi Tech.',
            data: {
                token,
                user: userData
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi xác nhận OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// Gửi lại OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.'
            });
        }
        
        // Tạo OTP mới
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        storedData.otp = otp;
        storedData.expiresAt = Date.now() + 300000; // 5 phút
        otpStore.set(email, storedData);
        
        // Gửi email
        await sendOTPEmail(email, otp, storedData.userData.ten_dang_nhap);
        
        res.json({
            success: true,
            message: 'Đã gửi lại mã OTP'
        });
        
    } catch (error) {
        console.error('❌ Lỗi gửi lại OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ==========================================
// ĐĂNG NHẬP ADMIN RIÊNG
// ==========================================
router.post('/admin-login', async (req, res) => {
    try {
        const { email, mat_khau } = req.body;

        console.log('🔐 Admin login attempt:', { email });

        // Validate input
        if (!email || !mat_khau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        // Tìm user theo email
        const [users] = await db.query(
            'SELECT * FROM tai_khoan WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        const user = users[0];

        // Kiểm tra quyền admin
        if (user.vai_tro !== 'admin') {
            console.log('❌ User is not admin:', user.vai_tro);
            return res.status(403).json({
                success: false,
                message: 'Tài khoản không có quyền admin'
            });
        }

        // Kiểm tra trang thái
        if (user.trang_thai !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        // Kiểm tra mật khẩu
        const validPassword = await bcrypt.compare(mat_khau, user.mat_khau);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Tạo JWT token
        const token = jwt.sign(
            {
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                vai_tro: user.vai_tro,
                is_admin: true
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        // Lưu session
        req.session.admin = {
            ma_tai_khoan: user.ma_tai_khoan,
            ten_dang_nhap: user.ten_dang_nhap,
            email: user.email,
            vai_tro: user.vai_tro
        };

        console.log('✅ Admin login successful:', user.email);

        res.json({
            success: true,
            message: 'Đăng nhập admin thành công',
            data: {
                token,
                user: {
                    ma_tai_khoan: user.ma_tai_khoan,
                    ten_dang_nhap: user.ten_dang_nhap,
                    email: user.email,
                    vai_tro: user.vai_tro,
                    hinh_anh: user.hinh_anh
                }
            }
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// VERIFY ADMIN / EMPLOYEE TOKEN
// ==========================================
router.get('/verify-admin', authenticateToken, async (req, res) => {
    try {
        // Nếu là nhân viên đăng nhập từ bảng nhan_vien
        if (req.user.ma_nhan_vien) {
            const [employees] = await db.query(
                'SELECT ma_nhan_vien, ho_ten, ten_dang_nhap, email, chuc_vu, trang_thai FROM nhan_vien WHERE ma_nhan_vien = ?',
                [req.user.ma_nhan_vien]
            );

            if (employees.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Nhân viên không tồn tại'
                });
            }

            const employee = employees[0];

            if (employee.trang_thai !== 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản nhân viên đã bị khóa'
                });
            }

            return res.json({
                success: true,
                message: 'Token nhân viên hợp lệ',
                user: {
                    ma_nhan_vien: employee.ma_nhan_vien,
                    ten_dang_nhap: employee.ten_dang_nhap,
                    ho_ten: employee.ho_ten,
                    email: employee.email,
                    vai_tro: 'nhan_vien',
                    chuc_vu: employee.chuc_vu
                }
            });
        }

        // Nếu là admin đăng nhập từ bảng tai_khoan
        const [users] = await db.query(
            'SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, hinh_anh FROM tai_khoan WHERE ma_tai_khoan = ?',
            [req.user.ma_tai_khoan]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const user = users[0];

        // Kiểm tra quyền admin
        if (user.vai_tro !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập quản trị'
            });
        }

        res.json({
            success: true,
            message: 'Token admin hợp lệ',
            user: {
                ma_tai_khoan: user.ma_tai_khoan,
                ten_dang_nhap: user.ten_dang_nhap,
                email: user.email,
                vai_tro: user.vai_tro,
                hinh_anh: user.hinh_anh
            }
        });
    } catch (error) {
        console.error('Verify admin token error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ==========================================
// ĐĂNG NHẬP NHÂN VIÊN
// ==========================================
router.post('/employee-login', async (req, res) => {
    try {
        const { username, mat_khau } = req.body;

        console.log('🔐 Employee login attempt:', { username });

        // Validate input
        if (!username || !mat_khau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        // Tìm nhân viên theo ten_dang_nhap hoặc email trong bảng nhan_vien
        const [employees] = await db.query(
            'SELECT * FROM nhan_vien WHERE ten_dang_nhap = ? OR email = ?',
            [username.trim(), username.trim().toLowerCase()]
        );

        if (employees.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        const employee = employees[0];

        // Kiểm tra trạng thái hoạt động
        if (employee.trang_thai !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản nhân viên đã bị khóa hoặc ngừng hoạt động'
            });
        }

        // So sánh mật khẩu (hỗ trợ cả bcrypt và mật khẩu thô plaintext để tương thích tốt)
        let isPasswordValid = false;
        if (employee.mat_khau && (employee.mat_khau.startsWith('$2b$') || employee.mat_khau.startsWith('$2a$'))) {
            isPasswordValid = await bcrypt.compare(mat_khau, employee.mat_khau);
        } else {
            isPasswordValid = (mat_khau === employee.mat_khau);
        }

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        // Tạo JWT token chứa ma_nhan_vien để dùng trong phan_quyen
        const token = jwt.sign(
            {
                ma_tai_khoan: null,
                ma_nhan_vien: employee.ma_nhan_vien,
                ten_dang_nhap: employee.ten_dang_nhap,
                ho_ten: employee.ho_ten,
                email: employee.email,
                chuc_vu: employee.chuc_vu,
                vai_tro: 'nhan_vien'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        // Lưu thông tin vào session
        req.session.admin = {
            ma_nhan_vien: employee.ma_nhan_vien,
            ten_dang_nhap: employee.ten_dang_nhap,
            email: employee.email,
            vai_tro: 'nhan_vien',
            chuc_vu: employee.chuc_vu
        };

        console.log('✅ Employee login successful:', employee.email);

        res.json({
            success: true,
            message: 'Đăng nhập nhân viên thành công',
            data: {
                token,
                user: {
                    ma_nhan_vien: employee.ma_nhan_vien,
                    ten_dang_nhap: employee.ten_dang_nhap,
                    ho_ten: employee.ho_ten,
                    email: employee.email,
                    chuc_vu: employee.chuc_vu,
                    vai_tro: 'nhan_vien'
                }
            }
        });

    } catch (error) {
        console.error('❌ Employee login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// GOOGLE OAUTH CHO ADMIN
// ==========================================
router.get('/google-admin', (req, res, next) => {
    console.log('🔐 [ADMIN LOGIN] === BẮT ĐẦU GOOGLE OAUTH ===');
    console.log('🔐 [ADMIN LOGIN] Request URL:', req.originalUrl);
    console.log('🔐 [ADMIN LOGIN] Session ID:', req.sessionID);
    
    // LÆ°u origin URL Ä‘á»ƒ xá»­ lÃ½ redirect chÃ­nh xÃ¡c
    if (req.headers.referer) {
        try {
            const url = new URL(req.headers.referer);
            const basePath = url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/'));
            req.session.frontend_base = basePath;
        } catch (e) { console.error('URL parse error:', e); }
    }

    // Lưu state vào session trước khi redirect
    req.session.oauth_state = 'admin_login';
    req.session.save((err) => {
        if (err) {
            console.error('❌ [ADMIN LOGIN] Session save error:', err);
        } else {
            console.log('✅ [ADMIN LOGIN] Session saved with state: admin_login');
        }
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: 'admin_login' // Thêm state parameter
        })(req, res, next);
    });
});

// ==========================================
// TẠO ĐƠN HÀNG MẪU CHO USER HIỆN TẠI
// ==========================================
router.post('/create-sample-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_tai_khoan;
        console.log('=== CREATE SAMPLE ORDERS ===');
        console.log('User ID:', userId);

        // Lấy danh sách sản phẩm có sẵn
        const [products] = await db.query('SELECT ma_san_pham, ten_san_pham, gia FROM san_pham LIMIT 6');
        
        if (products.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có sản phẩm trong database' });
        }

        const sampleOrders = [
            { trang_thai: 'dang_xu_ly', thanh_toan: 'cho_xu_ly', dia_chi: '123 Nguyễn Văn A, Quận 1, TP.HCM' },
            { trang_thai: 'dang_giao', thanh_toan: 'da_thanh_toan', dia_chi: '456 Lê Văn B, Quận 3, TP.HCM' },
            { trang_thai: 'hoan_thanh', thanh_toan: 'da_thanh_toan', dia_chi: '789 Trần Văn C, Quận 7, TP.HCM' },
            { trang_thai: 'da_huy', thanh_toan: 'cho_xu_ly', dia_chi: '321 Phạm Văn D, Quận Bình Thạnh, TP.HCM' }
        ];

        const createdOrders = [];

        for (let i = 0; i < sampleOrders.length; i++) {
            const order = sampleOrders[i];
            const product = products[i % products.length];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const tongTien = product.gia * quantity;

            // Tạo đơn hàng
            const [orderResult] = await db.query(`
                INSERT INTO don_hang (ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
                VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)
            `, [userId, tongTien, order.thanh_toan, order.trang_thai, order.dia_chi, i * 2]);

            const orderId = orderResult.insertId;

            // Thêm chi tiết đơn hàng
            await db.query(`
                INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
                VALUES (?, ?, ?, ?)
            `, [orderId, product.ma_san_pham, quantity, product.gia]);

            createdOrders.push({
                ma_don_hang: orderId,
                san_pham: product.ten_san_pham,
                trang_thai: order.trang_thai
            });
        }

        res.json({
            success: true,
            message: `Đã tạo ${createdOrders.length} đơn hàng mẫu`,
            data: createdOrders
        });
    } catch (error) {
        console.error('Create sample orders error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// TẠO ĐƠN HÀNG MỚI
// ==========================================
router.post('/orders', authenticateToken, async (req, res) => {
    try {
        let userId = req.user.ma_tai_khoan;
        if (req.user.vai_tro === 'admin' && req.body.ma_tai_khoan) {
            userId = req.body.ma_tai_khoan;
        }
        const { items, dia_chi_giao_hang, so_dien_thoai, ghi_chu, phuong_thuc_thanh_toan, promo_code, discount_percent } = req.body;

        console.log('=== CREATE ORDER REQUEST ===');
        console.log('User ID:', userId);
        console.log('Items:', JSON.stringify(items));
        console.log('Address:', dia_chi_giao_hang);
        console.log('Payment method:', phuong_thuc_thanh_toan);

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        if (!dia_chi_giao_hang) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ giao hàng' });
        }

        // Kiểm tra tổng số lượng sản phẩm - nếu >= 5 thì yêu cầu liên hệ hotline
        const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.so_luong) || 1), 0);
        if (totalQuantity >= 5) {
            console.log('Large order detected:', totalQuantity, 'products');
            return res.status(400).json({ 
                success: false, 
                message: `Đơn hàng có ${totalQuantity} sản phẩm. Vui lòng liên hệ Hotline 0358.022.466 để được hỗ trợ đặt hàng số lượng lớn với ưu đãi đặc biệt!`,
                code: 'LARGE_ORDER'
            });
        }

        // Xác thực từng item trong đơn hàng và tính tổng trọng lượng
        let totalWeight = 0;
        for (const item of items) {
            if (!item.ma_san_pham) {
                console.error('Invalid item - missing ma_san_pham:', item);
                return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ (thiếu mã sản phẩm)' });
            }
            
            // Kiểm tra sản phẩm có tồn tại trong database không và lấy trọng lượng
            const [productCheck] = await db.query('SELECT ma_san_pham, so_luong, trong_luong_kg FROM san_pham WHERE ma_san_pham = ?', [item.ma_san_pham]);
            if (productCheck.length === 0) {
                console.error('Product not found in database:', item.ma_san_pham);
                return res.status(400).json({ success: false, message: `Sản phẩm với mã ${item.ma_san_pham} không tồn tại` });
            }
            
            // Kiểm tra số lượng tồn kho
            const stockQuantity = productCheck[0].so_luong || 0;
            const requestedQuantity = parseInt(item.so_luong) || 1;
            if (stockQuantity < requestedQuantity) {
                console.error('Insufficient stock:', { product: item.ma_san_pham, stock: stockQuantity, requested: requestedQuantity });
                return res.status(400).json({ success: false, message: `Sản phẩm "${item.ten_san_pham || item.ma_san_pham}" chỉ còn ${stockQuantity} sản phẩm trong kho` });
            }

            // Tích lũy trọng lượng (mặc định 0.5kg nếu không có trong DB)
            const productWeight = parseFloat(productCheck[0].trong_luong_kg) || 0.5;
            totalWeight += productWeight * requestedQuantity;
        }

        // Tính tổng tiền trước giảm giá
        let subtotal = 0;
        for (const item of items) {
            const gia = parseFloat(item.gia_ban) || parseFloat(item.gia) || 0;
            const soLuong = parseInt(item.so_luong) || 1;
            subtotal += gia * soLuong;
        }

        // Tính giảm giá
        let discountAmount = 0;
        if (promo_code && discount_percent > 0) {
            discountAmount = Math.round(subtotal * discount_percent / 100);
        }

        // Tính phí ship theo km thực tế, giá trị đơn hàng và trọng lượng đơn hàng
        console.log(`[Order Creation] Calculating shipping for address: "${dia_chi_giao_hang}", Order value: ${subtotal}đ, Weight: ${totalWeight}kg`);
        const shippingResult = await calculateShipping(dia_chi_giao_hang, subtotal, totalWeight);
        const distanceKm = shippingResult.distance_km;
        const shippingFee = shippingResult.shipping_fee;
        const baseFee = shippingResult.base_fee;
        const zone = shippingResult.zone;

        console.log(`[Order Creation] Shipping calculated - Zone: ${zone}, Distance: ${distanceKm}km, Base Fee: ${baseFee}đ, Final Fee: ${shippingFee}đ`);

        // Tổng tiền sau giảm giá
        const tongTien = subtotal - discountAmount + shippingFee;

        // Xác định trạng thái đơn hàng dựa trên phương thức thanh toán
        // MoMo và chuyển khoản ngân hàng → đang giao (không cho hủy)
        // COD → đang xử lý (cho phép hủy)
        const trangThaiDonHang = (phuong_thuc_thanh_toan === 'momo' || phuong_thuc_thanh_toan === 'bank') 
            ? 'dang_giao' 
            : 'dang_xu_ly';

        console.log('Creating order with total:', tongTien);

        // Tạo đơn hàng
        const [orderResult] = await db.query(`
            INSERT INTO don_hang (ma_tai_khoan, tong_tien, phi_van_chuyen, khoang_cach_km, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [userId, tongTien, shippingFee, distanceKm, phuong_thuc_thanh_toan === 'cod' ? 'cho_xu_ly' : 'da_thanh_toan', trangThaiDonHang, dia_chi_giao_hang]);

        const orderId = orderResult.insertId;
        console.log('Order created with ID:', orderId);

        // Thêm chi tiết đơn hàng và cập nhật số lượng tồn kho
        for (const item of items) {
            const gia = parseFloat(item.gia_ban) || parseFloat(item.gia) || 0;
            const soLuong = parseInt(item.so_luong) || 1;
            
            await db.query(`
                INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, so_luong, gia_ban)
                VALUES (?, ?, ?, ?)
            `, [orderId, item.ma_san_pham, soLuong, gia]);
            
            // Cập nhật số lượng tồn kho
            await db.query(`
                UPDATE san_pham SET so_luong = so_luong - ? WHERE ma_san_pham = ?
            `, [soLuong, item.ma_san_pham]);
        }
        console.log('Order details added successfully');

        // Thêm thông tin thanh toán
        // Map giá trị từ frontend sang enum trong database
        const paymentMethodMap = {
            'cod': 'COD',
            'bank': 'Ngan_Hang',
            'momo': 'Momo',
            'zalopay': 'ZaloPay'
        };
        const dbPaymentMethod = paymentMethodMap[phuong_thuc_thanh_toan] || 'COD';
        
        await db.query(`
            INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
            VALUES (?, ?, ?, ?)
        `, [orderId, dbPaymentMethod, tongTien, `GD${Date.now()}`]);
        console.log('Payment record created');

        res.json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: {
                ma_don_hang: orderId,
                tong_tien: tongTien
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn hàng: ' + error.message });
    }
});

// ==========================================
// LẤY ĐƠN HÀNG CỦA USER
// ==========================================
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_tai_khoan;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT dh.*, dh.trang_thai_don_hang as trang_thai,
                   COALESCE((SELECT tt.phuong_thuc FROM thanh_toan tt WHERE tt.ma_don_hang = dh.ma_don_hang LIMIT 1), 'COD') as phuong_thuc_thanh_toan
            FROM don_hang dh
            WHERE dh.ma_tai_khoan = ?
        `;
        const params = [userId];

        if (status && status !== 'all') {
            query += ` AND dh.trang_thai_don_hang = ?`;
            params.push(status);
        }

        query += ` ORDER BY dh.ngay_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await db.query(query, params);

        // Lấy chi tiết sản phẩm cho mỗi đơn hàng
        for (let order of orders) {
            const [items] = await db.query(`
                SELECT ctdh.*, sp.ten_san_pham, sp.thuong_hieu, sp.gia,
                       (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
                FROM chi_tiet_don_hang ctdh
                LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
                WHERE ctdh.ma_don_hang = ?
            `, [order.ma_don_hang]);
            
            // Giữ nguyên đường dẫn ảnh từ database (frontend sẽ xử lý)
            order.items = items;
        }

        // Đếm tổng số đơn hàng
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM don_hang WHERE ma_tai_khoan = ?`,
            [userId]
        );

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy chi tiết đơn hàng của user
router.get('/my-orders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_tai_khoan;
        const orderId = req.params.id;

        const [orders] = await db.query(`
            SELECT dh.*, dh.trang_thai_don_hang as trang_thai
            FROM don_hang dh
            WHERE dh.ma_don_hang = ? AND dh.ma_tai_khoan = ?
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const [items] = await db.query(`
            SELECT ctdh.*, sp.ten_san_pham, sp.thuong_hieu,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM chi_tiet_don_hang ctdh
            LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            WHERE ctdh.ma_don_hang = ?
        `, [orderId]);

        res.json({
            success: true,
            data: { ...orders[0], items }
        });
    } catch (error) {
        console.error('Get order detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Hủy đơn hàng (chỉ khi đang xử lý)
router.put('/my-orders/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_tai_khoan;
        const orderId = req.params.id;

        // Kiểm tra đơn hàng thuộc về user và đang ở trạng thái có thể hủy
        const [orders] = await db.query(`
            SELECT * FROM don_hang 
            WHERE ma_don_hang = ? AND ma_tai_khoan = ? AND trang_thai_don_hang = 'dang_xu_ly'
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể hủy đơn hàng này. Đơn hàng không tồn tại hoặc đã được xử lý.' 
            });
        }

        await db.query(`
            UPDATE don_hang SET trang_thai_don_hang = 'da_huy' WHERE ma_don_hang = ?
        `, [orderId]);

        res.json({ success: true, message: 'Đã hủy đơn hàng thành công' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Route in/xuất HTML sang PDF cho hóa đơn
const ejs = require('ejs');
const invoicePath = require('path');
const htmlPdf = require('html-pdf-node');

router.get('/my-orders/:id/invoice', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_tai_khoan;
        const orderId = req.params.id;

        // 1. Lấy thông tin đơn hàng
        const [orders] = await db.query(`
            SELECT dh.*, tk.ten_dang_nhap as ho_ten, tk.email, 
                   COALESCE(dh.so_dien_thoai, tk.so_dien_thoai) as so_dien_thoai,
                   COALESCE((SELECT tt.phuong_thuc FROM thanh_toan tt WHERE tt.ma_don_hang = dh.ma_don_hang LIMIT 1), 'COD') as phuong_thuc_thanh_toan
            FROM don_hang dh
            JOIN tai_khoan tk ON dh.ma_tai_khoan = tk.ma_tai_khoan
            WHERE dh.ma_don_hang = ? AND dh.ma_tai_khoan = ?
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const order = orders[0];

        // 2. Lấy chi tiết đơn hàng
        const [items] = await db.query(`
            SELECT c.*, s.ten_san_pham
            FROM chi_tiet_don_hang c
            JOIN san_pham s ON c.ma_san_pham = s.ma_san_pham
            WHERE c.ma_don_hang = ?
        `, [orderId]);

        // Tính toán lại các giá trị tiền tệ thực tế cho hóa đơn
        const subtotal = items.reduce((acc, item) => acc + (item.so_luong * item.gia_ban), 0);
        const shippingFee = parseFloat(order.phi_van_chuyen) || 0;
        const totalPayment = parseFloat(order.tong_tien) || 0;
        const discountAmount = Math.max(0, subtotal + shippingFee - totalPayment);

        // Hàm format tiền tệ
        const formatMoney = (amount) => {
            return new Intl.NumberFormat('vi-VN').format(amount || 0);
        };

        // 3. Render HTML từ EJS template
        const data = {
            order: {
                ...order,
                ngay_tao: new Date(order.ngay_tao || order.ngay_dat).toLocaleString('vi-VN'),
                subtotal_formatted: formatMoney(subtotal),
                phi_van_chuyen_formatted: formatMoney(shippingFee),
                giam_gia_formatted: formatMoney(discountAmount),
                tong_thanh_toan_formatted: formatMoney(totalPayment),
                trang_thai: order.trang_thai_don_hang || order.trang_thai || 'cho_xac_nhan'
            },
            items: items.map(item => ({
                ...item,
                don_gia_formatted: formatMoney(item.gia_ban),
                thanh_tien_formatted: formatMoney(item.so_luong * item.gia_ban)
            }))
        };

        const templatePath = invoicePath.join(__dirname, '../views/invoice.ejs');
        
        ejs.renderFile(templatePath, data, (err, html) => {
            if (err) {
                console.error("Lỗi biên dịch EJS:", err);
                return res.status(500).json({ success: false, message: 'Lỗi tạo mẫu hóa đơn' });
            }

            // 4. Tạo PDF từ mảng HTML
            let options = { format: 'A4' };
            let file = { content: html };

            htmlPdf.generatePdf(file, options).then(pdfBuffer => {
                // Set Header trả về file dạng PDF
                res.setHeader('Content-Type', 'application/pdf');
                const contentDisposition = req.query.action === 'view' ? 'inline' : 'attachment';
                res.setHeader('Content-Disposition', `${contentDisposition}; filename="Hoa_Don_${orderId}.pdf"`);
                res.send(pdfBuffer);
            }).catch(pdfErr => {
                console.error("Lỗi tạo PDF:", pdfErr);
                res.status(500).json({ success: false, message: 'Lỗi xuất file PDF' });
            });
        });

    } catch (error) {
        console.error('Lỗi khi xuất hóa đơn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
