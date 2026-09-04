import { useState } from 'react'
import { productById, productGroups, type Category } from '../designer/catalog/products'
import { useDesignStore } from '../designer/store/designStore'
import { fmtMm } from '../lib/units'
import { useUiStore } from './uiStore'

/** Xoay 15° mỗi lần bấm. 90° cho vuông góc nhanh. */
const STEP = Math.PI / 12
const QUARTER = Math.PI / 2

export function FurniturePanel() {
  const items = useDesignStore((s) => s.doc.items)
  const selectedId = useDesignStore((s) => s.selectedId)
  const addItem = useDesignStore((s) => s.addItem)
  const select = useDesignStore((s) => s.select)

  const groups = productGroups()
  const [open, setOpen] = useState<Category>(groups[0].category)

  const selected = items.find((it) => it.id === selectedId)

  return (
    <>
      {selected && <SelectedItem itemId={selected.id} productId={selected.productId} />}

      <h3>Thêm đồ</h3>
      {groups.map(({ category, items: list }) => (
        <div className="cat" key={category}>
          <button
            className={'cat-head' + (open === category ? ' is-on' : '')}
            onClick={() => setOpen(category)}
          >
            <span>{category}</span>
            <em>{list.length}</em>
          </button>

          {open === category && (
            <div className="rows">
              {list.map((p) => (
                <button
                  key={p.id}
                  className="row-btn"
                  onClick={() => select(addItem(p.id))}
                  title={`${p.size.w} × ${p.size.d} × ${p.size.h} mm`}
                >
                  <span className="row-dot" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <em>
                    {p.size.w}×{p.size.d}
                  </em>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function SelectedItem({ itemId, productId }: { itemId: string; productId: string }) {
  const items = useDesignStore((s) => s.doc.items)
  const rotateItem = useDesignStore((s) => s.rotateItem)
  const removeItem = useDesignStore((s) => s.removeItem)
  const duplicateItem = useDesignStore((s) => s.duplicateItem)
  const setItemColor = useDesignStore((s) => s.setItemColor)
  const select = useDesignStore((s) => s.select)
  const unit = useUiStore((s) => s.unit)

  const product = productById(productId)
  const item = items.find((it) => it.id === itemId)

  return (
    <div className="sel-card">
      <div className="sel-head">
        <b>{product.name}</b>
        <button className="icon-btn" title="Xoá (phím Delete)" onClick={() => removeItem(itemId)}>
          Xoá
        </button>
      </div>

      <p className="note">
        {fmtMm(product.size.w, unit)} × {fmtMm(product.size.d, unit)} × cao{' '}
        {fmtMm(product.size.h, unit)}
      </p>

      {/* Bảng màu cũng có trên thanh công cụ nổi trong khung 3D — hai nơi, một hành vi */}
      {product.colors && (
        <>
          <p className="field-head">Màu</p>
          <div className="swatches">
            {product.colors.map((c) => (
              <button
                key={c}
                className={'swatch' + (item?.color === c ? ' is-on' : '')}
                style={{ background: c }}
                title={c}
                onClick={() => setItemColor(itemId, c)}
              />
            ))}
            <button
              className={'swatch swatch-reset' + (item?.color ? '' : ' is-on')}
              title="Màu gốc"
              onClick={() => setItemColor(itemId, null)}
            >
              ⟲
            </button>
          </div>
        </>
      )}

      <div className="rotate-row">
        <button className="icon-btn" onClick={() => rotateItem(itemId, -QUARTER)}>
          ↺ 90°
        </button>
        <button className="icon-btn" onClick={() => rotateItem(itemId, -STEP)}>
          ↺ 15°
        </button>
        <button className="icon-btn" onClick={() => rotateItem(itemId, STEP)}>
          15° ↻
        </button>
        <button className="icon-btn" onClick={() => rotateItem(itemId, QUARTER)}>
          90° ↻
        </button>
      </div>

      <div className="rotate-row">
        <button
          className="icon-btn"
          onClick={() => {
            const id = duplicateItem(itemId)
            if (id) select(id)
          }}
        >
          ⧉ Nhân bản
        </button>
        <button className="icon-btn" onClick={() => select(null)}>
          Bỏ chọn
        </button>
      </div>
    </div>
  )
}
