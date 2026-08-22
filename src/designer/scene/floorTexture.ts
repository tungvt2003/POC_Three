import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { mm2m } from '../../lib/units'
import type { FloorMaterial } from '../catalog/floors'

/**
 * Sinh texture sàn bằng <canvas>. TẠM cho POC, tới D9-7 thay bằng ảnh thật.
 *
 * Ảnh vẽ ra tương ứng ĐÚNG 1 ô `material.tile` ngoài đời (1 tấm ván / 1 viên
 * gạch). Số lần lát do `repeat` quyết định.
 *
 * `ShapeGeometry` của sàn lấy luôn toạ độ đỉnh làm UV. Sàn dựng bằng MÉT nên
 * UV cũng tính bằng mét. Do đó `repeat = 1 / (kích thước ô tính bằng mét)` là
 * ra tỉ lệ lát đúng ngoài đời — và KHÔNG phụ thuộc kích thước hay hình dạng
 * phòng. Đổi phòng sang hình L cũng không phải tính lại gì.
 */

const PX = 512

const cache = new Map<string, Texture>()

export function getFloorTexture(material: FloorMaterial): Texture {
  const cached = cache.get(material.id)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = PX
  canvas.height = PX
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = material.base
  ctx.fillRect(0, 0, PX, PX)

  // Vân gỗ/vân đá: vài nét mảnh chạy dọc chiều dài ô
  ctx.strokeStyle = material.grain
  ctx.globalAlpha = 0.35
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * PX
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(PX * 0.3, y + rand(6), PX * 0.7, y - rand(6), PX, y + rand(4))
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Mạch vẽ ở viền, hai ô cạnh nhau ghép lại thành một đường mạch đều
  ctx.strokeStyle = material.seam
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, PX, PX)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  // Texture màu phải là sRGB, không thì sàn trông bợt màu.
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.repeat.set(1 / mm2m(material.tile.w), 1 / mm2m(material.tile.h))

  cache.set(material.id, texture)
  return texture
}

function rand(n: number): number {
  return (Math.random() - 0.5) * 2 * n
}
