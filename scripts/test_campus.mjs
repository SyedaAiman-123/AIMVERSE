// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9598, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_campus_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27], space: ['Space', 32] }
const key = (type, k) => send('Input.dispatchKeyEvent', { type, key: k === 'shift' ? 'Shift' : k === 'esc' ? 'Escape' : k === 'space' ? ' ' : k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] })
const down = (k) => key('keyDown', k), up = (k) => key('keyUp', k)
const S = () => ev('JSON.stringify(window.__ned||null)').then((v) => (v ? JSON.parse(v) : null))
const results = []
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (info ? ' | ' + info : '')) }
const waitFor = async (fn, ms = 60000, step = 300) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step) } return null }
async function load(qs = '', wait = 180000) {
  await send('Page.navigate', { url: `http://localhost:5173/nedverse.html?play=1&q=low${qs}` })
  const ok = await waitFor(async () => (await S()), wait, 700); await sleep(1500); return ok
}
await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

const tap = async (k) => { await down(k); await sleep(120); await up(k) }
const stateIs = (m) => waitFor(async () => { const t = await S(); return t.mode === m && t }, 120000, 500)

// ---------- 1. walk-up to the car, prompt, enter ----------
const stopAt = async (axis, ms = 120000) => { let prev = 1e9, still = 0; return waitFor(async () => { const t = await S(); const v = t[axis]; if (Math.abs(v - prev) < 0.02) still++; else still = 0; prev = v; return still >= 4 && t }, ms, 800) }
// 1. Auditorium: rotated building, face at x = -55 + 0.3 pad -> player stops at about x = -54.32
await load('&intro=0&x=-45&z=-12.2&yaw=-1.5708&cam=1.5708'); await down('w'); const a = await stopAt('x'); await up('w'); await shot('aud_wall')
check('Auditorium (rotated block) stops the player at its wall', !!a && a.x > -54.9 && a.x < -53.8, `x=${a && a.x.toFixed(2)} (expect ~-54.3)`)
// 2. Library: face at z = 34 - 0.3 -> stops at about z = 33.3
await load('&intro=0&x=-36&z=27&yaw=3.1416&cam=3.1416'); await down('w'); const l = await stopAt('z'); await up('w'); await shot('lib_wall')
check('Library stops the player at its wall', !!l && l.z > 32.7 && l.z < 33.9, `z=${l && l.z.toFixed(2)} (expect ~33.3)`)
// 3. Fountain basin (r 3.3) -> from the south along x = -30 she stops at z = -4 + 3.3 + 0.38
await load('&intro=0&x=-30&z=8&yaw=3.1416&cam=0'); await down('w'); const f = await stopAt('z'); await up('w'); await shot('fountain')
check('fountain basin blocks the way (paths stay open)', !!f && f.z > -0.9 && f.z < 0.3, `z=${f && f.z.toFixed(2)} (expect ~-0.32)`)
// 4. porch is walkable between columns: walk into the library porch in the gap between columns (x=-48 +/- 0 -> gap at x = -49.4..-46.6 is blocked by column at -46.6? use x=-45.0 between columns -46.6 and -43.8)
await load('&intro=0&x=-45.2&z=27&yaw=3.1416&cam=3.1416'); await down('w'); const p = await stopAt('z'); await up('w')
check('library porch can be walked into between the columns (reaches the door, z>=33)', !!p && p.z > 32.8, `z=${p && p.z.toFixed(2)}`)
// 5. minimap + zone signs
await load('&intro=0&x=-5&z=3&yaw=1.5&cam=1.2'); await sleep(1500)
check('mini-map is shown', !!(await ev("!!document.querySelector('canvas.nv-map')")))
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
