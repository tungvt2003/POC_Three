# Tổng quan kỹ thuật & hướng đưa vào web bán hàng

Tài liệu tóm tắt cho POC Room Designer, và phác hướng phát triển thành module
bán nội thất trên web thương mại điện tử.

Số liệu trong tài liệu này đo ngày **2026-08-22**, lấy từ chính bản build của
dự án. Chi tiết tiến độ xem `PLAN.md`, chi tiết tài nguyên 3D xem `ASSETS.md`.

---

## 1. POC này là gì

Công cụ thiết kế phòng 3D chạy thẳng trong trình duyệt, không cần cài gì:

1. Chọn hình phòng (6 kiểu: chữ nhật, L, T, U, vát 1 góc, vát 2 góc)
2. Kéo từng bức tường cho khớp số đo thật
3. Đặt cửa đi / cửa sổ lên tường
4. Chọn màu tường, vật liệu sàn
5. Thêm nội thất, kéo thả, hút tường, xoay

Mục tiêu ban đầu của POC là **kiểm chứng kỹ thuật và đo hiệu năng**, không
phải làm sản phẩm. Hiện đã chạy được toàn bộ luồng trên.

---

## 2. Công nghệ & ngôn ngữ

### Ngôn ngữ

| | |
|---|---|
| **TypeScript** | toàn bộ mã nguồn, chế độ `strict` |
| **GLSL** | không viết tay dòng nào — dùng material có sẵn của three.js |
| **HTML/CSS** | CSS thuần, không framework, không preprocessor |

Không dùng ngôn ngữ nào khác. Không có backend nên chưa có ngôn ngữ phía máy chủ.

### Thư viện

| Gói | Bản | Vai trò |
|---|---|---|
| `react` | 19.2 | giao diện |
| `three` | 0.185 | nhân đồ hoạ 3D (WebGL) |
| `@react-three/fiber` | 9.7 | viết cảnh 3D bằng cú pháp React |
| `@react-three/drei` | 10.7 | tiện ích sẵn: `OrbitControls`, `useGLTF` |
| `@react-three/postprocessing` | 3.0 | viền vàng khi chọn đồ |
| `zustand` | 5.0 | quản lý state |
| `immer` | 11.1 | sửa state kiểu bất biến |
| `vite` | 8.2 | công cụ build, máy chủ dev |

Node 20.20. Không dùng Next.js — POC không cần render phía máy chủ, mà HMR
của Vite nhanh hơn hẳn khi sửa cảnh 3D.

### Vì sao chọn bộ này

**three.js** là thư viện WebGL phổ biến nhất, tài liệu và ví dụ nhiều nhất.
Bản thân nó không phụ thuộc React.

**react-three-fiber** cho phép mô tả cảnh 3D bằng component thay vì tự quản lý
vòng đời object three.js. Đổi lại phải hiểu cả hai mô hình — chỗ nào React lo,
chỗ nào three.js lo. Đây là nguồn của phần lớn lỗi đã gặp trong POC.

**zustand** thay cho Redux vì ít mã soạn sẵn, và quan trọng hơn: chọn được
đúng mẩu state cần dùng nên component 3D không render lại thừa.

---

## 3. Cách làm — 8 nguyên tắc

Đây là phần đáng giá nhất của POC. Mấy nguyên tắc này rút ra từ lỗi thật, ghi
lại để bản production không dẫm lại.

### 3.1 Đơn vị: state luôn là MILIMET

Số nguyên milimet trong toàn bộ state. Chỉ đổi sang mét khi đưa vào three.js
(`1 unit = 1 mét`), chỉ format sang feet/cm ở tầng hiển thị.

Không bao giờ để chuỗi đã format (`7'6"`) lọt vào state. Đổi đơn vị hiển thị
không đụng tới một byte dữ liệu nào.

### 3.2 Phòng là ĐA GIÁC, không phải `rộng × sâu`

Mỗi bức tường là một **đường thẳng** có toạ độ riêng. Đỉnh đa giác là giao của
một đường x với một đường z. Kéo tường nào thì dời đúng đường đó, tường đối
diện đứng yên.

Bản đầu dùng `width`/`depth` rồi vẽ hình quanh gốc toạ độ — đổi `width` là hai
tường trái phải cùng chạy, cảm giác như đang thu nhỏ cả căn nhà. Phải viết lại.

### 3.3 Tách hàm thuần khỏi input

