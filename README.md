# MedChem ELN - Nhật Ký Nghiên Cứu Tổng Hợp Hóa Dược

> 🧪 **Hệ thống Nhật ký Điện tử (ELN - Electronic Lab Notebook)** chuyên biệt cho nghiên cứu sinh, dược sĩ và nhà khoa học trong lĩnh vực **Hóa Dược & Tổng Hợp Hữu Cơ**.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase Dual-Mode](https://img.shields.io/badge/Firebase-Dual--Mode-orange.svg)](https://firebase.google.com/)

---

## 🌟 TÍNH NĂNG VƯỢT TRỘI CHUẨN PHARMACY LAB

### 1. Module Cân Đong & Nạp Liệu (Stoichiometry Table)
- Khai báo đa dạng hóa chất: **Chất đầu (Starting Material)**, **Thuốc thử (Reagent)**, **Xúc tác (Catalyst)**, **Dung môi (Solvent)**.
- Đánh dấu **Chất giới hạn (Limiting Reagent)** bằng một chạm.
- Tự động tính toán số mol thực tế:
  $$n = \frac{m_{\text{thực tế}} \times (\text{purity} / 100)}{M}$$
  (hoặc tự động tính qua thể tích chất lỏng $V$ và khối lượng riêng $d$).
- Tự động tính tỉ lệ đương lượng phản ứng ($eq$) chuẩn xác theo chất giới hạn:
  $$eq_i = \frac{n_i}{n_{\text{limiting}}}$$
- Nút thông minh **"Khối lượng lý thuyết (eq)"** tự động tính lượng cần cân cho tất cả thuốc thử dựa vào số mol chất giới hạn.

### 2. Quản Lý Thời Gian Phản Ứng Ngắt Quãng (Reaction Session Timer)
- Giải quyết bài toán thực tế tại phòng thí nghiệm: phản ứng chạy chiều 4h $\rightarrow$ tạm dừng bảo quản tủ mát 4°C qua đêm $\rightarrow$ sáng hôm sau khuấy tiếp 4h $\rightarrow$ tổng cộng 8h.
- 3 nút bấm kích thước lớn (Glove-Friendly) thao tác dễ dàng ngay cả khi đang mang găng tay cao su tại tủ hút:
  - **Bắt đầu (Start)**
  - **Tạm dừng (Pause)** kèm ghi chú nguyên nhân ngắt quãng & điều kiện bảo quản
  - **Tiếp tục (Resume)**
- Bảng lịch sử các phiên khuấy tích lũy (Interval Logs) chuẩn hóa hồ sơ GLP / Dược điển.
- Theo dõi nhiệt độ phản ứng (°C) và tốc độ khuấy từ (rpm).

### 3. Theo Dõi Dòng Thời Gian Sắc Ký Mỏng (TLC Timeline Monitor)
- Hỗ trợ **mở trực tiếp Camera điện thoại** (`capture="environment"`) để chụp bản mỏng hoặc tải ảnh từ máy tính.
- Đồng bộ tự động phút thứ X của phản ứng từ đồng hồ khuấy.
- Ghi nhận hệ dung môi giải ly (Eluent), tác nhân hiện màu (UV 254nm, UV 365nm, Vanillin/H2SO4, KMnO4, Ninhydrin, H2SO4 cồn 10%...).
- Bảng tính hệ số $R_f$ cho từng vết (Chất đầu, Sản phẩm chính, Tạp chất).
- Thư viện ảnh dạng Timeline Gallery kèm chế độ phóng to Lightbox sắc nét.

### 4. Xử Lý Thô & Cô Quay Chân Không (Workup & Rotavapor)
- Ghi chú tác nhân dập phản ứng (Quenching), dung môi chiết (Extraction), rửa pha hữu cơ (Brine wash), chất làm khô ($Na_2SO_4$ khan, $MgSO_4$ khan).
- Thông số máy cô quay chân không: Nhiệt độ bồn nước (°C), Áp suất chân không (mbar), Cảm quan cắn sau cô quay, Khối lượng cắn thô (g).
- Nút nạp nhanh các quy trình xử lý thô kinh điển (EtOAc/Brine, DCM/NH4Cl, Lọc Buchner).

### 5. Sắc Ký Cột & Phân Đoạn Eppendorf (Column Chromatography & Yield)
- **Batch input số phân đoạn (F1 - FN)**: Nhập số nguyên N (ví dụ 30) $\rightarrow$ Tự động render lưới Grid 30 ống nghiệm.
- Click tương tác trực tiếp lên từng ống nghiệm để đánh dấu: Trống, Sản phẩm chính (Xanh lá), Tạp chất (Cam), Hỗn hợp vết trộn (Tím).
- **Gom nhóm phân đoạn (Fraction Pooling)**: Chọn khoảng ống nghiệm (ví dụ F8 - F15) và gộp thành nhóm sản phẩm chính.
- Tải ảnh bản mỏng TLC kiểm tra các phân đoạn cạnh nhau.
- **Cân phân tích 4 số lẻ trên ống Eppendorf**:
  - Nhập $m_{\text{vỏ}}$ (g) và $m_{\text{vỏ + cắn}}$ (g).
  - Tự động tính: $m_{\text{sản phẩm}} = m_{\text{vỏ+cắn}} - m_{\text{vỏ}}$ (chính xác đến 0.0001 g).
  - Tự động tính % Hiệu suất phản ứng theo số mol chất giới hạn:
    $$\% \text{Hiệu suất} = \frac{m_{\text{sản phẩm}}}{n_{\text{limiting}} \times M_{\text{product}}} \times 100\%$$
  - Ghi nhận độ tinh khiết HPLC (%) và điểm nóng chảy ($T_{nc}$).

---

## ⚡ KIẾN TRÚC LƯU TRỮ KÉP (DUAL-MODE ARCHITECTURE)

Hệ thống được thiết kế theo cơ chế **Zero-Config Dual-Mode**:
1. **Offline / LocalStorage Mode (Mặc định)**:
   - Nếu bạn chưa cấu hình Firebase, ứng dụng sẽ **tự động hoạt động 100% trên LocalStorage**.
   - Dữ liệu lưu an toàn trong trình duyệt của bạn, ảnh TLC được nén tối ưu dưới dạng Base64, không bị lỗi kết nối hay rớt mạng tại phòng lab.
   - Hỗ trợ nút **Xuất JSON (Backup)** và **Nhập JSON (Restore)** để chuyển dữ liệu sang thiết bị khác nhanh chóng.
2. **Firebase Cloud Mode (Tùy chọn)**:
   - Khi điền thông tin vào file `.env`, ứng dụng sẽ tự động kích hoạt đồng bộ đám mây qua **Firebase Realtime Database** và lưu trữ ảnh gốc độ phân giải cao lên **Firebase Storage**.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy ứng dụng tại môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập trình duyệt tại: `http://localhost:5173`

### 3. Build kiểm tra bản phát hành (Production Build)
```bash
npm run build
```

---

## ⚙️ CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)

Khi muốn kích hoạt tính năng đồng bộ đám mây Firebase, sao chép file `.env.example` thành `.env` và điền thông tin dự án:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🌐 HƯỚNG DẪN TRIỂN KHAI LÊN NETLIFY (DEPLOY READY)

Dự án đã được tích hợp sẵn file `netlify.toml` xử lý chuyển hướng Single Page Application (SPA redirect `/* -> /index.html 200`).

1. Đẩy code lên GitHub (theo hướng dẫn bên dưới).
2. Đăng nhập [Netlify](https://app.netlify.com) $\rightarrow$ chọn **"Add new site"** $\rightarrow$ **"Import an existing project"**.
3. Chọn repo `tonghophoaduoc`.
4. Netlify sẽ tự động nhận diện:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. *(Tùy chọn)* Thêm các biến môi trường `VITE_FIREBASE_*` trong mục **Site configuration > Environment variables**.
6. Nhấn **Deploy** và trang web sẽ hoạt động ngay lập tức!

---

## 📤 LỆNH GIT KHỞI TẠO VÀ PUSH LÊN GITHUB

Để khởi tạo Git và push toàn bộ mã nguồn lên repository chính:

```bash
git init
git add .
git commit -m "feat: complete medchem synthesis lab ELN"
git branch -M main
git remote add origin https://github.com/namblue1412/tonghophoaduoc.git
git push -u origin main
```

---

## 📄 BẢN QUYỀN & GIẤY PHÉP
Phát triển phục vụ nghiên cứu khoa học Dược học, Tổng hợp Hóa dược và Hóa học Hữu cơ. Giấy phép MIT.
