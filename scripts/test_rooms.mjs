// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9994, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_roomsB_profile', 'about:blank'], { stdio: 'ignore' })
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
const txt = (sel) => ev(`document.querySelector('${sel}')?.textContent || ''`)
const till = (pred, ms = 90000) => waitFor(async () => { const t = await S(); return pred(t) && t }, ms, 400)
// ---- CS lab: door -> inside -> workstation -> project panel -> exit ----
await load('&intro=0&x=0&z=-25.5&yaw=3.1416&cam=0'); await ev("localStorage.removeItem('aimverse:nedverse:viewed')")
await load('&intro=0&x=0&z=-25.5&yaw=3.1416&cam=0')
await down('w'); let t = await till((t) => t.near === 'door:cs'); await up('w')
check('walking onto the CS porch offers "PRESS E TO ENTER" at the door', !!t && /ENTER/.test(await txt('.nv-prompt')), `near=${t && t.near}`)
await tap('e'); t = await till((t) => t.place === 'cs', 60000)
check('E at the door moves her inside the CS lab (fade transition)', !!t && t.x > 880, `place=${t && t.place} x=${t && t.x.toFixed(1)}`)
await sleep(2500); await shot('cs_enter')
check('inside, the objective shows the room and 0/15 viewed', /CS LAB/.test(await txt('.nv-obj')) && /0\/15/.test(await txt('.nv-obj')), (await txt('.nv-obj')).slice(0, 60))
check('mini-map is hidden indoors', !(await ev("!!document.querySelector('canvas.nv-map')")))
await down('w'); t = await till((t) => /^proj:/.test(t.near || '')); const atDesk = await S(); await up('w')
check('walking up to a workstation offers "PRESS E TO VIEW"', !!t && /VIEW/.test(await txt('.nv-prompt')), `near=${t && t.near}`)
await tap('e'); const title = await waitFor(async () => (await txt('.nv-stop h3')), 15000); await shot('cs_panel')
const body = await txt('.nv-stop')
check('workstation panel shows a real project (title, tech chips, description)', !!title && body.length > 400 && (await ev("document.querySelectorAll('.nv-chips span').length")) > 0, `title=${title} len=${body.length}`)
check('panel has a poster image or video', !!(await ev("!!document.querySelector('.nv-hero')")))
const posBefore = await S(); await tap('esc'); await waitFor(async () => !(await ev("!!document.querySelector('.nv-stop')")), 10000); const posAfter = await S()
check('closing the panel returns to exactly the same spot', Math.hypot(posAfter.x - posBefore.x, posAfter.z - posBefore.z) < 0.05)
check('objective counts the viewed exhibit (1/15)', /1\/15/.test(await txt('.nv-obj')), (await txt('.nv-obj')).slice(0, 50))
await down('w'); await sleep(5000); const wall = await S(); await up('w')
check('desks and the back wall block her (stays inside the room)', wall.z > -10 && wall.z < 4.2, `z=${wall.z.toFixed(2)}`)
// ---- exit ----
await load('&intro=0&place=cs&x=900&z=6&yaw=3.1416&cam=0'); await down('s'); t = await till((t) => t.near === 'exit:cs'); await up('s')
check('near the back door: "PRESS E TO LEAVE"', !!t && /LEAVE/.test(await txt('.nv-prompt')), `near=${t && t.near}`)
await tap('e'); t = await till((t) => t.place === 'campus', 60000)
check('E at the exit returns her to the campus porch', !!t && Math.abs(t.x) < 3 && t.z > -30 && t.z < -25, `place=${t && t.place} (${t && t.x.toFixed(1)}, ${t && t.z.toFixed(1)})`)
// ---- library shelf (real skill categories) ----
await load('&intro=0&place=lib&x=900&z=4&yaw=3.1416&cam=0'); await down('w'); t = await till((t) => /^skill:/.test(t.near || '')); await up('w'); await sleep(2500)
await tap('e'); const st = await waitFor(async () => (await txt('.nv-stop h3')), 15000); await shot('lib_panel')
check('library shelf opens a real skill category with the projects that use each skill', !!st && /Unity|Three|C#|Python|Node/.test(await txt('.nv-stop')) && (await txt('.nv-stop')).length > 300, `title=${st}`)
await tap('esc')
// ---- exhibition hall (verified facts) ----
await load('&intro=0&place=hall&x=900&z=4&yaw=3.1416&cam=0'); await down('w'); t = await till((t) => /^fact:/.test(t.near || '')); await up('w'); await sleep(2500)
await tap('e'); const ft = await waitFor(async () => (await txt('.nv-stop h3')), 15000); await shot('hall_panel')
check('exhibition panel opens a verified fact from the CV', !!ft && /Exhibition/.test(await txt('.nv-stop small')), `title=${ft}`)
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
