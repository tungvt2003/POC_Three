import { FLOOR_MATERIALS } from '../designer/catalog/floors'
import { useDesignStore } from '../designer/store/designStore'

const WALL_COLORS = ['#ede7dd', '#e8e8e6', '#d6dfd8', '#dfe3ec', '#eadfd6', '#c9c4bd']

/**
 * Chọn màu tường + vật liệu sàn.
 * Dùng chung cho Bước 4 của wizard và panel chế độ thiết kế — một chỗ sửa,
 * hai nơi đúng theo.
 */
export function StylePicker() {
  const wallColor = useDesignStore((s) => s.doc.room.wallColor)
  const floorMaterialId = useDesignStore((s) => s.doc.room.floorMaterialId)
  const updateRoom = useDesignStore((s) => s.updateRoom)
  const endEdit = useDesignStore((s) => s.endEdit)
  const commitRoom = useDesignStore((s) => s.commitRoom)

  return (
    <>
      <h3>Màu tường</h3>
      <div className="swatches">
        {WALL_COLORS.map((c) => (
          <button
            key={c}
            className={'swatch' + (c === wallColor ? ' is-on' : '')}
            style={{ background: c }}
            title={c}
            onClick={() => commitRoom({ wallColor: c })}
          />
        ))}
        <input
          type="color"
          className="swatch swatch-picker"
          value={wallColor}
          onChange={(e) => updateRoom({ wallColor: e.target.value })}
          // Bảng chọn màu của hệ điều hành bắn onChange liên tục lúc rê.
          // Đóng bảng -> blur -> chốt thành 1 bước undo.
          onBlur={endEdit}
        />
      </div>

      <h3>Sàn</h3>
      <div className="floors">
        {FLOOR_MATERIALS.map((m) => (
          <button
            key={m.id}
            className={'chip' + (m.id === floorMaterialId ? ' is-on' : '')}
            onClick={() => commitRoom({ floorMaterialId: m.id })}
          >
            {m.name}
            <em>
              {m.tile.w}×{m.tile.h}
            </em>
          </button>
        ))}
      </div>
    </>
  )
}
