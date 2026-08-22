import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { buildFootprint, carryParams, clampLine, shapeById, type ShapeId } from '../catalog/shapes'
import { makeId } from '../../lib/id'
import { bounds, type Point } from '../../lib/polygon'
import { productById } from '../catalog/products'
import { buildWalls, wallLength } from '../scene/buildWalls'
import type { Item, Opening, Room, Wall } from '../types'

/**
 * Phần dữ liệu CÓ undo/redo. Mọi thứ nằm ngoài `Doc` (selectedId, bước wizard,
 * đơn vị hiển thị, chính cái stack undo) không bị snapshot — nếu không sẽ
 * thành snapshot lồng snapshot.
 *
 * Lưu ý immer: `Wall.innerNormal` là instance `Vector3`, không phải object
 * thuần, nên immer coi nó là giá trị nguyên khối — chỉ thay được cả cục,
 * không sửa từng thành phần. immer cũng freeze nó, nên ĐỪNG gọi
 * `.set()`/`.negate()` lên normal lấy từ store; muốn tính toán thì `.clone()`.
 */
export type Doc = {
  room: Room
  walls: Wall[]
  items: Item[]
}

const HISTORY_LIMIT = 50

function makeRoom(shapeId: ShapeId, params: Record<string, number>, rest: Partial<Room>): Room {
  return {
    shapeId,
    shapeParams: params,
    footprint: buildFootprint(shapeId, params),
    height: 2700,
    wallColor: '#ede7dd',
    floorMaterialId: 'oak-plank',
    ...rest,
  }
}

/** Phòng trắng ban đầu. Gọi hàm chứ không dùng hằng — tránh dùng chung tham chiếu. */
function freshDoc(): Doc {
  const room = makeRoom('rect', shapeById('rect').defaults, {})
  return { room, walls: buildWalls(room.footprint), items: [] }
}

type DesignState = {
  doc: Doc
  selectedId: string | null

  past: Doc[]
  future: Doc[]
  /** Doc chụp lúc bắt đầu một chuỗi sửa liên tục (kéo slider, kéo cạnh, kéo item). */
  pending: Doc | null

  /** Sửa trường đơn (chiều cao, màu, sàn) kiểu "live". */
  updateRoom: (patch: Partial<Pick<Room, 'height' | 'wallColor' | 'floorMaterialId'>>) => void
  /** Sửa tham số hình kiểu "live" — kéo bao nhiêu cũng chỉ 1 bước undo. */
  updateShapeParams: (patch: Record<string, number>) => void
  /** Đóng chuỗi sửa live, đẩy 1 bước vào history. Gọi ở pointerup/keyup/blur. */
  endEdit: () => void
  /** Sửa một phát ăn ngay (bấm swatch màu, chọn sàn). */
  commitRoom: (patch: Partial<Pick<Room, 'height' | 'wallColor' | 'floorMaterialId'>>) => void
  /** Đổi hình phòng. Giữ lại tham số trùng tên. Một phát ăn ngay. */
  setShape: (shapeId: ShapeId) => void

  /**
   * Đặt một cửa/cửa sổ lên tường. Trả `null` nếu không đặt được (đè lên lỗ
   * khác hoặc không đủ chỗ). Một phát ăn ngay, có undo.
   */
  addOpening: (wallId: string, spec: OpeningSpec) => string | null
  removeOpening: (openingId: string) => void
  /** Sửa lỗ đang có. Bị từ chối nếu kích thước mới đè lên lỗ khác. */
  updateOpening: (openingId: string, patch: Partial<OpeningSpec>) => void

  /** Thêm một món nội thất vào giữa phòng. Trả id vừa tạo. */
  addItem: (productId: string) => string
  removeItem: (itemId: string) => void
  /** Xoay quanh trục đứng, cộng dồn theo radian. Một phát ăn ngay (nút bấm). */
  rotateItem: (itemId: string, deltaRad: number) => void
  /**
   * Đặt góc xoay tuyệt đối, kiểu "live" — KHÔNG đẩy history.
   * Dùng lúc đang kéo (hút tường tự xoay), gộp chung 1 bước undo với việc dời.
   */
  setItemRotation: (itemId: string, rad: number) => void
  /**
   * Dời món đồ tới toạ độ WORLD (mm). Kiểu "live" — kéo bao nhiêu cũng chỉ
   * 1 bước undo, nhớ gọi `endEdit()` lúc nhả chuột.
   *
   * Hàm này KHÔNG biết lệnh đến từ chuột hay ngón tay, đúng quy ước `claude.md`.
   */
  moveItem: (itemId: string, worldPosMm: Point) => void

  select: (id: string | null) => void
  /** Xoá thứ đang chọn, dù đó là cửa hay món đồ. */
  deleteSelected: () => void

  /**
   * Nạp một thiết kế khác vào (khôi phục từ `localStorage`, mở file...).
   * XOÁ SẠCH history — thiết kế vừa nạp là mốc mới, undo về thiết kế trước
   * đó thì người dùng chẳng hiểu chuyện gì đang xảy ra.
   */
  loadDoc: (doc: Doc) => void
  /** Về phòng trắng ban đầu. */
  reset: () => void

  undo: () => void
  redo: () => void
}

