// Automated tests for the NEDVERSE player: drives the REAL page with real key / mouse / touch events through DevTools (headless Edge, software GL).
// Usage: node scripts/test_play.mjs <outDir>   (dev server must be running on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] || 'reference/play_test'; mkdirSync(OUT, { recursive: true })
const PORT = 9881, W = 800, H = 450
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_set_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const errs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')) }
const KEYS = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], shift: ['ShiftLeft', 16], e: ['KeyE', 69], esc: ['Escape', 27], tab: ['Tab', 9], space: ['Space', 32] }
const key = (type, k) => send('Input.dispatchKeyEvent', { type, key: k === 'shift' ? 'Shift' : k === 'esc' ? 'Escape' : k === 'tab' ? 'Tab' : k === 'space' ? ' ' : k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] })
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
const clickText = (sel, t) => ev(`[...document.querySelectorAll('${sel}')].find(b=>b.textContent.trim()==='${t}')?.click()`)
const LS = 'aimverse:nedverse:settings'
await load('&intro=0&x=-5&z=3&yaw=1.5&cam=1.2'); await ev(`localStorage.removeItem('${LS}')`)
await load('&intro=0&x=-5&z=3&yaw=1.5&cam=1.2'); await sleep(1500)
await tap('esc'); await waitFor(async () => (await ev("!!document.querySelector('.nv-pause')")), 15000)
check('pause menu has graphics, time of day, volume, reduced-motion and FPS settings', (await ev("document.querySelectorAll('.nv-settings .nv-set').length")) === 5)
await clickText('.nv-seg', 'Evening'); await sleep(2500); await tap('esc'); await sleep(2500); await shot('evening')
check('Evening mood is saved', JSON.parse((await ev(`localStorage.getItem('${LS}')`)) || '{}').mood === 'evening')
await tap('esc'); await waitFor(async () => (await ev("!!document.querySelector('.nv-pause')")), 15000)
await ev("(()=>{const i=document.querySelector('#nv-vol');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'30');i.dispatchEvent(new Event('input',{bubbles:true}))})()"); await sleep(500)
check('volume slider is saved (30%)', JSON.parse((await ev(`localStorage.getItem('${LS}')`)) || '{}').volume === 0.3)
await clickText('.nv-seg', 'On'); await sleep(300)   // first "On" = reduced motion
check('reduced motion switches the page into reduced-motion mode', (await ev("document.documentElement.dataset.nvReduce")) === '1')
await clickText('.nv-set:nth-child(5) .nv-seg', 'On'); await sleep(500)
await clickText('.nv-seg', 'Light'); await sleep(300)
check('graphics quality choice is saved', JSON.parse((await ev(`localStorage.getItem('${LS}')`)) || '{}').quality === 'low')
await tap('esc'); await sleep(2500)
check('FPS counter can be shown', /fps/.test(await txt('.nv-fps')), await txt('.nv-fps'))
await load('&intro=0&x=-5&z=3&yaw=1.5&cam=1.2'); await sleep(2000)
const saved = JSON.parse((await ev(`localStorage.getItem('${LS}')`)) || '{}')
check('settings persist after a reload (evening, 30%, light, reduced motion)', saved.mood === 'evening' && saved.volume === 0.3 && saved.quality === 'low' && saved.reducedMotion === true && (await ev("document.documentElement.dataset.nvReduce")) === '1', JSON.stringify(saved))
// keyboard-only: Tab stays inside the open pause dialog
await tap('esc'); await waitFor(async () => (await ev("!!document.querySelector('.nv-pause')")), 15000)
let outside = false; for (let i = 0; i < 20; i++) { await tap('tab'); if (!(await ev("!!document.activeElement.closest('.nv-pause')"))) { outside = true; break } }
check('keyboard focus stays trapped inside the pause dialog (20 Tab presses)', !outside)
check('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '))
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1))
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
edge.kill(); process.exit(0)
