import { wallLength } from '../scene/buildWalls'
import type { Opening, Wall } from '../types'

/** mm. Chừa tối thiểu ra khỏi góc phòng — cửa dính sát góc thì không lắp được ngoài đời. */
const CORNER_MARGIN = 120

export type Slot = { wallId: string; t: number }

/**
 * Khoảng trống rộng nhất còn lại trên một bức tường, và chỗ đặt giữa khoảng đó.
 * Trả `null` nếu không đủ chỗ cho vật rộng `width`.
 */
export function widestSlot(wall: Wall, width: number): { t: number; gap: number } | null {
  const L = wallLength(wall)
  const sorted = [...wall.openings].sort((a, b) => a.t - b.t)

  let best: { t: number; gap: number } | null = null
  let cursor = CORNER_MARGIN

  const consider = (from: number, to: number) => {
    const gap = to - from
    if (gap < width) return
    if (best && best.gap >= gap) return
    best = { t: from + (gap - width) / 2, gap }
  }

  for (const o of sorted) {
    consider(cursor, o.t)
    cursor = Math.max(cursor, o.t + o.width)
  }
  consider(cursor, L - CORNER_MARGIN)

  return best
}

/**
 * Chọn chỗ đặt cửa mới: bức tường còn khoảng trống RỘNG NHẤT.
 *
 * Bấm một kiểu cửa là nó hiện ra ngay trong phòng, khỏi phải ngắm trước rồi
 * bấm lên tường. Đặt xong kéo đi đâu thì kéo (`pickWall` cho kéo vòng qua góc).
 *
 * THUẦN HÀM — không đụng store, test được bằng số.
 */
export function findSlot(walls: Wall[], width: number): Slot | null {
  let best: (Slot & { gap: number }) | null = null

  for (const wall of walls) {
    const slot = widestSlot(wall, width)
    if (!slot) continue
    if (best && best.gap >= slot.gap) continue
    best = { wallId: wall.id, t: slot.t, gap: slot.gap }
  }

  return best ? { wallId: best.wallId, t: best.t } : null
}

/**
 * Kẹp `t` để lỗ nằm gọn trong tường và không đè lên lỗ nào KHÁC.
 *
 * Đè lên nhau thì `wallSlabs` bỏ qua lỗ sau, tức là CỬA BIẾN MẤT chứ không báo
 * lỗi — nên phải chặn ở đây. Đang kéo mà đụng lỗ khác thì DỪNG SÁT MÉP nó,
 * không nhảy cóc qua bên kia.
 */
export function clampT(
  wall: Wall,
  width: number,
  wanted: number,
  ignoreId?: string,
): number | null {
  const L = wallLength(wall)
  if (width > L) return null

  const others = wall.openings
    .filter((o) => o.id !== ignoreId)
    .sort((a, b) => a.t - b.t)

  let t = Math.min(Math.max(wanted, 0), L - width)

  // Đẩy ra khỏi lỗ đang đè, về phía gần với chỗ người dùng nhắm tới hơn
  for (let pass = 0; pass < others.length + 1; pass++) {
    const clash = others.find((o) => t < o.t + o.width && o.t < t + width)
    if (!clash) return t

    const left = clash.t - width
    const right = clash.t + clash.width
    const pick = Math.abs(left - wanted) <= Math.abs(right - wanted) ? left : right
    const next = Math.min(Math.max(pick, 0), L - width)
    if (next === t) return null // hết đường lách
    t = next
  }

  return null
}

/** Khoảng hở hai bên lỗ: tới lỗ kề bên, hết thì tới góc tường. */
export function neighbourGaps(
  wall: Wall,
  opening: Opening,
): { before: number; after: number } {
  const L = wallLength(wall)
  let before = 0
  let after = L

  for (const o of wall.openings) {
    if (o.id === opening.id) continue
    const end = o.t + o.width
    if (end <= opening.t) before = Math.max(before, end)
    if (o.t >= opening.t + opening.width) after = Math.min(after, o.t)
  }

  return { before: opening.t - before, after: after - (opening.t + opening.width) }
}
