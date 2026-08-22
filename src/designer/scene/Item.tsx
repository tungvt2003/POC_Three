import { Select } from '@react-three/postprocessing'
import { useDragItem } from '../controls/useDragItem'
import { mm2m } from '../../lib/units'
import { productById } from '../catalog/products'
import type { Item as ItemData } from '../types'
import { GltfModel } from './GltfModel'
import { ProxyModel } from './ProxyModel'

/**
 * mm. Nhấc thảm khỏi sàn một chút.
 * `claude.md` chốt 0.001m = 1mm, kèm `polygonOffset` để khỏi z-fighting.
 */
const RUG_LIFT = 1

type Props = {
  item: ItemData
  selected: boolean
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
export function Item({ item, selected, onSelect }: Props) {
  const product = productById(item.productId)
  const isRug = item.placement === 'rug'

  const { dragging, handlers } = useDragItem({
    item,
    depthMm: product.size.d,
    onSelect,
  })

  return (
    <Select enabled={selected}>
      <group
        name={item.id}
        position={[mm2m(item.position.x), isRug ? mm2m(RUG_LIFT) : 0, mm2m(item.position.z)]}
        rotation={[0, item.rotationY, 0]}
        onPointerOver={() => (document.body.style.cursor = dragging ? 'grabbing' : 'grab')}
        onPointerOut={() => (document.body.style.cursor = '')}
        {...handlers}
      >
        {/* Có `modelUrl` thì dùng model thật, chưa có thì khối tạm. */}
        {product.modelUrl ? (
          <GltfModel url={product.modelUrl} />
        ) : (
          <ProxyModel product={product} rug={isRug} />
        )}
      </group>
    </Select>
  )
}
