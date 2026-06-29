// Chatbot Widget with Groq AI + Chat History (User-based)
(function() {
    const CHATBOT_API_URL = 'http://localhost:3000/api/chatbot/chat';
    const STORAGE_PREFIX = 'yennhi_chat_';
    
    const isInPages = window.location.pathname.includes('/pages/');
    const basePath = isInPages ? '../../' : '';
    const loginPage = isInPages ? 'login.html' : 'pages/login.html';

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

    // Get current user
    function getCurrentUser() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = localStorage.getItem('token');
            if (user && token) {
                return user;
            }
        } catch (e) {}
        return null;
    }

    // Get storage key for current user
    function getStorageKey() {
        const user = getCurrentUser();
        if (user && user.ma_khach_hang) {
            return STORAGE_PREFIX + user.ma_khach_hang;
        }
        return STORAGE_PREFIX + 'guest';
    }

    // Chat sessions management
    let chatSessions = [];
    let currentSessionId = null;
    let conversationHistory = [];
    let isHistoryView = false;

    // Load sessions from storage
    function loadSessions() {
        const key = getStorageKey();
        chatSessions = JSON.parse(localStorage.getItem(key) || '[]');
    }

    // Save sessions to storage
    function saveSessions() {
        const key = getStorageKey();
        if (chatSessions.length > 20) {
            chatSessions = chatSessions.slice(0, 20);
        }
        localStorage.setItem(key, JSON.stringify(chatSessions));
    }

    // Create chatbot HTML
    const chatbotHTML = `
    <div id="chatbot-container">
        <div class="chatbot-intro-bubble" id="chatbot-intro-bubble">
            <div class="intro-content">
                <span class="intro-title">Yến Nhi Tech</span>
                <span class="intro-text" id="intro-text">Em rất sẵn lòng hỗ trợ Anh/Chị 😊</span>
            </div>
        </div>
        <div class="social-floating-buttons">
            <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" class="social-float-btn social-float-facebook" title="Facebook Yến Nhi Tech" aria-label="Facebook Yến Nhi Tech">
                <span class="social-wave"></span>
                <img src="${basePath}images/Facebook-2020-200.png" alt="Facebook" class="facebook-icon-img">
            </a>
            <a href="https://zalo.me/" target="_blank" rel="noopener noreferrer" class="social-float-btn social-float-zalo" title="Zalo Yến Nhi Tech" aria-label="Zalo Yến Nhi Tech">
                <span class="social-wave"></span>
                <img src="${basePath}images/Icon_of_Zalo.svg.webp" alt="Zalo" class="zalo-icon-img">
            </a>
        </div>

        <button id="chatbot-toggle" class="chatbot-toggle" title="Chat với chúng tôi">
            <img id="chat-icon" src="${basePath}images/chat.png?t=${Date.now()}" alt="Chat" class="chatbot-toggle-img">
            <svg id="close-icon" class="chatbot-hidden" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>

        <div id="chatbot-window" class="chatbot-window chatbot-hidden">
            <!-- Header -->
            <div class="chatbot-header">
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="chatbot-avatar">
                        <img src="${basePath}images/chat.png?t=${Date.now()}" alt="Bot">
                        <span class="online-dot"></span>
                    </div>
                    <div>
                        <h3 style="font-weight:bold;color:white;margin:0">Yến Nhi Tech</h3>
                        <p style="font-size:12px;color:#fef3c7;margin:0">🤖 AI Hỗ trợ 24/7</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button id="new-chat-btn" class="header-btn" title="Tạo đoạn chat mới">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </button>
                    <button id="history-btn" class="header-btn" title="Lịch sử chat">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                    <button id="chatbot-minimize" class="header-btn" title="Thu nhỏ">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Login Required Panel -->
            <div id="login-required-panel" class="login-required-panel chatbot-hidden">
                <div class="login-required-content">
                    <svg width="64" height="64" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <h4>Đăng nhập để xem lịch sử</h4>
                    <p>Bạn cần đăng nhập để xem và quản lý lịch sử chat của mình.</p>
                    <a href="${loginPage}" class="login-btn">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                        </svg>
                        Đăng nhập ngay
                    </a>
                    <button id="back-from-login" class="back-link">← Quay lại chat</button>
                </div>
            </div>

            <!-- History Panel -->
            <div id="history-panel" class="history-panel chatbot-hidden">
                <div class="history-header">
                    <h4>📜 Lịch sử chat</h4>
                    <button id="back-to-chat" class="back-btn">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Quay lại
                    </button>
                </div>
                <div id="user-info-bar" class="user-info-bar"></div>
                <div id="history-list" class="history-list"></div>
            </div>

            <!-- Chat Panel -->
            <div id="chat-panel">
                <div id="chatbot-messages" class="chatbot-messages">
                    <div class="chat-message bot-message">
                        <div class="message-content">
                            <p>Xin chào! 👋 Tôi là trợ lý AI của <strong>Yến Nhi Tech</strong>.</p>
                            <p style="margin-top:8px">Tôi có thể giúp bạn tư vấn sản phẩm, kiểm tra đơn hàng, hỗ trợ kỹ thuật và nhiều hơn nữa. Hãy hỏi tôi bất cứ điều gì! 😊</p>
                        </div>
                        <span class="message-time">Vừa xong</span>
                    </div>
                </div>

                <div id="quick-replies" class="quick-replies">
                    <button class="quick-reply-btn" data-message="Tư vấn điện thoại cho tôi">📱 Tư vấn ĐT</button>
                    <button class="quick-reply-btn" data-message="Có khuyến mãi gì không?">🎁 Khuyến mãi</button>
                    <button class="quick-reply-btn" data-message="Chính sách bảo hành">🛡️ Bảo hành</button>
                    <button class="quick-reply-btn" data-message="Địa chỉ cửa hàng">📍 Địa chỉ</button>
                </div>

                <div class="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="Nhập tin nhắn..." autocomplete="off">
                    <button id="chatbot-send" class="chatbot-send-btn" title="Gửi">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    // Insert chatbot into page
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Get elements
    const toggle = document.getElementById('chatbot-toggle');
    const chatWindow = document.getElementById('chatbot-window');
    const minimize = document.getElementById('chatbot-minimize');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messages = document.getElementById('chatbot-messages');
    const quickReplies = document.querySelectorAll('.quick-reply-btn');
    const chatIcon = document.getElementById('chat-icon');
    const closeIcon = document.getElementById('close-icon');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyBtn = document.getElementById('history-btn');
    const historyPanel = document.getElementById('history-panel');
    const chatPanel = document.getElementById('chat-panel');
    const historyList = document.getElementById('history-list');
    const backToChat = document.getElementById('back-to-chat');
    const loginRequiredPanel = document.getElementById('login-required-panel');
    const backFromLogin = document.getElementById('back-from-login');
    const userInfoBar = document.getElementById('user-info-bar');

    let isOpen = false;

    // Intro messages rotation
    const introMessages = [
        'Em rất sẵn lòng hỗ trợ Anh/Chị 😊',
        'Tư vấn sản phẩm miễn phí 24/7 🎯',
        'Hỗ trợ mua sắm nhanh chóng 🛒',
        'Giải đáp mọi thắc mắc của bạn 💬',
        'Khuyến mãi hot mỗi ngày 🎁'
    ];
    let currentIntroIndex = 0;

    function rotateIntroMessage() {
        const introTextEl = document.getElementById('intro-text');
        if (introTextEl && !isOpen) {
            introTextEl.style.opacity = '0';
            setTimeout(() => {
                currentIntroIndex = (currentIntroIndex + 1) % introMessages.length;
                introTextEl.textContent = introMessages[currentIntroIndex];
                introTextEl.style.opacity = '1';
            }, 300);
        }
    }

    // Rotate intro message every 3 seconds
    setInterval(rotateIntroMessage, 3000);

    // Initialize
    function init() {
        loadSessions();
        if (chatSessions.length === 0) {
            createNewSession();
        } else {
            currentSessionId = chatSessions[0].id;
            conversationHistory = chatSessions[0].messages || [];
        }
    }
    init();

    // Toggle chat window
    toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        chatWindow.classList.toggle('chatbot-hidden', !isOpen);
        chatIcon.classList.toggle('chatbot-hidden', isOpen);
        closeIcon.classList.toggle('chatbot-hidden', !isOpen);
        
        // Hide intro bubble when chat is open
        const introBubble = document.getElementById('chatbot-intro-bubble');
        if (introBubble) {
            introBubble.style.display = isOpen ? 'none' : 'block';
        }
        
        if (isOpen) input.focus();
    });

    // Minimize button
    minimize.addEventListener('click', () => {
        isOpen = false;
        chatWindow.classList.add('chatbot-hidden');
        chatIcon.classList.remove('chatbot-hidden');
        closeIcon.classList.add('chatbot-hidden');
    });

    // New Chat button
    newChatBtn.addEventListener('click', () => {
        createNewSession();
        showChatPanel();
        renderCurrentSession();
    });

    // History button - check login
    historyBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
            showLoginRequired();
        } else {
            loadSessions(); // Reload sessions for current user
            showHistoryPanel();
            renderHistoryList();
        }
    });

    // Back to chat from history
    backToChat.addEventListener('click', () => {
        showChatPanel();
    });

    // Back from login required
    backFromLogin.addEventListener('click', () => {
        showChatPanel();
    });

    // Create new session
    function createNewSession() {
        loadSessions(); // Reload to get latest
        const session = {
            id: Date.now().toString(),
            title: 'Cuộc trò chuyện mới',
            createdAt: new Date().toISOString(),
            messages: [],
            displayMessages: []
        };
        chatSessions.unshift(session);
        currentSessionId = session.id;
        conversationHistory = [];
        saveSessions();
    }

    // Get current session
    function getCurrentSession() {
        return chatSessions.find(s => s.id === currentSessionId);
    }

    // Show/hide panels
    function showHistoryPanel() {
        historyPanel.classList.remove('chatbot-hidden');
        chatPanel.style.display = 'none';
        loginRequiredPanel.classList.add('chatbot-hidden');
        isHistoryView = true;
        
        // Show user info
        const user = getCurrentUser();
        if (user) {
            userInfoBar.innerHTML = `
                <div class="user-info">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span>${user.ho_ten || user.ten_dang_nhap || 'Người dùng'}</span>
                </div>
            `;
        }
    }

    function showChatPanel() {
        historyPanel.classList.add('chatbot-hidden');
        loginRequiredPanel.classList.add('chatbot-hidden');
        chatPanel.style.display = 'flex';
        isHistoryView = false;
    }

    function showLoginRequired() {
        loginRequiredPanel.classList.remove('chatbot-hidden');
        historyPanel.classList.add('chatbot-hidden');
        chatPanel.style.display = 'none';
    }

    // Render history list
    function renderHistoryList() {
        if (chatSessions.length === 0) {
            historyList.innerHTML = '<div class="no-history">Chưa có lịch sử chat</div>';
            return;
        }

        historyList.innerHTML = chatSessions.map(session => {
            const date = new Date(session.createdAt);
            const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const isActive = session.id === currentSessionId;
            const msgCount = (session.displayMessages || []).length;
            
            return `
                <div class="history-item ${isActive ? 'active' : ''}" data-id="${session.id}">
                    <div class="history-item-content">
                        <div class="history-item-title">${session.title}</div>
                        <div class="history-item-meta">
                            <span>${dateStr} ${timeStr}</span>
                            <span>•</span>
                            <span>${msgCount} tin nhắn</span>
                        </div>
                    </div>
                    <button class="delete-session-btn" data-id="${session.id}" title="Xóa">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-session-btn')) return;
                loadSession(item.dataset.id);
            });
        });

        historyList.querySelectorAll('.delete-session-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(btn.dataset.id);
            });
        });
    }

    // Load a session
    function loadSession(sessionId) {
        const session = chatSessions.find(s => s.id === sessionId);
        if (!session) return;

        currentSessionId = sessionId;
        conversationHistory = session.messages || [];
        renderCurrentSession();
        showChatPanel();
    }

    // Delete a session
    function deleteSession(sessionId) {
        if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;
        
        chatSessions = chatSessions.filter(s => s.id !== sessionId);
        saveSessions();

        if (sessionId === currentSessionId) {
            if (chatSessions.length > 0) {
                loadSession(chatSessions[0].id);
            } else {
                createNewSession();
                renderCurrentSession();
            }
        }
        renderHistoryList();
    }

    // Render current session messages
    function renderCurrentSession() {
        const session = getCurrentSession();
        messages.innerHTML = '';

        // Welcome message
        addMessageToDOM('Xin chào! 👋 Tôi là trợ lý AI của <strong>Yến Nhi Tech</strong>.<br><br>Tôi có thể giúp bạn tư vấn sản phẩm, kiểm tra đơn hàng, hỗ trợ kỹ thuật và nhiều hơn nữa. Hãy hỏi tôi bất cứ điều gì! 😊', 'bot', 'Vừa xong');

        // Render saved messages
        if (session && session.displayMessages) {
            session.displayMessages.forEach(msg => {
                addMessageToDOM(msg.content, msg.role === 'user' ? 'user' : 'bot', msg.time);
            });
        }
    }

    // Add message to DOM only
    function addMessageToDOM(text, type, time) {
        const div = document.createElement('div');
        div.className = `chat-message ${type}-message`;
        
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        div.innerHTML = `
            <div class="message-content"><p>${formattedText}</p></div>
            <span class="message-time">${time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // Send message
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        addMessageToDOM(text, 'user', time);
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;

        // Save user message
        const session = getCurrentSession();
        if (session) {
            session.displayMessages = session.displayMessages || [];
            session.displayMessages.push({ role: 'user', content: text, time });
            
            if (session.displayMessages.filter(m => m.role === 'user').length === 1) {
                session.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            }
            saveSessions();
        }
        
        showTyping();

        try {
            const response = await getAIResponse(text);
            hideTyping();
            
            const botTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            addMessageToDOM(response, 'bot', botTime);

            if (session) {
                session.displayMessages.push({ role: 'assistant', content: response, time: botTime });
                saveSessions();
            }
        } catch (error) {
            hideTyping();
            addMessageToDOM('Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại hoặc gọi hotline 1900 1234 để được hỗ trợ! 📞', 'bot');
            console.error('Chatbot error:', error);
        }
        
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Quick replies
    quickReplies.forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.message;
            sendMessage();
        });
    });

    // Typing indicator
    function showTyping() {
        const typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'chat-message bot-message';
        typing.innerHTML = `<div class="message-content typing-indicator"><span></span><span></span><span></span></div>`;
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    // Get AI response from Groq
    async function getAIResponse(userMessage) {
        conversationHistory.push({ role: 'user', content: userMessage });

        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        const session = getCurrentSession();
        if (session) {
            session.messages = conversationHistory;
            saveSessions();
        }

        const token = localStorage.getItem('token');
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...conversationHistory
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;

                // Lọc bỏ HTML trước khi ghép vào lịch sử (giúp backend ko bị lỗi 400 từ đợt hỏi sau)
        const cleanMessageForHistory = aiMessage.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        conversationHistory.push({ role: 'assistant', content: cleanMessageForHistory });

        if (session) {
            session.messages = conversationHistory;
            saveSessions();
        }

        return aiMessage;
    }
})();
