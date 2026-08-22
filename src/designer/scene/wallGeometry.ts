import { ExtrudeGeometry, Shape, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ensurePositiveWinding, type Point } from '../../lib/polygon'
import { mm2m } from '../../lib/units'
import type { Wall } from '../types'
import { wallLength } from './buildWalls'

/** mm. Sai số bỏ qua khi so sánh vị trí dọc tường. */
const EPS = 1

/**
 * Một MẢNH tường: khối lăng trụ dựng trên tứ giác `quad`, từ cao độ `y0` tới `y1`.
 * `t0`/`t1` là khoảng dọc tường mà mảnh này chiếm — để test kiểm được.
 */
export type Slab = {
  quad: Point[]
  y0: number
  y1: number
  t0: number
  t1: number
}

/**
 * HỆ TOẠ ĐỘ CỦA TƯỜNG: `t` chạy dọc mặt trong từ `start` (t=0) tới `end` (t=L),
 * `y` là cao độ so với sàn. Cửa/cửa sổ khai báo trong hệ này, không dùng toạ độ
 * world — đúng như `claude.md` quy định.
 */
function unitDir(wall: Wall): { dx: number; dz: number } {
  const len = wallLength(wall)
  return { dx: (wall.end.x - wall.start.x) / len, dz: (wall.end.z - wall.start.z) / len }
}

/** Điểm trên MẶT TRONG tường tại vị trí `t`. */
function innerAt(wall: Wall, t: number): Point {
  const d = unitDir(wall)
  return { x: wall.start.x + d.dx * t, z: wall.start.z + d.dz * t }
}

/**
 * Điểm trên MẶT NGOÀI tường, tại chỗ mặt phẳng cắt vuông góc đi qua `innerAt(t)`.
 *
 * KHÔNG phải nội suy tuyến tính từ `outerStart` tới `outerEnd`. Hai mặt song
 * song nhau nhưng dài khác nhau vì hai đầu bị cắt vát theo góc, nên chia theo
 * tỉ lệ là lệch. Phải chiếu vuông góc.
 */
function outerAt(wall: Wall, t: number): Point {
  const d = unitDir(wall)
  // Đỉnh ngoài lệch dọc tường bao nhiêu so với đỉnh trong
  const skew =
    (wall.outerStart.x - wall.start.x) * d.dx + (wall.outerStart.z - wall.start.z) * d.dz
  const s = t - skew
  return { x: wall.outerStart.x + d.dx * s, z: wall.outerStart.z + d.dz * s }
}

/**
 * Tứ giác mặt cắt ngang của một mảnh tường, từ `t0` tới `t1`.
 *
 * Mảnh nằm ở ĐẦU tường (t0 = 0) hoặc CUỐI tường (t1 = L) thì giữ nguyên đỉnh
 * cắt vát gốc — nếu thay bằng nhát cắt vuông góc thì góc phòng lại hở ra.
 * Mấy nhát cắt ở giữa mới là cắt vuông góc.
 */
function sliceQuad(wall: Wall, t0: number, t1: number): Point[] {
  const L = wallLength(wall)
  const atStart = t0 <= EPS
  const atEnd = t1 >= L - EPS

  const i0 = atStart ? wall.start : innerAt(wall, t0)
  const o0 = atStart ? wall.outerStart : outerAt(wall, t0)
  const i1 = atEnd ? wall.end : innerAt(wall, t1)
  const o1 = atEnd ? wall.outerEnd : outerAt(wall, t1)

  return [i0, i1, o1, o0]
}

/**
 * Chẻ tường thành các mảnh quanh lỗ cửa. KHÔNG dùng CSG.
 *
 * Một tường có một cửa đi (elevation = 0) ra 3 mảnh: trái, phải, trên lỗ.
 * Một cửa sổ (elevation > 0) ra 4 mảnh: thêm mảnh dưới lỗ.
 *
 * Lỗ chồng lên nhau hoặc thò ra ngoài tường thì BỎ QUA — thà thiếu một cái cửa
 * còn hơn thủng tường. Tầng UI phải chặn trước, đây chỉ là lưới an toàn.
 */
