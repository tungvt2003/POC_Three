import { buildFootprint } from '../catalog/shapes'
import { buildWalls } from '../scene/buildWalls'
import type { Doc } from './designStore'

/** Tăng số này khi đổi cấu trúc, để file cũ còn đọc được. */
export const EXPORT_VERSION = 1

export type DesignFile = {
  version: number
  exportedAt: string
  /** Nhắc người đọc file: mọi số đo trong đây là MILIMET. */
  units: 'mm'
  room: Doc['room']
  walls: Array<{
    id: string
    start: { x: number; z: number }
    end: { x: number; z: number }
    openings: Doc['walls'][number]['openings']
  }>
  items: Doc['items']
}

/**
 * Đóng gói thiết kế thành JSON.
 *
 * BỎ mấy thứ dẫn xuất được: `innerNormal` là `Vector3` (không tuần tự hoá
 * sạch được), `outerStart`/`outerEnd` tính lại từ `footprint` trong một nhịp.
 * File chỉ giữ thứ KHÔNG suy ra được — chính là định nghĩa của "dữ liệu".
 *
 * Mở lại: `buildFootprint(shapeId, shapeParams)` rồi `buildWalls()`, sau đó
 * gắn `openings` theo chỉ số tường.
 */
export function toDesignFile(doc: Doc): DesignFile {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    units: 'mm',
    room: doc.room,
    walls: doc.walls.map((w) => ({
      id: w.id,
      start: w.start,
      end: w.end,
      openings: w.openings,
    })),
    items: doc.items,
  }
}

/**
 * Dựng lại `Doc` từ file. Ngược của `toDesignFile`.
 *
 * File không chứa `innerNormal` hay đỉnh ngoài — sinh lại bằng `buildWalls`.
 * Cửa gắn lại theo CHỈ SỐ tường, vì id tường sinh từ chỉ số.
 *
 * Trả `null` khi file hỏng hoặc sai phiên bản. Cố ý không ném lỗi: đây là
 * đường đọc dữ liệu cũ trong `localStorage`, hỏng thì bỏ qua chứ đừng làm
 * kẹt cả ứng dụng.
 */
export function fromDesignFile(file: unknown): Doc | null {
  try {
    const f = file as DesignFile
    if (!f || f.version !== EXPORT_VERSION || f.units !== 'mm') return null
    if (!f.room?.shapeId || !f.room?.shapeParams) return null

    const footprint = buildFootprint(f.room.shapeId, f.room.shapeParams)
    if (footprint.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z))) return null

    const walls = buildWalls(footprint).map((wall, i) => {
      const saved = f.walls?.[i]
      if (saved?.openings?.length) wall.openings = saved.openings
      return wall
    })

    return {
      room: { ...f.room, footprint },
      walls,
      items: Array.isArray(f.items) ? f.items : [],
    }
  } catch {
    return null
  }
}

/**
 * Kiểm file xuất ra có lọt chuỗi đã format nào không.
 *
 * `claude.md` chốt: không bao giờ để `7'6"` lọt vào state. Đây là chỗ bắt.
 * Trả về danh sách đường dẫn vi phạm, rỗng là sạch.
 */
export function findFormattedStrings(value: unknown, path = '$'): string[] {
  if (typeof value === 'string') {
    // Dấu nháy đơn/kép hoặc đơn vị dính vào số: 7'6" · 12cm · 3.5 m
    return /['"]|\d\s*(mm|cm|m|in|ft)\b/.test(value) ? [`${path} = ${JSON.stringify(value)}`] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => findFormattedStrings(v, `${path}[${i}]`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => findFormattedStrings(v, `${path}.${k}`))
  }
  return []
}

/** Tải file JSON xuống máy. Chỉ chạy trong trình duyệt. */
export function downloadDesign(doc: Doc, filename = 'thiet-ke-phong.json'): void {
  const json = JSON.stringify(toDesignFile(doc), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  // Không thu hồi thì object URL sống tới khi đóng tab
  URL.revokeObjectURL(url)
}
