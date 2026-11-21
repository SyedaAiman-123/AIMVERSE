// Captures the screenshots used by the promo video from the running dev site, using headless Edge over the DevTools protocol.
// Usage: node scripts/capture_site.mjs <outDir>   (dev server must be on http://localhost:5173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true })
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9333, W = 1200, H = 900
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + process.env.TEMP + '/aim_capture_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets = null
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value }
const shot = async (name, clip) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('saved', name) }
const key = (type, k, code) => send('Input.dispatchKeyEvent', { type, key: k, code: code || k, windowsVirtualKeyCode: k === 'Enter' ? 13 : k === 'Escape' ? 27 : 0 })
await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5173/' })
for (let i = 0; i < 120 && !(await ev("!!document.querySelector('button.hold')")); i++) await sleep(500)
await sleep(2500)
await ev("document.querySelector('button.hold').focus()"); await key('keyDown', 'Enter'); await key('keyUp', 'Enter')
let entered = false
for (let i = 0; i < 240; i++) { if (await ev("!!document.querySelector('.qbtn')")) { entered = true; break } await sleep(500) }
console.log('entered:', entered); if (!entered) { edge.kill(); process.exit(1) }
await sleep(6000)
const sections = { gateway: 0, about: 1, cyber: 3, skills: 7, journey: 8 }
for (const [name, s] of process.env.ONLY_DIALOGS ? [] : Object.entries(sections)) {
  await ev(`(()=>{ const el=document.querySelector('#s${s}'); if(el) el.scrollIntoView({behavior:'instant'}); else window.scrollTo(0,0); return !!el })()`)
  await sleep(7000); await shot('site_' + name)
}
await ev('window.scrollTo(0,0)'); await sleep(3000)
const rect = async (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}})()`)
// chat panel
if (!process.env.QUEST_ONLY) {
await ev("[...document.querySelectorAll('button')].find(b=>/Ask AIM AI/.test(b.textContent)).click()")
for (let i = 0; i < 60 && !(await ev("!!document.querySelector('dialog[open] h2')")); i++) await sleep(500)
await sleep(5000)
let r = await rect('dialog[open]'); console.log('chat rect', JSON.stringify(r)); await shot('site_chat_full'); writeFileSync(`${OUT}/chat_rect.json`, JSON.stringify(r))
await key('keyDown', 'Escape', 'Escape'); await key('keyUp', 'Escape', 'Escape'); await sleep(2000)
console.log('chat closed:', !(await ev("!!document.querySelector('dialog[open]')")))
// contact panel
await ev("document.querySelector('#s9').scrollIntoView({behavior:'instant'})"); await sleep(5000)
await ev("[...document.querySelectorAll('button')].find(b=>/Send a message/.test(b.textContent)).click()")
for (let i = 0; i < 60 && !(await ev("!!document.querySelector('dialog[open] h2')")); i++) await sleep(500)
await sleep(4000)
r = await rect('dialog[open]'); console.log('contact rect', JSON.stringify(r)); await shot('site_contact_full'); writeFileSync(`${OUT}/contact_rect.json`, JSON.stringify(r))
await key('keyDown', 'Escape', 'Escape'); await key('keyUp', 'Escape', 'Escape'); await sleep(2000)
console.log('contact closed:', !(await ev("!!document.querySelector('dialog[open]')")))
}
// quest
await ev("document.querySelector('.qbtn').click()")
for (let i = 0; i < 240 && !(await ev("!!document.querySelector('.qw-top') && !document.querySelector('.qw-loading')")); i++) await sleep(500)
await sleep(30000)
await shot('site_quest_full')
edge.kill(); process.exit(0)
