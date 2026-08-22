import { Suspense, lazy, useLayoutEffect, useRef, useState } from 'react'
import { useDesignStore } from './designer/store/designStore'
import { DesignPanel } from './ui/DesignPanel'
import { MobileNotice } from './ui/MobileNotice'
import { PlanOverlay } from './ui/PlanOverlay'
import { StatsHud } from './ui/StatsHud'
import { Toolbar } from './ui/Toolbar'
import { useAutosave } from './ui/useAutosave'
import { useHistoryShortcuts } from './ui/useHistoryShortcuts'
import { useRoomView } from './ui/useRoomView'
import { useIsTopDown, useUiStore } from './ui/uiStore'
import { WizardShell } from './ui/wizard/WizardShell'

/**
 * three.js + r3f + drei + postprocessing gộp lại khoảng 370 KB gzip. Tải sau
 * để sidebar hiện ra ngay, thay vì màn hình trắng cho tới khi tải xong.
 */
const Stage3D = lazy(() => import('./ui/Stage3D'))

/**
 * Bố cục: sidebar bên trái, khung xem 3D bên phải.
 *
 * Bước 1–2 khoá góc nhìn từ trên xuống và phủ lớp đo/kéo lên trên. Bước 3–4 và
 * chế độ thiết kế thì mở phối cảnh tự do.
 */
export default function App() {
  useHistoryShortcuts()
  const { restored } = useAutosave()

  const mode = useUiStore((s) => s.mode)
  const draggingWall = useUiStore((s) => s.draggingWall)
  const topDown = useIsTopDown()
  // Chỉ Bước 2 mới vẽ đường bao đen + nhãn đo. Bước 1 để hình mộc cho thoáng.
  const showDimensions = useUiStore((s) => s.step === 2)
  const footprint = useDesignStore((s) => s.doc.room.footprint)

  const stageRef = useRef<HTMLElement>(null)
  const [size, setSize] = useState({ w: 900, h: 700 })

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Khung nhìn đông cứng lúc đang kéo tường, canh giữa lại sau khi nhả chuột.
  const view = useRoomView(footprint, size.w, size.h, draggingWall)

  return (
    <div className="app">
      {mode === 'wizard' ? <WizardShell /> : <DesignPanel />}

      <main className="stage" ref={stageRef}>
        {/*
          Chờ khôi phục bản lưu xong mới dựng 3D. Dựng trước rồi nạp sau thì
          người dùng thấy phòng trắng nháy một cái trước khi hiện phòng của mình.
        */}
        {restored && (
          <Suspense fallback={<StageLoading />}>
            <Stage3D topView={topDown ? view : undefined} />
          </Suspense>
        )}

        {topDown && (
          <PlanOverlay view={view} w={size.w} h={size.h} showDimensions={showDimensions} />
        )}
        <Toolbar />
        <StatsHud />
      </main>

      <MobileNotice />
    </div>
  )
}

function StageLoading() {
  return (
    <div className="stage-loading">
      <span className="spinner" />
      Đang tải bộ dựng hình 3D…
    </div>
  )
}
