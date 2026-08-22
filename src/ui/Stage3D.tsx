import { Canvas } from '@react-three/fiber'
import { Scene } from '../designer/scene/Scene'
import type { RoomView } from './useRoomView'

/**
 * Bọc riêng phần 3D để TÁCH GÓI.
 *
 * File này (và mọi thứ nó kéo theo: three.js, r3f, drei, postprocessing) nằm
 * trong một chunk riêng, tải bằng `React.lazy` ở `App.tsx`. Nhờ vậy sidebar
 * và khung sườn hiện ra ngay, không phải chờ hết ~370 KB.
 *
 * ĐỪNG import file này trực tiếp ở đâu khác — import tĩnh là gộp ngược lại
 * vào gói chính, mất sạch tác dụng.
 */
export default function Stage3D({ topView }: { topView?: RoomView }) {
  return (
    <Canvas
      // "percentage" = PCFShadowMap. Mặc định của r3f là PCFSoftShadowMap,
      // three 0.185 đã bỏ nó và spam cảnh báo mỗi lần biên dịch lại shadow map.
      shadows="percentage"
      dpr={[1, 2]} // chặn trần devicePixelRatio, màn Retina không render 3x vô ích
      camera={{ position: [4.5, 3.5, 5.5], fov: 50, near: 0.1, far: 100 }}
    >
      {/*
        Nền XÁM SÁNG, không phải nền tối. Đường bao tường vẽ màu đen, để trên
        nền tối thì chìm nghỉm. Sản phẩm tham chiếu cũng nền xám.
      */}
      <color attach="background" args={['#d7d7db']} />
      <Scene topView={topView} />
    </Canvas>
  )
}
