/**
 * Quy đổi đơn vị.
 *
 * Luật bất di bất dịch: state của app giữ MILIMET (number).
 * - Muốn đưa vào scene three.js  -> mm2m()
 * - Muốn hiện cho người dùng đọc -> fmtMm()
 *
 * Không hàm nào ở đây trả về giá trị để ghi ngược vào state trừ m2mm().
 */

/** three.js: 1 unit = 1 mét. Đây là chỗ duy nhất biết con số 1000. */
const MM_PER_M = 1000
const MM_PER_INCH = 25.4
const INCH_PER_FOOT = 12

/** mm -> mét, dùng khi đặt toạ độ/kích thước cho object three.js. */
export function mm2m(mm: number): number {
  return mm / MM_PER_M
}

/** mét -> mm, dùng khi nhận toạ độ world từ raycast rồi ghi vào state. */
export function m2mm(m: number): number {
  return m * MM_PER_M
}

export type DisplayUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft'

/**
 * Format mm sang chuỗi hiển thị. CHỈ dùng ở tầng UI.
 *
 * fmtMm(2286, 'ft')  -> `7'6"`
 * fmtMm(2286, 'in')  -> `90"`
 * fmtMm(2286, 'cm')  -> `228.6 cm`
 */
export function fmtMm(mm: number, unit: DisplayUnit = 'mm'): string {
  switch (unit) {
    case 'mm':
      return `${Math.round(mm)} mm`

    case 'cm':
      return `${round1(mm / 10)} cm`

    case 'm':
      return `${round2(mm / MM_PER_M)} m`

    case 'in':
      return `${Math.round(mm / MM_PER_INCH)}"`

    case 'ft': {
      // Làm tròn về inch nguyên TRƯỚC khi chia feet.
      // Nếu chia trước thì 11.6" sẽ ra 11" thay vì lên 1'0".
      const totalInch = Math.round(mm / MM_PER_INCH)
      const feet = Math.floor(totalInch / INCH_PER_FOOT)
      const inch = totalInch % INCH_PER_FOOT
      return inch === 0 ? `${feet}'` : `${feet}'${inch}"`
    }
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Test tay. Gọi từ main.tsx khi DEV.
 * Chưa cần vitest ở giai đoạn POC — console.assert là đủ để bắt lỗi ngu.
 */
export function selfCheckUnits(): void {
  const eq = (label: string, got: unknown, want: unknown) =>
    console.assert(got === want, `units: ${label} — got ${String(got)}, want ${String(want)}`)

  eq('mm2m(3000)', mm2m(3000), 3)
  eq('mm2m(1)', mm2m(1), 0.001)
  eq('m2mm(2.5)', m2mm(2.5), 2500)
  eq("fmtMm(2286,'ft')", fmtMm(2286, 'ft'), `7'6"`)
  eq("fmtMm(2438,'ft')", fmtMm(2438, 'ft'), `8'`) // 96.0" chẵn -> bỏ phần inch
  eq("fmtMm(2286,'in')", fmtMm(2286, 'in'), `90"`)
  eq("fmtMm(2286,'cm')", fmtMm(2286, 'cm'), '228.6 cm')
  eq("fmtMm(4000,'m')", fmtMm(4000, 'm'), '4 m')
  eq("fmtMm(400,'mm')", fmtMm(400, 'mm'), '400 mm')

  console.info('units.ts self-check xong')
}
