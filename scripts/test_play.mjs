// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9492, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_play_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27] }
const key = (type, k) => send('Input.dispatchKeyEvent', { type, key: k === 'shift' ? 'Shift' : k === 'esc' ? 'Escape' : k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] })
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

// ---------- 1. spawn, idle, walk, run, stop ----------
let s = await load('&x=15&z=1.5&yaw=-1.5708&cam=1.5708')
check('player loads and spawns (avatar + clips)', !!s, s ? `x=${s.x.toFixed(2)} z=${s.z.toFixed(2)} fps=${s.fps.toFixed(1)}` : 'no state')
const s0 = s; await sleep(1500); s = await S()
check('idle at rest', s.state === 'Aiman_Idle' && s.speed < 0.05, `state=${s.state}`)
await down('w'); const walking = await waitFor(async () => { const t = await S(); return t.speed > 2.1 && t }, 40000)
check('W starts walking (state Walk, ~2.5 m/s)', !!walking && walking.state === 'Aiman_Walk' && walking.speed < 2.8, walking ? `state=${walking.state} v=${walking.speed.toFixed(2)}` : 'never reached speed')
const fwd = await waitFor(async () => { const t = await S(); return t.x < s0.x - 2.0 && t }, 90000); s = await S(); await shot('walk')
check('moved forward (camera-relative: west)', !!fwd, `x ${s0.x.toFixed(2)} -> ${s.x.toFixed(2)}`)
await down('shift'); const running = await waitFor(async () => { const t = await S(); return t.speed > 5.0 && t }, 40000)
check('Shift runs (state Run, ~5.6 m/s)', !!running && running.state === 'Aiman_Run', running ? `state=${running.state} v=${running.speed.toFixed(2)}` : 'never reached run speed')
await sleep(1500); await shot('run')
await up('shift'); await up('w')
const stopped = await waitFor(async () => { const t = await S(); return t.speed < 0.1 && t }, 20000)
check('releasing keys decelerates smoothly and returns to Idle', !!stopped && stopped.state === 'Aiman_Idle', stopped ? `v=${stopped.speed.toFixed(3)} state=${stopped.state}` : 'did not stop')

// ---------- 2. mouse look ----------
s = await S(); const cy0 = s.camYaw
const cx = Math.round(W / 2), cy = Math.round(H / 2)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
for (let i = 1; i <= 10; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 28, y: cy, button: 'left', buttons: 1 }); await sleep(60) }
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 280, y: cy, button: 'left', clickCount: 1 }); await sleep(800)
s = await S(); check('mouse drag orbits the camera', Math.abs(s.camYaw - cy0) > 1.2, `camYaw ${cy0.toFixed(2)} -> ${s.camYaw.toFixed(2)}`)

// ---------- 3. collisions: north into the Academic Block wall (a clear wall), then slide along it ----------
s = await load('&x=-40&z=-22&cam=0')   // facing north (camYaw 0 -> forward = -z); wall face at z = -34 + 8 + 0.3 = -25.7
await down('w')
let prevZ = 1e9, still = 0
const stalled = await waitFor(async () => { const t = await S(); if (t.z < -23.5 && Math.abs(t.z - prevZ) < 0.02) still++; else still = 0; prevZ = t.z; return still >= 4 && t }, 240000, 800)
const wall = await S(); await shot('wall')
check('walks up to the building and is stopped by it', !!stalled && wall.z > -26.2 && wall.z < -24.8, `stopped at z=${wall.z.toFixed(2)} (wall face at z=-25.7, radius 0.38 -> expect ~-25.32)`)
await sleep(2500); const w2 = await S()
check('does not clip through while pushing forward', w2.z > -26.2 && Math.abs(w2.z - wall.z) < 0.15, `z ${wall.z.toFixed(2)} -> ${w2.z.toFixed(2)}`)
await down('d')
const slid = await waitFor(async () => { const t = await S(); return t.x > wall.x + 1.5 && t }, 200000, 800)
const sl = await S()
check('slides along the wall instead of sticking', !!slid && sl.z > -26.2, `x ${wall.x.toFixed(2)} -> ${sl.x.toFixed(2)}, z=${sl.z.toFixed(2)}`)
await up('d'); await up('w'); await sleep(800)

// ---------- 4. interaction prompt + card, input locked while open, exact position kept ----------
s = await load('&x=-4.0&z=-6.6&cam=1.57&yaw=-0.56')
const prompt = await waitFor(async () => (await ev("!!document.querySelector('.nv-prompt')")), 40000)
s = await S(); check('"PRESS E TO INTERACT" appears near the kiosk', !!prompt && s.near === 'kiosk', `near=${s.near}`); await shot('prompt')
const before = await S(); await down('e'); await up('e')
const card = await waitFor(async () => (await ev("!!document.querySelector('.nv-card')")), 20000)
check('E opens the interaction card', !!card); await shot('card')
await down('w'); await sleep(2500); const locked = await S(); await up('w')
check('movement is ignored while the card is open', Math.hypot(locked.x - before.x, locked.z - before.z) < 0.05, `moved ${Math.hypot(locked.x - before.x, locked.z - before.z).toFixed(3)} m`)
await down('esc'); await up('esc'); await waitFor(async () => !(await ev("!!document.querySelector('.nv-card')")), 10000)
const after = await S()
check('Esc closes the card and the player is exactly where she was', Math.hypot(after.x - before.x, after.z - before.z) < 0.05 && !(await ev("!!document.querySelector('.nv-card')")), `Δ=${Math.hypot(after.x - before.x, after.z - before.z).toFixed(3)} m`)

// ---------- 5. pause ----------
await down('esc'); await up('esc'); const paused = await waitFor(async () => (await ev("!!document.querySelector('.nv-pause')")), 10000)
check('Esc pauses (menu with Resume + exit-to-portfolio link)', !!paused && !!(await ev("!!document.querySelector('.nv-pause a[href=\"/\"]')")))
const pp = await S(); await down('w'); await sleep(2000); const pq = await S(); await up('w')
check('no movement while paused', Math.hypot(pq.x - pp.x, pq.z - pp.z) < 0.05)
await ev("document.querySelector('.nv-pause .nv-btn').click()"); await sleep(800)
check('Resume closes the pause menu', !(await ev("!!document.querySelector('.nv-pause')")))

// ---------- 6. touch: joystick moves, interact button ----------
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
s = await load('&touch=1&intro=0')
const hasStick = await ev("!!document.querySelector('.nv-stick')"); check('touch controls (joystick, Run, E) are shown with ?touch=1', !!hasStick && !!(await ev("!!document.querySelector('.nv-round.act')")))
const box = await ev("(()=>{const r=document.querySelector('.nv-stick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
const t0s = await S()
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y, id: 1 }] })
await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - 55, id: 1 }] })
await waitFor(async () => { const t = await S(); return Math.hypot(t.x - t0s.x, t.z - t0s.z) > 1.0 && t }, 90000); const t1s = await S(); await shot('touch')
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
check('dragging the joystick forward walks the avatar', Math.hypot(t1s.x - t0s.x, t1s.z - t0s.z) > 1.0 && t1s.state !== 'Aiman_Idle', `moved ${Math.hypot(t1s.x - t0s.x, t1s.z - t0s.z).toFixed(2)} m, state=${t1s.state}`)

check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
