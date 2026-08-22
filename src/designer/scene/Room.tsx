import { useState } from 'react'
import { styleById } from '../catalog/openings'
import { useDesignStore } from '../store/designStore'
import { useIsPlacingOpenings, useIsTopDown, useUiStore } from '../../ui/uiStore'
import { wallLength } from './buildWalls'
import { Floor } from './Floor'
import { PlacementGhost } from './PlacementGhost'
import { Wall } from './Wall'

type Hover = { wallId: string; t: number } | null

/**
 * Phòng = sàn + tường sinh từ đa giác mặt bằng. Không có file model nào ở đây.
 *
 * Số tường thay đổi theo hình: chữ nhật 4, hình L 6, hình U 8.
 *
 * Ở Bước 3, tường ăn sự kiện chuột để đặt cửa. Các bước khác thì không —
 * để tránh bấm nhầm ra cửa lúc đang chọn màu.
 */
export function RoomView() {
  const room = useDesignStore((s) => s.doc.room)
  const walls = useDesignStore((s) => s.doc.walls)
  const addOpening = useDesignStore((s) => s.addOpening)
  const select = useDesignStore((s) => s.select)
  const selectedId = useDesignStore((s) => s.selectedId)

  // Chỉ Bước 3 của wizard mới cho bấm lên tường. Ở chế độ thiết kế, bấm nhầm
  // vào tường mà ra cửa thì rất khó chịu.
  const placingStep = useIsPlacingOpenings()
  const topDown = useIsTopDown()
  const armedStyleId = useUiStore((s) => s.armedStyleId)

  const [hover, setHover] = useState<Hover>(null)

  const placing = placingStep && armedStyleId !== null
  const style = armedStyleId ? styleById(armedStyleId) : null

  /** Kẹp `t` để lỗ nằm gọn trong tường, và cho biết chỗ đó có trống không. */
  function resolve(wallId: string, rawT: number) {
    const wall = walls.find((w) => w.id === wallId)
    if (!wall || !style) return null

    const L = wallLength(wall)
    if (style.width >= L) return { wall, t: 0, valid: false }

    // Con trỏ trỏ vào GIỮA cửa cho tự nhiên, không phải mép trái
    const t = Math.min(Math.max(rawT - style.width / 2, 0), L - style.width)
    const clash = wall.openings.some((o) => t < o.t + o.width && o.t < t + style.width)
    return { wall, t, valid: !clash }
  }

  const ghost = placing && hover ? resolve(hover.wallId, hover.t) : null

  return (
    <group name="room">
      <Floor footprint={room.footprint} materialId={room.floorMaterialId} />

      {walls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          height={room.height}
          color={room.wallColor}
          // Bước 1–2 nhìn thẳng từ trên xuống, không tường nào chắn tầm nhìn
          // nên tắt hẳn cho khỏi tính mỗi frame.
          fade={!topDown}
          interactive={placingStep}
          selectedOpeningId={selectedId}
          onSelectOpening={select}
          onPlace={
            placing && style
              ? (wallId, rawT) => {
                  const r = resolve(wallId, rawT)
                  if (!r || !r.valid) return
                  const id = addOpening(wallId, {
                    styleId: style.id,
                    t: r.t,
                    width: style.width,
                    height: style.height,
                    elevation: style.elevation,
                    kind: style.kind,
                  })
                  if (id) select(id)
                }
              : undefined
          }
          onHover={(wallId, t) => {
            if (t === null) setHover((h) => (h?.wallId === wallId ? null : h))
            else setHover({ wallId, t })
          }}
        />
      ))}

      {ghost && style && (
        <PlacementGhost wall={ghost.wall} style={style} t={ghost.t} valid={ghost.valid} />
      )}
    </group>
  )
}
