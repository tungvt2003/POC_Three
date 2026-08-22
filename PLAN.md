# PLAN — Room Designer POC

Bảng theo dõi tiến độ. Quy ước trong `claude.md`, không lặp lại ở đây.

**Trạng thái:** `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[!]` chặn/hỏng

**Cách dùng:** mỗi việc có mã (D1-1…). Nhắc mã khi giao việc: "làm D3-2".
Chỉ tick `[x]` khi **Tiêu chí xong** đúng hết, không tick theo cảm giác.

---

## Ngày 1 — Dựng khung, phòng rỗng

- [x] **D1-1** Init Vite + React + TypeScript
  - Tiêu chí: `npm run dev` mở được, HMR sửa file thấy đổi ngay ✓ (HMR xác nhận qua `?t=` khi sửa buildWalls)
  - File: `package.json`, `vite.config.ts`, `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json`
- [x] **D1-2** Cài deps 3D
  - Tiêu chí: đủ 6 gói, `tsc -b` sạch, `vite build` xong ✓
  - Lưu ý: R3F v9 cần `"types": ["vite/client", "@react-three/fiber"]` trong tsconfig, thiếu là `<mesh>` báo lỗi type
- [x] **D1-3** `<Canvas>` + ánh sáng + OrbitControls
  - Tiêu chí: xoay/zoom mượt ✓ — bỏ box test, dùng luôn phòng D1-5 để kiểm tra
  - File: `src/App.tsx`, `src/designer/scene/Scene.tsx`
- [x] **D1-4** `lib/units.ts`
  - Tiêu chí: `selfCheckUnits()` chạy khi DEV, 9 assert pass, console không lỗi ✓
- [x] **D1-5** Sàn + 4 tường sinh từ tham số cứng (4000×3000×2700mm)
  - Tiêu chí: chụp màn từ trên nhìn xuống — 4 tường kín, sàn khớp mép tường, tỉ lệ 4:3 đúng ✓
  - File: `scene/Room.tsx`, `scene/Wall.tsx`, `scene/Floor.tsx`, `scene/buildWalls.ts`
  - Chốt: `start`/`end` nằm ở MẶT TRONG tường → `room.width/depth` là kích thước lòng phòng
  - Chốt: 2 tường chẵn kéo dài `thickness` mỗi đầu để bịt góc ngoài, 2 tường lẻ nằm lọt giữa → không hở, không chồng khối (chồng khối sẽ đậm màu khi fade ở D6)
- [x] **D1-6** Tính sẵn `innerNormal` cho từng tường
  - Tiêu chí: `selfCheckWalls()` log `wall-0 (0,1) · wall-1 (-1,0) · wall-2 (0,-1) · wall-3 (1,0)` — cả 4 trỏ vào tâm ✓

## Ngày 2 — Store + panel chỉnh phòng

- [x] **D2-1** `designStore.ts` zustand + immer
  - Tiêu chí: state khớp type trong claude.md, đơn vị mm ✓
  - Chốt: state chia làm `doc` (room/walls/items — CÓ undo) và phần ngoài (`selectedId`, `past`, `future`, `pending` — KHÔNG snapshot). Không tách thì thành snapshot lồng snapshot.
- [x] **D2-2** Sinh lại tường khi đổi W/D/H
  - Tiêu chí: đo tham chiếu — đổi `height` giữ nguyên mảng `walls` (`true`), đổi `width` mới dựng lại (`true`) ✓
  - Tiêu chí: sau khi kéo Rộng lên 6000, 4 tường dài `[6000, 3000, 6000, 3000]` ✓
- [x] **D2-3** `RoomPanel` — slider W/D/H + swatch màu tường + chọn sàn
  - Tiêu chí: bấm chip sàn đổi ngay, texture cache theo id nên không tạo lại ✓
  - File: `src/ui/RoomPanel.tsx`, `src/ui/Toolbar.tsx`
- [x] **D2-4** Undo/redo (nằm trong `designStore.ts`, không tách file riêng — chưa đủ to)
  - Tiêu chí: 41 lần `updateRoom` + 1 `endEdit` → `past.length === 1`, KHÔNG phải 41 ✓
  - Tiêu chí: sửa mà giá trị không đổi → không đẻ bước rác (`past` giữ nguyên) ✓
  - Tiêu chí: 80 bước → `past.length === 50` (đúng trần) ✓
  - Tiêu chí: làm việc mới → `future` bị xoá (1 → 0) ✓
  - Tiêu chí: undo 200 lần liên tiếp không vỡ, vẫn còn 4 tường ✓
  - Ctrl+Z / Ctrl+Shift+Z: `useHistoryShortcuts.ts`
- [x] **D2-5** Texture sàn — 3 loại
  - Tiêu chí: chọn Gạch xám 600×600 trong phòng 4000×3000, đếm được ~6.7 cột × 5 hàng ✓
  - Tiêu chí: đổi size phòng chỉ đổi `texture.repeat`, không dựng lại texture → không kéo giãn ✓
  - ⚠️ Texture đang sinh bằng `<canvas>`, CHƯA phải ảnh thật. Thay ở D4-1, `tile` giữ nguyên vì đó là kích thước vật lý.

## Ngày 3 — NỀN ĐA GIÁC (thay hẳn mô hình chữ nhật)

Phòng không còn là `width × depth`. Là **đa giác**. Việc này phải làm trước
mọi thứ khác — để sau D5 mới đổi thì phải viết lại cả kéo thả, snap, đường đo.

- [x] **D3-1** `types.ts` — `Room.footprint: Point[]` thay `width/depth` ✓
  - `Wall` thêm `outerStart`/`outerEnd`. `Room` thêm `shapeId` + `shapeParams`
  - LỆCH so với type mẫu trong `claude.md`. Cố ý, do đổi phạm vi.
- [x] **D3-2** `shapes.ts` — 6 preset theo mô hình LƯỚI ĐƯỜNG THẲNG ✓
  - `rect`(4 tường) · `cut`(5) · `beveled`(6) · `l-shape`(6) · `t-shape`(8) · `u-shape`(8)
  - **Mỗi tường = 1 đường thẳng.** Đỉnh đa giác = giao của 1 đường x với 1 đường z.
    Kéo tường nào dời đúng đường đó, tường đối diện ĐỨNG YÊN.
  - Bản đầu dùng tham số `width`/`depth` vẽ quanh gốc toạ độ → kéo 1 lần hai tường
    cùng chạy (đối xứng). SAI, đã bỏ. Xem nhật ký 2026-08-22.
  - `describeEdges` trả chiều dài từng cạnh + cạnh đó kéo được đường nào.
    Cạnh xiên `drag: null` — chiều dài SUY RA, không kéo trực tiếp → hình không méo được.
  - `lineRange`/`clampLine` chặn kéo xuyên tường kề, chừa `MIN_GAP = 700mm`. Kẹp ở STORE.
  - Tiêu chí: kéo tường trái 800mm → `x1` không đổi, cạnh tường sau dài thêm đúng 800 ✓
  - Tiêu chí: kéo tường trái vượt tường phải → kẹp lại ở `x1 - 700` ✓
  - `carryParams` giữ đường trùng tên khi đổi hình, rồi ép lại thứ tự tăng dần ✓
