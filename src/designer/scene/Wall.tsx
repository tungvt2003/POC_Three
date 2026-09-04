import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, type Group, type Material, type Mesh, Vector3 } from 'three'
import type { Wall as WallData } from '../types'
import { Opening } from './Opening'
import { buildWallGeometry } from './wallGeometry'

/**
 * Tường quay lưng về phía camera thì mờ đi.
 *
 * `> 0.05` chứ không phải `> 0`: ngay ở ranh giới, sai số làm giá trị nhảy
 * qua nhảy lại quanh 0 và bức tường nhấp nháy.
 */
const FADE_THRESHOLD = 0.05

/** Tốc độ mờ/hiện. 8 ≈ 0.4s. Bật/tắt đột ngột thì mắt bắt được, rất khó chịu. */
const FADE_LAMBDA = 8

type Props = {
  wall: WallData
  height: number // mm, cao trần
  color: string
  /** Cho phép chọn và kéo cửa trên tường này. */
  interactive?: boolean
  selectedOpeningId?: string | null
  onSelectOpening?: (id: string) => void
  /** Tắt hẳn việc ẩn tường (Bước 1–2 nhìn từ trên xuống thì không cần). */
  fade?: boolean
}

/**
 * Một bức tường, đã chẻ sẵn quanh các lỗ cửa.
 *
 * Cửa/cửa sổ là CON của group này — bắt buộc, để mờ đi CÙNG LÚC với tường.
 * Tường mờ mà cửa còn nguyên thì lộ hẳn.
 *
 * Hình học đã ở toạ độ world nên group không cần position/rotation.
 */
export function Wall({
  wall,
  height,
  color,
  interactive = false,
  selectedOpeningId = null,
  onSelectOpening,
  fade = true,
}: Props) {
  const geometry = useMemo(() => buildWallGeometry(wall, height), [wall, height])

  // BufferGeometry cấp VRAM. Kéo tường liên tục mà không dispose thì rò bộ nhớ
  // GPU — kéo vài phút là thấy.
  useEffect(() => () => geometry.dispose(), [geometry])

  const groupRef = useRef<Group>(null)
  const opacity = useRef(1)
  const camDir = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    if (!fade) {
      applyOpacity(group, 1)
      opacity.current = 1
      return
    }

    state.camera.getWorldDirection(camDir)
    // Pháp tuyến TRONG cùng chiều với hướng nhìn = camera đang ở phía ngoài,
    // bức tường này chắn tầm nhìn vào phòng -> cho mờ đi.
    // Chỉ xét mặt phẳng ngang, thành phần Y của hướng nhìn không liên quan.
    const facing = wall.innerNormal.x * camDir.x + wall.innerNormal.z * camDir.z
    const target = facing > FADE_THRESHOLD ? 0 : 1

    // `damp` chứ không phải bật/tắt — `claude.md` chốt cứng.
    opacity.current = MathUtils.damp(opacity.current, target, FADE_LAMBDA, delta)
    applyOpacity(group, opacity.current)
  })

  return (
    <group name={wall.id} ref={groupRef}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {/*
          transparent BẬT SẴN từ đầu dù opacity=1.
          Đổi cờ này lúc runtime làm three.js biên dịch lại shader -> khựng hình.
          Ở đây chỉ chỉnh opacity, không đụng vào transparent.
        */}
        <meshStandardMaterial color={color} transparent opacity={1} roughness={0.9} />
      </mesh>

      {wall.openings.map((o) => (
        <Opening
          key={o.id}
          wall={wall}
          opening={o}
          selected={o.id === selectedOpeningId}
          onSelect={interactive ? onSelectOpening : undefined}
        />
      ))}
    </group>
  )
}

/**
 * Đặt độ mờ cho cả tường lẫn cửa bên trong.
 *
 * NHÂN với độ mờ GỐC của từng material, không gán đè. Kính cửa sổ vốn đã
 * `opacity 0.34`; gán đè là lúc tường hiện đủ thì kính hoá thành đặc.
 *
 * Mờ hẳn thì `visible = false` — mesh vô hình vẫn tốn draw call.
 */
function applyOpacity(group: Group, value: number): void {
  const visible = value > 0.01
  if (group.visible !== visible) group.visible = visible
  if (!visible) return

  group.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return

    const material = mesh.material as Material & { opacity: number }
    if (material.userData.baseOpacity === undefined) {
      material.userData.baseOpacity = material.opacity
    }
    const base = material.userData.baseOpacity as number
    material.opacity = base * value
    // Vật liệu chưa mờ hẳn thì tắt ghi depth, không thì mấy mảnh tường
    // che nhau lung tung.
    material.depthWrite = value > 0.98 && base > 0.98
  })
}