export function wallSlabs(wall: Wall, heightMm: number): Slab[] {
  const L = wallLength(wall)
  const out: Slab[] = []

  const push = (t0: number, t1: number, y0: number, y1: number) => {
    if (t1 - t0 <= EPS || y1 - y0 <= EPS) return
    out.push({ quad: sliceQuad(wall, t0, t1), y0, y1, t0, t1 })
  }

  const openings = [...wall.openings]
    .filter((o) => o.width > EPS && o.height > EPS)
    .sort((a, b) => a.t - b.t)

  let cursor = 0
  for (const o of openings) {
    const t0 = o.t
    const t1 = o.t + o.width
    if (t0 < cursor - EPS || t1 > L + EPS) continue // chồng lỗ khác, hoặc lòi ra ngoài

    push(cursor, t0, 0, heightMm) // mảnh đặc bên trái lỗ
    push(t0, t1, 0, o.elevation) // mảnh dưới lỗ (cửa đi thì rỗng)
    push(t0, t1, o.elevation + o.height, heightMm) // mảnh trên lỗ
    cursor = t1
  }
  push(cursor, L, 0, heightMm) // mảnh đặc còn lại

  return out
}

/**
 * Dựng khối cho MỘT mảnh. Toạ độ trả về là world (mét), không cần transform thêm.
 *
 * Cách xoay, giải thích cho khỏi quên:
 *   - `Shape` của three.js sống trong mặt phẳng XY. Ta nhét (world x, world z)
 *     vào (shape x, shape y).
 *   - `ExtrudeGeometry` đùn theo +Z. `rotateX(+90°)` biến (a, b, 0) thành
 *     (a, 0, b) — shape y thành world z — đồng thời biến hướng đùn thành −Y.
 *   - Nên khối đùn XUỐNG, phải `translate(0, y1, 0)` kéo lên cho nó nằm đúng
 *     từ y0 tới y1.
 */
export function slabGeometry(slab: Slab): BufferGeometry {
  // Ép chiều quay dương. ExtrudeGeometry cần shape ngược chiều kim đồng hồ thì
  // pháp tuyến mới hướng ra ngoài; quay sai thì mảnh tường đen thui.
  const quad = ensurePositiveWinding(slab.quad)

  const shape = new Shape()
  shape.moveTo(mm2m(quad[0].x), mm2m(quad[0].z))
  for (let i = 1; i < quad.length; i++) {
    shape.lineTo(mm2m(quad[i].x), mm2m(quad[i].z))
  }
  shape.closePath()

  const geo = new ExtrudeGeometry(shape, {
    depth: mm2m(slab.y1 - slab.y0),
    bevelEnabled: false,
  })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, mm2m(slab.y1), 0)
  return geo
}

/**
 * Gộp tất cả mảnh của một bức tường thành MỘT geometry.
 * Gộp để mỗi tường chỉ tốn 1 draw call — tường có cửa mà để 3 mesh rời thì
 * phòng chữ U 8 tường có thể vọt lên hơn 20 draw call.
 */
