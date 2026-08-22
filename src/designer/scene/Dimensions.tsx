import { Html, Line } from '@react-three/drei'
import { useMemo } from 'react'
import { fmtMm, mm2m } from '../../lib/units'
import { useUiStore } from '../../ui/uiStore'
import { productById } from '../catalog/products'
import { NARROW, itemFootprint, measureClearances } from '../controls/clearance'
import { useDesignStore } from '../store/designStore'

/** mm. Nhấc đường đo khỏi sàn cho khỏi z-fighting. */
const LIFT = 15

/**
 * Đường đo khoảng hở từ món đồ ĐANG CHỌN tới các bức tường quanh nó.
 *
 * Chỉ hiện cho món đang chọn. Hiện hết mọi món thì vừa rối vừa tốn — mỗi nhãn
 * là một thẻ DOM thật (`<Html>` của drei), không phải texture.
 *
 * Hở dưới 600mm thì nhãn đỏ: lối đi hẹp, người không lách qua thoải mái được.
 */
export function Dimensions() {
  const items = useDesignStore((s) => s.doc.items)
  const walls = useDesignStore((s) => s.doc.walls)
  const selectedId = useDesignStore((s) => s.selectedId)
  const unit = useUiStore((s) => s.unit)

  const item = items.find((it) => it.id === selectedId)

  const clearances = useMemo(() => {
    if (!item) return []
    const product = productById(item.productId)
    const corners = itemFootprint(item.position, product.size.w, product.size.d, item.rotationY)
    return measureClearances(corners, walls)
  }, [item, walls])

  if (!item) return null

  return (
    <group name="dimensions">
      {clearances.map((c) => {
        const narrow = c.gap < NARROW
        const y = mm2m(LIFT)
        return (
          <group key={c.wallId}>
            <Line
              points={[
                [mm2m(c.from.x), y, mm2m(c.from.z)],
                [mm2m(c.to.x), y, mm2m(c.to.z)],
              ]}
              color={narrow ? '#e2564d' : '#2f2f38'}
              lineWidth={2}
            />
            <Html
              position={[
                mm2m((c.from.x + c.to.x) / 2),
                mm2m(LIFT + 60),
                mm2m((c.from.z + c.to.z) / 2),
              ]}
              center
              // Nhãn không được chắn chuột — chắn là kéo đồ qua bị đứt tay kéo
              pointerEvents="none"
            >
              <span className={'dim-label' + (narrow ? ' is-narrow' : '')}>
                {fmtMm(c.gap, unit)}
              </span>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
