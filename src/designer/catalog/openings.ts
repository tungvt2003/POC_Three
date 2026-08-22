export type OpeningKind = 'door' | 'window'

/**
 * Kiểu cửa / cửa sổ dựng bằng THAM SỐ, không load file model.
 *
 * `cols`/`rows` là số ô kính chia ngang và dọc — đủ để phân biệt cửa kính
 * một tấm với cửa Pháp chia ô nhỏ. `leaves` là số cánh; 2 cánh thì có thêm
 * một nẹp đứng to ở giữa.
 */
export type OpeningStyle = {
  id: string
  name: string
  kind: OpeningKind
  /** mm, kích thước mặc định lúc đặt. Đặt xong sửa được. */
  width: number
  height: number
  /** mm, mép dưới cách sàn. Cửa đi = 0. */
  elevation: number
  cols: number
  rows: number
  leaves: 1 | 2
  /** false = tấm đặc (cửa gỗ), true = kính. */
  glass: boolean
}

/** mm. Bề rộng nẹp chia ô. */
export const MULLION = 45

export const OPENING_STYLES: OpeningStyle[] = [
  // ----- cửa đi -----
  {
    id: 'door-single',
    name: 'Cửa đơn',
    kind: 'door',
    width: 915,
    height: 2032,
    elevation: 0,
    cols: 1,
    rows: 2,
    leaves: 1,
    glass: false,
  },
  {
    id: 'door-glass',
    name: 'Cửa kính',
    kind: 'door',
    width: 915,
    height: 2032,
    elevation: 0,
    cols: 1,
    rows: 1,
    leaves: 1,
    glass: true,
  },
  {
    id: 'door-french',
    name: 'Cửa Pháp đôi',
    kind: 'door',
    width: 1830,
    height: 2032,
    elevation: 0,
    cols: 3,
    rows: 5,
    leaves: 2,
    glass: true,
  },
  {
    id: 'door-panel-double',
    name: 'Cửa panel đôi',
    kind: 'door',
    width: 1830,
    height: 2032,
    elevation: 0,
    cols: 1,
    rows: 2,
    leaves: 2,
    glass: false,
  },
  {
    id: 'door-bifold',
    name: 'Cửa xếp đôi',
    kind: 'door',
    width: 1524,
    height: 2032,
    elevation: 0,
    cols: 4,
    rows: 2,
    leaves: 2,
    glass: false,
  },
  {
    id: 'door-glass-double',
    name: 'Cửa kính đôi',
    kind: 'door',
    width: 1830,
    height: 2032,
    elevation: 0,
    cols: 1,
    rows: 1,
    leaves: 2,
    glass: true,
  },

  // ----- cửa sổ -----
  {
    id: 'win-hung',
    name: 'Cửa sổ hất',
    kind: 'window',
    width: 900,
    height: 1200,
    elevation: 900,
    cols: 1,
    rows: 2,
    leaves: 1,
    glass: true,
  },
  {
    id: 'win-slider',
    name: 'Cửa sổ trượt',
    kind: 'window',
    width: 1500,
    height: 1200,
    elevation: 900,
    cols: 2,
    rows: 1,
    leaves: 2,
    glass: true,
  },
  {
    id: 'win-fixed',
    name: 'Cửa sổ cố định',
    kind: 'window',
    width: 1800,
    height: 1300,
    elevation: 850,
    cols: 1,
    rows: 1,
    leaves: 1,
    glass: true,
  },
]

export function styleById(id: string): OpeningStyle {
  return OPENING_STYLES.find((s) => s.id === id) ?? OPENING_STYLES[0]
}

export const DOOR_STYLES = OPENING_STYLES.filter((s) => s.kind === 'door')
export const WINDOW_STYLES = OPENING_STYLES.filter((s) => s.kind === 'window')

/** Một thanh nẹp: khoảng `[from, to]` theo trục nào đó, đơn vị mm. */
export type Bar = { from: number; to: number }

/**
 * Vị trí các thanh nẹp chia ô, tính trong khoảng `[lo, hi]`.
 *
 * `count` = số Ô, nên số nẹp là `count - 1`. Nẹp giữa của cửa 2 cánh rộng
 * gấp đôi — đó là chỗ hai cánh khép lại.
 */
export function mullionBars(lo: number, hi: number, count: number, wideMiddle = false): Bar[] {
  const bars: Bar[] = []
  const span = hi - lo
  for (let i = 1; i < count; i++) {
    const center = lo + (span * i) / count
    const isMiddle = wideMiddle && count % 2 === 0 && i === count / 2
    const half = (isMiddle ? MULLION : MULLION / 2)
    bars.push({ from: center - half, to: center + half })
  }
  return bars
}
