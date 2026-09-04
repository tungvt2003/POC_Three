import { Select } from '@react-three/postprocessing'
import { useDragItem } from '../controls/useDragItem'
import { mm2m } from '../../lib/units'
import { productById } from '../catalog/products'
import type { Item as ItemData } from '../types'
import { GltfModel } from './GltfModel'
import { ItemGizmo } from './ItemGizmo'
import { ProxyModel } from './ProxyModel'

/**
 * mm. Nhấc thảm khỏi sàn một chút.
 * `claude.md` chốt 0.001m = 1mm, kèm `polygonOffset` để khỏi z-fighting.
 */
const RUG_LIFT = 1

type Props = {
  item: ItemData
  selected: boolean
  /** false = chỉ để ngắm: không bắt chuột, không thanh công cụ. */
  interactive: boolean
  onSelect: (id: string) => void
}

/**
 * Một món nội thất.
 *
 * Gốc toạ độ của model nằm GIỮA ĐÁY: `position` là tâm mặt sàn của món đồ,
 * `y` luôn 0 vì mọi thứ đứng trên sàn. Quy ước này làm snap tường và đường đo
 * đơn giản hẳn — khỏi phải bù trừ chiều cao.
 *
 * Chưa có model thật thì dựng khối tạm (`ProxyModel`). Điền `modelUrl` trong
 * `products.ts` là chuyển sang `useGLTF`, chỗ khác không phải sửa.
 */
export function Item({ item, selected, interactive, onSelect }: Props) {
  const product = productById(item.productId)
  const isRug = item.placement === 'rug'

  const { dragging, handlers } = useDragItem({
    item,
    widthMm: product.size.w,
    depthMm: product.size.d,
    onSelect,
  })

  return (
    <Select enabled={selected}>
      <group
        name={item.id}
        position={[mm2m(item.position.x), isRug ? mm2m(RUG_LIFT) : 0, mm2m(item.position.z)]}
        rotation={[0, item.rotationY, 0]}
        onPointerOver={
          interactive ? () => (document.body.style.cursor = dragging ? 'grabbing' : 'grab') : undefined
        }
        onPointerOut={interactive ? () => (document.body.style.cursor = '') : undefined}
        {...(interactive ? handlers : {})}
      >
        {/* Có `modelUrl` thì dùng model thật, chưa có thì khối tạm. */}
        {product.modelUrl ? (
          <GltfModel url={product.modelUrl} tint={item.color} />
        ) : (
          <ProxyModel product={product} rug={isRug} color={item.color} />
        )}

        {/* Thanh công cụ nổi: xoay, đổi màu, nhân bản, xoá */}
        {selected && <ItemGizmo item={item} />}
      </group>
    </Select>
  )
}
