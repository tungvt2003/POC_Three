import { useEffect } from 'react'
import { useDesignStore } from '../designer/store/designStore'

/**
 * Ctrl+Z / Ctrl+Shift+Z (Cmd trên máy Mac).
 *
 * Gắn ở window vì canvas không nhận focus bàn phím. Bỏ qua khi con trỏ
 * đang ở trong ô nhập liệu — lúc đó Ctrl+Z là undo của chính ô đó.
 */
export function useHistoryShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTextEntry(document.activeElement)) return

      // Delete / Backspace xoá thứ đang chọn — cửa hay món đồ đều được
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!useDesignStore.getState().selectedId) return
        e.preventDefault()
        useDesignStore.getState().deleteSelected()
        return
      }

      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) useDesignStore.getState().redo()
      else useDesignStore.getState().undo()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/**
 * Chỉ ô nhập CHỮ mới có undo riêng của trình duyệt.
 * Slider và color picker thì không — kéo slider xong bấm Ctrl+Z vẫn phải
 * undo được thiết kế, nếu chặn cả input là hỏng.
 */
function isTextEntry(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true
  if (!(el instanceof HTMLInputElement)) return false
  return !['range', 'color', 'checkbox', 'radio', 'button', 'submit'].includes(el.type)
}
