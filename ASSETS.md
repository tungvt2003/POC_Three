# ASSETS

Ghi ngay lúc tải, đừng để cuối tuần — sẽ quên nguồn.
Model CC-BY **bắt buộc** ghi tên tác giả. CC0 thì không bắt buộc, nhưng vẫn ghi
nguồn để sau này còn tìm lại được.

## Model nội thất

Tất cả từ **Poly Haven**, giấy phép **CC0** (miễn phí hoàn toàn, dùng được cả
cho mục đích thương mại, không cần ghi công).

Định dạng tải: **glTF 1k** — gồm `.gltf` + `.bin` + 3 texture JPEG 1024²
(diffuse / normal / ARM). Đúng ngân sách `texture 1024²` trong `claude.md`.

| Sản phẩm | Model | Tris | Dung lượng | Kích thước ĐO ĐƯỢC (mm) | Ngày tải |
|---|---|---|---|---|---|
| Sofa 2 chỗ | Sofa_01 | 4.101 | 506 KB | 1571 × 658 × 797 | 2026-08-22 |
| Ghế bành | ArmChair_01 | 5.626 | 751 KB | 848 × 766 × 1065 | 2026-08-22 |
| Bàn trà | CoffeeTable_01 | 10.404 | 935 KB | 1540 × 973 × 523 | 2026-08-22 |
| Bàn dài | WoodenTable_01 | 952 | 541 KB | 1800 × 657 × 549 | 2026-08-22 |
| Đôn gỗ | WoodenTable_02 | 1.514 | 492 KB | 301 × 301 × 418 | 2026-08-22 |
| Ghế lưng cao | WoodenChair_01 | 19.992 | 1.054 KB | 688 × 658 × 2274 | 2026-08-22 |
| Kệ sách | Shelf_01 | 182 | 591 KB | 1003 × 257 × 2080 | 2026-08-22 |
| **Cộng** | 7 model | **42.771** | **4.870 KB** | | |

Nguồn: `https://polyhaven.com/a/<tên model>`
Tải qua API: `https://api.polyhaven.com/files/<tên model>` → `gltf.1k.gltf`

### Đối chiếu ngân sách (`claude.md`)

| Ngân sách | Chốt | Thực tế | Đạt |
|---|---|---|---|
| Tris mỗi model | ≤ 50k | cao nhất 19.992 (WoodenChair_01) | ✅ |
| Texture | 1024² | 1024² (bản 1k) | ✅ |
| Tổng tải một phòng đầy đồ | ≤ 5MB | 4.870 KB nếu dùng CẢ 7 model | ⚠️ sát trần |

⚠️ **Sát trần 5MB.** Bảy model đã ăn gần hết ngân sách, chưa tính HDRI môi
trường và texture sàn. Thêm model nữa thì phải nén texture (KTX2) hoặc hạ
xuống bản 512². Đo lại ở D12.

Không model nào cần decimate — Poly Haven đã tối ưu sẵn.

## Chưa có

| Thứ | Tình trạng |
|---|---|
| Thảm | Chưa tìm được model CC0 → đang dùng khối tạm trong `ProxyModel.tsx` |
| `env.hdr` | Chưa tải. Poly Haven có sẵn HDRI CC0, lấy khi làm D11 |
| Texture sàn | Đang sinh bằng `<canvas>` (`floorTexture.ts`). Ảnh thật: ambientcg.com |

## Cách thêm model mới

1. Tìm trên polyhaven.com (lọc CC0) hoặc nguồn CC0 khác
2. Tải bản **gltf 1k** vào `public/assets/models/<Tên>/`
3. Chạy DEV, thêm món đó vào phòng, đọc log `model X: w=… d=… h=…`
4. Chép đúng số đó vào `size` trong `products.ts` — **đừng ước lượng**,
   snap tường và đường đo lấy từ số này
5. Ghi một dòng vào bảng trên

## Nguồn CC0 tin được

- polyhaven.com — model, HDRI, texture. CC0, có API tải tự động
- quaternius.com — CC0, low-poly sẵn
- kenney.nl/assets — CC0, cực nhẹ
- ambientcg.com — CC0, texture

## Cẩn thận

- **Sketchfab free** đa số là CC-BY → phải ghi tác giả vào bảng trên
- **Không lấy model hãng thật** (IKEA, Herman Miller…) — kiểu dáng có bản quyền
