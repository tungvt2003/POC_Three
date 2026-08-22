import { useEffect, useMemo } from 'react'
import { Shape, ShapeGeometry } from 'three'
import type { Point } from '../../lib/polygon'
import { mm2m } from '../../lib/units'
import { floorById } from '../catalog/floors'
import { getFloorTexture } from './floorTexture'

type Props = {
  footprint: Point[]
  materialId: string
}

/**
 * Sàn phòng, dựng từ đa giác mặt bằng.
 *
 * Chỉ để NHÌN. Kéo thả (D10) raycast vào một `THREE.Plane(y=0)` toán học,
 * không raycast vào mesh này — ổn định hơn và không phụ thuộc hình dạng sàn.
 *
 * Cách xoay:
 *   - `ShapeGeometry` nằm trong mặt phẳng XY, ngửa mặt về +Z.
 *   - `rotateX(-90°)` biến (a, b, 0) thành (a, 0, -b) và pháp tuyến +Z thành
 *     +Y (ngửa lên trời).
 *   - Vì shape y đảo dấu thành world z, ta nhét sẵn `-z` vào shape để bù lại.
 */
export function Floor({ footprint, materialId }: Props) {
  const material = useMemo(() => floorById(materialId), [materialId])
  const texture = useMemo(() => getFloorTexture(material), [material])

  const geometry = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(mm2m(footprint[0].x), -mm2m(footprint[0].z))
    for (let i = 1; i < footprint.length; i++) {
      shape.lineTo(mm2m(footprint[i].x), -mm2m(footprint[i].z))
    }
    shape.closePath()

    const geo = new ShapeGeometry(shape)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [footprint])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={texture} roughness={material.roughness} />
    </mesh>
  )
}