- [x] **D3-3** `buildWalls` chạy trên đa giác ✓
  - `lib/polygon.ts` mới: `signedArea` · `ensurePositiveWinding` · `offsetPolygon` ·
    `lineIntersect` · `pointInPolygon` · `bounds`
  - Tiêu chí: `selfCheckWalls` chạy qua CẢ 6 HÌNH, mỗi tường kiểm 4 điều:
    normal đơn vị · không có thành phần Y · vuông góc với tường ·
    đỉnh ngoài cách đúng `-100mm` theo phương pháp tuyến ✓
  - Tiêu chí: tường kề nhau DÙNG CHUNG cả đỉnh trong lẫn đỉnh ngoài
    → bằng chứng số học là không hở, không chồng ✓
  - Đã BỎ phép thử "hướng về tâm phòng" và mẹo chẵn/lẻ `wallExtendsCorners`
- [x] **D3-4** Hình học tường cắt vát ✓
  - `wallGeometry.ts`: `ExtrudeGeometry` trên tứ giác `[trong đầu, trong cuối, ngoài cuối, ngoài đầu]`
  - Tiêu chí: chụp màn hình U (2 góc lõm 270°) và hình Cut (góc 135°) — mép trên tường liền mạch ✓
  - Có `geometry.dispose()` khi unmount, không rò VRAM lúc kéo slider
- [x] **D3-5** Sàn `ShapeGeometry` từ footprint ✓
  - Tiêu chí: sàn bám đúng đa giác chữ U, không phải hộp bao ✓
  - `applyFloorRepeat` bị XOÁ. UV của `ShapeGeometry` = toạ độ đỉnh (mét), nên
    `repeat = 1/tile(m)` đặt một lần lúc tạo texture là xong — không phụ thuộc
    kích thước lẫn hình dạng phòng
- [x] **D3-6** Store chuyển sang footprint, giữ nguyên cơ chế undo ✓
  - Tiêu chí: undo qua các lần đổi hình — cut(5 tường) → u-shape(8) → rect(4), redo → u-shape(8) ✓
  - Tiêu chí: 31 lần `updateShapeParams` + 1 `endEdit` = ĐÚNG 1 bước undo ✓

## Ngày 4 — Vỏ wizard + Bước 1 "Chọn hình"

**Bước 1 và 2 là 2D. Chỉ sang Bước 3 mới hiện 3D.** Kéo tường trong phối cảnh
3D vừa khó ngắm vừa phải viết gizmo; 2D bắt điểm chính xác và ít code hơn nhiều.

- [x] **D4-1** Vỏ wizard 4 bước + nút Quay lại / Tiếp ✓
  - `ui/uiStore.ts` riêng: `step`, `unit`, `selectedEdge`. KHÔNG nằm trong `doc`
    → Ctrl+Z không nhảy lùi wizard ✓
  - Bước 1–2 render `<FloorPlan2D>`, Bước 3–4 mới render `<Canvas>` ✓
- [x] **D4-2** Bước 1 — lưới 6 thumbnail hình, bấm chọn ✓
  - Thumbnail vẽ bằng SVG sinh từ `shapes.ts`, thêm hình mới là thumbnail tự có
- [x] **D4-3** Camera ngắm tâm hộp bao phòng ✓ (làm ở N3)
- [x] **D4-4** `ceilingLightGrid.ts` — rải đèn trần theo lưới ✓
  - Số đèn suy ra từ hộp bao: `LIGHT_SPACING = 2000mm`. Kéo phòng to ra là tự thêm đèn.
  - Tiêu chí: phòng vuông 4.1m → 4 đèn (2×2), khớp ảnh tham chiếu ✓
  - Tiêu chí: 4000×3000 → 4 đèn; 8000×3000 → nhiều hơn ✓
  - Tiêu chí: hình L — không đèn nào rơi vào phần bị khoét (`pointInPolygon`) ✓
  - Tiêu chí: phòng tí hon vẫn có đúng 1 đèn ✓
- [x] **D4-5** `CeilingLights.tsx` — `pointLight` thật + đĩa phát sáng ✓
  - `castShadow` TẮT: bóng đổ cần 1 lượt render cho MỖI đèn, 8 đèn là 8 lượt. Không đáng.
  - Tối đa 4 đèn mỗi trục. `ambientLight` hạ 0.7 → 0.25 cho thấy vũng sáng.
  - ⚠️ Độ sáng/tầm chiếu đang chỉnh bằng mắt. Đo lại ở D12 xem nhiều đèn có tụt FPS không.

## Ngày 5 — Bước 2 "Kéo chỉnh kích thước" (2D)

- [x] **D5-1** `FloorPlan2D.tsx` — vẽ footprint bằng SVG, tự fit khung nhìn ✓
  - Vẽ trong hệ PIXEL (ResizeObserver + tự chiếu mm→px), KHÔNG nhét mm vào `viewBox`
    → cỡ chữ và bề dày nét không co giãn theo kích thước phòng
- [x] **D5-2** Kéo TỪNG BỨC TƯỜNG, tường đối diện đứng yên ✓
  - Pointer Events + `setPointerCapture`, vạch bắt chuột trong suốt dày 22px cho dễ tóm
  - Tiêu chí: kéo tường trái 120px → `x0` −2000 → −2490, `x1`/`z0`/`z1` KHÔNG đổi ✓
  - Tiêu chí: 12 lần `pointermove` → `past` vẫn 0; nhả chuột → `past` = 1 ✓
  - Tiêu chí: undo về đúng −2000 ✓
  - Cạnh xiên `drag === null` nên không có vạch bắt chuột — không kéo được
- [x] **D5-3** Nhãn đo từng cạnh, đặt ngoài đường bao + vạch gióng ✓
  - Chiều dài thật kể cả cạnh xiên (vát 1200×1200 ra 1697mm)
- [x] **D5-4** Toggle Feet / Centimet ✓
  - Tiêu chí: nhãn đổi `13'1" / 9'10"` → `400 cm / 300 cm`, `shapeParams` VẪN nguyên mm ✓
  - Tiêu chí: `doc.room` không có trường `unit` nào ✓
- [x] **D5-5** Ô nhập số cho cạnh đang chọn ✓
  - Gõ chiều dài mong muốn → dời đường ở ĐẦU KIA của cạnh (dời chính đường của
    nó thì không đổi được chiều dài của nó)
  - ⚠️ Ô nhập tính bằng mm. Parse `43 x 83½ in` để dành production.
- [x] **D5-6** Con trỏ đổi hình theo việc đang làm ✓
  - `ew-resize` cho tường dọc · `ns-resize` cho tường ngang · `grabbing` lúc kéo
  - Tường đang trỏ/đang kéo tô VÀNG

## Ngày 6 — Hình học cửa + cửa sổ

