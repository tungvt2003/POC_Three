import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { PerspectiveCamera } from 'three'
import { mm2m } from '../../lib/units'
import { TOP_FOV, topDownDistMm, type RoomView } from '../../ui/useRoomView'

/**
 * Camera nhìn thẳng từ trên xuống cho Bước 1–2.
 *
 * Dùng PHỐI CẢNH chứ không trực giao: trực giao nhìn thẳng xuống chỉ thấy mặt
 * TRÊN của tường, phẳng lì. Phối cảnh thì tia sáng loe ra nên thấy cả mặt
 * trong 4 bức tường — nhìn ra được góc phòng vát hay vuông.
 *
 * Góc mở hẹp CÓ CHỦ Ý. Camera cách sàn `d`, mặt trên tường cao `h` nên chỉ
 * cách camera `d - h`, phóng to hơn mặt sàn `d / (d - h)` lần. FOV rộng thì
 * `d` nhỏ, tỉ số đó vọt lên — FOV 38° cho `d ≈ 5.5m`, tường loe gấp đôi sàn,
 * tràn hết khung. `TOP_FOV = 16°` cho `d ≈ 14m`, tỉ số còn ~1.24.
 *
 * Độ cao suy ngược từ `view.scale` để mặt SÀN hiện đúng bằng tỉ lệ mà lớp phủ
 * 2D đang dùng — nhờ vậy nhãn đo và vạch kéo trùng khít lên tường.
 *
 * `up` phải là (0,0,-1). Nhìn thẳng xuống thì `up` mặc định (0,1,0) suy biến;
 * đặt (0,0,-1) cho world +x ra phải màn hình và world +z xuống dưới màn hình,
 * khớp đúng cách lớp phủ chiếu điểm.
 */
export function TopDownCamera({ view }: { view: RoomView }) {
  const camRef = useRef<PerspectiveCamera | null>(null)
  if (camRef.current === null) camRef.current = new PerspectiveCamera()

  const size = useThree((s) => s.size)
  const set = useThree((s) => s.set)
  const get = useThree((s) => s.get)

  // Cài camera một lần, và TRẢ LẠI camera cũ khi rời Bước 1–2.
  // Không trả lại thì sang Bước 3–4 vẫn dính góc nhìn từ trên xuống, xoay
  // không được — `set({ camera })` của r3f là thay vĩnh viễn.
  useLayoutEffect(() => {
    const previous = get().camera
    set({ camera: camRef.current! })
    return () => set({ camera: previous })
  }, [set, get])

  // Cập nhật thông số mỗi khi khung nhìn hoặc kích thước khung đổi
  useLayoutEffect(() => {
    const cam = camRef.current!
    const dist = mm2m(topDownDistMm(view, size.height))

    cam.fov = TOP_FOV
    cam.aspect = size.width / Math.max(1, size.height)
    cam.near = 0.1
    cam.far = dist * 4
    cam.up.set(0, 0, -1)
    cam.position.set(mm2m(view.cx), dist, mm2m(view.cz))
    cam.lookAt(mm2m(view.cx), 0, mm2m(view.cz))
    cam.updateProjectionMatrix()
  }, [view, size])

  return null
}
