import type { Item } from '../types'

/** Hình khối TẠM khi chưa có model thật. */
export type ProxyShape =
  | 'table'
  | 'desk'
  | 'seat'
  | 'sofa'
  | 'shelf'
  | 'cabinet'
  | 'bed'
  | 'tv'
  | 'ottoman'
  | 'lamp'
  | 'plant'
  | 'flat'
  | 'round'

export type Category = 'Sofa & ghế' | 'Bàn' | 'Tủ & kệ' | 'Giường' | 'Thảm' | 'Trang trí'

export type Product = {
  id: string
  name: string
  category: Category
  /** mm, kích thước phủ bì: rộng (theo trục X cục bộ) × sâu (Z) × cao (Y). */
  size: { w: number; d: number; h: number }
  placement: Item['placement']
  color: string
  proxy: ProxyShape
  /**
   * Bảng màu chọn được cho món này. Bấm swatch là ghi vào `Item.color`.
   * Chỉ là MÀU, không phải mã biến thể sản phẩm — POC không làm SKU.
   */
  colors?: string[]
  /**
   * Đường dẫn tới file .glb/.gltf trong `public/assets/models/`.
   * `null` = CHƯA CÓ MODEL, dựng khối tạm từ `size` + `proxy`.
   *
   * Có model thật rồi thì chỉ điền chuỗi này vào, không phải sửa gì khác —
   * `Item.tsx` tự chuyển sang `useGLTF`.
   */
  modelUrl: string | null
}

const M = '/assets/models'

/** Bảng màu dùng lại giữa nhiều món, gom lại cho khỏi chép đi chép lại. */
const PALETTE = {
  fabric: ['#b9b1a3', '#8d8477', '#6d7a74', '#5a6b7d', '#8a6a63', '#3f4249', '#d8cdb9'],
  wood: ['#c9a878', '#a87f52', '#7a5c40', '#5a4130', '#3d332c', '#e0cdae'],
  paint: ['#f2efe9', '#dcd6ca', '#9aa5a0', '#6b7b86', '#4a4f57', '#2f3136'],
  metal: ['#c9c4bd', '#8c8c94', '#5c5c66', '#2f2f38', '#b08d57'],
  rug: ['#9c6f63', '#b9a88c', '#6f7d76', '#4f5a6b', '#c9bda8', '#3f3a38'],
} as const

/**
 * Danh mục nội thất.
 *
 * Kích thước là số THẬT ngoài đời, không phải ước lượng cho đẹp. Kéo thả,
 * snap tường và đường đo đều dựa vào mấy con số này, nên model thật về sau
 * phải khớp — sai kích thước thì đo đạc sai theo.
 *
 * Món nào có `modelUrl` thì `size` là KÍCH THƯỚC ĐO ĐƯỢC của chính model, lấy
 * từ log `model X: w=… d=… h=…` mà `GltfModel` in ra khi chạy DEV. Món nào
 * chưa có model thì lấy số catalogue thông dụng.
 */
