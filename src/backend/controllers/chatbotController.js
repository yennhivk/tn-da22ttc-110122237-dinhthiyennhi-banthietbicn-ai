const db = require('../config/database');
const jwt = require('jsonwebtoken');
const RecommendationEngine = require('../utils/recommendationEngineJS');
const ragEngine = require('../utils/ragEngine');
const fetch = require('node-fetch');

// Hàm kiểm tra tính hợp lệ của câu lệnh SQL SELECT (ngăn chặn SQL Injection thay đổi dữ liệu)
function isValidSelectQuery(sql) {
    const cleanSql = sql.trim().toLowerCase();
    
    // Bắt buộc phải là câu lệnh SELECT
    if (!cleanSql.startsWith('select')) {
        return false;
    }
    
    // Các từ khóa cấm sửa đổi DB
    const forbiddenKeywords = [
        'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 
        'replace', 'rename', 'grant', 'revoke', 'procedure', 'function', 
        'into outfile', 'into dumpfile', 'load_file'
    ];
    
    for (const kw of forbiddenKeywords) {
        // Khớp từ độc lập để tránh bị dính các cột như created_at, updated_at
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(sql)) {
            return false;
        }
    }
    
    return true;
}

// Loại bỏ các trường thông tin nhạy cảm trước khi trả kết quả về cho AI
function sanitizeRows(rows) {
    if (!Array.isArray(rows)) return rows;
    return rows.map(row => {
        const cleanRow = { ...row };
        delete cleanRow.mat_khau;
        delete cleanRow.mat_khau_gg;
        delete cleanRow.password;
        return cleanRow;
    });
}

// Khởi tạo các thẻ sản phẩm HTML trực quan cho giao diện Chatbot
function formatProductCardsHTML(products) {
    if (!Array.isArray(products) || products.length === 0) return '';
    
    return '<br><br>' + products.map(r => {
        const priceFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.gia);
        let imgSrc = 'http://localhost:3000/images/Logo-removebg-preview.png';
        if (r.duong_dan_anh) {
            if (r.duong_dan_anh.startsWith('http')) imgSrc = r.duong_dan_anh;
            else imgSrc = `http://localhost:${process.env.PORT || 3000}${r.duong_dan_anh.startsWith('/') ? '' : '/'}${r.duong_dan_anh}`;
        }
        return `<div style="border:1px solid #ddd;border-radius:8px;padding:15px;margin:10px 0;background:#fff;"><strong style="color:#222;font-size:16px;">${r.ten_san_pham}</strong><br><span style="color:#ef4444;font-weight:bold;font-size:15px;">Giá: ${priceFormat}</span><br><div style="text-align:center;margin:15px 0;"><img src="${imgSrc}" onerror="this.onerror=null;this.src='http://localhost:3000/images/Logo-removebg-preview.png';" style="width:100%;max-width:200px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"></div><a href="/user/pages/product-detail.html?id=${r.ma_san_pham}" target="_blank" style="display:block;background:linear-gradient(90deg,#0052cc,#003399);color:#fff;padding:10px 0;border-radius:6px;text-align:center;text-decoration:none;font-weight:bold;margin-top:10px;cursor:pointer;">MUA NGAY &rarr;</a></div>`;
    }).join('');
}

