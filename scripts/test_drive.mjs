// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9397, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_drive_profile', 'about:blank'], { stdio: 'ignore' })
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
let s = await load('&x=17.2&z=-1.5&yaw=2.5&cam=5.67&car=19,-4.2,1.5708')
check('starts on foot, car parked on the road', s.mode === 'foot' && Math.hypot(s.carX - 19, s.carZ + 4.2) < 0.01, `mode=${s.mode} car=(${s.carX.toFixed(1)},${s.carZ.toFixed(1)})`)
const near = await waitFor(async () => { const t = await S(); return t.near === 'car' && t }, 20000)
check('"GET IN THE CAR" prompt appears next to the car', !!near && !!(await ev("document.querySelector('.nv-prompt')?.textContent.includes('GET IN THE CAR')")), `near=${near && near.near}`); await shot('car_prompt')
const x0 = s.x, z0 = s.z
await tap('e')
const entering = await stateIs('entering'); check('E starts the enter sequence (avatar walks to the driver door)', !!entering)
await sleep(300); const fp = await S(); check('camera switches to first-person (wide FOV, avatar hidden) while getting in', fp.mode === 'entering' && fp.fov > 62, `fov=${fp.fov.toFixed(1)}`); await shot('entering')
const driving = await stateIs('driving'); s = await S()
check('she gets in and the player is now driving', !!driving, `mode=${s.mode}`)
await shot('driving_start')

// ---------- 2. driving physics ----------
await down('w'); const acc = await waitFor(async () => { const t = await S(); return t.carV > 6 && t }, 60000)
check('W accelerates the car smoothly', !!acc, acc ? `v=${acc.carV.toFixed(1)} m/s` : 'no acceleration')
const top = await waitFor(async () => { const t = await S(); return t.carV > 17 && t }, 90000); s = await S()
check('top speed ~18 m/s (65 km/h, about 7x walking speed)', !!top && s.carV < 18.5, `v=${s.carV.toFixed(2)}`)
await up('w'); s = await load('&drive=1&car=20,21,-1.5708&cam=1.5708'); await down('w'); await waitFor(async () => (await S()).carV > 10, 60000); s = await S()
const yaw0 = s.carYaw; await down('a'); await sleep(1200); await up('a'); s = await S()
check('A steers left (yaw increases) while moving', s.carYaw - yaw0 > 0.15, `yaw ${yaw0.toFixed(2)} -> ${s.carYaw.toFixed(2)}`); await shot('steering')
await up('w'); s = await load('&drive=1&car=20,21,-1.5708&cam=1.5708'); await down('w'); await waitFor(async () => (await S()).carV > 10, 60000); s = await S(); const yd = s.carYaw; await down('d'); await sleep(1200); await up('d'); const s2 = await S(); s.carYaw = yd
check('D steers right (yaw decreases)', s2.carYaw < s.carYaw - 0.15, `yaw ${s.carYaw.toFixed(2)} -> ${s2.carYaw.toFixed(2)}`)
await up('w'); await down('space'); const braked = await waitFor(async () => { const t = await S(); return Math.abs(t.carV) < 0.3 && t }, 60000); await up('space')
check('Space brakes to a stop', !!braked, braked ? `v=${braked.carV.toFixed(2)}` : 'did not stop')

// ---------- 3. car collides with buildings ----------
s = await load('&drive=1&car=-38,-14,3.1416&cam=0')
await down('w'); let prev = 1e9, still = 0
const hit = await waitFor(async () => { const t = await S(); if (t.carZ < -20 && Math.abs(t.carZ - prev) < 0.03) still++; else still = 0; prev = t.carZ; return still >= 4 && t }, 240000, 800)
const w = await S(); await shot('car_wall'); await up('w')
check('the car is stopped by the Academic Block (does not drive through)', !!hit && w.carZ > -24.4 && w.carZ < -22.6, `stopped at z=${w.carZ.toFixed(2)} (expect ~-23.45)`)
await sleep(1000)
const wv = await S(); check('speed drops to ~0 after the impact', Math.abs(wv.carV) < 0.8, `v=${wv.carV.toFixed(2)}`)

// ---------- 4. portfolio stop from the car ----------
s = await load('&drive=1&car=-22,19,3.1416&cam=0')   // road beside the "Game Development" board at (-22,14)
const nstop = await waitFor(async () => { const t = await S(); return t.near === 'stop:game' && t }, 30000)
check('driving past a stop offers PRESS E TO INTERACT with its name', !!nstop && !!(await ev("document.querySelector('.nv-prompt')?.textContent.includes('Game Development')")), `near=${nstop && nstop.near}`)
const cb = await S(); await tap('e')
const card = await waitFor(async () => (await ev("document.querySelector('.nv-stop h3')?.textContent")), 15000)
check('E opens the stop card with real project data', card === 'GAME DEVELOPMENT' && (await ev("document.querySelector('.nv-stop').textContent.includes('Orb Rush')")), `title=${card}`); await shot('stop_card')
const links = await ev("[...document.querySelectorAll('.nv-stop a')].map(a=>a.href).join(' ')")
check('card links are the verified portfolio links', links.includes('orb-rush-omega.vercel.app'), links.slice(0, 120))
await tap('esc'); await waitFor(async () => !(await ev("!!document.querySelector('.nv-stop')")), 10000); const ca = await S()
check('closing the card leaves the car exactly where it was', Math.hypot(ca.carX - cb.carX, ca.carZ - cb.carZ) < 0.05, `Δ=${Math.hypot(ca.carX - cb.carX, ca.carZ - cb.carZ).toFixed(3)} m`)
const obj = await ev("document.querySelector('.nv-obj')?.textContent")
check('objective panel shows tour progress (1/8 visited)', /1\/8/.test(obj || ''), obj)

// ---------- 5. get out ----------
s = await load('&drive=1&car=30,12,0&cam=3.14')   // stationary, nothing nearby
await sleep(1500); s = await S()
const exitNear = await waitFor(async () => { const t = await S(); return t.near === 'exit' && t }, 20000)
check('when stopped, "PRESS E TO GET OUT" is offered', !!exitNear)
await tap('e'); const foot = await stateIs('foot'); s = await S()
check('E gets her out beside the car (back on foot)', !!foot && Math.hypot(s.x - s.carX, s.z - s.carZ) > 1.2 && Math.hypot(s.x - s.carX, s.z - s.carZ) < 2.6, `distance to car ${Math.hypot(s.x - s.carX, s.z - s.carZ).toFixed(2)} m`); await shot('exited')
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
