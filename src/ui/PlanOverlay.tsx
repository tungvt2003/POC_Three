import { useMemo, useRef, useState } from 'react'
import { describeEdges, shapeById, type EdgeInfo } from '../designer/catalog/shapes'
import { WALL_THICKNESS } from '../designer/scene/buildWalls'
import { useDesignStore } from '../designer/store/designStore'
import { offsetPolygon, type Point } from '../lib/polygon'
import { fmtMm } from '../lib/units'
import { useUiStore } from './uiStore'
import { projectAt, topDownDistMm, unprojectAt, type RoomView } from './useRoomView'

/** mm. Bước làm tròn khi kéo — chống số nhảy loạn. */
const SNAP = 10

type Screen = { x: number; y: number }

type DragState = {
  /** Vị trí con trỏ trong THẾ GIỚI lúc bấm xuống, đo ở cao độ đỉnh tường. */
  from: Point
  /** Giá trị các đường lúc bấm xuống. */
  start: Record<string, number>
} & (
  | { kind: 'line'; key: string; axis: 'x' | 'z' }
  | { kind: 'diagonal'; xKey: string; zKey: string; nx: number; nz: number }
)

type Props = {
  view: RoomView
  w: number
  h: number
  /**
   * Bước 1 chỉ chọn hình nên KHÔNG vẽ đường bao đen và nhãn đo — nhìn cho
   * thoáng. Vẫn kéo tường được, con trỏ vẫn đổi hình để biết là kéo được.
   */
  showDimensions: boolean
}

/**
 * Lớp phủ đo & kéo, nằm ĐÈ lên ảnh 3D.
 *
 * Đường bao vẽ ở ĐỈNH tường (mép ngoài, cao độ trần), không phải chân tường.
 * Vẽ ở chân tường thì với hình L / chữ U, đoạn tường trong nằm lọt thỏm dưới
 * đáy hõm, bị chính bức tường che, không thấy đâu mà kéo.
 *
 * Muốn vẽ đúng đỉnh tường thì phải tính hệ số phối cảnh: mặt ở độ cao h gần
 * camera hơn nên hiện to hơn mặt sàn `dist / (dist - h)` lần.
 */
