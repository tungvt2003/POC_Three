import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { mm2m } from '../../lib/units'
import type { FloorMaterial } from '../catalog/floors'

/**
 * Sinh texture sàn bằng <canvas>. TẠM cho POC, có ảnh thật thì thay đúng file này.
 *
 * Ảnh vẽ ra tương ứng ĐÚNG 1 ô `material.tile` ngoài đời (1 tấm ván / 1 ô lặp
 * của hoa văn). Số lần lát do `repeat` quyết định.
 *
 * `ShapeGeometry` của sàn lấy luôn toạ độ đỉnh làm UV. Sàn dựng bằng MÉT nên
 * UV cũng tính bằng mét. Do đó `repeat = 1 / (kích thước ô tính bằng mét)` là
 * ra tỉ lệ lát đúng ngoài đời — KHÔNG phụ thuộc kích thước hay hình dạng phòng.
 *
 * MỌI hàm vẽ phải LIỀN MẠCH KHI LẶP: nét chạm mép phải thì phải quay lại ở
 * mép trái. Không thì lát ra sàn nhìn rõ từng ô vuông.
 */

const PX = 512

const textureCache = new Map<string, Texture>()
const previewCache = new Map<string, string>()

export function getFloorTexture(material: FloorMaterial): Texture {
  const cached = textureCache.get(material.id)
  if (cached) return cached

  const texture = new CanvasTexture(paint(material))
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  // Texture màu phải là sRGB, không thì sàn trông bợt màu.
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.repeat.set(1 / mm2m(material.tile.w), 1 / mm2m(material.tile.h))

  textureCache.set(material.id, texture)
  return texture
}

/**
 * Ảnh nhỏ cho nút chọn trong sidebar, dạng data URL.
 *
 * Dùng CHUNG hàm vẽ với texture thật — nút bấm hiện đúng cái sẽ lát xuống sàn,
 * không phải một ảnh minh hoạ vẽ tay dễ lệch.
 */
export function getFloorPreview(material: FloorMaterial): string {
  const cached = previewCache.get(material.id)
  if (cached) return cached

  const src = paint(material)
  // Ô lặp thu nhỏ rồi lát 2×2 -> nhìn ra được hoa văn thật sự trông thế nào
  const out = document.createElement('canvas')
  out.width = 96
  out.height = 96
  const ctx = out.getContext('2d')!
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) ctx.drawImage(src, i * 48, j * 48, 48, 48)
  }

  const url = out.toDataURL('image/png')
  previewCache.set(material.id, url)
  return url
}

/** Vẽ ĐÚNG một ô lặp của vật liệu ra canvas PX×PX. */
function paint(m: FloorMaterial): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PX
  canvas.height = PX
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = m.base
  ctx.fillRect(0, 0, PX, PX)

  switch (m.pattern) {
    case 'plank':
      paintPlank(ctx, m)
      break
    case 'herringbone':
      paintHerringbone(ctx, m)
      break
    case 'chevron':
      paintChevron(ctx, m)
      break
    case 'tile':
      paintTile(ctx, m)
      break
    case 'checker':
      paintChecker(ctx, m)
      break
    case 'hex':
      paintHex(ctx, m)
      break
    case 'marble':
      paintMarble(ctx, m)
      break
    case 'carpet':
      paintCarpet(ctx, m)
      break
    case 'concrete':
      paintConcrete(ctx, m)
      break
  }

  return canvas
}

/* ---------------- gỗ ---------------- */

/** Số ván trong MỘT ô lặp. `tile` trong catalog là kích thước cả cụm này. */
const PLANK_COLS = 2
const PLANK_ROWS = 4

/**
 * Sàn ván: các thanh so le, mỗi thanh một sắc độ hơi khác.
 *
 * Vẽ CẢ CỤM chứ không phải một thanh. Một thanh thì mọi thanh y hệt nhau, mà
 * mạch dọc lại dày đặc tới mức mipmap xoá sạch — nhìn ra sàn phẳng lì. Vẽ cụm
 * 2×4 thanh thì so le và đổi màu được, ra đúng chất sàn gỗ.
 *
 * Liền mạch khi lặp: hàng lẻ đẩy đi NỬA thanh, và thanh bị cắt ở mép phải có
 * cùng sắc độ với mảnh nối vào nó ở mép trái (cùng chỉ số cột sau khi lấy dư).
 */
