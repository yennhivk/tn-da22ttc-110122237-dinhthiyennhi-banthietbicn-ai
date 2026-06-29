const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

const hasGoogleOAuthConfig =
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    !!process.env.GOOGLE_CALLBACK_URL;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

if (hasGoogleOAuthConfig) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value.trim().toLowerCase();
            const googleId = profile.id;
            const displayName = profile.displayName;
            const avatar = profile.photos[0]?.value || null;
            const shouldBeAdmin = ADMIN_EMAILS.includes(email);

            // Google has verified this email, so prefer it over google_id lookup.
            // This avoids picking an older customer row and blocking admin login.
            const [usersByEmail] = await db.query(
                'SELECT * FROM tai_khoan WHERE LOWER(email) = ? ORDER BY vai_tro = ? DESC, ma_tai_khoan ASC',
                [email, 'admin']
            );

            let user;
            let isNewUser = false;

            if (usersByEmail.length > 0) {
                user = usersByEmail[0];
                const nextRole = shouldBeAdmin ? 'admin' : user.vai_tro;

                await db.query(
                    `UPDATE tai_khoan
                     SET google_id = ?, hinh_anh = COALESCE(hinh_anh, ?), email = ?, vai_tro = ?
                     WHERE ma_tai_khoan = ?`,
                    [googleId, avatar, email, nextRole, user.ma_tai_khoan]
                );

                user = {
                    ...user,
                    google_id: googleId,
                    hinh_anh: user.hinh_anh || avatar,
                    email,
                    vai_tro: nextRole
                };
            } else {
                const [usersByGoogleId] = await db.query(
                    'SELECT * FROM tai_khoan WHERE google_id = ? ORDER BY vai_tro = ? DESC, ma_tai_khoan ASC',
                    [googleId, 'admin']
                );

                if (usersByGoogleId.length > 0) {
                    user = usersByGoogleId[0];
                    const nextRole = shouldBeAdmin ? 'admin' : user.vai_tro;

                    await db.query(
                        `UPDATE tai_khoan
                         SET email = ?, hinh_anh = COALESCE(hinh_anh, ?), vai_tro = ?
                         WHERE ma_tai_khoan = ?`,
                        [email, avatar, nextRole, user.ma_tai_khoan]
                    );

                    user = {
                        ...user,
                        email,
                        hinh_anh: user.hinh_anh || avatar,
                        vai_tro: nextRole
                    };
                } else {
                    isNewUser = true;
                    const username = email.split('@')[0] + '_' + Date.now();
                    const [result] = await db.query(
                        'INSERT INTO tai_khoan (ten_dang_nhap, email, google_id, hinh_anh, vai_tro, trang_thai) VALUES (?, ?, ?, ?, ?, ?)',
                        [displayName || username, email, googleId, avatar, shouldBeAdmin ? 'admin' : 'khach_hang', 1]
                    );

                    const [newUser] = await db.query(
                        'SELECT * FROM tai_khoan WHERE ma_tai_khoan = ?',
                        [result.insertId]
                    );
                    user = newUser[0];
                }
            }

            return done(null, user, { isNewUser });
        } catch (error) {
            console.error('Google OAuth Error:', error);
            return done(error, null);
        }
    }));
} else {
    console.warn('Google OAuth chua duoc cau hinh. Bo qua strategy Google.');
}

passport.serializeUser((user, done) => {
    done(null, user.ma_tai_khoan);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.query(
            'SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, hinh_anh FROM tai_khoan WHERE ma_tai_khoan = ?',
            [id]
        );
        done(null, users[0] || null);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
