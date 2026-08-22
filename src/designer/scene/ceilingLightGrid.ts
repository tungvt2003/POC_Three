import { bounds, pointInPolygon, type Point } from '../../lib/polygon'

/**
 * mm. Khoảng cách tim giữa hai đèn trần.
 *
 * Số chọn theo sản phẩm tham chiếu: phòng gần vuông ~4.1m cho ra lưới 2×2
 * (4 vũng sáng, khớp ảnh), phòng rộng hơn thì thêm cột đèn.
 * Đây là số ước lượng, chỉnh được.
 */
export const LIGHT_SPACING = 2000

/** Tối đa mỗi chiều. Mỗi đèn là một pointLight thật, đông quá thì tụt FPS. */
const MAX_PER_AXIS = 4

/**
 * Rải đèn trần theo lưới đều trong mặt bằng.
 *
 * Số đèn suy ra từ kích thước hộp bao — kéo phòng dài ra thì tự có thêm đèn,
 * đúng như sản phẩm tham chiếu.
 *
 * Điểm lưới nằm ngoài đa giác bị loại. Cần thiết cho hình L/T/U: phần bị
 * khoét không phải là phòng, treo đèn ở đó là treo ra ngoài trời.
 */
export function ceilingLightPositions(footprint: Point[]): Point[] {
  const b = bounds(footprint)
  const width = b.maxX - b.minX
  const depth = b.maxZ - b.minZ

  const nx = clampCount(Math.round(width / LIGHT_SPACING))
  const nz = clampCount(Math.round(depth / LIGHT_SPACING))

  const out: Point[] = []
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      // Chia đều, mỗi đèn đứng giữa ô của nó -> lề hai bên bằng nhau
      const p = {
        x: b.minX + (width * (i + 0.5)) / nx,
        z: b.minZ + (depth * (j + 0.5)) / nz,
      }
      if (pointInPolygon(p, footprint)) out.push(p)
    }
  }

  // Phòng bé hoặc hình lõm quá có thể loại sạch -> vẫn phải có 1 đèn
  if (out.length === 0) {
    out.push({ x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 })
  }
  return out
}

function clampCount(n: number): number {
  return Math.min(MAX_PER_AXIS, Math.max(1, n))
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckCeilingLights(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `ceilingLights: ${msg}`)

  const rect = (w: number, d: number): Point[] => [
    { x: -w / 2, z: -d / 2 },
    { x: w / 2, z: -d / 2 },
    { x: w / 2, z: d / 2 },
    { x: -w / 2, z: d / 2 },
  ]

  // Phòng gần vuông 4.1m -> lưới 2×2, khớp ảnh tham chiếu
  assert(ceilingLightPositions(rect(4100, 4100)).length === 4, 'phòng 4.1m vuông phải ra 4 đèn')

  // Phòng to hơn -> nhiều đèn hơn. Đây là điều cần đúng nhất.
  const small = ceilingLightPositions(rect(4000, 3000)).length
  const big = ceilingLightPositions(rect(8000, 3000)).length
  assert(big > small, `kéo phòng rộng ra phải thêm đèn (${small} -> ${big})`)

  // Phòng tí hon vẫn phải có đèn
  assert(ceilingLightPositions(rect(1500, 1500)).length === 1, 'phòng nhỏ phải có đúng 1 đèn')

  // Hình L: không đèn nào được nằm trong phần bị khoét
  const L: Point[] = [
    { x: -2500, z: -2200 },
    { x: 2500, z: -2200 },
    { x: 2500, z: 300 },
    { x: 500, z: 300 },
    { x: 500, z: 2200 },
    { x: -2500, z: 2200 },
  ]
  const lights = ceilingLightPositions(L)
  assert(
    lights.every((p) => pointInPolygon(p, L)),
    'có đèn treo ngoài phòng (phần bị khoét của hình L)',
  )

  console.info(`ceilingLights self-check xong`)
}
