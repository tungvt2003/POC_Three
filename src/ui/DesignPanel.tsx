import { PRESET_LABELS, type CameraPreset } from '../designer/controls/cameraPresets'
import { useDesignStore } from '../designer/store/designStore'
import { fmtMm } from '../lib/units'
import { FurniturePanel } from './FurniturePanel'
import { areaM2, summarize } from './roomSummary'
import { StylePicker } from './StylePicker'
import { useUiStore } from './uiStore'

/**
 * Panel của CHẾ ĐỘ THIẾT KẾ — sau khi bấm "Xong" ở cuối wizard.
 *
 * Không lặp lại giao diện của các bước: chỗ nào cần sửa thì bấm nút quay về
 * đúng bước đó. Dữ liệu giữ nguyên, quay tới quay lui bao nhiêu cũng được.
 */
export function DesignPanel() {
  const room = useDesignStore((s) => s.doc.room)
  const walls = useDesignStore((s) => s.doc.walls)
  const editStep = useUiStore((s) => s.editStep)
  const unit = useUiStore((s) => s.unit)
  const setUnit = useUiStore((s) => s.setUnit)
  const cameraPreset = useUiStore((s) => s.cameraPreset)
  const setCameraPreset = useUiStore((s) => s.setCameraPreset)

  const s = summarize(room, walls)

  return (
    <aside className="wiz">
      <header className="wiz-head">
        <p className="wiz-step">Thiết kế</p>
        <h1>{s.shapeName}</h1>
        <p className="wiz-hint">
          {fmtMm(s.boxWidth, unit)} × {fmtMm(s.boxDepth, unit)} · cao {fmtMm(s.height, unit)}
          <br />
          {areaM2(s.floorArea)} m² sàn · {s.wallCount} tường
        </p>
      </header>

      <div className="wiz-body">
        <div className="seg">
          <button className={unit === 'ft' ? 'is-on' : ''} onClick={() => setUnit('ft')}>
            Feet
          </button>
          <button className={unit === 'cm' ? 'is-on' : ''} onClick={() => setUnit('cm')}>
            Centimet
          </button>
        </div>

        <h3>Góc nhìn</h3>
        <div className="seg">
          {(Object.keys(PRESET_LABELS) as CameraPreset[]).map((p) => (
            <button
              key={p}
              className={cameraPreset === p ? 'is-on' : ''}
              onClick={() => setCameraPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        <h3>Mặt bằng</h3>
        <div className="rows">
          <button className="row-btn" onClick={() => editStep(1)}>
            <span>Đổi hình phòng</span>
            <em>{s.shapeName}</em>
          </button>
          <button className="row-btn" onClick={() => editStep(2)}>
            <span>Chỉnh kích thước</span>
            <em>
              {fmtMm(s.boxWidth, unit)} × {fmtMm(s.boxDepth, unit)}
            </em>
          </button>
        </div>

        <h3>Cửa & cửa sổ</h3>
        <div className="rows">
          <button className="row-btn" onClick={() => editStep(3)}>
            <span>Thêm / sửa</span>
            <em>
              {s.doorCount} cửa · {s.windowCount} cửa sổ
            </em>
          </button>
        </div>

        <StylePicker />

        <h3>Nội thất</h3>
        <FurniturePanel />
      </div>
    </aside>
  )
}