function paintPlank(ctx: Ctx, m: FloorMaterial): void {
  const cw = PX / PLANK_COLS
  const ch = PX / PLANK_ROWS

  for (let r = 0; r < PLANK_ROWS; r++) {
    const shift = (r % 2) * (cw / 2)
    for (let c = -1; c < PLANK_COLS; c++) {
      const x = c * cw + shift
      const y = r * ch
      // Sắc độ theo CỘT ĐÃ LẤY DƯ -> mảnh cắt ở hai mép ghép lại vẫn cùng màu
      const key = ((c % PLANK_COLS) + PLANK_COLS) % PLANK_COLS
      ctx.fillStyle = mix(m.base, m.grain, ((key + r * 2) % 5) * 0.09)
      ctx.fillRect(x, y, cw, ch)

      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, cw, ch)
      ctx.clip()
      grainIn(ctx, m.grain, x, y, cw, ch)
      ctx.restore()

      ctx.strokeStyle = m.seam
      ctx.lineWidth = 4
      ctx.strokeRect(x, y, cw, ch)
    }
  }
}

/**
 * Xương cá: thanh ngang và thanh dọc gài vào nhau theo đường chéo.
 *
 * Vẽ thẳng theo trục, không xoay canvas — xoay 45° thì mép ô lặp không khớp
 * nữa. Lát ra sàn nhìn vẫn đúng chất xương cá.
 */
function paintHerringbone(ctx: Ctx, m: FloorMaterial): void {
  // Thanh 2u × u. Mắt lưới sinh bởi a = (3u, u) và b = (u, −u); định thức 4u²
  // đúng bằng diện tích một cặp thanh, và lưới đó lặp lại trên ô vuông 4u × 4u.
  // Nói cách khác: ô lặp = 4 lần bề rộng thanh, chứa 8 thanh.
  const u = PX / 4

  for (let mi = -4; mi <= 4; mi++) {
    for (let ni = -4; ni <= 4; ni++) {
      const px = (3 * mi + ni) * u
      const py = (mi - ni) * u
      // Thanh nằm ngang, rồi thanh dựng đứng khớp vào đầu nó
      plank(ctx, m, px, py, 2 * u, u, (mi + ni * 2) % 5)
      plank(ctx, m, px + 2 * u, py, u, 2 * u, (mi * 2 + ni + 3) % 5)
    }
  }
}

/** Một thanh ván: nền pha sắc độ, vân chạy dọc thanh, viền là mạch. */
function plank(
  ctx: Ctx,
  m: FloorMaterial,
  x: number,
  y: number,
  w: number,
  h: number,
  toneStep: number,
): void {
  ctx.fillStyle = mix(m.base, m.accent ?? m.grain, (((toneStep % 5) + 5) % 5) * 0.11)
  ctx.fillRect(x, y, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  grainIn(ctx, m.grain, x, y, w, h)
  ctx.restore()

  ctx.strokeStyle = m.seam
  ctx.lineWidth = 3
  ctx.strokeRect(x, y, w, h)
}

/** Mũi tên: thanh nghiêng đối xứng qua trục dọc, xếp thành hàng. */
function paintChevron(ctx: Ctx, m: FloorMaterial): void {
  const rows = 4
  const h = PX / rows
  for (let r = 0; r < rows; r++) {
    const y = r * h
    for (let side = 0; side < 2; side++) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(side * (PX / 2), y, PX / 2, h)
      ctx.clip()
      ctx.translate(side * (PX / 2) + PX / 4, y + h / 2)
      ctx.rotate(side === 0 ? -0.5 : 0.5)
      ctx.fillStyle = r % 2 === 0 ? m.base : (m.accent ?? m.grain)
      ctx.fillRect(-PX / 2, -h, PX, h * 2)
      ctx.strokeStyle = m.seam
      ctx.lineWidth = 4
      ctx.strokeRect(-PX / 2, -h, PX, h * 2)
      ctx.restore()
    }
    ctx.strokeStyle = m.seam
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(PX, y)
    ctx.stroke()
  }
}

/* ---------------- gạch ---------------- */

/** Gạch trơn: một viên/ô lặp, mạch ở viền, lấm tấm cho đỡ phẳng lì. */
function paintTile(ctx: Ctx, m: FloorMaterial): void {
  speckle(ctx, m.grain, 900, 1.6, 0.25)
  ctx.strokeStyle = m.seam
  ctx.lineWidth = 8
  ctx.strokeRect(0, 0, PX, PX)
}

/** Caro: ô lặp = 2×2 viên, hai màu xen kẽ. */
function paintChecker(ctx: Ctx, m: FloorMaterial): void {
  const half = PX / 2
  ctx.fillStyle = m.accent ?? m.grain
  ctx.fillRect(half, 0, half, half)
  ctx.fillRect(0, half, half, half)

  speckle(ctx, m.seam, 700, 1.4, 0.12)

  ctx.strokeStyle = m.seam
  ctx.lineWidth = 5
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) ctx.strokeRect(i * half, j * half, half, half)
  }
}

/**
 * Lục giác. Ô lặp chứa đúng 1 chu kỳ lưới tổ ong.
 *
 * Vẽ dư ra ngoài mép rồi để canvas cắt: viên bị cắt ở mép phải được vẽ lại ở
 * mép trái nhờ vòng lặp chạy từ -1, nên lặp không thấy đường nối.
 */
