import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Model thật từ file .gltf/.glb.
 *
 * HAI việc bắt buộc, thiếu là sai:
 *
 * 1. CLONE. `useGLTF` cache theo url, hai cái ghế cùng loại sẽ dùng CHUNG một
 *    object nếu không clone — xoay cái này thì cái kia xoay theo, mà lại chỉ
 *    hiện ra một cái vì một object không thể ở hai chỗ.
 *
 * 2. CHUẨN HOÁ GỐC TOẠ ĐỘ. Mỗi người dựng model đặt gốc một kiểu: có cái ở
 *    tâm khối, có cái ở một góc, có cái lệch hẳn ra ngoài. Đo `Box3` rồi dời
 *    về "tâm đáy" để mọi model đều đứng trên sàn và xoay quanh chính nó.
 *    Không làm bước này là đồ lún xuống sàn hoặc bay lơ lửng.
 */
export function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  const { object, offset } = useMemo(() => {
    const copy = clone(scene)
    copy.traverse((o) => {
      // @ts-expect-error — three không hẹp kiểu Object3D xuống Mesh ở đây
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })

    const box = new Box3().setFromObject(copy)
    const center = box.getCenter(new Vector3())

    if (import.meta.env.DEV) reportSize(url, box.getSize(new Vector3()))

    return {
      object: copy,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    }
  }, [scene, url])

  return <primitive object={object} position={offset} />
}

const reported = new Set<string>()

/**
 * Báo kích thước phủ bì THẬT của model ra console (chỉ DEV, mỗi url một lần).
 *
 * Dùng để chép lại vào `size` trong `products.ts`. Số trong catalog phải khớp
 * model thật, vì snap tường và đường đo lấy từ đó — lệch là đo sai theo.
 */
function reportSize(url: string, size: Vector3): void {
  if (reported.has(url)) return
  reported.add(url)
  const name = url.split('/').pop()
  console.info(
    `model ${name}: w=${Math.round(size.x * 1000)} d=${Math.round(size.z * 1000)} h=${Math.round(size.y * 1000)} mm`,
  )
}
