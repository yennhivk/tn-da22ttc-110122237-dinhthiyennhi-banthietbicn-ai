// Script để tạo bảng liên hệ
require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'CSDL_DoAnCN'
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS lien_he (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(15),
    chu_de VARCHAR(100) NOT NULL,
    noi_dung TEXT NOT NULL,
    ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai ENUM('chua_doc', 'da_doc', 'da_phan_hoi') DEFAULT 'chua_doc',
    ghi_chu TEXT,
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_ngay_gui (ngay_gui)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

connection.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối database:', err);
        process.exit(1);
    }
    console.log('✅ Kết nối database thành công!');

    connection.query(createTableSQL, (err, result) => {
        if (err) {
            console.error('Lỗi tạo bảng:', err);
        } else {
            console.log('✅ Tạo bảng lien_he thành công!');
        }
        
        connection.end();
        process.exit(0);
    });
});
