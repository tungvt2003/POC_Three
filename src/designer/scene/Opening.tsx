import { useEffect, useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { MULLION, mullionBars, styleById } from '../catalog/openings'
import type { Opening as OpeningData, Wall } from '../types'
import { openingQuad, slabGeometry } from './wallGeometry'

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

  const frameColor = selected ? '#f0b429' : '#f2efe9'
  const panelColor = selected ? '#f0b429' : '#e6e1d8'

  function handleDown(e: { stopPropagation: () => void }) {
    if (!onSelect) return
    e.stopPropagation() // đừng để click lọt xuống tường mà đặt thêm cửa mới
    onSelect(opening.id)
  }

  return (
    <group name={opening.id} onPointerDown={onSelect ? handleDown : undefined}>
      {parts.solid.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color={frameColor} roughness={0.6} transparent opacity={1} />
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
            color={selected ? '#f0b429' : '#bcd4dd'}
            roughness={0.08}
            metalness={0.1}
            transparent
            opacity={selected ? 0.55 : 0.34}
          />
        ) : (
          <meshStandardMaterial color={panelColor} roughness={0.55} transparent opacity={1} />
        )}
      </mesh>
    </group>
  )
}

export { FRAME, MULLION }
