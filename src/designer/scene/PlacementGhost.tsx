import { mm2m } from '../../lib/units'
import type { OpeningStyle } from '../catalog/openings'
import type { Wall } from '../types'

/** mm. Nhấc tấm bóng ra khỏi mặt tường cho khỏi z-fighting. */
const LIFT = 12

type Props = {
  wall: Wall
  style: OpeningStyle
  /** mm, mép trái của lỗ dọc tường. */
  t: number
  /** false = chỗ này đặt không được (đè lỗ khác / không đủ chỗ). */
  valid: boolean
}

/**
 * Bóng mờ báo cửa sẽ rơi vào đâu.
 *
 * Chỉ là MỘT tấm phẳng, không dựng lại cả bộ khung. Rê chuột bắn sự kiện liên
 * tục; dựng geometry mới mỗi lần rê thì vừa tốn vừa rác bộ nhớ. Tấm phẳng chỉ
 * cần đổi `position`/`scale`, geometry giữ nguyên.
 */
export function PlacementGhost({ wall, style, t, valid }: Props) {
  const n = wall.innerNormal
  const len = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)
  const dx = (wall.end.x - wall.start.x) / len
  const dz = (wall.end.z - wall.start.z) / len

  const centerT = t + style.width / 2
  const x = wall.start.x + dx * centerT + n.x * LIFT
  const z = wall.start.z + dz * centerT + n.z * LIFT
  const y = style.elevation + style.height / 2

  // Xoay để pháp tuyến tấm trùng pháp tuyến TRONG của tường.
  // Ry(θ) đưa (0,0,1) -> (sinθ, 0, cosθ), nên θ = atan2(n.x, n.z).
  const rotationY = Math.atan2(n.x, n.z)

  return (
    <mesh
      position={[mm2m(x), mm2m(y), mm2m(z)]}
      rotation={[0, rotationY, 0]}
      scale={[mm2m(style.width), mm2m(style.height), 1]}
      raycast={() => null} // bóng không được chắn chuột, nếu không rê là giật
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={valid ? '#f0b429' : '#e2564d'}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  )
}
