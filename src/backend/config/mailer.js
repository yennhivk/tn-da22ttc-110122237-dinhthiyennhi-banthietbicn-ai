const nodemailer = require('nodemailer');

// Tạo transporter để gửi email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Gửi mã OTP
async function sendOTPEmail(email, otp, userName) {
    const mailOptions = {
        from: `"Yến Nhi Tech" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Mã xác nhận đăng ký - Yến Nhi Tech',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f59e0b, #eab308); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Yến Nhi Tech</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937;">Xin chào ${userName}!</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        Cảm ơn bạn đã đăng ký tài khoản tại Yến Nhi Tech. 
                        Vui lòng sử dụng mã OTP bên dưới để xác nhận email của bạn:
                    </p>
                    <div style="background: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px;">
                        <span style="font-size: 32px; font-weight: bold; color: #d97706; letter-spacing: 8px;">${otp}</span>
                    </div>
                    <p style="color: #ef4444; font-size: 14px; text-align: center;">
                        ⏰ Mã này sẽ hết hạn sau <strong>5 phút</strong>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 12px; text-align: center;">
                        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
                    </p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Gửi email chào mừng sau khi đăng ký thành công
async function sendWelcomeEmail(email, userName) {
    const mailOptions = {
        from: `"Yến Nhi Tech" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 Chào mừng bạn đến với Yến Nhi Tech!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎊 Chào mừng đến với Yến Nhi Tech!</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937;">Xin chào ${userName}! 👋</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Chúc mừng bạn đã đăng ký thành công tài khoản tại <strong>Yến Nhi Tech</strong>!
                    </p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Giờ đây bạn đã trở thành thành viên của đại gia đình Yến Nhi Tech và có thể tận hưởng những ưu đãi đặc biệt:
                    </p>
                    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 10px 10px 0;">
                        <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>🎁 <strong>Giảm giá đặc biệt</strong> dành riêng cho thành viên</li>
                            <li>🚚 <strong>Miễn phí giao hàng</strong> cho đơn từ 300.000đ</li>
                            <li>💰 <strong>Tích điểm đổi quà</strong> với mỗi đơn hàng</li>
                            <li>📱 <strong>Ưu tiên hỗ trợ</strong> 24/7</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5500/frontend/index.html" style="background: linear-gradient(135deg, #f59e0b, #eab308); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block;">
                            🛒 Bắt đầu mua sắm ngay
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                        Cảm ơn bạn đã tin tưởng và lựa chọn Yến Nhi Tech! 💛
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        Nếu có bất kỳ thắc mắc nào, hãy liên hệ với chúng tôi qua email hoặc hotline.
                    </p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail, sendWelcomeEmail };
