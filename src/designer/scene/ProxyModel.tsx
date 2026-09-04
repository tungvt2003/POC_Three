import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { Color } from 'three'
import { mm2m } from '../../lib/units'
import type { Product } from '../catalog/products'

/** mm. Bề dày mấy tấm ván của khối tạm. */
const SLAB = 60
const LEG = 55

/**
 * Một khối con của món đồ.
 *
 * `tone` nhân vào màu gốc: chân bàn/ đế tủ tối hơn, nệm ngồi sáng hơn. Không có
 * nó thì món đồ chỉ là một cục màu phẳng, nhìn không ra hình khối.
 */
type Part = {
  /** mm, tâm khối so với gốc của item (gốc nằm giữa đáy). */
  c: [number, number, number]
  /** mm, kích thước khối. */
  s: [number, number, number]
  /** mm, bo góc. Có giá trị thì dùng `RoundedBox` — dành cho nệm, gối, đệm. */
  r?: number
  /** Khối tròn xoay (chân đèn, chậu cây, thảm tròn). `s[0]` là đường kính. */
  round?: boolean
  tone?: number
  /** Màu riêng, KHÔNG theo màu người dùng chọn — lá cây, kim loại. */
  fixed?: string
}

/**
 * KHỐI TẠM thay cho model thật.
 *
 * Ghép vài hộp cho ra dáng nhận biết được — bàn có chân, ghế có lưng tựa,
 * sofa có tay vịn, giường có đầu giường và gối. Hộp trơn thì không phân biệt
 * nổi cái gì với cái gì lúc bố trí phòng.
 *
 * Kích thước phủ bì lấy ĐÚNG từ `product.size`, nên kéo thả, snap tường và
 * đường đo đều đúng ngay từ bây giờ. Có model thật thì chỉ điền `modelUrl`,
 * mấy phần kia không phải sửa.
 */
export function ProxyModel({
  product,
  rug = false,
  color,
}: {
  product: Product
  rug?: boolean
  /** Màu người dùng chọn. Bỏ trống thì dùng màu mặc định của sản phẩm. */
  color?: string
}) {
  const base = color ?? product.color
  const parts = useMemo(() => buildParts(product), [product])

  return (
    <group>
      {parts.map((p, i) => {
        const position: [number, number, number] = [mm2m(p.c[0]), mm2m(p.c[1]), mm2m(p.c[2])]
        /*
          Thảm nằm sát sàn nên bật `polygonOffset` — nhấc 1mm thôi thì camera
          lùi xa vẫn nhấp nháy vì độ chính xác depth buffer.
        */
        const material = (
          <meshStandardMaterial
            color={p.fixed ?? shade(base, p.tone ?? 1)}
            roughness={0.75}
            polygonOffset={rug}
            polygonOffsetFactor={rug ? -2 : 0}
            polygonOffsetUnits={rug ? -2 : 0}
          />
        )

        // Khối mềm (nệm, gối, tay vịn) bo góc cho ra chất vải
        if (p.r) {
          return (
            <RoundedBox
              key={i}
              position={position}
              args={[mm2m(p.s[0]), mm2m(p.s[1]), mm2m(p.s[2])]}
              radius={mm2m(Math.min(p.r, Math.min(...p.s) / 2 - 1))}
              // 2 chứ không phải 3: mỗi khối bo góc tốn ~3k tam giác ở mức 3,
              // một cái giường là hết veo ngân sách 50k trong `claude.md`.
              smoothness={2}
              castShadow={!rug}
              receiveShadow
            >
              {material}
            </RoundedBox>
          )
        }

        return (
          <mesh key={i} position={position} castShadow={!rug} receiveShadow>
            {p.round ? (
              <cylinderGeometry args={[mm2m(p.s[0] / 2), mm2m(p.s[0] / 2), mm2m(p.s[1]), 24]} />
            ) : (
              <boxGeometry args={[mm2m(p.s[0]), mm2m(p.s[1]), mm2m(p.s[2])]} />
            )}
            {material}
          </mesh>
        )
      })}
    </group>
  )
}

/** Nhân sáng/tối màu gốc. Giữ nguyên tông, chỉ đổi độ sáng. */
function shade(hex: string, tone: number): string {
  if (tone === 1) return hex
  const c = new Color(hex)
  c.multiplyScalar(tone)
  return `#${c.getHexString()}`
}

