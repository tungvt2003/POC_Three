import { mm2m } from '../../lib/units'
import type { Product } from '../catalog/products'

/** mm. Bề dày mấy tấm ván của khối tạm. */
const SLAB = 60
const LEG = 55

type Box = {
  /** mm, tâm khối so với gốc của item (gốc nằm giữa đáy). */
  c: [number, number, number]
  /** mm, kích thước khối. */
  s: [number, number, number]
}

/**
 * KHỐI TẠM thay cho model thật.
 *
 * Ghép vài hộp cho ra dáng nhận biết được — bàn có chân, ghế có lưng tựa,
 * sofa có tay vịn. Hộp trơn thì không phân biệt nổi cái gì với cái gì lúc
 * bố trí phòng.
 *
 * Kích thước phủ bì lấy ĐÚNG từ `product.size`, nên kéo thả, snap tường và
 * đường đo đều đúng ngay từ bây giờ. Có model thật thì chỉ điền `modelUrl`,
 * mấy phần kia không phải sửa.
 */
export function ProxyModel({ product, rug = false }: { product: Product; rug?: boolean }) {
  const boxes = buildBoxes(product)

  return (
    <group>
      {boxes.map((b, i) => (
        <mesh
          key={i}
          position={[mm2m(b.c[0]), mm2m(b.c[1]), mm2m(b.c[2])]}
          castShadow={!rug}
          receiveShadow
        >
          <boxGeometry args={[mm2m(b.s[0]), mm2m(b.s[1]), mm2m(b.s[2])]} />
          {/*
            Thảm nằm sát sàn nên bật `polygonOffset` — nhấc 1mm thôi thì
            camera lùi xa vẫn nhấp nháy vì độ chính xác depth buffer.
          */}
          <meshStandardMaterial
            color={product.color}
            roughness={0.75}
            polygonOffset={rug}
            polygonOffsetFactor={rug ? -2 : 0}
            polygonOffsetUnits={rug ? -2 : 0}
          />
        </mesh>
      ))}
    </group>
  )
}

function buildBoxes(product: Product): Box[] {
  const { w, d, h } = product.size

  switch (product.proxy) {
    // Mặt bàn + 4 chân
    case 'table': {
      const inset = LEG / 2 + 40
      const legH = h - SLAB
      const legs: Box[] = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => ({
        c: [sx * (w / 2 - inset), legH / 2, sz * (d / 2 - inset)],
        s: [LEG, legH, LEG],
      }))
      return [{ c: [0, h - SLAB / 2, 0], s: [w, SLAB, d] }, ...legs]
    }

    // Mặt ngồi + lưng tựa + 4 chân
    case 'seat': {
      const seatH = 450
      const legH = seatH - SLAB
      const legs: Box[] = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => ({
        c: [sx * (w / 2 - LEG), legH / 2, sz * (d / 2 - LEG)],
        s: [LEG, legH, LEG],
      }))
      return [
        { c: [0, seatH - SLAB / 2, 0], s: [w, SLAB, d] },
        { c: [0, (seatH + h) / 2, -(d / 2 - SLAB / 2)], s: [w, h - seatH, SLAB] },
        ...legs,
      ]
    }

    // Bệ ngồi + lưng tựa + 2 tay vịn
    case 'sofa': {
      const seatH = 420
      const armW = 160
      return [
        { c: [0, seatH / 2, 0], s: [w, seatH, d] },
        { c: [0, (seatH + h) / 2, -(d / 2 - 130)], s: [w, h - seatH, 260] },
        { c: [-(w / 2 - armW / 2), h * 0.42, 0], s: [armW, h * 0.84, d] },
        { c: [w / 2 - armW / 2, h * 0.42, 0], s: [armW, h * 0.84, d] },
      ]
    }

    // Hai má đứng + mấy tấm ngang
    case 'shelf': {
      const shelves = 4
      const out: Box[] = [
        { c: [-(w / 2 - SLAB / 2), h / 2, 0], s: [SLAB, h, d] },
        { c: [w / 2 - SLAB / 2, h / 2, 0], s: [SLAB, h, d] },
      ]
      for (let i = 0; i <= shelves; i++) {
        out.push({ c: [0, (h * i) / shelves, 0], s: [w - SLAB * 2, 30, d] })
      }
      return out
    }

    // Thảm: một tấm mỏng
    case 'flat':
      return [{ c: [0, h / 2, 0], s: [w, h, d] }]
  }
}
