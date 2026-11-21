// Proves the car can actually drive from the gate to each destination: BFS over a 0.5 m grid, the car being a disc of radius 0.95 (+0.1 margin)
// that must not be pushed by any collider. Usage: bundle collision.ts with esbuild first (see PROJECT_LOG), then node scripts/route_check.mjs
import { buildColliders, resolve } from '../reference/pathtest/col.mjs'
const cols = buildColliders(), R = 1.05, S = 0.5, x0 = -78, z0 = -100, nx = Math.round((56 - x0) / S), nz = Math.round((96 - z0) / S)
const free = new Uint8Array(nx * nz)
for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const p = { x: x0 + i * S, z: z0 + j * S }, q = { ...p }; resolve(q, R, cols); free[i * nz + j] = Math.hypot(q.x - p.x, q.z - p.z) < 1e-3 ? 1 : 0 }
const cell = (x, z) => [Math.round((x - x0) / S), Math.round((z - z0) / S)]
function reach(sx, sz) { const [a, b] = cell(sx, sz); const seen = new Uint8Array(nx * nz), q = [[a, b]]; seen[a * nz + b] = 1; for (let k = 0; k < q.length; k++) { const [i, j] = q[k]; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = i + di, v = j + dj; if (u < 0 || v < 0 || u >= nx || v >= nz || seen[u * nz + v] || !free[u * nz + v]) continue; seen[u * nz + v] = 1; q.push([u, v]) } } return seen }
const seen = reach(30, 0)   // just inside the gate corridor, on the entrance road
const dest = { 'gate (22,0)': [22, 0], 'avenue east end (15,21)': [15, 21], 'game stop road (-22,19)': [-22, 19], 'VR stop road (-46,19)': [-46, 19], 'motion stop road (-70,19)': [-70, 19], 'turnaround (-70,21)': [-70, 21], 'skills stop road (-62,24)': [-62, 24], 'north turnaround (16.4,-24)': [16.4, -24], 'north link (17.3,-20)': [17.3, -20], 'contact stop road (30,-6)': [30, -6], 'common area path (-26,30)': [-26, 30], 'plaza east (12,-2)': [12, -2] }
let ok = true
for (const [n, [x, z]] of Object.entries(dest)) { const [i, j] = cell(x, z); const r = free[i * nz + j] && seen[i * nz + j]; if (!r) ok = false; console.log((r ? 'REACHABLE ' : 'BLOCKED   ') + n + (free[i * nz + j] ? '' : '  (cell itself is blocked)')) }
console.log(ok ? 'all routes drivable' : 'SOME ROUTES BLOCKED')
