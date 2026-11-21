import * as THREE from 'three'

/* Procedural canvas textures for the NEDVERSE campus. No downloads: every surface is drawn in-engine, then cached.
   Palette comes from the owner's reference photos: cream plaster, sandy gate piers, yellow/black kerbs, dark green-grey window frames. */

const cache = new Map<string, THREE.CanvasTexture>()

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }

function make(key: string, w: number, h: number, repeat: boolean, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const hit = cache.get(key); if (hit) return hit
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  draw(cv.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(cv)
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping }
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t); return t
}

function speckle(c: CanvasRenderingContext2D, w: number, h: number, n: number, a: number, seed: number, light = false) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) { const v = light ? 255 : 0; c.fillStyle = `rgba(${v},${v},${v},${r() * a})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2) }
}
function blotches(c: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, col: string, a: number) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 90; const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, col.replace('A', String(a * (0.4 + r() * 0.6)))); g.addColorStop(1, col.replace('A', '0')); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
}

/** warm plaster (tileable) */
export const plaster = (base = '#e3d6b4') => make('plaster' + base, 512, 512, true, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h)
  blotches(c, w, h, 26, 3, 'rgba(120,95,50,A)', 0.10); blotches(c, w, h, 18, 9, 'rgba(255,255,255,A)', 0.12)
  speckle(c, w, h, 5000, 0.10, 5); speckle(c, w, h, 2500, 0.08, 6, true)
})

/** one window bay (3.2 m wide x 3.9 m tall) — repeated across a facade */
export const facadeBay = (wall = '#e3d6b4') => make('bay' + wall, 256, 320, true, (c, w, h) => {
  c.fillStyle = wall; c.fillRect(0, 0, w, h)
  blotches(c, w, h, 8, 12, 'rgba(120,95,50,A)', 0.08); speckle(c, w, h, 1400, 0.09, 21)
  // lintel slab + sill (concrete)
  c.fillStyle = '#cfc6ae'; c.fillRect(34, 60, 188, 12); c.fillRect(30, 238, 196, 12)
  // frame
  c.fillStyle = '#2c3a33'; c.fillRect(46, 72, 164, 166)
  // glass: sky reflection gradient
  const g = c.createLinearGradient(0, 78, 0, 232); g.addColorStop(0, '#8fb3c7'); g.addColorStop(0.45, '#3f5a63'); g.addColorStop(1, '#1a2427')
  c.fillStyle = g; c.fillRect(54, 80, 68, 150); c.fillRect(134, 80, 68, 150)
  c.fillStyle = 'rgba(255,255,255,.10)'; c.beginPath(); c.moveTo(54, 80); c.lineTo(100, 80); c.lineTo(54, 150); c.fill()
  c.fillStyle = '#2c3a33'; c.fillRect(54, 140, 148, 5) // transom
  // weathering streaks under the sill
  const s = c.createLinearGradient(0, 250, 0, 320); s.addColorStop(0, 'rgba(70,55,30,.22)'); s.addColorStop(1, 'rgba(70,55,30,0)'); c.fillStyle = s; c.fillRect(46, 250, 164, 70)
})

export const asphalt = () => make('asphalt', 512, 512, true, (c, w, h) => {
  c.fillStyle = '#3a3b40'; c.fillRect(0, 0, w, h); blotches(c, w, h, 30, 14, 'rgba(0,0,0,A)', 0.18); blotches(c, w, h, 22, 15, 'rgba(255,255,255,A)', 0.06)
  speckle(c, w, h, 9000, 0.22, 16); speckle(c, w, h, 3000, 0.15, 17, true)
})

export const paving = () => make('paving', 512, 512, true, (c, w, h) => {
  const r = rng(31); c.fillStyle = '#b9b3a4'; c.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const v = 168 + r() * 26; c.fillStyle = `rgb(${v},${v - 4},${v - 14})`; c.fillRect(x + 2, y + 2, 60, 60) }
  speckle(c, w, h, 4000, 0.12, 33); blotches(c, w, h, 14, 35, 'rgba(60,50,30,A)', 0.10)
})

export const grass = () => make('grass', 512, 512, true, (c, w, h) => {
  c.fillStyle = '#668a40'; c.fillRect(0, 0, w, h); blotches(c, w, h, 40, 41, 'rgba(30,70,20,A)', 0.30); blotches(c, w, h, 28, 42, 'rgba(150,170,60,A)', 0.22)
  const r = rng(43); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${40 + r() * 60},${90 + r() * 80},${20 + r() * 40},.5)`; c.fillRect(r() * w, r() * h, 1, 2 + r() * 3) }
})

/** open metal sliding-gate leaf: transparent with vertical bars and a frame */
export const gateBars = () => make('gateBars', 256, 256, false, (c, w, h) => {
  c.clearRect(0, 0, w, h); c.fillStyle = '#1b1c20'
  c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h); c.fillRect(0, h / 2 - 6, w, 12)
  for (let x = 30; x < w - 14; x += 22) c.fillRect(x, 0, 8, h)
})

/** large-scale dry/dark patches blended over the lawn so grass is never one flat colour */
export const grassPatch = () => make('grassPatch', 512, 512, true, (c, w, h) => {
  c.clearRect(0, 0, w, h); blotches(c, w, h, 30, 61, 'rgba(176,160,84,A)', 0.55); blotches(c, w, h, 26, 62, 'rgba(36,70,28,A)', 0.5); blotches(c, w, h, 10, 63, 'rgba(120,96,60,A)', 0.35)
})

/** yellow / black striped kerb */
export const kerb = () => make('kerb', 256, 32, true, (c, w, h) => {
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#1b1b1b' : '#e9b800'; c.fillRect(i * 32, 0, 32, h) }
  speckle(c, w, h, 300, 0.2, 51)
})

export function textTex(key: string, text: string | string[], w: number, h: number, o: { bg?: string; fg?: string; font?: string; border?: string; size?: number; lineGap?: number; align?: CanvasTextAlign } = {}) {
  return make(key, w, h, false, (c) => {
    c.fillStyle = o.bg ?? '#1a5fb4'; c.fillRect(0, 0, w, h)
    if (o.border) { c.strokeStyle = o.border; c.lineWidth = Math.max(4, h * 0.04); c.strokeRect(c.lineWidth, c.lineWidth, w - c.lineWidth * 2, h - c.lineWidth * 2) }
    c.fillStyle = o.fg ?? '#fff'; c.textBaseline = 'middle'; c.textAlign = o.align ?? 'center'
    const lines = Array.isArray(text) ? text : [text]; const size = o.size ?? Math.min(h * 0.6 / lines.length, w / (Math.max(...lines.map((l) => l.length)) * 0.62))
    c.font = `${o.font ?? '700'} ${size}px "Segoe UI", Arial, sans-serif`
    lines.forEach((l, i) => c.fillText(l, o.align === 'left' ? 24 : w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * (o.lineGap ?? 1.2)))
  })
}

let logo: THREE.Texture | null = null
/** The NED emblem supplied by the project owner (used with her permission, with the "unofficial" disclaimer shown in-world). */
export function logoTexture() {
  if (!logo) { logo = new THREE.TextureLoader().load('/nedverse/ned-logo.png'); logo.colorSpace = THREE.SRGBColorSpace; logo.anisotropy = 8 }
  return logo
}

export { rng }
