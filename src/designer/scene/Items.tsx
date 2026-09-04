import { Suspense } from 'react'
import { useCanEditItems } from '../../ui/uiStore'
import { useDesignStore } from '../store/designStore'
import { Item } from './Item'

/**
 * `useGLTF` suspend trong lúc tải file, nên phải có `<Suspense>` bao ngoài.
 * Thiếu nó thì lần đầu thêm đồ là cả cây React văng lỗi.
 */
export function Items() {
  return (
    <Suspense fallback={null}>
      <ItemList />
    </Suspense>
  )
}

function ItemList() {
  const items = useDesignStore((s) => s.doc.items)
  const selectedId = useDesignStore((s) => s.selectedId)
  const select = useDesignStore((s) => s.select)

  /*
    Ngoài tab "Nội thất" thì đồ đạc chỉ để NGẮM: không chọn, không kéo, không
    hiện thanh công cụ. Đang chỉnh mặt bằng hay đổi màu sàn mà lỡ tay kéo trúng
    cái ghế thì vừa mất bố cục vừa đẻ ra một bước undo vô nghĩa.
  */
  const editable = useCanEditItems()

  return (
    <group name="items">
      {items.map((it) => (
        <Item
          key={it.id}
          item={it}
          selected={editable && it.id === selectedId}
          interactive={editable}
          onSelect={select}
        />
      ))}
    </group>
  )
}
