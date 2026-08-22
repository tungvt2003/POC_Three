import { PRODUCTS, productById } from '../designer/catalog/products'
import { useDesignStore } from '../designer/store/designStore'
import { fmtMm } from '../lib/units'
import { useUiStore } from './uiStore'

/** Xoay 15° mỗi lần bấm. Nhấn giữ Shift thì 90° cho vuông góc nhanh. */
const STEP = Math.PI / 12
const QUARTER = Math.PI / 2

export function FurniturePanel() {
  const items = useDesignStore((s) => s.doc.items)
  const selectedId = useDesignStore((s) => s.selectedId)
  const addItem = useDesignStore((s) => s.addItem)
  const select = useDesignStore((s) => s.select)

  const selected = items.find((it) => it.id === selectedId)

  return (
    <>
      {selected && <SelectedItem itemId={selected.id} productId={selected.productId} />}

      <h3>Thêm đồ</h3>
      <div className="rows">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            className="row-btn"
            onClick={() => select(addItem(p.id))}
            title={`${p.size.w} × ${p.size.d} × ${p.size.h} mm`}
          >
            <span>{p.name}</span>
            <em>
              {p.size.w}×{p.size.d}
            </em>
          </button>
        ))}
      </div>

      <p className="note">
        Tất cả đang là KHỐI TẠM đúng kích thước thật. Có file <code>.glb</code> của khách thì
        điền vào <code>modelUrl</code> trong <code>products.ts</code>, không phải sửa gì khác.
      </p>
    </>
  )
}

function SelectedItem({ itemId, productId }: { itemId: string; productId: string }) {
  const rotateItem = useDesignStore((s) => s.rotateItem)
  const removeItem = useDesignStore((s) => s.removeItem)
  const select = useDesignStore((s) => s.select)
  const unit = useUiStore((s) => s.unit)

  const product = productById(productId)

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

      <button className="btn sel-done" onClick={() => select(null)}>
        Bỏ chọn
      </button>
    </div>
  )
}