Mọi phép tính hình học nằm trong hàm không biết three.js, không biết React,
không biết chuột:

- `snapToWall(center, depth, walls)` — hút đồ vào tường
- `buildWalls(footprint)` — sinh tường từ đa giác
- `wallSlabs(wall, height)` — chẻ tường quanh lỗ cửa
- `dollhouseGoal(footprint, height, fov)` — tính chỗ đứng camera
- `pointInPolygon`, `offsetPolygon`, `closestPointOnPolygon`

Nhờ vậy **test được bằng số** mà không cần dựng cảnh. Hiện có 9 bộ self-check
chạy tự động mỗi lần mở app ở chế độ DEV, in kết quả ra console.

Ví dụ: hút sofa sâu 658mm vào tường ở `x = -2000` phải cho tâm ở đúng
`x = -1671`. Đây là con số kiểm được, không phải "nhìn thấy có vẻ đúng".

### 3.4 Chỉ dùng Pointer Events

Không dùng `onMouseDown`/`onMouseMove`. Pointer Events phủ cả chuột, cảm ứng
và bút — sang mobile không phải viết lại.

Kéo thả luôn `setPointerCapture` để kéo nhanh ra khỏi vật vẫn không tuột.

### 3.5 State chia hai tầng, undo chỉ động vào một

```
designStore   room · walls · items          <- CÓ undo/redo
uiStore       bước wizard · đơn vị · preset <- KHÔNG undo
```

Nhờ tách vậy, nhảy qua lại giữa các bước wizard không mất dữ liệu, và Ctrl+Z
không nhảy lùi giao diện.

### 3.6 Gom một thao tác thành một bước undo

Kéo tường hay kéo đồ bắn ra hàng chục sự kiện mỗi giây. Nếu mỗi sự kiện đẩy
một bước history thì Ctrl+Z một lần chỉ lùi được 1/60 giây.

Cách làm: hàm "live" (`moveItem`, `updateShapeParams`) sửa thẳng state; chỉ
`endEdit()` lúc nhả chuột mới chốt một bước. Đã đo: 20 lần `pointermove` +
1 lần nhả = đúng **1** bước undo.

### 3.7 Hình học sinh bằng code, không load từ file

Tường, sàn, cửa, cửa sổ, đèn trần — tất cả sinh từ tham số. Không dùng CSG
để đục lỗ tường; thay vào đó **chẻ tường thành các mảnh** quanh lỗ (cửa đi ra
3 mảnh, cửa sổ ra 4 mảnh), rồi gộp lại thành một geometry để giữ 1 draw call.

Kiểm chứng bằng số: tổng diện tích các mảnh = diện tích tường − diện tích lỗ,
khớp chính xác.

### 3.8 Dọn tài nguyên GPU

Mỗi `BufferGeometry` dựng tay đều `dispose()` lúc unmount. Kéo tường liên tục
mà quên là rò bộ nhớ GPU, kéo vài phút là thấy.

---

## 4. Cấu trúc mã nguồn

46 file TypeScript, khoảng 4.500 dòng.

```
src/
  lib/                    không biết gì về dự án
    units.ts              mm <-> m, format feet/cm
    polygon.ts            diện tích có dấu, offset, point-in-polygon
    id.ts

  designer/               toàn bộ 3D + dữ liệu, không import gì từ ui/
    types.ts              Room · Wall · Opening · Item
    store/designStore.ts  state + undo/redo
    catalog/
      shapes.ts           6 hình phòng
      openings.ts         6 kiểu cửa + 3 kiểu cửa sổ
      products.ts         danh mục nội thất
      floors.ts           vật liệu sàn
    controls/
      snapToWall.ts       hút tường (hàm thuần)
      useDragItem.ts      kéo thả bằng chuột
      cameraPresets.ts    tính chỗ đứng camera (hàm thuần)
    scene/                dựng hình
      buildWalls.ts       đa giác -> tường, cắt vát góc
      wallGeometry.ts     chẻ tường quanh lỗ cửa
      Wall · Floor · Opening · Item · CeilingLights ...

  ui/                     DOM đè lên canvas
    uiStore.ts
    wizard/               4 bước
    DesignPanel · PlanOverlay · FurniturePanel ...
```

Quy tắc: `designer/` không import gì từ `ui/`. Muốn tách phần 3D thành package
riêng thì cắt đúng một đường.

