import { SHAPES, shapeById, type ShapeId } from '../../designer/catalog/shapes'
import { useDesignStore } from '../../designer/store/designStore'

export function Step1Shape() {
  const shapeId = useDesignStore((s) => s.doc.room.shapeId)
  const setShape = useDesignStore((s) => s.setShape)

  return (
    <div className="shape-grid">
      {SHAPES.map((s) => (
        <button
          key={s.id}
          className={'shape-card' + (s.id === shapeId ? ' is-on' : '')}
          onClick={() => setShape(s.id)}
        >
          <ShapeThumb id={s.id} />
          <span>{s.name}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Thumbnail vẽ bằng SVG sinh từ chính `shapes.ts`.
 * Thêm hình mới trong `shapes.ts` là thumbnail tự có, không phải làm ảnh.
 */
export function ShapeThumb({ id }: { id: ShapeId }) {
  const def = shapeById(id)
  const poly = def.vertices.map((v) => ({ x: def.defaults[v.x], z: def.defaults[v.z] }))

  const xs = poly.map((p) => p.x)
  const zs = poly.map((p) => p.z)
  const minX = Math.min(...xs)
  const minZ = Math.min(...zs)
  const w = Math.max(...xs) - minX
  const h = Math.max(...zs) - minZ
  const scale = 56 / Math.max(w, h)

  const points = poly
    .map((p) => `${((p.x - minX) * scale).toFixed(1)},${((p.z - minZ) * scale).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox={`-4 -4 ${w * scale + 8} ${h * scale + 8}`} width="64" height="64">
      <polygon points={points} className="thumb-poly" />
    </svg>
  )
}