export type OpeningSpec = {
  styleId: string
  /** mm, khoảng cách dọc tường từ điểm `start`. */
  t: number
  width: number
  height: number
  /** mm, mép dưới cách sàn. Cửa đi = 0. */
  elevation: number
  kind: Opening['kind']
}

export const useDesignStore = create<DesignState>()(
  immer((set, get) => ({
    doc: freshDoc(),
    selectedId: null,

    past: [],
    future: [],
    pending: null,

    updateRoom: (patch) => {
      const before = get().doc
      set((s) => {
        if (!s.pending) s.pending = before
        Object.assign(s.doc.room, patch)
        // height/màu/sàn không đụng tới mặt bằng -> khỏi dựng lại tường.
      })
    },

    /**
     * Dời một hoặc nhiều ĐƯỜNG tường. Giá trị bị kẹp lại để tường không kéo
     * xuyên qua tường kề — kẹp ở store chứ không ở UI, để gọi từ đâu cũng an toàn.
     */
    updateShapeParams: (patch) => {
      const before = get().doc
      set((s) => {
        if (!s.pending) s.pending = before

        const def = shapeById(s.doc.room.shapeId)
        for (const [key, value] of Object.entries(patch)) {
          s.doc.room.shapeParams[key] = clampLine(def, s.doc.room.shapeParams, key, value)
        }
        regenerate(s.doc)
      })
    },

    endEdit: () => {
      const { pending, doc } = get()
      if (!pending) return

      set((s) => {
        // So sánh tham chiếu NGOÀI draft. immer chỉ tạo object mới khi có
        // thay đổi thật, nên bấm rồi nhả mà không kéo -> doc giữ nguyên
        // tham chiếu -> không đẩy bước rác vào history.
        if (pending !== doc) {
          s.past.push(pending)
          if (s.past.length > HISTORY_LIMIT) s.past.shift()
          // Làm việc mới thì nhánh redo cũ mất hiệu lực.
          s.future.length = 0
        }
        s.pending = null
      })
    },

    commitRoom: (patch) => {
      get().updateRoom(patch)
      get().endEdit()
    },

    setShape: (shapeId) => {
      const before = get().doc
      if (before.room.shapeId === shapeId) return

      set((s) => {
        if (!s.pending) s.pending = before
        s.doc.room.shapeId = shapeId
        s.doc.room.shapeParams = carryParams(shapeId, before.room.shapeParams)
        regenerate(s.doc)
      })
      get().endEdit()
    },

    addOpening: (wallId, spec) => {
      const before = get().doc
      const wall = before.walls.find((w) => w.id === wallId)
      if (!wall) return null

      const t = clampOpeningT(wall, spec)
      if (t === null) return null

      const id = makeId(spec.kind)
      set((s) => {
        if (!s.pending) s.pending = before
        const target = s.doc.walls.find((w) => w.id === wallId)!
        target.openings.push({ id, wallId, ...spec, t })
        target.openings.sort((a, b) => a.t - b.t)
      })
      get().endEdit()
      return id
    },

    updateOpening: (openingId, patch) => {
      const before = get().doc
      const wall = before.walls.find((w) => w.openings.some((o) => o.id === openingId))
      if (!wall) return

      const old = wall.openings.find((o) => o.id === openingId)!
      const next = { ...old, ...patch }
      const L = wallLength(wall)
      if (next.width <= 0 || next.height <= 0 || next.width >= L) return

      const t = Math.min(Math.max(next.t, 0), L - next.width)
      // Không được đè lên lỗ KHÁC trên cùng tường (chính nó thì bỏ qua)
      const clash = wall.openings.some(
        (o) => o.id !== openingId && t < o.t + o.width && o.t < t + next.width,
      )
      if (clash) return

      set((s) => {
        if (!s.pending) s.pending = before
        const target = s.doc.walls.find((w) => w.id === wall.id)!
        const item = target.openings.find((o) => o.id === openingId)!
        Object.assign(item, next, { t })
        target.openings.sort((a, b) => a.t - b.t)
      })
    },

    removeOpening: (openingId) => {
      const before = get().doc
      if (!before.walls.some((w) => w.openings.some((o) => o.id === openingId))) return

      set((s) => {
        if (!s.pending) s.pending = before
        for (const w of s.doc.walls) {
          w.openings = w.openings.filter((o) => o.id !== openingId)
        }
        if (s.selectedId === openingId) s.selectedId = null
      })
      get().endEdit()
    },

    addItem: (productId) => {
      const before = get().doc
      const product = productById(productId)
      const b = bounds(before.room.footprint)
      const id = makeId('item')

      set((s) => {
        if (!s.pending) s.pending = before
        s.doc.items.push({
          id,
          productId,
          // Thả vào giữa phòng. D10 sẽ cho kéo đi chỗ khác.
          position: { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 },
          rotationY: 0,
          placement: product.placement,
        })
      })
      get().endEdit()
      return id
    },

    removeItem: (itemId) => {
      const before = get().doc
      if (!before.items.some((it) => it.id === itemId)) return

      set((s) => {
        if (!s.pending) s.pending = before
        s.doc.items = s.doc.items.filter((it) => it.id !== itemId)
        if (s.selectedId === itemId) s.selectedId = null
      })
      get().endEdit()
    },

    rotateItem: (itemId, deltaRad) => {
      const before = get().doc
      set((s) => {
        if (!s.pending) s.pending = before
        const it = s.doc.items.find((x) => x.id === itemId)
        if (it) it.rotationY += deltaRad
      })
      get().endEdit()
    },

    setItemRotation: (itemId, rad) => {
      const before = get().doc
      set((s) => {
        if (!s.pending) s.pending = before
        const it = s.doc.items.find((x) => x.id === itemId)
        if (it) it.rotationY = rad
      })
    },

    moveItem: (itemId, worldPosMm) => {
      const before = get().doc
      set((s) => {
        if (!s.pending) s.pending = before
        const it = s.doc.items.find((x) => x.id === itemId)
        if (it) it.position = { x: worldPosMm.x, z: worldPosMm.z }
      })
    },

    // Chọn/bỏ chọn KHÔNG vào history — undo nên trả lại hình dạng phòng,
    // không phải trả lại việc mình vừa bấm vào đâu.
    select: (id) =>
      set((s) => {
        s.selectedId = id
      }),

    /**
     * Một phím Delete lo cả hai loại. Không bắt tầng UI phải biết id đang chọn
     * là cửa hay món đồ — nó không có lý do gì phải biết.
     */
    deleteSelected: () => {
      const id = get().selectedId
      if (!id) return
      if (get().doc.items.some((it) => it.id === id)) get().removeItem(id)
      else get().removeOpening(id)
    },

    loadDoc: (doc) =>
      set((s) => {
        s.doc = doc
        s.past.length = 0
        s.future.length = 0
        s.pending = null
        s.selectedId = null
      }),

    reset: () =>
      set((s) => {
        s.doc = freshDoc()
        s.past.length = 0
        s.future.length = 0
        s.pending = null
        s.selectedId = null
      }),

    undo: () => {
      const { past, doc } = get()
      if (past.length === 0) return
      const prev = past[past.length - 1]

      set((s) => {
        s.past.pop()
        s.future.push(doc)
        s.doc = prev
        s.pending = null
        if (s.selectedId && !prev.items.some((it) => it.id === s.selectedId)) {
          s.selectedId = null
        }
      })
    },

    redo: () => {
      const { future, doc } = get()
      if (future.length === 0) return
      const next = future[future.length - 1]

      set((s) => {
        s.future.pop()
        s.past.push(doc)
        s.doc = next
        s.pending = null
        if (s.selectedId && !next.items.some((it) => it.id === s.selectedId)) {
          s.selectedId = null
        }
      })
    },
  })),
)

