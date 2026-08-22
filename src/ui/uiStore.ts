import { create } from 'zustand'
import type { CameraPreset } from '../designer/controls/cameraPresets'
import type { DisplayUnit } from '../lib/units'

export const STEPS = [
  { n: 1, title: 'Chọn hình phòng', hint: 'Chọn mặt bằng gần giống phòng thật nhất.' },
  { n: 2, title: 'Chỉnh kích thước', hint: 'Kéo từng bức tường cho khớp số đo thật.' },
  { n: 3, title: 'Thêm cửa & cửa sổ', hint: 'Chọn kiểu rồi bấm lên mặt trong tường.' },
  { n: 4, title: 'Chọn màu & sàn', hint: '' },
] as const

export type StepNumber = 1 | 2 | 3 | 4

/** `wizard` = đi từng bước. `design` = đã xong, sửa tự do. */
export type Mode = 'wizard' | 'design'

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
  /** Kiểu cửa đang "lên nòng" ở Bước 3. Bấm lên tường là đặt cái này. */
  armedStyleId: string | null
  /** Góc nhìn đặt sẵn. Chỉ có tác dụng ở chế độ thiết kế. */
  cameraPreset: CameraPreset

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
  setArmedStyle: (styleId: string | null) => void
  setCameraPreset: (preset: CameraPreset) => void
}

/** Dọn sạch mấy thứ chỉ có nghĩa trong đúng một bước. */
const CLEAR = { selectedEdge: null, armedStyleId: null } as const

export const useUiStore = create<UiState>()((set) => ({
  mode: 'wizard',
  step: 1,
  hasFinished: false,
  unit: 'ft',
  selectedEdge: null,
  draggingWall: false,
  armedStyleId: null,
  cameraPreset: 'free',

  goTo: (step) => set({ step, ...CLEAR }),
  next: () => set((s) => ({ step: Math.min(4, s.step + 1) as StepNumber, ...CLEAR })),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1) as StepNumber, ...CLEAR })),
  finish: () => set({ mode: 'design', hasFinished: true, ...CLEAR }),
  editStep: (step) => set({ mode: 'wizard', step, ...CLEAR }),
  setUnit: (unit) => set({ unit }),
  selectEdge: (selectedEdge) => set({ selectedEdge }),
  setDraggingWall: (draggingWall) => set({ draggingWall }),
  setArmedStyle: (armedStyleId) => set({ armedStyleId }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
}))

/**
 * Bước 1–2 KHOÁ góc nhìn từ trên xuống và phủ lớp đo/kéo lên trên — nhìn từ
 * trên xuống mới thấy được góc phòng vát hay vuông.
 * Bước 3–4 và chế độ thiết kế: phối cảnh tự do, xoay ngắm được.
 */
export function useIsTopDown(): boolean {
  return useUiStore((s) => s.mode === 'wizard' && s.step <= 2)
}

/** Chỉ Bước 3 mới cho bấm lên tường để đặt cửa. */
export function useIsPlacingOpenings(): boolean {
  return useUiStore((s) => s.mode === 'wizard' && s.step === 3)
}
