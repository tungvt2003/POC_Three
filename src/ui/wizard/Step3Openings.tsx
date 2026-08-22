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
  const armedStyleId = useUiStore((s) => s.armedStyleId)
  const setArmedStyle = useUiStore((s) => s.setArmedStyle)

  const selected = walls.flatMap((w) => w.openings).find((o) => o.id === selectedId)

  return (
    <>
      {selected ? (
        <SelectedOpening opening={selected} />
      ) : (
        <p className="note">
          {armedStyleId
            ? 'Bấm lên MẶT TRONG của tường để đặt. Bấm lại vào kiểu đang chọn để bỏ.'
            : 'Chọn một kiểu bên dưới, rồi bấm lên tường.'}
        </p>
      )}

      <h3>Kiểu cửa đi</h3>
      <StyleGrid list={DOOR_STYLES} armed={armedStyleId} onPick={setArmedStyle} />

      <h3>Kiểu cửa sổ</h3>
      <StyleGrid list={WINDOW_STYLES} armed={armedStyleId} onPick={setArmedStyle} />
    </>
  )
}

function StyleGrid({
  list,
  armed,
  onPick,
}: {
  list: OpeningStyle[]
  armed: string | null
  onPick: (id: string | null) => void
}) {
  return (
    <div className="style-grid">
      {list.map((s) => (
        <button
          key={s.id}
          className={'style-card' + (s.id === armed ? ' is-on' : '')}
          // Bấm lại vào kiểu đang chọn thì hạ nòng — khỏi phải tìm nút "huỷ"
          onClick={() => onPick(s.id === armed ? null : s.id)}
        >
          <StyleThumb style={s} />
          <span>{s.name}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Thumbnail vẽ bằng SVG sinh từ chính tham số của kiểu.
 * Thêm kiểu mới trong `openings.ts` là thumbnail tự có, không phải làm ảnh.
 */
function StyleThumb({ style }: { style: OpeningStyle }) {
  const W = 34
  const H = 46
  const pad = 3
  const iw = W - pad * 2
  const ih = H - pad * 2

  const lines = []
  for (let i = 1; i < style.cols; i++) {
    const x = pad + (iw * i) / style.cols
    lines.push(<line key={`v${i}`} x1={x} y1={pad} x2={x} y2={H - pad} />)
  }
  for (let i = 1; i < style.rows; i++) {
    const y = pad + (ih * i) / style.rows
    lines.push(<line key={`h${i}`} x1={pad} y1={y} x2={W - pad} y2={y} />)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="style-thumb">
      <rect
        x={pad}
        y={pad}
        width={iw}
        height={ih}
        className={style.glass ? 'pane-glass' : 'pane-solid'}
      />
      <g className="pane-mullion">{lines}</g>
      {style.leaves === 2 && (
        <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} className="pane-stile" />
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
