import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Plane, Vector3 } from 'three'
import { type Point } from '../../lib/polygon'
import { m2mm } from '../../lib/units'
import { useDesignStore } from '../store/designStore'
import type { Item } from '../types'
import { containInRoom } from './containItem'
import { snapToWall } from './snapToWall'

type Args = {
  item: Item
  /** mm, bề rộng món đồ — cần để giữ cả khối trong phòng, không chỉ cái tâm. */
  widthMm: number
  /** mm, chiều sâu món đồ — cần để hút sát tường cho lưng chạm tường. */
  depthMm: number
  onSelect: (id: string) => void
}

/**
 * Kéo món đồ trên mặt sàn.
 *
 * Raycast vào một `THREE.Plane(y=0)` TOÁN HỌC, không phải mesh sàn — theo
 * đúng `claude.md`. Ổn định hơn: sàn hình L có chỗ khoét, kéo qua chỗ đó là
 * tia trượt ra ngoài và món đồ nhảy loạn.
 *
 * Hook này chỉ lo chuyện CHUỘT. Tính toán vị trí nằm ở `snapToWall` và
 * `closestPointOnPolygon` — hàm thuần, test được bằng số, dùng lại được cho
 * bàn phím hay ngón tay.
 */
export function useDragItem({ item, widthMm, depthMm, onSelect }: Args) {
  const moveItem = useDesignStore((s) => s.moveItem)
  // Bản "live", KHÔNG phải `rotateItem` — cái kia chốt history ngay, kéo một
  // lần sẽ đẻ ra hàng chục bước undo.
  const setItemRotation = useDesignStore((s) => s.setItemRotation)
  const endEdit = useDesignStore((s) => s.endEdit)
  const footprint = useDesignStore((s) => s.doc.room.footprint)
  const walls = useDesignStore((s) => s.doc.walls)

  const controls = useThree((s) => s.controls) as { enabled: boolean } | null

  const [dragging, setDragging] = useState(false)
  // Lệch giữa tâm món đồ và chỗ bấm chuột. Không có nó thì món đồ nhảy tâm
  // về ngay dưới con trỏ lúc vừa bấm.
  const grabOffset = useRef<Point>({ x: 0, z: 0 })

  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const hit = useMemo(() => new Vector3(), [])

  /** Điểm trên mặt sàn mà tia chuột đâm vào, tính bằng mm. Null = tia song song sàn. */
  function floorPoint(e: ThreeEvent<PointerEvent>): Point | null {
    if (!e.ray.intersectPlane(plane, hit)) return null
    return { x: m2mm(hit.x), z: m2mm(hit.z) }
  }

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    onSelect(item.id)

    const p = floorPoint(e)
    if (!p) return

    grabOffset.current = { x: item.position.x - p.x, z: item.position.z - p.z }
    // Bắt con trỏ: kéo nhanh ra khỏi món đồ vẫn không tuột.
    ;(e.target as Element).setPointerCapture(e.pointerId)
    // Tắt xoay camera, không thì vừa kéo đồ vừa xoay cả phòng.
    if (controls) controls.enabled = false
    setDragging(true)
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!dragging) return
    const p = floorPoint(e)
    if (!p) return

    let next: Point = {
      x: p.x + grabOffset.current.x,
      z: p.z + grabOffset.current.z,
    }

    // 1. Không cho ra ngoài phòng. Kẹp CẢ KHỐI chứ không phải mỗi cái tâm —
    //    kẹp tâm thì cái sofa dài 2.2m kéo sát tường là thò một nửa ra ngoài nhà.
    next = containInRoom(next, widthMm, depthMm, item.rotationY, footprint)

    // 2. Gần tường thì hút sát và xoay lưng vào tường.
    //    Thảm thì bỏ qua — thảm nằm giữa phòng là chuyện bình thường.
    if (item.placement !== 'rug') {
      const snap = snapToWall(next, depthMm, walls)
      if (snap) {
        // XOAY TRƯỚC rồi mới dời. `moveItem` tự kẹp món đồ vào trong phòng
        // theo góc xoay HIỆN TẠI, nên đặt sai thứ tự là nó kẹp theo góc cũ —
        // đứng ở góc phòng sẽ thấy đồ thò qua bức tường vuông góc.
        setItemRotation(item.id, snap.rotationY)
        moveItem(item.id, snap.position)
        return
      }
    }

    moveItem(item.id, next)
  }

  function onPointerUp(e: ThreeEvent<PointerEvent>) {
    if (!dragging) return
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    if (controls) controls.enabled = true
    setDragging(false)
    // Cả lần kéo gộp thành ĐÚNG 1 bước undo.
    endEdit()
  }

  return { dragging, handlers: { onPointerDown, onPointerMove, onPointerUp } }
}
