/** Cách vẽ hoa văn. Quyết định hàm sinh texture trong `floorTexture.ts`. */
export type FloorPattern =
  | 'plank' // ván dài, so le
  | 'herringbone' // xương cá
  | 'chevron' // mũi tên
  | 'tile' // gạch vuông trơn
  | 'checker' // caro 2 màu
  | 'hex' // gạch lục giác
  | 'marble' // đá vân
  | 'carpet' // thảm dệt
  | 'concrete' // bê tông mài

export type FloorMaterial = {
  id: string
  name: string
  group: 'Gỗ' | 'Gạch' | 'Đá' | 'Mềm'
  pattern: FloorPattern
  /**
   * mm, kích thước THẬT của MỘT Ô LẶP hoàn chỉnh của hoa văn — không phải một
   * viên gạch hay một thanh ván lẻ. Sàn ván lặp theo cụm 2×4 thanh, caro lặp
   * theo cụm 2×2 viên. Đây là số dùng để tính `repeat` của texture.
   */
  tile: { w: number; h: number }
  base: string
  grain: string
  seam: string
  /** Màu thứ hai — caro, xương cá, vân đá dùng tới. Bỏ trống thì suy từ `grain`. */
  accent?: string
  roughness: number
}

/**
 * Vật liệu sàn.
 *
 * POC chưa có file texture -> vẽ bằng <canvas> (xem floorTexture.ts).
 * Đổi sang ảnh thật chỉ cần thay hàm sinh texture, `tile` giữ nguyên vì đó là
 * kích thước vật lý, không phụ thuộc ảnh.
 *
 * `tile` của hoa văn ghép (xương cá, caro, lục giác) là kích thước một Ô LẶP
 * hoàn chỉnh, không phải một viên — hai viên gạch caro mới thành một ô lặp.
 */
