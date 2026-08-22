import type { Point } from '../../lib/polygon'
import { wallLength } from '../scene/buildWalls'
import type { Wall } from '../types'

/** mm. Tâm đồ cách tường dưới khoảng này thì hút sát. Chốt trong `claude.md`. */
export const SNAP_DIST = 400

/**
 * mm. Dung sai cho phía NGOÀI tường.
 *
 * Kéo đồ ra ngoài phòng thì `closestPointOnPolygon` hút nó về đúng đường
 * tường, nhưng phép chiếu để lại sai số cỡ 1e-10 — có khi âm. Không có dung
 * sai này thì khoảng cách âm bị loại, đồ đứng chết trên đường tường thay vì
 * hút vào trong. Đã dính lỗi này lúc test kéo ra ngoài phòng.
 */
const OUTSIDE_TOLERANCE = 5

export type SnapResult = {
  position: Point
  rotationY: number
  wallId: string
}

/**
 * Hút đồ vào tường gần nhất.
 *
 * THUẦN HÀM — không biết three.js, không biết React, không biết chuột. Test
 * được bằng số, và dùng lại được cho bàn phím hay ngón tay sau này.
 *
 * Chạy với tường XIÊN (hình Cut / Vát 2 góc) chứ không giả định trục X/Z:
 * mọi phép tính đều qua vector chỉ phương và pháp tuyến của từng bức tường.
 *
 * @param center  mm, tâm đáy món đồ
 * @param depthMm mm, chiều sâu món đồ — hút sát nghĩa là lưng chạm tường,
 *                nên tâm phải cách mặt tường đúng `depth / 2`
 */
