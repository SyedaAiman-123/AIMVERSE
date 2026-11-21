/**
 * RAG ingestion pipeline for "AIM AI".
 *   1. extract   — CV PDF, project-notes text, Between Waking deck PDF, structured portfolio data
 *   2. clean     — strip emoji/markdown/hashtags, normalise whitespace, REDACT private contact details
 *   3. chunk     — logical sections first, then ~800-char windows on sentence boundaries
 *   4. embed     — Gemini embeddings (only if GEMINI_API_KEY is set; otherwise lexical-only index)
 *   5. write     — frontend/api/_rag/index.json (bundled with the Vercel function)
 *
 * Run:  npm run ingest            (lexical index)
 *       GEMINI_API_KEY=... npm run ingest   (adds vectors)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ABOUT, EDUCATION, EXPERIENCE, FACTS, ISLANDS, LINKEDIN, SKILL_GROUPS } from '../frontend/src/data'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(here, 'sources')
const OUT = path.join(here, '..', 'frontend', 'api', '_rag', 'index.json')

export type Chunk = { id: string; doc: string; title: string; ref: string; text: string; vec?: number[] }
const chunks: Chunk[] = []
let n = 0
const add = (doc: string, title: string, ref: string, text: string) => {
  const t = clean(text)
  if (t.length < 25) return
  chunks.push({ id: `c${String(++n).padStart(3, '0')}`, doc, title, ref, text: t })
}

/* ---------- clean ---------- */
function clean(s: string) {
  return redact(s)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '') // emoji
    .replace(/^#{1,6}\s*/gm, '') // markdown headings
    .replace(/\*\*/g, '')
    .replace(/(^|\s)#[A-Za-z0-9_]+/g, ' ') // hashtags
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
/** Private details are removed before indexing so they can never be retrieved or quoted. */
function redact(s: string) {
  return s
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email removed]')
    .replace(/(\+?\d[\d\s-]{8,}\d)/g, (m) => (/\d{4}[\s-]?\d{7}/.test(m) || m.replace(/\D/g, '').length >= 10 ? '[phone removed]' : m))
}

/* ---------- chunk ---------- */
function windows(text: string, max = 800, overlap = 100): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const out: string[] = []
  let cur = ''
  const push = () => { if (cur.trim()) out.push(cur.trim()) }
  for (const p of paras) {
    // split only after sentence punctuation followed by whitespace, so "Three.js" and "98.3%" stay intact
    const sentences = p.split(/(?<=[.!?])\s+/).map((x) => x + ' ')
    for (const s of sentences) {
      if ((cur + s).length > max && cur) { push(); cur = cur.slice(Math.max(0, cur.length - overlap)) }
      cur += s
    }
    cur += '\n'
  }
  push()
  return out
}

/* ---------- extract ---------- */
async function pdfPages(file: string): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true, verbosity: 0 }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    pages.push(tc.items.map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim())
  }
  return pages
}

async function ingestCv() {
  const text = (await pdfPages(path.join(SRC, 'cv.pdf'))).join('\n')
  const heads = ['PROFESSIONAL PROFILE', 'TECHNICAL SKILLS', 'SELECTED PROJECTS', 'ADDITIONAL PROJECTS', 'EDUCATION', 'CERTIFICATIONS & TRAINING', 'ACHIEVEMENT']
  const re = new RegExp(`(${heads.map((h) => h.replace(/&/g, '\\&')).join('|')})`)
  const parts = text.split(re)
  const refFor = (h: string) => (h.includes('SKILLS') ? 'section:s7' : h.includes('PROJECTS') ? 'section:s2' : h === 'PROFESSIONAL PROFILE' ? 'section:s1' : 'section:s8')
  for (let i = 1; i < parts.length; i += 2) {
    const head = parts[i]
    windows(parts[i + 1] ?? '').forEach((w, k) => add('CV', `CV — ${head.toLowerCase()}${k ? ` (${k + 1})` : ''}`, refFor(head), w))
  }
}

