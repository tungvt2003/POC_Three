import { Html, Line } from '@react-three/drei'
import { fmtMm } from '../../lib/units'
import { useUiStore } from '../../ui/uiStore'
import { neighbourGaps } from '../controls/placeOpening'
import { useDesignStore } from '../store/designStore'
import type { Opening, Wall } from '../types'
import { wallLength } from './buildWalls'
import { pointOnWall } from './wallGeometry'

/** mm. Nhấc mọi thứ ra khỏi mặt tường cho khỏi z-fighting. */
const LIFT = 60

/** mm. Một nhịp bấm mũi tên. Kéo thì mượt, bấm thì nhích từng nhịp cho chính xác. */
const NUDGE = 50

type Props = {
  wall: Wall
  opening: Opening
}

/**
 * Bộ điều khiển của cửa ĐANG CHỌN, vẽ thẳng trong cảnh 3D.
 *
 * Gồm: đường đo sang hai bên (tới cửa kề hoặc tới góc tường), hai mũi tên
 * trái/phải để nhích từng nhịp, và nút xoá nổi phía trên.
 *
 * Nhãn số là thẻ DOM thật (`<Html>` của drei) — chữ luôn nét, không phải
 * texture bị mờ khi zoom. Đổi lại là mỗi nhãn một node DOM, nên CHỈ vẽ cho cái
 * đang chọn.
 */