*(Hiện `Room.tsx` và `Scene.tsx` có đọc `uiStore` để biết đang ở bước nào —
chỗ này vi phạm quy tắc trên, cần truyền xuống bằng prop khi làm production.)*

### Luồng dữ liệu

```
Người dùng kéo tường
   -> updateShapeParams({ x0: -2400 })
   -> clampLine()  kẹp không cho xuyên tường kề
   -> buildFootprint()  sinh lại đa giác
   -> buildWalls()  sinh lại tường + pháp tuyến trong
   -> React render lại
   -> buildWallGeometry()  dựng hình học mới
   -> nhả chuột -> endEdit() -> chốt 1 bước undo
```

---

## 5. Số đo hiện tại

### Mã nguồn

| | Chưa nén | gzip |
|---|---|---|
| JavaScript | 1.304 KB | **362 KB** |
| CSS | 6,4 KB | 1,8 KB |

Gần như toàn bộ là three.js + drei. Đây là **một gói duy nhất** — sang
production bắt buộc phải tách gói (xem mục 6.5).

### Tài nguyên 3D

7 model nội thất CC0 từ Poly Haven, định dạng glTF, texture 1024².

| Ngân sách (chốt trong `claude.md`) | Thực tế | |
|---|---|---|
| ≤ 50.000 tam giác mỗi model | cao nhất 19.992 | ✅ |
| texture 1024² | 1024² | ✅ |
| ≤ 5 MB cho một phòng đầy đồ | **4,76 MB** | ⚠️ sát trần |

**Cảnh báo:** 7 model đã ăn gần hết ngân sách, mà chưa tính ảnh môi trường
(HDRI) và texture sàn thật. Một danh mục thương mại có hàng trăm món — không
thể tải tất cả. Bắt buộc phải tải theo yêu cầu và nén (xem mục 7).

### Chưa đo

**FPS chưa đo.** Đây là mục tiêu chính còn lại của POC. Hai thứ cần đo kỹ:

- `EffectComposer` (viền vàng khi chọn) thay đường ống render của three.js
- Đèn trần là `pointLight` thật, phòng to sinh nhiều đèn

---

## 6. Đưa vào web bán hàng

Phần này là **đề xuất**, chưa có gì được kiểm chứng.

### 6.1 Danh mục sản phẩm ↔ model 3D

Hiện `products.ts` là mảng tĩnh trong mã nguồn. Sang ecom nó thành API:

```ts
type Product = {
  sku: string
  name: string
  price: number
  currency: 'VND'
  inStock: boolean

  modelUrl: string
  size: { w: number; d: number; h: number }  // mm, ĐO TỪ MODEL
  placement: 'floor' | 'wall' | 'rug' | 'ceiling'
}
```

**`size` phải đo từ chính model, không nhập tay.** POC đã dính lỗi này: tôi
đoán `WoodenTable_02` là bàn ăn, đo ra mới biết là cái đôn cao 418mm. Kéo thả,
hút tường và đường đo đều lấy số này — sai một chỗ là sai cả chuỗi.

Cách làm đúng: lúc bên 3D upload file, hệ thống tự đo hộp bao và ghi vào
cơ sở dữ liệu. Không cho nhập tay.

### 6.2 Bán kèm — giường + gối + chăn

Đây là phần khó nhất về mặt dữ liệu. Hai hướng:

**Hướng A — một file, nhiều node có tên**

Bên 3D giao `bed_queen.glb` chứa các node đặt tên theo quy ước:

```
bed_queen.glb
├── frame          -> SKU BED-Q-001   1.200.000đ
├── mattress       -> SKU MAT-Q-002     800.000đ
├── pillow_left    -> SKU PIL-STD-01     90.000đ
├── pillow_right   -> SKU PIL-STD-01     90.000đ
└── blanket        -> SKU BLK-Q-003     350.000đ
```

Bật/tắt món nào thì `node.visible = true/false`. Giỏ hàng cộng theo node đang bật.

- **Được:** một lần tải, ráp khít tuyệt đối, không phải tính toạ độ
- **Mất:** tải cả những món không mua; không đổi chéo được (gối của bộ này
  không lắp sang bộ kia)

**Hướng B — file riêng + điểm neo**

`bed_queen.glb` chứa các node rỗng `anchor_pillow_left`, `anchor_blanket`…
Gối là file riêng, đặt vào đúng vị trí điểm neo.

