// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9879, W = 390, H = 844
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_mobile_profile', 'about:blank'], { stdio: 'ignore' })
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
await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true })

const tap = async (k) => { await down(k); await sleep(120); await up(k) }
const stateIs = (m) => waitFor(async () => { const t = await S(); return t.mode === m && t }, 120000, 500)

// ---------- 1. walk-up to the car, prompt, enter ----------
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
const V = [['m_campus', 'x=-5&z=3&yaw=1.5&cam=1.2'], ['m_room', 'place=cs'], ['m_panel', 'panel']]
for (const [n, q] of V.slice(0, 2)) { await send('Page.navigate', { url: `http://localhost:5173/nedverse.html?play=1&intro=0&touch=1&q=low&${q}` }); await waitFor(async () => await S(), 180000, 700); await sleep(4000); await shot(n) }
// journal + pause on a phone
await ev("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyJ',key:'j'}))"); await sleep(1500); await shot('m_journal')
await ev("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}))"); await sleep(1200)
await ev("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}))"); await sleep(1500); await shot('m_pause')
edge.kill(); process.exit(0)