export function OpeningGizmo({ wall, opening }: Props) {
  const removeOpening = useDesignStore((s) => s.removeOpening)
  const moveOpening = useDesignStore((s) => s.moveOpening)
  const endEdit = useDesignStore((s) => s.endEdit)
  const roomHeight = useDesignStore((s) => s.doc.room.height)
  const unit = useUiStore((s) => s.unit)

  const L = wallLength(wall)
  const gaps = neighbourGaps(wall, opening)

  const t0 = opening.t
  const t1 = opening.t + opening.width
  const tMid = (t0 + t1) / 2
  // Đo ở lưng chừng cửa: thấp quá thì đồ đạc che, cao quá thì lệch khỏi tầm mắt.
  const yLine = opening.elevation + opening.height * 0.55
  const yTop = opening.elevation + opening.height

  /*
    Chỉ CỬA SỔ mới nhấc lên hạ xuống. Cửa đi đứng trên sàn, cho kéo lên là ra
    một cái lỗ lơ lửng giữa tường — sai về xây dựng, không phải tính năng.
  */
  const canRaise = opening.kind === 'window'
  const headroom = Math.max(0, roomHeight - yTop)

  function nudge(delta: number) {
    moveOpening(opening.id, wall.id, opening.t + delta)
    endEdit()
  }

  function raise(delta: number) {
    moveOpening(opening.id, wall.id, opening.t, opening.elevation + delta)
    endEdit()
  }

  /*
    BỐ TRÍ, giải thích một lần cho khỏi lệch nhau về sau. Ba thứ tranh nhau chỗ
    quanh cái lỗ: đường đo, mũi tên, nút xoá. Chia trục ra cho khỏi chồng:

      - trục ĐỨNG bên cạnh lỗ (`tDim`)  -> hai đường đo lên trần / xuống sàn
      - trục ĐỨNG giữa lỗ (`tMid`)      -> hai mũi tên lên/xuống
      - hai bên ngang, ngang tầm `yLine` -> hai mũi tên trái/phải + đường đo ngang

    Trước đây mũi tên đứng nằm ngay sát mép nên đè lên khung cửa, còn đường đo
    thì cắt xuyên qua mặt kính. Giờ đường đo dạt hẳn ra ngoài lỗ.
  */
  const DIM_OFFSET = 320
  const tDim =
    t0 - DIM_OFFSET >= 120
      ? t0 - DIM_OFFSET
      : t1 + DIM_OFFSET <= L - 120
        ? t1 + DIM_OFFSET
        : tMid

  /** mm. Mũi tên đứng cách mép lỗ chừng này — sát quá là đè lên khung. */
  const ARROW_GAP = 330

  /*
    Nút xoá nằm TRÊN cửa, cao hơn cả mũi tên. Cửa sát trần thì không còn chỗ,
    lúc đó nhảy xuống dưới — kẹp lại là nút rơi đè lên chính cái cửa, bấm trúng
    cửa chứ không trúng nút.
  */
  // Cửa đi không có mũi tên đứng nên khỏi chừa chỗ cho nó — chừa thừa thì cửa
  // cao 2m là nút bị đẩy xuống sàn dù phía trên vẫn còn chỗ.
  const trashAbove = yTop + (canRaise ? ARROW_GAP + 330 : 420)
  const trashY =
    trashAbove <= roomHeight - 120
      ? trashAbove
      : Math.max(opening.elevation - ARROW_GAP - 330, 220)

  return (
    <group name={`gizmo-${opening.id}`}>
      {/* Viền vàng ôm quanh lỗ — báo "đang chọn" mà không phải bôi vàng cả cánh cửa */}
      <Line
        points={[
          pointOnWall(wall, t0, opening.elevation, LIFT),
          pointOnWall(wall, t1, opening.elevation, LIFT),
          pointOnWall(wall, t1, yTop, LIFT),
          pointOnWall(wall, t0, yTop, LIFT),
          // Khép vòng bằng cách lặp lại điểm đầu — `Line` của drei không có `closed`
          pointOnWall(wall, t0, opening.elevation, LIFT),
        ]}
        color="#f0b429"
        lineWidth={3}
      />

      <GapMeasure
        wall={wall}
        from={t0 - gaps.before}
        to={t0}
        y={yLine}
        label={fmtMm(gaps.before, unit)}
      />
      <GapMeasure
        wall={wall}
        from={t1}
        to={t1 + gaps.after}
        y={yLine}
        label={fmtMm(gaps.after, unit)}
      />

      <Arrow
        wall={wall}
        t={Math.max(t0 - 190, 60)}
        y={yLine}
        dir={-1}
        disabled={gaps.before < NUDGE}
        onClick={() => nudge(-NUDGE)}
      />
      <Arrow
        wall={wall}
        t={Math.min(t1 + 190, L - 60)}
        y={yLine}
        dir={1}
        disabled={gaps.after < NUDGE}
        onClick={() => nudge(NUDGE)}
      />

      {canRaise && (
        <>
          {/* Cao độ mép dưới: số này khớp với ô "Cách sàn" bên sidebar */}
          <HeightMeasure
            wall={wall}
            t={tDim}
            from={0}
            to={opening.elevation}
            label={fmtMm(opening.elevation, unit)}
          />
          {/* Hở lên trần. Thiếu nó thì không biết còn nhấc cửa sổ lên được bao nhiêu */}
          <HeightMeasure
            wall={wall}
            t={tDim}
            from={yTop}
            to={roomHeight}
            label={fmtMm(headroom, unit)}
          />
          {/*
            Không còn chỗ đặt mũi tên NGOÀI lỗ thì bỏ luôn, đừng kẹp nó vào sát
            mép: nó sẽ nằm đè lên mặt kính và nuốt mất cú bấm để kéo cửa sổ.
            Lúc đó cũng chẳng nhấc thêm được nữa nên không mất gì.
          */}
          {yTop + ARROW_GAP <= roomHeight - 90 && (
            <Arrow
              wall={wall}
              t={tMid}
              y={yTop + ARROW_GAP}
              axis="up"
              dir={1}
              disabled={headroom < NUDGE}
              onClick={() => raise(NUDGE)}
            />
          )}
          {opening.elevation - ARROW_GAP >= 90 && (
            <Arrow
              wall={wall}
              t={tMid}
              y={opening.elevation - ARROW_GAP}
              axis="up"
              dir={-1}
              disabled={opening.elevation < NUDGE}
              onClick={() => raise(-NUDGE)}
            />
          )}
        </>
      )}

      {/* Nút xoá nổi ngay trên cửa — khỏi phải rê chuột về tận sidebar */}
      <Html position={pointOnWall(wall, tMid, trashY, LIFT)} center>
        <button
          className="scene-trash"
          title="Xoá (phím Delete)"
          // Pointer Events, không phải onClick — thống nhất với phần còn lại
          // và không bị OrbitControls nuốt mất cú bấm.
          onPointerDown={(e) => {
            e.stopPropagation()
            removeOpening(opening.id)
          }}
        >
          🗑
        </button>
      </Html>
    </group>
  )
}

