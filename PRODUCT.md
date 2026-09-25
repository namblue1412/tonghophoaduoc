# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Người dùng chính**: Sinh viên, học viên cao học, nghiên cứu viên và giảng viên tại các phòng thí nghiệm Hóa Dược và Tổng hợp Hữu cơ (Medicinal Chemistry / Organic Synthesis Labs).
- **Ngữ cảnh sử dụng**: Thao tác thực nghiệm trực tiếp tại bàn thí nghiệm (lab bench) hoặc tủ hút khí độc (fume hood). Người dùng thường xuyên thao tác trên điện thoại thông minh (smartphone) với một tay đang đeo găng tay cao su nitrile, cần thao tác nhanh, chuẩn xác, không bị phân tâm bởi các yếu tố thừa.

## Product Purpose

- Cung cấp một **Nhật Ký Nghiên Cứu Điện Tử (ELN - Electronic Lab Notebook)** chuyên sâu, chuẩn hóa và tối ưu cho quy trình tổng hợp hóa dược thực tế.
- Số hóa toàn diện chu trình phản ứng hóa dược: Khảo sát chất đầu & thuốc thử (Stoichiometry) $\rightarrow$ Khuấy phản ứng & Bấm giờ (Reaction Timer) $\rightarrow$ Theo dõi bản mỏng sắc ký TLC qua 3 kênh ảnh (UV 254nm, UV 365nm, Thuốc thử hiện màu) $\rightarrow$ Xử lý thô & Cô quay trừ bì Eppendorf (Workup) $\rightarrow$ Sắc ký cột phân đoạn & Đồng bộ giá ống nghiệm (Column Chromatography) $\rightarrow$ Cân sản phẩm tinh khiết & Tính hiệu suất (Yield).
- Bảo đảm tính toàn vẹn và an toàn của dữ liệu nghiên cứu khoa học qua cơ chế lưu kép Dual-Mode: Đồng bộ Firebase Cloud Realtime Database khi trực tuyến và tự động chuyển sang LocalStorage khi làm việc ngoại tuyến hoặc mất kết nối mạng.

## Positioning

- Khác biệt hoàn toàn với các công cụ ghi chú hoặc quản lý công việc dạng SaaS phổ thông (như Notion, Trello, Jira) - vốn thiếu các phép tính tỷ lệ mol, đương lượng, cân trừ bì eppendorf và so sánh Rf bản sắc ký.
- Khác biệt với các hệ thống ELN công nghiệp đắt đỏ và cồng kềnh - MedChem ELN gọn nhẹ, tải nhanh trong 1 giây, ưu tiên giao diện di động (mobile-first), trực quan hóa quy trình bằng hình ảnh thực tế (3 phổ ảnh TLC, bảng giá ống nghiệm phân đoạn có mã màu SPC/SPP).

## Operating Context

- **Môi trường thực tế**: Phòng thí nghiệm hóa dược với đèn huỳnh quang, dung môi hữu cơ bay hơi, tiếng máy khuấy từ và bơm chân không. Màn hình cần độ tương phản cao, phông chữ hiển thị số đo rõ ràng, kích thước vùng chạm (touch target) tối thiểu 44px.
- **Quy trình làm việc**:
  1. Cân đong hóa chất và nhập khối lượng thực tế $\rightarrow$ Hệ thống tự quy đổi số mol ($n = m/M$) và đương lượng ($eq$).
  2. Bắt đầu phản ứng $\rightarrow$ Bấm giờ theo dõi, ghi nhận các mốc nhiệt độ và hiện tượng phản ứng.
  3. Chấm TLC theo dõi phản ứng $\rightarrow$ Chụp ảnh UV 254nm (soi hấp thu tử ngoại), UV 365nm (huỳnh quang) và nhúng thuốc thử hiện màu (Vanillin, $\text{H}_2\text{SO}_4$, Ninhydrin, $\text{KMnO}_4$), đo khoảng cách di chuyển để tính giá trị $R_f$.
  4. Quench và chiết xuất $\rightarrow$ Làm khô dung môi, cô quay thu cắn thô vào 1 hoặc nhiều ống Eppendorf, cân trừ bì xác định khối lượng cắn nạp cột.
  5. Sắc ký cột silica gel $\rightarrow$ Hứng các phân đoạn (F1, F2,...), chấm TLC phân đoạn, gộp các ống cùng chất thành mẫu gộp (SPC - Sản phẩm chính hoặc SPP - Sản phẩm phụ), hệ thống tự động đồng bộ màu sắc và nhãn lên giá ống nghiệm.
  6. Cô quay mẫu gộp tinh khiết $\rightarrow$ Cân trừ bì Eppendorf thu sản phẩm tinh chế, tự động tính hiệu suất phản ứng theo chất giới hạn (Limiting Reagent).

