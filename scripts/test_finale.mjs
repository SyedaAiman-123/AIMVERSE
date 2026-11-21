// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9935, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_fin_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27], j: ['KeyJ', 74], j: ['KeyJ', 74], space: ['Space', 32] }
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

const stateIs = (m) => waitFor(async () => { const t = await S(); return t.mode === m && t }, 120000, 500)

// ---------- 1. walk-up to the car, prompt, enter ----------
const txt = (sel) => ev(`document.querySelector('${sel}')?.textContent || ''`)
const tap = async (k) => { await down(k); await sleep(120); await up(k) }
const QK = 'aimverse:nedverse:quest:v1'
const ev_all = ['gate', 'car', 'room:cs', 'room:lib', 'room:hall', ...'ABCDEFG'.split('').map((z) => 'zone:' + z), ...['about', 'game', 'cyber', 'vr', 'ai', 'motion', 'skills', 'contact'].map((s) => 'stop:stop:' + s).map((s) => s.replace('stop:stop:', 'stop:')),
  ...[6, 2, 3, 2, 2].flatMap((n, gi) => Array.from({ length: n }, (_, pi) => `proj:${gi}:${pi}`)), ...[0, 1, 2, 3, 4, 5].map((i) => 'skill:' + i), ...['edu', 'matric', 'speech', 'projects', 'cega', 'kda', 'engines'].map((f) => 'fact:' + f)]
const KIOSK = '&intro=0&x=-4.0&z=-6.6&cam=1.57&yaw=-0.56'
await load(KIOSK); await ev("localStorage.clear()"); await ev(`localStorage.setItem('${QK}', ${JSON.stringify(JSON.stringify(ev_all))})`)
await load(KIOSK); await sleep(1500)
check('all quests but one done: no finale yet', !(await ev("!!document.querySelector('.nv-finale')")) && /LEVEL/.test(await txt('.nv-level')), (await txt('.nv-level')).slice(0, 60))
await tap('esc'); await tap('esc'); await sleep(6000); const a2 = JSON.parse(await ev("JSON.stringify(window.__nedAudio.debug())"))
check('background music engine starts and schedules bars (headless browsers keep audio suspended, so playback itself is not heard here)', a2.bars >= 1 && a2.state !== 'none', JSON.stringify(a2))
await waitFor(async () => (await S()).near === 'kiosk', 40000); await sleep(2000); await tap('e')
await waitFor(async () => (await txt('.nv-stop h3')), 20000); await tap('esc')
const fin = await waitFor(async () => (await ev("!!document.querySelector('.nv-finale')")), 90000); await shot('finale_1')
check('completing the last quest starts the finale', !!fin && /explored NEDVERSE/.test(await txt('.nv-finale')), (await txt('.nv-finale')).slice(0, 80))
const end = await waitFor(async () => (await ev("!!document.querySelector('.nv-end')")), 60000); await sleep(1500); await shot('finale_end')
check('the finale ends on "MUCH MORE TO COME" with Return and Keep exploring', !!end && /MUCH MORE TO COME/.test(await txt('.nv-end')) && (await ev("document.querySelector('.nv-end a.nv-btn')?.getAttribute('href')")) === '/' && /Return to the AIMVERSE portfolio/.test(await txt('.nv-end a.nv-btn')) && /Keep exploring/.test(await txt('.nv-end')), (await txt('.nv-end')).slice(0, 100))
await ev("[...document.querySelectorAll('.nv-end .nv-btn')].find(b=>/Keep exploring/.test(b.textContent)).click()"); await sleep(1200)
check('Keep exploring closes the finale and returns control', !(await ev("!!document.querySelector('.nv-finale')")))
await load(KIOSK); await sleep(9000)
check('the finale is not repeated after a reload', !(await ev("!!document.querySelector('.nv-finale')")))
await tap('j'); await waitFor(async () => (await ev("!!document.querySelector('.nv-journal')")), 20000)
check('the journal offers "Watch the finale" once everything is complete', /Watch the finale/.test(await txt('.nv-journal')))
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
