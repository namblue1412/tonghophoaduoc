# Bản demo MedChem ELN để kiểm tra trước

Nhánh: `codex/demo-medchem-qa`. Bắt đầu từ commit main `a433cc4868b43c3fde8f4a8d1ed29bc2b609ef35`.

## Chạy và cách ly dữ liệu

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Mở `http://127.0.0.1:5173`, đăng nhập bằng `researcher.a@demo.invalid` hoặc `researcher.b@demo.invalid`, mật khẩu chung `DemoLab123!`; hoặc chọn **Đăng Ký** để tạo tài khoản cục bộ riêng. Không nhập tài khoản/mật khẩu Firebase thật. Trong menu ứng dụng, nhập `fixtures/demo-experiments.json` để có mẫu số học với dữ liệu kỳ vọng rõ ràng. Các hóa chất giả định trong mẫu chỉ dùng kiểm tra phần mềm.

- Plugin `medchem-demo-isolation` trong `vite.config.js` thay mọi import `services/firebase` bằng `demoBackend.js`, ở cả dev, build và preview, kể cả máy có `.env.production` thật.
- Adapter không import SDK Firebase, không có endpoint và không gửi yêu cầu mạng. Database riêng `medchem-demo-v2` gồm records, drafts, purged; ảnh và phổ nhúng trong bản ghi cục bộ. Tài khoản thử dùng kho `medchem-demo-auth-v1`, mật khẩu băm PBKDF2 với salt và phiên có thời hạn, thu hồi khi thoát. Xác thực cục bộ không thay xác thực server trên máy chia sẻ.
- CSP chỉ cho kết nối cùng origin và WebSocket localhost phục vụ Vite; ảnh chỉ được tải cùng origin/data/blob. Không tự tải ảnh Storage từ file JSON thật. Có các liên kết tham chiếu PubChem/Biotage/SDS: chỉ mở khi người dùng bấm.
- `src/services/firebase.js`, Database Rules và Storage Rules production được giữ nguyên; không deploy hay sửa dữ liệu Firebase. Các vấn đề rules của production chưa được sửa trên dịch vụ thật. Trước khi đưa các thay đổi này lên production cần adapter theo UID, giao dịch/revision, rules tương ứng, migration và kiểm thử Firebase Emulator riêng.
- Nhánh này đã push lên GitHub `demo`, chưa deploy website. IndexedDB tồn tại trên cùng trình duyệt/origin; xóa dữ liệu trình duyệt sẽ xóa demo. Xuất JSON trước khi đổi môi trường. Không có service worker, vì vậy tắt mạng thật rồi tải lại trang chưa cache có thể không tải được ứng dụng; nút giả lập mất mạng và chế độ tối đã được bỏ theo yêu cầu ngày 05/10/2026; kiểm thử hàng đợi vẫn có trong bộ test tự động.

## Những lỗi đã xử lý và nguyên nhân

