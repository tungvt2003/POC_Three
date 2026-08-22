# Kết luận POC — Room Designer

Chốt ngày **2026-08-22**. Đọc kèm: `PLAN.md` (tiến độ chi tiết),
`TONG-QUAN.md` (hướng đưa vào web bán hàng), `ASSETS.md` (tài nguyên 3D).

---

## 1. POC hỏi gì, trả lời được gì

| Câu hỏi ban đầu | Trả lời |
|---|---|
| three.js + React dựng được công cụ thiết kế phòng chạy trong trình duyệt không? | **Được.** Toàn bộ luồng chạy end-to-end. |
| Sinh tường/cửa bằng code có khả thi không, hay phải dùng CSG? | **Khả thi, không cần CSG.** Chẻ tường thành mảnh quanh lỗ, kiểm chứng bằng bảo toàn diện tích. |
| Hình phòng phức tạp (L, T, U, vát góc) có làm được không? | **Được, 6 hình.** Nhưng phải bỏ mô hình `rộng × sâu`, chuyển sang đa giác. |
| Ngân sách 50k tam giác / 1024² texture / 5MB có thực tế không? | **Tam giác và texture: thoải mái. 5MB: SÁT TRẦN ngay từ 7 món.** |
| Máy người dùng chạy nổi không? | **CHƯA TRẢ LỜI ĐƯỢC.** Xem mục 5. |

---

## 2. Đã dựng được gì

Wizard 4 bước, rồi vào chế độ thiết kế tự do:

1. **Chọn hình** — 6 mặt bằng, thumbnail sinh từ chính định nghĩa hình
2. **Chỉnh kích thước** — kéo từng bức tường trên ảnh 3D nhìn từ trên xuống,
   nhãn đo từng cạnh, đổi feet/cm
3. **Cửa & cửa sổ** — 6 kiểu cửa + 3 kiểu cửa sổ, bấm lên mặt trong tường để
   đặt, có bóng mờ báo trước, sửa kích thước từng cái
4. **Màu & sàn**

Chế độ thiết kế: thêm nội thất, kéo thả, hút tường, xoay, xoá, undo/redo,
3 góc nhìn đặt sẵn, đường đo khoảng hở, bảng đo hiệu năng, xuất JSON.

**Quy mô:** 52 file TypeScript, 4.980 dòng, **9 bộ self-check** chạy tự động
mỗi lần mở app ở chế độ DEV.

---

## 3. Số đo chốt

Kịch bản nặng nhất dựng được: hình U (8 tường) + 1 cửa + 2 cửa sổ + 8 món
nội thất model thật.

| | Ngân sách | Đo được | |
|---|---|---|---|
| Tam giác vẽ mỗi khung | — | 86.109 | ✅ còn nhiều chỗ trống |
| Draw calls | — | 52 | ✅ ngưỡng lo ~150 |
| Tam giác mỗi model (cao nhất) | ≤ 50.000 | 19.992 | ✅ |
| Texture | 1024² | 1024² | ✅ |
| **Tổng tải model (7 món)** | **≤ 5 MB** | **4,87 MB** | ⚠️ |
| **JS bundle** | — | **371 KB gzip** | ⚠️ |
| Xuất JSON, phòng đầy đồ | — | 4,4 KB | ✅ |
| FPS | ≥ 60 | *chưa đo được thật* | ⚠️ |

---

## 4. Sáu điều học được

### 4.1 Mô hình dữ liệu sai thì mọi thứ phía sau sai theo

Bản đầu tôi mô tả phòng bằng `rộng × sâu` rồi vẽ hình quanh gốc toạ độ. Đổi
`rộng` là **hai tường trái phải cùng chạy** — cảm giác như đang thu nhỏ cả căn
nhà chứ không phải kéo một bức tường.

Phải viết lại thành **lưới đường thẳng**: mỗi tường là một đường có toạ độ
riêng. Sửa muộn thì phải viết lại cả kéo thả, hút tường và đường đo.

**Bài học:** chốt mô hình dữ liệu bằng cách thử thao tác thật, không phải bằng
cách nhìn ảnh tĩnh.

### 4.2 Hàm thuần là thứ cứu được dự án