- [x] **D6-1** `wallGeometry.ts` — chẻ tường thành mảnh quanh lỗ ✓
  - Không CSG. Thuần hàm `wallSlabs(wall, height)` trả danh sách mảnh `(quad, y0, y1, t0, t1)`.
  - Tiêu chí: tường trơn → 1 mảnh · cửa đi (`elevation=0`) → **3 mảnh** · cửa sổ → **4 mảnh** ✓
  - Tiêu chí: mảnh đầu/cuối GIỮ NGUYÊN đỉnh cắt vát gốc. Thay bằng nhát cắt vuông góc
    là góc phòng hở ra ✓
  - Tiêu chí: các mảnh KHÔNG đè lên nhau trong không gian `(t, y)` ✓
  - Tiêu chí: tổng diện tích mặt đứng = diện tích tường − diện tích lỗ, khớp CHÍNH XÁC ✓
  - Tiêu chí: 2 lỗ chồng nhau → bỏ cái sau, không làm thủng tường ✓
  - Chốt: `outerAt(t)` phải CHIẾU VUÔNG GÓC, không nội suy tuyến tính từ `outerStart`
    tới `outerEnd` — hai mặt song song nhưng dài khác nhau vì hai đầu cắt vát.
  - Gộp các mảnh bằng `mergeGeometries` → mỗi tường vẫn chỉ 1 draw call.
- [x] **D6-2** `Opening.tsx` — khung + cánh/kính ✓
  - 4 thanh khung (trên/dưới/2 bên) + tấm giữa. Tấm nằm ở lát 0.38–0.62 bề dày tường.
  - Cửa đi `elevation=0` chạm sàn, cửa sổ lơ lửng đúng cao độ ✓
  - Kính dùng `MeshStandardMaterial` opacity 0.34, KHÔNG dùng `transmission` (xem "chưa chốt")
- [x] **D6-3** Opening là con của group tường ✓
  - `Wall.tsx` render `wall.openings` bên trong `<group name={wall.id}>` → D11 fade là mờ cùng
- [x] **D6-4** Store: `addOpening` / `removeOpening` ✓
  - Chặn ở STORE: lỗ đè lỗ khác hoặc rộng hơn cả tường → trả `null`, không đặt.
    Phải chặn từ đây vì `wallSlabs` gặp lỗ chồng nhau thì BỎ QUA — cửa biến mất mà không báo lỗi.
  - Tiêu chí: đặt đè lỗ khác → `null` ✓ · đặt lỗ rộng 99999mm → `null` ✓ · mỗi lần đặt = 1 bước undo ✓

## Ngày 7 — Bước 3 "Thêm cửa & cửa sổ"

- [x] **D7-1** `catalog/openings.ts` — 6 kiểu cửa + 3 kiểu cửa sổ ✓
  - Cửa: đơn · kính · Pháp đôi · panel đôi · xếp đôi · kính đôi
  - Cửa sổ: hất · trượt · cố định
  - Mỗi kiểu là THAM SỐ (`cols` × `rows` ô kính, `leaves`, `glass`) → dựng bằng code,
    không file model. Nẹp giữa của cửa 2 cánh to gấp đôi.
  - Thumbnail vẽ bằng SVG sinh từ chính tham số — thêm kiểu mới là thumbnail tự có
- [x] **D7-2** Đặt cửa lên tường bằng chuột ✓
  - Tiêu chí: CHỈ nhận khi trúng MẶT TRONG tường (`isInnerFace` so pháp tuyến mặt vừa bấm
    với `innerNormal`, và loại mặt trên/dưới). Bấm mặt ngoài không đặt ✓
  - Tiêu chí: con trỏ trỏ vào GIỮA cửa, không phải mép trái
  - Tiêu chí: bóng mờ báo trước chỗ đặt — vàng = được, đỏ = đè lỗ khác/hết chỗ.
    Bóng chỉ là MỘT tấm phẳng đổi `position`/`scale`, không dựng lại geometry mỗi lần rê chuột.
  - Tiêu chí: đặt xong tự chọn luôn, 1 bước undo ✓
  - Tường chỉ ăn sự kiện chuột ở BƯỚC 3 — bước khác bấm không ra cửa
- [x] **D7-3** Chọn cửa → tô vàng + nút xoá ✓
  - Bấm vào cửa thì `stopPropagation`, không lọt xuống tường mà đặt thêm cái mới
  - Xoá bằng nút hoặc phím Delete. Undo trả lại được ✓
- [x] **D7-4** Ô nhập W × H × cách sàn ✓
  - Tiêu chí: sửa 1500×1200 → 2200×1400 ✓
  - Tiêu chí: nới rộng cho đè lên lỗ khác → BỊ TỪ CHỐI, giữ nguyên giá trị cũ ✓
  - Tiêu chí: đặt lỗ không còn đủ chỗ trên tường → trả `null` ✓
  - ⚠️ Ô nhập tính bằng mm, bên cạnh hiện quy đổi theo đơn vị đang chọn. Gõ thẳng
    `43 1/2 in` cần parser phân số — để dành production.

## Ngày 8 — Bước 4 "Chọn màu" + hoàn tất wizard

- [x] **D8-1** Màu tường + sàn tách thành `StylePicker` dùng chung ✓
  - Bước 4 và panel chế độ thiết kế cùng gọi một component — sửa một chỗ, hai nơi đúng theo
- [x] **D8-2** Xong wizard → chế độ thiết kế ✓
  - `mode: 'wizard' | 'design'` trong `uiStore`. Panel thiết kế KHÔNG lặp lại giao diện
    từng bước — chỗ nào cần sửa thì bấm nút quay về đúng bước đó.
  - Có tóm tắt sống: tên hình · kích thước hộp bao · **diện tích sàn thật của đa giác**
    (không phải hộp bao) · số tường · số cửa/cửa sổ
  - Tiêu chí: bấm Xong → `mode='design'`, kiểu cửa tự hạ nòng, dữ liệu giữ nguyên hết ✓
- [x] **D8-3** Vào lại bước bất kỳ mà không mất dữ liệu ✓
  - Dải số 1–4 ở đầu sidebar bấm được, nhảy thẳng tới bước bất kỳ
  - Đã bấm Xong một lần thì mọi bước đều có nút "Xong" để thoát nhanh
  - Tiêu chí: hình L + 1 cửa + sàn gạch xám → Xong → quay lại Bước 2 → còn nguyên ✓
  - Làm được vì toàn bộ thiết kế nằm ở `designStore`, còn "đang ở bước mấy" chỉ là state UI

## Ngày 9 — Nội thất

- [x] **D9-1** 7 model THẬT, CC0 từ Poly Haven ✓
  - Khách chưa gửi model, nhưng POC cần đo tris/dung lượng thật — khối tạm không đo được gì.
    Lấy CC0 về dùng luôn, sau này thay bằng model khách chỉ là đổi `modelUrl`.
  - Tải bản **gltf 1k**: `.gltf` + `.bin` + 3 texture JPEG **1024²** (đúng ngân sách)
  - Tiêu chí: tris cao nhất **19.992** (WoodenChair_01), ngân sách 50k → **KHÔNG cần decimate** ✓
  - Tiêu chí: tổng 7 model **4.870 KB**, ngân sách 5MB → ⚠️ **sát trần**, chưa tính HDRI + texture sàn