export function PlanOverlay({ view, w, h, showDimensions }: Props) {
  const room = useDesignStore((s) => s.doc.room)
  const updateShapeParams = useDesignStore((s) => s.updateShapeParams)
  const endEdit = useDesignStore((s) => s.endEdit)

  const unit = useUiStore((s) => s.unit)
  const selectedEdge = useUiStore((s) => s.selectedEdge)
  const selectEdge = useUiStore((s) => s.selectEdge)
  const setDraggingWall = useUiStore((s) => s.setDraggingWall)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const def = shapeById(room.shapeId)
  const edges = describeEdges(def, room.shapeParams)

  const distMm = topDownDistMm(view, h)
  const topY = room.height

  // Mép NGOÀI tường. Cùng thứ tự chỉ số với `edges` nên map 1-1 sang cạnh.
  const outer = useMemo(
    () => offsetPolygon(room.footprint, WALL_THICKNESS),
    [room.footprint],
  )

  const toScreen = (p: Point): Screen => projectAt(p, view, w, h, distMm, topY)
  const toWorld = (clientX: number, clientY: number): Point => {
    const r = svgRef.current!.getBoundingClientRect()
    return unprojectAt(clientX - r.left, clientY - r.top, view, w, h, distMm, topY)
  }

  function onEdgeDown(e: React.PointerEvent, edge: EdgeInfo) {
    if (!edge.drag) return
    e.preventDefault()
    // Bắt con trỏ: kéo ra ngoài khung vẫn không tuột.
    svgRef.current?.setPointerCapture(e.pointerId)

    const from = toWorld(e.clientX, e.clientY)
    const start = { ...room.shapeParams }

    if (edge.drag.kind === 'line') {
      dragRef.current = { kind: 'line', key: edge.drag.key, axis: edge.drag.axis, from, start }
    } else {
      const { nx, nz } = outwardNormal(edge)
      dragRef.current = {
        kind: 'diagonal',
        xKey: edge.drag.xKey,
        zKey: edge.drag.zKey,
        nx,
        nz,
        from,
        start,
      }
    }

    setDragging(true)
    setDraggingWall(true)
    selectEdge(edge.index)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const p = toWorld(e.clientX, e.clientY)

    // Tính theo ĐỘ DỜI của con trỏ, không theo vị trí tuyệt đối. Đường bao vẽ
    // ở mép ngoài còn tham số là mép trong — lệch nhau đúng WALL_THICKNESS.
    // Dùng độ dời thì chênh lệch đó tự triệt tiêu.
    if (drag.kind === 'line') {
      const delta = drag.axis === 'x' ? p.x - drag.from.x : p.z - drag.from.z
      updateShapeParams({ [drag.key]: snap(drag.start[drag.key] + delta) })
      return
    }

    // Dời cạnh xiên ra xa / lại gần theo phương pháp tuyến một đoạn `d`.
    // Đầu tựa vào tường ngang dịch `d/nx` theo x, đầu tựa vào tường dọc dịch
    // `d/nz` theo z. Toán này giữ cạnh xiên song song với chính nó, và chỉ
    // hai cạnh kề nó co lại / dài ra.
    const d = (p.x - drag.from.x) * drag.nx + (p.z - drag.from.z) * drag.nz
    updateShapeParams({
      [drag.xKey]: snap(drag.start[drag.xKey] + d / drag.nx),
      [drag.zKey]: snap(drag.start[drag.zKey] + d / drag.nz),
    })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return
    svgRef.current?.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDragging(false)
    setDraggingWall(false) // giờ mới cho khung nhìn canh giữa lại
    endEdit() // cả lần kéo gộp thành đúng 1 bước undo
  }

  const active = dragging ? selectedEdge : hovered
  const n = outer.length

  return (
    <svg
      ref={svgRef}
      className="overlay"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ cursor: cursorFor(edges, dragging, active) }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {showDimensions &&
        edges.map((e, i) => (
          <DimensionLabel
            key={`dim-${i}`}
            a={toScreen(outer[i])}
            b={toScreen(outer[(i + 1) % n])}
            text={fmtMm(e.length, unit)}
          />
        ))}

      {edges.map((e, i) => {
        const a = toScreen(outer[i])
        const c = toScreen(outer[(i + 1) % n])
        const on = active === i
        return (
          <g key={i}>
            {/* Bước 1 KHÔNG vẽ gì cả — kể cả vệt vàng khi trỏ vào. Chỉ chọn
                hình thì để hình mộc cho dễ nhìn. Vẫn kéo được, con trỏ vẫn đổi. */}
            {showDimensions && (
              <line
                x1={a.x}
                y1={a.y}
                x2={c.x}
                y2={c.y}
                className={'plan-wall' + (on ? ' is-on' : '')}
              />
            )}
            {e.drag && (
              <line
                x1={a.x}
                y1={a.y}
                x2={c.x}
                y2={c.y}
                className="plan-hit"
                onPointerDown={(ev) => onEdgeDown(ev, e)}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
              />
            )}
          </g>
        )
      })}

      {showDimensions &&
        outer.map((p, i) => {
          const s = toScreen(p)
          return <circle key={i} cx={s.x} cy={s.y} r={5} className="plan-vertex" />
        })}
    </svg>
  )
}

/** Nhãn đo đặt NGOÀI đường bao, kèm vạch gióng — như bản vẽ kỹ thuật. */
function DimensionLabel({ a, b, text }: { a: Screen; b: Screen; text: string }) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = dy / len
  const ny = -dx / len

  const off = 34
  const mx = (a.x + b.x) / 2 + nx * off
  const my = (a.y + b.y) / 2 + ny * off

  return (
    <g className="plan-dim">
      <line x1={a.x + nx * 10} y1={a.y + ny * 10} x2={a.x + nx * off} y2={a.y + ny * off} />
      <line x1={b.x + nx * 10} y1={b.y + ny * 10} x2={b.x + nx * off} y2={b.y + ny * off} />
      <line
        x1={a.x + nx * off}
        y1={a.y + ny * off}
        x2={b.x + nx * off}
        y2={b.y + ny * off}
        className="plan-dim-span"
      />
      <text x={mx + nx * 13} y={my + ny * 13} dominantBaseline="middle" textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** Pháp tuyến đơn vị hướng RA NGOÀI phòng (đa giác quay chiều dương). */
function outwardNormal(edge: EdgeInfo): { nx: number; nz: number } {
  const dx = edge.b.x - edge.a.x
  const dz = edge.b.z - edge.a.z
  const len = Math.hypot(dx, dz) || 1
  return { nx: dz / len, nz: -dx / len }
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

/** Con trỏ nói cho người dùng biết đang làm gì. */
function cursorFor(edges: EdgeInfo[], dragging: boolean, active: number | null): string {
  if (dragging) return 'grabbing'
  if (active === null) return 'default'

  const edge = edges[active]
  const drag = edge?.drag
  if (!drag) return 'default'
  if (drag.kind === 'line') return drag.axis === 'x' ? 'ew-resize' : 'ns-resize'

  // Cạnh xiên: chọn mũi tên chéo đúng chiều dốc
  const dx = edge.b.x - edge.a.x
  const dz = edge.b.z - edge.a.z
  return dx * dz > 0 ? 'nwse-resize' : 'nesw-resize'
}
