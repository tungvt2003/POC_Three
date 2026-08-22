import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { OrthographicCamera } from 'three'
import { topOrthoFrustum } from '../controls/cameraPresets'
import { useDesignStore } from '../store/designStore'

/**
 * Preset "từ trên xuống" — camera TRỰC GIAO, đúng như `claude.md` chốt.
 *
 * Trực giao nghĩa là không có phối cảnh: hai bức tường xa gần đều cùng bề dày,
 * đo trên màn hình ra đúng tỉ lệ. Đây mới là bản vẽ mặt bằng thật.
 * (Khác với Bước 1–2 của wizard: chỗ đó cố ý dùng phối cảnh góc hẹp để còn
 * nhìn thấy mặt trong tường.)
 *
 * `up` phải là (0,0,-1). Nhìn thẳng xuống thì `up` mặc định (0,1,0) suy biến.
 */
export function OrthoTopCamera() {
  const footprint = useDesignStore((s) => s.doc.room.footprint)
  const camRef = useRef<OrthographicCamera | null>(null)
  if (camRef.current === null) camRef.current = new OrthographicCamera()

  const size = useThree((s) => s.size)
  const set = useThree((s) => s.set)
  const get = useThree((s) => s.get)

  // Cài camera một lần, TRẢ LẠI camera cũ khi rời preset.
  // `set({ camera })` của r3f là thay vĩnh viễn — không trả lại thì đổi preset
  // xong vẫn dính góc nhìn từ trên xuống.
  useLayoutEffect(() => {
    const previous = get().camera
    set({ camera: camRef.current! })
    return () => set({ camera: previous })
  }, [set, get])

  useLayoutEffect(() => {
    const cam = camRef.current!
    const aspect = size.width / Math.max(1, size.height)
    const { center, halfW, halfH } = topOrthoFrustum(footprint, aspect)

    cam.left = -halfW
    cam.right = halfW
    cam.top = halfH
    cam.bottom = -halfH
    cam.near = 0.1
    cam.far = 100
    cam.up.set(0, 0, -1)
    cam.position.set(center[0], 30, center[1])
    cam.lookAt(center[0], 0, center[1])
    cam.updateProjectionMatrix()
  }, [footprint, size])

  return null
}