/** Một đoạn đo dọc tường kèm nhãn số ở giữa. */
function GapMeasure({
  wall,
  from,
  to,
  y,
  label,
}: {
  wall: Wall
  from: number
  to: number
  y: number
  label: string
}) {
  // Khe hẹp quá thì nhãn đè lên cửa, thà không vẽ
  if (to - from < 60) return null

  return (
    <group>
      <Line
        points={[pointOnWall(wall, from, y, LIFT), pointOnWall(wall, to, y, LIFT)]}
        color="#1d1d24"
        lineWidth={1.6}
      />
      {/* Hai vạch chặn hai đầu, cho ra dáng đường đo bản vẽ */}
      {[from, to].map((t) => (
        <Line
          key={t}
          points={[pointOnWall(wall, t, y - 90, LIFT), pointOnWall(wall, t, y + 90, LIFT)]}
          color="#1d1d24"
          lineWidth={1.6}
        />
      ))}
      <Html
        position={pointOnWall(wall, (from + to) / 2, y + 150, LIFT)}
        center
        // Nhãn không được chắn chuột — chắn là kéo cửa qua bị đứt tay kéo
        pointerEvents="none"
      >
        <span className="dim-label">{label}</span>
      </Html>
    </group>
  )
}

/** Đường đo ĐỨNG từ sàn lên mép dưới cửa sổ, kèm nhãn. */
function HeightMeasure({
  wall,
  t,
  from,
  to,
  label,
}: {
  wall: Wall
  t: number
  from: number
  to: number
  label: string
}) {
  if (to - from < 120) return null

  return (
    <group>
      <Line
        points={[pointOnWall(wall, t, from, LIFT), pointOnWall(wall, t, to, LIFT)]}
        color="#1d1d24"
        lineWidth={1.6}
      />
      {/* Vạch chặn hai đầu nằm NGANG, vì đường đo lần này chạy dọc */}
      {[from, to].map((y) => (
        <Line
          key={y}
          points={[pointOnWall(wall, t - 90, y, LIFT), pointOnWall(wall, t + 90, y, LIFT)]}
          color="#1d1d24"
          lineWidth={1.6}
        />
      ))}
      <Html position={pointOnWall(wall, t, (from + to) / 2, LIFT)} center pointerEvents="none">
        <span className="dim-label">{label}</span>
      </Html>
    </group>
  )
}

/**
 * Mũi tên nhích cửa. Hình nón, trỏ dọc tường (`axis="along"`) hoặc lên/xuống
 * (`axis="up"`).
 *
 * `coneGeometry` mặc định trỏ theo +Y — đúng luôn cho mũi tên đứng. Mũi tên
 * ngang thì xoay -90° quanh Z để đưa về +X, rồi quay cả group quanh Y cho +X
 * trùng chiều tường.
 */
function Arrow({
  wall,
  t,
  y,
  dir,
  axis = 'along',
  disabled,
  onClick,
}: {
  wall: Wall
  t: number
  y: number
  dir: 1 | -1
  axis?: 'along' | 'up'
  disabled: boolean
  onClick: () => void
}) {
  const len = wallLength(wall)
  // Ry(θ) đưa +X (1,0,0) thành (cosθ, 0, −sinθ). Muốn nó trùng hướng tường
  // (dx, dz) thì cosθ = dx, sinθ = −dz.
  const along = Math.atan2(-(wall.end.z - wall.start.z), wall.end.x - wall.start.x)

  const spin: [number, number, number] =
    axis === 'up'
      ? [0, 0, dir === 1 ? 0 : Math.PI]
      : [0, 0, dir === 1 ? -Math.PI / 2 : Math.PI / 2]

  return (
    <group
      position={pointOnWall(wall, t, y, LIFT + 40)}
      // Quay để trục X cục bộ chạy dọc tường theo chiều `dir`
      rotation={[0, along, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      onPointerOver={() => (document.body.style.cursor = disabled ? 'not-allowed' : 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
      visible={len > 800}
    >
      <mesh rotation={spin}>
        <coneGeometry args={[0.055, 0.14, 16]} />
        <meshBasicMaterial color={disabled ? '#9a9aa4' : '#f0b429'} transparent opacity={1} />
      </mesh>
    </group>
  )
}
