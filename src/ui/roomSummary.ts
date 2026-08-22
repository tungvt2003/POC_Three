import { shapeById } from '../designer/catalog/shapes'
import type { Room, Wall } from '../designer/types'
import { bounds, signedArea } from '../lib/polygon'

/**
 * Tóm tắt phòng cho panel chế độ thiết kế.
 * Toàn số MM — chỗ gọi tự lo format theo đơn vị người dùng chọn.
 */
export type RoomSummary = {
  shapeName: string
  /** mm, kích thước HỘP BAO. Hình L/U thì đây không phải chiều dài tường nào cả. */
  boxWidth: number
  boxDepth: number
  height: number
  wallCount: number
  doorCount: number
  windowCount: number
  /** mm², diện tích sàn thật của đa giác, không phải hộp bao. */
  floorArea: number
}

export function summarize(room: Room, walls: Wall[]): RoomSummary {
  const b = bounds(room.footprint)
  const openings = walls.flatMap((w) => w.openings)

  return {
    shapeName: shapeById(room.shapeId).name,
    boxWidth: b.maxX - b.minX,
    boxDepth: b.maxZ - b.minZ,
    height: room.height,
    wallCount: walls.length,
    doorCount: openings.filter((o) => o.kind === 'door').length,
    windowCount: openings.filter((o) => o.kind === 'window').length,
    // Đa giác đã chuẩn hoá chiều quay dương nên diện tích luôn dương
    floorArea: signedArea(room.footprint),
  }
}

/** mm² -> m², làm tròn 1 chữ số. */
export function areaM2(mm2: number): number {
  return Math.round(mm2 / 1000) / 1000
}
