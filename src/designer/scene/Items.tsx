import { Suspense } from 'react'
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

  return (
    <group name="items">
      {items.map((it) => (
        <Item key={it.id} item={it} selected={it.id === selectedId} onSelect={select} />
      ))}
    </group>
  )
}
