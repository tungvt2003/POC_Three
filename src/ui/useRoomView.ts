import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { bounds, type Point } from '../lib/polygon'

/** px. Lề chừa quanh phòng cho nhãn đo. */
export const VIEW_PAD = 96

/**
 * Nhân thêm vào kích thước phòng khi canh khung.
 *
 * Fit vừa khít mặt SÀN thì tường bị cắt: tường dày 100mm mỗi bên, lại còn
 * mặt trên tường phóng to ~1.24 lần vì phối cảnh. Chừa sẵn cho đỡ phải tính
 * chính xác — POC không cần khít từng pixel.
 */
const ROOM_FIT_SLACK = 1.35

/** Tốc độ canh giữa lại sau khi nhả chuột. 12 ≈ 250ms là xong. */
const LAMBDA = 12

/**
 * Khung nhìn từ trên xuống, dùng CHUNG cho cả 3D lẫn lớp phủ 2D.
 *
 * `scale` là px trên mỗi mm ở CAO ĐỘ SÀN. Camera 3D chọn độ cao sao cho khớp
 * đúng con số này, nhờ vậy nhãn đo và vạch kéo nằm đúng lên tường trong ảnh 3D.
 */
export type RoomView = { cx: number; cz: number; scale: number }

export function fitView(footprint: Point[], w: number, h: number): RoomView {
  const b = bounds(footprint)
  return {
    cx: (b.minX + b.maxX) / 2,
    cz: (b.minZ + b.maxZ) / 2,
    scale: Math.min(
      (w - VIEW_PAD * 2) / Math.max(1, (b.maxX - b.minX) * ROOM_FIT_SLACK),
      (h - VIEW_PAD * 2) / Math.max(1, (b.maxZ - b.minZ) * ROOM_FIT_SLACK),
    ),
  }
}

/**
 * Khung nhìn có ĐÔNG CỨNG.
 *
 * Lúc đang kéo tường thì giữ nguyên khung nhìn. Nếu để nó canh lại liên tục
 * thì kéo một cạnh mà cả phòng trôi và co — cảm giác như đang thu nhỏ cả căn
 * nhà chứ không phải kéo một bức tường.
 *
 * Nhả chuột xong mới canh giữa lại, và canh có chuyển động mượt chứ không nhảy.
 */
export function useRoomView(footprint: Point[], w: number, h: number, frozen: boolean): RoomView {
  const target = useMemo(() => fitView(footprint, w, h), [footprint, w, h])

  const [view, setView] = useState<RoomView>(target)
  const viewRef = useRef(view)
  viewRef.current = view

  // Đổi kích thước cửa sổ thì bám ngay, không chờ chuyển động
  useLayoutEffect(() => {
    setView((v) => ({ ...v, scale: v.scale }))
  }, [w, h])

  useEffect(() => {
    if (frozen) return

    let stopped = false
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      if (stopped) return
      const dt = Math.min(0.1, (now - last) / 1000) // chặn trần khi tab vừa hiện lại
      last = now

      const cur = viewRef.current
      // Giảm dần theo THỜI GIAN, không theo số frame. Tính theo frame thì máy
      // yếu hoặc tab chạy nền (trình duyệt hạ rAF xuống vài fps) sẽ trôi rất
      // chậm; theo thời gian thì luôn mất đúng ~250ms bất kể fps.
      const k = 1 - Math.exp(-LAMBDA * dt)
      const next: RoomView = {
        cx: cur.cx + (target.cx - cur.cx) * k,
        cz: cur.cz + (target.cz - cur.cz) * k,
        scale: cur.scale + (target.scale - cur.scale) * k,
      }
      const done =
        Math.abs(target.cx - next.cx) < 1 &&
        Math.abs(target.cz - next.cz) < 1 &&
        Math.abs(target.scale - next.scale) < 1e-5

      setView(done ? target : next)
      if (!done) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [target, frozen])

  if (import.meta.env.DEV) {
    // Soi bằng `__view` trong console khi cần kiểm khung nhìn có đông cứng không
    Object.assign(window, { __view: view, __viewTarget: target })
  }

  return view
}

/**
 * Góc mở dọc của camera nhìn từ trên xuống. Dùng CHUNG giữa camera 3D và lớp
 * phủ — lệch nhau là nhãn đo trượt khỏi tường.
 */
export const TOP_FOV = 16

/** mm. Khoảng cách từ camera xuống mặt sàn, suy ngược từ `view.scale`. */
export function topDownDistMm(view: RoomView, hPx: number): number {
  const visibleMm = hPx / view.scale
  return visibleMm / 2 / Math.tan((TOP_FOV * Math.PI) / 360)
}

/**
 * Hệ số phóng to của một mặt phẳng ở độ cao `heightMm`.
 *
 * Camera cách sàn `dist`, nên mặt ở độ cao h chỉ cách camera `dist - h` và
 * hiện to hơn đúng `dist / (dist - h)` lần. Cần con số này để vẽ đường bao
 * lên ĐỈNH tường thay vì chân tường.
 */
export function heightScale(distMm: number, heightMm: number): number {
  return distMm / (distMm - heightMm)
}

/** mm -> px, ở độ cao `heightMm`. Trục z của thế giới thành trục y màn hình. */
export function projectAt(
  p: Point,
  view: RoomView,
  w: number,
  h: number,
  distMm: number,
  heightMm: number,
): { x: number; y: number } {
  const s = view.scale * heightScale(distMm, heightMm)
  return {
    x: (p.x - view.cx) * s + w / 2,
    y: (p.z - view.cz) * s + h / 2,
  }
}

/** px -> mm, ở độ cao `heightMm`. */
export function unprojectAt(
  px: number,
  py: number,
  view: RoomView,
  w: number,
  h: number,
  distMm: number,
  heightMm: number,
): Point {
  const s = view.scale * heightScale(distMm, heightMm)
  return {
    x: (px - w / 2) / s + view.cx,
    z: (py - h / 2) / s + view.cz,
  }
}
