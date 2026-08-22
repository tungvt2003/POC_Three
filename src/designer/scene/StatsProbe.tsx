import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useStatsStore } from '../../ui/statsStore'

/** ms. Nhịp báo số ra giao diện. 250ms = 4 lần/giây, mắt đọc kịp. */
const REPORT_EVERY = 250

/**
 * Đo hiệu năng. Nằm TRONG `<Canvas>` vì phải đọc `gl.info` của three.js.
 *
 * Không dùng thư viện đo ngoài (`r3f-perf`, `stats.js`): mấy con số cần thiết
 * đều nằm sẵn trong `gl.info`.
 *
 * ĐIỂM DỄ SAI — đã dính rồi mới phát hiện:
 *
 * `gl.info` mặc định TỰ RESET sau mỗi lần `render()`. Cảnh này dùng
 * `EffectComposer`, mà composer render nhiều lượt trong một khung hình. Đọc
 * kiểu mặc định thì chỉ thấy lượt CUỐI — là cú vẽ một tam giác phủ toàn màn
 * hình, ra đúng "1 draw call, 1 tam giác". Số đẹp mà vô nghĩa.
 *
 * Cách đúng: tắt `autoReset`, để các lượt vẽ CỘNG DỒN cả khung hình, tự reset
 * một lần ở đầu khung sau. Số đọc được vì thế là của khung hình VỪA XONG, kể
 * cả chi phí của postprocessing.
 */
export function StatsProbe() {
  const gl = useThree((s) => s.gl)
  const push = useStatsStore((s) => s.push)

  const frames = useRef(0)
  const since = useRef(performance.now())
  const peakCalls = useRef(0)
  const peakTris = useRef(0)

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame(() => {
    // Tới đây, `gl.info.render` đang giữ TỔNG của khung hình trước.
    peakCalls.current = Math.max(peakCalls.current, gl.info.render.calls)
    peakTris.current = Math.max(peakTris.current, gl.info.render.triangles)
    gl.info.reset()

    frames.current += 1
    const now = performance.now()
    const elapsed = now - since.current
    if (elapsed < REPORT_EVERY) return

    push({
      fps: Math.round((frames.current * 1000) / elapsed),
      // Lấy ĐỈNH trong khoảng đo, không lấy khung cuối cùng — khung cuối có
      // thể rơi đúng lúc nhẹ tải và cho con số dễ chịu giả tạo.
      drawCalls: peakCalls.current,
      triangles: peakTris.current,
      textures: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
      programs: gl.info.programs?.length ?? 0,
    })

    frames.current = 0
    peakCalls.current = 0
    peakTris.current = 0
    since.current = now
  })

  return null
}