- [x] **D9-2** `ASSETS.md` đầy đủ ✓
  - Mỗi model: tên · tris · dung lượng · **kích thước ĐO ĐƯỢC** · ngày tải · license
  - Kèm bảng đối chiếu ngân sách và quy trình thêm model mới
- [x] **D9-3** `catalog/products.ts` — 8 món ✓
  - `size` là số ĐO TỪ MODEL, không phải ước lượng. `GltfModel` in ra log khi chạy DEV.
  - Đã sửa tên cho khớp model thật: `WoodenTable_02` hoá ra là đôn 301mm chứ không phải
    bàn ăn; `WoodenChair_01` cao **2274mm** — ghế lưng cao, không phải ghế ăn thường.
  - Thảm chưa có model CC0 → vẫn khối tạm
- [x] **D9-4** `Item.tsx` — model thật + khối tạm dự phòng ✓
  - `GltfModel` CLONE mỗi lần (`SkeletonUtils.clone`). Không clone thì hai cái ghế cùng
    loại dùng chung một object — xoay cái này cái kia xoay theo, mà chỉ hiện ra một cái.
  - CHUẨN HOÁ GỐC TOẠ ĐỘ: đo `Box3` rồi dời về "tâm đáy". Mỗi model đặt gốc một kiểu,
    không chuẩn hoá là đồ lún xuống sàn hoặc bay lơ lửng.
  - `<Suspense>` bao ngoài `Items` — `useGLTF` suspend lúc tải, thiếu là văng lỗi
  - Ghép vài hộp cho ra dáng nhận biết được: bàn có chân, ghế có lưng tựa, sofa có tay vịn.
    Hộp trơn thì bố trí phòng không phân biệt nổi cái gì với cái gì.
  - Kích thước phủ bì lấy ĐÚNG từ `product.size` → kéo thả, snap tường, đường đo
    (D10–D11) đúng ngay từ bây giờ, không phải chờ model thật
  - Gốc toạ độ model nằm GIỮA ĐÁY, `y` luôn 0 → snap và đo khỏi bù trừ chiều cao
- [x] **D9-5** Click chọn + outline vàng · click nền → bỏ chọn ✓
  - `<Selection>` + `<EffectComposer><Outline>` của `@react-three/postprocessing`
  - Bỏ chọn bằng một mesh vô hình dưới sàn: mọi thứ bấm được đều `stopPropagation`,
    nên sự kiện lọt xuống đó nghĩa là bấm vào chỗ trống
  - ⚠️ `EffectComposer` thay đường ống render. PHẢI đo lại FPS ở D12.
- [x] **D9-6** Xoá (phím Delete) + xoay. Undo được cả hai ✓
  - `deleteSelected()` ở store tự phân biệt cửa hay món đồ — tầng UI không cần biết
  - Xoay 15° / 90° mỗi lần bấm
  - Tiêu chí: thêm 4 món → xoay → xoá → undo trả lại đủ 4 ✓
  - Tiêu chí: 3 lần `moveItem` + 1 `endEdit` = 1 bước undo ✓
- [ ] **D9-7** Thay texture sàn canvas bằng ảnh thật (nợ từ D2-5) — chờ có asset

## Ngày 10 — Kéo thả

- [x] **D10-1** `useDragItem.ts` — Pointer Events + raycast `Plane(y=0)` ✓
  - Raycast vào `THREE.Plane` TOÁN HỌC, KHÔNG vào mesh sàn. Sàn hình L có chỗ khoét,
    kéo qua đó là tia trượt ra ngoài và món đồ nhảy loạn.
  - `setPointerCapture` — kéo nhanh ra khỏi món đồ vẫn không tuột
  - Tắt `controls.enabled` lúc kéo, không thì vừa kéo đồ vừa xoay cả phòng
  - Nhớ `grabOffset`: không có thì món đồ nhảy tâm về ngay dưới con trỏ lúc vừa bấm
- [x] **D10-2** `moveItem(id, worldPosMm)` không biết nguồn input ✓
- [x] **D10-3** Kéo `set()` trực tiếp, chỉ đẩy history lúc `pointerup` ✓
  - Tiêu chí: 20 lần `pointermove` → `past` không đổi; nhả chuột → +1 ✓
  - Phải dùng `setItemRotation` (live) chứ KHÔNG phải `rotateItem` — cái kia chốt
    history ngay, hút tường tự xoay sẽ đẻ hàng chục bước undo
- [x] **D10-4** `snapToWall.ts` — dưới 400mm thì hút + xoay lưng vào tường ✓
  - Thuần hàm, không biết three.js / React / chuột. Test bằng số.
  - Tiêu chí: hút vào tường sau → tâm cách đúng nửa chiều sâu, góc 0 ✓
  - Tiêu chí: hút vào tường trái → góc 90° ✓
  - Tiêu chí: đứng lệch khỏi đoạn tường → KHÔNG hút vào bức tường đó ✓
  - Tiêu chí: tường XIÊN 45° → khoảng cách theo pháp tuyến đúng ✓
  - Tiêu chí thật (kéo bằng chuột): sofa sâu 658 hút vào tường `x=-2000` → tâm `x=-1671` ✓
- [x] **D10-5** Chặn đồ ra ngoài đa giác ✓
  - `pointInPolygon` + `closestPointOnPolygon`, KHÔNG dùng hộp bao — hình L/U thì
    hộp bao vẫn cho kéo vào phần bị khoét
  - Tiêu chí: kéo thật xa ra ngoài → hút về mép rồi hút tiếp vào tường ✓
- [x] **D10-6** Thảm `placement:'rug'` ✓
  - `y = 1mm` + `polygonOffset`, `castShadow` tắt, KHÔNG hút tường
    (thảm nằm giữa phòng là chuyện bình thường)

## Ngày 11 — Camera + ẩn tường + đường đo

- [x] **D11-1** Ẩn tường theo góc nhìn ✓ (làm thẳng trong `Wall.tsx`, không tách hook riêng)
  - `dot(innerNormal, camDir) > 0.05` → mờ về 0. Ngưỡng `0.05` chứ không phải `0`:
    ngay ranh giới thì sai số làm giá trị nhảy quanh 0 và tường nhấp nháy.
  - `MathUtils.damp` λ=8 (~0.4s), KHÔNG bật/tắt đột ngột
  - Cửa/cửa sổ mờ CÙNG tường vì là con của group ✓
  - Độ mờ NHÂN với opacity gốc của từng material, không gán đè — kính cửa sổ vốn
    `opacity 0.34`, gán đè là lúc tường hiện đủ thì kính hoá thành đặc
  - Mờ hẳn thì `group.visible = false` — mesh vô hình vẫn tốn draw call
  - Bước 1–2 tắt hẳn (`fade={false}`), nhìn thẳng từ trên xuống không tường nào chắn
