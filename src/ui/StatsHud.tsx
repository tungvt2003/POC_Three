import { useStatsStore } from './statsStore'

/** Ngân sách chốt trong `claude.md` + ngưỡng tự đặt để nhìn cho nhanh. */
const BUDGET = {
  fps: 60,
  fpsWarn: 30,
  drawCalls: 150,
  triangles: 400_000,
}

/**
 * Bảng đo hiệu năng, góc dưới bên phải khung xem.
 *
 * `draw calls` là con số đáng theo dõi nhất: mỗi lần gọi vẽ là một lần CPU
 * ra lệnh cho GPU. Tam giác nhiều mà ít lệnh vẫn mượt; ngược lại thì không.
 */
export function StatsHud() {
  const s = useStatsStore()

  if (!s.visible) {
    return (
      <button className="stats-toggle" onClick={s.toggle} title="Hiện bảng đo">
        FPS
      </button>
    )
  }

  return (
    <div className="stats">
      <button className="stats-close" onClick={s.toggle} title="Ẩn bảng đo">
        ×
      </button>
      <Row label="FPS" value={s.fps} tone={tone(s.fps, BUDGET.fpsWarn, BUDGET.fps, true)} />
      <Row
        label="Draw calls"
        value={s.drawCalls}
        tone={tone(s.drawCalls, BUDGET.drawCalls, BUDGET.drawCalls * 0.6, false)}
      />
      <Row
        label="Tam giác"
        value={s.triangles.toLocaleString('vi-VN')}
        tone={tone(s.triangles, BUDGET.triangles, BUDGET.triangles * 0.6, false)}
      />
      <hr />
      <Row label="Texture" value={s.textures} tone="" />
      <Row label="Geometry" value={s.geometries} tone="" />
      <Row label="Shader" value={s.programs} tone="" />
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="stats-row">
      <span>{label}</span>
      <b className={tone}>{value}</b>
    </div>
  )
}

/**
 * `higherIsBetter` = true cho FPS (càng cao càng tốt), false cho draw call và
 * tam giác (càng thấp càng tốt).
 */
function tone(value: number, bad: number, good: number, higherIsBetter: boolean): string {
  if (value === 0) return ''
  const ok = higherIsBetter ? value >= good : value <= good
  const warn = higherIsBetter ? value >= bad : value <= bad
  if (ok) return 'is-good'
  return warn ? 'is-warn' : 'is-bad'
}
