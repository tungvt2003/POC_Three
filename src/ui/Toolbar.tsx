import { useDesignStore } from '../designer/store/designStore'
import { downloadDesign } from '../designer/store/exportDesign'
import { clearAutosave } from './useAutosave'

export function Toolbar() {
  // Chọn thẳng boolean chứ không chọn cả mảng `past` — component chỉ render
  // lại khi nút thật sự đổi trạng thái bật/tắt.
  const canUndo = useDesignStore((s) => s.past.length > 0)
  const canRedo = useDesignStore((s) => s.future.length > 0)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const reset = useDesignStore((s) => s.reset)

  return (
    <div className="toolbar">
      <button onClick={undo} disabled={!canUndo} title="Ctrl+Z">
        ↶ Hoàn tác
      </button>
      <button onClick={redo} disabled={!canRedo} title="Ctrl+Shift+Z">
        ↷ Làm lại
      </button>
      <button
        onClick={() => downloadDesign(useDesignStore.getState().doc)}
        title="Tải thiết kế về máy dưới dạng JSON"
      >
        ⤓ Xuất JSON
      </button>
      <button
        onClick={() => {
          // Có tự lưu rồi nên phải hỏi — không thì mất việc mà không hoàn tác được
          if (!confirm('Xoá thiết kế hiện tại và làm lại từ đầu?')) return
          clearAutosave()
          reset()
        }}
        title="Về phòng trắng ban đầu"
      >
        ⟲ Làm lại từ đầu
      </button>
    </div>
  )
}
