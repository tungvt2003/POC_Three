import { useEffect, useState } from 'react'
import { useDesignStore } from '../designer/store/designStore'
import { fromDesignFile, toDesignFile } from '../designer/store/exportDesign'
import { useUiStore } from './uiStore'

/** Đổi khoá khi đổi cấu trúc file, để dữ liệu cũ tự bị bỏ qua. */
const KEY = 'room-designer:doc:v1'

/** ms. Chờ ngừng thao tác rồi mới ghi. Ghi mỗi lần kéo là nghẹt main thread. */
const DEBOUNCE = 800

/**
 * Tự lưu thiết kế vào `localStorage`, khôi phục khi mở lại.
 *
 * VÌ SAO CẦN: chưa có backend, state nằm trong RAM. Không có cái này thì lỡ
 * tay F5 là mất sạch — người dùng thử sẽ nghĩ sản phẩm hỏng chứ không nghĩ
 * là bản POC chưa có lưu trữ.
 *
 * Dùng CHÍNH định dạng của `toDesignFile`/`fromDesignFile` — cùng một đường
 * mã với nút "Xuất JSON", nên lưu và mở lại được kiểm chung một chỗ.
 *
 * Mọi thao tác `localStorage` đều bọc `try` — chế độ ẩn danh của một số trình
 * duyệt ném lỗi khi ghi, và dữ liệu cũ hỏng thì không được làm kẹt ứng dụng.
 */
export function useAutosave(): { restored: boolean } {
  const [restored, setRestored] = useState(false)

  // Khôi phục MỘT lần lúc mở app
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const doc = fromDesignFile(JSON.parse(raw))
        if (doc) {
          useDesignStore.getState().loadDoc(doc)
          // Có thiết kế sẵn thì vào thẳng chế độ sửa. Bắt đi lại wizard từ
          // Bước 1 trong khi phòng đã dựng xong là vô nghĩa.
          useUiStore.getState().finish()
        }
      }
    } catch {
      // Dữ liệu hỏng: bỏ qua, mở phòng trắng
    }
    setRestored(true)
  }, [])

  // Ghi lại mỗi khi thiết kế đổi
  useEffect(() => {
    if (!restored) return

    let timer = 0
    let last = useDesignStore.getState().doc

    const unsubscribe = useDesignStore.subscribe((state) => {
      // So tham chiếu: immer chỉ tạo object mới khi có thay đổi thật
      if (state.doc === last) return
      last = state.doc

      clearTimeout(timer)
      timer = window.setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(toDesignFile(last)))
        } catch {
          // Hết dung lượng hoặc bị chặn: bỏ qua, không làm phiền người dùng
        }
      }, DEBOUNCE)
    })

    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [restored])

  return { restored }
}

/** Xoá bản lưu. Gọi kèm `reset()` của store. */
export function clearAutosave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // kệ
  }
}
