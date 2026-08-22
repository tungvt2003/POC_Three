export type FloorMaterial = {
  id: string
  name: string
  /** mm, kích thước THẬT của 1 ô/1 tấm ván. Dùng để tính repeat của texture. */
  tile: { w: number; h: number }
  base: string
  grain: string
  seam: string
  roughness: number
}

/**
 * Vật liệu sàn.
 *
 * POC chưa có file texture -> vẽ bằng <canvas> (xem floorTexture.ts).
 * Đổi sang ảnh thật ở D4 chỉ cần thay hàm sinh texture, `tile` giữ nguyên
 * vì đó là kích thước vật lý, không phụ thuộc ảnh.
 */
export const FLOOR_MATERIALS: FloorMaterial[] = [
  {
    id: 'oak-plank',
    name: 'Ván sồi',
    tile: { w: 1200, h: 190 },
    base: '#c39a6b',
    grain: '#a87f52',
    seam: '#7d5a38',
    roughness: 0.75,
  },
  {
    id: 'walnut-plank',
    name: 'Ván óc chó',
    tile: { w: 1200, h: 190 },
    base: '#6b4b35',
    grain: '#573c2a',
    seam: '#3b281c',
    roughness: 0.65,
  },
  {
    id: 'grey-tile',
    name: 'Gạch xám',
    tile: { w: 600, h: 600 },
    base: '#b8b6b2',
    grain: '#a9a7a3',
    seam: '#8d8b88',
    roughness: 0.45,
  },
]

export function floorById(id: string): FloorMaterial {
  return FLOOR_MATERIALS.find((m) => m.id === id) ?? FLOOR_MATERIALS[0]
}
