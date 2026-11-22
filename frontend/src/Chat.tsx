import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { audio } from './audio'
import { voice } from './voice'
import { BRAND } from './brand'

export type Source = { n: number; title: string; doc: string; ref: string }
export type Msg = { id: number; role: 'user' | 'assistant'; text: string; sources?: Source[]; mode?: string; note?: string; error?: boolean }

const SUGGESTIONS = [
  'What VR projects has Aiman built?',
  'Does she know Unreal Engine?',
  'Tell me about CyberNex Simulator',
  'What is her education?',
  'What did she do at KDA?',
  'Which projects use Three.js?',
]
const ChatAvatar = lazy(() => import('./ChatAvatar'))
let uid = 0
const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })()

function Rich({ text }: { text: string }) {
  return <>{text.split(/(\[\d+\])/g).map((p, i) => (/^\[\d+\]$/.test(p) ? <sup key={i} className="cite mono">{p.slice(1, -1)}</sup> : <span key={i}>{p}</span>))}</>
}

export default function Chat({ msgs, setMsgs, onClose, onProject, onSection }: { msgs: Msg[]; setMsgs: (f: (m: Msg[]) => Msg[]) => void; onClose: () => void; onProject: (gi: number, pi: number) => void; onSection: (i: number) => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const lastQ = useRef('')

  useEffect(() => {
    const d = dlg.current!
    d.showModal()
    const cancel = (e: Event) => { e.preventDefault(); onClose() }
    d.addEventListener('cancel', cancel)
    return () => { d.removeEventListener('cancel', cancel); d.close() }
  }, [onClose])
  // her recorded welcome when the chat opens (cut when it closes)
  useEffect(() => { const id = setTimeout(() => voice.play('aim-ai', undefined, 15000), 500); return () => { clearTimeout(id); voice.stop() } }, [])
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const ask = async (q: string) => {
    q = q.trim()
    if (!q || busy) return
    lastQ.current = q
    setText('')
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setMsgs((m) => [...m.filter((x) => !x.error), { id: ++uid, role: 'user', text: q }])
    setBusy(true)
    audio.tick()
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 20000)
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: q, history }), signal: ctl.signal })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`)
      setMsgs((m) => [...m, { id: ++uid, role: 'assistant', text: j.answer, sources: j.sources, mode: j.mode, note: j.note }])
      audio.select()
    } catch (e) {
      const msg = e instanceof DOMException && e.name === 'AbortError' ? 'That took too long.' : e instanceof Error ? e.message : 'Something went wrong.'
      setMsgs((m) => [...m, { id: ++uid, role: 'assistant', text: `${msg} Please try again in a moment.`, error: true }])
    } finally {
      clearTimeout(timer)
      setBusy(false)
      input.current?.focus()
    }
  }

  const open = (s: Source) => {
    const p = s.ref.match(/^project:(\d+):(\d+)$/)
    const sec = s.ref.match(/^section:s(\d+)$/)
    onClose()
    setTimeout(() => (p ? onProject(+p[1], +p[2]) : sec ? onSection(+sec[1]) : undefined), 250)
  }
  const uniq = (src: Source[] = []) => src.filter((s, i) => src.findIndex((x) => x.ref === s.ref && x.doc === s.doc) === i)

  return (
    <dialog ref={dlg} className="chat" aria-labelledby="chat-title" onClick={(e) => e.target === dlg.current && onClose()}>
      <div className="chat-in">
        {canGL && (
          <div className="chat-av" aria-hidden="true">
            <Suspense fallback={null}><ChatAvatar busy={busy} waves={msgs.filter((m) => m.role === 'assistant' && !m.error).length} /></Suspense>
          </div>
        )}
        <header>
          <div>
            <p className="mono">Ask {BRAND.assistant}</p>
            <h2 id="chat-title">Your guide to {BRAND.name}</h2>
          </div>
          <button className="mono" onClick={onClose} aria-label="Close chat">Close ✕</button>
        </header>

        <div className="chat-log" ref={log} role="log" aria-live="polite" data-lenis-prevent>
          {msgs.length === 0 && (
            <div className="chat-empty">
              <p className="lead">Ask me anything about Aiman's projects, skills, education or experience. I only answer from her CV, project notes and documents — and I'll say so when I don't know.</p>
              <div className="sugg">{SUGGESTIONS.map((s) => <button key={s} className="mono" onClick={() => ask(s)}>{s}</button>)}</div>
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={`msg ${m.role}${m.error ? ' err' : ''}`}>
              <p><Rich text={m.text} /></p>
              {m.note && <p className="mono note">{m.note}</p>}
              {m.mode === 'refusal' && <p className="mono note">Not found in the documents.</p>}
              {m.error && <button className="mono retry" onClick={() => ask(lastQ.current)}>Try again</button>}
              {m.sources && m.sources.length > 0 && (
                <div className="srcs" aria-label="Sources">
                  <span className="mono">Sources</span>
                  {uniq(m.sources).map((s) => (
                    <button key={s.n + s.ref} className="mono" title={`${s.doc} — ${s.title}`} onClick={() => open(s)}>[{s.n}] {s.doc} ↗</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="msg assistant" aria-label={`${BRAND.assistant} is thinking`}><p className="dots"><i /><i /><i /></p></div>}
        </div>

        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
          <label className="sr" htmlFor="chat-input">Your question</label>
          <textarea id="chat-input" ref={input} value={text} maxLength={400} rows={2} placeholder="Ask about a project, a skill, her education…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(text) } }} autoFocus />
          <div className="row">
            <span className="mono count">{text.length}/400</span>
            <button className="mono send" type="submit" disabled={busy || text.trim().length < 2}>{busy ? 'Thinking…' : 'Ask ↵'}</button>
          </div>
        </form>
        <p className="mono privacy">Answers come only from Aiman's documents. Your question is processed by Google Gemini's free tier, which may use it to improve Google's products — please don't share personal information.</p>
      </div>
    </dialog>
  )
}
