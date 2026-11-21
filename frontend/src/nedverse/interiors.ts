import { FACTS, FLAT, ISLANDS, SKILL_GROUPS } from '../data'
import type { Collider } from './collision'

/* Walk-in rooms for the three portfolio buildings. They are small lazy-loaded scenes placed far from the campus (x = 900, beyond the camera's
   far plane, so the campus is not drawn while you are inside). Each exhibit is one real item from data.ts — nothing is duplicated or invented:
   CS lab = one workstation per project (15), Library = one shelf per real skill category (6), Exhibition hall = one panel per verified fact (7). */

export type Place = 'campus' | 'cs' | 'lib' | 'hall'
export type RoomId = Exclude<Place, 'campus'>
export const OX = 900
export const ROOMS: Record<RoomId, { w: number; d: number; h: number; name: string; short: string }> = {
  cs: { w: 26, d: 20, h: 5, name: 'Computer Science & IT Lab', short: 'CS Lab' },
  lib: { w: 30, d: 22, h: 5.5, name: 'University Library', short: 'Library' },
  hall: { w: 32, d: 24, h: 7, name: 'Auditorium & Exhibition Hall', short: 'Exhibition Hall' },
}
const dz = (r: RoomId) => ROOMS[r].d / 2

/** door on the campus side (stand here, press E) and the spot you reappear at when you leave */
export const DOORS: Record<RoomId, { x: number; z: number; label: string; exit: { x: number; z: number; yaw: number } }> = {
  cs: { x: 0, z: -29.1, label: 'Enter the Computer Science & IT Lab', exit: { x: 0, z: -27.2, yaw: 0 } },
  lib: { x: -48, z: 32.0, label: 'Enter the University Library', exit: { x: -48, z: 30.0, yaw: Math.PI } },
  hall: { x: -52.6, z: -6, label: 'Enter the Exhibition Hall', exit: { x: -51.0, z: -6, yaw: Math.PI / 2 } },
}
/** where you appear inside (facing the back wall) */
export const SPAWNS: Record<RoomId, { x: number; z: number; yaw: number }> = {
  cs: { x: OX + 5.6, z: dz('cs') - 3.6, yaw: Math.PI }, lib: { x: OX, z: dz('lib') - 4.4, yaw: Math.PI }, hall: { x: OX, z: dz('hall') - 4.4, yaw: Math.PI },
}
export const roomBounds = (r: RoomId) => ({ x0: OX - ROOMS[r].w / 2 + 0.6, x1: OX + ROOMS[r].w / 2 - 0.6, z0: -ROOMS[r].d / 2 + 0.6, z1: ROOMS[r].d / 2 - 0.3 })

export type Exhibit = { id: string; room: RoomId; x: number; z: number; face: number; label: string; color: string }
const exhibits: Exhibit[] = []

// CS lab: 5 x 3 desks, one per project, in portfolio order (colour = project area)
FLAT.forEach(({ gi, pi }, i) => {
  const isl = ISLANDS[gi], p = isl.projects[pi], col = i % 5, row = Math.floor(i / 5)
  exhibits.push({ id: `proj:${gi}:${pi}`, room: 'cs', x: OX - 9.6 + col * 4.8, z: -6.2 + row * 4.4, face: 0, label: p.name, color: isl.accent })
})
// Library: 3 x 2 shelves, one per real skill category
SKILL_GROUPS.forEach((g, i) => exhibits.push({ id: `skill:${i}`, room: 'lib', x: OX - 8.6 + (i % 3) * 8.6, z: -6 + Math.floor(i / 3) * 5.6, face: 0, label: g.name, color: g.color }))
// Exhibition hall: panels on an arc facing the middle of the room
FACTS.forEach((f, i) => { const a = ((i - (FACTS.length - 1) / 2) / ((FACTS.length - 1) / 2)) * 1.15, R = 9; exhibits.push({ id: `fact:${f.id}`, room: 'hall', x: OX + Math.sin(a) * R, z: 2 - Math.cos(a) * R * 0.78, face: Math.sin(a) * 0.5, label: f.title, color: ['#4DF3C8', '#FFC53D', '#FF3D8B', '#A58BFF', '#6BB8FF', '#B8FF3D', '#FFC53D'][i % 7] }) })
export const EXHIBITS = exhibits
export const exhibitsIn = (r: RoomId) => exhibits.filter((e) => e.room === r)

export type Interactable = { id: string; label: string; x: number; z: number; radius: number; carRadius: number; place: Place }
/** prompts for the interior: one per exhibit (stand just in front of it) + the exit door */
export const INTERIOR_INTERACTABLES: Interactable[] = [
  ...exhibits.map((e) => ({ id: e.id, label: e.label, x: e.x, z: e.z + (e.room === 'hall' ? 1.5 : 1.35), radius: 1.5, carRadius: 0, place: e.room as Place })),
  ...(Object.keys(ROOMS) as RoomId[]).map((r) => ({ id: `exit:${r}`, label: 'Leave — back to the campus', x: OX, z: dz(r) - 0.8, radius: 2.4, carRadius: 0, place: r as Place })),
]
export const DOOR_INTERACTABLES: Interactable[] = (Object.keys(DOORS) as RoomId[]).map((r) => ({ id: `door:${r}`, label: DOORS[r].label, x: DOORS[r].x, z: DOORS[r].z, radius: 2.0, carRadius: 0, place: 'campus' as Place }))

const B = (x: number, z: number, hw: number, hd: number, rot = 0): Collider => ({ kind: 'b', x, z, hw, hd, rot })
const C = (x: number, z: number, r: number): Collider => ({ kind: 'c', x, z, r })

/** colliders of a room: walls (the door gap is sealed behind the exit trigger), furniture and exhibits */
export function buildInteriorColliders(r: RoomId): Collider[] {
  const { w, d } = ROOMS[r], out: Collider[] = []
  out.push(B(OX, -d / 2 - 0.3, w / 2 + 1, 0.3), B(OX - w / 2 - 0.3, 0, 0.3, d / 2 + 1), B(OX + w / 2 + 0.3, 0, 0.3, d / 2 + 1))
  out.push(B(OX - (w / 2 + 2.6) / 2, d / 2 + 0.3, (w / 2 - 0.6) / 2, 0.3), B(OX + (w / 2 + 2.6) / 2, d / 2 + 0.3, (w / 2 - 0.6) / 2, 0.3), B(OX, d / 2 + 1.4, 2.2, 0.3))
  if (r === 'cs') for (const e of exhibitsIn('cs')) out.push(B(e.x, e.z, 1.25, 0.55))
  if (r === 'lib') { for (const e of exhibitsIn('lib')) out.push(B(e.x, e.z, 2.4, 0.5)); out.push(B(OX - 9, 5.2, 1.4, 0.9), B(OX + 9, 5.2, 1.4, 0.9)) }
  if (r === 'hall') { for (const e of exhibitsIn('hall')) out.push(C(e.x, e.z, 1.35)); out.push(B(OX, -d / 2 + 1.6, 6, 1.6)) /* stage */ }
  return out
}
