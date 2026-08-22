# Room Designer POC

Công cụ thiết kế phòng 3D chạy trên trình duyệt. Người dùng chọn phòng mẫu,
đổi màu tường/sàn, kéo thả nội thất, xoay ngắm 360°.

Đây là bản POC 1 tuần để kiểm chứng kỹ thuật và đo hiệu năng — KHÔNG phải bản
production. Ưu tiên chạy được và đo được, không tối ưu sớm.

## Stack

- Vite + React + TypeScript (KHÔNG dùng Next.js — không cần SSR, HMR nhanh hơn)
- three.js qua @react-three/fiber
- @react-three/drei cho camera controls, environment, loaders
- @react-three/postprocessing cho outline khi select
- zustand + immer cho state và undo/redo

Chưa cần backend ở giai đoạn POC. State giữ trong memory, có thể export JSON.

## Quy ước bắt buộc

**Đơn vị:** mọi thứ trong state lưu bằng MILIMET (number). Chỉ format sang
inch/feet/cm ở tầng hiển thị. Không bao giờ để chuỗi "7'6"" lọt vào state.

**Toạ độ three.js:** 1 unit = 1 mét. Convert mm → m khi đưa vào scene.

**Input events:** LUÔN dùng Pointer Events (onPointerDown/Move/Up).
KHÔNG dùng onMouseDown/onMouseMove — sẽ phải viết lại khi làm mobile.

**Tách logic khỏi input:** hàm thao tác nhận toạ độ world, không biết
lệnh đến từ chuột hay ngón tay. Ví dụ `moveItem(id, worldPos)`.

**Ngân sách hiệu năng (chốt cứng, không nới):**
- ≤ 50k tam giác mỗi model
- texture 1024², định dạng KTX2 nếu có
- ≤ 5MB tổng cho một phòng đầy đồ

## Mô hình dữ liệu

Tường và sàn sinh bằng code từ tham số, KHÔNG load từ file.

```ts
type Room = {
  width: number      // mm
  depth: number      // mm
  height: number     // mm, chiều cao trần
  wallColor: string
  floorMaterialId: string
}

type Wall = {
  id: string
  start: { x: number; z: number }   // mm
  end: { x: number; z: number }
  innerNormal: Vector3              // tính sẵn 1 lần, không tính lại mỗi frame
  openings: Opening[]
}

// Cửa/cửa sổ KHÔNG lưu toạ độ world. Luôn là con của một tường.
type Opening = {
  id: string
  wallId: string
  t: number           // mm, khoảng cách từ điểm start của tường
  elevation: number   // mm, mép dưới cách sàn. Cửa đi = 0
  width: number
  height: number
  kind: 'door' | 'window'
}

type Item = {
  id: string
  productId: string
  position: { x: number; z: number }   // mm, y luôn = 0 (đứng trên sàn)
  rotationY: number                    // radian
  placement: 'floor' | 'rug' | 'wall'
}
```

## Hành vi cần đúng

**Kéo thả nội thất:** raycast xuống mặt phẳng y=0 (dùng `Plane`), KHÔNG raycast
vào mesh sàn. Ổn định hơn và không phụ thuộc hình dạng sàn.

**Thảm (placement 'rug'):** bỏ qua collision, đặt y = 0.001 và bật
`polygonOffset` để tránh z-fighting với sàn. Đồ khác được phép đè lên.

**Snap tường:** nếu tâm đồ cách tường dưới 400mm thì hút sát và tự xoay
lưng vào tường.

**Ẩn tường theo góc nhìn:** mỗi frame tính `wall.innerNormal.dot(camDir)`.
Nếu > 0.05 thì fade opacity về 0 (dùng `MathUtils.damp`, KHÔNG bật/tắt đột ngột).
Cửa/cửa sổ phải là con của group tường để mờ đi cùng nhau.

**Đường đo kích thước:** lấy `Box3` của item, tính khoảng cách tới tường gần
nhất theo từng trục. Nhãn số render bằng `<Html>` của drei (DOM thật).
Nếu khoảng hở < 600mm thì đổi nhãn sang màu đỏ (cảnh báo lối đi hẹp).

## Cấu trúc thư mục

```
src/
  designer/        # toàn bộ code 3D, không import gì ngoài React + three
    scene/         # Room, Wall, Floor, Opening, Item
    controls/      # drag, rotate, camera presets
    store/         # zustand
  ui/              # panel, toolbar, DOM đè lên canvas
  lib/units.ts     # convert mm <-> m, format inch/cm
public/assets/
  env.hdr
  models/*.glb
  textures/floor/*
ASSETS.md          # mỗi model 1 dòng: tên | nguồn | license | url | ngày tải
```

## Phạm vi POC

Làm:
- 1 phòng chữ nhật sinh theo tham số
- Cửa + cửa sổ dựng bằng code (box ghép, kính transparent) — chưa cần model đẹp
- Load 4–5 file .glb, kéo thả, xoay, xóa
- Outline vàng khi select
- Đường đo kích thước tới tường
- Camera preset: Top view (orthographic) + Dollhouse
- Ẩn tường theo góc nhìn
- Đo FPS và dung lượng tải

Không làm:
- Editor mặt bằng tự do
- CSG đục lỗ tường (dùng cách chẻ tường thành 4 mảnh quanh lỗ)
- Giao diện mobile, gesture chạm
- Backend, đăng nhập, giỏ hàng
- Biến thể màu/kích thước sản phẩm

## Lưu ý khi làm việc

- Giải thích kỹ khi đụng tới three.js — tôi mạnh frontend React nhưng mới với 3D.
- Trước khi thêm thư viện mới, hỏi trước.
- Ưu tiên code đơn giản đọc được hơn code tối ưu.