// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9383, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_enter_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27], enter: ['Enter', 13], space: ['Space', 32] }
const key = (type, k) => send('Input.dispatchKeyEvent', { type, key: k === 'shift' ? 'Shift' : k === 'esc' ? 'Escape' : k === 'space' ? ' ' : k === 'enter' ? 'Enter' : k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] })
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
const txt = (sel) => ev(`document.querySelector('${sel}')?.textContent || ''`)
let s = await load('', 240000)   // default start (with the cinematic intro)
check('cinematic intro plays first (story + skip button)', !!(await ev("!!document.querySelector('.nv-story .nv-skip')")), (await txt('.nv-slide')).slice(0, 60)); await shot('intro_title')
const sb = await S(); await down('w'); await sleep(1200); await up('w'); const sa = await S()
check('player input is locked during the intro', Math.hypot(sa.x - sb.x, sa.z - sb.z) < 0.05)
const yr = await txt('.nv-slide'); await shot('intro_slide')
check('story slides show the journey (real years / projects)', /(2023|2024|2025|2026|NEDVERSE|Explore)/.test(yr), yr.slice(0, 100))
await tap('enter'); const gone = await waitFor(async () => !(await ev("!!document.querySelector('.nv-story')")), 15000)
check('Enter skips the intro', !!gone)
s = await load('&intro=0', 240000)   // OUTSIDE the university
check('starts outside the university (east of the boundary wall) on foot', s.mode === 'foot' && s.x > 40, `x=${s.x.toFixed(1)} z=${s.z.toFixed(1)}`); await shot('outside_start')
check('no tour stops are shown yet; objective says walk to the car', /Walk to the car/.test(await txt('.nv-obj')) && /ARRIVAL/.test(await txt('.nv-obj')), (await txt('.nv-obj')).slice(0, 80))
check('sound button present (M mutes)', !!(await ev("!!document.querySelector('.nv-mute')")))
await down('w'); const near = await waitFor(async () => { const t = await S(); return t.near === 'car' && t }, 60000); await up('w')
check('walks to the car -> "GET IN THE CAR" prompt', !!near, `near=${near && near.near}`)
await tap('e'); const driving = await waitFor(async () => { const t = await S(); return t.mode === 'driving' && t }, 120000)
check('gets in the car (first-person, then chase) and is driving', !!driving)
await down('w')
const inGate = await waitFor(async () => { const t = await S(); return t.carX < 30 && t }, 120000); const pre = await S()
check('drives west through the gate opening without hitting the piers', !!inGate && Math.abs(pre.carZ) < 7, `car=(${pre.carX.toFixed(1)},${pre.carZ.toFixed(1)})`)
const entered = await waitFor(async () => /CAMPUS TOUR/.test(await txt('.nv-obj')) && (await S()), 120000); await shot('entered')
const gx = await S()
check('after entering the campus the tour stops unlock', !!entered && gx.carX < 24.5, `car x=${gx.carX.toFixed(1)}`)
check('welcome toast announces the unlocked stops', /unlocked|open/.test(await txt('.nv-toast')) || /tour stops/.test(await txt('.nv-toast')), (await txt('.nv-toast')).slice(0, 80))
await up('w'); await down('space'); await sleep(2500); await up('space')
s = await load('&intro=0&x=40&z=0&yaw=-1.5708&cam=1.5708'); await sleep(2500); await shot('gate_view')
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