// Thực thi công cụ truy vấn cơ sở dữ liệu dựa trên tên và tham số truyền vào
async function executeTool(name, args, userId) {
    console.log(`🤖 Chatbot Tool Executing: "${name}" với tham số:`, args);
    switch (name) {
        case 'tim_kiem_san_pham': {
            const query = args.query || '';
            const [rows] = await db.query(
                `SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.so_luong, sp.thuong_hieu, a.duong_dan_anh 
                 FROM san_pham sp 
                 LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1 
                 WHERE sp.trang_thai = 'hien_thi' AND (sp.ten_san_pham LIKE ? OR sp.mo_ta LIKE ? OR sp.thuong_hieu LIKE ?) 
                 LIMIT 3`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );
            return {
                products: rows,
                note: "Đã tìm thấy các sản phẩm trên. Hệ thống sẽ hiển thị các thẻ sản phẩm tương ứng."
            };
        }
        
        case 'get_san_pham_moi_nhat': {
            // Lấy sản phẩm được thêm trong 15 ngày gần nhất
            const [rows] = await db.query(
                `SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.so_luong, sp.thuong_hieu, sp.ngay_tao, a.duong_dan_anh 
                 FROM san_pham sp 
                 LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1 
                 WHERE sp.trang_thai = 'hien_thi' 
                 AND sp.ngay_tao >= DATE_SUB(NOW(), INTERVAL 15 DAY)
                 ORDER BY sp.ngay_tao DESC 
                 LIMIT 6`
            );
            
            if (rows.length === 0) {
                return {
                    products: [],
                    note: "Hiện tại chưa có sản phẩm mới trong 15 ngày gần đây. Hãy đề xuất xem sản phẩm bán chạy hoặc khuyến mãi."
                };
            }
            
            // Format ngày tạo
            const productsWithDate = rows.map(p => ({
                ...p,
                ngay_them_formatted: new Date(p.ngay_tao).toLocaleDateString('vi-VN')
            }));
            
            return {
                products: productsWithDate,
                note: `Đã tìm thấy ${rows.length} sản phẩm mới được thêm trong 15 ngày gần đây. Hãy giới thiệu với khách hàng rằng đây là những sản phẩm mới nhất vừa về cửa hàng kèm ngày thêm.`
            };
        }
        
        case 'get_product_detail': {
            const productName = args.ten_san_pham;
            if (!productName) return { error: "Thiếu tên sản phẩm (ten_san_pham)" };
            const [rows] = await db.query(
                `SELECT sp.*, dm.ten_danh_muc, a.duong_dan_anh 
                 FROM san_pham sp 
                 LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
                 LEFT JOIN anh_san_pham a ON sp.ma_san_pham = a.ma_san_pham AND a.la_anh_chinh = 1
                 WHERE sp.trang_thai = 'hien_thi' AND sp.ten_san_pham LIKE ?
                 LIMIT 1`,
                [`%${productName}%`]
            );
            if (rows.length === 0) return { error: `Không tìm thấy sản phẩm "${productName}"` };
            return rows[0];
        }
        
        case 'get_categories': {
            const [rows] = await db.query(`SELECT * FROM danh_muc_san_pham`);
            return rows;
        }
        
        case 'get_personal_orders': {
            if (!userId) {
                return { error: "Khách hàng chưa đăng nhập. Vui lòng hướng dẫn khách hàng đăng nhập để xem đơn hàng cá nhân." };
            }
            const [rows] = await db.query(
                `SELECT ma_don_hang, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, dia_chi_giao_hang, ngay_tao 
                 FROM don_hang 
                 WHERE ma_tai_khoan = ? 
                 ORDER BY ngay_tao DESC`,
                [userId]
            );
            return rows;
        }
        
        case 'query_database': {
            const sql = args.sql;
            if (!sql) return { error: "Thiếu tham số câu lệnh SQL (sql)" };
            
            if (!isValidSelectQuery(sql)) {
                return { error: "Chỉ được phép thực hiện câu lệnh SELECT đọc dữ liệu và không chứa từ khóa độc hại/thay đổi cấu trúc!" };
            }
            
            try {
                const [rows] = await db.query(sql);
                const sanitized = sanitizeRows(rows);
                return sanitized;
            } catch (err) {
                return { error: `Lỗi SQL khi truy vấn CSDL: ${err.message}` };
            }
        }
        
        case 'check_in_store_warranty': {
            const phone = args.so_dien_thoai || '';
            const name = args.ten_khach_hang || '';
            
            if (!phone && !name) {
                return { error: "Vui lòng cung cấp số điện thoại hoặc tên khách hàng để tra cứu." };
            }
            
            let queryStr = `
                SELECT 
                    hd.ma_hoa_don_bh,
                    hd.ma_hoa_don,
                    hd.ten_khach_hang,
                    hd.so_dien_thoai,
                    hd.ngay_ban,
                    hd.ghi_chu,
                    ct.ten_san_pham,
                    ct.ma_san_pham
                FROM hoa_don_ban_hang hd
                LEFT JOIN chi_tiet_hoa_don_bh ct ON hd.ma_hoa_don_bh = ct.ma_hoa_don_bh
                WHERE 1=1
            `;
            const params = [];
            if (phone) {
                queryStr += ` AND (hd.so_dien_thoai LIKE ? OR hd.so_dien_thoai = ?)`;
                params.push(`%${phone}%`, phone);
            }
            if (name) {
                queryStr += ` AND hd.ten_khach_hang LIKE ?`;
                params.push(`%${name}%`);
            }
            queryStr += ` ORDER BY hd.ngay_ban DESC LIMIT 5`;
            
            const [rows] = await db.query(queryStr, params);
            
            const today = new Date();
            const results = rows.map(row => {
                let warrantyMonths = 12; // default
                let notes = '';
                if (row.ghi_chu) {
                    try {
                        const parsed = JSON.parse(row.ghi_chu);
                        if (parsed && typeof parsed.warranty_months !== 'undefined') {
                            warrantyMonths = parseInt(parsed.warranty_months, 10);
                        }
                        if (parsed && parsed.notes !== undefined) {
                            notes = parsed.notes;
                        } else {
                            notes = row.ghi_chu;
                        }
                    } catch (e) {
                        const match = row.ghi_chu.match(/(\d+)\s*tháng/i) || row.ghi_chu.match(/bảo hành\s*(\d+)/i);
                        if (match) {
                            warrantyMonths = parseInt(match[1], 10);
                        }
                        notes = row.ghi_chu;
                    }
                }
                
                const ngayBanDate = new Date(row.ngay_ban);
                const expiryDate = new Date(ngayBanDate);
                expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
                
                const isUnderWarranty = expiryDate >= today;
                
                const formattedNgayBan = ngayBanDate.toLocaleDateString('vi-VN');
                const formattedExpiryDate = expiryDate.toLocaleDateString('vi-VN');
                
                return {
                    ma_hoa_don: row.ma_hoa_don,
                    ten_khach_hang: row.ten_khach_hang,
                    so_dien_thoai: row.so_dien_thoai,
                    ten_san_pham: row.ten_san_pham,
                    ngay_ban: formattedNgayBan,
                    thoi_gian_bao_hanh: `${warrantyMonths} tháng`,
                    ngay_het_han: formattedExpiryDate,
                    trang_thai_bao_hanh: isUnderWarranty ? "Còn hạn bảo hành" : "Hết hạn bảo hành",
                    ghi_chu: notes
                };
            });
            
            return {
                success: true,
                records: results,
                note: results.length > 0 
                    ? `Đã tìm thấy ${results.length} đơn hàng. Hãy tóm tắt thông tin bảo hành này thật chi tiết cho người dùng.`
                    : `Không tìm thấy thông tin bảo hành nào cho số điện thoại/tên này tại cửa hàng.`
            };
        }
        
        default:
            return { error: `Công cụ không được hỗ trợ: ${name}` };
    }
}

