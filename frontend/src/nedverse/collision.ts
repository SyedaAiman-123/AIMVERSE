import { BLOCKS, BOARD, BOUNDS, GATE_X, KIOSK, SIGNPOST, buildScatter } from './layout'

/* 2-D collision on a flat campus: the player is a circle; obstacles are circles and oriented boxes (OBB). Overlaps are resolved by
   pushing the player out along the contact normal, which makes her SLIDE along walls instead of sticking. */

export type Circle = { kind: 'c'; x: number; z: number; r: number }
export type Box = { kind: 'b'; x: number; z: number; hw: number; hd: number; rot: number } // rot = group rotation.y (three.js convention)
export type Collider = Circle | Box

const C = (x: number, z: number, r: number): Circle => ({ kind: 'c', x, z, r })
const B = (x: number, z: number, hw: number, hd: number, rot = 0): Box => ({ kind: 'b', x, z, hw, hd, rot })

export function buildColliders(): Collider[] {
  const s = buildScatter(), out: Collider[] = []
  for (const b of BLOCKS) {
    out.push(B(b.pos[0], b.pos[2], b.w / 2 + 0.3, b.d / 2 + 0.3))
    if (b.porch) for (const dx of [-4.2, -1.4, 1.4, 4.2]) out.push(C(b.pos[0] + dx, b.pos[2] + b.d / 2 + 4.6, 0.4)) // porch columns (the porch itself is walkable)
  }
  // gate: piers + guard rooms + parked gate leaves (the opening between z = -10.4 and 10.4 is the entrance)
  for (const k of [-1, 1]) { out.push(B(GATE_X, k * 12, 1.8, 1.8)); out.push(B(GATE_X, k * 16.4, 2.4, 2.9)); out.push(B(GATE_X + 1, k * 9.0, 0.2, 1.8)) }
  out.push(B(37, -69.5, 0.4, 55.5), B(37, 69.5, 0.4, 55.5)) // boundary wall along University Road
  out.push(C(0, 0, 5.2))                                      // plaza planter + shrub ring
  out.push(B(KIOSK.pos[0], KIOSK.pos[2], 0.95, 0.5, KIOSK.rot))
  out.push(B(BOARD.pos[0], BOARD.pos[2], 1.25, 0.4, BOARD.rot))
  out.push(C(SIGNPOST.pos[0], SIGNPOST.pos[2], 0.3))
  for (const t of s.trees) out.push(C(t.x, t.z, 0.35 * t.s + 0.2))
  for (const p of s.palms) out.push(C(p.x, p.z, 0.3 * p.s))
  for (const sh of s.shrubs) if (Math.hypot(sh.x, sh.z) > 5.3) out.push(C(sh.x, sh.z, 0.55 * sh.s))
  for (const [x, z] of s.lamps) out.push(C(x, z, 0.18))
  for (const b of s.benches) out.push(B(b.x, b.z, 0.9, 0.32, b.r))
  out.push(B(44, -16, 0.9, 1.9, 0.04), B(47, 22, 0.9, 1.9, Math.PI + 0.02), B(8, 29, 0.9, 1.9, 1.2))
  return out
}

/** Push a circle (x, z, radius) out of every collider; a few passes settle corners. Also clamps to the world bounds. */
export function resolve(p: { x: number; z: number }, radius: number, cols: Collider[]) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false
    for (const c of cols) {
      if (c.kind === 'c') {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + radius
        if (d < min) { const k = d > 1e-6 ? (min - d) / d : 0; if (d > 1e-6) { p.x += dx * k; p.z += dz * k } else p.x += min; moved = true }
      } else {
        const cos = Math.cos(c.rot), sin = Math.sin(c.rot), dx = p.x - c.x, dz = p.z - c.z
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos            // into box space
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz))
        let nx = lx - cx, nz = lz - cz, d = Math.hypot(nx, nz), px: number, pz: number
        if (d < 1e-6) { // centre inside the box: leave through the nearest face
          const ox = c.hw - Math.abs(lx), oz = c.hd - Math.abs(lz)
          if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; px = nx * (ox + radius); pz = 0 } else { nx = 0; nz = Math.sign(lz) || 1; px = 0; pz = nz * (oz + radius) }
        } else if (d < radius) { px = (nx / d) * (radius - d); pz = (nz / d) * (radius - d) } else continue
        p.x += px * cos + pz * sin; p.z += -px * sin + pz * cos            // back to world space
        moved = true
      }
    }
    p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x)); p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z))
    if (!moved) break
  }
}

/** Is the point inside any BOX collider (grown by margin)? Used to keep the camera out of walls. */
export function insideBox(x: number, z: number, margin: number, cols: Collider[]) {
  for (const c of cols) {
    if (c.kind !== 'b') continue
    const cos = Math.cos(c.rot), sin = Math.sin(c.rot), dx = x - c.x, dz = z - c.z
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos
    if (Math.abs(lx) < c.hw + margin && Math.abs(lz) < c.hd + margin) return true
  }
  return false
}

/** Longest safe camera distance along a ray from the pivot (px, pz) in direction (dx, dz) before hitting a wall. */
export function clampCameraDistance(px: number, pz: number, dx: number, dz: number, want: number, cols: Collider[]) {
  for (let t = 0.5; t <= want; t += 0.25) if (insideBox(px + dx * t, pz + dz * t, 0.35, cols)) return Math.max(1.2, t - 0.3)
  return want
}