- **Được:** đổi chéo thoải mái, chỉ tải món đã chọn
- **Mất:** nhiều request hơn; ráp khít hay không phụ thuộc kỷ luật của bên 3D

**Đề xuất:** dùng **A cho bộ mặc định**, **B cho món đổi được**. Cả hai đều
cần quy ước đặt tên chặt chẽ — xem mục 7.

Mô hình dữ liệu:

```ts
type Bundle = {
  sku: string
  name: string             // "Bộ giường Queen"
  modelUrl: string
  parts: Array<{
    nodeName: string       // khớp tên node trong file .glb
    sku: string
    required: boolean      // khung giường thì bắt buộc, chăn thì không
    defaultOn: boolean
  }>
}
```

### 6.3 Giỏ hàng

State thiết kế đã có sẵn `items[]`, mỗi món có `productId`. Giỏ hàng suy ra
trực tiếp:

```
Phòng  ->  danh sách SKU + số lượng  ->  API giỏ hàng có sẵn của web
```

Không viết giỏ hàng mới. Module 3D chỉ xuất ra danh sách SKU rồi gọi API
đang có.

Cần thêm trong giao diện:
- Bảng giá theo từng món ngay trong panel
- Tổng tiền cả phòng, cập nhật ngay khi thêm/bớt
- Nút "Thêm tất cả vào giỏ"
- Món hết hàng phải hiện rõ, không cho thêm

### 6.4 Lưu & chia sẻ thiết kế

Toàn bộ thiết kế đã nằm gọn trong một object tuần tự hoá được (`doc`). Xuất
JSON đã có trong kế hoạch (D12-2).

```
POST /api/designs        -> trả về id
GET  /api/designs/:id    -> mở lại
```

Giá trị kinh doanh: khách lưu phòng, quay lại sau, gửi link cho vợ/chồng xem.
Đây là kênh thu email và kéo khách quay lại.

Ảnh xem trước: chụp bằng `canvas.toBlob()` phía trình duyệt rồi upload. Đừng
dựng render phía máy chủ cho POC.

### 6.5 Cách nhúng vào web ecom

| Cách | Khi nào dùng | Đánh đổi |
|---|---|---|
| **Cùng ứng dụng** | web đang là React | dễ nhất, chia sẻ được state đăng nhập / giỏ hàng. Bắt buộc tách gói |
| **iframe + postMessage** | web đang là PHP, Laravel, WordPress… | cách ly hoàn toàn, deploy độc lập. Phải viết giao thức nhắn tin |
| **Web Component** | muốn dùng lại nhiều nơi | phức tạp nhất, ít lợi |

**Bắt buộc dù chọn cách nào: tách gói.** 362 KB gzip mà nhét vào trang chủ là
kéo tụt tốc độ toàn bộ web. Phải `import()` động, chỉ tải khi người dùng bấm
"Thiết kế phòng".

Nếu dùng iframe, giao thức tối thiểu:

```
3D  -> web:  { type: 'cart:add',  items: [{ sku, qty }] }
3D  -> web:  { type: 'design:changed', total: 4350000 }
web -> 3D:   { type: 'catalog:update', products: [...] }
```

### 6.6 Backend cần gì

| | |
|---|---|
| Sản phẩm | SKU, giá, tồn kho, `modelUrl`, kích thước đo được |
| Thiết kế | lưu / mở / chia sẻ |
| Tài nguyên | CDN cho file `.glb`, cache dài, hỗ trợ range request |
| Giỏ hàng | dùng lại API có sẵn, không viết mới |
| Kiểm tra model | chạy lúc upload, xem mục 7 |

---

## 7. Hợp đồng với bên cung cấp 3D

**Đây là rủi ro lớn nhất của dự án.** POC đã cho thấy: model tải về mà không
kiểm là hỏng cả chuỗi phía sau.

Cần thống nhất bằng văn bản trước khi bên kia bắt đầu làm:

