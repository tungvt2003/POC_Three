import { closestPointOnSegment, type Point } from '../../lib/polygon'
import type { Wall } from '../types'

/** mm. Xa hơn khoảng này thì không hiện đường đo, nhìn rối. */
export const MAX_SHOWN = 3500

/** mm. Hở dưới mức này là lối đi hẹp — nhãn chuyển đỏ. Chốt trong `claude.md`. */
export const NARROW = 600

/** Số đường đo hiện cùng lúc. Nhiều quá thì chữ chồng lên nhau. */
export const MAX_LINES = 4

export type Clearance = {
  wallId: string
  /** mm, khoảng hở ngắn nhất từ mép đồ tới mặt trong tường */
  gap: number
  /** mm, điểm trên mép đồ */
  from: Point
  /** mm, điểm chân vuông góc trên tường */
  to: Point
}

/**
 * Bốn góc hình chiếu bằng của món đồ, đã xoay.
 *
 * Xoay quanh trục Y của three.js: `Ry(θ)` đưa toạ độ cục bộ `(x, z)` thành
 * `(x·cosθ + z·sinθ, −x·sinθ + z·cosθ)`.
 */
export function itemFootprint(
  center: Point,
  widthMm: number,
  depthMm: number,
  rotationY: number,
): Point[] {
  const hw = widthMm / 2
  const hd = depthMm / 2
  const c = Math.cos(rotationY)
  const s = Math.sin(rotationY)

  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => ({
    x: center.x + x * c + z * s,
    z: center.z - x * s + z * c,
  }))
}

/**
 * Khoảng hở từ món đồ tới các bức tường quanh nó.
 *
 * Đo tới MẶT PHẲNG tường, không phải "theo từng trục X/Z". Trục là khái niệm
 * vô nghĩa với tường xiên của hình Cut / Vát 2 góc — đo theo trục sẽ ra số
 * lớn hơn khoảng cách thật.
 *
 * THUẦN HÀM, test được bằng số.
 */
export function measureClearances(
  corners: Point[],
  walls: Wall[],
  maxDist = MAX_SHOWN,
): Clearance[] {
  const out: Clearance[] = []

  for (const wall of walls) {
    let best = Infinity
    let from = corners[0]
    let to = corners[0]

    // Góc nào của món đồ gần bức tường này nhất
    for (const corner of corners) {
      const foot = closestPointOnSegment(corner, wall.start, wall.end)
      const d = Math.hypot(foot.x - corner.x, foot.z - corner.z)
      if (d < best) {
        best = d
        from = corner
        to = foot
      }
    }

    if (best <= maxDist) out.push({ wallId: wall.id, gap: best, from, to })
  }

  // Gần nhất lên trước rồi cắt bớt — chỗ hẹp mới là chỗ người ta cần biết
  out.sort((a, b) => a.gap - b.gap)
  return out.slice(0, MAX_LINES)
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckClearance(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `clearance: ${msg}`)

  // Món đồ 1000×600 ở giữa gốc toạ độ, chưa xoay
  const flat = itemFootprint({ x: 0, z: 0 }, 1000, 600, 0)
  assert(flat.length === 4, 'phải ra 4 góc')
  assert(
    Math.max(...flat.map((p) => p.x)) === 500 && Math.max(...flat.map((p) => p.z)) === 300,
    'góc sai khi chưa xoay',
  )

  // Xoay 90°: chiều rộng và chiều sâu đổi chỗ cho nhau
  const turned = itemFootprint({ x: 0, z: 0 }, 1000, 600, Math.PI / 2)
  assert(
    Math.abs(Math.max(...turned.map((p) => p.x)) - 300) < 1e-9,
    'xoay 90° mà bề rộng theo trục X không thành 300',
  )
  assert(
    Math.abs(Math.max(...turned.map((p) => p.z)) - 500) < 1e-9,
    'xoay 90° mà bề sâu theo trục Z không thành 500',
  )

  const back: Wall = {
    id: 'back',
    start: { x: -2000, z: -1500 },
    end: { x: 2000, z: -1500 },
    outerStart: { x: -2040, z: -1540 },
    outerEnd: { x: 2040, z: -1540 },
    innerNormal: { x: 0, y: 0, z: 1 } as Wall['innerNormal'],
    openings: [],
  }
  const front: Wall = {
    id: 'front',
    start: { x: 2000, z: 1500 },
    end: { x: -2000, z: 1500 },
    outerStart: { x: 2040, z: 1540 },
    outerEnd: { x: -2040, z: 1540 },
    innerNormal: { x: 0, y: 0, z: -1 } as Wall['innerNormal'],
    openings: [],
  }

  // Mép sau của đồ ở z = -300, tường sau ở z = -1500 -> hở 1200
  const cl = measureClearances(flat, [back, front])
  const toBack = cl.find((c) => c.wallId === 'back')
  assert(toBack !== undefined, 'không đo được tới tường sau')
  assert(Math.abs(toBack!.gap - 1200) < 1e-9, `hở tới tường sau sai: ${toBack!.gap}`)
  assert(toBack!.from.z === -300, 'đo từ sai góc — phải là góc gần tường nhất')
  assert(toBack!.to.z === -1500, 'chân vuông góc không nằm trên tường')

  // Tường xiên 45°: đo tới MẶT PHẲNG, không phải theo trục.
  // Đồ ở gốc, tường đi qua (1000,0)-(0,1000) => khoảng cách từ (0,0) tới
  // đường là 1000/√2 ≈ 707. Góc gần nhất của đồ còn gần hơn nữa.
  const diag: Wall = {
    id: 'diag',
    start: { x: 1000, z: 0 },
    end: { x: 0, z: 1000 },
    outerStart: { x: 1000, z: 0 },
    outerEnd: { x: 0, z: 1000 },
    innerNormal: { x: -Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 } as Wall['innerNormal'],
    openings: [],
  }
  const dg = measureClearances(flat, [diag])[0]
  const axisGuess = 1000 - 500 // nếu đo bừa theo trục X thì ra 500
  assert(dg.gap < axisGuess, `đo tường xiên theo trục rồi: ${dg.gap.toFixed(0)} >= ${axisGuess}`)

  // Xa quá thì không hiện
  assert(measureClearances(flat, [back], 100).length === 0, 'tường xa vẫn hiện đường đo')

  console.info('clearance self-check xong')
}
