-- Migration: Thêm cột muc_dich_su_dung vào bảng san_pham
-- Ngày tạo: 2026-06-10
-- Mục đích: Gán nhãn "Mục đích sử dụng" cho từng sản phẩm để hỗ trợ
--           Cold-Start trong hệ thống gợi ý sản phẩm (Gaming, Học tập, Đồ họa...)

ALTER TABLE san_pham
ADD COLUMN muc_dich_su_dung VARCHAR(255) NULL
COMMENT 'Mục đích sử dụng chính của sản phẩm (Gaming, Học tập / Văn phòng, Đồ họa / Render...)';

CREATE INDEX idx_muc_dich_su_dung ON san_pham(muc_dich_su_dung);

SELECT 'Migration completed: san_pham.muc_dich_su_dung added' AS message;