function ingestProjectNotes() {
  const raw = fs.readFileSync(path.join(SRC, 'project-notes.txt'), 'utf8')
  const lines = raw.split(/\r?\n/).filter((l) => !/^\s*NOTE:/i.test(l)) // that line is an instruction to the developer, not knowledge
  const secs: { title: string; body: string[] }[] = []
  for (const l of lines) {
    const m = l.match(/^\W*(\d{1,2})\)\s*(.*)$/u)
    if (m) secs.push({ title: m[2].replace(/[^\p{L}\p{N}\s:()'&\-–—>]/gu, '').trim() || `Project ${m[1]}`, body: [] })
    else if (secs.length) secs[secs.length - 1].body.push(l)
  }
  const REF: [RegExp, string][] = [
    [/dungeon chase/i, 'project:0:1'], [/dungeon 2d/i, 'project:0:2'], [/orb rush/i, 'project:0:0'], [/scratch/i, 'project:0:4'], [/shadows|sos/i, 'project:0:5'], [/mask/i, 'project:0:3'],
    [/cybernex/i, 'project:1:1'], [/portal|cyberverse/i, 'project:1:0'],
    [/vr escape/i, 'project:2:0'], [/alice/i, 'project:2:1'], [/uav/i, 'project:2:2'],
    [/virtual board|open ?cv/i, 'project:3:0'], [/islamic/i, 'project:3:1'],
    [/after effects|menu card|documentary|creative agency/i, 'project:4:0'],
  ]
  for (const s of secs) {
    const text = clean(s.body.join('\n'))
    const ref = REF.find(([r]) => r.test(s.title))?.[1] ?? 'section:s2'
    windows(text).forEach((w, k) => add('Project notes', `${s.title}${k ? ` (part ${k + 1})` : ''}`, ref, `${s.title}. ${w}`))
  }
}

async function ingestDeck() {
  const pages = await pdfPages(path.join(SRC, 'between-waking-deck.pdf'))
  const text = pages.map((p, i) => (p.length > 40 ? `Slide ${i + 1}: ${p}` : '')).filter(Boolean)
  for (let i = 0; i < text.length; i += 3) add('Between Waking deck', `Between Waking pre-production deck (slides ${i + 1}–${Math.min(i + 3, text.length)})`, 'project:4:1', text.slice(i, i + 3).join('\n'))
  return text.length
}

function ingestStructured() {
  add('Portfolio', 'About Aiman', 'section:s1', `${ABOUT} Based in Karachi, Pakistan.`)
  add('Portfolio', 'Contact and links', 'section:s9', `LinkedIn: ${LINKEDIN}. Her CV can be downloaded from the website. For privacy, phone number and email address are not shared here; visitors should use the contact section or LinkedIn.`)
  add('Portfolio', 'Education', 'section:s8', `${EDUCATION.degree} at ${EDUCATION.school}, ${EDUCATION.span}. ${EDUCATION.matric}. CEGA (Centre of Excellence for Game Development) training: ${EDUCATION.cega.join('; ')}. Achievement: ${EDUCATION.achievement}.`)
  add('Portfolio', 'Experience', 'section:s8', EXPERIENCE.map((x) => `${x.role} at ${x.org} for ${x.duration}.`).join(' ') + ' No other work experience is listed.')
  const total = ISLANDS.reduce((n, i) => n + i.projects.length, 0)
  add('Portfolio', 'Project list and count', 'section:s2', `Aiman has ${total} projects on this portfolio. ` + ISLANDS.map((i) => `${i.title.join(' ')} (${i.projects.length}): ${i.projects.map((p) => p.name).join(', ')}.`).join(' '))
  SKILL_GROUPS.forEach((g) => add('Portfolio', `Skills — ${g.name}`, 'section:s7', `${g.name}: ${g.skills.join(', ')}.`))
  add('Portfolio', 'Facts at a glance', 'section:s1', FACTS.map((f) => `${f.title}: ${f.body}`).join('\n'))
  ISLANDS.forEach((isl, gi) =>
    isl.projects.forEach((p, pi) => {
      const ref = `project:${gi}:${pi}`
      const head = [`${p.name} (${p.tag}).`, p.year ? `Year: ${p.year}.` : 'Year not stated.', p.team ? `Team: ${p.team}.` : '', p.role ? `Aiman's role: ${p.role}.` : '', p.context ? `Context: ${p.context}.` : '', p.blurb, p.highlight ? `Standout: ${p.highlight}` : '', p.note ?? ''].filter(Boolean).join(' ')
      add('Portfolio', `${p.name} — overview`, ref, head)
      if (p.features?.length || p.built?.length) add('Portfolio', `${p.name} — features and build`, ref, `${p.name}. ${p.features?.length ? 'Features: ' + p.features.join('; ') + '.' : ''} ${p.built?.length ? 'What was built: ' + p.built.join('; ') + '.' : ''}`)
      if (p.stack?.length || p.learned) add('Portfolio', `${p.name} — stack and learning`, ref, `${p.name}. ${p.stack?.length ? 'Technologies: ' + p.stack.join(', ') + '.' : ''} ${p.learned ? 'Learned: ' + p.learned : ''} ${p.media?.length ? 'Media available: ' + p.media.map((m) => m.label).join(', ') + '.' : 'No video or screenshots were supplied.'} ${p.link ? 'Live link: ' + p.link.href : ''}`)
    }),
  )
}

/* ---------- embed ---------- */
async function embed(texts: { title: string; text: string }[], key: string, model: string, dims: number) {
  const base = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com'
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 20) {
    const batch = texts.slice(i, i + 20)
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(`${base}/v1beta/models/${model}:batchEmbedContents?key=${key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requests: batch.map((b) => ({ model: `models/${model}`, content: { parts: [{ text: `${b.title}\n${b.text}` }] }, taskType: 'RETRIEVAL_DOCUMENT', title: b.title, outputDimensionality: dims })) }),
      })
      if (r.ok) {
        const j = (await r.json()) as { embeddings: { values: number[] }[] }
        j.embeddings.forEach((e) => {
          const norm = Math.hypot(...e.values) || 1
          out.push(e.values.map((v) => Math.round((v / norm) * 1e4) / 1e4))
        })
        break
      }
      if ((r.status === 429 || r.status >= 500) && attempt < 5) { await new Promise((res) => setTimeout(res, 4000 * (attempt + 1))); continue }
      throw new Error(`Embedding request failed: ${r.status} ${(await r.text()).slice(0, 300)}`)
    }
    process.stdout.write(`  embedded ${Math.min(i + 20, texts.length)}/${texts.length}\r`)
    await new Promise((res) => setTimeout(res, 700)) // stay well under free-tier per-minute limits
  }
  return out
}

async function main() {
  await ingestCv()
  ingestProjectNotes()
  const slides = await ingestDeck()
  ingestStructured()
  const byDoc = chunks.reduce<Record<string, number>>((a, c) => ((a[c.doc] = (a[c.doc] ?? 0) + 1), a), {})
  console.log('chunks per document:', byDoc, `(deck slides with text: ${slides})`)
  const key = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001'
  const dims = Number(process.env.GEMINI_EMBED_DIMS ?? 768)
  let embeddingModel: string | null = null
  if (key) {
    console.log(`embedding ${chunks.length} chunks with ${model} (${dims} dims)…`)
    const vecs = await embed(chunks, key, model, dims)
    chunks.forEach((c, i) => (c.vec = vecs[i]))
    embeddingModel = model
    console.log('\nembeddings stored')
  } else console.log('GEMINI_API_KEY not set → lexical-only index (retrieval uses BM25; add a key and re-run to add vectors)')
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ version: 1, builtAt: new Date().toISOString(), embeddingModel, dims: key ? dims : 0, chunks }))
  console.log(`wrote ${path.relative(process.cwd(), OUT)} — ${chunks.length} chunks, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`)
}
main()