function paintHex(ctx: Ctx, m: FloorMaterial): void {
  const r = PX / 4 // bán kính đường tròn ngoại tiếp
  const stepX = r * Math.sqrt(3)
  const stepY = r * 1.5

  ctx.strokeStyle = m.seam
  ctx.lineWidth = 4

  for (let row = -1; row <= PX / stepY + 1; row++) {
    for (let col = -1; col <= PX / stepX + 1; col++) {
      const cx = col * stepX + (row % 2 === 0 ? 0 : stepX / 2)
      const cy = row * stepY
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k - 30)
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a)
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      // Vài viên đậm hơn cho ra chất gạch nung, không phải nhựa
      ctx.fillStyle = (row + col) % 4 === 0 ? m.grain : m.base
      ctx.fill()
      ctx.stroke()
    }
  }
}

/* ---------------- đá & mềm ---------------- */

/** Vân đá: mấy nhánh gãy khúc chạy ngang, đậm nhạt xen kẽ. */
function paintMarble(ctx: Ctx, m: FloorMaterial): void {
  ctx.lineCap = 'round'
  for (let i = 0; i < 14; i++) {
    const y0 = (PX * i) / 14 + rand(20)
    ctx.strokeStyle = i % 3 === 0 ? (m.accent ?? m.grain) : m.grain
    ctx.globalAlpha = 0.18 + Math.random() * 0.3
    ctx.lineWidth = 1 + Math.random() * 5
    ctx.beginPath()
    ctx.moveTo(-20, y0)
    let y = y0
    for (let x = 0; x <= PX + 20; x += PX / 6) {
      y += rand(38)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.strokeStyle = m.seam
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, PX, PX)
}

/** Bê tông: lấm tấm + vài vệt loang, KHÔNG mạch — sàn đổ liền khối. */
function paintConcrete(ctx: Ctx, m: FloorMaterial): void {
  speckle(ctx, m.grain, 2600, 2.2, 0.3)
  ctx.globalAlpha = 0.1
  ctx.fillStyle = m.seam
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    // Bán kính phải DƯƠNG, không thì `ellipse` ném IndexSizeError.
    ctx.ellipse(
      Math.random() * PX,
      Math.random() * PX,
      30 + Math.random() * 70,
      20 + Math.random() * 50,
      Math.random() * 3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Thảm: lưới sợi ngang dọc mảnh, không mạch. */
function paintCarpet(ctx: Ctx, m: FloorMaterial): void {
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = m.grain
  ctx.lineWidth = 2
  for (let i = 0; i < PX; i += 7) {
    ctx.beginPath()
    ctx.moveTo(i + rand(1.5), 0)
    ctx.lineTo(i + rand(1.5), PX)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i + rand(1.5))
    ctx.lineTo(PX, i + rand(1.5))
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  speckle(ctx, m.seam, 1400, 1.2, 0.16)
}

/* ---------------- tiện ích ---------------- */

type Ctx = CanvasRenderingContext2D

/**
 * Vân gỗ trong lòng MỘT thanh ván. Nét luôn chạy dọc theo CHIỀU DÀI thanh —
 * thanh dựng đứng mà vân nằm ngang thì lộ ngay là vẽ ẩu.
 */
function grainIn(ctx: Ctx, color: string, x: number, y: number, w: number, h: number): void {
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.3
  const along = w >= h
  const across = along ? h : w
  const lines = Math.max(4, Math.round(across / 6))

  for (let i = 0; i < lines; i++) {
    const p = Math.random() * across
    ctx.lineWidth = 0.8 + Math.random() * 1.6
    ctx.beginPath()
    if (along) {
      const gy = y + p
      ctx.moveTo(x, gy)
      ctx.bezierCurveTo(x + w * 0.3, gy + rand(4), x + w * 0.7, gy - rand(4), x + w, gy)
    } else {
      const gx = x + p
      ctx.moveTo(gx, y)
      ctx.bezierCurveTo(gx + rand(4), y + h * 0.3, gx - rand(4), y + h * 0.7, gx, y + h)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** Trộn hai màu hex theo tỉ lệ `f` (0 = a, 1 = b). */
function mix(a: string, b: string, f: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255
    const vb = (pb >> shift) & 255
    return Math.round(va + (vb - va) * f)
  }
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

function speckle(ctx: Ctx, color: string, count: number, size: number, alpha: number): void {
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  for (let i = 0; i < count; i++) {
    ctx.fillRect(Math.random() * PX, Math.random() * PX, size, size)
  }
  ctx.globalAlpha = 1
}

function rand(n: number): number {
  return (Math.random() - 0.5) * 2 * n
}
