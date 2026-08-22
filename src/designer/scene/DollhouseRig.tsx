import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { dollhouseGoal } from '../controls/cameraPresets'
import { useDesignStore } from '../store/designStore'

/** Tốc độ bay tới chỗ mới. 4 ≈ 0.8s — đủ chậm để mắt bám theo. */
const LAMBDA = 4

/** mét. Gần tới nơi thì dừng hẳn, khỏi tính damp mãi mãi. */
const ARRIVED = 0.01

/**
 * Đưa camera về góc "nhà búp bê" bằng một chuyển động MƯỢT.
 *
 * Nhảy phắt sang chỗ mới thì người dùng mất phương hướng — đang nhìn góc này
 * bỗng nhiên ở góc khác, không biết mình vừa xoay hay phòng vừa đổi.
 *
 * Bay xong thì trả quyền cho `OrbitControls`, xoay tiếp bình thường.
 */
export function DollhouseRig() {
  const footprint = useDesignStore((s) => s.doc.room.footprint)
  const height = useDesignStore((s) => s.doc.room.height)

  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as
    | { target: Vector3; update: () => void }
    | null

  const goalPos = useMemo(() => new Vector3(), [])
  const goalTarget = useMemo(() => new Vector3(), [])
  const flying = useRef(true)

  useEffect(() => {
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 50
    const g = dollhouseGoal(footprint, height, fov)
    goalPos.set(...g.position)
    goalTarget.set(...g.target)
    flying.current = true
  }, [footprint, height, camera, goalPos, goalTarget])

  useFrame((_, delta) => {
    if (!flying.current) return

    camera.position.x = MathUtils.damp(camera.position.x, goalPos.x, LAMBDA, delta)
    camera.position.y = MathUtils.damp(camera.position.y, goalPos.y, LAMBDA, delta)
    camera.position.z = MathUtils.damp(camera.position.z, goalPos.z, LAMBDA, delta)

    if (controls) {
      controls.target.x = MathUtils.damp(controls.target.x, goalTarget.x, LAMBDA, delta)
      controls.target.y = MathUtils.damp(controls.target.y, goalTarget.y, LAMBDA, delta)
      controls.target.z = MathUtils.damp(controls.target.z, goalTarget.z, LAMBDA, delta)
      controls.update()
    } else {
      camera.lookAt(goalTarget)
    }

    // Tới nơi thì thôi, trả quyền xoay lại cho người dùng
    if (camera.position.distanceTo(goalPos) < ARRIVED) flying.current = false
  })

  return null
}
