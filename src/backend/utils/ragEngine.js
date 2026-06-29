const fs = require('fs');
const path = require('path');

// Thư mục chứa tài liệu
const DOCUMENTS_DIR = path.join(__dirname, '../data/documents');

// Hàm chuẩn hóa văn bản tiếng Việt (chuyển sang chữ thường, loại bỏ dấu và ký tự đặc biệt)
function normalizeText(text) {
    if (!text) return '';
    // Chuyển sang chữ thường
    let normalized = text.toLowerCase();
    
    // Chuẩn hóa Unicode dựng sẵn và tổ hợp
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Thay thế các ký tự tiếng Việt có dấu đặc trưng khác nếu có
    normalized = normalized
        .replace(/[đ]/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ') // Giữ lại chữ, số và khoảng trắng
        .replace(/\s+/g, ' ')          // Thu gọn nhiều khoảng trắng
        .trim();
        
    return normalized;
}

// Hàm tách từ từ văn bản đã chuẩn hóa
function tokenize(normalizedText) {
    if (!normalizedText) return [];
    return normalizedText.split(' ').filter(word => word.length > 0);
}

// Đọc tất cả tài liệu và chia thành các chunk (phân đoạn)
function loadChunks() {
    const chunks = [];
    
    try {
        if (!fs.existsSync(DOCUMENTS_DIR)) {
            fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
            return chunks;
        }

        const files = fs.readdirSync(DOCUMENTS_DIR);
        
        for (const file of files) {
            if (file.endsWith('.txt') || file.endsWith('.md')) {
                const filePath = path.join(DOCUMENTS_DIR, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // Chia nhỏ tài liệu theo các dòng trống (các đoạn văn)
                const paragraphs = content.split(/\n\s*\n/);
                
                let chunkIndex = 0;
                for (let paragraph of paragraphs) {
                    paragraph = paragraph.trim();
                    // Chỉ lấy các đoạn có độ dài hợp lý (tránh các dòng trống, tiêu đề quá ngắn độc lập)
                    if (paragraph.length > 20) {
                        const id = `${file}_chunk_${chunkIndex++}`;
                        const normalized = normalizeText(paragraph);
                        const tokens = tokenize(normalized);
                        
                        chunks.push({
                            id,
                            source: file,
                            content: paragraph,      // Nội dung gốc
                            normalized,              // Nội dung chuẩn hóa để tìm kiếm
                            tokens                   // Mảng các từ của chunk
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('❌ RAG Engine: Lỗi khi load tài liệu:', err.message);
    }
    
    return chunks;
}

// Lớp công cụ tính toán TF-IDF và tìm kiếm tương tự
class RAGEngine {
    constructor() {
        this.chunks = [];
        this.vocabulary = new Set();
        this.idf = {};
        this.initialized = false;
    }

    // Khởi tạo/cập nhật bộ dữ liệu tìm kiếm
    initialize() {
        this.chunks = loadChunks();
        this.vocabulary = new Set();
        this.idf = {};
        
        if (this.chunks.length === 0) {
            this.initialized = true;
            return;
        }

        const numDocs = this.chunks.length;
        const df = {}; // Document Frequency

        // Xây dựng từ điển và tính DF
        for (const chunk of this.chunks) {
            const uniqueTokens = new Set(chunk.tokens);
            for (const token of uniqueTokens) {
                this.vocabulary.add(token);
                df[token] = (df[token] || 0) + 1;
            }
        }

        // Tính IDF cho mỗi từ
        for (const token of this.vocabulary) {
            this.idf[token] = Math.log(1 + numDocs / (df[token] || 1));
        }

        // Tính vector TF-IDF cho từng chunk
        for (const chunk of this.chunks) {
            chunk.tfidf = {};
            let maxTf = 0;
            const termCounts = {};
            
            for (const token of chunk.tokens) {
                termCounts[token] = (termCounts[token] || 0) + 1;
                if (termCounts[token] > maxTf) maxTf = termCounts[token];
            }

            let lengthSq = 0;
            for (const token in termCounts) {
                // Chuẩn hóa Term Frequency
                const tf = termCounts[token] / chunk.tokens.length;
                const tfidfValue = tf * (this.idf[token] || 0);
                chunk.tfidf[token] = tfidfValue;
                lengthSq += tfidfValue * tfidfValue;
            }
            // Độ dài vector để chuẩn hóa Cosine
            chunk.vectorLength = Math.sqrt(lengthSq);
        }

        this.initialized = true;
        console.log(`🤖 RAG Engine: Đã học ${this.chunks.length} đoạn tài liệu từ ${DOCUMENTS_DIR}`);
    }

    // Truy xuất các đoạn văn bản liên quan nhất dựa trên truy vấn
    retrieve(query, topK = 3) {
        // Luôn load lại dữ liệu để cập nhật tài liệu mới nhất nếu có thay đổi mà không cần restart server
        this.initialize();

        if (this.chunks.length === 0) {
            return [];
        }

        const normalizedQuery = normalizeText(query);
        const queryTokens = tokenize(normalizedQuery);
        
        if (queryTokens.length === 0) {
            return [];
        }

        // Tính TF cho truy vấn
        const queryCounts = {};
        for (const token of queryTokens) {
            queryCounts[token] = (queryCounts[token] || 0) + 1;
        }

        const queryTfidf = {};
        let queryLengthSq = 0;
        for (const token in queryCounts) {
            if (this.vocabulary.has(token)) {
                const tf = queryCounts[token] / queryTokens.length;
                const tfidfValue = tf * (this.idf[token] || 0);
                queryTfidf[token] = tfidfValue;
                queryLengthSq += tfidfValue * tfidfValue;
            }
        }
        const queryLength = Math.sqrt(queryLengthSq);

        if (queryLength === 0) {
            // Không có từ khóa nào khớp với từ điển, thử tìm kiếm chuỗi con (fallback đơn giản)
            const scores = this.chunks.map(chunk => {
                let overlapCount = 0;
                for (const token of queryTokens) {
                    if (chunk.normalized.includes(token)) {
                        overlapCount++;
                    }
                }
                const score = overlapCount / (queryTokens.length + 1);
                return { chunk, score };
            });
            
            return scores
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .map(item => item.chunk);
        }

        // Tính toán Cosine Similarity giữa truy vấn và tất cả các chunk
        const results = [];
        for (const chunk of this.chunks) {
            if (chunk.vectorLength === 0) continue;
            
            let dotProduct = 0;
            for (const token in queryTfidf) {
                if (chunk.tfidf[token]) {
                    dotProduct += queryTfidf[token] * chunk.tfidf[token];
                }
            }

            const score = dotProduct / (queryLength * chunk.vectorLength);
            results.push({ chunk, score });
        }

        // Sắp xếp giảm dần theo điểm số tương đồng
        results.sort((a, b) => b.score - a.score);
        
        // Trả về top K chunk có điểm số lớn hơn ngưỡng (ví dụ > 0)
        return results
            .filter(item => item.score > 0.05) // Ngưỡng nhỏ để loại bỏ các đoạn hoàn toàn không liên quan
            .slice(0, topK)
            .map(item => item.chunk);
    }
}

module.exports = new RAGEngine();