Mọi phép tính hình học nằm trong hàm không biết three.js, React hay chuột.
Nhờ vậy 9 bộ self-check chạy bằng số, không cần dựng cảnh.

Ví dụ cụ thể: hút sofa sâu 658mm vào tường ở `x = -2000` **phải** cho tâm ở
`x = -1671`. Kiểm được con số này quan trọng hơn nhiều so với "nhìn có vẻ đúng".

### 4.3 Hai phép tính hình học nối nhau thì phép sau phải chịu sai số phép trước

Kéo đồ ra ngoài phòng → hàm hút về biên trả về điểm nằm **đúng** trên đường
tường, nhưng phép chiếu để lại sai số `-1e-10`. Hàm hút tường loại mọi khoảng
cách âm → đồ **đứng chết trên đường tường** thay vì hút vào trong.

Chỉ lộ ra khi test bằng thao tác thật, không lộ khi test từng hàm riêng.

### 4.4 Số đo phải lấy từ nguồn thật, không đoán

Tôi đặt tên sản phẩm theo dự đoán. Đo xong mới biết:

- `WoodenTable_02` — tưởng bàn ăn, thật ra là **đôn cao 418mm**
- `WoodenChair_01` — tưởng ghế ăn, thật ra cao **2274mm**
- `WoodenTable_01` — tôi ghi đại `1211×1211`, đo thật là **1800×657×549**

Kéo thả, hút tường, đường đo đều lấy số này. Sai một chỗ là sai cả chuỗi. Nên
kích thước phải **đo tự động từ model lúc upload**, cấm nhập tay.

### 4.5 Công cụ đo cũng phải kiểm chứng

Bảng đo đầu tiên báo "1 draw call, 1 tam giác" cho cảnh có 8 tường và 8 món đồ.
Số đẹp mà vô nghĩa: `gl.info` tự reset sau mỗi lượt render, mà postprocessing
render nhiều lượt một khung — tôi chỉ đọc được lượt cuối, là cú vẽ một tam
giác phủ toàn màn hình.

**Bài học:** con số quá đẹp thì phải nghi ngờ trước khi mừng.

### 4.6 Nút thắt là băng thông, không phải hình học

Đây là kết quả bất ngờ nhất. Trước khi đo, tôi lo GPU không kham nổi. Thực tế:

- 86k tam giác/khung — GPU tích hợp đời nay xử lý vài triệu
- 52 draw calls — ngưỡng bắt đầu lo là ~150
- **nhưng 7 món đồ đã ngốn 4,87 MB / 5 MB**

Danh mục thương mại có hàng trăm món. Vấn đề không phải vẽ nổi hay không, mà
là **tải về nổi hay không**.

---

## 5. Điều KHÔNG chứng minh được

Nói thẳng để không ai hiểu nhầm là POC đã xanh đèn hết.

### 5.1 FPS trên máy thật — chưa đo

Bảng đo đọc ra 144 FPS, nhưng đo trong Chromium **headless**: máy ảo không có
GPU thật. Con số này **không đại diện** cho máy người dùng.

Phải mở bằng trình duyệt thật, trên ít nhất: một laptop tầm trung không card
rời, và một điện thoại Android tầm trung.

### 5.2 Mobile — chưa làm gì

`claude.md` loại mobile khỏi phạm vi POC. Nhưng web bán hàng thì phần lớn lưu
lượng đến từ điện thoại. Chưa có: cử chỉ chạm, bố cục dọc, ngân sách hiệu năng
cho máy yếu.

Đỡ ở chỗ toàn bộ mã đã dùng Pointer Events nên **không phải viết lại từ đầu**,
nhưng bố cục và cử chỉ vẫn là việc thật.

### 5.3 Quy mô danh mục — chưa thử

Mới 7 sản phẩm, tất cả tải sẵn. Chưa thử: tải theo yêu cầu, giải phóng model
không dùng, danh mục hàng trăm món, tìm kiếm/lọc.

### 5.4 Chất lượng model của khách — chưa biết

7 model hiện tại là CC0 từ Poly Haven, **đã được tối ưu sẵn**. Model từ hãng
nội thất thường 300k–800k tam giác, texture 4096². Chưa thử quy trình nhận và
xử lý model chưa tối ưu.

### 5.5 Còn nợ kỹ thuật

