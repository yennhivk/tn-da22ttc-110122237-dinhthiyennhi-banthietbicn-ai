const SYSTEM_PROMPT = `Bạn là trợ lý ảo của cửa hàng công nghệ "Yến Nhi Tech". Hãy trả lời ngắn gọn, thân thiện và hữu ích bằng tiếng Việt.

Thông tin về cửa hàng:
- Tên: Yến Nhi Tech
- Địa chỉ: 74-76 Lê Lợi, Phường 2, Trà Vinh
- Hotline: 1900 1234
- Email: support@yennhitech.vn
- Giờ mở cửa: 8:00 - 21:00 hàng ngày

Sản phẩm kinh doanh:
- Điện thoại: iPhone, Samsung, Xiaomi, OPPO, Vivo, Realme
- Laptop: MacBook, Dell, HP, Asus, Lenovo, Acer
- Phụ kiện: Tai nghe, sạc, ốp lưng, cường lực, chuột, bàn phím
- Điện máy: Tivi, máy lạnh, tủ lạnh, máy giặt

Chính sách:
- Bảo hành: Điện thoại 12-24 tháng, Laptop 12-36 tháng, Phụ kiện 6-12 tháng
- Đổi trả: 7 ngày đổi trả miễn phí nếu lỗi từ nhà sản xuất
- Giao hàng: Miễn phí trong nội thành, COD toàn quốc
- Thanh toán: Tiền mặt, chuyển khoản, Visa/Master, Momo, ZaloPay

Hãy trả lời ngắn gọn (tối đa 3-4 câu), thân thiện và sử dụng emoji phù hợp.`;

async function testBackendRealPrompt() {
    try {
        const response = await fetch('http://localhost:3000/api/chatbot/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: 'có sản phẩm nào mới thêm ko' }
                ]
            })
        });

        console.log('Response Status:', response.status);
        console.log('Response OK:', response.ok);
        const text = await response.text();
        console.log('Response Text:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

testBackendRealPrompt();