| Khoản | Yêu cầu | Vì sao |
|---|---|---|
| Định dạng | `.glb` một file (đã nhúng texture) | ít request, khó lẫn file |
| Tỉ lệ | mét, đúng kích thước thật | sai tỉ lệ là hút tường và đo đạc sai hết |
| Trục | Y hướng lên | quy ước của glTF |
| Gốc toạ độ | tâm mặt đáy | đặt sai là đồ lún sàn hoặc bay lơ lửng |
| Hướng | mặt trước quay về **+Z** | POC đang giả định lưng đồ ở −Z để hút tường |
| Tam giác | ≤ 50.000 mỗi model | ngân sách hiệu năng |
| Texture | ≤ 1024², định dạng KTX2 | ngân sách băng thông |
| Nén | Draco hoặc meshopt | giảm 5–10 lần dung lượng lưới |
| Tên node | `snake_case`, khớp danh sách SKU | dùng để bật/tắt món bán kèm |
| Bản quyền | chuyển giao hoặc cấp phép thương mại rõ ràng | tránh rắc rối sau này |

**Phải có kiểm tra tự động lúc upload**, từ chối file không đạt:

```
✗ sofa_lux.glb — 412.000 tam giác (trần 50.000)
✗ sofa_lux.glb — texture 4096² (trần 1024²)
✗ sofa_lux.glb — gốc toạ độ lệch 1,2m khỏi tâm đáy
✗ sofa_lux.glb — thiếu node 'pillow_left' theo khai báo SKU
```

Kiểm bằng tay không khả thi khi danh mục lên hàng trăm món. Công cụ dòng lệnh
`gltf-transform` làm được cả việc kiểm lẫn việc nén.

---

## 8. Rủi ro & việc chưa làm

### Rủi ro lớn

**1. Mobile chưa làm gì cả.** `claude.md` loại mobile khỏi phạm vi POC. Nhưng
web bán hàng thì phần lớn lưu lượng đến từ điện thoại. Cần:
- Cử chỉ chạm: một ngón xoay, hai ngón zoom/pan
- Bố cục dọc, panel thành ngăn kéo trượt từ dưới lên
- Hạ ngân sách hiệu năng: điện thoại tầm trung yếu hơn laptop nhiều

Mã hiện tại dùng Pointer Events nên **không phải viết lại từ đầu**, nhưng bố
cục và cử chỉ là việc thật.

**2. Chưa đo FPS.** Chưa biết máy yếu chạy được không. Phải đo trước khi cam
kết bất cứ điều gì với khách.

**3. Ngân sách 5MB sẽ vỡ.** 7 model đã 4,76MB. Danh mục thật hàng trăm món.
Bắt buộc: tải theo yêu cầu, nén Draco/KTX2, CDN, và có thể cần model độ chi
tiết thấp cho lần hiển thị đầu.

### Chưa làm trong POC

| | |
|---|---|
| Đường đo kích thước tới tường | đang làm dở (D11-4) |
| Xuất JSON | kế hoạch D12-2 |
| Đo hiệu năng | kế hoạch D12-3 |
| Biến thể sản phẩm (màu, kích cỡ) | chưa có trong mô hình dữ liệu |
| Đồ treo tường (tranh, đèn tường) | `placement: 'wall'` đã khai báo, chưa dựng |
| Chống đồ chồng lên nhau | mới chặn ra ngoài phòng, chưa chặn đè nhau |
| Kính dùng `transmission` | đang dùng opacity thường cho nhẹ |
| Đăng nhập, thanh toán | ngoài phạm vi |

---

## 9. Ước lượng đưa lên production

Từ POC hiện tại, giả định một lập trình viên:

| Hạng mục | Ngày công |
|---|---|
| Hoàn tất POC (đường đo, xuất JSON, đo hiệu năng) | 2 |
| API danh mục + giá + tồn kho | 3 |
| Bán kèm: mô hình dữ liệu + bật/tắt node + giá | 5 |
| Nối giỏ hàng | 2 |
| Lưu / mở / chia sẻ thiết kế | 4 |
| Đường ống kiểm tra & nén model lúc upload | 5 |
| Tách gói + nhúng vào web hiện có | 3 |
| **Mobile: cử chỉ + bố cục** | **8** |
| Tối ưu hiệu năng sau khi đo | 5 |
| **Cộng** | **~37 ngày** |

Chưa tính: thiết kế giao diện, kiểm thử, và thời gian bên 3D giao hàng.

**Đường găng là tài nguyên 3D, không phải mã nguồn.** Mã có thể viết song
song, nhưng không có model đúng chuẩn thì không đo được, không bán được.
Nên chốt hợp đồng ở mục 7 và yêu cầu bên 3D giao **2–3 mẫu thử ngay** để
chạy qua đường ống kiểm tra trước khi họ làm cả danh mục.
