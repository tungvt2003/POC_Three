import { ensurePositiveWinding, type Point } from '../../lib/polygon'

export type ShapeId = 'rect' | 'l-shape' | 'cut' | 't-shape' | 'u-shape' | 'beveled'

/**
 * MÔ HÌNH: phòng = một lưới ĐƯỜNG THẲNG, không phải "rộng × sâu".
 *
 * Mỗi tường thẳng đứng nằm trên một đường x; mỗi tường ngang nằm trên một
 * đường z. Đỉnh đa giác chỉ là giao của một đường x với một đường z.
 * Kéo một bức tường = dời ĐÚNG một đường. Tường đối diện đứng yên.
 *
 * Cạnh XIÊN nối 2 đỉnh khác cả x lẫn z. Kéo nó thì dời HAI đường — mỗi đầu
 * một cái — nên chỉ 2 cạnh kề nó co lại/dài ra, phần còn lại đứng im.
 *
 * Thứ tự các đường khai báo bằng ràng buộc `after`/`before` chứ không phải
 * bằng thứ tự trong mảng. Cần thế vì hình lục giác có HAI đường z độc lập
 * (`zc` cho cạnh vát trái, `zd` cho cạnh vát phải) — cả hai đều nằm giữa
 * `z0` và `z1` nhưng không có quan hệ lớn/bé với nhau.
 */

/** mm. Khoảng hở tối thiểu giữa 2 đường có ràng buộc. Chặn kéo tường xuyên nhau. */
export const MIN_GAP = 700

/** mm. Biên tuyệt đối, chặn kéo ra vô cực. */
const BOUND = 9000

export type LineDef = {
  key: string
  /** Tên hiển thị khi chọn tường đó. */
  label: string
  /** Những đường PHẢI nhỏ hơn đường này. */
  after?: string[]
  /** Những đường PHẢI lớn hơn đường này. */
  before?: string[]
}

export type ShapeDef = {
  id: ShapeId
  name: string
  lines: { x: LineDef[]; z: LineDef[] }
  /** Đỉnh đa giác: mỗi đỉnh = (tên đường x, tên đường z). */
  vertices: { x: string; z: string }[]
  /** mm, toạ độ tuyệt đối mặc định của từng đường. */
  defaults: Record<string, number>
}

