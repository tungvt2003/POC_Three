import { useEffect, useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { MULLION, mullionBars, styleById } from '../catalog/openings'
import { useDragOpening } from '../controls/useDragOpening'
import type { Opening as OpeningData, Wall } from '../types'
import { OpeningGizmo } from './OpeningGizmo'
import { openingQuad, pointOnWall, slabGeometry } from './wallGeometry'

/** mm. Bề dày khung bao quanh ô. */
const FRAME = 60

/** Lát cắt ngang tường mà cánh cửa / tấm kính chiếm (0 = mặt trong, 1 = mặt ngoài). */
const PANEL_FROM = 0.34
const PANEL_TO = 0.66

type Props = {
  wall: Wall
  opening: OpeningData
  selected: boolean
  onSelect?: (id: string) => void
}

/** Màu cánh cửa gỗ và khung — cố định, KHÔNG đổi theo trạng thái chọn. */
const FRAME_COLOR = '#f2efe9'
const PANEL_COLOR = '#e6e1d8'
const GLASS_COLOR = '#bcd4dd'

/**
 * Cửa đi / cửa sổ dựng bằng code, không load model.
 *
 * Toàn bộ khai báo trong hệ toạ độ của TƯỜNG (`t`, `elevation`), nên đổi kích
 * thước phòng hay xoay tường thì cửa tự đi theo — không có toạ độ world nào
 * lưu trong state.
 *
 * Component này phải nằm TRONG group của tường (xem `Wall.tsx`) để tới D11
 * fade tường thì cửa mờ đi cùng.
 */
export function Opening({ wall, opening, selected, onSelect }: Props) {
  const style = styleById(opening.styleId)

  const t0 = opening.t
  const t1 = opening.t + opening.width
  const yBottom = opening.elevation
  const yTop = opening.elevation + opening.height

  const parts = useMemo(() => {
    const solid: BufferGeometry[] = []

    // Khung bao: dưới, trên, hai bên
    solid.push(
      slabGeometry({ quad: openingQuad(wall, t0, t1), y0: yBottom, y1: yBottom + FRAME, t0, t1 }),
      slabGeometry({ quad: openingQuad(wall, t0, t1), y0: yTop - FRAME, y1: yTop, t0, t1 }),
      slabGeometry({
        quad: openingQuad(wall, t0, t0 + FRAME),
        y0: yBottom + FRAME,
        y1: yTop - FRAME,
        t0,
        t1: t0 + FRAME,
      }),
      slabGeometry({
        quad: openingQuad(wall, t1 - FRAME, t1),
        y0: yBottom + FRAME,
        y1: yTop - FRAME,
        t0: t1 - FRAME,
        t1,
      }),
    )

    // Vùng lọt sáng, đo trong lòng khung
    const li0 = t0 + FRAME
    const li1 = t1 - FRAME
    const ly0 = yBottom + FRAME
    const ly1 = yTop - FRAME

    // Nẹp đứng chia cột. Cửa 2 cánh thì nẹp giữa to gấp đôi.
    for (const bar of mullionBars(li0, li1, style.cols, style.leaves === 2)) {
      solid.push(
        slabGeometry({
          quad: openingQuad(wall, bar.from, bar.to, PANEL_FROM - 0.06, PANEL_TO + 0.06),
          y0: ly0,
          y1: ly1,
          t0: bar.from,
          t1: bar.to,
        }),
      )
    }

    // Nẹp ngang chia hàng
    for (const bar of mullionBars(ly0, ly1, style.rows)) {
      solid.push(
        slabGeometry({
          quad: openingQuad(wall, li0, li1, PANEL_FROM - 0.06, PANEL_TO + 0.06),
          y0: bar.from,
          y1: bar.to,
          t0: li0,
          t1: li1,
        }),
      )
    }

    // Tấm giữa: kính hoặc cánh đặc. Một tấm liền, nẹp nằm đè lên phía trước
    // — rẻ hơn nhiều so với cắt tấm thành từng ô nhỏ, nhìn không khác.
    const panel = slabGeometry({
      quad: openingQuad(wall, li0, li1, PANEL_FROM, PANEL_TO),
      y0: ly0,
      y1: ly1,
      t0: li0,
      t1: li1,
    })

    return { solid, panel }
  }, [wall, t0, t1, yBottom, yTop, style])

  useEffect(
    () => () => {
      for (const g of parts.solid) g.dispose()
      parts.panel.dispose()
    },
    [parts],
  )

  /*
    Chọn cửa thì KHÔNG bôi vàng cả cánh nữa — cửa phải trông ra cửa. Việc báo
    "đang chọn" giao cho `OpeningGizmo`: viền vàng ôm quanh lỗ, kèm mũi tên và
    đường đo.
  */
  const drag = useDragOpening(opening, onSelect ?? noop)

  return (
    <group
      name={opening.id}
      onPointerDown={onSelect ? drag.onPointerDown : undefined}
      onPointerOver={
        onSelect ? () => (document.body.style.cursor = drag.dragging ? 'grabbing' : 'grab') : undefined
      }
      onPointerOut={onSelect ? () => (document.body.style.cursor = '') : undefined}
    >
      {parts.solid.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} transparent opacity={1} />
        </mesh>
      ))}

      <mesh geometry={parts.panel} castShadow={!style.glass}>
        {style.glass ? (
          /*
            Kính dùng material THƯỜNG với opacity, KHÔNG dùng `transmission`.
            `transmission` đẹp hơn nhưng bắt three.js render cảnh thêm một lần
            vào render target riêng — quá đắt cho POC. Ghi ở mục "chưa chốt";
            nếu D12 đo thấy FPS còn dư thì nâng cấp sau.
          */
          <meshStandardMaterial
            color={GLASS_COLOR}
            roughness={0.08}
            metalness={0.1}
            transparent
            opacity={0.34}
          />
        ) : (
          <meshStandardMaterial color={PANEL_COLOR} roughness={0.55} transparent opacity={1} />
        )}
      </mesh>

      {/* Tay nắm — chi tiết nhỏ nhưng thiếu nó thì cánh cửa chỉ là tấm ván */}
      {opening.kind === 'door' && <Handle wall={wall} opening={opening} style={style} />}

      {selected && onSelect && <OpeningGizmo wall={wall} opening={opening} />}
    </group>
  )
}

/**
 * Tay nắm tròn, đặt ở mép MỞ của cánh (phía đối diện bản lề).
 * Cửa 2 cánh thì hai tay nắm quay lưng vào nhau ở giữa.
 */
function Handle({
  wall,
  opening,
  style,
}: {
  wall: Wall
  opening: OpeningData
  style: ReturnType<typeof styleById>
}) {
  const y = opening.elevation + Math.min(1050, opening.height * 0.45)
  const inset = 110
  const spots =
    style.leaves === 2
      ? [opening.t + opening.width / 2 - inset, opening.t + opening.width / 2 + inset]
      : [opening.t + opening.width - inset]

  return (
    <>
      {spots.map((t) => (
        <mesh key={t} position={pointOnWall(wall, t, y, HANDLE_LIFT)} raycast={() => null}>
          <sphereGeometry args={[0.026, 12, 10]} />
          <meshStandardMaterial color="#8c8c94" roughness={0.3} metalness={0.75} transparent />
        </mesh>
      ))}
    </>
  )
}

/** mm. Tay nắm nhô ra khỏi MẶT TRONG của cánh cửa. */
const HANDLE_LIFT = -6

function noop() {}

export { FRAME, MULLION }
