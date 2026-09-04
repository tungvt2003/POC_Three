import type { Vector3 } from 'three'
import type { Point } from '../lib/polygon'
import type { ShapeId } from './catalog/shapes'

/**
 * Mô hình dữ liệu. MỌI số đo là MILIMET.
 * Không bao giờ để chuỗi đã format (`7'6"`) lọt vào đây.
 *
 * LỆCH so với type mẫu trong `claude.md`, cố ý (xem nhật ký PLAN.md 2026-08-22):
 *   - `Room` bỏ `width`/`depth`, thay bằng `footprint` đa giác
 *   - `Wall` thêm `outerStart`/`outerEnd`
 * Lý do: phòng không còn chỉ là hình chữ nhật.
 */

export type Room = {
  shapeId: ShapeId
  /** mm. Tham số của preset hình. Bước 2 wizard kéo cạnh là sửa mấy số này. */
  shapeParams: Record<string, number>
  /**
   * mm. Đa giác MẶT TRONG phòng, chiều quay dương.
   * Dẫn xuất từ `shapeId` + `shapeParams` — luôn sinh lại cả cụm, đừng sửa lẻ.
   */
  footprint: Point[]
  height: number // mm, cao trần
  wallColor: string
  floorMaterialId: string
}

export type Wall = {
  id: string
  /** mm, trên MẶT TRONG của tường */
  start: Point
  end: Point
  /**
   * mm, 2 đỉnh MẶT NGOÀI tương ứng. Đã cắt vát theo đường phân giác của góc,
   * nên tường kề nhau khít nhau, không hở cũng không chồng khối.
   */
  outerStart: Point
  outerEnd: Point
  /** Vector đơn vị trỏ vào trong phòng. Tính sẵn 1 lần, không tính lại mỗi frame. */
  innerNormal: Vector3
  openings: Opening[]
}

/** Cửa/cửa sổ KHÔNG lưu toạ độ world. Luôn là con của một tường. */
export type Opening = {
  id: string
  wallId: string
  /** Kiểu trong `catalog/openings.ts` — quyết định cách chia ô, kính hay đặc. */
  styleId: string
  t: number // mm, khoảng cách dọc tường tính từ điểm start
  elevation: number // mm, mép dưới cách sàn. Cửa đi = 0
  width: number
  height: number
  kind: 'door' | 'window'
}

export type Item = {
  id: string
  productId: string
  position: Point // mm, y luôn = 0 (đứng trên sàn)
  rotationY: number // radian
  placement: 'floor' | 'rug' | 'wall'
  /**
   * Màu người dùng chọn, đè lên màu gốc. Bỏ trống = giữ nguyên vật liệu của
   * model. Chỉ là màu, KHÔNG phải mã biến thể sản phẩm — POC không làm SKU.
   */
  color?: string
}
