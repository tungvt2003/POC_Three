import { create } from 'zustand'

export type Stats = {
  fps: number
  /** Số lần gọi vẽ mỗi khung hình. Chỉ số này quyết định phần lớn hiệu năng. */
  drawCalls: number
  triangles: number
  /** Số texture + geometry đang giữ trong bộ nhớ GPU. Tăng đều = đang rò. */
  textures: number
  geometries: number
  programs: number
}

type StatsState = Stats & {
  visible: boolean
  toggle: () => void
  push: (s: Stats) => void
}

/**
 * Store RIÊNG cho bảng đo.
 *
 * Không nhét chung vào `uiStore`: bảng này cập nhật 4 lần/giây, mà `uiStore`
 * thì cả sidebar đang nghe. Chung một store là mỗi lần đo lại render cả panel.
 */
export const useStatsStore = create<StatsState>()((set) => ({
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  textures: 0,
  geometries: 0,
  programs: 0,
  visible: true,

  toggle: () => set((s) => ({ visible: !s.visible })),
  push: (s) => set(s),
}))