const chat = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages) return res.status(400).json({ error: 'Messages required' });

        // Giải mã User ID từ Authorization header (JWT Token)
        let userId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                userId = decoded.ma_tai_khoan;
            } catch (err) {
                // TokenExpiredError là bình thường với khách vãng lai, không cần log
                if (err.name !== 'TokenExpiredError') {
                    console.log('🤖 Chatbot: JWT verification failed:', err.message);
                }
            }
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        
        // Chuẩn hóa và làm sạch lịch sử hội thoại trước khi gửi lên API
        let sanitizedMessages = messages.map(msg => {
            let clone = { ...msg };
            if (clone.role === 'assistant' && typeof clone.content === 'string') {
                // Loại bỏ tất cả thẻ HTML trước khi gửi cho LLM để tránh bị lỗi ngữ cảnh ở lượt tiếp theo
                clone.content = clone.content.replace(/<[^>]*>?/gm, ' ').trim();
                if (!clone.content) clone.content = 'Tôi đã tìm thấy thông tin sản phẩm và hiển thị dạng thẻ cho bạn.';
            }
            return clone;
        });

        // Giới hạn lịch sử hội thoại: giữ system message + tối đa 6 tin nhắn gần nhất
        // (tránh vượt giới hạn TPM của Groq free tier)
        const MAX_HISTORY = 6;
        const systemMsgs   = sanitizedMessages.filter(m => m.role === 'system');
        const nonSystemMsgs= sanitizedMessages.filter(m => m.role !== 'system');
        if (nonSystemMsgs.length > MAX_HISTORY) {
            sanitizedMessages = [...systemMsgs, ...nonSystemMsgs.slice(-MAX_HISTORY)];
        }

        // 1. Thực hiện RAG để lấy thông tin tài liệu cửa hàng liên quan
        const lastUserMessage = [...sanitizedMessages].reverse().find(msg => msg.role === 'user');
        let ragContext = '';
        if (lastUserMessage) {
            const relevantChunks = ragEngine.retrieve(lastUserMessage.content, 3);
            if (relevantChunks.length > 0) {
                ragContext = `\n\n[HỆ THỐNG TÀI LIỆU CỬA HÀNG (RAG)]:\nSử dụng các thông tin chính thống sau đây từ tài liệu của cửa hàng để trả lời nếu người dùng hỏi về thông tin liên hệ cửa hàng, giờ mở cửa, địa chỉ, hoặc các chính sách bảo hành, đổi trả, giao hàng, thanh toán:\n` + 
                    relevantChunks.map((c, i) => `Tài liệu ${i+1} (${c.source}):\n${c.content}`).join('\n\n');
            }
        }

        // Tích hợp ngữ cảnh RAG và cấu trúc CSDL vào System Message đầu tiên
        const dbSchemaContext = `\n\n[CẤU TRÚC CƠ SỞ DỮ LIỆU CỬA HÀNG để truy vấn SQL]:
- danh_muc_san_pham(ma_danh_muc, ten_danh_muc)
- san_pham(ma_san_pham, ma_danh_muc, ten_san_pham, mo_ta, gia, so_luong, thuong_hieu, trang_thai)
- don_hang(ma_don_hang, ma_tai_khoan, tong_tien, trang_thai_thanh_toan, trang_thai_don_hang, ngay_tao)
- chi_tiet_don_hang(ma_chi_tiet, ma_don_hang, ma_san_pham, so_luong, gia_ban)
- tai_khoan(ma_tai_khoan, ten_dang_nhap, email, vai_tro, trang_thai)
Lưu ý: cột giá của sản phẩm là "gia" (không phải gia_ban), cột giá trong chi tiết đơn hàng là "gia_ban".`;

        const productRules = `\n\n[QUY TẮC BẮT BUỘC KHI TƯ VẤN SẢN PHẨM]:
1. TUYỆT ĐỐI không được tự nghĩ ra hoặc bịa đặt thông tin sản phẩm, giá cả, tên sản phẩm từ kiến thức huấn luyện. Mọi thông tin sản phẩm PHẢI lấy từ database thực tế của cửa hàng thông qua các công cụ (tools) được cung cấp.
2. Khi khách hỏi về sản phẩm, tìm kiếm sản phẩm, giá cả, tồn kho → BẮT BUỘC phải gọi tool "tim_kiem_san_pham" hoặc "get_product_detail" để lấy dữ liệu thực tế.
3. Chỉ đề cập tên sản phẩm và giá cả một cách tự nhiên bằng chữ thường. TUYỆT ĐỐI KHÔNG tự tạo ra bất kỳ đường dẫn markdown nào dạng [Tên](...) trong câu trả lời văn bản, vì hệ thống sẽ tự động đính kèm thẻ sản phẩm trực quan (gồm ảnh và link chi tiết) ở bên dưới.
4. Nếu không tìm thấy sản phẩm phù hợp trong database, hãy thành thật thông báo cửa hàng không có sản phẩm này thay vì gợi ý sản phẩm bịa đặt.`;

        let systemMessageIndex = sanitizedMessages.findIndex(msg => msg.role === 'system');
        if (systemMessageIndex !== -1) {
            sanitizedMessages[systemMessageIndex].content += dbSchemaContext + productRules + ragContext;
        } else {
            sanitizedMessages.unshift({ 
                role: 'system', 
                content: `Bạn là trợ lý ảo của cửa hàng công nghệ "Yến Nhi Tech". Hãy trả lời ngắn gọn, thân thiện và hữu ích bằng tiếng Việt.${dbSchemaContext}${productRules}${ragContext}` 
            });
        }

        // Định nghĩa các công cụ truy vấn thông tin cơ sở dữ liệu cho LLM sử dụng
        const tools = [
            {
                type: 'function',
                function: {
                    name: 'tim_kiem_san_pham',
                    description: 'Tìm kiếm danh sách sản phẩm, thiết bị, phụ kiện từ cửa hàng trực tiếp trong Database theo từ khóa.',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Từ khóa tên sản phẩm hoặc thương hiệu cần tìm (ví dụ: "iPhone", "Asus", "tai nghe")' }
                        },
                        required: ['query']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_san_pham_moi_nhat',
                    description: 'Lấy danh sách các sản phẩm mới nhất được thêm vào cửa hàng trong vòng 15 ngày gần đây. Dùng khi khách hàng hỏi về sản phẩm mới, hàng mới về, có gì mới.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_product_detail',
                    description: 'Xem thông tin chi tiết, giá, số lượng tồn kho của một sản phẩm cụ thể theo tên sản phẩm. Dùng khi khách hỏi chi tiết về một sản phẩm.',
                    parameters: {
                        type: 'object',
                        properties: {
                            ten_san_pham: { type: 'string', description: 'Tên sản phẩm cần xem chi tiết (ví dụ: "iPhone 15", "MacBook Air")' }
                        },
                        required: ['ten_san_pham']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_categories',
                    description: 'Xem danh sách tất cả các danh mục sản phẩm của cửa hàng.'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_personal_orders',
                    description: 'Lấy lịch sử danh sách đơn hàng của khách hàng đang đăng nhập hiện tại.'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'query_database',
                    description: 'Thực thi câu lệnh SQL SELECT truy vấn thông tin dữ liệu từ MySQL Database. Chỉ dùng câu lệnh SELECT để đọc dữ liệu, tuyệt đối không dùng các câu lệnh ghi/xóa/sửa đổi.',
                    parameters: {
                        type: 'object',
                        properties: {
                            sql: { type: 'string', description: 'Câu lệnh SQL SELECT đầy đủ và chính xác (ví dụ: "SELECT ten_san_pham, gia FROM san_pham ORDER BY gia DESC LIMIT 1")' }
                        },
                        required: ['sql']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'check_in_store_warranty',
                    description: 'Kiểm tra thông tin bảo hành của khách hàng mua trực tiếp tại cửa hàng (offline) bằng số điện thoại và/hoặc tên khách hàng.',
                    parameters: {
                        type: 'object',
                        properties: {
                            so_dien_thoai: { type: 'string', description: 'Số điện thoại của khách hàng cần tra cứu bảo hành (ví dụ: "0987654321")' },
                            ten_khach_hang: { type: 'string', description: 'Tên của khách hàng cần tra cứu bảo hành (ví dụ: "Nguyễn Văn A")' }
                        },
                        required: ['so_dien_thoai']
                    }
                }
            }
        ];

        // Hàm gửi request lên Groq với retry tự động khi gặp rate limit
        async function callGroq(payload, label) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method : 'POST',
                    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
                    body   : JSON.stringify(payload)
                });
                if (r.ok) return r;
                const errText = await r.text();
                let errObj;
                try { errObj = JSON.parse(errText); } catch(e) { errObj = {}; }
                // Nếu là rate limit → đợi rồi thử lại
                if (r.status === 429 && attempt < 3) {
                    // Lấy thời gian chờ từ header hoặc dùng fallback 10s
                    const retryAfterHeader = r.headers && r.headers.get ? r.headers.get('retry-after') : null;
                    const waitMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 10000;
                    console.warn(`⚠️ Groq rate limit (${label}) lượt ${attempt}/3. Chờ ${waitMs}ms rồi thử lại...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }
                // Lỗi khác hoặc hết lượt retry
                console.error(`❌ Groq API Error ${label}:`, errText);
                return r; // trả về response lỗi để xử lý bên ngoài
            }
        }

        // Lượt gọi 1: Gửi yêu cầu lên Groq AI kèm danh sách công cụ
        let response;
        try {
            response = await callGroq({
                model       : 'llama-3.3-70b-versatile',
                messages    : sanitizedMessages,
                temperature : 0.0,
                max_tokens  : 512,
                tools       : tools,
                tool_choice : 'auto'
            }, '1');
        } catch (fetchErr) {
            console.error('❌ Fetch Error (Groq API call 1):', fetchErr.message);
            console.error('❌ Full error:', fetchErr);
            return res.status(500).json({
                error  : 'Không thể kết nối đến Groq API. Vui lòng kiểm tra kết nối mạng.',
                details: fetchErr.message 
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ Groq API Error 1:', errText);
            return res.status(response.status).json({ error: 'Groq API error' });
        }

        let data = await response.json();
        let aiMessage = data.choices && data.choices[0] ? data.choices[0].message : null;

        // Nếu LLM yêu cầu gọi công cụ để lấy thông tin bổ sung từ Database
        if (aiMessage && aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            let secondTurnMessages = [...sanitizedMessages, aiMessage];
            let productsToDisplay = [];

            for (const toolCall of aiMessage.tool_calls) {
                const toolName = toolCall.function.name;
                let args = {};
                try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}

                let toolResult;
                try {
                    toolResult = await executeTool(toolName, args, userId);
                    
                    // Nếu là kết quả tìm kiếm hoặc chi tiết sản phẩm, lưu lại danh sách sản phẩm để hiển thị dưới dạng card
                    if ((toolName === 'tim_kiem_san_pham' || toolName === 'get_san_pham_moi_nhat') && toolResult.products) {
                        productsToDisplay = productsToDisplay.concat(toolResult.products);
                    } else if (toolName === 'get_product_detail' && toolResult && !toolResult.error) {
                        productsToDisplay.push(toolResult);
                    }
                    
                    // Ghi nhận hành động xem sản phẩm của người dùng (nếu có userId và có sản phẩm liên quan)
                    if (userId) {
                        if ((toolName === 'tim_kiem_san_pham' || toolName === 'get_san_pham_moi_nhat') && toolResult.products) {
                            for (const prod of toolResult.products) {
                                try {
                                    await RecommendationEngine.trackUserAction(userId, prod.ma_san_pham, 'chatbot_view', 2);
                                } catch (trackErr) {}
                            }
                        } else if (toolName === 'get_product_detail' && toolResult && toolResult.ma_san_pham) {
                            try {
                                await RecommendationEngine.trackUserAction(userId, toolResult.ma_san_pham, 'chatbot_view', 2);
                            } catch (trackErr) {}
                        }
                    }
                } catch (err) {
                    toolResult = { error: `Lỗi khi thực thi công cụ: ${err.message}` };
                }

                // Thêm kết quả của tool vào mảng tin nhắn lượt 2
                secondTurnMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(toolResult)
                });
            }

            // Lượt gọi 2: Gửi kết quả của các công cụ lại cho Groq để sinh phản hồi cuối cùng
            let secondResponse;
            try {
                secondResponse = await callGroq({
                    model      : 'llama-3.3-70b-versatile',
                    messages   : secondTurnMessages,
                    temperature: 0.0,
                    max_tokens : 512
                }, '2');
            } catch (fetchErr) {
                console.error('❌ Fetch Error (Groq API call 2):', fetchErr.message);
                console.error('❌ Full error:', fetchErr);
                return res.status(500).json({
                    error  : 'Không thể kết nối đến Groq API ở lượt 2. Vui lòng kiểm tra kết nối mạng.',
                    details: fetchErr.message
                });
            }

            if (!secondResponse.ok) {
                const errText = await secondResponse.text();
                console.error('❌ Groq API Error 2:', errText);
                return res.status(secondResponse.status).json({ error: 'Groq API error in second turn' });
            }

            let secondData = await secondResponse.json();
            let finalAiMessage = secondData.choices && secondData.choices[0] ? secondData.choices[0].message : null;

            if (finalAiMessage) {
                // Nếu tìm kiếm sản phẩm thành công, ghép các thẻ sản phẩm HTML vào phản hồi dạng văn bản
                if (productsToDisplay.length > 0) {
                    const cardsHTML = formatProductCardsHTML(productsToDisplay);
                    finalAiMessage.content = finalAiMessage.content + cardsHTML;
                }

                // Lưu lịch sử trò chuyện vào cơ sở dữ liệu nếu khách hàng đã đăng nhập
                if (userId) {
                    try {
                        const userQueryText = lastUserMessage ? lastUserMessage.content : '';
                        const cleanResponse = finalAiMessage.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                        await db.query(
                            'INSERT INTO lich_su_chatbot (ma_tai_khoan, cau_hoi, tra_loi) VALUES (?, ?, ?)',
                            [userId, userQueryText, cleanResponse]
                        );
                    } catch (historyErr) {
                        console.error('❌ Lỗi ghi lịch sử chatbot:', historyErr.message);
                    }
                }

                secondData.choices[0].message = finalAiMessage;
                return res.json(secondData);
            }
        }

        // Nếu không cần gọi công cụ, lưu lịch sử trò chuyện từ lượt gọi thứ nhất
        if (userId && aiMessage && aiMessage.content) {
            try {
                const userQueryText = lastUserMessage ? lastUserMessage.content : '';
                const cleanResponse = aiMessage.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                await db.query(
                    'INSERT INTO lich_su_chatbot (ma_tai_khoan, cau_hoi, tra_loi) VALUES (?, ?, ?)',
                    [userId, userQueryText, cleanResponse]
                );
            } catch (historyErr) {
                console.error('❌ Lỗi ghi lịch sử chatbot:', historyErr.message);
            }
        }

        return res.json(data);
    } catch (error) {
        console.error('❌ Lỗi xử lý chatbot API:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    chat
};
