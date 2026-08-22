import { Vector3 } from 'three'
import { SHAPES, buildFootprint } from '../catalog/shapes'
import { ensurePositiveWinding, offsetPolygon, type Point } from '../../lib/polygon'
import type { Wall } from '../types'

/**
 * mm. Độ dày tường, tính từ mặt trong ra ngoài.
 *
 * 40mm MỎNG hơn tường thật khá nhiều (vách thạch cao ~100mm, tường gạch
 * 110–220mm). Chọn thế vì nhìn từ trên xuống, mặt trên tường còn bị phối cảnh
 * phóng to ~1.24 lần nên tường dày trông rất nặng nề.
 *
 * Đây là con số THẨM MỸ, không phải số đo thật. Cần đúng kích thước xây dựng
 * (tính diện tích sàn, đặt cửa dày bao nhiêu) thì sửa đúng một chỗ này.
 */
export const WALL_THICKNESS = 40

/**
 * Sinh tường từ đa giác mặt bằng. Mỗi cạnh của đa giác thành một bức tường.
 *
 * Hai việc quan trọng:
 *
 * 1. CHIỀU TRONG/NGOÀI quyết bằng chiều quay của đa giác, không phải bằng
 *    hướng về tâm phòng. Sau `ensurePositiveWinding`, pháp tuyến trong LUÔN
 *    là `(-dz, dx)` với mọi cạnh. Phép thử "quay về tâm" của bản chữ nhật
 *    cũ SAI với hình lõm (L/T/U) vì tâm hình có thể nằm ngoài phòng.
 *
 * 2. GÓC TƯỜNG cắt vát bằng cách đẩy cả đa giác ra ngoài `WALL_THICKNESS`.
 *    Đỉnh ngoài thứ i chính là mối nối vát tại đỉnh trong thứ i. Đúng với
 *    mọi góc — 90° của chữ nhật, 135° của hình vát, 270° lõm của hình L.
 *    Không hở, không chồng khối (chồng khối sẽ đậm màu khi fade tường).
 */
export function buildWalls(footprint: Point[]): Wall[] {
  const inner = ensurePositiveWinding(footprint)
  const outer = offsetPolygon(inner, WALL_THICKNESS)
  const n = inner.length

  return inner.map((start, i) => {
    const j = (i + 1) % n
    const end = inner[j]

    const dx = end.x - start.x
    const dz = end.z - start.z
    const len = Math.hypot(dx, dz)

    return {
      id: `wall-${i}`,
      start,
      end,
      outerStart: outer[i],
      outerEnd: outer[j],
      // Chiều quay dương => (-dz, dx) trỏ vào trong. Không cần thử gì thêm.
      innerNormal: new Vector3(-dz / len, 0, dx / len),
      openings: [],
    }
  })
}

/** mm. Chiều dài mặt trong của tường. */
export function wallLength(wall: Wall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckWalls(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `buildWalls: ${msg}`)

  for (const def of SHAPES) {
    const name = def.id
    const footprint = buildFootprint(def.id, def.defaults)
    const walls = buildWalls(footprint)
    assert(
      walls.length === def.vertices.length,
      `${name}: cần ${def.vertices.length} tường, có ${walls.length}`,
    )

    for (const w of walls) {
      const nrm = w.innerNormal
      assert(Math.abs(nrm.length() - 1) < 1e-9, `${name}/${w.id}: innerNormal không đơn vị`)
      assert(Math.abs(nrm.y) < 1e-9, `${name}/${w.id}: innerNormal có thành phần Y`)

      // Pháp tuyến TRONG phải vuông góc với tường
      const dx = w.end.x - w.start.x
      const dz = w.end.z - w.start.z
      const len = Math.hypot(dx, dz)
      const dot = (nrm.x * dx + nrm.z * dz) / len
      assert(Math.abs(dot) < 1e-9, `${name}/${w.id}: innerNormal không vuông góc tường`)

      // Đỉnh ngoài phải nằm về phía NGƯỢC với pháp tuyến trong, cách đúng
      // WALL_THICKNESS theo phương pháp tuyến.
      const offX = w.outerStart.x - w.start.x
      const offZ = w.outerStart.z - w.start.z
      const alongNormal = offX * nrm.x + offZ * nrm.z
      assert(
        Math.abs(alongNormal + WALL_THICKNESS) < 1e-6,
        `${name}/${w.id}: đỉnh ngoài lệch ${alongNormal.toFixed(2)}mm, phải là -${WALL_THICKNESS}`,
      )
    }

    // Tường kề nhau phải DÙNG CHUNG đỉnh — đó là bằng chứng không hở không chồng
    for (let i = 0; i < walls.length; i++) {
      const cur = walls[i]
      const next = walls[(i + 1) % walls.length]
      assert(
        cur.end.x === next.start.x && cur.end.z === next.start.z,
        `${name}: mép trong ${cur.id}→${next.id} không khớp`,
      )
      assert(
        Math.abs(cur.outerEnd.x - next.outerStart.x) < 1e-6 &&
          Math.abs(cur.outerEnd.z - next.outerStart.z) < 1e-6,
        `${name}: mép ngoài ${cur.id}→${next.id} không khớp`,
      )
    }
  }

  console.info(`buildWalls self-check xong — ${SHAPES.length} hình`)
}
