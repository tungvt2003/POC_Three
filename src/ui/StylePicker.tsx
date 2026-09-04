import { floorGroups } from '../designer/catalog/floors'
import { getFloorPreview } from '../designer/scene/floorTexture'
import { useDesignStore } from '../designer/store/designStore'

/**
 * Bảng màu tường. Nhóm theo tông cho dễ chọn, không phải một dãy dài lộn xộn.
 */
const WALL_COLORS = [
  ['#ffffff', '#f4f1ea', '#ede7dd', '#e6e0d4', '#d8d2c6', '#c9c4bd'],
  ['#e9eef0', '#dfe3ec', '#cfd8e3', '#b9c6d4', '#8fa3b8', '#5d7285'],
  ['#e4ece3', '#d6dfd8', '#c2d2c3', '#a9bfab', '#7e9a83', '#4f6b55'],
  ['#f2e7de', '#eadfd6', '#e2cdbb', '#d3b49b', '#b98d70', '#8a5f45'],
  ['#f1e3e3', '#e6cfcf', '#d8b3b3', '#c08f8f', '#96605f', '#6d3f3f'],
  ['#dedbe6', '#c9c3d6', '#aea5c4', '#8e83a8', '#655b80', '#3d3652'],
]

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
      <div className="swatch-rows">
        {WALL_COLORS.map((row, i) => (
          <div className="swatches" key={i}>
            {row.map((c) => (
              <button
                key={c}
                className={'swatch' + (c === wallColor ? ' is-on' : '')}
                style={{ background: c }}
                title={c}
                onClick={() => commitRoom({ wallColor: c })}
              />
            ))}
          </div>
        ))}
      </div>

      <label className="custom-color">
        <input
          type="color"
          value={wallColor}
          onChange={(e) => updateRoom({ wallColor: e.target.value })}
          // Bảng chọn màu của hệ điều hành bắn onChange liên tục lúc rê.
          // Đóng bảng -> blur -> chốt thành 1 bước undo.
          onBlur={endEdit}
        />
        <span>Màu tự chọn</span>
      </label>

      <h3>Sàn</h3>
      {floorGroups().map(({ group, items }) => (
        <div className="floor-group" key={group}>
          <p className="floor-group-name">{group}</p>
          <div className="floor-grid">
            {items.map((m) => (
              <button
                key={m.id}
                className={'floor-card' + (m.id === floorMaterialId ? ' is-on' : '')}
                title={`${m.name} — ô ${m.tile.w}×${m.tile.h} mm`}
                onClick={() => commitRoom({ floorMaterialId: m.id })}
              >
                {/*
                  Ảnh sinh từ CHÍNH hàm vẽ texture (xem `floorTexture.ts`),
                  nên nút bấm hiện đúng cái sẽ lát xuống sàn.
                */}
                <img src={getFloorPreview(m)} alt="" width={48} height={48} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