- [x] **D11-2** Camera preset "Từ trên" — TRỰC GIAO, fit vừa đa giác ✓
  - Trực giao thật: hai bức tường xa gần cùng bề dày, đo trên màn hình đúng tỉ lệ
  - Khoá xoay (`enableRotate={false}`) — xoay đi là mất luôn ý nghĩa bản vẽ mặt bằng
  - Trả lại camera cũ lúc unmount (bài học từ `TopDownCamera`)
- [x] **D11-3** Camera preset "Nhà búp bê", chuyển có tween ✓
  - Đứng chéo 45° trên mặt bằng, cao 40° so với phương ngang
  - `MathUtils.damp` λ=4 (~0.8s). Nhảy phắt thì người dùng mất phương hướng
  - Tới nơi thì dừng, trả quyền xoay lại cho `OrbitControls`
  - `dollhouseGoal` / `topOrthoFrustum` là hàm THUẦN, self-check bằng số
- [x] **D11-4** `Dimensions.tsx` — khoảng hở tới MẶT PHẲNG tường gần nhất ✓
  - `clearance.ts` là hàm THUẦN: `itemFootprint` (4 góc đã xoay) + `measureClearances`
  - Tiêu chí: đo tới mặt phẳng, KHÔNG theo trục. Self-check có case tường xiên 45°:
    đo theo trục ra 500mm, đo đúng ra nhỏ hơn ✓
  - Tiêu chí: nhãn `<Html>` của drei (thẻ DOM thật), hở < 600mm → đỏ ✓
  - Tiêu chí: chỉ hiện cho item ĐANG CHỌN, tối đa 4 đường — nhiều hơn thì chữ chồng nhau
  - Tiêu chí thật: sofa 1571×658 ở `(-1200,-900)` trong phòng 4000×3000 →
    4 nhãn `0'1" · 0'11" · 6'10" · 7'11"`, hai cái đầu đỏ, khớp tính tay ✓
  - ⚠️ Đồ kê sát góc thì 2 nhãn ngắn nằm chồng lên nhau. Chưa xử, cần đẩy nhãn ra.

## Ngày 12 — Đo đạc + đóng gói

- [x] **D12-1** `StatsHud` — FPS, draw calls, tam giác, bộ nhớ GPU ✓
  - Đọc thẳng `gl.info`, không thêm dep (`r3f-perf`, `stats.js`)
  - Store riêng cập nhật 4 lần/giây — nhét chung `uiStore` là mỗi lần đo render cả sidebar
  - **Bẫy đã dính:** `gl.info` TỰ RESET sau mỗi `render()`. `EffectComposer` render nhiều
    lượt một khung, đọc kiểu mặc định chỉ thấy lượt CUỐI = tam giác phủ màn hình
    → ra đúng "1 draw call, 1 tam giác". Số đẹp mà vô nghĩa.
    Sửa: tắt `autoReset`, cộng dồn cả khung, tự reset đầu khung sau. Lấy ĐỈNH trong
    khoảng đo chứ không lấy khung cuối.
- [x] **D12-2** Export JSON ✓
  - Tiêu chí: `findFormattedStrings()` quét cả file → **rỗng**, không chuỗi `7'6"` nào lọt ✓
  - Bỏ thứ dẫn xuất được: `innerNormal` (`Vector3`), `outerStart`/`outerEnd`.
    File chỉ giữ thứ KHÔNG suy ra được — đúng định nghĩa "dữ liệu".
  - Phòng chữ U đầy đồ: **4,4 KB**
- [x] **D12-3** Đo hiệu năng ✓ (xem bảng dưới)
- [x] **D12-4** Viết kết luận POC ✓ → `KET-LUAN.md`
  - Trả lời 5 câu hỏi POC đặt ra ban đầu, nói rõ câu nào CHƯA trả lời được
  - 6 điều học được, 10 quyết định nên giữ khi làm production
  - Danh sách việc phải làm ngay, xếp theo thứ tự chặn nhau

---

## Bảng đo (mục tiêu chính của POC)

Kịch bản đo: hình **U-Shape** (8 tường — nhiều nhất) + 1 cửa đi + 2 cửa sổ
+ 8 món nội thất model thật. Đây là cảnh nặng nhất dựng được bằng POC.

| Chỉ số | Ngân sách | Đo được | Đạt? |
|---|---|---|---|
| Tris / model (max) | ≤ 50k | **19.992** (WoodenChair_01) | ✅ |
| Tổng tris — 7 model trên đĩa | — | **42.771** | — |
| Tổng tải — 7 model | ≤ 5MB | **4.870 KB** | ⚠️ sát trần |
| Texture lớn nhất | 1024² | **1024²** | ✅ |
| **Tam giác vẽ mỗi khung** | — | **86.109** | ✅ thoải mái |
| **Draw calls** | — | **52** | ✅ thoải mái |
| Texture giữ trên GPU | — | 36 | — |
| Geometry giữ trên GPU | — | 39 | — |
| Shader biên dịch | — | 12 | — |
| JS bundle | — | 1.304 KB / **362 KB gzip** | ⚠️ phải tách gói |
| Xuất JSON, phòng đầy đồ | — | 4,4 KB | ✅ |
| FPS | ≥ 60 | **CHƯA ĐO ĐƯỢC THẬT** | ⚠️ |

**Về FPS:** con số đọc được là 144, nhưng đo trong Chromium **headless** — máy
ảo không có GPU thật, không đại diện cho máy người dùng. Phải mở bằng trình
duyệt thật trên máy thật rồi đọc lại bảng đo ở góc dưới bên phải.

Hai con số ĐÁNG TIN vì không phụ thuộc phần cứng:

- **86.109 tam giác/khung** — gồm cả lượt vẽ bóng đổ và postprocessing.
  GPU tích hợp đời nay xử lý vài triệu tam giác/khung, nên còn rất nhiều chỗ trống.
- **52 draw calls** — thấp. Nhờ gộp mảnh tường thành 1 geometry mỗi tường.
  Ngưỡng bắt đầu lo là khoảng 150–200.

Kết luận sơ bộ: **nút thắt không nằm ở hình học mà ở BĂNG THÔNG.** 4,87 MB
tài nguyên cho 7 món là vấn đề lớn hơn nhiều so với 86k tam giác.

---

## Quyết định kỹ thuật

### Đã chốt
- Không CSG — chẻ tường thành 4 mảnh quanh lỗ
- Drag raycast vào `Plane(y=0)`, không vào mesh sàn
- State toàn mm, convert sang mét chỉ khi đưa vào scene
- Pointer Events, không Mouse Events
- **Phòng là ĐA GIÁC, không phải `width × depth`** (đổi ở D3)
- **Chiều trong/ngoài quyết bằng diện tích có dấu**, không thử hướng về tâm phòng
- **Góc tường cắt vát bằng offset đa giác**, không dùng mẹo chẵn/lẻ
- **Mỗi tường là một ĐƯỜNG THẲNG.** Kéo tường nào dời đúng đường đó, tường đối
  diện đứng yên. Cạnh xiên suy ra từ các đường kề, không kéo trực tiếp
  → hình luôn hợp lệ, khỏi phải viết kiểm tra tự cắt
