import { useEffect, useRef } from 'react'
import { BLOCKS, BOUNDS, COMMON, GARDEN, GATE_X, GROUND_PLAZA_R, ZONES } from './layout'
import { STOPS } from './tour'

/* Mini-map: a top-down schematic drawn from layout.ts (the same data the 3D scene and collisions use), north up.
   Shows roads, buildings, zones A-G, the tour stops (once unlocked) and the player / car with a heading arrow. */

const W = 150, H = 216, PAD = 6
const sx = (x: number) => PAD + ((x - BOUNDS.x0) / (BOUNDS.x1 - BOUNDS.x0)) * (W - PAD * 2)
const sz = (z: number) => PAD + ((z - BOUNDS.z0) / (BOUNDS.z1 - BOUNDS.z0)) * (H - PAD * 2)
const sc = (m: number) => (m / (BOUNDS.x1 - BOUNDS.x0)) * (W - PAD * 2)

function drawBase(c: CanvasRenderingContext2D) {
  c.fillStyle = '#35502f'; c.fillRect(0, 0, W, H)
  c.fillStyle = '#3d3f45'                                                   // roads
  const rect = (x: number, z: number, w: number, d: number) => c.fillRect(sx(x - w / 2), sz(z - d / 2), sc(w), sc(d))
  rect(46, 0, 20, 260); rect(26, 0, 24, 13); rect(-20, 21, 110, 9)
  c.fillStyle = '#b9b3a0'; c.beginPath(); c.arc(sx(0), sz(0), sc(GROUND_PLAZA_R), 0, 7); c.fill()   // plaza
  c.beginPath(); c.arc(sx(GARDEN.x), sz(GARDEN.z), sc(GARDEN.r), 0, 7); c.fill()                  // garden
  c.fillStyle = '#4aa3c8'; c.beginPath(); c.arc(sx(GARDEN.x), sz(GARDEN.z), sc(3), 0, 7); c.fill()  // fountain
  rect(0, -24, 6.4, 19); rect(COMMON.x, COMMON.z, 12, 12)
  for (const b of BLOCKS) {                                                  // buildings (rotated footprints)
    c.save(); c.translate(sx(b.pos[0]), sz(b.pos[2])); c.rotate(-(b.rot ?? 0)); c.fillStyle = '#e3d6b4'; c.fillRect(-sc(b.w) / 2, -sc(b.d) / 2, sc(b.w), sc(b.d)); c.restore()
  }
  c.fillStyle = '#e9b800'; c.fillRect(sx(GATE_X) - 1.5, sz(-11), 3, sc(22))                                // gate
  c.fillStyle = '#0b0d10'; c.font = '700 9px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  for (const z of ZONES) { c.fillStyle = 'rgba(8,9,13,.78)'; c.beginPath(); c.arc(sx(z.x), sz(z.z), 6.2, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillText(z.id, sx(z.x), sz(z.z) + 0.5) }
}

export function Minimap({ entered, visited }: { entered: boolean; visited: ReadonlySet<string> }) {
  const base = useRef<HTMLCanvasElement | null>(null), cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => { const b = document.createElement('canvas'); b.width = W; b.height = H; drawBase(b.getContext('2d')!); base.current = b }, [])
  useEffect(() => {
    const iv = window.setInterval(() => {
      const c = cv.current?.getContext('2d'), n = window.__ned; if (!c || !base.current || !n) return
      c.drawImage(base.current, 0, 0)
      if (entered) for (const s of STOPS) { c.fillStyle = visited.has(s.id) ? '#8a9a94' : s.color; c.beginPath(); c.arc(sx(s.x), sz(s.z), 2.6, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 0.8; c.stroke() }
      const drv = n.mode === 'driving', px = drv ? n.carX : n.x, pz = drv ? n.carZ : n.z, yaw = drv ? n.carYaw : n.yaw
      c.save(); c.translate(sx(px), sz(pz)); c.rotate(Math.PI - yaw)             // north up: yaw 0 faces +z (down the map)
      c.fillStyle = '#ff4a1c'; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -6); c.lineTo(4.2, 4.5); c.lineTo(0, 2.2); c.lineTo(-4.2, 4.5); c.closePath(); c.fill(); c.stroke(); c.restore()
    }, 120)
    return () => window.clearInterval(iv)
  }, [entered, visited])
  return <canvas ref={cv} className="nv-map" width={W} height={H} role="img" aria-label="Campus mini-map, north up. Zones A to G, tour stops and your position." />
}
