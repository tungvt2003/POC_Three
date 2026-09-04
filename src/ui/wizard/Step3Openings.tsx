import { useEffect, useState } from 'react'
import {
  DOOR_STYLES,
  WINDOW_STYLES,
  styleById,
  type OpeningStyle,
} from '../../designer/catalog/openings'
import { useDesignStore } from '../../designer/store/designStore'
import type { Opening } from '../../designer/types'
import { fmtMm } from '../../lib/units'
import { useUiStore } from '../uiStore'

export function Step3Openings() {
  const walls = useDesignStore((s) => s.doc.walls)
  const selectedId = useDesignStore((s) => s.selectedId)
  const addOpeningAuto = useDesignStore((s) => s.addOpeningAuto)
  const select = useDesignStore((s) => s.select)

  const [full, setFull] = useState(false)
  const selected = walls.flatMap((w) => w.openings).find((o) => o.id === selectedId)

  /**
   * Bấm một kiểu là cửa RƠI VÀO PHÒNG NGAY, không phải ngắm rồi bấm lên tường.
   * Chỗ đặt là khoảng trống rộng nhất còn lại; kéo đi đâu thì kéo sau.
   */
  function place(style: OpeningStyle) {
    const id = addOpeningAuto(style.id)
    setFull(id === null)
    if (id) select(id)
  }

  return (
    <>
      {selected ? (
        <SelectedOpening opening={selected} />
      ) : (
        <p className="note">
          Bấm một kiểu bên dưới — cửa hiện ra ngay trong phòng. Sau đó kéo nó trượt dọc tường,
          vòng qua góc sang tường khác cũng được.
        </p>
      )}

      {full && (
        <p className="note is-warn">
          Không còn tường nào đủ chỗ cho kiểu đó. Xoá bớt cửa hoặc kéo tường cho dài ra.
        </p>
      )}

      <h3>Kiểu cửa đi</h3>
      <StyleGrid list={DOOR_STYLES} onPick={place} />

      <h3>Kiểu cửa sổ</h3>
      <StyleGrid list={WINDOW_STYLES} onPick={place} />
    </>
  )
}

