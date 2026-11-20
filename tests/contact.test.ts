/**
 * Contact API tests. A local FAKE Resend server stands in for the email provider, so these prove our validation,
 * spam defences and request format — not that real mail was delivered (that needs a real Resend key).
 */
import http from 'node:http'
import handler from '../frontend/api/contact'
import { validate } from '../frontend/api/_lib/validate'

let resendBody: any = null
let resendAuth = ''
let resendMode: 'ok' | 'fail' = 'ok'
const fake = http.createServer((req, res) => {
  let d = ''
  req.on('data', (c) => (d += c))
  req.on('end', () => {
    resendAuth = String(req.headers.authorization)
    resendBody = JSON.parse(d)
    res.statusCode = resendMode === 'ok' ? 200 : 500
    res.setHeader('content-type', 'application/json')
    res.end(resendMode === 'ok' ? '{"id":"abc"}' : '{"message":"boom"}')
  })
})

let ipN = 0
async function post(port: number, body: unknown, opts: { ip?: string; headers?: Record<string, string>; raw?: string } = {}) {
  const r = await fetch(`http://127.0.0.1:${port}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': opts.ip ?? `10.0.0.${++ipN}`, ...opts.headers },
    body: opts.raw ?? JSON.stringify(body),
  })
  return { status: r.status, json: (await r.json().catch(() => ({}))) as any }
}

async function main() {
  await new Promise<void>((r) => fake.listen(0, r))
  const fakePort = (fake.address() as { port: number }).port
  const env = { RESEND_API_KEY: 'TEST_RESEND_KEY', RESEND_BASE_URL: `http://127.0.0.1:${fakePort}`, CONTACT_TO: 'owner@example.com', CONTACT_FROM: 'Site <site@example.com>' }
  const api = http.createServer((req, res) => handler(req as never, res, env))
  await new Promise<void>((r) => api.listen(0, r))
  const port = (api.address() as { port: number }).port

  const out: string[] = []
  const check = (name: string, ok: boolean) => { out.push(`${ok ? 'PASS' : 'FAIL'} | ${name}`); if (!ok) process.exitCode = 1 }
  const good = () => ({ name: 'Sara Khan', email: 'sara@example.com', subject: 'Internship opportunity', message: 'Hi Aiman, I loved your portfolio and would like to talk about a role.', website: '', ts: Date.now() - 6000 })

  // ---- happy path
  let r = await post(port, good())
  check('valid message → 200 ok', r.status === 200 && r.json.ok === true)
  check('email goes to CONTACT_TO from CONTACT_FROM with Reply-To = visitor', resendBody.to[0] === 'owner@example.com' && resendBody.from === 'Site <site@example.com>' && resendBody.reply_to === 'sara@example.com')
  check('API key sent as Bearer header, never in the body', resendAuth === 'Bearer TEST_RESEND_KEY' && !JSON.stringify(resendBody).includes('TEST_RESEND_KEY'))
  check('subject is prefixed and body contains the message', resendBody.subject === '[AIMANVERSE] Internship opportunity' && resendBody.text.includes('would like to talk about a role'))

  // ---- validation (server side)
  r = await post(port, { ...good(), name: '', email: 'not-an-email', subject: 'x', message: 'short' })
  check('invalid fields → 400 with per-field errors', r.status === 400 && !!r.json.fields.name && !!r.json.fields.email && !!r.json.fields.subject && !!r.json.fields.message)
  r = await post(port, { ...good(), message: 'a'.repeat(2001) })
  check('message over 2000 chars rejected', r.status === 400 && !!r.json.fields.message)
  r = await post(port, { ...good(), message: 'visit http://a.com and http://b.com and http://c.com now please' })
  check('more than 2 links rejected (spam heuristic)', r.status === 400 && !!r.json.fields.message)

  // ---- injection
  resendBody = null
  r = await post(port, { ...good(), subject: 'Hello\r\nBcc: victim@example.com' })
  check('header injection in subject rejected, nothing sent', r.status === 400 && resendBody === null)
  r = await post(port, { ...good(), email: 'a@b.com\nBcc: victim@example.com' })
  check('header injection in email rejected', r.status === 400)
  r = await post(port, { ...good(), name: '<script>alert(1)</script>', message: 'Hello <img src=x onerror=alert(1)> there, nice portfolio!' })
  check('HTML in fields is accepted but escaped in the email html', r.status === 200 && !resendBody.html.includes('<script>') && !resendBody.html.includes('<img') && resendBody.html.includes('&lt;script&gt;'))

  // ---- spam defences
  resendBody = null
  r = await post(port, { ...good(), website: 'http://spam.example' })
  check('honeypot filled → fake 200 but NOTHING sent', r.status === 200 && resendBody === null)
  r = await post(port, { ...good(), ts: Date.now() - 300 })
  check('submitted too fast → rejected, nothing sent', r.status === 400 && resendBody === null)
  r = await post(port, { ...good(), ts: 'nope' })
  check('missing/invalid timestamp → rejected', r.status === 400)
  r = await post(port, good(), { headers: { origin: 'https://evil.example' } })
  check('cross-site Origin rejected (403)', r.status === 403)
  r = await post(port, good(), { headers: { 'content-type': 'text/plain' } })
  check('non-JSON content type rejected (415)', r.status === 415)
  r = await post(port, null, { raw: '{not json' })
  check('malformed JSON → 400', r.status === 400)
  const g = await fetch(`http://127.0.0.1:${port}/api/contact`)
  check('GET → 405', g.status === 405)

  // ---- rate limit (same IP)
  const ip = '203.0.113.9'
  const codes: number[] = []
  for (let i = 0; i < 5; i++) codes.push((await post(port, good(), { ip })).status)
  check('rate limit: 3 per 10 min then 429', codes.slice(0, 3).every((c) => c === 200) && codes[3] === 429 && codes[4] === 429)

  // ---- provider failure + missing key
  resendMode = 'fail'
  r = await post(port, good())
  check('provider error → 502 with friendly message (no internals leaked)', r.status === 502 && !/boom|500|Resend/i.test(r.json.error))
  resendMode = 'ok'
  const api2 = http.createServer((req, res) => handler(req as never, res, {}))
  await new Promise<void>((rr) => api2.listen(0, rr))
  r = await post((api2.address() as { port: number }).port, good())
  check('no RESEND_API_KEY → 503 "not set up yet"', r.status === 503)
  api2.close()

  // ---- shared validator unit checks
  check('validator: normal data ok', validate({ name: 'Al', email: 'a.b+c@sub.example.org', subject: 'Hey!', message: '0123456789' }).ok)
  check('validator: rejects a@b, a..b@c.com, .a@b.com', !validate({ name: 'Al', email: 'a@b', subject: 'Hey', message: '0123456789' }).ok && !validate({ name: 'Al', email: 'a..b@c.com', subject: 'Hey', message: '0123456789' }).ok && !validate({ name: 'Al', email: '.a@b.com', subject: 'Hey', message: '0123456789' }).ok)

  console.log(out.join('\n'))
  console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.length} passed`)
  api.close(); fake.close()
}
main()
