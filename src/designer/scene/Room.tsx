import { useDesignStore } from '../store/designStore'
import { useCanEditOpenings, useIsTopDown } from '../../ui/uiStore'
import { Floor } from './Floor'
import { Wall } from './Wall'

/**
 * Phòng = sàn + tường sinh từ đa giác mặt bằng. Không có file model nào ở đây.
 *
 * Số tường thay đổi theo hình: chữ nhật 4, hình L 6, hình U 8.
 *
 * Cửa KHÔNG còn đặt bằng cách bấm lên tường nữa. Bấm một kiểu cửa ở sidebar là
 * nó rơi thẳng vào chỗ trống rộng nhất (`addOpeningAuto`), rồi kéo đi đâu thì
 * kéo. Nhờ vậy bỏ được hẳn cái bóng mờ rê chuột — thứ lúc hiện lúc không tuỳ
 * tia chuột trúng mảnh tường nào.
 */
export function RoomView() {
  const room = useDesignStore((s) => s.doc.room)
  const walls = useDesignStore((s) => s.doc.walls)
  const select = useDesignStore((s) => s.select)
  const selectedId = useDesignStore((s) => s.selectedId)

  const topDown = useIsTopDown()
  // Cửa chỉ chọn/kéo được ở Bước 3 và ở tab "Phòng" của chế độ thiết kế —
  // đang bày nội thất mà kéo trúng cửa thì hỏng việc.
  const canEditOpenings = useCanEditOpenings()

  return (
    <group name="room">
      <Floor footprint={room.footprint} materialId={room.floorMaterialId} />

      {walls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          height={room.height}
          color={room.wallColor}
          // Bước 1–2 nhìn thẳng từ trên xuống, không tường nào chắn tầm nhìn
          // nên tắt hẳn cho khỏi tính mỗi frame.
          fade={!topDown}
          interactive={canEditOpenings}
          selectedOpeningId={selectedId}
          onSelectOpening={select}
        />
      ))}
    </group>
  )
}
