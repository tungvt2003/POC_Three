let counter = 0

/**
 * ID ngắn, đủ dùng cho POC (state chỉ sống trong memory).
 * Không cần nanoid — thêm dep chỉ để sinh chuỗi là thừa.
 */
export function makeId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
