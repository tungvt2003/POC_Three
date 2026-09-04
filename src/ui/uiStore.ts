import { create } from 'zustand'
import type { CameraPreset } from '../designer/controls/cameraPresets'
import type { DisplayUnit } from '../lib/units'

export const STEPS = [
  { n: 1, title: 'Chọn hình phòng', hint: 'Chọn mặt bằng gần giống phòng thật nhất.' },
  { n: 2, title: 'Chỉnh kích thước', hint: 'Kéo từng bức tường cho khớp số đo thật.' },
  { n: 3, title: 'Thêm cửa & cửa sổ', hint: 'Bấm một kiểu — cửa vào phòng ngay, rồi kéo dọc tường.' },
  { n: 4, title: 'Chọn màu & sàn', hint: '' },
] as const

export type StepNumber = 1 | 2 | 3 | 4

/** `wizard` = đi từng bước. `design` = đã xong, sửa tự do. */
export type Mode = 'wizard' | 'design'

/**
 * Hai tab của chế độ thiết kế. CỐ Ý loại trừ nhau:
 * đang bày nội thất mà lỡ tay kéo trúng bức tường hay đổi màu sàn thì rất bực.
 */
export type DesignTab = 'room' | 'furniture'

/**
 * State của GIAO DIỆN. Cố ý tách khỏi `designStore`:
 * đang ở bước mấy, đang xem đơn vị gì, đang chọn cạnh nào — không có cái nào
 * đáng để undo. Nhét chung vào `doc` thì Ctrl+Z sẽ nhảy lùi wizard, rất khó chịu.
 */
type UiState = {
  mode: Mode
  step: StepNumber
  /** Đã bấm "Xong" lần nào chưa. Rồi thì mọi bước đều có nút thoát nhanh. */
  hasFinished: boolean
  /** Đơn vị HIỂN THỊ. State thật vẫn luôn là mm. */
  unit: DisplayUnit
  /** Chỉ số cạnh đang chọn trên lớp phủ. */
  selectedEdge: number | null
  /** Đang kéo tường -> khung nhìn đông cứng, không canh giữa lại giữa chừng. */
  draggingWall: boolean
  /** Góc nhìn đặt sẵn. Chỉ có tác dụng ở chế độ thiết kế. */
  cameraPreset: CameraPreset
  /** Tab đang mở ở chế độ thiết kế. */
  designTab: DesignTab

  goTo: (step: StepNumber) => void
  next: () => void
  back: () => void
  /** Xong wizard, chuyển sang sửa tự do. */
  finish: () => void
  /** Từ chế độ thiết kế quay lại một bước cụ thể để sửa. */
  editStep: (step: StepNumber) => void
  setUnit: (unit: DisplayUnit) => void
  selectEdge: (index: number | null) => void
  setDraggingWall: (dragging: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  setDesignTab: (tab: DesignTab) => void
}

/** Dọn sạch mấy thứ chỉ có nghĩa trong đúng một bước. */
const CLEAR = { selectedEdge: null } as const

export const useUiStore = create<UiState>()((set) => ({
  mode: 'wizard',
  step: 1,
  hasFinished: false,
  unit: 'ft',
  selectedEdge: null,
  draggingWall: false,
  cameraPreset: 'free',
  designTab: 'room',

  goTo: (step) => set({ step, ...CLEAR }),
  next: () => set((s) => ({ step: Math.min(4, s.step + 1) as StepNumber, ...CLEAR })),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1) as StepNumber, ...CLEAR })),
  finish: () => set({ mode: 'design', hasFinished: true, ...CLEAR }),
  editStep: (step) => set({ mode: 'wizard', step, ...CLEAR }),
  setUnit: (unit) => set({ unit }),
  selectEdge: (selectedEdge) => set({ selectedEdge }),
  setDraggingWall: (draggingWall) => set({ draggingWall }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setDesignTab: (designTab) => set({ designTab }),
}))

/**
 * Bước 1–2 KHOÁ góc nhìn từ trên xuống và phủ lớp đo/kéo lên trên — nhìn từ
 * trên xuống mới thấy được góc phòng vát hay vuông.
 * Bước 3–4 và chế độ thiết kế: phối cảnh tự do, xoay ngắm được.
 */
export function useIsTopDown(): boolean {
  return useUiStore((s) => s.mode === 'wizard' && s.step <= 2)
}

/**
 * Cửa/cửa sổ CHỌN và KÉO được ở đâu:
 *   - Bước 3 của wizard: đúng việc đang làm.
 *   - Chế độ thiết kế, tab "Phòng": sửa lại cho khớp.
 * Tab "Nội thất" thì KHÔNG — lúc bày đồ mà kéo trúng cửa là hỏng việc.
 */
export function useCanEditOpenings(): boolean {
  return useUiStore((s) =>
    s.mode === 'wizard' ? s.step === 3 : s.designTab === 'room',
  )
}

/** Nội thất chỉ chọn/kéo được ở tab "Nội thất". */
export function useCanEditItems(): boolean {
  return useUiStore((s) => s.mode === 'design' && s.designTab === 'furniture')
}
