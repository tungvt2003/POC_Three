import type { Item } from '../types'

/** Hình khối TẠM khi chưa có model thật. */
export type ProxyShape = 'table' | 'seat' | 'sofa' | 'shelf' | 'flat'

export type Product = {
  id: string
  name: string
  /** mm, kích thước phủ bì: rộng (theo trục X cục bộ) × sâu (Z) × cao (Y). */
  size: { w: number; d: number; h: number }
  placement: Item['placement']
  color: string
  proxy: ProxyShape
  /**
   * Đường dẫn tới file .glb trong `public/assets/models/`.
   * `null` = CHƯA CÓ MODEL, dựng khối tạm từ `size` + `proxy`.
   *
   * Có model thật rồi thì chỉ điền chuỗi này vào, không phải sửa gì khác —
   * `Item.tsx` tự chuyển sang `useGLTF`.
   */
  modelUrl: string | null
}

/**
 * Danh mục nội thất.
 *
 * Kích thước là số THẬT ngoài đời, không phải ước lượng cho đẹp. Kéo thả,
 * snap tường và đường đo (D10–D11) đều dựa vào mấy con số này, nên model thật
 * về sau phải khớp — sai kích thước thì đo đạc sai theo.
 */
const M = '/assets/models'

/**
 * `size` là KÍCH THƯỚC ĐO ĐƯỢC của chính model, không phải số ước lượng.
 * Lấy từ log `model X: w=… d=… h=…` mà `GltfModel` in ra khi chạy DEV.
 * Lệch số này là snap tường và đường đo sai theo.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'sofa-2',
    name: 'Sofa 2 chỗ',
    size: { w: 1571, d: 658, h: 797 },
    placement: 'floor',
    color: '#8d8477',
    proxy: 'sofa',
    modelUrl: `${M}/Sofa_01/Sofa_01.gltf`,
  },
  {
    id: 'armchair',
    name: 'Ghế bành',
    size: { w: 848, d: 766, h: 1065 },
    placement: 'floor',
    color: '#9a8f80',
    proxy: 'sofa',
    modelUrl: `${M}/ArmChair_01/ArmChair_01.gltf`,
  },
  {
    id: 'coffee-table',
    name: 'Bàn trà',
    size: { w: 1540, d: 973, h: 523 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    modelUrl: `${M}/CoffeeTable_01/CoffeeTable_01.gltf`,
  },
  {
    id: 'long-table',
    name: 'Bàn dài',
    size: { w: 1800, d: 657, h: 549 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    modelUrl: `${M}/WoodenTable_01/WoodenTable_01.gltf`,
  },
  {
    // Ghế lưng cao thật — model cao 2.27m, KHÔNG phải ghế ăn thường
    id: 'tall-chair',
    name: 'Ghế lưng cao',
    size: { w: 688, d: 658, h: 2274 },
    placement: 'floor',
    color: '#6f6256',
    proxy: 'seat',
    modelUrl: `${M}/WoodenChair_01/WoodenChair_01.gltf`,
  },
  {
    id: 'side-table',
    name: 'Đôn gỗ',
    size: { w: 301, d: 301, h: 418 },
    placement: 'floor',
    color: '#7a5c40',
    proxy: 'table',
    modelUrl: `${M}/WoodenTable_02/WoodenTable_02.gltf`,
  },
  {
    id: 'bookshelf',
    name: 'Kệ sách',
    size: { w: 1003, d: 257, h: 2080 },
    placement: 'floor',
    color: '#6b5340',
    proxy: 'shelf',
    modelUrl: `${M}/Shelf_01/Shelf_01.gltf`,
  },
  {
    // Chưa tìm được model thảm CC0 nào -> vẫn dùng khối tạm
    id: 'rug',
    name: 'Thảm',
    size: { w: 2000, d: 1400, h: 10 },
    placement: 'rug',
    color: '#9c6f63',
    proxy: 'flat',
    modelUrl: null,
  },
]

export function productById(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0]
}
