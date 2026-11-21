import { rng } from './textures'
import type { TreeSpot } from './Landscape'
import { STOPS } from './tour'

/* Single source of truth for WHERE things are (local metres: plaza centre = origin, x east, z south).
   The scene draws from these lists and the collision system is built from them, so what you see is what stops you. */

export type BlockSpec = { id: string; pos: [number, number, number]; w: number; d: number; floors: number; floorH?: number; porch?: boolean; roofKit?: boolean; wall?: string }
export const BLOCKS: BlockSpec[] = [
  { id: 'cs', pos: [0, 0, -40], w: 42, d: 18, floors: 3, porch: true },
  { id: 'academic', pos: [-46, 0, -34], w: 30, d: 16, floors: 3 },
  { id: 'admissions', pos: [14, 0, 32], w: 12, d: 8, floors: 1, floorH: 4.4, roofKit: false },
  { id: 'food', pos: [-12, 0, 32], w: 12, d: 8, floors: 1, floorH: 4.4, roofKit: false },
]
export const CONTEXT_BLOCKS: [number, number, number][] = [[104, -70, 3], [108, -30, 4], [104, 14, 3], [110, 52, 4], [106, 92, 3]]

export const GATE_X = 22
export const KIOSK = { pos: [-5, 0, -5] as [number, number, number], rot: Math.PI / 2 + 0.2 }
export const BOARD = { pos: [-8.5, 0, 7] as [number, number, number], rot: Math.PI / 2 + 0.5 }
export const SIGNPOST = { pos: [-12, 0, 12] as [number, number, number], rot: Math.PI / 2 - 0.35, items: ['CS & IT Dept  ↑', 'Library  ←', 'Auditorium  ←'] }
export const SPAWN = { x: 45, z: -0.6, yaw: -0.91 } // OUTSIDE the university, on University Road, facing the parked car (yaw: facing direction, 0 = +z)
export const CAR_START = { x: 42, z: 4, yaw: -Math.PI / 2 } // parked outside the wall, nose toward the main gate (west); driver door on the north side
export const GATE_TARGET = { x: 22, z: 0 }          // the main gate; the tour stops unlock once the player is through it
export const CAMPUS_ENTRY_X = 24
export const BOUNDS = { x0: -78, x1: 56, z0: -100, z1: 96 }
export const GROUND_PLAZA_R = 15

/** Things the player can interact with (prompt "PRESS E TO INTERACT"). Real panels arrive in later phases. */
export type Interactable = { id: string; label: string; x: number; z: number; radius: number; carRadius: number }
export const INTERACTABLES: Interactable[] = [
  { id: 'kiosk', label: 'Welcome kiosk', x: KIOSK.pos[0], z: KIOSK.pos[2], radius: 2.6, carRadius: 6 },
  { id: 'board', label: 'About NEDVERSE', x: BOARD.pos[0], z: BOARD.pos[2], radius: 2.4, carRadius: 6 },
  { id: 'signpost', label: 'Campus signpost', x: SIGNPOST.pos[0], z: SIGNPOST.pos[2], radius: 2.4, carRadius: 6 },
  ...STOPS.map((st) => ({ id: 'stop:' + st.id, label: st.name, x: st.x, z: st.z, radius: 3.2, carRadius: 9 })),
]

export function buildScatter() {
  const r = rng(2024)
  const inRect = (x: number, z: number, cx: number, cz: number, w: number, d: number, pad: number) => Math.abs(x - cx) < w / 2 + pad && Math.abs(z - cz) < d / 2 + pad
  const blocked = (x: number, z: number) =>
    Math.hypot(x, z) < 18 || inRect(x, z, 0, -40, 42, 18, 6) || inRect(x, z, 0, -24, 6.4, 19, 3) || inRect(x, z, 26, 0, 26, 14, 2) || inRect(x, z, -20, 21, 110, 9, 2.5) ||
    inRect(x, z, 46, 0, 22, 260, 1) || inRect(x, z, 14, 32, 12, 8, 3) || inRect(x, z, -12, 32, 12, 8, 3) || inRect(x, z, -46, -34, 30, 16, 5) || inRect(x, z, 14, -30, 22, 4, 2) || inRect(x, z, 22, 0, 4, 28, 6)
  const trees: TreeSpot[] = []; let guard = 0
  const zones: [number, number, number, number, number][] = [[-76, 33, -96, 13, 46], [-76, 33, 28, 62, 22], [58, 74, -110, 110, 16]]
  const nearStop = (x: number, z: number) => STOPS.some((st) => Math.hypot(st.x - x, st.z - z) < 4.5) || Math.hypot(CAR_START.x - x, CAR_START.z - z) < 6
  for (const [x0, x1, z0, z1, n] of zones) { let c = 0; while (c < n && guard++ < 4000) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if ((blocked(x, z) && x < 56) || nearStop(x, z)) continue; trees.push({ x, z, s: 0.8 + r() * 0.55, rot: r() * 6.28 }); c++ } }
  const palms = ([[26, -15, 1], [26, 15, 1.05], [14, -13, 0.95], [14, 13.5, 1], [-14, -14, 1.1], [-9, 13.5, 0.9]] as number[][]).map(([x, z, s]) => ({ x, z, s }))
  const shrubs: { x: number; z: number; s: number; c: number }[] = []
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; shrubs.push({ x: Math.cos(a) * 4.6, z: Math.sin(a) * 4.6, s: 0.9 + r() * 0.5, c: Math.floor(r() * 6) }) }
  for (let i = 0; i < 16; i++) shrubs.push({ x: -18 + i * 2.4 + r() * 0.6, z: -30.2 + r() * 0.5, s: 0.8 + r() * 0.5, c: i % 3 === 0 ? 0 : 3 + (i % 3) })
  for (let i = 0; i < 9; i++) { shrubs.push({ x: -4.2, z: -17 - i * 2, s: 0.7, c: 3 }); shrubs.push({ x: 4.2, z: -17 - i * 2, s: 0.7, c: 4 }) }
  const lamps: [number, number][] = [[18, -7.6], [30, -7.6], [18, 7.6], [30, 7.6], ...[-60, -42, -24, -6, 12].map((x) => [x, 15.2] as [number, number]), [-4.2, -20], [4.2, -26], [-4.2, -32], [-15, -9], [15, 9]]
  const benches = [...Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + 0.3; return { x: Math.cos(a) * 12.6, z: Math.sin(a) * 12.6, r: -a - Math.PI / 2 + Math.PI } }), { x: -5.5, z: -22, r: Math.PI / 2 }, { x: 5.5, z: -28, r: -Math.PI / 2 }]
  return { trees, palms, shrubs, lamps, benches }
}

/** ground height: paved plaza/paths sit a few centimetres above the lawn */
export function groundY(x: number, z: number) {
  if (Math.hypot(x, z) < GROUND_PLAZA_R) return 0.05
  if (Math.abs(x) < 3.2 && z < -14.5 && z > -33.5) return 0.05
  return 0
}
