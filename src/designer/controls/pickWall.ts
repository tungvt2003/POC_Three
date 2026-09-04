import type { Ray } from 'three'
import { Plane, Vector3 } from 'three'
import { m2mm, mm2m } from '../../lib/units'
import { wallLength } from '../scene/buildWalls'
import { tAlongWall } from '../scene/wallGeometry'
import type { Wall } from '../types'

/** mm. Cho phép con trỏ trượt ra ngoài mép tường chừng này rồi mới coi là mất bám. */
const SLACK = 400

export type WallHit = {
  wall: Wall
  /** mm, vị trí dọc tường, đã kẹp vào [0, L]. */
  t: number
  /** mm, cao độ so với sàn, đã kẹp vào [0, height]. */
  y: number
  /** mét, khoảng cách từ gốc tia — dùng để chọn bức tường gần nhất. */
  distance: number
}

/**
 * Tia chuột đang trỏ vào MẶT TRONG của bức tường nào, ở đâu.
 *
 * Cắt vào MẶT PHẲNG toán học của tường chứ không raycast vào mesh — cùng lý do
 * với việc kéo đồ trên sàn (`useDragItem`): mesh tường đã bị chẻ nát quanh các
 * lỗ cửa, kéo cửa qua chính cái lỗ của nó là tia lọt ra ngoài và cửa đứng hình.
 *
 * Nhờ vậy kéo cửa vòng qua GÓC sang tường khác cũng chạy, không phải nhấc lên
 * đặt lại.
 *
 * THUẦN HÀM theo nghĩa không đụng store, không biết chuột hay ngón tay.
 */
export function pickWall(ray: Ray, walls: Wall[], heightMm: number): WallHit | null {
  const plane = new Plane()
  const normal = new Vector3()
  const point = new Vector3()
  const hit = new Vector3()

  let best: WallHit | null = null

  for (const wall of walls) {
    normal.set(wall.innerNormal.x, 0, wall.innerNormal.z)
    // Tia đi CÙNG chiều pháp tuyến trong = đang nhìn vào mặt sau tường. Bỏ.
    if (ray.direction.dot(normal) >= 0) continue

    point.set(mm2m(wall.start.x), 0, mm2m(wall.start.z))
    plane.setFromNormalAndCoplanarPoint(normal, point)
    if (!ray.intersectPlane(plane, hit)) continue

    const L = wallLength(wall)
    const t = tAlongWall(wall, m2mm(hit.x), m2mm(hit.z))
    const y = m2mm(hit.y)
    if (t < -SLACK || t > L + SLACK) continue
    if (y < -SLACK || y > heightMm + SLACK) continue

    const distance = ray.origin.distanceTo(hit)
    if (best && best.distance <= distance) continue

    best = {
      wall,
      t: clamp(t, 0, L),
      y: clamp(y, 0, heightMm),
      distance,
    }
  }

  return best
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}