/** Bốn chân đặt thụt vào `inset` từ mép. */
function legs(w: number, d: number, height: number, inset: number, tone = 0.72): Part[] {
  return (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).map(([sx, sz]) => ({
    c: [sx * (w / 2 - inset), height / 2, sz * (d / 2 - inset)] as [number, number, number],
    s: [LEG, height, LEG] as [number, number, number],
    tone,
  }))
}

function buildParts(product: Product): Part[] {
  const { w, d, h } = product.size

  switch (product.proxy) {
    // Mặt bàn + 4 chân
    case 'table': {
      const legH = h - SLAB
      return [
        { c: [0, h - SLAB / 2, 0], s: [w, SLAB, d] },
        ...legs(w, d, legH, LEG / 2 + 40),
      ]
    }

    // Bàn làm việc: mặt bàn + hộc tủ một bên + 2 chân
    case 'desk': {
      const legH = h - SLAB
      const drawerW = Math.min(420, w * 0.32)
      return [
        { c: [0, h - SLAB / 2, 0], s: [w, SLAB, d] },
        {
          c: [w / 2 - drawerW / 2 - 60, legH / 2, 0],
          s: [drawerW, legH, d - 120],
          tone: 0.88,
        },
        { c: [-(w / 2 - 90), legH / 2, -(d / 2 - 90)], s: [LEG, legH, LEG], tone: 0.72 },
        { c: [-(w / 2 - 90), legH / 2, d / 2 - 90], s: [LEG, legH, LEG], tone: 0.72 },
      ]
    }

    // Mặt ngồi + lưng tựa + 4 chân
    case 'seat': {
      const seatH = Math.min(450, h * 0.5)
      const legH = seatH - SLAB
      return [
        { c: [0, seatH - SLAB / 2, 0], s: [w, SLAB, d], r: 20 },
        { c: [0, (seatH + h) / 2, -(d / 2 - SLAB / 2)], s: [w, h - seatH, SLAB], tone: 0.92 },
        ...legs(w, d, legH, LEG),
      ]
    }

    // Bệ ngồi + lưng tựa + 2 tay vịn + đệm ngồi nổi lên
    case 'sofa': {
      const seatH = h * 0.5
      const armW = Math.min(200, w * 0.12)
      const inner = w - armW * 2
      return [
        { c: [0, seatH * 0.42, 0], s: [w, seatH * 0.84, d], tone: 0.9 },
        // Đệm ngồi: nhô lên và thụt vào, cho ra khối chứ không phải cục vuông
        { c: [0, seatH, 40], s: [inner - 40, 150, d - 180], r: 60, tone: 1.06 },
        { c: [0, (seatH + h) / 2, -(d / 2 - 130)], s: [w, h - seatH, 260], r: 50 },
        { c: [-(w / 2 - armW / 2), h * 0.42, 0], s: [armW, h * 0.84, d], r: 40, tone: 0.96 },
        { c: [w / 2 - armW / 2, h * 0.42, 0], s: [armW, h * 0.84, d], r: 40, tone: 0.96 },
        ...legs(w, d, 90, 120, 0.5),
      ]
    }

    // Đôn ngồi: một khối bo góc trên 4 chân thấp
    case 'ottoman':
      return [
        { c: [0, (h + 90) / 2, 0], s: [w, h - 90, d], r: 70, tone: 1.04 },
        ...legs(w, d, 90, 90, 0.5),
      ]

    // Hai má đứng + mấy tấm ngang
    case 'shelf': {
      const shelves = 4
      const out: Part[] = [
        { c: [-(w / 2 - SLAB / 2), h / 2, 0], s: [SLAB, h, d] },
        { c: [w / 2 - SLAB / 2, h / 2, 0], s: [SLAB, h, d] },
      ]
      for (let i = 0; i <= shelves; i++) {
        out.push({ c: [0, (h * i) / shelves, 0], s: [w - SLAB * 2, 30, d], tone: 0.9 })
      }
      return out
    }

    /*
      Tủ: thân + đế thụt + các cánh chia đều, mỗi cánh có tay nắm.
      Cánh vẽ hơi nhô ra khỏi thân để thấy đường ron, không thì chỉ là cục hộp.
    */
    case 'cabinet': {
      const plinth = Math.min(90, h * 0.12)
      const doors = w > 900 ? Math.round(w / 500) : 1
      const gap = 18
      const doorW = (w - gap * (doors + 1)) / doors
      const out: Part[] = [
        { c: [0, plinth / 2, 0], s: [w - 80, plinth, d - 60], tone: 0.55 },
        { c: [0, (h + plinth) / 2, 0], s: [w, h - plinth, d], tone: 0.9 },
      ]
      for (let i = 0; i < doors; i++) {
        const x = -w / 2 + gap + doorW / 2 + i * (doorW + gap)
        out.push({
          c: [x, (h + plinth) / 2, d / 2 - 6],
          s: [doorW, h - plinth - gap * 2, 24],
          tone: 1.05,
        })
        out.push({
          c: [x + doorW / 2 - 55, (h + plinth) / 2, d / 2 + 16],
          s: [26, Math.min(220, h * 0.3), 26],
          fixed: '#8c8c94',
        })
      }
      return out
    }

    // Kệ TV: thân thấp, hốc mở ở giữa
    case 'tv': {
      const legH = 110
      return [
        { c: [0, h - 30, 0], s: [w, 60, d] },
        { c: [0, (h + legH) / 2 - 30, -(d / 2 - 30)], s: [w, h - legH - 60, 60], tone: 0.9 },
        { c: [-(w / 2 - w * 0.16), (h + legH) / 2 - 30, 0], s: [w * 0.32, h - legH - 60, d - 40], tone: 1.04 },
        { c: [w / 2 - w * 0.16, (h + legH) / 2 - 30, 0], s: [w * 0.32, h - legH - 60, d - 40], tone: 1.04 },
        ...legs(w, d, legH, 120, 0.5),
      ]
    }

    /*
      Giường: đầu giường cao ở phía -Z (lưng quay vào tường), bệ nệm, và hai
      cái gối. `h` là chiều cao ĐẦU GIƯỜNG, mặt nệm luôn ~550mm.
    */
    case 'bed': {
      const mattressH = 300
      const baseH = 250
      const pillowW = Math.min(600, (w - 120) / 2)
      return [
        { c: [0, baseH / 2, 0], s: [w - 80, baseH, d - 60], tone: 0.6 },
        { c: [0, baseH + mattressH / 2, 20], s: [w, mattressH, d - 180], r: 60, tone: 1.06 },
        { c: [0, h / 2, -(d / 2 - 50)], s: [w, h, 100], r: 40, tone: 0.85 },
        {
          c: [-pillowW / 2 - 30, baseH + mattressH + 60, -(d / 2 - 380)],
          s: [pillowW, 120, 380],
          r: 55,
          tone: 1.18,
        },
        {
          c: [pillowW / 2 + 30, baseH + mattressH + 60, -(d / 2 - 380)],
          s: [pillowW, 120, 380],
          r: 55,
          tone: 1.18,
        },
      ]
    }

    // Đèn cây: đế tròn + thân mảnh + chao
    case 'lamp':
      return [
        { c: [0, 20, 0], s: [w * 0.8, 40, w * 0.8], round: true, tone: 0.7 },
        { c: [0, h / 2, 0], s: [40, h, 40], round: true, tone: 0.9 },
        { c: [0, h - 160, 0], s: [w, 320, w], round: true, fixed: '#efe7d6' },
      ]

    // Chậu cây: chậu côn + tán lá
    case 'plant':
      return [
        { c: [0, h * 0.14, 0], s: [w * 0.62, h * 0.28, w * 0.62], round: true, fixed: '#b9a891' },
        { c: [0, h * 0.42, 0], s: [50, h * 0.3, 50], round: true, fixed: '#6b5a3f' },
        { c: [0, h * 0.72, 0], s: [w, h * 0.5, w], round: true },
      ]

    // Thảm tròn
    case 'round':
      return [{ c: [0, h / 2, 0], s: [w, h, w], round: true }]

    // Thảm chữ nhật: một tấm mỏng
    case 'flat':
      return [{ c: [0, h / 2, 0], s: [w, h, d] }]
  }
}
