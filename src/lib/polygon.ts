/** mm. Điểm trên mặt bằng. y bỏ qua vì mặt bằng luôn nằm ngang. */
export type Point = { x: number; z: number }

/**
 * Diện tích có dấu của đa giác (công thức dây giày).
 *
 * DẤU mới là thứ quan trọng, không phải trị số: nó cho biết đa giác đang
 * quay theo chiều nào. Toàn bộ chuyện "đâu là trong, đâu là ngoài" của
 * tường dựa vào đây.
 */
export function signedArea(poly: Point[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.z - b.x * a.z
  }
  return sum / 2
}

/**
 * Ép đa giác về chiều quay dương (diện tích có dấu > 0).
 *
 * Sau bước này, với MỌI cạnh, pháp tuyến trong luôn là `(-dz, dx)`.
 * Không cần thử "quay về phía tâm phòng" nữa — phép thử đó SAI với hình
 * lõm (L/T/U): tâm hình có khi nằm ngoài phòng, hoặc nằm sai phía so với
 * vài cạnh.
 */
export function ensurePositiveWinding(poly: Point[]): Point[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly
}

/**
 * Giao điểm 2 đường thẳng, mỗi đường cho bởi 1 điểm và 1 vector chỉ phương.
 * Trả `null` khi song song (định thức ~ 0).
 */
export function lineIntersect(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const det = d1.x * d2.z - d1.z * d2.x
  if (Math.abs(det) < 1e-9) return null

  // Giải p1 + t*d1 = p2 + u*d2
  const t = ((p2.x - p1.x) * d2.z - (p2.z - p1.z) * d2.x) / det
  return { x: p1.x + t * d1.x, z: p1.z + t * d1.z }
}

/**
 * Đẩy đa giác ra ngoài một khoảng `dist`, trả về đa giác ngoài.
 *
 * Cách làm: đẩy TỪNG ĐƯỜNG THẲNG chứa cạnh ra ngoài `dist`, rồi lấy giao
 * của 2 đường liền kề làm đỉnh mới. Đây là mối nối "cắt vát" (miter) —
 * đúng với mọi góc, kể cả góc lõm 270° của hình L/T/U.
 *
 * Không xử lý trường hợp `dist` lớn hơn cạnh (đa giác ngoài tự cắt vào nhau).
 * Với tường 100mm và cạnh ngắn nhất cỡ 600mm thì không xảy ra.
 *
 * `poly` PHẢI đã có chiều quay dương.
 */
export function offsetPolygon(poly: Point[], dist: number): Point[] {
  const n = poly.length

  // Mỗi cạnh -> 1 đường thẳng đã đẩy ra ngoài
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    const dir = { x: dx / len, z: dz / len }
    // Pháp tuyến TRONG là (-dz, dx); ra ngoài thì lấy dấu ngược lại.
    const outward = { x: dir.z, z: -dir.x }
    return {
      point: { x: a.x + outward.x * dist, z: a.z + outward.z * dist },
      dir,
    }
  })

  // Đỉnh ngoài thứ i = giao của đường (i-1) và đường (i),
  // tức là chỗ 2 cạnh kề nhau gặp nhau tại đỉnh poly[i].
  return poly.map((_, i) => {
    const prev = lines[(i - 1 + n) % n]
    const cur = lines[i]
    const hit = lineIntersect(prev.point, prev.dir, cur.point, cur.dir)
    // Hai cạnh thẳng hàng (góc 180°) thì không có giao điểm -> lấy thẳng
    // điểm đầu của cạnh hiện tại, kết quả giống hệt.
    return hit ?? cur.point
  })
}

/** Hộp bao của đa giác. */
export function bounds(poly: Point[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  return { minX, maxX, minZ, maxZ }
}

/**
 * Điểm có nằm trong đa giác không (thuật toán bắn tia).
 * D10 dùng để chặn đồ bị kéo ra ngoài phòng — hình L/U thì hộp bao không đủ.
 */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    const straddles = a.z > p.z !== b.z > p.z
    if (straddles && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Điểm gần nhất trên BIÊN đa giác.
 *
 * Dùng để kéo đồ ra ngoài phòng thì hút ngược lại vào mép. Hình L/U thì hộp
 * bao không đủ — kéo vào phần bị khoét là hộp bao vẫn cho qua.
 */
export function closestPointOnPolygon(p: Point, poly: Point[]): Point {
  let best: Point = poly[0]
  let bestDist = Infinity

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const q = closestPointOnSegment(p, a, b)
    const dist = (q.x - p.x) ** 2 + (q.z - p.z) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = q
    }
  }
  return best
}

