import { closestPointOnPolygon, pointInPolygon, type Point } from '../../lib/polygon'
import { itemFootprint } from './clearance'

/** mm. Dưới mức này coi như đã nằm gọn trong phòng, khỏi đẩy thêm. */
const EPS = 0.5

/**
 * Số vòng đẩy tối đa. Mỗi vòng chỉ chữa được góc lấn sâu nhất; góc khác có thể
 * lòi ra sau đó, nên phải lặp. 6 vòng là thừa cho hình chữ nhật / L / U;
 * món đồ TO HƠN cả phòng thì không có lời giải, cắt vòng lặp cho khỏi treo.
 */
const MAX_PASS = 6

/**
 * Kéo tâm món đồ về sao cho CẢ KHỐI nằm trong phòng, không chỉ mỗi cái tâm.
 *
 * Trước đây chỉ kiểm tra tâm (`pointInPolygon`), nên cái sofa dài 2.2m kéo sát
 * tường là thò hẳn một nửa ra ngoài nhà.
 *
 * Cách làm: lấy 4 góc hình chiếu bằng ĐÃ XOAY, góc nào lọt ra ngoài đa giác thì
 * tính vector kéo nó về mép gần nhất, rồi dời cả món đồ theo vector DÀI NHẤT.
 * Lặp lại tới khi không góc nào lòi ra.
 *
 * Dùng `closestPointOnPolygon` chứ không phải hộp bao: hình L có phần bị khoét,
 * hộp bao vẫn cho món đồ nằm trong chỗ khoét đó.
 *
 * THUẦN HÀM — không đụng store, không biết chuột hay ngón tay.
 */
export function containInRoom(
  center: Point,
  widthMm: number,
  depthMm: number,
  rotationY: number,
  footprint: Point[],
): Point {
  let c = center

  for (let pass = 0; pass < MAX_PASS; pass++) {
    const corners = itemFootprint(c, widthMm, depthMm, rotationY)

    let bestX = 0
    let bestZ = 0
    let best = 0

    for (const corner of corners) {
      if (pointInPolygon(corner, footprint)) continue

      const foot = closestPointOnPolygon(corner, footprint)
      const dx = foot.x - corner.x
      const dz = foot.z - corner.z
      const len = Math.hypot(dx, dz)
      if (len <= best) continue

      best = len
      bestX = dx
      bestZ = dz
    }

    if (best < EPS) break
    c = { x: c.x + bestX, z: c.z + bestZ }
  }

  return c
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckContain(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `containItem: ${msg}`)

  // Phòng 4×3 m, tâm ở gốc toạ độ
  const room: Point[] = [
    { x: -2000, z: -1500 },
    { x: 2000, z: -1500 },
    { x: 2000, z: 1500 },
    { x: -2000, z: 1500 },
  ]

  // Sofa 2200×900 đẩy sát mép phải: tâm phải lùi về x = 2000 − 1100 = 900
  const pushed = containInRoom({ x: 1900, z: 0 }, 2200, 900, 0, room)
  assert(Math.abs(pushed.x - 900) < 1, `mép phải: tâm ra ${pushed.x.toFixed(0)}, cần 900`)
  assert(Math.abs(pushed.z) < 1, 'không được xê dịch theo trục còn lại')

  // Đã nằm gọn thì giữ nguyên, không được "chỉnh" thêm
  const inside = containInRoom({ x: 0, z: 0 }, 1000, 600, 0, room)
  assert(inside.x === 0 && inside.z === 0, 'món đồ đang nằm gọn mà vẫn bị dời')

  // Xoay 90°: chiều rộng đổi sang trục Z, giới hạn đổi theo
  const turned = containInRoom({ x: 0, z: 1400 }, 2200, 900, Math.PI / 2, room)
  assert(Math.abs(turned.z - 400) < 1, `xoay 90°: tâm z ra ${turned.z.toFixed(0)}, cần 400`)

  // Góc phòng: phải chui vào trong theo CẢ HAI trục, không chỉ một
  const corner = containInRoom({ x: 1900, z: 1400 }, 1000, 800, 0, room)
  assert(
    corner.x <= 1500 + 1 && corner.z <= 1100 + 1,
    `góc phòng: ra (${corner.x.toFixed(0)}, ${corner.z.toFixed(0)})`,
  )

  console.info('containItem self-check xong')
}