export const FLOOR_MATERIALS: FloorMaterial[] = [
  // ---------- gỗ ----------
  {
    id: 'oak-plank',
    name: 'Ván sồi',
    group: 'Gỗ',
    pattern: 'plank',
    tile: { w: 2400, h: 760 },
    base: '#c39a6b',
    grain: '#a87f52',
    seam: '#7d5a38',
    roughness: 0.75,
  },
  {
    id: 'walnut-plank',
    name: 'Ván óc chó',
    group: 'Gỗ',
    pattern: 'plank',
    tile: { w: 2400, h: 760 },
    base: '#6b4b35',
    grain: '#573c2a',
    seam: '#3b281c',
    roughness: 0.65,
  },
  {
    id: 'ash-plank',
    name: 'Ván tần bì sáng',
    group: 'Gỗ',
    pattern: 'plank',
    tile: { w: 2800, h: 800 },
    base: '#ddc7a6',
    grain: '#c8ad88',
    seam: '#a98f6c',
    roughness: 0.7,
  },
  {
    id: 'ebony-plank',
    name: 'Ván gỗ đen',
    group: 'Gỗ',
    pattern: 'plank',
    tile: { w: 2400, h: 700 },
    base: '#3d332c',
    grain: '#2d251f',
    seam: '#191411',
    roughness: 0.55,
  },
  {
    id: 'oak-herringbone',
    name: 'Xương cá sồi',
    group: 'Gỗ',
    pattern: 'herringbone',
    tile: { w: 900, h: 900 },
    base: '#c8a071',
    grain: '#ab8253',
    seam: '#8a6840',
    accent: '#b78f60',
    roughness: 0.7,
  },
  {
    id: 'walnut-chevron',
    name: 'Mũi tên óc chó',
    group: 'Gỗ',
    pattern: 'chevron',
    tile: { w: 800, h: 800 },
    base: '#7a563c',
    grain: '#65462f',
    seam: '#4a3122',
    accent: '#8c6547',
    roughness: 0.62,
  },

  // ---------- gạch ----------
  {
    id: 'grey-tile',
    name: 'Gạch xám',
    group: 'Gạch',
    pattern: 'tile',
    tile: { w: 600, h: 600 },
    base: '#b8b6b2',
    grain: '#a9a7a3',
    seam: '#8d8b88',
    roughness: 0.45,
  },
  {
    id: 'cream-tile',
    name: 'Gạch kem',
    group: 'Gạch',
    pattern: 'tile',
    tile: { w: 800, h: 800 },
    base: '#e6ded0',
    grain: '#d8cfbe',
    seam: '#bdb2a0',
    roughness: 0.4,
  },
  {
    id: 'checker-bw',
    name: 'Caro đen trắng',
    group: 'Gạch',
    pattern: 'checker',
    tile: { w: 800, h: 800 },
    base: '#efece6',
    grain: '#dedbd4',
    seam: '#a9a49c',
    accent: '#2f2c2a',
    roughness: 0.35,
  },
  {
    id: 'checker-terracotta',
    name: 'Caro đất nung',
    group: 'Gạch',
    pattern: 'checker',
    tile: { w: 700, h: 700 },
    base: '#e8dccb',
    grain: '#d9cbb6',
    seam: '#a8917c',
    accent: '#b5674a',
    roughness: 0.45,
  },
  {
    id: 'hex-white',
    name: 'Lục giác trắng',
    group: 'Gạch',
    pattern: 'hex',
    tile: { w: 520, h: 600 },
    base: '#f0eee9',
    grain: '#e3e0d9',
    seam: '#b0aba2',
    roughness: 0.35,
  },
  {
    id: 'hex-slate',
    name: 'Lục giác xám đá',
    group: 'Gạch',
    pattern: 'hex',
    tile: { w: 520, h: 600 },
    base: '#6e7278',
    grain: '#61656b',
    seam: '#42464b',
    roughness: 0.5,
  },

  // ---------- đá ----------
  {
    id: 'marble-white',
    name: 'Đá cẩm thạch trắng',
    group: 'Đá',
    pattern: 'marble',
    tile: { w: 1200, h: 1200 },
    base: '#f2f1ee',
    grain: '#cfcdc8',
    seam: '#b9b6b0',
    accent: '#8f8d88',
    roughness: 0.22,
  },
  {
    id: 'marble-emperador',
    name: 'Đá cẩm thạch nâu',
    group: 'Đá',
    pattern: 'marble',
    tile: { w: 1200, h: 1200 },
    base: '#6c5646',
    grain: '#54402f',
    seam: '#3f2f22',
    accent: '#c9b39a',
    roughness: 0.25,
  },
  {
    id: 'concrete-polished',
    name: 'Bê tông mài',
    group: 'Đá',
    pattern: 'concrete',
    tile: { w: 2400, h: 2400 },
    base: '#a8a7a4',
    grain: '#989794',
    seam: '#8b8a87',
    roughness: 0.55,
  },

  // ---------- mềm ----------
  {
    id: 'carpet-sand',
    name: 'Thảm cát',
    group: 'Mềm',
    pattern: 'carpet',
    tile: { w: 400, h: 400 },
    base: '#cbbca6',
    grain: '#b8a88f',
    seam: '#b8a88f',
    roughness: 0.95,
  },
  {
    id: 'carpet-charcoal',
    name: 'Thảm than chì',
    group: 'Mềm',
    pattern: 'carpet',
    tile: { w: 400, h: 400 },
    base: '#4d4d52',
    grain: '#3f3f44',
    seam: '#3f3f44',
    roughness: 0.95,
  },
]

export function floorById(id: string): FloorMaterial {
  return FLOOR_MATERIALS.find((m) => m.id === id) ?? FLOOR_MATERIALS[0]
}

/** Nhóm theo `group`, giữ nguyên thứ tự khai báo. */
export function floorGroups(): { group: FloorMaterial['group']; items: FloorMaterial[] }[] {
  const out: { group: FloorMaterial['group']; items: FloorMaterial[] }[] = []
  for (const m of FLOOR_MATERIALS) {
    const last = out[out.length - 1]
    if (last && last.group === m.group) last.items.push(m)
    else out.push({ group: m.group, items: [m] })
  }
  return out
}
