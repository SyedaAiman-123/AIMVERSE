// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9851, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_perf_profile', 'about:blank'], { stdio: 'ignore' })
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
// Scene cost report: draw calls / triangles / geometries / textures for typical views, both quality tiers. (fps here is software GL and meaningless.)
const V = [['gate approach', 'x=45&z=-0.6&yaw=-0.91'], ['plaza', 'x=12&z=3&yaw=1.5&cam=1.2'], ['avenue', 'x=-30&z=19&yaw=1.5&cam=1.5708'], ['garden', 'x=-30&z=11&yaw=3.1416&cam=0'], ['CS lab', 'place=cs'], ['library', 'place=lib'], ['hall', 'place=hall']]
const rows = []
for (const q of ['low', 'high']) for (const [n, qs] of V) {
  await send('Page.navigate', { url: `http://localhost:5173/nedverse.html?play=1&intro=0&q=${q}&${qs}` }); await waitFor(async () => await S(), 180000, 700); await sleep(5000)
  const t = await S(); rows.push({ tier: q, view: n, calls: t.calls, tris: t.tris, geos: t.geos, tex: t.tex }); console.log(q.padEnd(5), n.padEnd(14), 'calls', String(t.calls).padStart(4), 'tris', String(t.tris).padStart(8), 'geos', String(t.geos).padStart(4), 'tex', String(t.tex).padStart(3))
}
writeFileSync(`${OUT}/perf.json`, JSON.stringify(rows, null, 1))
edge.kill(); process.exit(0)
