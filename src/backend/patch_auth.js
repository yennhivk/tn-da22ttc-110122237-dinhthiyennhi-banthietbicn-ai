const fs = require('fs');
const path = require('path');

const authJsPath = path.join(__dirname, 'routes', 'auth.js');
let content = fs.readFileSync(authJsPath, 'utf8');

// Patch 1: login query
content = content.replace(
    /SELECT ma_tai_khoan, ten_dang_nhap, mat_khau, email, vai_tro, trang_thai, hinh_anh FROM tai_khoan WHERE email = \?/,
    'SELECT ma_tai_khoan, ten_dang_nhap, mat_khau, email, vai_tro, trang_thai, hinh_anh, muc_dich_su_dung, phan_khuc_ngan_sach FROM tai_khoan WHERE email = ?'
);

// Patch 2: login response user object
content = content.replace(
    /vai_tro: user\.vai_tro,\s*hinh_anh: user\.hinh_anh \|\| null\s*\}/g,
    'vai_tro: user.vai_tro,\n                    hinh_anh: user.hinh_anh || null,\n                    muc_dich_su_dung: user.muc_dich_su_dung,\n                    phan_khuc_ngan_sach: user.phan_khuc_ngan_sach\n                }'
);

// Patch 3: /me query 1
content = content.replace(
    /SELECT tk\.ma_tai_khoan, tk\.ten_dang_nhap, tk\.email, tk\.vai_tro, tk\.trang_thai, tk\.hinh_anh,\s*kh\.ho_ten, kh\.so_dien_thoai, kh\.dia_chi, kh\.tinh_thanh, kh\.quan_huyen/g,
    'SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.email, tk.vai_tro, tk.trang_thai, tk.hinh_anh, tk.muc_dich_su_dung, tk.phan_khuc_ngan_sach,\n                        kh.ho_ten, kh.so_dien_thoai, kh.dia_chi, kh.tinh_thanh, kh.quan_huyen'
);

// Patch 4: /me query 2
content = content.replace(
    /SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, trang_thai, hinh_anh,\s*NULL AS ho_ten/g,
    'SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, trang_thai, hinh_anh, muc_dich_su_dung, phan_khuc_ngan_sach,\n                        NULL AS ho_ten'
);

// Patch 5: /me response user object
content = content.replace(
    /hinh_anh: user\.hinh_anh,\s*ho_ten: user\.ho_ten/g,
    'hinh_anh: user.hinh_anh,\n                muc_dich_su_dung: user.muc_dich_su_dung,\n                phan_khuc_ngan_sach: user.phan_khuc_ngan_sach,\n                ho_ten: user.ho_ten'
);

fs.writeFileSync(authJsPath, content, 'utf8');
console.log("Successfully patched auth.js");
