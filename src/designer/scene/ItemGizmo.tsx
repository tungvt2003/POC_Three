import { Html } from '@react-three/drei'
import { useState } from 'react'
import { mm2m } from '../../lib/units'
import { productById } from '../catalog/products'
import { useDesignStore } from '../store/designStore'
import type { Item } from '../types'

/** mm. Thanh công cụ nổi cao hơn đỉnh món đồ chừng này. */
const HOVER = 420

const DEG = 180 / Math.PI

type Panel = 'none' | 'rotate' | 'color'

/**
 * Thanh công cụ nổi ngay trên món đồ ĐANG CHỌN.
 *
 * Đặt ngay trong cảnh chứ không nhét hết vào sidebar: mắt đang nhìn món đồ thì
 * nút bấm phải ở đó, không bắt rê chuột đi cả màn hình rồi rê về.
 *
 * Là thẻ DOM thật (`<Html>` của drei) nên bấm/kéo bằng sự kiện DOM bình thường,
 * KHÔNG đi qua raycast — không tranh chấp với thao tác kéo món đồ bên dưới.
 */
export function ItemGizmo({ item }: { item: Item }) {
  const rotateItem = useDesignStore((s) => s.rotateItem)
  const setItemRotation = useDesignStore((s) => s.setItemRotation)
  const setItemColor = useDesignStore((s) => s.setItemColor)
  const duplicateItem = useDesignStore((s) => s.duplicateItem)
  const removeItem = useDesignStore((s) => s.removeItem)
  const endEdit = useDesignStore((s) => s.endEdit)
  const select = useDesignStore((s) => s.select)

  const [panel, setPanel] = useState<Panel>('none')

  const product = productById(item.productId)
  // Góc hiển thị 0–359. `rotationY` cộng dồn nên có thể âm hoặc quá 360.
  const deg = Math.round((((item.rotationY * DEG) % 360) + 360) % 360)

  return (
    <Html
      position={[0, mm2m(product.size.h + HOVER), 0]}
      center
      // Thanh công cụ luôn nằm trên, không bị đồ đạc che khuất một nửa
      zIndexRange={[60, 40]}
    >
      <div className="scene-tools" onPointerDown={(e) => e.stopPropagation()}>
        {panel === 'rotate' && (
          <div className="tool-pop">
            <b>{deg}°</b>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={deg}
              // "live" — kéo bao nhiêu cũng chỉ 1 bước undo, chốt lúc nhả tay
              onChange={(e) => setItemRotation(item.id, Number(e.target.value) / DEG)}
              onPointerUp={endEdit}
              onBlur={endEdit}
            />
            <div className="tool-quick">
              {[-90, -45, 45, 90].map((d) => (
                <button key={d} onClick={() => rotateItem(item.id, d / DEG)}>
                  {d > 0 ? `+${d}` : d}°
                </button>
              ))}
            </div>
          </div>
        )}

        {panel === 'color' && (
          <div className="tool-pop">
            <div className="tool-colors">
              {(product.colors ?? [product.color]).map((c) => (
                <button
                  key={c}
                  className={'tool-swatch' + (item.color === c ? ' is-on' : '')}
                  style={{ background: c }}
                  title={c}
                  onClick={() => setItemColor(item.id, c)}
                />
              ))}
              <button
                className={'tool-swatch is-reset' + (item.color ? '' : ' is-on')}
                title="Màu gốc của model"
                onClick={() => setItemColor(item.id, null)}
              >
                ⟲
              </button>
            </div>
          </div>
        )}

        <div className="tool-bar">
          <ToolButton
            icon="⟳"
            label="Xoay"
            on={panel === 'rotate'}
            onClick={() => setPanel(panel === 'rotate' ? 'none' : 'rotate')}
          />
          <ToolButton
            icon="🎨"
            label="Màu"
            on={panel === 'color'}
            onClick={() => setPanel(panel === 'color' ? 'none' : 'color')}
          />
          <ToolButton
            icon="⧉"
            label="Nhân bản"
            onClick={() => {
              const id = duplicateItem(item.id)
              if (id) select(id)
            }}
          />
          <ToolButton icon="🗑" label="Xoá" danger onClick={() => removeItem(item.id)} />
        </div>
      </div>
    </Html>
  )
}

function ToolButton({
  icon,
  label,
  on = false,
  danger = false,
  onClick,
}: {
  icon: string
  label: string
  on?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={'tool-btn' + (on ? ' is-on' : '') + (danger ? ' is-danger' : '')}
      onClick={onClick}
      title={label}
    >
      <span className="tool-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
