import { useEffect, useState } from 'react'
import { describeEdges, shapeById, type LineDrag } from '../../designer/catalog/shapes'
import { useDesignStore } from '../../designer/store/designStore'
import { fmtMm } from '../../lib/units'
import { useUiStore } from '../uiStore'

const HEIGHT_LIMIT = { min: 2200, max: 3600 }

/**
 * Bước 2 KHÔNG có slider kích thước.
 *
 * Kéo thẳng bức tường trên mặt bằng bên phải. Sidebar chỉ để: đổi đơn vị,
 * xem bảng số đo, và gõ số chính xác cho bức tường đang chọn.
 * Riêng chiều cao trần vẫn là slider — nó không nhìn thấy được trên mặt bằng.
 */
export function Step2Size() {
  const room = useDesignStore((s) => s.doc.room)
  const updateRoom = useDesignStore((s) => s.updateRoom)
  const endEdit = useDesignStore((s) => s.endEdit)

  const unit = useUiStore((s) => s.unit)
  const setUnit = useUiStore((s) => s.setUnit)
  const selectedEdge = useUiStore((s) => s.selectedEdge)
  const selectEdge = useUiStore((s) => s.selectEdge)

  const def = shapeById(room.shapeId)
  const edges = describeEdges(def, room.shapeParams)

  return (
    <>
      <div className="seg">
        <button className={unit === 'ft' ? 'is-on' : ''} onClick={() => setUnit('ft')}>
          Feet
        </button>
        <button className={unit === 'cm' ? 'is-on' : ''} onClick={() => setUnit('cm')}>
          Centimet
        </button>
      </div>

      <p className="note">Kéo bức tường trên mặt bằng. Tường đối diện đứng yên.</p>

      <ul className="edges">
        {edges.map((e) => (
          <li
            key={e.index}
            className={
              (e.drag ? '' : 'is-derived ') + (selectedEdge === e.index ? 'is-sel' : '')
            }
            onPointerEnter={() => e.drag && selectEdge(e.index)}
          >
            <span>{e.drag ? e.drag.label : 'Cạnh xiên'}</span>
            <b>{fmtMm(e.length, unit)}</b>
          </li>
        ))}
      </ul>

      {/* Chỉ cạnh THẲNG mới gõ được số. Cạnh xiên dài bao nhiêu là do 2 đường
          kề quyết định, gõ thẳng vào nó thì không rõ nên dời đường nào. */}
      {selectedEdge !== null && edges[selectedEdge]?.drag?.kind === 'line' && (
        <EdgeNumberInput index={selectedEdge} />
      )}

      <h3>Cao trần</h3>
      <label className="field">
        <span className="field-head">
          <span />
          <b>{fmtMm(room.height, unit)}</b>
        </span>
        <input
          type="range"
          min={HEIGHT_LIMIT.min}
          max={HEIGHT_LIMIT.max}
          step={50}
          value={room.height}
          onChange={(e) => updateRoom({ height: Number(e.target.value) })}
          onPointerUp={endEdit}
          onKeyUp={endEdit}
          onBlur={endEdit}
        />
      </label>
    </>
  )
}

/**
 * Gõ số chính xác cho bức tường đang chọn.
 *
 * Ô nhập luôn tính bằng MM. Đổi sang feet/inch ở ô nhập thì phải parse
 * `7'6"` — để dành production, POC nhập mm cho chắc, chỗ khác vẫn hiển thị
 * đúng đơn vị người dùng chọn.
 */
function EdgeNumberInput({ index }: { index: number }) {
  const room = useDesignStore((s) => s.doc.room)
  const updateShapeParams = useDesignStore((s) => s.updateShapeParams)
  const endEdit = useDesignStore((s) => s.endEdit)

  const def = shapeById(room.shapeId)
  const edge = describeEdges(def, room.shapeParams)[index]
  // Component chỉ được render cho cạnh thẳng (xem chỗ gọi)
  const drag = edge.drag as LineDrag

  // Giữ bản nháp riêng để gõ dở dang không bị store ghi đè mỗi ký tự
  const [draft, setDraft] = useState(String(Math.round(edge.length)))
  useEffect(() => setDraft(String(Math.round(edge.length))), [edge.length])

  function apply() {
    const wanted = Number(draft)
    if (!Number.isFinite(wanted) || wanted <= 0) return

    // Kéo dài cạnh = dời đường ở ĐẦU KIA của cạnh. Đường của chính cạnh này
    // nằm dọc theo nó nên dời nó không đổi được chiều dài của nó.
    const other = otherLineKey(def, index, drag.key)
    if (!other) return

    const cur = room.shapeParams[other.key]
    const sign = other.growPositive ? 1 : -1
    updateShapeParams({ [other.key]: cur + sign * (wanted - edge.length) })
    endEdit()
  }

  return (
    <label className="field">
      <span className="field-head">
        {drag.label}
        <em>mm</em>
      </span>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
    </label>
  )
}

/**
 * Cạnh thứ `index` nằm trên đường `ownKey`. Hai đầu của nó tựa vào 2 đường
 * khác trục. Đổi chiều dài cạnh = dời một trong hai đường đó.
 * Ở đây chọn đường ở đầu `b` cho dễ đoán: gõ số to hơn thì cạnh dài về
 * phía đầu b.
 */
function otherLineKey(
  def: ReturnType<typeof shapeById>,
  index: number,
  ownKey: string,
): { key: string; growPositive: boolean } | null {
  const n = def.vertices.length
  const va = def.vertices[index]
  const vb = def.vertices[(index + 1) % n]

  // Cạnh nằm trên đường z -> hai đầu khác nhau ở đường x, và ngược lại
  const isZ = va.z === ownKey
  const keyA = isZ ? va.x : va.z
  const keyB = isZ ? vb.x : vb.z
  if (keyA === keyB) return null

  const axis = isZ ? def.lines.x : def.lines.z
  const iA = axis.findIndex((l) => l.key === keyA)
  const iB = axis.findIndex((l) => l.key === keyB)
  return { key: keyB, growPositive: iB > iA }
}