- **Phòng KHÔNG nằm giữa gốc toạ độ.** Camera ngắm tâm hộp bao
- **Bước 1–2 của wizard là 2D**, Bước 3–4 mới là 3D
- **Kiểu cửa/cửa sổ dựng bằng code từ tham số**, không file model

### Chưa chốt — quyết khi đụng tới
- **KTX2 hay JPG?** KTX2 cần copy basis transcoder vào `public/`. Nếu vướng quá thì POC dùng JPG 1024, ghi lại lý do.
- **Kính dùng gì?** `transmission` đẹp nhưng đắt (render target riêng). Nếu FPS tụt ở D6 → hạ về `MeshStandardMaterial` opacity 0.3.
- **`gltf-transform` CLI?** Tiện decimate hàng loạt. Là tool chạy 1 lần trên asset, không phải dep của app — vẫn hỏi trước khi dùng.
- **Thư viện đo FPS:** tự đọc `gl.info` hay dùng `r3f-perf`. Ưu tiên tự viết, khỏi thêm dep.

---

## Nhật ký

Ghi việc bất ngờ / quyết định đổi hướng. 1 dòng, có ngày.

- `2026-08-22` Lập plan. Repo mới, chưa có code.
- `2026-08-22` Xong Ngày 1. Bundle JS sau build: **1090 kB / 299 kB gzip** (three + drei).
  Đây là code, KHÔNG tính vào ngân sách 5MB asset — nhưng vẫn phải ghi vào bảng đo D7.
- `2026-08-22` Version thực tế: React 19.2 · three 0.185 · R3F 9.7 · drei 10.7 · Vite 8.2 · Node 20.20.
- `2026-08-22` three 0.185 cảnh báo `PCFSoftShadowMap has been deprecated` (drei/R3F gọi, không phải code mình).
  Vô hại. Nếu ồn quá thì set `shadows="basic"` trên `<Canvas>`.
- `2026-08-22` Xong Ngày 2.
- `2026-08-22` **Bẫy immer đã dính rồi tự sửa:** so sánh tham chiếu BÊN TRONG hàm `set(s => ...)`
  luôn sai, vì `s.doc` là Proxy draft nên không bao giờ `===` object cũ. Phải đọc bằng `get()`
  NGOÀI draft rồi mới so. Chỗ này quyết định undo có gom bước hay không — D5 kéo item dùng lại
  đúng cơ chế `updateRoom`/`endEdit` này, đừng viết lại kiểu khác.
- `2026-08-22` Undo có TRẦN 50 bước. Nghĩa là undo hết cỡ KHÔNG về được trạng thái ban đầu nếu
  đã làm hơn 50 việc — đúng thiết kế, không phải bug. Ai thắc mắc thì chỉ vào đây.
- `2026-08-22` DEV có `window.__store` để soi state trong console. Vite tự loại khi build production.
- `2026-08-22` **ĐỔI PHẠM VI.** Xem 3 ảnh tham chiếu (wizard chọn hình / kéo kích thước / thêm cửa).
  Chốt làm hết, kéo dài 1 tuần → **12 ngày**. Luồng: chọn hình → kéo kích thước → cửa & cửa sổ → màu.
  Ngày 1–2 đã làm giữ nguyên, Ngày 3 trở đi viết lại hoàn toàn.
- `2026-08-22` **Lệch có chủ ý so với `claude.md`:**
  1. `claude.md` ghi "Không làm: Editor mặt bằng tự do". Vẫn giữ đúng tinh thần — Ngày 5 chỉ cho
     kéo THAM SỐ của preset, không vẽ đa giác tuỳ ý.
  2. `Room` bỏ `width`/`depth`, thay bằng `footprint: Point[]`.
  3. `Wall` thêm `outerStart`/`outerEnd`.
  Nếu sau này POC lên production thì cập nhật `claude.md` theo, đừng để 2 tài liệu chửi nhau.
- `2026-08-22` Xong Ngày 3 (nền đa giác).
- `2026-08-22` **Hai mẹo của bản chữ nhật đã bị XOÁ, đừng vô tình viết lại:**
  1. `innerNormalOf` thử "pháp tuyến nào quay về tâm phòng" — SAI với hình lõm.
     Thay bằng chuẩn hoá chiều quay đa giác rồi lấy thẳng `(-dz, dx)`.
  2. `wallExtendsCorners` kéo dài tường chẵn/lẻ để bịt góc — chỉ đúng góc 90°.
     Thay bằng `offsetPolygon` rồi cắt vát theo đường phân giác.
- `2026-08-22` `ShapeGeometry` lấy toạ độ đỉnh làm UV. Dựng sàn bằng MÉT thì texture chỉ cần
  `repeat = 1/tile(m)` là ra tỉ lệ lát đúng ngoài đời, không phụ thuộc hình dạng phòng.
  Nhờ đó xoá được hàm `applyFloorRepeat`.
- `2026-08-22` Hai thứ hay quên khi xoay geometry:
  `ExtrudeGeometry` đùn theo +Z, `rotateX(+90°)` biến hướng đùn thành −Y nên phải
  `translate(0, height, 0)`. `ShapeGeometry` thì `rotateX(−90°)`, và shape y hoá thành −z
  nên phải nhét sẵn `-z` vào lúc dựng shape.
- `2026-08-22` Geometry dựng bằng tay PHẢI `dispose()` lúc unmount. Kéo slider hình = dựng lại
  geometry mỗi frame, không dispose là rò VRAM.
- `2026-08-22` **SỬA MÔ HÌNH HÌNH (góp ý ảnh 4).** Bản đầu của `shapes.ts` dùng tham số
  `width`/`depth`/`cutW`... rồi vẽ hình quanh gốc toạ độ. Hậu quả: đổi `width` thì HAI tường
  trái/phải cùng chạy — đối xứng, sai hẳn so với sản phẩm tham chiếu.
  Thay bằng **lưới đường thẳng**: mỗi tường là một đường, đỉnh đa giác là giao của
  1 đường x với 1 đường z. Kéo tường nào dời đúng đường đó.
  Kiểm: kéo tường trái 800mm → `x1` không nhúc nhích, `footprint` minX đổi từ -2000 sang -2800.
- `2026-08-22` Hệ quả của mô hình mới: **phòng không còn nằm giữa gốc toạ độ**.
  `OrbitControls.target` phải lấy tâm hộp bao `bounds(footprint)`, ngắm gốc toạ độ là nhìn ra rìa.
- `2026-08-22` Chốt: **Bước 1–2 của wizard làm bằng 2D (SVG), Bước 3–4 mới bật 3D.**
  Kéo tường trong phối cảnh 3D vừa khó ngắm vừa phải viết gizmo. Không mount `<Canvas>`
  ở bước 1–2, đỡ tốn WebGL context lúc chưa cần.
