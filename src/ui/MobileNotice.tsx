import { useEffect, useState } from 'react'

/** px. Hẹp hơn mức này thì sidebar 330px + khung 3D không đủ chỗ. */
const MIN_WIDTH = 900

const DISMISS_KEY = 'room-designer:mobile-notice-dismissed'

/**
 * Màn hình báo trước cho máy nhỏ.
 *
 * VÌ SAO CẦN: `claude.md` loại mobile khỏi phạm vi POC — không cử chỉ chạm,
 * bố cục cố định ngang. Người thử chắc chắn sẽ mở bằng điện thoại, và nếu
 * không báo trước thì ấn tượng đầu tiên rất tệ về một thứ vốn chưa hứa làm.
 *
 * KHÔNG chặn cứng: vẫn cho bấm xem thử. Chặn hẳn thì người ta không xem được
 * hình dáng sản phẩm, mà đó lại là thứ đáng xem nhất.
 */
export function MobileNotice() {
  const [narrow, setNarrow] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_WIDTH - 1}px)`)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!narrow || dismissed) return null

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // kệ
    }
    setDismissed(true)
  }

  return (
    <div className="notice">
      <div className="notice-card">
        <h2>Bản thử nghiệm — nên dùng máy tính</h2>
        <p>
          Đây là bản chạy thử kỹ thuật. Giao diện cho điện thoại và thao tác chạm{' '}
          <b>chưa được làm</b>, nên trên màn hình nhỏ sẽ khó dùng.
        </p>
        <p>Mở lại bằng máy tính để bàn hoặc laptop sẽ đúng như thiết kế.</p>
        <button className="btn btn-primary" onClick={dismiss}>
          Tôi vẫn muốn xem thử
        </button>
      </div>
    </div>
  )
}
