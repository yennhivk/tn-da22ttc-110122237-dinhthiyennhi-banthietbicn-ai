-- Tạo bảng liên hệ để lưu tin nhắn từ khách hàng
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm một số dữ liệu mẫu (tùy chọn)
-- INSERT INTO lien_he (ho_ten, email, so_dien_thoai, chu_de, noi_dung) VALUES
-- ('Nguyễn Văn A', 'nguyenvana@email.com', '0901234567', 'Tư vấn sản phẩm', 'Tôi muốn được tư vấn về sản phẩm laptop gaming. Xin hãy liên hệ lại với tôi sớm nhất có thể.'),
-- ('Trần Thị B', 'tranthib@email.com', '0912345678', 'Hỗ trợ kỹ thuật', 'Sản phẩm tôi mua bị lỗi màn hình, xin hãy hỗ trợ tôi kiểm tra và bảo hành.'),
-- ('Lê Văn C', 'levanc@email.com', NULL, 'Khiếu nại/Góp ý', 'Tôi muốn góp ý về dịch vụ giao hàng. Đơn hàng của tôi giao trễ 2 ngày so với dự kiến.');