- `2026-08-22` Xong Ngày 4 + Ngày 5 (gộp, vì góp ý ảnh 6 làm rõ luôn cách tương tác).
- `2026-08-22` **Bỏ hẳn slider kích thước.** Thao tác thẳng trên mặt bằng: kéo tường, tường
  đang trỏ tô vàng, con trỏ đổi hình (`ew-resize`/`ns-resize`/`grabbing`). Còn đúng 1 slider
  là chiều cao trần — thứ không nhìn thấy được trên mặt bằng.
- `2026-08-22` **Đèn trần sinh tự động theo kích thước phòng** (thấy trong ảnh tham chiếu:
  phòng vuông ra 4 vũng sáng 2×2, phòng rộng ra 3 vũng một hàng). `LIGHT_SPACING = 2000mm`.
  Điểm lưới rơi ngoài đa giác bị loại — cần cho hình L/T/U.
- `2026-08-22` `FloorPlan2D` vẽ trong hệ PIXEL, không nhét mm vào `viewBox`. Nhét mm thì
  cỡ chữ và bề dày nét co giãn theo kích thước phòng — phòng to là chữ bé tí.
- `2026-08-22` Đụng tên file trên Windows: `ceilingLights.ts` và `CeilingLights.tsx` chỉ khác
  hoa/thường → TS báo lỗi, Vite resolve nhầm. Đổi tên module toán thành `ceilingLightGrid.ts`.
  Nhớ: đừng đặt file `.ts` và `.tsx` cùng tên chỉ khác hoa/thường.

### Vòng sửa theo góp ý ảnh 7–9

- `2026-08-22` **Bước 1–2 quay lại dùng 3D**, không phải mặt bằng phẳng. Camera KHOÁ nhìn từ
  trên xuống, không cho xoay. Lớp phủ đo/kéo (`PlanOverlay`) vẽ đè lên ảnh 3D.
  Nhìn từ trên xuống mới thấy được góc phòng vát hay vuông.
- `2026-08-22` Camera trên xuống dùng PHỐI CẢNH chứ không trực giao — trực giao chỉ thấy mặt
  TRÊN tường, phẳng lì. Nhưng FOV phải HẸP: camera cách sàn `d`, mặt trên tường cách `d - h`
  nên phóng to `d/(d-h)` lần. FOV 38° cho `d ≈ 5.5m` → tường loe GẤP ĐÔI sàn, tràn khung.
  Chốt FOV **16°** → `d ≈ 14m`, tỉ số còn ~1.24.
  `TOP_FOV` phải DÙNG CHUNG giữa camera và lớp phủ, lệch là nhãn đo trượt khỏi tường.
- `2026-08-22` **Đường bao vẽ ở ĐỈNH tường (mép ngoài), không phải chân tường.** Vẽ ở chân
  tường thì hình L / chữ U có đoạn tường nằm lọt dưới đáy hõm, bị chính tường che.
  Muốn vẽ đúng đỉnh phải nhân thêm hệ số phối cảnh `d/(d-h)` — xem `projectAt`.
- `2026-08-22` Kéo tường tính theo **ĐỘ DỜI** con trỏ, không theo vị trí tuyệt đối. Đường bao
  ở mép ngoài còn tham số là mép trong, lệch nhau `WALL_THICKNESS`; dùng độ dời thì tự triệt tiêu.
- `2026-08-22` **Bước 1 không vẽ gì lên hình** — không đường bao, không nhãn đo, không cả vệt
  vàng khi trỏ. Vẫn kéo tường được và con trỏ vẫn đổi hình.
- `2026-08-22` **Nền khung xem đổi sang XÁM SÁNG** `#d7d7db`. Đường bao màu đen để trên nền
  tối thì chìm nghỉm. Nét vẽ hạ xuống 3.5px cho khỏi phủ kín bề dày tường.
- `2026-08-22` `WALL_THICKNESS` hạ còn **40mm** — mỏng hơn tường thật nhiều (vách thạch cao
  ~100mm). Con số THẨM MỸ, không phải số đo xây dựng. Cần đo thật thì sửa một chỗ đó.
- `2026-08-22` **Khung nhìn ĐÔNG CỨNG lúc kéo tường**, nhả chuột xong mới canh giữa lại.
  Không đông cứng thì kéo một cạnh mà cả phòng trôi và co — như đang thu nhỏ cả căn nhà.
- `2026-08-22` Chuyển động canh giữa tính theo THỜI GIAN (`1 - exp(-λ·dt)`), không theo số
  frame. Theo frame thì tab chạy nền (trình duyệt hạ rAF xuống vài fps) sẽ trôi cực chậm.
- `2026-08-22` ⚠️ **Chưa đo được** chuyển động canh giữa sau khi nhả chuột: Chromium headless
  hạ rAF thất thường (có lần 0 frame trong 900ms) nên số đo không tin cậy. Phần ĐÔNG CỨNG
  lúc kéo thì đã đo chắc chắn. Mở bằng trình duyệt thật để mắt thấy.
- `2026-08-22` Xong Ngày 6 (hình học cửa/cửa sổ).
- `2026-08-22` **Bẫy đã dính: `set({ camera })` của r3f là thay VĨNH VIỄN.** `TopDownCamera`
  chiếm camera ở Bước 1–2, sang Bước 3–4 vẫn dính góc nhìn từ trên xuống, xoay không được.
  Phải nhớ camera cũ lúc mount rồi trả lại lúc unmount. Tách làm 2 effect: một cái
  cài/trả (deps rỗng), một cái cập nhật thông số (deps `[view, size]`) — gộp chung thì
  lần chạy thứ hai sẽ "nhớ" chính camera của mình làm camera cũ.
- `2026-08-22` `outerAt(t)` trong `wallGeometry` phải CHIẾU VUÔNG GÓC, không nội suy tuyến
  tính theo tỉ lệ. Mặt trong và mặt ngoài song song nhưng DÀI KHÁC NHAU vì hai đầu cắt vát.
- `2026-08-22` Xong Ngày 7 (UI đặt cửa & cửa sổ).
- `2026-08-22` `Opening` thêm `styleId`. Kiểu quyết định cách chia ô / kính hay đặc, còn
  `width`/`height`/`elevation` thì sửa riêng từng cái được — chọn kiểu chỉ là lấy giá trị mặc định.
- `2026-08-22` Tấm kính/cánh là MỘT tấm liền, nẹp chia ô vẽ đè lên phía trước. Cắt tấm
  thành từng ô nhỏ thì đúng hơn nhưng tốn gấp `cols × rows` lần geometry mà nhìn không khác.
- `2026-08-22` Bấm vào cửa phải `stopPropagation`, không thì sự kiện lọt xuống tường và
  đặt thêm một cái cửa mới ngay chỗ vừa bấm.
- `2026-08-22` Bóng mờ báo chỗ đặt phải `raycast={() => null}` — không thì chính nó chắn
  tia, rê chuột là giật liên tục.
- `2026-08-22` Rời bước wizard thì HẠ NÒNG kiểu cửa đang chọn (`armedStyleId = null`),
  khỏi lỡ tay bấm ra cửa lúc đang chọn màu.
