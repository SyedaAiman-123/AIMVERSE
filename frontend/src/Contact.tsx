import { useEffect, useRef, useState } from 'react'
import { LIMITS, validate, type ContactInput, type FieldErrors } from '../api/_lib/validate'
import { audio } from './audio'

type Status = 'idle' | 'sending' | 'sent' | 'error'
const EMPTY: ContactInput = { name: '', email: '', subject: '', message: '' }
const ORDER: (keyof ContactInput)[] = ['name', 'email', 'subject', 'message']

export default function Contact({ onClose }: { onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const opened = useRef(Date.now()) // anti-bot: server rejects instant submissions
  const [v, setV] = useState<ContactInput>(EMPTY)
  const [website, setWebsite] = useState('') // honeypot — real visitors never see or fill this
  const [touched, setTouched] = useState<Partial<Record<keyof ContactInput, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [banner, setBanner] = useState('')

  useEffect(() => {
    const d = dlg.current!
    d.showModal()
    const cancel = (e: Event) => { e.preventDefault(); onClose() }
    d.addEventListener('cancel', cancel)
    return () => { d.removeEventListener('cancel', cancel); d.close() }
  }, [onClose])

  const result = validate(v)
  const clientErrors: FieldErrors = result.ok ? {} : result.errors
  const err = (k: keyof ContactInput) => (touched[k] ? clientErrors[k] : undefined) ?? serverErrors[k]
  const set = (k: keyof ContactInput, val: string) => { setV((s) => ({ ...s, [k]: val })); if (serverErrors[k]) setServerErrors((s) => ({ ...s, [k]: undefined })) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setTouched({ name: true, email: true, subject: true, message: true })
    if (!result.ok) {
      setBanner('Please fix the highlighted fields.')
      const first = ORDER.find((k) => result.errors[k])
      if (first) (dlg.current?.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus()
      return
    }
    setBanner('')
    setStatus('sending')
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...result.value, website, ts: opened.current }), signal: AbortSignal.timeout(20000) })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setStatus('sent'); audio.chime(); return }
      if (j.fields) setServerErrors(j.fields)
      setBanner(j.error || 'Something went wrong. Please try again.')
      setStatus('error')
    } catch (e2) {
      setBanner(e2 instanceof DOMException && e2.name === 'TimeoutError' ? 'That took too long. Please try again.' : 'Could not reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  const field = (k: keyof ContactInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={'f' + (err(k) ? ' bad' : '')}>
      <label htmlFor={`c-${k}`}>{label}</label>
      <input id={`c-${k}`} name={k} value={v[k]} onChange={(e) => set(k, e.target.value)} onBlur={() => setTouched((t) => ({ ...t, [k]: true }))} aria-invalid={!!err(k)} aria-describedby={err(k) ? `c-${k}-e` : undefined} disabled={status === 'sending'} maxLength={k === 'email' ? LIMITS.email : LIMITS[k as 'name' | 'subject'][1] + 20} required {...props} />
      {err(k) && <p id={`c-${k}-e`} className="e mono" role="alert">{err(k)}</p>}
    </div>
  )

  return (
    <dialog ref={dlg} className="contact" aria-labelledby="contact-title" onClick={(e) => e.target === dlg.current && onClose()}>
      <div className="contact-in" data-lenis-prevent>
        <header>
          <div><p className="mono">Contact</p><h2 id="contact-title">{status === 'sent' ? 'Message sent' : 'Send Aiman a message'}</h2></div>
          <button className="mono" onClick={onClose} aria-label="Close contact form">Close ✕</button>
        </header>

        {status === 'sent' ? (
          <div className="done" role="status">
            <p className="big">Thank you, {v.name.split(' ')[0]}.</p>
            <p>Your message has been delivered. Aiman will reply to <b>{v.email}</b>.</p>
            <button className="big-btn sm" onClick={onClose}>Back to the experience <b>→</b></button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {field('name', 'Your name', { autoComplete: 'name' })}
            {field('email', 'Your email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
            {field('subject', 'Subject')}
            <div className={'f' + (err('message') ? ' bad' : '')}>
              <label htmlFor="c-message">Message</label>
              <textarea id="c-message" name="message" rows={6} value={v.message} onChange={(e) => set('message', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, message: true }))} aria-invalid={!!err('message')} aria-describedby={err('message') ? 'c-message-e' : undefined} disabled={status === 'sending'} maxLength={LIMITS.message[1] + 50} required />
              <div className="row"><span className="mono count">{v.message.length}/{LIMITS.message[1]}</span></div>
              {err('message') && <p id="c-message-e" className="e mono" role="alert">{err('message')}</p>}
            </div>
            {/* honeypot: hidden from people and assistive tech, irresistible to bots */}
            <div className="hp" aria-hidden="true"><label>Leave this empty<input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
            {banner && <p className={'banner mono' + (status === 'error' ? ' err' : '')} role="alert">{banner}</p>}
            <button className="send mono" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : status === 'error' ? 'Try again ↵' : 'Send message ↵'}</button>
            <p className="privacy mono">Your details are used only to deliver this message and let Aiman reply. Nothing is stored on this site.</p>
          </form>
        )}
      </div>
    </dialog>
  )
}