## Capabilities and Constraints

- **Năng lực tính toán hóa học**:
  - Hỗ trợ đổi đơn vị linh hoạt giữa $g$ / $mol$ và $mg$ / $mmol$.
  - Tự động nhận diện chất giới hạn (Limiting Reagent) để tính toán đương lượng ($eq$) của các chất phản ứng khác và làm căn cứ tính hiệu suất lý thuyết ($Theo.\,Yield$).
  - Nhập số thập phân mượt mà trên bàn phím di động (hỗ trợ cả dấu `.` và dấu `,`).
- **Năng lực trực quan hóa**:
  - So sánh trực tiếp 3 chế độ ảnh của 1 bản sắc ký (UV 254nm, UV 365nm, Thuốc thử hiện màu).
  - Bảng giá ống nghiệm thông minh: Đồng bộ màu sắc nhóm gộp mẫu (`spc` / `spp`), hiển thị trực quan tỷ lệ phân đoạn mà không cần thao tác bấm rườm rà trên giá ống.
- **Ràng buộc kĩ thuật**:
  - Zero-data loss: Phải hoạt động bền bỉ kể cả khi ngắt kết nối mạng hoặc không có API key Firebase.
  - Tính năng In phiếu nhật ký (Laboratory Notebook Printout) chuẩn định dạng tài liệu khoa học lưu trữ hồ sơ thí nghiệm.
  - Sao lưu và phục hồi độc lập qua định dạng JSON.

## Brand Commitments

- **Tên ứng dụng**: MedChem ELN - Nhật Ký Nghiên Cứu Tổng Hợp Hóa Dược.
- **Ngôn ngữ & Giọng văn**: Thuần Việt chuẩn mực trong ngành Dược học/Hóa dược (không dùng các câu chữ AI khoa trương như "trí tuệ nhân tạo đột phá", "chuẩn hóa tự động hoá thông minh", giữ đúng thuật ngữ chuyên môn: *chất đầu, thuốc thử, xúc tác, chất giới hạn, cắn thô, trừ bì, phân đoạn, sản phẩm chính, sản phẩm phụ, hiệu suất*).
- **Màu sắc nhận diện**: Xanh chàm đậm chuyên nghiệp (`#1e1b4b` / `#312e81`), xanh lục bảo dược học (`#059669` / `#10b981`), cam hổ phách cảnh báo/tạp (`#d97706` / `#f59e0b`).

## Evidence on Hand

- Dữ liệu cấu trúc hóa học phân tử, SMILES, công thức phân tử và khối lượng phân tử (MW).
- Tệp ảnh thực tế sắc ký lớp mỏng TLC dưới các bước sóng UV 254nm, UV 365nm và thuốc thử hiện màu.
- Bảng giá trị $R_f$ thực nghiệm và số đo khối lượng cân phân tích 4 số lẻ.

## Product Principles

1. **Dữ liệu khoa học là cốt lõi**: Mọi số liệu hóa học, số mol, khối lượng, $R_f$, hiệu suất phản ứng phải tuyệt đối chuẩn xác, dùng phông chữ `font-mono tabular-nums` để các con số luôn thẳng hàng và dễ dò xét.
2. **Thiết kế cho môi trường phòng lab thực tế**: Giao diện tập trung vào việc hoàn thành tác vụ (Operate Mode). Vùng chạm (touch target) tối thiểu 44px, độ tương phản cao, thao tác 1 chạm rõ ràng, không làm gián đoạn khi đang thao tác thí nghiệm.
3. **Từ chối khuôn mẫu SaaS chung chung (No Generic SaaS Slop)**: Tránh lạm dụng các thẻ bo tròn giống hệt nhau chứa icon + tiêu đề trang trí; không dùng hiệu ứng gradient hay kính mờ chỉ để làm đẹp; mỗi thành phần trên màn hình đều mang một công năng thực nghiệm cụ thể.
4. **Trực quan hóa quy trình thực nghiệm**: Thay vì các bảng số khô khan, mô phỏng trực quan các thực thể phòng lab: Bản sắc ký TLC 3 kênh ảnh so sánh thực tế, Giá ống nghiệm phân đoạn sắc ký đồng bộ màu sắc.