| | |
|---|---|
| Đồ chồng lên nhau | mới chặn ra ngoài phòng, chưa chặn đè nhau |
| Nhãn đường đo | đồ kê sát góc thì 2 nhãn chồng nhau |
| Đồ treo tường | `placement: 'wall'` đã khai báo, chưa dựng |
| Biến thể sản phẩm | chưa có trong mô hình dữ liệu |
| Kính `transmission` | dùng opacity thường cho nhẹ |
| Ranh giới module | `Room.tsx`/`Scene.tsx` đang đọc `uiStore`, phá quy tắc `designer/` không phụ thuộc `ui/` |

---

## 6. Quyết định nên giữ khi làm production

Đây là những chỗ đã trả giá để tìm ra, đừng làm lại từ đầu:

1. **State toàn milimet.** Đổi sang mét chỉ khi đưa vào three.js, format chỉ ở
   tầng hiển thị. Có hàm quét file xuất để bắt vi phạm.
2. **Phòng là đa giác, mỗi tường là một đường thẳng.**
3. **Chiều trong/ngoài quyết bằng diện tích có dấu**, không thử "hướng về tâm
   phòng" — phép thử đó sai với hình lõm.
4. **Góc tường cắt vát bằng offset đa giác**, đúng với mọi góc.
5. **Tách hàm thuần khỏi input**, kèm self-check bằng số.
6. **Hai store: `designStore` có undo, `uiStore` không.**
7. **Gom một thao tác thành một bước undo** (hàm live + `endEdit`).
8. **Cửa là con của group tường** — để mờ cùng nhau.
9. **Chuẩn hoá gốc toạ độ model về tâm đáy** bằng `Box3` lúc load.
10. **`dispose()` mọi geometry dựng tay.**

---

## 7. Việc phải làm ngay

Xếp theo thứ tự, việc trên chặn việc dưới:

### Tuần này

1. **Đo FPS trên máy thật** — laptop tầm trung + điện thoại Android tầm trung.
   Không có số này thì không cam kết được gì với khách.
2. **Chốt hợp đồng kỹ thuật với bên cung cấp 3D** — bảng 10 khoản ở
   `TONG-QUAN.md` mục 7. Đây là đường găng của cả dự án.
3. **Xin 2–3 model mẫu** từ bên đó, chạy thử qua đường ống kiểm tra trước khi
   họ làm cả danh mục.

### Trước khi viết thêm tính năng

4. **Đường ống tài nguyên**: kiểm tự động lúc upload (tam giác, texture, gốc
   toạ độ, tên node), nén Draco/KTX2, đo kích thước tự động.
5. **Tách gói** — 371 KB gzip không được nhét vào trang chủ.
6. **Tải theo yêu cầu** — chỉ tải model của món đã thêm vào phòng, giải phóng
   model không còn dùng.

### Rồi mới tới

7. Mobile (cử chỉ + bố cục) — ~8 ngày công, xem `TONG-QUAN.md` mục 9
8. Nối danh mục / giá / giỏ hàng
9. Lưu & chia sẻ thiết kế

---

## 8. Khuyến nghị

**POC thành công về mặt kỹ thuật.** Kiến trúc chịu được cả những thay đổi lớn
giữa chừng — đổi từ phòng chữ nhật sang đa giác, đổi từ khối tạm sang model
thật, đổi cách tương tác từ slider sang kéo trực tiếp. Mỗi lần đổi đều sửa
được trong một buổi vì phần tính toán tách rời phần hiển thị.

**Rủi ro nằm ngoài mã nguồn.** Hai thứ có thể làm hỏng dự án, cả hai đều không
phải chuyện lập trình:

- **Tài nguyên 3D.** Không có model đúng chuẩn thì không đo được, không bán
  được. Chốt hợp đồng trước, xin mẫu thử ngay.
- **Băng thông.** 4,87 MB cho 7 món. Không giải quyết được chuyện này thì
  người dùng mạng yếu sẽ bỏ đi trước khi phòng hiện ra.

**Đề nghị:** đừng viết thêm tính năng cho tới khi có (1) số FPS thật và
(2) model mẫu của khách chạy qua được đường ống kiểm tra. Hai việc đó quyết
định phạm vi của mọi thứ còn lại.