export function snapToWall(
  center: Point,
  depthMm: number,
  walls: Wall[],
  maxDist = SNAP_DIST,
): SnapResult | null {
  let best: SnapResult | null = null
  let bestDist = Infinity

  for (const wall of walls) {
    const L = wallLength(wall)
    const dx = (wall.end.x - wall.start.x) / L
    const dz = (wall.end.z - wall.start.z) / L
    const n = wall.innerNormal

    const vx = center.x - wall.start.x
    const vz = center.z - wall.start.z

    // Chiếu lên chiều dài tường. Ra ngoài đoạn thì bức tường này không tính —
    // đứng chéo góc phòng mà hút vào bức tường ở tận đầu kia là vô lý.
    const along = vx * dx + vz * dz
    if (along < 0 || along > L) continue

    // Khoảng cách CÓ DẤU theo pháp tuyến trong. Dương = đang ở trong phòng.
    const dist = vx * n.x + vz * n.z
    if (dist < -OUTSIDE_TOLERANCE || dist > maxDist) continue

    // So bằng trị tuyệt đối để điểm nằm ngay trên đường tường (dist ≈ 0)
    // không bị coi là "gần hơn mọi thứ" một cách vô lý
    const score = Math.abs(dist)
    if (score >= bestDist) continue
    bestDist = score
    best = {
      // Trượt dọc tường giữ nguyên, chỉ đẩy vào cho lưng chạm tường
      position: {
        x: wall.start.x + dx * along + n.x * (depthMm / 2),
        z: wall.start.z + dz * along + n.z * (depthMm / 2),
      },
      // Quay để trục +Z cục bộ trỏ vào trong phòng => lưng (−Z) áp tường.
      // Ry(θ) đưa (0,0,1) -> (sinθ, 0, cosθ), nên θ = atan2(n.x, n.z).
      rotationY: Math.atan2(n.x, n.z),
      wallId: wall.id,
    }
  }

  return best
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckSnap(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `snapToWall: ${msg}`)

  // Phòng chữ nhật 4000×3000, tâm ở gốc. Tường sau nằm ở z = -1500.
  const back: Wall = {
    id: 'back',
    start: { x: -2000, z: -1500 },
    end: { x: 2000, z: -1500 },
    outerStart: { x: -2040, z: -1540 },
    outerEnd: { x: 2040, z: -1540 },
    innerNormal: { x: 0, y: 0, z: 1 } as Wall['innerNormal'],
    openings: [],
  }
  const left: Wall = {
    id: 'left',
    start: { x: -2000, z: 1500 },
    end: { x: -2000, z: -1500 },
    outerStart: { x: -2040, z: 1540 },
    outerEnd: { x: -2040, z: -1540 },
    innerNormal: { x: 1, y: 0, z: 0 } as Wall['innerNormal'],
    openings: [],
  }
  const walls = [back, left]

  // Xa mọi bức tường -> không hút
  assert(snapToWall({ x: 0, z: 0 }, 900, walls) === null, 'giữa phòng mà vẫn bị hút')

  // Cách tường sau 300mm (< 400) -> hút, lưng áp tường
  const s = snapToWall({ x: 500, z: -1200 }, 900, walls)
  assert(s !== null, 'cách tường 300mm mà không hút')
  assert(s!.wallId === 'back', `hút nhầm tường: ${s!.wallId}`)
  assert(s!.position.x === 500, 'hút làm trượt dọc tường, phải giữ nguyên')
  assert(
    Math.abs(s!.position.z - (-1500 + 450)) < 1e-9,
    `tâm phải cách tường đúng nửa chiều sâu (450mm), thực tế ${s!.position.z + 1500}`,
  )
  assert(Math.abs(s!.rotationY - 0) < 1e-9, 'tường sau thì góc quay phải là 0')

  // Sát tường trái -> quay 90°
  const s2 = snapToWall({ x: -1750, z: 0 }, 600, walls)
  assert(s2?.wallId === 'left', 'không hút vào tường trái')
  assert(
    Math.abs(s2!.rotationY - Math.PI / 2) < 1e-9,
    `tường trái phải quay 90°, thực tế ${((s2!.rotationY * 180) / Math.PI).toFixed(1)}°`,
  )
  assert(Math.abs(s2!.position.x - (-2000 + 300)) < 1e-9, 'tâm cách tường trái sai')

  // Đứng ngoài đoạn tường (lệch hẳn sang phải) -> bức tường đó không tính
  assert(
    snapToWall({ x: 3000, z: -1400 }, 900, walls) === null,
    'hút vào bức tường mà mình không đứng đối diện',
  )

  // Điểm nằm NGAY TRÊN đường tường (kéo ra ngoài rồi bị hút về biên).
  // Sai số dấu phẩy động có thể cho ra khoảng cách âm tí xíu — vẫn phải hút.
  const onLine = snapToWall({ x: -2000 - 1e-9, z: 800 }, 658, walls)
  assert(onLine !== null, 'đứng ngay trên đường tường mà không hút — thiếu dung sai âm')
  assert(
    Math.abs(onLine!.position.x - (-2000 + 329)) < 1e-6,
    `hút từ trên đường tường sai: ra ${onLine!.position.x.toFixed(1)}, phải là -1671`,
  )

  // Tường XIÊN 45°: hút vẫn phải đúng
  const diag: Wall = {
    id: 'diag',
    start: { x: 0, z: 0 },
    end: { x: 1000, z: 1000 },
    outerStart: { x: 0, z: 0 },
    outerEnd: { x: 1000, z: 1000 },
    innerNormal: { x: -Math.SQRT1_2, y: 0, z: Math.SQRT1_2 } as Wall['innerNormal'],
    openings: [],
  }
  const s3 = snapToWall({ x: 300, z: 600 }, 400, [diag])
  assert(s3 !== null, 'không hút được vào tường xiên')
  // Sau khi hút, tâm phải cách ĐƯỜNG tường đúng 200mm theo pháp tuyến
  const d3 = (s3!.position.x - 0) * diag.innerNormal.x + (s3!.position.z - 0) * diag.innerNormal.z
  assert(Math.abs(d3 - 200) < 1e-9, `tường xiên: cách sai, ra ${d3.toFixed(2)}mm`)

  console.info('snapToWall self-check xong')
}
