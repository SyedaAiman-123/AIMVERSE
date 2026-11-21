// Captures NEDVERSE prototype screenshots (headless Edge over DevTools). Usage: node scripts/capture_proto.mjs <outDir> <cam,cam,...> [width] [height]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2], CAMS = (process.argv[3] || '1').split(','), W = +(process.argv[4] || 1600), H = +(process.argv[5] || 900)
mkdirSync(OUT, { recursive: true })
const PORT = 9334
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--user-data-dir=' + process.env.TEMP + '/aim_proto_profile', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(); const logs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || '').slice(0, 900)); else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(d.params.type + ' ' + d.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 900)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
for (const c of CAMS) {
  await send('Page.navigate', { url: `http://localhost:5173/nedverse.html?cam=${c}&still=1` })
  for (let i = 0; i < 160 && !(await ev("!!document.querySelector('canvas')")); i++) await sleep(500)
  await sleep(Number(process.env.WAIT || 25000))
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }); writeFileSync(`${OUT}/cam${c}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('saved cam' + c)
}
console.log(logs.slice(0, 12).join('\n') || 'no console errors/warnings')
edge.kill(); process.exit(0)