| Vùng thay đổi | Nguyên nhân cũ | Hành vi demo |
|---|---|---|
| `src/domain/chemistry.js`, `StoichiometryTable.jsx` | Đơn vị và phép tính phân tán, purity 0 bị thay bằng 100, làm tròn quá sớm | Tính trên g/mL/mol, chuyển đơn vị rõ ràng; giữ precision; nguồn lượng nạp mass/volume/solution rõ; cảnh báo dữ liệu không hợp lệ |
| Dung dịch acid/base | Bỏ qua mol của medium; đổi đơn vị chỉ đổi nhãn; C% không có cơ sở | Tính M, % w/w, % w/v, N với z; quy đổi giữ nguyên mol; thiếu MW/d/z/cơ sở % báo lỗi |
| `src/domain/experiment.js`, Workup/Column | Kết quả phụ thuộc component đang mount, lưu giá trị dẫn xuất cũ, MW 0 có thể lấy lại MW cũ | Tính lại mol, Eq, lý thuyết và yield mỗi lần cập nhật; cân trừ bì kiểm tra gross≥tare; tổng cắn thô có chế độ thủ công rõ |
| Hiệu suất | Nhầm HPLC area% với độ tinh khiết khối lượng | Yield phân lập và assay-corrected yield riêng; SPC/SPP riêng; ν của chất giới hạn và sản phẩm được tính; >100% có cảnh báo |
| `ReactionTimer.jsx` | Dùng max của tổng cũ, suy đoán lại thời lượng 0/1 giây | Tổng là tổng phiên; 0/1 giây hiệu chỉnh là giá trị thật; chạy qua sleep bằng timestamp; manual/corrected có ghi chú và dấu thời gian |
| TLC phản ứng/phân đoạn/gộp | Rf cũ còn khi khoảng cách về 0; giờ legacy bị thay bằng giờ mới; phiên upload cũ tác động modal mới | Rf có điều kiện 0≤d≤front, front>0; giữ timestamp gốc/không biết; session guard; lỗi ảnh không báo thành công; updatedAt riêng |
| Tải ảnh | Nhiều thẻ download liên tiếp và mất user activation | Một ZIP đồng bộ từ ảnh cục bộ, kèm metadata; một thao tác tải |
| Ống và nhóm gộp | Renumber ống vật lý, gộp chồng, giảm count làm mất tham chiếu | Bỏ ống giữ số; gộp trùng bị chặn; count không được cắt lịch sử; đồng bộ ownership |
| `ExperimentContext.jsx`, `demoBackend.js` | Fallback owner theo tên/email, Set pending, full-object stale write, lỗi save bị bỏ qua | UID chính xác; pending counter; patch field có base; kiểm tra xung đột; draft bền trước acknowledgement; trạng thái lỗi rõ |
| Thùng rác | Ghi cũ làm hồi sinh; purge không có tombstone | Trash ưu tiên khi đọc; edit vào trash bị từ chối; purge transaction với tombstone; ghi cũ không xuất hiện lại |
| Ảnh và duplicate | Chia sẻ URL Storage gây orphan/xóa ảnh dùng chung | File nằm trong bản ghi demo; duplicate là lần chạy mới, xóa kết quả/timer/TLC cũ; giữ điều kiện làm mẫu |
| JSON | Chấp nhận cấu trúc/numeric/ID/nhóm sai; ghi đè ID cũ | Validate trước nhập; ID mới + sourceId; nhập transaction all-or-none; URL ảnh ngoài được tách thành sourceRemoteAssets để đối chiếu (không tải ảnh); từ chối prototype keys |
| Giao diện/in | Tràn navbar mobile, nút nhỏ, trang in còn bố cục nền | Safe area/dvh, nút mobile ≥48px; phòng tối; report portal độc lập focus view; A4 tóm tắt hoặc hồ sơ đầy đủ |

Không có cơ chế khóa đa người dùng thật hoặc chứng nhận GLP: audit trail demo chỉ ghi actor, action, fields và thời gian, có thể bị sửa bởi người có quyền trên máy.

## Năm nhóm tính năng chuyên môn

1. **Cấu trúc và tỷ lượng:** RDKit/WASM chạy cục bộ, SMILES→2D, MW trung bình, exact mass, xuất MOL/SVG; áp MW vào sản phẩm; hệ số ν, chọn giới hạn theo n/ν; assay theo khối lượng. Exact mass của cấu trúc không tự động là m/z của ion HRMS: khai báo adduct trong hồ sơ phân tích.
2. **Dung dịch:** chuyển M↔C%↔N, phân biệt w/w và w/v, mol/Eq/mol%, nạp vào bảng; pha loãng theo C₁V₁=C₂V₂ với thể tích cuối. Không suy đoán z hoặc tỷ trọng của dung dịch.
3. **Định danh sản phẩm:** hồ sơ NMR, HRMS, LC-MS, HPLC, điểm nóng chảy, mã mẫu/phương pháp, expected/found, dung môi, thiết bị; tối đa 5 tệp/hồ sơ, mỗi tệp 10MB, tải lại được cục bộ. Đây là lưu hồ sơ, chưa diễn giải phổ tự động.
4. **Thiết kế cột:** thể tích lớp nhồi πD²L/4, hold-up V₀=εVbed, quy ước 1CV=V₀, CV≈1/Rf, ΔCV và dự kiến số ống. Là ước lượng đẳng dung; ΔCV không phải resolution Rₛ, không dự đoán chính xác gradient.
5. **GHS/SDS:** định danh CAS/tên chính xác trong thư viện 8 hóa chất, biểu tượng nhúng cục bộ, nguồn PubChem, ghi nồng độ/dạng, nhà cung cấp và URL SDS. Thư viện tham khảo không thay phân loại của SDS đúng nhà cung cấp/nồng độ/lô.

