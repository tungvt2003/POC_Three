import { bounds, type Point } from '../../lib/polygon'
import { mm2m } from '../../lib/units'

export type CameraPreset = 'free' | 'top' | 'dollhouse'

export const PRESET_LABELS: Record<CameraPreset, string> = {
  free: 'Tự do',
  top: 'Từ trên',
  dollhouse: 'Nhà búp bê',
}

/** Chừa thêm quanh phòng cho khỏi sát mép khung. */
const MARGIN = 1.25

export type CameraGoal = {
  /** mét, vị trí camera */
  position: [number, number, number]
  /** mét, điểm ngắm */
  target: [number, number, number]
}

/**
 * Tính chỗ đứng của camera cho từng preset. THUẦN HÀM — không đụng three.js,
 * test được bằng số.
 *
 * `radius` là nửa đường chéo hộp bao phòng: khoảng cách cần lùi để nhìn thấy
 * hết phòng, kể cả khi camera đứng chéo góc.
 */
export function dollhouseGoal(footprint: Point[], heightMm: number, fovDeg: number): CameraGoal {
  const b = bounds(footprint)
  const cx = mm2m((b.minX + b.maxX) / 2)
  const cz = mm2m((b.minZ + b.maxZ) / 2)
  const radius = Math.hypot(mm2m(b.maxX - b.minX), mm2m(b.maxZ - b.minZ)) / 2

  // Lùi đủ xa để bán kính phòng lọt vào nửa góc mở
  const dist = (radius * MARGIN) / Math.tan((fovDeg * Math.PI) / 360)

  // Đứng chéo 45° trên mặt bằng, cao khoảng 40° so với phương ngang —
  // góc "nhà búp bê" quen thuộc: thấy được cả sàn lẫn hai mặt tường.
  const az = Math.PI / 4
  const el = (40 * Math.PI) / 180

  return {
    position: [
      cx + dist * Math.cos(el) * Math.sin(az),
      dist * Math.sin(el),
      cz + dist * Math.cos(el) * Math.cos(az),
    ],
    target: [cx, mm2m(heightMm) * 0.35, cz],
  }
}

/** Khung nhìn trực giao cho preset "từ trên xuống". Đơn vị mét. */
export function topOrthoFrustum(
  footprint: Point[],
  aspect: number,
): { center: [number, number]; halfW: number; halfH: number } {
  const b = bounds(footprint)
  const cx = mm2m((b.minX + b.maxX) / 2)
  const cz = mm2m((b.minZ + b.maxZ) / 2)
  const w = mm2m(b.maxX - b.minX) * MARGIN
  const d = mm2m(b.maxZ - b.minZ) * MARGIN

  // Phòng phải lọt cả hai chiều -> lấy cái nào bó hơn
  const halfH = Math.max(d, w / aspect) / 2
  return { center: [cx, cz], halfW: halfH * aspect, halfH }
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckCameraPresets(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `cameraPresets: ${msg}`)

  // Phòng 4000×3000 lệch hẳn sang trái, tâm ở (-1000, 500)
  const fp: Point[] = [
    { x: -3000, z: -1000 },
    { x: 1000, z: -1000 },
    { x: 1000, z: 2000 },
    { x: -3000, z: 2000 },
  ]

  const g = dollhouseGoal(fp, 2700, 50)
  assert(Math.abs(g.target[0] - -1) < 1e-9, `ngắm sai tâm X: ${g.target[0]}`)
  assert(Math.abs(g.target[2] - 0.5) < 1e-9, `ngắm sai tâm Z: ${g.target[2]}`)
  assert(g.position[1] > 0, 'camera nhà búp bê phải ở trên cao')
  // Lùi xa hơn nửa đường chéo phòng (2.5m) thì mới nhìn hết được
  const back = Math.hypot(g.position[0] - g.target[0], g.position[2] - g.target[2])
  assert(back > 2.5, `lùi chưa đủ xa: ${back.toFixed(2)}m`)

  const f = topOrthoFrustum(fp, 2)
  assert(Math.abs(f.center[0] - -1) < 1e-9, 'khung trực giao lệch tâm X')
  assert(Math.abs(f.halfW / f.halfH - 2) < 1e-9, 'khung trực giao sai tỉ lệ khung hình')
  // Phòng rộng 4m, lề 1.25 -> nửa bề rộng phải ít nhất 2.5m
  assert(f.halfW >= 2.5 - 1e-9, `khung trực giao hẹp quá: ${f.halfW}`)

  console.info('cameraPresets self-check xong')
}
