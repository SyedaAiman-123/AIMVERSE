/**
 * POST /api/contact   { name, email, subject, message, website (honeypot), ts (form-open time, ms) }
 * Vercel serverless function. Validates, filters spam, then emails the owner via Resend.
 * Secrets (RESEND_API_KEY) live only in server environment variables — never in the browser or the repo.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { escapeHtml, validate } from './_lib/validate.js'
import { BRAND_NAME } from './_lib/brand'

type Req = IncomingMessage & { body?: unknown; socket: { remoteAddress?: string } }
type Env = Record<string, string | undefined>

const hits = new Map<string, number[]>() // best-effort limiter (serverless instances are ephemeral)
const PER_10MIN = 3
const PER_DAY = 12
const MIN_FILL_MS = 2500 // a human can't fill four fields faster than this
const MAX_AGE_MS = 2 * 60 * 60 * 1000

function limited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 86_400_000)
  if (list.filter((t) => now - t < 600_000).length >= PER_10MIN || list.length >= PER_DAY) { hits.set(ip, list); return true }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return false
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > 10_000) throw new Error('too large')
    chunks.push(c as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

/** Same-origin only: a browser form on another site cannot post here. (Non-browser clients send no Origin and are caught by the other checks.) */
function sameOrigin(req: Req): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

export default async function handler(req: Req, res: ServerResponse, env: Env = process.env) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { error: 'Use POST.' }) }
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'Unsupported content type.' })
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site requests are not allowed.' })
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
  if (limited(ip)) return send(res, 429, { error: 'You have sent several messages recently. Please wait a few minutes and try again.' })

  let raw: Record<string, unknown>
  try { raw = (await readBody(req)) as Record<string, unknown> } catch { return send(res, 400, { error: 'Invalid request.' }) }
  if (!raw || typeof raw !== 'object') return send(res, 400, { error: 'Invalid request.' })

  // honeypot: real people never see this field. Pretend success so bots learn nothing.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') return send(res, 200, { ok: true })
  const elapsed = Date.now() - Number(raw.ts)
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS || elapsed > MAX_AGE_MS) return send(res, 400, { error: 'That was a bit too fast — please review your message and send it again.' })

  const v = validate(raw)
  if (!v.ok) return send(res, 400, { error: 'Please fix the highlighted fields.', fields: v.errors })

  const key = env.RESEND_API_KEY
  if (!key) return send(res, 503, { error: 'Email delivery is not set up yet. Please reach out on LinkedIn for now.' })
  const to = env.CONTACT_TO ?? 's.aimanmunawarali@gmail.com'
  const from = env.CONTACT_FROM ?? `${BRAND_NAME} <onboarding@resend.dev>`
  const { name, email, subject, message } = v.value
  const text = `New message from the ${BRAND_NAME} contact form\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}\n`
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px"><h2 style="margin:0 0 12px">New message from ${BRAND_NAME}</h2><p style="margin:0"><b>Name:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(email)}<br><b>Subject:</b> ${escapeHtml(subject)}</p><hr style="margin:16px 0;border:0;border-top:1px solid #ddd"><p style="white-space:pre-wrap;margin:0">${escapeHtml(message)}</p></div>`

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(`${env.RESEND_BASE_URL ?? 'https://api.resend.com'}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `[${BRAND_NAME}] ${subject}`, text, html }),
      signal: ctl.signal,
    })
    if (!r.ok) {
      // log the provider status only — never the visitor's message
      console.error('resend failed', r.status, (await r.text()).slice(0, 200))
      return send(res, 502, { error: 'The email service could not deliver your message. Please try again in a moment or reach out on LinkedIn.' })
    }
    return send(res, 200, { ok: true })
  } catch (e) {
    console.error('resend error', e instanceof Error ? e.message : e)
    return send(res, 502, { error: 'The email service could not be reached. Please try again in a moment or reach out on LinkedIn.' })
  } finally {
    clearTimeout(timer)
  }
}