Nguồn đối chiếu: [RDKit JS](https://www.rdkitjs.com/), [PubChem GHS](https://pubchem.ncbi.nlm.nih.gov/ghs/ghs_10.html), [UNECE pictograms](https://unece.org/transport/dangerous-goods/ghs-pictograms), [Biotage CV≈1/Rf](https://www.biotage.com/blog/how-do-i-choose-the-right-column-size-for-purification-by-flash-chromatography). Biểu tượng từ `https://pubchem.ncbi.nlm.nih.gov/images/ghs/`; script tải là công cụ bảo trì, không chạy trong app.

## Kịch bản kiểm tra thủ công

Nhập fixture trước. Mẫu mặc định có A=10mmol, B=20mmol, C=5mmol; tham chiếu A; MW sản phẩm=200; sản phẩm 1,6g; HPLC 95 area%; assay 90 w/w%; một phiên 7200 giây và TLC cũ.

| Bước thực hiện | Dữ liệu | Kết quả kỳ vọng | Dấu hiệu bug |
|---|---|---|---|
| Chọn giới hạn A→B→C→A | Ba dòng fixture | Eq lần lượt [1,2,0.5], [0.5,1,0.25], [2,4,1], trở lại ban đầu | Cột không đổi, nhiều limiting hoặc Infinity |
| Bấm đổi g/mol↔mg/mmol 20 lần | Fixture | Lượng vật lý và yield không đổi; A=1500mg/10mmol | Sai 1000 lần hoặc số trôi dần |
| Nhập mass 0, purity 0, rồi xóa limiting | Fixture | Không NaN/Infinity; purity 0→mol 0; chọn tham chiếu còn lại | Mol từ volume cũ hồi sinh |
| Nhập mass dạng sai, volume không có d | `1.2.3`; `5mL,d=0` | Báo lỗi tính toán | Vẫn tính lượng như dữ liệu hợp lệ |
| Acid/base | NaOH 2M×5mL | 10mmol, Eq=1 với A | Mol/Eq=0 |
| C%→M→N→C%, w/w→w/v | MW40,d1.05,z2 | Giữ mol của cùng dung dịch | Chỉ đổi nhãn, mol thay đổi |
| Assay và HPLC | Product1.6g; theo2g | Yield80%, corrected72%; HPLC95 không nhân vào yield | Yield76% hoặc dùng HPLC như assay |
| Cân gross<tare và sản phẩm quá cân | Tare2,gross1; rồi gross5 | Lỗi cân; >100% có cảnh báo khi cân hợp lệ | Âm bị che giấu hoặc không cảnh báo |
| Focus chỉ Cân đong, đổi MW/ν, rồi vào Cột | MW250 hoặc νSM2 | Yield thay đổi ngay trong state/report | Chỉ tính lại khi mở component Cột |
| Bật timer, chờ 2 phút, reload, dừng | Không đổi đồng hồ hệ thống | Một phiên bằng wall time; tổng đóng khớp lịch sử | Mất phiên, đếm từ 0 hoặc cộng hai lần |
| Qua đêm | Bật timer, đóng trình duyệt, sáng mở cùng origin | Cộng elapsed thực; trạng thái vẫn running trước khi dừng | Chỉ cộng lúc tab hoạt động |
| Sửa phiên fixture | 7200→1 giây→0 giây | Tổng tương ứng 1→0; không phục hồi 7200 | Tổng dùng max cũ hoặc giờ gốc thắng duration |
| Sửa TLC cũ chỉ nhận xét/thêm ảnh | Fixture timestamp 29/09 | Mốc ISO giữ nguyên; hiển thị timezone địa phương | Giờ thành thời điểm sửa |
| Rf | Front5,spot2; spot0; front0; spot6 | 0.4; 0; front0/spot6 bị chặn lưu | Rf cũ còn, >1 hoặc Infinity |
| TLC phân đoạn/gộp | Tạo→sửa ảnh→đổi nhận xét | Giữ timestamp, updatedAt tăng | Không lưu, ReferenceError hoặc giờ chụp đổi |
| Gộp chồng và bỏ ống | A:F4–F6; B:F6–F8; bỏF5 | B bị chặn; F5 bỏ giữ nhãn, không renumberF6 | Ống thuộc hai nhóm hoặc đổi số vật lý |
| Giảm tổng ống dưới ống có lịch sử | Đã gộp/chấm F8; giảm5 | Không cắt lịch sử | Nhóm giữ số ống không tồn tại |
| Mất mạng giả lập | Bật công tắc, sửa nhiều trường, chờ trạng thái draft, reload | Nội dung còn; tắt công tắc replay đúng một lần | Mất trắng, giá trị cũ đè hoặc audit lặp |
| Hai tab | Sửa title tab1 và labRoom tab2; rồi sửa cùng title | Khác field gộp được; cùng field stale báo xung đột, giữ draft | Ghi đè im lặng |
| Trash và purge | Trash ở tab1, tab2 sửa cũ; purge rồi tab2 thử ghi | Không hồi sinh; purge giả lập chỉ khi online | Thí nghiệm trở lại active |
| A/B | A tạo dữ liệu; chuyển B; chuyển A | B không thấy A; A còn dữ liệu | Dữ liệu người trước còn trong dashboard |
| JSON sai | Trùng ID, nhóm chồng, URL ảnh remote, prototype keys | Từ chối toàn bộ; không gọi Firebase | Import nửa vời, crash hoặc tải Storage thật |
| ZIP ảnh | Ba ảnh mỗi TLC; bấm tải trên iPhone thật | Một ZIP gồm ảnh và metadata | Chỉ ảnh đầu hoặc mất tên/mốc giờ |
| Vẽ cấu trúc | Aspirin `CC(=O)Oc1ccccc1C(=O)O` | 2D, MW180.159; áp/lưu/reload giữ cấu trúc | MW0, WASM lỗi, áp nhầm cấu trúc cũ |
| Print/PDF | In tóm tắt từ focus, rồi full report | A4, chỉ report, không nút; full có lịch sử/ảnh/analytics | Trang nền trắng, thiếu data vì focus |
| Mobile và UV | 390px, landscape, bàn phím; lightbox/phòng tối | Không tràn viewport; X trong safe area; chữ rõ | Nút bị tai thỏ che, footer che input, ảnh chói |

## Kiểm chứng tự động và giới hạn

```sh
npm run check
git diff main -- src vite.config.js index.html
```

**Kết quả cuối: build thành công, 81/81 kiểm thử đạt.** `check` build trước khi test, vì có test đọc bundle kiểm tra không chứa endpoint/SDK Firebase. Test dùng `fake-indexeddb`, không dùng Firebase Emulator hay dữ liệu thật. Các phép kiểm tra gồm công thức, precision, zero/negative cases, derivation khi focus, patch merge, conflict, durability, idempotent replay, trash/purge transaction và cách ly tài khoản.

Đã thử UI trên trình duyệt desktop và viewport 390px: tạo, RDKit, áp MW, dung dịch, thiết kế cột, GHS, lưu NMR, reload offline draft, đổi A/B, TLC phản ứng và phân đoạn với giờ cũ, sửa nhận xét giữ mốc gốc. Chưa xác nhận Safari/iOS/Android trên thiết bị thật, không chạy phản ứng qua đêm thật trong lượt kiểm tra này. Timer phụ thuộc wall clock của máy; thay đổi đồng hồ hệ thống khi chạy có thể làm thời lượng sai, cần kiểm tra/correct phiên. Không ép mọi hồ sơ dài vào đúng một trang A4: bản tóm tắt ngắn phù hợp một trang, bản dài phân trang để đọc và giữ dữ liệu.


## Cập nhật 05/10/2026: nhập JSON thật và xử lý xung đột

1. Trên web main đang dùng, đăng nhập như bình thường, chọn menu **Xuất JSON**. Tệp xuất là danh sách các thí nghiệm đang hiển thị của tài khoản đó (không gồm thùng rác).
2. Mở demo, đăng nhập tài khoản thử A, chọn menu **Khôi phục** trên điện thoại hoặc **Nhập JSON** trên desktop, chọn tệp vừa tải. Không nhập tài khoản/mật khẩu Firebase ở demo.
3. Bản nhập được tạo ID mới, giữ sourceId, sourceOwner, sourceUpdatedAt, giữ ngày TLC và tên nghiên cứu viên. Không sửa tệp nguồn. Ảnh nhúng tiếp tục hiển thị; ảnh liên kết ngoài chỉ giữ đường dẫn trong sourceRemoteAssets và hiển thị thông báo số ảnh chưa có. Demo không tải ảnh từ Firebase.
4. Kiểm tra xung đột bằng hai tab cùng tài khoản chỉnh cùng trường của một thí nghiệm mẫu. Nút giả lập A/B đã được bỏ khỏi giao diện.
5. **Lấy dữ liệu từ cloud** bỏ bản nháp của thí nghiệm đó và giữ bản kho demo. **Đồng bộ bản trên máy này lên** thay toàn bộ bản kho demo bằng bản trên máy; cần xác nhận sau khi xem hai bản. Có nút xuất JSON trước khi quyết định.
6. Nếu kho demo đổi khi hộp thoại đang mở, thao tác bị từ chối và hộp thoại nạp bản mới để chọn lại. Không thể ghi đè bản đã xóa/vào thùng rác hoặc bản của tài khoản khác. Quyết định ghi đè được ghi auditTrail.

**Giới hạn:** cloud ở đây là kho mô phỏng IndexedDB/BroadcastChannel, dùng chung giữa các tab trên cùng trình duyệt/origin. Hai điện thoại thật chưa đồng bộ với nhau. Firebase thật không có thay đổi. Việc triển khai cơ chế này lên production cần adapter Firebase transaction và kiểm tra rules riêng. Đã xác nhận luồng nhập bằng dữ liệu mẫu và tệp JSON người dùng cung cấp ngày 05/10/2026: 4 thí nghiệm được sao chép vào demo, 3 ống có cảnh báo cân.

### Sửa nhập số cân chưa hoàn tất

JSON xuất từ main được phép chứa ống chưa nhập đủ số cân hoặc cả bì nhỏ hơn bì. Demo giữ nguyên dữ liệu gốc, báo cảnh báo theo thí nghiệm/ống và không cộng ống lỗi vào khối lượng. Chuỗi số sai định dạng vẫn bị chặn với mã thí nghiệm và đường dẫn cụ thể. Đã kiểm tra tệp người dùng tại máy: 4 thí nghiệm, 3 ống có cảnh báo, không thay đổi tệp nguồn. Tệp thật không được đưa vào Git/GitHub.

### Giao diện sử dụng thường ngày và định dạng số

Đã bỏ khung vàng, nút thử A/B, trạng thái đồng bộ mô phỏng thường trực và nhãn DEMO trên tiêu đề/báo cáo. Dùng menu **Sao lưu/Khôi phục** trên điện thoại để xuất/nhập JSON. Khi thoát hoặc đổi tài khoản, màn hình đăng nhập/đăng ký xuất hiện; dùng tài khoản cục bộ. Cảnh báo lỗi lưu/xung đột chỉ hiện khi cần xử lý. Backend vẫn cách ly, Navbar ghi **Lưu trên máy**, chưa đồng bộ giữa hai điện thoại thật.

Các giá trị cân, mol, Eq, MW, nồng độ, Rf, hiệu suất và kết quả tính toán hiển thị đúng 5 chữ số thập phân với dấu phẩy. Ô nhập để trống vẫn trống; khi gõ giữ chuỗi đang nhập, khi rời ô mới định dạng hiển thị. Không làm tròn dữ liệu lưu để tránh sai số khi đổi đơn vị. Số ống, ID và thời gian đồng hồ HH:MM:SS không phải số đo thập phân.

Phản ứng/chất mới có độ sạch 100%, m thực/V/d/ghi chú trống; MW các chất chưa xác định không tự gán 150/120/98. Dữ liệu nhập cũ giữ nguyên. Trong dữ liệu cân của ảnh gửi, 0,9747−0,9185=0,05620 g; 0,9238−0,9199=0,00390 g; tổng 0,06010 g. Lý thuyết 0,04338 g và hiệu suất cắn thô 138,53858% theo dữ liệu hiện có.

Giá ống: chạm để chuyển **Trống → SPC → Tạp → Lẫn → Bỏ (đỏ) → Trống**. Bỏ giữ nhãn vật lý; nút **Xóa** riêng chỉ xóa ống thêm nhầm chưa có ghi chú, TLC hoặc nhóm gộp. Không đánh lại số các ống khác. Khi tăng số lượng sau khi xóa giữa dãy, thêm nhãn tiếp theo thay vì lấp lại số ống cũ.