/** Quy ước hướng: x tăng sang phải, z tăng về phía trước (gần người xem). */
export const SHAPES: ShapeDef[] = [
  {
    id: 'rect',
    name: 'Chữ nhật',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['x0'] },
      ],
      z: [
        { key: 'z0', label: 'Tường sau', before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['z0'] },
      ],
    },
    vertices: [
      { x: 'x0', z: 'z0' },
      { x: 'x1', z: 'z0' },
      { x: 'x1', z: 'z1' },
      { x: 'x0', z: 'z1' },
    ],
    defaults: { x0: -2000, x1: 2000, z0: -1500, z1: 1500 },
  },

  {
    id: 'cut',
    name: 'Vát 1 góc',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['xa'] },
        { key: 'xa', label: 'Mép vát', after: ['x0'], before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['xa'] },
      ],
      z: [
        { key: 'z0', label: 'Tường sau', before: ['zb'] },
        { key: 'zb', label: 'Chân vát', after: ['z0'], before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['zb'] },
      ],
    },
    vertices: [
      { x: 'x0', z: 'z0' },
      { x: 'xa', z: 'z0' }, // hết tường sau, vào cạnh xiên
      { x: 'x1', z: 'zb' }, // hết cạnh xiên
      { x: 'x1', z: 'z1' },
      { x: 'x0', z: 'z1' },
    ],
    defaults: { x0: -2000, xa: 800, x1: 2000, z0: -1500, zb: -300, z1: 1500 },
  },

  {
    id: 'beveled',
    name: 'Vát 2 góc',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['xa'] },
        { key: 'xa', label: 'Mép vát trái', after: ['x0'], before: ['xb'] },
        { key: 'xb', label: 'Mép vát phải', after: ['xa'], before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['xb'] },
      ],
      // zc và zd ĐỘC LẬP với nhau — hai cạnh vát không dính nhau.
      z: [
        { key: 'z0', label: 'Tường sau', before: ['zc', 'zd'] },
        { key: 'zc', label: 'Chân vát trái', after: ['z0'], before: ['z1'] },
        { key: 'zd', label: 'Chân vát phải', after: ['z0'], before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['zc', 'zd'] },
      ],
    },
    vertices: [
      { x: 'xa', z: 'z0' },
      { x: 'xb', z: 'z0' },
      { x: 'x1', z: 'zd' }, // cạnh vát PHẢI dùng zd
      { x: 'x1', z: 'z1' },
      { x: 'x0', z: 'z1' },
      { x: 'x0', z: 'zc' }, // cạnh vát TRÁI dùng zc
    ],
    defaults: { x0: -2000, xa: -1200, xb: 1200, x1: 2000, z0: -1500, zc: -700, zd: -700, z1: 1500 },
  },

  {
    id: 'l-shape',
    name: 'Hình L',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['xa'] },
        { key: 'xa', label: 'Tường trong (dọc)', after: ['x0'], before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['xa'] },
      ],
      z: [
        { key: 'z0', label: 'Tường sau', before: ['zb'] },
        { key: 'zb', label: 'Tường trong (ngang)', after: ['z0'], before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['zb'] },
      ],
    },
    vertices: [
      { x: 'x0', z: 'z0' },
      { x: 'x1', z: 'z0' },
      { x: 'x1', z: 'zb' },
      { x: 'xa', z: 'zb' }, // góc lõm
      { x: 'xa', z: 'z1' },
      { x: 'x0', z: 'z1' },
    ],
    defaults: { x0: -2500, xa: 500, x1: 2500, z0: -2200, zb: 300, z1: 2200 },
  },

  {
    id: 't-shape',
    name: 'Hình T',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['xa'] },
        { key: 'xa', label: 'Chân trái', after: ['x0'], before: ['xb'] },
        { key: 'xb', label: 'Chân phải', after: ['xa'], before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['xb'] },
      ],
      z: [
        { key: 'z0', label: 'Tường sau', before: ['zb'] },
        { key: 'zb', label: 'Vai chữ T', after: ['z0'], before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['zb'] },
      ],
    },
    vertices: [
      { x: 'x0', z: 'z0' },
      { x: 'x1', z: 'z0' },
      { x: 'x1', z: 'zb' },
      { x: 'xb', z: 'zb' },
      { x: 'xb', z: 'z1' },
      { x: 'xa', z: 'z1' },
      { x: 'xa', z: 'zb' },
      { x: 'x0', z: 'zb' },
    ],
    defaults: { x0: -2700, xa: -800, xb: 800, x1: 2700, z0: -2400, zb: 400, z1: 2400 },
  },

  {
    id: 'u-shape',
    name: 'Hình U',
    lines: {
      x: [
        { key: 'x0', label: 'Tường trái', before: ['xa'] },
        { key: 'xa', label: 'Hốc trái', after: ['x0'], before: ['xb'] },
        { key: 'xb', label: 'Hốc phải', after: ['xa'], before: ['x1'] },
        { key: 'x1', label: 'Tường phải', after: ['xb'] },
      ],
      z: [
        { key: 'z0', label: 'Tường sau', before: ['zb'] },
        { key: 'zb', label: 'Đáy hốc', after: ['z0'], before: ['z1'] },
        { key: 'z1', label: 'Tường trước', after: ['zb'] },
      ],
    },
    vertices: [
      { x: 'x0', z: 'z0' },
      { x: 'xa', z: 'z0' },
      { x: 'xa', z: 'zb' }, // vào hốc
      { x: 'xb', z: 'zb' },
      { x: 'xb', z: 'z0' }, // ra khỏi hốc
      { x: 'x1', z: 'z0' },
      { x: 'x1', z: 'z1' },
      { x: 'x0', z: 'z1' },
    ],
    defaults: { x0: -2700, xa: -700, xb: 700, x1: 2700, z0: -2400, zb: 200, z1: 2400 },
  },
]

export function shapeById(id: ShapeId): ShapeDef {
  return SHAPES.find((s) => s.id === id) ?? SHAPES[0]
}

export function lineDef(def: ShapeDef, key: string): LineDef | undefined {
  return [...def.lines.x, ...def.lines.z].find((l) => l.key === key)
}

/** Sinh footprint đã chuẩn hoá chiều quay. Luôn dùng hàm này. */
export function buildFootprint(id: ShapeId, params: Record<string, number>): Point[] {
  const def = shapeById(id)
  return ensurePositiveWinding(def.vertices.map((v) => ({ x: params[v.x], z: params[v.z] })))
}