/** Điểm gần nhất trên đoạn thẳng `a`→`b`. */
export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len2 = dx * dx + dz * dz
  if (len2 === 0) return a

  // Chiếu lên đường thẳng rồi kẹp về trong đoạn
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2))
  return { x: a.x + dx * t, z: a.z + dz * t }
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckPolygon(): void {
  const eq = (label: string, got: unknown, want: unknown) =>
    console.assert(got === want, `polygon: ${label} — got ${String(got)}, want ${String(want)}`)

  // Hình vuông 100×100 quay chiều dương
  const sq: Point[] = [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
    { x: 100, z: 100 },
    { x: 0, z: 100 },
  ]
  eq('signedArea hình vuông', signedArea(sq), 10000)
  eq('signedArea khi đảo chiều', signedArea([...sq].reverse()), -10000)
  eq('ensurePositiveWinding giữ nguyên', ensurePositiveWinding(sq), sq)
  eq('ensurePositiveWinding đảo lại', signedArea(ensurePositiveWinding([...sq].reverse())), 10000)

  // Đẩy ra 10 -> hình vuông 120×120, đỉnh (-10,-10)
  const out = offsetPolygon(sq, 10)
  eq('offset đỉnh 0 x', Math.round(out[0].x), -10)
  eq('offset đỉnh 0 z', Math.round(out[0].z), -10)
  eq('offset đỉnh 2 x', Math.round(out[2].x), 110)
  eq('offset diện tích', Math.round(signedArea(out)), 14400)

  eq('pointInPolygon giữa', pointInPolygon({ x: 50, z: 50 }, sq), true)
  eq('pointInPolygon ngoài', pointInPolygon({ x: 150, z: 50 }, sq), false)

  // Hình L (có góc lõm) — chỗ phép thử "hướng về tâm" hay chết
  const L: Point[] = [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
    { x: 100, z: 40 },
    { x: 40, z: 40 },
    { x: 40, z: 100 },
    { x: 0, z: 100 },
  ]
  eq('hình L quay chiều dương', signedArea(L) > 0, true)
  eq('hình L: điểm trong nhánh dọc', pointInPolygon({ x: 20, z: 80 }, L), true)
  eq('hình L: điểm ở phần bị khoét', pointInPolygon({ x: 80, z: 80 }, L), false)

  const outL = offsetPolygon(L, 10)
  eq('offset hình L đủ số đỉnh', outL.length, 6)
  // Góc lõm ở đỉnh (40,40): đẩy ra ngoài phải THU VÀO phía trong, tức là
  // toạ độ tăng lên (50,50), chứ không phải nở ra.
  eq('offset góc lõm x', Math.round(outL[3].x), 50)
  eq('offset góc lõm z', Math.round(outL[3].z), 50)

  // Kéo ra ngoài -> hút về mép gần nhất
  eq('closest: bên phải hình vuông', closestPointOnPolygon({ x: 150, z: 50 }, sq).x, 100)
  eq('closest: phía trên hình vuông', closestPointOnPolygon({ x: 50, z: -30 }, sq).z, 0)
  // Hình L: kéo vào phần bị KHOÉT phải hút ra mép trong, không phải mép ngoài
  const inNotch = closestPointOnPolygon({ x: 80, z: 80 }, L)
  eq('closest hình L: hút về mép trong', pointInPolygon({ x: 80, z: 80 }, L), false)
  console.assert(
    Math.abs(inNotch.x - 40) < 1e-9 || Math.abs(inNotch.z - 40) < 1e-9,
    `polygon: hình L hút sai chỗ — ra (${inNotch.x}, ${inNotch.z}), phải nằm trên mép x=40 hoặc z=40`,
  )

  console.info('polygon.ts self-check xong')
}