function StyleGrid({
  list,
  onPick,
}: {
  list: OpeningStyle[]
  onPick: (style: OpeningStyle) => void
}) {
  return (
    <div className="style-grid">
      {list.map((s) => (
        <button key={s.id} className="style-card" onClick={() => onPick(s)}>
          <StyleThumb style={s} />
          <span>{s.name}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Thumbnail vẽ bằng SVG sinh từ chính tham số của kiểu — khung bao, nẹp chia ô,
 * kính hay cánh đặc, tay nắm, và cả bệ dưới của cửa sổ.
 *
 * Thêm kiểu mới trong `openings.ts` là thumbnail tự có, không phải làm ảnh.
 * Tỉ lệ ngang/dọc lấy đúng `width`/`height` thật, nên nhìn ảnh là đoán được
 * cửa nào rộng cửa nào hẹp.
 */
function StyleThumb({ style }: { style: OpeningStyle }) {
  const BOX_W = 40
  const BOX_H = 48
  const F = 2.2 // bề dày khung, quy ra pixel thumbnail

  // Giữ đúng tỉ lệ thật, vừa trong khung BOX_W × BOX_H
  const ratio = style.width / style.height
  const h = Math.min(BOX_H, BOX_W / ratio)
  const w = h * ratio
  const x = (BOX_W - w) / 2
  // Cửa đi đứng trên sàn, cửa sổ treo lơ lửng — vẽ đúng như vậy cho dễ phân biệt
  const y = style.kind === 'door' ? BOX_H - h : (BOX_H - h) / 2

  const ix = x + F
  const iy = y + F
  const iw = w - F * 2
  const ih = h - F * 2

  const bars = []
  for (let i = 1; i < style.cols; i++) {
    const bx = ix + (iw * i) / style.cols
    bars.push(<line key={`v${i}`} x1={bx} y1={iy} x2={bx} y2={iy + ih} />)
  }
  for (let i = 1; i < style.rows; i++) {
    const by = iy + (ih * i) / style.rows
    bars.push(<line key={`h${i}`} x1={ix} y1={by} x2={ix + iw} y2={by} />)
  }

  const knobs = style.leaves === 2 ? [x + w / 2 - 3.4, x + w / 2 + 3.4] : [x + w - F - 3.4]

  return (
    <svg viewBox={`0 0 ${BOX_W} ${BOX_H}`} width={BOX_W} height={BOX_H} className="style-thumb">
      {/* Mảng tường quanh lỗ, cho thấy cửa nằm trên tường chứ không lơ lửng */}
      <rect x={0} y={0} width={BOX_W} height={BOX_H} className="thumb-wall" />
      <rect x={x} y={y} width={w} height={h} className="thumb-frame" />
      <rect
        x={ix}
        y={iy}
        width={iw}
        height={ih}
        className={style.glass ? 'pane-glass' : 'pane-solid'}
      />
      <g className="pane-mullion">{bars}</g>
      {style.leaves === 2 && (
        <line x1={x + w / 2} y1={iy} x2={x + w / 2} y2={iy + ih} className="pane-stile" />
      )}
      {style.kind === 'door' &&
        knobs.map((kx) => <circle key={kx} cx={kx} cy={y + h * 0.55} r={1.2} className="thumb-knob" />)}
      {/* Bệ cửa sổ */}
      {style.kind === 'window' && (
        <rect x={x - 1.5} y={y + h} width={w + 3} height={1.8} className="thumb-frame" />
      )}
    </svg>
  )
}

const LIMIT = {
  width: { min: 400, max: 4000 },
  height: { min: 400, max: 3000 },
  elevation: { min: 0, max: 2000 },
}

function SelectedOpening({ opening }: { opening: Opening }) {
  const updateOpening = useDesignStore((s) => s.updateOpening)
  const removeOpening = useDesignStore((s) => s.removeOpening)
  const endEdit = useDesignStore((s) => s.endEdit)
  const select = useDesignStore((s) => s.select)
  const unit = useUiStore((s) => s.unit)

  const style = styleById(opening.styleId)

  // Phím Delete do `useHistoryShortcuts` lo chung cho cả cửa lẫn nội thất
  return (
    <div className="sel-card">
      <div className="sel-head">
        <b>{style.name}</b>
        <button className="icon-btn" title="Xoá (phím Delete)" onClick={() => removeOpening(opening.id)}>
          Xoá
        </button>
      </div>

      <p className="note">Kéo thẳng cái cửa trong khung 3D để trượt dọc tường.</p>

      <NumberField
        label="Rộng"
        value={opening.width}
        unit={unit}
        {...LIMIT.width}
        onCommit={(v) => {
          updateOpening(opening.id, { width: v })
          endEdit()
        }}
      />
      <NumberField
        label="Cao"
        value={opening.height}
        unit={unit}
        {...LIMIT.height}
        onCommit={(v) => {
          updateOpening(opening.id, { height: v })
          endEdit()
        }}
      />
      <NumberField
        label="Cách sàn"
        value={opening.elevation}
        unit={unit}
        {...LIMIT.elevation}
        onCommit={(v) => {
          updateOpening(opening.id, { elevation: v })
          endEdit()
        }}
      />

      <button className="btn sel-done" onClick={() => select(null)}>
        Bỏ chọn
      </button>
    </div>
  )
}

/**
 * Ô nhập số, đơn vị MM.
 *
 * Nhãn bên cạnh hiện theo đơn vị người dùng chọn để đối chiếu, nhưng ô nhập
 * vẫn là mm. Cho gõ `43 1/2 in` thì phải viết parser phân số — để dành
 * production, POC không cần.
 */
function NumberField({
  label,
  value,
  unit,
  min,
  max,
  onCommit,
}: {
  label: string
  value: number
  unit: Parameters<typeof fmtMm>[1]
  min: number
  max: number
  onCommit: (mm: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  function commit() {
    const n = Number(draft)
    if (!Number.isFinite(n)) return setDraft(String(value))
    onCommit(Math.min(max, Math.max(min, Math.round(n))))
  }

  return (
    <label className="field">
      <span className="field-head">
        {label}
        <em>{fmtMm(value, unit)}</em>
      </span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    </label>
  )
}