/** Khoảng kéo hợp lệ của một đường, suy từ ràng buộc `after`/`before`. */
export function lineRange(
  def: ShapeDef,
  params: Record<string, number>,
  key: string,
): { min: number; max: number } {
  const line = lineDef(def, key)
  if (!line) return { min: -BOUND, max: BOUND }

  let min = -BOUND
  for (const k of line.after ?? []) min = Math.max(min, params[k] + MIN_GAP)

  let max = BOUND
  for (const k of line.before ?? []) max = Math.min(max, params[k] - MIN_GAP)

  return { min, max: Math.max(min, max) }
}

export function clampLine(
  def: ShapeDef,
  params: Record<string, number>,
  key: string,
  value: number,
): number {
  const { min, max } = lineRange(def, params, key)
  return Math.min(max, Math.max(min, value))
}

/** Kéo một bức tường thẳng: dời đúng 1 đường. */
export type LineDrag = { kind: 'line'; key: string; axis: 'x' | 'z'; label: string }

/**
 * Kéo cạnh XIÊN: dời 2 đường, mỗi đầu một cái.
 * Kết quả là cạnh xiên tịnh tiến song song với chính nó, và ĐÚNG hai cạnh
 * kề nó dài ra / ngắn lại.
 */
export type DiagonalDrag = { kind: 'diagonal'; xKey: string; zKey: string; label: string }

export type EdgeDrag = LineDrag | DiagonalDrag

export type EdgeInfo = {
  index: number
  a: Point
  b: Point
  /** mm, chiều dài thật — cạnh xiên cũng đo đúng, không phải hình chiếu. */
  length: number
  drag: EdgeDrag | null
}

/** Mô tả từng cạnh cho lớp phủ 2D: nhãn đo + cách kéo. */
export function describeEdges(def: ShapeDef, params: Record<string, number>): EdgeInfo[] {
  const n = def.vertices.length

  return def.vertices.map((va, i) => {
    const vb = def.vertices[(i + 1) % n]
    const a = { x: params[va.x], z: params[va.z] }
    const b = { x: params[vb.x], z: params[vb.z] }

    let drag: EdgeDrag | null = null
    if (va.z === vb.z) {
      drag = { kind: 'line', key: va.z, axis: 'z', label: labelOf(def, va.z) }
    } else if (va.x === vb.x) {
      drag = { kind: 'line', key: va.x, axis: 'x', label: labelOf(def, va.x) }
    } else {
      drag = diagonalDrag(def, i)
    }

    return { index: i, a, b, length: Math.hypot(b.x - a.x, b.z - a.z), drag }
  })
}

/**
 * Hai đường mà cạnh xiên thứ `i` được phép dời.
 *
 * Mỗi đầu cạnh xiên tựa vào một cạnh kề. Đường mà cạnh kề ĐANG NẰM TRÊN thì
 * không đụng vào (đụng là bức tường kề dịch cả bức). Đường còn lại của đỉnh
 * đó mới là đường tự do — dời nó chỉ làm cạnh kề dài ra hoặc ngắn lại.
 */
function diagonalDrag(def: ShapeDef, i: number): DiagonalDrag | null {
  const n = def.vertices.length
  const va = def.vertices[i]
  const vb = def.vertices[(i + 1) % n]
  const vPrev = def.vertices[(i - 1 + n) % n]
  const vNext = def.vertices[(i + 2) % n]

  // Cạnh trước nằm ngang (chung đường z với va) -> đường tự do ở va là đường x
  const freeA = vPrev.z === va.z ? { key: va.x, axis: 'x' } : { key: va.z, axis: 'z' }
  const freeB = vNext.z === vb.z ? { key: vb.x, axis: 'x' } : { key: vb.z, axis: 'z' }

  if (freeA.axis === freeB.axis) return null // suy biến, không kéo được

  const xKey = freeA.axis === 'x' ? freeA.key : freeB.key
  const zKey = freeA.axis === 'z' ? freeA.key : freeB.key
  return { kind: 'diagonal', xKey, zKey, label: 'Cạnh xiên' }
}

function labelOf(def: ShapeDef, key: string): string {
  return lineDef(def, key)?.label ?? key
}