- `2026-08-22` Xong Ngày 8 (Bước 4 + chế độ thiết kế). **Wizard 4 bước chạy trọn vẹn.**
- `2026-08-22` Nhảy tới lui giữa các bước KHÔNG mất dữ liệu, vì toàn bộ thiết kế nằm ở
  `designStore` còn "đang ở bước mấy" chỉ là state UI. Đây là lợi ích cụ thể của việc
  tách hai store ngay từ Ngày 4 — nếu nhét chung thì giờ phải viết code khôi phục.
- `2026-08-22` Panel chế độ thiết kế CỐ Ý không lặp lại giao diện từng bước. Chỗ nào cần
  sửa thì bấm nút quay về đúng bước đó. Ít code hơn, và chỉ có một chỗ duy nhất biết cách
  sửa mỗi thứ.
- `2026-08-22` Tóm tắt phòng dùng diện tích sàn THẬT của đa giác (`signedArea`), không phải
  diện tích hộp bao — hình L/U thì hai số này lệch nhau nhiều.
- `2026-08-22` Xong Ngày 9 phần code. **D9-1/D9-2 BỊ CHẶN: khách chưa gửi model .glb.**
  Không chờ — dựng KHỐI TẠM ghép từ vài hộp, kích thước lấy đúng `product.size` thật.
  Nhờ vậy D10 (kéo thả, snap tường) và D11 (đường đo) làm được ngay, không phải chờ asset.
  Có file rồi thì chỉ điền `modelUrl` trong `products.ts`.
- `2026-08-22` Khối tạm CÓ DÁNG chứ không phải hộp trơn — bàn có chân, ghế có lưng tựa,
  sofa có tay vịn. Hộp trơn thì bố trí phòng không phân biệt nổi cái gì với cái gì,
  mà đó lại đúng là thứ POC cần kiểm chứng.
- `2026-08-22` Gốc toạ độ của món đồ nằm GIỮA ĐÁY (y=0 là mặt sàn). Quy ước này làm
  snap tường và đường đo đơn giản hẳn — khỏi bù trừ chiều cao ở mỗi phép tính.
- `2026-08-22` `deleteSelected()` nằm ở STORE, tự phân biệt id đang chọn là cửa hay món đồ.
  Tầng UI không có lý do gì phải biết chuyện đó.
- `2026-08-22` ⚠️ `EffectComposer` (outline vàng) THAY đường ống render của three.
  Phải đo lại FPS ở D12. Đắt quá thì đổi sang vẽ khung dây bao quanh.
- `2026-08-22` **Đổi ý: lấy model CC0 THẬT về dùng luôn thay vì chờ khách.** POC này mục
  tiêu chính là ĐO tris và dung lượng — khối tạm không đo được gì cả. Poly Haven có API
  tải tự động, 7 model nội thất CC0. Khối tạm vẫn giữ làm dự phòng cho món chưa có model.
- `2026-08-22` **Số đo ngân sách đầu tiên có thật:** tris cao nhất 19.992 / 50k ✅,
  texture 1024² ✅, tổng tải **4.870 KB / 5MB** ⚠️ SÁT TRẦN — mà chưa tính HDRI môi trường
  và texture sàn. Thêm model là vỡ ngân sách. Cần nén KTX2 hoặc hạ texture 512² ở D12.
- `2026-08-22` Model tải về KHÔNG cần decimate — Poly Haven đã tối ưu sẵn. Đây là lý do
  nên ưu tiên nguồn này thay vì Sketchfab (model ở đó hay 300k+ tris).
- `2026-08-22` **Tên sản phẩm phải khớp model thật.** Đoán mò là sai: `WoodenTable_02`
  hoá ra là cái đôn 301mm chứ không phải bàn ăn, `WoodenChair_01` cao **2274mm** — ghế
  lưng cao chứ không phải ghế ăn. Đo xong mới đặt tên.
- `2026-08-22` `GltfModel` CHUẨN HOÁ GỐC TOẠ ĐỘ về "tâm đáy" bằng `Box3`. Mỗi model đặt
  gốc một kiểu; không chuẩn hoá là đồ lún xuống sàn hoặc bay lơ lửng. Đây cũng là chỗ
  in ra kích thước đo được để chép vào `products.ts`.
- `2026-08-22` Xong Ngày 10 (kéo thả + hút tường).
- `2026-08-22` **BUG dấu phẩy động, test kéo mới lòi ra:** kéo đồ ra ngoài phòng thì
  `closestPointOnPolygon` hút nó về ĐÚNG đường tường, nhưng phép chiếu để lại sai số
  cỡ `-1e-10`. `snapToWall` loại mọi khoảng cách âm → đồ đứng chết trên đường tường
  thay vì hút vào trong. Thêm `OUTSIDE_TOLERANCE = 5mm`. Đã bổ sung case này vào self-check.
  Bài học: khi hai phép tính hình học nối tiếp nhau, phép sau phải chấp nhận sai số của phép trước.
- `2026-08-22` Kéo đồ PHẢI tắt `controls.enabled`. `stopPropagation` của R3F chỉ chặn trong
  cây scene, còn OrbitControls nghe sự kiện DOM trên canvas nên vẫn xoay camera theo.
- `2026-08-22` Hút tường lúc kéo dùng `setItemRotation` (live), KHÔNG dùng `rotateItem`
  (cái này chốt history ngay). Không phân biệt là một lần kéo đẻ ra hàng chục bước undo.
- `2026-08-22` Giả định: **lưng đồ nằm ở −Z cục bộ** của model. Đúng với 7 model Poly Haven
  đang dùng (đã xem mắt). Model khách gửi có thể quay kiểu khác → lúc đó cần thêm trường
  `frontAxis` trong `products.ts`.
- `2026-08-22` Xong Ngày 11 và Ngày 12. **HẾT KẾ HOẠCH 12 NGÀY.**
- `2026-08-22` **Bẫy đo đạc:** `gl.info` tự reset sau mỗi `render()`. `EffectComposer` render
  nhiều lượt một khung nên đọc kiểu mặc định chỉ thấy lượt CUỐI — cú vẽ một tam giác phủ
  toàn màn hình, ra đúng "1 draw call, 1 tam giác". Số quá đẹp thì phải nghi ngờ trước khi
  mừng. Sửa: tắt `autoReset`, cộng dồn cả khung.
- `2026-08-22` **Kết quả bất ngờ nhất: nút thắt là BĂNG THÔNG, không phải hình học.**
  86k tam giác + 52 draw calls là nhẹ, nhưng 7 model đã ăn 4,87MB / 5MB.
- `2026-08-22` Viết `TONG-QUAN.md` (công nghệ + hướng đưa vào web bán hàng) và
  `KET-LUAN.md` (kết luận POC). Ba việc chặn mọi thứ còn lại: đo FPS máy thật,
  chốt hợp đồng với bên 3D, xin model mẫu chạy thử.
- `2026-08-22` Đính chính: có **9** bộ self-check, không phải 10 như tôi nói lúc trước.