export function buildWallGeometry(wall: Wall, heightMm: number): BufferGeometry {
  const parts = wallSlabs(wall, heightMm).map(slabGeometry)
  if (parts.length === 1) return parts[0]

  const merged = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  return merged ?? parts[0]
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckWallGeometry(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `wallGeometry: ${msg}`)

  const wall: Wall = {
    id: 'w',
    start: { x: 0, z: 0 },
    end: { x: 4000, z: 0 },
    outerStart: { x: -40, z: -40 },
    outerEnd: { x: 4040, z: -40 },
    innerNormal: { x: 0, y: 0, z: 1 } as Wall['innerNormal'],
    openings: [],
  }
  const H = 2700

  // Không lỗ -> đúng 1 mảnh, phủ hết chiều dài và chiều cao
  const plain = wallSlabs(wall, H)
  assert(plain.length === 1, `tường trơn phải ra 1 mảnh, ra ${plain.length}`)
  assert(plain[0].t0 === 0 && plain[0].t1 === 4000, 'mảnh trơn không phủ hết chiều dài')
  assert(plain[0].y0 === 0 && plain[0].y1 === H, 'mảnh trơn không phủ hết chiều cao')
  // Đầu và cuối phải giữ đỉnh cắt vát gốc, không bị thay bằng nhát cắt vuông góc
  assert(
    plain[0].quad[0].x === wall.start.x && plain[0].quad[3].x === wall.outerStart.x,
    'mảnh trơn không giữ đỉnh cắt vát ở đầu tường',
  )

  // Cửa đi (elevation 0) -> 3 mảnh: trái, phải, trên lỗ
  const door = wallSlabs(
    { ...wall, openings: [op('d', 1500, 0, 900, 2100)] },
    H,
  )
  assert(door.length === 3, `1 cửa đi phải ra 3 mảnh, ra ${door.length}`)
  assert(
    door.some((s) => s.t0 === 1500 && s.t1 === 2400 && s.y0 === 2100 && s.y1 === H),
    'thiếu mảnh nằm trên cửa đi',
  )

  // Cửa sổ (elevation > 0) -> 4 mảnh: thêm mảnh dưới lỗ
  const win = wallSlabs({ ...wall, openings: [op('w1', 1500, 900, 1200, 1200)] }, H)
  assert(win.length === 4, `1 cửa sổ phải ra 4 mảnh, ra ${win.length}`)
  assert(
    win.some((s) => s.t0 === 1500 && s.y0 === 0 && s.y1 === 900),
    'thiếu mảnh nằm dưới cửa sổ',
  )

  // Hai lỗ chồng nhau -> bỏ cái sau, KHÔNG được thủng tường
  const overlap = wallSlabs(
    { ...wall, openings: [op('a', 1000, 0, 900, 2100), op('b', 1200, 0, 900, 2100)] },
    H,
  )
  assert(
    overlap.every((s) => s.t1 <= 1900 + EPS || s.t0 >= 1900 - EPS),
    'lỗ chồng nhau làm mảnh tường cắt nhau',
  )

  // Các mảnh không được đè lên nhau trong không gian (t, y)
  for (const set of [door, win]) {
    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        const a = set[i]
        const b = set[j]
        const tOverlap = Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0) > EPS
        const yOverlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > EPS
        assert(!(tOverlap && yOverlap), `hai mảnh đè lên nhau: ${i} và ${j}`)
      }
    }
  }

  // Tổng diện tích mặt đứng phải bằng diện tích tường trừ đi diện tích lỗ
  const area = (s: Slab[]) => s.reduce((n, x) => n + (x.t1 - x.t0) * (x.y1 - x.y0), 0)
  assert(area(plain) === 4000 * H, 'diện tích tường trơn sai')
  assert(area(door) === 4000 * H - 900 * 2100, 'diện tích tường có cửa đi sai')
  assert(area(win) === 4000 * H - 1200 * 1200, 'diện tích tường có cửa sổ sai')

  console.info('wallGeometry self-check xong')
}

function op(id: string, t: number, elevation: number, width: number, height: number) {
  const isDoor = elevation === 0
  return {
    id,
    wallId: 'w',
    styleId: isDoor ? 'door-single' : 'win-fixed',
    t,
    elevation,
    width,
    height,
    kind: isDoor ? ('door' as const) : ('window' as const),
  }
}

/** Vị trí `t` dọc tường của một điểm world. Dùng khi bấm chuột lên tường. */
export function tAlongWall(wall: Wall, x: number, z: number): number {
  const d = unitDir(wall)
  return (x - wall.start.x) * d.dx + (z - wall.start.z) * d.dz
}

/**
 * Mặt vừa bấm có phải MẶT TRONG tường không.
 *
 * Chỉ cho đặt cửa khi bấm từ trong phòng. Bấm trúng mặt ngoài hay mặt trên
 * tường mà vẫn đặt thì cửa hiện ra ở chỗ người dùng không hề nhắm tới.
 */
export function isInnerFace(wall: Wall, nx: number, ny: number, nz: number): boolean {
  if (Math.abs(ny) > 0.5) return false // mặt trên/dưới tường
  return nx * wall.innerNormal.x + nz * wall.innerNormal.z > 0.9
}

/** Dùng chung cho `Opening.tsx`: tứ giác của một ô trong hệ toạ độ tường. */
export function openingQuad(
  wall: Wall,
  t0: number,
  t1: number,
  crossFrom = 0,
  crossTo = 1,
): Point[] {
  const i0 = innerAt(wall, t0)
  const i1 = innerAt(wall, t1)
  const o0 = outerAt(wall, t0)
  const o1 = outerAt(wall, t1)

  const lerp = (a: Point, b: Point, f: number): Point => ({
    x: a.x + (b.x - a.x) * f,
    z: a.z + (b.z - a.z) * f,
  })

  return [
    lerp(i0, o0, crossFrom),
    lerp(i1, o1, crossFrom),
    lerp(i1, o1, crossTo),
    lerp(i0, o0, crossTo),
  ]
}
