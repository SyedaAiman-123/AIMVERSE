import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Island, Project } from './data'
import { audio } from './audio'

export type OpenState = { gi: number; pi: number; mi: number }
const pad = (n: number) => String(n).padStart(2, '0')

function Tilt({ children, className = '', i = 0 }: { children: ReactNode; className?: string; i?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current!.style.setProperty('--rx', `${(-y * 10).toFixed(1)}deg`)
    ref.current!.style.setProperty('--ry', `${(x * 12).toFixed(1)}deg`)
  }
  const leave = () => { ref.current!.style.setProperty('--rx', '0deg'); ref.current!.style.setProperty('--ry', '0deg') }
  return (
    <div ref={ref} className={`tilt ${className}`} style={{ ['--i' as string]: i }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  )
}

export default function CaseSheet({ island, state, flat, onChange, onClose }: { island: Island; state: OpenState; flat: { gi: number; pi: number }[]; onChange: (s: OpenState) => void; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const project: Project = island.projects[state.pi]
  const media = project.media?.[state.mi]
  const [chapter, setChapter] = useState('brief')
  const [watch, setWatch] = useState(false)
  const [page, setPage] = useState(0)
  const idx = flat.findIndex((f) => f.gi === state.gi && f.pi === state.pi)

  const chapters = useMemo(
    () => [
      { id: 'brief', label: 'Brief', show: true },
      { id: 'features', label: 'Features', show: !!project.features?.length },
      { id: 'built', label: 'What I built', show: !!project.built?.length },
      { id: 'stack', label: 'Stack', show: !!project.stack?.length },
      { id: 'learned', label: 'Learned', show: !!project.learned },
    ].filter((c) => c.show),
    [project],
  )

  useEffect(() => { setChapter('brief'); setWatch(false); setPage(0) }, [state.gi, state.pi])
  useEffect(() => { setPage(0); setWatch(false) }, [state.mi])
  useEffect(() => {
    const d = dlg.current!
    d.showModal()
    audio.open()
    const cancel = (e: Event) => { e.preventDefault(); onClose() }
    d.addEventListener('cancel', cancel)
    return () => { d.removeEventListener('cancel', cancel); d.close(); audio.close() }
  }, [onClose])
  useEffect(() => {
    const v = vid.current
    if (!v) return
    v.muted = !watch
    v.controls = watch
    if (watch) v.currentTime = 0
    v.play().catch(() => {})
  }, [watch, media?.slug])

  const go = (dir: number) => {
    const n = flat[(idx + dir + flat.length) % flat.length]
    audio.select()
    onChange({ gi: n.gi, pi: n.pi, mi: 0 })
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if (/^[1-5]$/.test(e.key) && chapters[+e.key - 1]) setChapter(chapters[+e.key - 1].id)
  }
  const parallax = (e: React.PointerEvent) => {
    const bg = dlg.current?.querySelector<HTMLElement>('.case-bg .m')
    if (bg) bg.style.transform = `scale(1.08) translate(${(e.clientX / innerWidth - 0.5) * -14}px, ${(e.clientY / innerHeight - 0.5) * -10}px)`
  }

  const chip = (label: string, v?: string) =>
    v ? <li key={label}><b>{label}</b>{v}</li> : <li key={label} className="miss"><b>{label}</b>to be added</li>

  return (
    <dialog ref={dlg} className={'case' + (watch ? ' watch' : '')} style={{ ['--a' as string]: island.accent }} aria-labelledby="case-title" onKeyDown={onKey} onPointerMove={parallax}>
      <div className="case-bg" aria-hidden={!watch}>
        {media?.img ? (
          <img className={'m' + (media.gallery ? ' slide' : '')} src={media.gallery ? media.gallery[page].src : media.img} alt={media.gallery ? media.gallery[page].label : (media.desc ?? media.label)} />
        ) : media ? (
          <video className="m" ref={vid} key={media.slug} src={`/media/${media.slug}.mp4`} poster={`/media/${media.slug}.jpg`} muted loop playsInline autoPlay />
        ) : (
          <div className="m none" />
        )}
        <div className="scrim" />
      </div>

      <header className="case-top mono">
        <span>{island.title.join(' ')} · {pad(state.pi + 1)}/{pad(island.projects.length)}</span>
        <button onClick={onClose} autoFocus>Close ✕</button>
      </header>

      <div className="case-main" key={`${state.gi}-${state.pi}`}>
        <div className="case-head">
          <div className="bignum" aria-hidden="true">{pad(idx + 1)}</div>
          <p className="mono cap">{project.tag}</p>
          <h3 id="case-title">{project.name}</h3>
          <ul className="chips mono">
            {chip('Year', project.year)}
            {chip('Team', project.team)}
            {project.role && chip('My role', project.role)}
            {project.context && chip('Context', project.context)}
          </ul>
          {project.highlight && <p className="callout"><span className="mono">Standout</span>{project.highlight}</p>}
        </div>

        <div className="case-body">
          <nav className="chapters mono" role="tablist" aria-label="Project chapters">
            {chapters.map((c, i) => (
              <button key={c.id} role="tab" aria-selected={chapter === c.id} className={chapter === c.id ? 'on' : ''} onClick={() => { audio.tick(); setChapter(c.id) }}>
                <i>{i + 1}</i>{c.label}
              </button>
            ))}
          </nav>
          <div className="chapter" key={chapter} role="tabpanel">
            {chapter === 'brief' && (
              <>
                <p className="lead">{project.blurb}</p>
                {project.note && <p className="mono note">{project.note}</p>}
                {media?.desc && <p className="mono mdesc">{media.illustrative ? '◇ ' : '▶ '}{media.desc}</p>}
              </>
            )}
            {chapter === 'features' && <div className="grid">{project.features!.map((f, i) => <Tilt key={f} i={i} className="card3"><span className="mono">{pad(i + 1)}</span><p>{f}</p></Tilt>)}</div>}
            {chapter === 'built' && <div className="grid">{project.built!.map((f, i) => <Tilt key={f} i={i} className="card3"><span className="mono">{pad(i + 1)}</span><p>{f}</p></Tilt>)}</div>}
            {chapter === 'stack' && <div className="stackcloud">{project.stack!.map((s, i) => <Tilt key={s} i={i} className="tag3"><b>{s}</b></Tilt>)}</div>}
            {chapter === 'learned' && <p className="quote">{project.learned}</p>}
          </div>
        </div>
      </div>

      {watch && media?.gallery && (
        <div className="strip" role="list" aria-label="Pre-production pages">
          <p className="mono">{pad(page + 1)}/{pad(media.gallery.length)} — {media.gallery[page].label}</p>
          <div>
            {media.gallery.map((g, i) => (
              <button key={g.src} role="listitem" className={i === page ? 'on' : ''} onClick={() => { audio.tick(); setPage(i) }} aria-label={g.label}><img src={g.src} alt="" loading="lazy" /></button>
            ))}
          </div>
        </div>
      )}
      <footer className="case-foot mono">
        <div className="foot-l">
          {project.media && project.media.length > 1 && project.media.map((m, i) => (
            <button key={m.slug} className={i === state.mi ? 'on' : ''} onClick={() => onChange({ ...state, mi: i })}>{m.label}</button>
          ))}
          {media && (!media.img || media.gallery) && <button className="watchbtn" onClick={() => setWatch((w) => !w)}>{watch ? '← Back to info' : media.gallery ? '▶ Browse pages' : '▶ Watch with sound'}</button>}
          {project.link && <a href={project.link.href} target="_blank" rel="noopener noreferrer">{project.link.label} ↗</a>}
        </div>
        <div className="foot-r">
          <button onClick={() => go(-1)} aria-label="Previous project">← Prev</button>
          <span>{pad(idx + 1)} / {pad(flat.length)}</span>
          <button onClick={() => go(1)} aria-label="Next project">Next →</button>
        </div>
      </footer>
    </dialog>
  )
}
