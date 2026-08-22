import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Outline, Selection } from '@react-three/postprocessing'
import { useMemo } from 'react'
import { bounds } from '../../lib/polygon'
import { mm2m } from '../../lib/units'
import type { RoomView } from '../../ui/useRoomView'
import { useUiStore } from '../../ui/uiStore'
import { useDesignStore } from '../store/designStore'
import { CeilingLights } from './CeilingLights'
import { Dimensions } from './Dimensions'
import { DollhouseRig } from './DollhouseRig'
import { Items } from './Items'
import { OrthoTopCamera } from './OrthoTopCamera'
import { RoomView as RoomMesh } from './Room'
import { StatsProbe } from './StatsProbe'
import { TopDownCamera } from './TopDownCamera'

type Props = {
  /**
   * Có giá trị = Bước 1–2: khoá góc nhìn từ trên xuống, KHÔNG cho xoay.
   * Bỏ trống = Bước 3–4 và chế độ thiết kế: phối cảnh tự do, xoay ngắm được.
   */
  topView?: RoomView
}

/**
 * Nội dung 3D. Nằm bên trong <Canvas>, nên KHÔNG được render thẻ DOM ở đây.
 */
export function Scene({ topView }: Props) {
  const footprint = useDesignStore((s) => s.doc.room.footprint)
  const select = useDesignStore((s) => s.select)
  const preset = useUiStore((s) => s.cameraPreset)

  // Phòng KHÔNG nằm giữa gốc toạ độ — kéo tường trái ra thì nó lệch sang trái.
  // Camera phải ngắm tâm hộp bao, ngắm gốc toạ độ là nhìn ra rìa.
  const target = useMemo(() => {
    const b = bounds(footprint)
    return [mm2m((b.minX + b.maxX) / 2), mm2m(1200), mm2m((b.minZ + b.maxZ) / 2)] as [
      number,
      number,
      number,
    ]
  }, [footprint])

  return (
    <>
      {/*
        Đèn nền dịu thôi — ánh sáng chính là đèn trần thật. Để sáng quá thì
        phòng bẹt tuếch, không thấy vũng sáng dưới sàn.
      */}
      <ambientLight intensity={0.25} />
      {/*
        Đèn định hướng chỉ để tạo bóng đổ cho đồ đạc. Để mạnh quá thì nhìn từ
        trên xuống sẽ có một vệt bóng chéo cắt ngang sàn, rất xấu.
      */}
      <directionalLight
        position={[4, 8, 4]}
        intensity={0.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      {/*
        Bấm ra nền thì bỏ chọn. Đặt ở đây chứ không phải trên từng mesh: mọi
        thứ bấm được đều `stopPropagation`, nên sự kiện lọt tới đây nghĩa là
        người dùng bấm vào chỗ trống.
      */}
      <mesh visible={false} position={[0, -1, 0]} onPointerDown={() => select(null)}>
        <boxGeometry args={[100, 0.1, 100]} />
      </mesh>

      <StatsProbe />
      <Dimensions />

      <Selection>
        <RoomMesh />
        <Items />

        {/*
          Outline vàng cho món đang chọn. `EffectComposer` thay đường ống
          render nên phải đo lại FPS ở D12 — nếu đắt quá thì đổi sang cách
          khác (ví dụ vẽ khung dây bao quanh).
        */}
        <EffectComposer autoClear={false}>
          <Outline
            visibleEdgeColor={0xf0b429}
            hiddenEdgeColor={0xf0b429}
            edgeStrength={8}
            blur
            xRay={false}
          />
        </EffectComposer>
      </Selection>

      <CeilingLights />

      {topView ? (
        <TopDownCamera view={topView} />
      ) : (
        <>
          {preset === 'top' && <OrthoTopCamera />}
          {preset === 'dollhouse' && <DollhouseRig />}
          <OrbitControls
            makeDefault
            // Preset "từ trên" khoá xoay — xoay đi là hết trực giao nhìn thẳng
            // xuống, mất luôn ý nghĩa của bản vẽ mặt bằng.
            enableRotate={preset !== 'top'}
            // Cao độ ngắm cố định ngang tầm mắt. CỐ Ý không buộc theo room.height —
            // buộc vào thì kéo chiều cao trần sẽ giật cả khung nhìn.
            target={preset === 'free' ? target : undefined}
            maxPolarAngle={Math.PI / 2 - 0.05} // chặn không cho chui xuống dưới sàn
            minDistance={1}
            maxDistance={25}
          />
        </>
      )}
    </>
  )
}
