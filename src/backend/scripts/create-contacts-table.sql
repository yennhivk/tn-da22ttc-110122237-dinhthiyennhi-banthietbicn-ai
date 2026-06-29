-- Tạo bảng liên hệ để lưu tin nhắn từ khách hàng
CREATE TABLE IF NOT EXISTS lien_he (
    ma_lien_he INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20),
    chu_de VARCHAR(200) NOT NULL,
    noi_dung TEXT NOT NULL,
    trang_thai ENUM('chua_doc', 'da_doc', 'da_phan_hoi') DEFAULT 'chua_doc',
    phan_hoi TEXT,
    ngay_phan_hoi TIMESTAMP NULL,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_ngay_tao (ngay_tao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu
INSERT INTO lien_he (ho_ten, email, so_dien_thoai, chu_de, noi_dung, trang_thai) VALUES
('Nguyễn Văn A', 'nguyenvana@gmail.com', '0901234567', 'Hỏi về sản phẩm', 'Tôi muốn hỏi về iPhone 15 Pro Max còn hàng không?', 'chua_doc'),
('Trần Thị B', 'tranthib@gmail.com', '0912345678', 'Bảo hành', 'Laptop của tôi bị lỗi màn hình, tôi muốn được bảo hành', 'da_doc'),
('Lê Văn C', 'levanc@gmail.com', '0923456789', 'Góp ý', 'Website rất đẹp và dễ sử dụng. Cảm ơn shop!', 'da_phan_hoi');