/**
 * Kẹp vị trí `t` cho lỗ nằm gọn trong tường và không đè lên lỗ có sẵn.
 * Trả `null` khi không còn chỗ.
 *
 * Kiểm ở STORE chứ không ở UI: `wallSlabs` bỏ qua lỗ chồng nhau nên đè lên
 * nhau sẽ làm CỬA BIẾN MẤT chứ không báo lỗi. Chặn từ đây cho chắc.
 */
function clampOpeningT(wall: Wall, spec: OpeningSpec): number | null {
  const L = wallLength(wall)
  if (spec.width >= L) return null

  const t = Math.min(Math.max(spec.t, 0), L - spec.width)
  const hits = wall.openings.some((o) => t < o.t + o.width && o.t < t + spec.width)
  return hits ? null : t
}

/**
 * Sinh lại footprint + tường sau khi đổi hình hoặc tham số hình.
 *
 * Cửa/cửa sổ được GIỮ LẠI theo chỉ số tường. Đổi sang hình có ít tường hơn
 * thì lỗ trên các tường thừa mất luôn — chấp nhận, POC không làm ánh xạ khôn
 * hơn thế. Phòng co lại thì kéo `t` về trong tường, lỗ rộng hơn cả tường thì bỏ.
 */
function regenerate(doc: Doc): void {
  const prevWalls = doc.walls
  doc.room.footprint = buildFootprint(doc.room.shapeId, doc.room.shapeParams)

  doc.walls = buildWalls(doc.room.footprint).map((wall, i) => {
    const old = prevWalls[i]
    if (!old || old.openings.length === 0) return wall

    const len = wallLength(wall)
    wall.openings = old.openings
      .filter((o) => o.width <= len)
      .map((o) => ({ ...o, wallId: wall.id, t: Math.min(o.t, len - o.width) }))
    return wall
  })
}
