import { useMemo } from 'react'
import { mm2m } from '../../lib/units'
import { useDesignStore } from '../store/designStore'
import { ceilingLightPositions } from './ceilingLightGrid'

/** mm. Mặt đèn cách trần bao nhiêu. */
const DROP = 60

/**
 * Đèn trần.
 *
 * Mỗi đèn = 1 `pointLight` THẬT + 1 đĩa phát sáng làm mặt đèn. Vũng sáng trên
 * sàn là do đèn chiếu ra chứ không phải vẽ giả — nên phòng đổi hình thì vũng
 * sáng tự đúng theo.
 *
 * `castShadow` TẮT. Bóng đổ cần một lần render riêng cho MỖI đèn; 8 đèn là 8
 * lần render cả cảnh, không đáng cho POC. Bóng của đồ đạc đã có đèn định
 * hướng ở `Scene` lo.
 *
 * three r155+ dùng đơn vị vật lý: `intensity` của pointLight là candela và
 * sáng giảm theo bình phương khoảng cách (`decay = 2`). Nên con số trông to
 * bất thường so với code three đời cũ.
 */
export function CeilingLights() {
  const footprint = useDesignStore((s) => s.doc.room.footprint)
  const height = useDesignStore((s) => s.doc.room.height)

  const positions = useMemo(() => ceilingLightPositions(footprint), [footprint])
  const y = mm2m(height - DROP)

  // Nhiều đèn thì mỗi cái phải dịu đi, không thì phòng to hoá ra cháy sáng
  const intensity = 11 / Math.sqrt(positions.length)

  // Cắt tầm chiếu ngắn lại cho thấy rõ VŨNG SÁNG dưới sàn. Để xa quá thì các
  // đèn hoà vào nhau, sàn sáng đều một màu, mất cảm giác có đèn.
  const reach = mm2m(5200)

  return (
    <group name="ceiling-lights">
      {positions.map((p, i) => (
        <group key={i} position={[mm2m(p.x), y, mm2m(p.z)]}>
          <pointLight intensity={intensity} distance={reach} decay={2} color="#fff6e8" />
          {/* Mặt đèn. `toneMapped={false}` để nó trắng thật, không bị tone map dìm xuống xám */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[mm2m(110), 20]} />
            <meshBasicMaterial color="#fffaf0" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