/** Đổi hình mà giữ lại vị trí các đường TRÙNG TÊN, rồi ép lại cho hợp lệ. */
export function carryParams(
  toId: ShapeId,
  oldParams: Record<string, number>,
): Record<string, number> {
  const def = shapeById(toId)
  const next = { ...def.defaults }

  for (const line of [...def.lines.x, ...def.lines.z]) {
    if (oldParams[line.key] !== undefined) next[line.key] = oldParams[line.key]
  }

  // Vài lượt kẹp cho ràng buộc lan hết. 4 lượt thừa sức cho 4 đường mỗi trục.
  for (let pass = 0; pass < 4; pass++) {
    for (const line of [...def.lines.x, ...def.lines.z]) {
      next[line.key] = clampLine(def, next, line.key, next[line.key])
    }
  }
  return next
}

/** Test tay. Gọi từ main.tsx khi DEV. */
export function selfCheckShapes(): void {
  const assert = (ok: boolean, msg: string) => console.assert(ok, `shapes: ${msg}`)

  for (const def of SHAPES) {
    const poly = buildFootprint(def.id, def.defaults)
    assert(poly.length === def.vertices.length, `${def.id}: sai số đỉnh`)
    assert(
      poly.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)),
      `${def.id}: có đỉnh NaN — thiếu default cho đường nào đó`,
    )

    for (const line of [...def.lines.x, ...def.lines.z]) {
      assert(
        def.vertices.some((v) => v.x === line.key || v.z === line.key),
        `${def.id}: đường ${line.key} khai báo mà không đỉnh nào dùng`,
      )
      // Giá trị mặc định phải thoả chính ràng buộc của nó
      const { min, max } = lineRange(def, def.defaults, line.key)
      assert(
        def.defaults[line.key] >= min && def.defaults[line.key] <= max,
        `${def.id}: mặc định ${line.key}=${def.defaults[line.key]} nằm ngoài [${min}, ${max}]`,
      )
    }

    const edges = describeEdges(def, def.defaults)
    assert(
      edges.every((e) => e.length > 0),
      `${def.id}: có cạnh dài 0`,
    )
  }

  // Kéo tường trái KHÔNG được làm tường phải nhúc nhích
  const rect = shapeById('rect')
  const moved: Record<string, number> = { ...rect.defaults, x0: rect.defaults.x0 - 500 }
  assert(moved.x1 === rect.defaults.x1, 'kéo tường trái làm tường phải chạy theo')
  assert(
    describeEdges(rect, moved)[0].length === describeEdges(rect, rect.defaults)[0].length + 500,
    'kéo tường trái 500mm thì tường sau phải dài thêm đúng 500',
  )

  // Chặn kéo xuyên qua tường bên cạnh
  const cut = shapeById('cut')
  assert(
    clampLine(cut, cut.defaults, 'xa', 99999) === cut.defaults.x1 - MIN_GAP,
    'clampLine không chặn được ở đường kề bên phải',
  )

  // Cạnh xiên: đo chiều dài thật, không phải hình chiếu
  const cutEdges = describeEdges(cut, cut.defaults)
  const diag = cutEdges.find((e) => e.drag?.kind === 'diagonal')
  assert(diag !== undefined, 'hình vát phải có cạnh xiên kéo được')
  assert(
    Math.abs(diag!.length - Math.hypot(1200, 1200)) < 1e-6,
    `cạnh xiên phải dài ${Math.hypot(1200, 1200).toFixed(0)}mm, thực tế ${diag!.length.toFixed(0)}`,
  )
  const cutDiag = diag?.drag as DiagonalDrag | undefined
  assert(
    cutDiag?.xKey === 'xa' && cutDiag?.zKey === 'zb',
    `cạnh xiên hình Cut phải dời cặp đường (xa, zb), thực tế (${cutDiag?.xKey}, ${cutDiag?.zKey})`,
  )

  // HAI cạnh vát của hình lục giác phải ĐỘC LẬP nhau
  const bev = shapeById('beveled')
  const bevDiags = describeEdges(bev, bev.defaults).filter((e) => e.drag?.kind === 'diagonal')
  assert(bevDiags.length === 2, `hình lục giác phải có 2 cạnh xiên, có ${bevDiags.length}`)
  const keys = bevDiags.map((e) => (e.drag as DiagonalDrag).zKey)
  assert(
    keys[0] !== keys[1],
    `2 cạnh vát dùng chung đường z (${keys[0]}) — kéo cái này là cái kia chạy theo`,
  )

  console.info(`shapes.ts self-check xong — ${SHAPES.length} hình`)
}
