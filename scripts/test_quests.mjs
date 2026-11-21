// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9942, W = 640, H = 360
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_quest_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27], j: ['KeyJ', 74], space: ['Space', 32] }
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
const tap = async (k) => { await down(k); await sleep(120); await up(k) }
const txt = (sel) => ev(`document.querySelector('${sel}')?.textContent || ''`)
const ls = (k, v) => ev(v === undefined ? `localStorage.getItem('${k}')` : `localStorage.setItem('${k}', ${JSON.stringify(v)})`)
const till = (pred, ms = 90000) => waitFor(async () => { const t = await S(); return pred(t) && t }, ms, 400)
const QK = 'aimverse:nedverse:quest:v1'
// ---- 1. fresh start ----
await load('&intro=0&x=45&z=-0.6&yaw=-0.91&cam=2.23'); await ev("localStorage.clear()")
await load('&intro=0&x=45&z=-0.6&yaw=-0.91&cam=2.23'); await sleep(1500)
check('fresh visitor starts at LEVEL 1 · NEW ARRIVAL with 0 XP', /LEVEL 1 · NEW ARRIVAL/.test(await txt('.nv-level')) && /0 XP/.test(await txt('.nv-level')), (await txt('.nv-level')).slice(0, 70))
// ---- 2. entering the campus completes "Arrival" ----
await load('&intro=0&x=26&z=0.5&yaw=-1.5708&cam=1.5708'); await down('w'); await waitFor(async () => /Arrival/.test(await txt('.nv-toasts')), 90000); await up('w'); await shot('quest_toast')
check('crossing the gate completes the Arrival quest (+50 XP toast)', /Quest complete: Arrival/.test(await txt('.nv-toasts')) && /\+50 XP/.test(await txt('.nv-toasts')), (await txt('.nv-toasts')).slice(0, 80))
await sleep(1200)
check('XP is added to the level chip', /5[05] XP/.test(await txt('.nv-level')) || /55 XP/.test(await txt('.nv-level')), (await txt('.nv-level')).slice(0, 70))
// ---- 3. journal (J) ----
await tap('j'); const jr = await waitFor(async () => (await ev("!!document.querySelector('.nv-journal')")), 20000); await shot('quest_journal')
check('J opens the quest journal listing all 12 quests and 7 badges', !!jr && (await ev("document.querySelectorAll('.nv-quests li').length")) === 12 && (await ev("document.querySelectorAll('.nv-badges > div').length")) === 7)
check('journal shows Arrival as done and states exploration-only', (await ev("document.querySelector('.nv-quests li.done b')?.textContent")) === 'Arrival' && /no timers/i.test(await txt('.nv-note')))
await tap('esc'); await waitFor(async () => !(await ev("!!document.querySelector('.nv-journal')")), 10000)
check('Esc closes the journal', !(await ev("!!document.querySelector('.nv-journal')")))
// ---- 4. exhibits feed quests; persistence without toast replay ----
await ls('x', ''); await load('&intro=0&place=cs&x=900&z=4&yaw=3.1416&cam=0'); await down('w'); await till((t) => /^proj:/.test(t.near || '')); await up('w'); await sleep(2500)
for (let k = 0; k < 4 && !(await txt('.nv-stop h3')); k++) { await tap('e'); await waitFor(async () => (await txt('.nv-stop h3')), 12000) }
await tap('esc'); await sleep(1500)
const saved = JSON.parse((await ls(QK)) || '[]')
check('opening a workstation records progress (room + project events saved)', saved.includes('room:cs') && saved.some((e) => e.startsWith('proj:')), saved.join(','))
await load('&intro=0&place=cs&x=900&z=4&yaw=3.1416&cam=0'); await sleep(2500)
check('after a reload progress is kept and no old toasts replay', saved.length >= 2 && !(await txt('.nv-toasts')), (await txt('.nv-level')).slice(0, 60))
// ---- 5. levels ----
await ls(QK, JSON.stringify(['gate', 'car', 'kiosk', 'room:cs', 'room:lib', 'room:hall'])); await load('&intro=0&x=45&z=-0.6&yaw=-0.91&cam=2.23'); await sleep(1500)
check('250 XP reaches LEVEL 3 · CAMPUS EXPLORER', /LEVEL 3 · CAMPUS EXPLORER/.test(await txt('.nv-level')), (await txt('.nv-level')).slice(0, 70))
// ---- 6. reset (two-step) ----
await tap('j'); await waitFor(async () => (await ev("!!document.querySelector('.nv-journal')")), 20000)
await ev("[...document.querySelectorAll('.nv-journal .nv-btn')].find(b=>/Reset/.test(b.textContent)).click()"); await sleep(500)
const confirmShown = await ev("[...document.querySelectorAll('.nv-journal .nv-btn')].some(b=>/Yes, erase/.test(b.textContent))")
await ev("[...document.querySelectorAll('.nv-journal .nv-btn')].find(b=>/Yes, erase/.test(b.textContent)).click()"); await sleep(1500)
check('reset asks for confirmation, then erases all progress', !!confirmShown && /LEVEL 1/.test(await txt('.nv-level')) && /0 XP/.test(await txt('.nv-level')), (await txt('.nv-level')).slice(0, 60))
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