export const PRODUCTS: Product[] = [
  // ---------------- sofa & ghế ----------------
  {
    id: 'sofa-2',
    name: 'Sofa 2 chỗ',
    category: 'Sofa & ghế',
    size: { w: 1571, d: 658, h: 797 },
    placement: 'floor',
    color: '#8d8477',
    proxy: 'sofa',
    colors: [...PALETTE.fabric],
    modelUrl: `${M}/Sofa_01/Sofa_01.gltf`,
  },
  {
    id: 'sofa-3',
    name: 'Sofa 3 chỗ',
    category: 'Sofa & ghế',
    size: { w: 2200, d: 900, h: 820 },
    placement: 'floor',
    color: '#6d7a74',
    proxy: 'sofa',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },
  {
    id: 'sofa-l',
    name: 'Sofa góc chữ L',
    category: 'Sofa & ghế',
    size: { w: 2600, d: 1700, h: 820 },
    placement: 'floor',
    color: '#5a6b7d',
    proxy: 'sofa',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },
  {
    id: 'armchair',
    name: 'Ghế bành',
    category: 'Sofa & ghế',
    size: { w: 848, d: 766, h: 1065 },
    placement: 'floor',
    color: '#9a8f80',
    proxy: 'sofa',
    colors: [...PALETTE.fabric],
    modelUrl: `${M}/ArmChair_01/ArmChair_01.gltf`,
  },
  {
    id: 'ottoman',
    name: 'Đôn ngồi',
    category: 'Sofa & ghế',
    size: { w: 700, d: 700, h: 420 },
    placement: 'floor',
    color: '#8a6a63',
    proxy: 'ottoman',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },
  {
    id: 'dining-chair',
    name: 'Ghế ăn',
    category: 'Sofa & ghế',
    size: { w: 460, d: 520, h: 900 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'seat',
    colors: [...PALETTE.wood],
    modelUrl: null,
  },
  {
    // Ghế lưng cao thật — model cao 2.27m, KHÔNG phải ghế ăn thường
    id: 'tall-chair',
    name: 'Ghế lưng cao',
    category: 'Sofa & ghế',
    size: { w: 688, d: 658, h: 2274 },
    placement: 'floor',
    color: '#6f6256',
    proxy: 'seat',
    colors: [...PALETTE.wood],
    modelUrl: `${M}/WoodenChair_01/WoodenChair_01.gltf`,
  },

  // ---------------- bàn ----------------
  {
    id: 'coffee-table',
    name: 'Bàn trà',
    category: 'Bàn',
    size: { w: 1540, d: 973, h: 523 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    colors: [...PALETTE.wood],
    modelUrl: `${M}/CoffeeTable_01/CoffeeTable_01.gltf`,
  },
  {
    id: 'long-table',
    name: 'Bàn dài',
    category: 'Bàn',
    size: { w: 1800, d: 657, h: 549 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    colors: [...PALETTE.wood],
    modelUrl: `${M}/WoodenTable_01/WoodenTable_01.gltf`,
  },
  {
    id: 'side-table',
    name: 'Đôn gỗ',
    category: 'Bàn',
    size: { w: 301, d: 301, h: 418 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    colors: [...PALETTE.wood],
    modelUrl: `${M}/WoodenTable_02/WoodenTable_02.gltf`,
  },
  {
    id: 'dining-table',
    name: 'Bàn ăn 6 chỗ',
    category: 'Bàn',
    size: { w: 1800, d: 900, h: 750 },
    placement: 'floor',
    color: '#8a6a45',
    proxy: 'table',
    colors: [...PALETTE.wood],
    modelUrl: null,
  },
  {
    id: 'desk',
    name: 'Bàn làm việc',
    category: 'Bàn',
    size: { w: 1400, d: 700, h: 750 },
    placement: 'floor',
    color: '#4a4f57',
    proxy: 'desk',
    colors: [...PALETTE.paint],
    modelUrl: null,
  },
  {
    id: 'nightstand',
    name: 'Tab đầu giường',
    category: 'Bàn',
    size: { w: 450, d: 400, h: 550 },
    placement: 'floor',
    color: '#c9a878',
    proxy: 'cabinet',
    colors: [...PALETTE.wood],
    modelUrl: null,
  },

  // ---------------- tủ & kệ ----------------
  {
    id: 'bookshelf',
    name: 'Kệ sách',
    category: 'Tủ & kệ',
    size: { w: 1003, d: 257, h: 2080 },
    placement: 'floor',
    color: '#6b5340',
    proxy: 'shelf',
    colors: [...PALETTE.wood],
    modelUrl: `${M}/Shelf_01/Shelf_01.gltf`,
  },
  {
    id: 'wardrobe',
    name: 'Tủ quần áo',
    category: 'Tủ & kệ',
    size: { w: 1800, d: 600, h: 2200 },
    placement: 'floor',
    color: '#f2efe9',
    proxy: 'cabinet',
    colors: [...PALETTE.paint, ...PALETTE.wood],
    modelUrl: null,
  },
  {
    id: 'dresser',
    name: 'Tủ ngăn kéo',
    category: 'Tủ & kệ',
    size: { w: 1400, d: 480, h: 800 },
    placement: 'floor',
    color: '#dcd6ca',
    proxy: 'cabinet',
    colors: [...PALETTE.paint, ...PALETTE.wood],
    modelUrl: null,
  },
  {
    id: 'tv-unit',
    name: 'Kệ TV',
    category: 'Tủ & kệ',
    size: { w: 1600, d: 420, h: 500 },
    placement: 'floor',
    color: '#3d332c',
    proxy: 'tv',
    colors: [...PALETTE.wood, ...PALETTE.paint],
    modelUrl: null,
  },
  {
    id: 'sideboard',
    name: 'Tủ buffet',
    category: 'Tủ & kệ',
    size: { w: 1600, d: 450, h: 850 },
    placement: 'floor',
    color: '#5a4130',
    proxy: 'cabinet',
    colors: [...PALETTE.wood, ...PALETTE.paint],
    modelUrl: null,
  },

  // ---------------- giường ----------------
  {
    id: 'bed-double',
    name: 'Giường đôi 1m6',
    category: 'Giường',
    size: { w: 1600, d: 2100, h: 1000 },
    placement: 'floor',
    color: '#b9b1a3',
    proxy: 'bed',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },
  {
    id: 'bed-king',
    name: 'Giường king 1m8',
    category: 'Giường',
    size: { w: 1800, d: 2100, h: 1100 },
    placement: 'floor',
    color: '#8d8477',
    proxy: 'bed',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },
  {
    id: 'bed-single',
    name: 'Giường đơn 1m',
    category: 'Giường',
    size: { w: 1000, d: 2000, h: 900 },
    placement: 'floor',
    color: '#d8cdb9',
    proxy: 'bed',
    colors: [...PALETTE.fabric],
    modelUrl: null,
  },

  // ---------------- thảm ----------------
  {
    id: 'rug',
    name: 'Thảm chữ nhật',
    category: 'Thảm',
    size: { w: 2000, d: 1400, h: 10 },
    placement: 'rug',
    color: '#9c6f63',
    proxy: 'flat',
    colors: [...PALETTE.rug],
    modelUrl: null,
  },
  {
    id: 'rug-large',
    name: 'Thảm lớn',
    category: 'Thảm',
    size: { w: 3000, d: 2000, h: 10 },
    placement: 'rug',
    color: '#b9a88c',
    proxy: 'flat',
    colors: [...PALETTE.rug],
    modelUrl: null,
  },
  {
    id: 'rug-round',
    name: 'Thảm tròn',
    category: 'Thảm',
    size: { w: 1800, d: 1800, h: 10 },
    placement: 'rug',
    color: '#6f7d76',
    proxy: 'round',
    colors: [...PALETTE.rug],
    modelUrl: null,
  },

  // ---------------- trang trí ----------------
  {
    id: 'floor-lamp',
    name: 'Đèn cây',
    category: 'Trang trí',
    size: { w: 400, d: 400, h: 1600 },
    placement: 'floor',
    color: '#b08d57',
    proxy: 'lamp',
    colors: [...PALETTE.metal],
    modelUrl: null,
  },
  {
    id: 'plant-tall',
    name: 'Cây cảnh cao',
    category: 'Trang trí',
    size: { w: 700, d: 700, h: 1500 },
    placement: 'floor',
    color: '#4f7a4a',
    proxy: 'plant',
    colors: ['#4f7a4a', '#38603a', '#6d8f5a', '#7e6a4f'],
    modelUrl: null,
  },
  {
    id: 'plant-small',
    name: 'Chậu cây nhỏ',
    category: 'Trang trí',
    size: { w: 400, d: 400, h: 700 },
    placement: 'floor',
    color: '#4f7a4a',
    proxy: 'plant',
    colors: ['#4f7a4a', '#38603a', '#6d8f5a', '#7e6a4f'],
    modelUrl: null,
  },
]

export function productById(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0]
}

/** Nhóm theo `category`, giữ nguyên thứ tự khai báo. */
export function productGroups(): { category: Category; items: Product[] }[] {
  const out: { category: Category; items: Product[] }[] = []
  for (const p of PRODUCTS) {
    const last = out[out.length - 1]
    if (last && last.category === p.category) last.items.push(p)
    else out.push({ category: p.category, items: [p] })
  }
  return out
}
