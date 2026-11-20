/**
 * POST /api/chat   { message: string, history?: [{role:'user'|'assistant', text:string}] }
 * Vercel serverless function. Validates input, rate-limits, then runs the RAG pipeline.
 * The Gemini API key lives only in the server environment (GEMINI_API_KEY) — never in the browser or the repo.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { answer, type Turn } from './_rag/engine.js'

type Req = IncomingMessage & { body?: unknown; socket: { remoteAddress?: string } }

const MAX_MSG = 400
const hits = new Map<string, number[]>() // best-effort per-instance limiter (serverless instances are ephemeral)
const PER_MIN = 10
const PER_DAY = 120

function limited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 86_400_000)
  const recent = list.filter((t) => now - t < 60_000).length
  if (recent >= PER_MIN || list.length >= PER_DAY) { hits.set(ip, list); return true }
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
    if (size > 8_000) throw new Error('too large')
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

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { error: 'Use POST.' }) }
  // Same-origin only, so other websites cannot spend the free Gemini quota through visitors' browsers.
  const origin = req.headers.origin
  if (origin) {
    let ok = false
    try { ok = new URL(String(origin)).host === req.headers.host } catch { ok = false }
    if (!ok) return send(res, 403, { error: 'Cross-site requests are not allowed.' })
  }
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
  if (limited(ip)) return send(res, 429, { error: 'You are asking very quickly — please wait a moment and try again.' })
  let body: { message?: unknown; history?: unknown }
  try { body = (await readBody(req)) as typeof body } catch { return send(res, 400, { error: 'Invalid request.' }) }
  if (typeof body.message !== 'string') return send(res, 400, { error: 'Please type a question.' })
  // sanitise: strip control characters, collapse whitespace, cap length
  const message = body.message.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (message.length < 2) return send(res, 400, { error: 'Please type a question.' })
  if (message.length > MAX_MSG) return send(res, 400, { error: `Questions can be up to ${MAX_MSG} characters.` })
  const history: Turn[] = Array.isArray(body.history)
    ? (body.history as unknown[]).slice(-6).flatMap((t) => {
        const o = t as { role?: unknown; text?: unknown }
        return (o.role === 'user' || o.role === 'assistant') && typeof o.text === 'string' ? [{ role: o.role as Turn['role'], text: o.text.slice(0, 600) }] : []
      })
    : []
  try {
    return send(res, 200, await answer(message, history))
  } catch (e) {
    console.error('chat failed', e instanceof Error ? e.message : e)
    return send(res, 500, { error: 'Something went wrong on my side. Please try again.' })
  }
}
