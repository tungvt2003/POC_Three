import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Raycaster, Vector2 } from 'three'
import { useDesignStore } from '../store/designStore'
import type { Opening } from '../types'
import { pickWall } from './pickWall'

/**
 * Kéo cửa/cửa sổ trượt dọc tường, vòng qua góc sang tường khác được.
 *
 * KHÔNG dùng `onPointerMove` của r3f trên chính cái cửa. Lý do: cửa là CON của
 * group tường (bắt buộc, để fade cùng tường). Kéo sang tường khác là React
 * tháo cây cũ dựng cây mới — mesh đang bắt sự kiện biến mất giữa chừng, đứt tay
 * kéo.
 *
 * Nên: bấm xuống thì nghe `pointermove` trên `window` và tự bắn tia từ camera.
 * Cây 3D có dựng lại bao nhiêu lần cũng không ảnh hưởng.
 *
 * Hàm tính toán nằm ở `pickWall` — nhận tia, trả toạ độ tường. Nó không biết
 * lệnh đến từ chuột hay ngón tay, đúng quy ước `claude.md`.
 */
export function useDragOpening(opening: Opening, onSelect: (id: string) => void) {
  const walls = useDesignStore((s) => s.doc.walls)
  const height = useDesignStore((s) => s.doc.room.height)
  const moveOpening = useDesignStore((s) => s.moveOpening)
  const endEdit = useDesignStore((s) => s.endEdit)

  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null

  const [dragging, setDragging] = useState(false)

  // Mọi thứ thay đổi trong lúc kéo đi qua ref — listener trên `window` chỉ gắn
  // MỘT lần, không được đóng gói (closure) giá trị cũ.
  const live = useRef({ walls, height, opening })
  live.current = { walls, height, opening }

  /** mm. Lệch giữa mép trái cửa và điểm bấm — không có thì cửa nhảy tâm về con trỏ. */
  const grabOffset = useRef(0)
  /** mm. Lệch cao độ tương tự, chỉ dùng cho cửa sổ. */
  const grabY = useRef(0)

  const rayFrom = useCallback(
    (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const ndc = new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const caster = new Raycaster()
      caster.setFromCamera(ndc, camera)
      return caster.ray
    },
    [camera, canvas],
  )

  useEffect(() => {
    if (!dragging) return

    function onMove(e: PointerEvent) {
      const { walls: ws, height: h, opening: op } = live.current
      const hit = pickWall(rayFrom(e), ws, h)
      if (!hit) return

      // Cửa đi luôn đứng trên sàn -> KHÔNG truyền cao độ, kéo mấy cũng không
      // nhấc nó lên được. Cửa sổ thì bám theo cả chiều dọc.
      const elevation = op.kind === 'window' ? hit.y + grabY.current : undefined
      moveOpening(op.id, hit.wall.id, hit.t + grabOffset.current, elevation)
    }

    function onUp() {
      setDragging(false)
      if (controls) controls.enabled = true
      // Cả lần kéo gộp thành ĐÚNG 1 bước undo.
      endEdit()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, rayFrom, moveOpening, endEdit, controls])

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    onSelect(opening.id)

    const hit = pickWall(e.ray, walls, height)
    const onSameWall = hit !== null && hit.wall.id === opening.wallId
    grabOffset.current = onSameWall ? opening.t - hit.t : -opening.width / 2
    grabY.current = onSameWall ? opening.elevation - hit.y : -opening.height / 2

    // Tắt xoay camera, không thì vừa kéo cửa vừa xoay cả phòng.
    if (controls) controls.enabled = false
    setDragging(true)
  }

  return { dragging, onPointerDown }
}
