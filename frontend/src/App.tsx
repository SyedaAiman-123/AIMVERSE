import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { useProgress } from '@react-three/drei'
import { ABOUT, BY_YEAR, CV_URL, EDUCATION, EXPERIENCE, FACTS, FLAT, ISLANDS, LINKEDIN, SKILL_GROUPS, TICKER, YEARS, YEAR_NOTE, projectsFor, thumbOf, type Island } from './data'
import Classic from './Classic'
import CaseSheet, { type OpenState } from './CaseSheet'
import type { Quality } from './Scene'
import { ACCENTS, SECTION_COUNT, avatarBus, fx, intro, scroll } from './world/state'
import { audio } from './audio'
import { track } from './game'
import { Dashboard, QuestButton } from './GameUI'
import Chat, { type Msg } from './Chat'
import Contact from './Contact'
import PromoVideo from './PromoVideo'
import { BRAND } from './brand'

const Scene = lazy(() => import('./Scene'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
const pad = (n: number) => String(n).padStart(2, '0')
const LABELS = ['Gateway', 'About', ...ISLANDS.map((i) => i.short), 'Skills', 'Journey', 'Contact']

function Preloader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { progress } = useProgress()
  const [shown, setShown] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setShown((s) => (s < progress ? Math.min(progress, s + 3) : s)), 30)
    return () => clearInterval(id)
  }, [progress])
  useEffect(() => {
    if (ready && shown >= 100) {
      const a = setTimeout(() => setOut(true), 350)
      const b = setTimeout(onDone, 1250)
      return () => { clearTimeout(a); clearTimeout(b) }
    }
  }, [ready, shown, onDone])
  return (
    <div className={'preloader' + (out ? ' out' : '')} role="status" aria-live="polite">
      <div className="pl-count">{pad(Math.round(Math.min(shown, 100)))}<span>%</span></div>
      <div className="pl-bar"><i style={{ transform: `scaleX(${Math.min(shown, 100) / 100})` }} /></div>
      <p className="mono">Loading {BRAND.name}</p>
    </div>
  )
}

/** Titles "decode" from random glyphs into the real word when they scroll into view (Active Theory-style). */
const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFGHJKLMNPRSTUVWXYZ'
function Decode({ text }: { text: string }) {
  const [out, setOut] = useState(text)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const run = () => {
      const t0 = performance.now()
      const step = (now: number) => {
        const p = (now - t0) / 900
        setOut([...text].map((c, i) => (c === ' ' || p > (i + 1) / (text.length + 2) + 0.15 ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''))
        if (p < 1.2) raf = requestAnimationFrame(step); else setOut(text)
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && run()), { threshold: 0.5 })
    if (ref.current) io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [text])
  return <span ref={ref}><span className="sr">{text}</span><span aria-hidden="true">{out}</span></span>
}

const Letters = ({ text, base }: { text: string; base: number }) => (
  <>{[...text].map((c, i) => <i key={i} style={{ ['--i' as string]: base + i }}>{c === ' ' ? ' ' : c}</i>)}</>
)

/** Hold-to-enter: charging builds a riser, pushes the camera toward her and glows; release at full charge is the beat drop. */
function Welcome({ onEnter, onSkip, reduced, out }: { onEnter: () => void; onSkip: () => void; reduced: boolean; out: boolean }) {
  const [p, setP] = useState(0)
  const st = useRef({ holding: false, auto: false, p: 0, raf: 0, done: false, last: 0 })
  const DUR = reduced ? 0.5 : 1.6

  const loop = useCallback((now: number) => {
    const s = st.current
    const dt = Math.min(0.05, (now - s.last) / 1000)
    s.last = now
    const charging = s.holding || s.auto
    s.p = charging ? Math.min(1, s.p + dt / DUR) : Math.max(0, s.p - dt / 0.45)
    fx.charge = s.p
    setP(s.p)
    if (charging) audio.riser(s.p)
    if (s.p >= 1 && !s.done) { s.done = true; s.raf = 0; onEnter(); return }
    if (s.p <= 0 && !charging) { audio.riserStop(); s.raf = 0; return }
    s.raf = requestAnimationFrame(loop)
  }, [DUR, onEnter])

  const start = (auto: boolean) => {
    const s = st.current
    if (s.done) return
    audio.prime()
    if (auto) s.auto = true; else s.holding = true
    if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(loop) }
  }
  const release = () => { st.current.holding = false }
  useEffect(() => () => { cancelAnimationFrame(st.current.raf); fx.charge = 0 }, [])

  return (
    <section className={'welcome' + (out ? ' out' : '') + (p > 0.02 ? ' charging' : '')} style={{ ['--p' as string]: p }} aria-labelledby="welcome-title">
      <p className="mono kicker">NED University · CTGA-003</p>
      <h1 id="welcome-title" aria-label="Hello, I'm Aiman.">
        <span className="ln" aria-hidden="true"><Letters text="HELLO," base={0} /></span>
        <span className="ln red" aria-hidden="true"><Letters text="I'M AIMAN." base={7} /></span>
      </h1>
      <p className="wl">
        I build <span className="cycle" aria-hidden="true"><b>games</b><b>VR worlds</b><b>3D web experiences</b><b>motion</b></span>
        <span className="sr">games, VR worlds, 3D web experiences and motion</span>. Welcome to {BRAND.name}.
      </p>
      <div className="holdrow">
        <button
          className="hold"
          aria-label={`Enter ${BRAND.name} — press and hold, or press Enter`}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start(false) }}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(true) } }}
          onClick={(e) => { if (e.detail === 0) start(true) }}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="bg" cx="60" cy="60" r="54" />
            <circle className="fg" cx="60" cy="60" r="54" strokeDasharray="339.3" strokeDashoffset={339.3 * (1 - p)} />
          </svg>
          <span>HOLD<br />TO ENTER</span>
        </button>
        <p className="mono hint">Sound on — turn it up.<br />Hold the button, or press Enter.</p>
      </div>
      <button className="skip mono" onClick={onSkip}>Skip to classic view</button>
    </section>
  )
}

function Section({ island, index, onOpen }: { island: Island; index: number; onOpen: (gi: number, pi: number) => void }) {
  return (
    <section id={`s${index}`} className={`stage ${index % 2 ? 'right' : 'left'}`} style={{ ['--a' as string]: island.accent }} aria-labelledby={`h${index}`}>
      <div className="block">
        <div className="num" aria-hidden="true">{pad(index)}</div>
        <p className="mono cap">{pad(island.projects.length)} projects — click a pod in the scene or pick one below</p>
        <h2 id={`h${index}`}><span>{island.title[0]}</span><span>{island.title[1]}</span></h2>
        <ul className="rows">
          {island.projects.map((p, k) => (
            <li key={p.name}>
              <button data-peek={p.media?.[0] ? (p.media[0].img ?? `/media/${p.media[0].slug}.jpg`) : ''} onClick={() => onOpen(index - 2, k)}>
                <span className="ix mono">{pad(k + 1)}</span>
                <span className="nm">{p.name}</span>
                <span className="tg mono">{p.year ?? p.tag}</span>
                <span className="ar" aria-hidden="true">↗</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function App() {
  const [webgl] = useState(hasWebGL)
  const [classic, setClassic] = useState(() => !hasWebGL() || new URLSearchParams(location.search).has('classic'))
  const [near, setNear] = useState(0)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [stage, setStage] = useState<'intro' | 'entered'>('intro')
  const [sound, setSound] = useState(true)
  const [flash, setFlash] = useState(false)
  const [skill, setSkill] = useState<string | null>(null)
  const [fact, setFact] = useState<string | null>(null)
  const [year, setYear] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [questOpen, setQuestOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<Msg[]>([])
  const [open, setOpen] = useState<OpenState | null>(null)
  const lenis = useRef<Lenis | null>(null)
  const peek = useRef<HTMLDivElement>(null)
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const narrow = typeof innerWidth !== 'undefined' && innerWidth < 760
  const quality: Quality = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || narrow) ? 'low' : 'high'
  const entered = stage === 'entered'

  useEffect(() => {
    if (classic) return
    intro.t = 0
    scroll.progress = 0
    scroll.smooth = 0
    const l = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: !reduced })
    l.stop()
    lenis.current = l
    l.on('scroll', () => { scroll.progress = Math.min(1, Math.max(0, l.progress)) })
    let id = 0
    const raf = (t: number) => { l.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); l.destroy(); lenis.current = null }
  }, [classic, reduced])

  useEffect(() => {
    if (classic) return
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.25 })
    document.querySelectorAll('.stage').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [classic, entered])

  useEffect(() => {
    if (open || questOpen || chatOpen || contactOpen || !entered) lenis.current?.stop()
    else lenis.current?.start()
  }, [open, questOpen, chatOpen, contactOpen, entered])

  // she greets you as soon as the preloader lifts
  useEffect(() => {
    if (!loaded) return
    const id = setTimeout(() => avatarBus.wave(), 900)
    return () => clearTimeout(id)
  }, [loaded])

  useEffect(() => { audio.setSection(near) }, [near])
  // quest tracking: every event is something the visitor genuinely did
  useEffect(() => { if (entered) track('section:' + near) }, [near, entered])
  useEffect(() => { if (open) track(`project:${open.gi}:${open.pi}`) }, [open?.gi, open?.pi]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!skill) return
    const g = skill.startsWith('#') ? skill.slice(1) : SKILL_GROUPS.find((x) => x.skills.includes(skill))?.name
    if (g) track('skillcat:' + g)
  }, [skill])
  useEffect(() => { if (fact) track('fact:' + fact) }, [fact])
  useEffect(() => { if (year) track('year:' + year) }, [year])
  useEffect(() => { audio.duck(!!open) }, [open])

  // "Play the journey": steps through the years, the camera follows
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setYear((y) => {
        const i = y ? YEARS.indexOf(y) : -1
        if (i >= YEARS.length - 1) { setPlaying(false); return y }
        audio.note(i + 1)
        return YEARS[i + 1]
      })
    }, 3200)
    return () => clearInterval(id)
  }, [playing])

  const enter = useCallback(() => {
    audio.drop()
    track('enter')
    setSound(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
    fx.click.set(0, 0, 0) // shockwave across the floor
    fx.clickT = fx.time
    gsap.to(fx, { charge: 0, duration: 0.8 })
    gsap.to(intro, {
      t: 1,
      duration: reduced ? 0.01 : 3.6,
      ease: 'power3.inOut',
      onUpdate: () => { if (intro.t > 0.45) setStage('entered') },
      onComplete: () => setStage('entered'),
    })
  }, [reduced])

  const toggleSound = () => {
    const next = !sound
    audio.setMuted(!next)
    setSound(next)
  }

  const go = useCallback((i: number) => {
    const el = document.getElementById(i === 0 ? 'top' : `s${i}`)
    if (el && lenis.current) lenis.current.scrollTo(el, { duration: reduced ? 0 : 2.2 })
    else el?.scrollIntoView()
  }, [reduced])

  const openProject = useCallback((gi: number, pi: number, mi = 0) => setOpen({ gi, pi, mi }), [])
  const close = useCallback(() => setOpen(null), [])

  // hover preview that follows the cursor over project rows
  const hidePeek = useCallback(() => { if (peek.current) peek.current.style.opacity = '0' }, [])
  const onRowsMove = (e: React.MouseEvent) => {
    const p = peek.current
    if (!p) return
    const b = (e.target as HTMLElement).closest('button[data-peek]') as HTMLElement | null
    const src = b?.dataset.peek
    if (!src) return hidePeek()
    const img = p.firstElementChild as HTMLImageElement
    // only show once the picture is actually loaded — never an empty box
    if (img.getAttribute('src') !== src) {
      p.style.opacity = '0'
      img.onload = () => { p.style.opacity = '1' }
      img.onerror = hidePeek
      img.setAttribute('src', src)
    } else if (img.complete && img.naturalWidth > 0) p.style.opacity = '1'
    const x = Math.min(e.clientX + 26, innerWidth - 280)
    const y = Math.min(e.clientY + 24, innerHeight - 190)
    p.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(60, y)}px)`
  }
  useEffect(() => {
    // the preview must never get stranded when the page scrolls away from the row
    addEventListener('scroll', hidePeek, { passive: true })
    addEventListener('wheel', hidePeek, { passive: true })
    addEventListener('blur', hidePeek)
    return () => { removeEventListener('scroll', hidePeek); removeEventListener('wheel', hidePeek); removeEventListener('blur', hidePeek) }
  }, [hidePeek])
  useEffect(() => { if (open || questOpen || chatOpen || contactOpen) hidePeek() }, [open, questOpen, chatOpen, contactOpen, hidePeek])

  if (classic) return <Classic canReturn={webgl} onWorld={() => setClassic(false)} />

  return (
    <div className="world" id="top">
      <div className="canvas-wrap">
        <Suspense fallback={null}>
          <Scene quality={quality} reduced={reduced} narrow={narrow} near={entered ? near : -9} onSection={setNear} onReady={() => setReady(true)} onOpen={openProject} skill={skill} onSkill={setSkill} fact={fact} onFact={setFact} year={year} onYear={setYear} />
        </Suspense>
      </div>
      {!loaded && <Preloader ready={ready} onDone={() => setLoaded(true)} />}

      <header className="bar">
        <a className="word" href="#top" onClick={(e) => { e.preventDefault(); if (entered) go(0) }}>{BRAND.name}</a>
        <nav aria-label="Main" className="bar-r mono">
          {entered && <span className="where" aria-hidden="true">{pad(near)} / {pad(SECTION_COUNT - 1)} — {LABELS[near]}</span>}
          {entered && <button className="askbtn" onClick={() => setChatOpen(true)}>Ask Aiman AI</button>}
          {entered && <QuestButton onOpen={() => setQuestOpen(true)} />}
          {entered && <button className={'snd' + (sound ? ' on' : '')} onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Mute sound' : 'Turn sound on'}>
            <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>{sound ? 'Sound on' : 'Sound off'}
          </button>}
          <a className="dl" href={CV_URL} download="Syeda_Aiman_Munawar_CV.pdf">CV ↓</a>
          <button onClick={() => setClassic(true)}>Classic view</button>
        </nav>
      </header>

      {loaded && !entered && <Welcome onEnter={enter} onSkip={() => setClassic(true)} reduced={reduced} out={stage !== 'intro'} />}
      {flash && <div className="flash" aria-hidden="true" />}

      {entered && (
        <nav className="rail mono" aria-label="Destinations">
          {LABELS.map((l, i) => (
            <button key={l} className={near === i ? 'on' : ''} style={{ ['--a' as string]: ACCENTS[i] }} onClick={() => go(i)} aria-label={`Go to ${l}`} aria-current={near === i}>
              <span>{pad(i)}</span><em>{l}</em>
            </button>
          ))}
        </nav>
      )}

      <main className={'track' + (entered ? ' go' : '')} onMouseMove={onRowsMove} onMouseLeave={hidePeek}>
        <section className="stage left hero in" id="s0" aria-labelledby="h0" style={{ ['--a' as string]: ACCENTS[0] }}>
          <div className="block">
            <p className="mono cap">Beyond the Portfolio. Into the Experience.</p>
            <h1 id="h0"><span>SYEDA AIMAN</span><span>MUNAWAR</span></h1>
            <p className="mono sub">Game developer · 3D &amp; interactive · CS at NED University — CTGA-003</p>
            <p className="mono scrollhint"><i />Scroll to travel · click anything that glows</p>
          </div>
          <div className="ticker" aria-hidden="true"><div>{[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}</div></div>
        </section>
        <section id="s1" className="stage left" aria-labelledby="h1" style={{ ['--a' as string]: ACCENTS[1] }}>
          <div className="block">
            <div className="num" aria-hidden="true">01</div>
            <p className="mono cap">About · Karachi, Pakistan</p>
            <h2 id="h1"><span><Decode text="MEET" /></span><span><Decode text="AIMAN" /></span></h2>
            <p className="lead2">{ABOUT}</p>
            <div className="factchips mono" role="group" aria-label="Facts about Aiman — each one also appears as an orb around her">
              {FACTS.map((f, i) => (
                <button key={f.id} className={fact === f.id ? 'on' : ''} aria-pressed={fact === f.id} onClick={() => { audio.note(i); setFact(fact === f.id ? null : f.id) }}>{f.title}</button>
              ))}
            </div>
            {fact && <p className="mono factbody" aria-live="polite">{FACTS.find((f) => f.id === fact)?.body}</p>}
            <div className="cta">
              <button className="big-btn sm" onClick={() => avatarBus.play('Aiman_Greeting_Wave')}>Say hello</button>
              <button className="big-btn sm ghost" onClick={() => avatarBus.play('Aiman_Head_Movement')}>Watch her think</button>
              <a className="big-btn sm ghost" href={CV_URL} download="Syeda_Aiman_Munawar_CV.pdf">CV <b>↓</b></a>
            </div>
          </div>
        </section>
        {ISLANDS.map((isl, k) => <Section key={isl.id} island={isl} index={k + 2} onOpen={openProject} />)}
        <section id="s7" className="stage left long" aria-labelledby="h7" style={{ ['--a' as string]: ACCENTS[7] }}>
          <div className="block">
            <div className="num" aria-hidden="true">07</div>
            <p className="mono cap">Skills — grouped from my CV, not ranked</p>
            <h2 id="h7"><span><Decode text="SKILL" /></span><span><Decode text="CONSTELLATION" /></span></h2>
            <div className="cats mono" role="group" aria-label="Skill categories">
              {SKILL_GROUPS.map((g) => (
                <button key={g.name} className={skill === '#' + g.name ? 'on' : ''} style={{ ['--c' as string]: g.color }} aria-pressed={skill === '#' + g.name} onClick={() => setSkill(skill === '#' + g.name ? null : '#' + g.name)}>
                  <i />{g.name}
                </button>
              ))}
            </div>
            <div className="skillpanel" aria-live="polite">
              {!skill && <p className="mono hint2">Stars drift away from your cursor — hover or tap one. Pick a skill and beams link it to the projects that use it.</p>}
              {skill?.startsWith('#') && (() => {
                const g = SKILL_GROUPS.find((x) => x.name === skill.slice(1))!
                return (<><h3>{g.name}</h3><div className="tags">{g.skills.map((k) => <button key={k} className="mono" onClick={() => setSkill(k)}>{k}</button>)}</div></>)
              })()}
              {skill && !skill.startsWith('#') && (() => {
                const g = SKILL_GROUPS.find((x) => x.skills.includes(skill))!
                const used = projectsFor(skill)
                return (<>
                  <h3>{skill}</h3>
                  <p className="mono cat" style={{ ['--c' as string]: g.color }}><i />{g.name}</p>
                  {used.length ? (<><p className="mono hint2">Appears in {used.length} project{used.length === 1 ? '' : 's'}:</p><div className="tags">{used.map((u) => <button key={u.name} className="mono" onClick={() => openProject(u.gi, u.pi)}>{u.name.replace(/ — .*/, '')} ↗</button>)}</div></>) : (<p className="mono hint2">Listed on my CV; none of my project case files mention it by name.</p>)}
                </>)
              })()}
            </div>
          </div>
        </section>
        <section id="s8" className="stage left long" aria-labelledby="h8" style={{ ['--a' as string]: ACCENTS[8] }}>
          <div className="block">
            <div className="num" aria-hidden="true">08</div>
            <p className="mono cap">Education · training · projects by year</p>
            <h2 id="h8"><span><Decode text="THE" /></span><span><Decode text="JOURNEY" /></span></h2>
            <div className="jgrid">
              <div><h4 className="mono">Education</h4><p><b>{EDUCATION.degree}</b><br />{EDUCATION.school}<br />{EDUCATION.span}</p><p>{EDUCATION.matric}</p></div>
              <div><h4 className="mono">Experience</h4>{EXPERIENCE.map((x) => <p key={x.org}><b>{x.role}</b><br />{x.org}<br />{x.duration}</p>)}</div>
              <div><h4 className="mono">CEGA training</h4><ul>{EDUCATION.cega.map((c) => <li key={c}>{c}</li>)}</ul></div>
              <div><h4 className="mono">Achievement</h4><p>{EDUCATION.achievement}</p></div>
            </div>
            <div className="yeartabs mono" role="tablist" aria-label="Years">
              {YEARS.map((y) => (
                <button key={y} role="tab" aria-selected={year === y} className={year === y ? 'on' : ''} onClick={() => { setPlaying(false); setYear(year === y ? null : y) }}>{y}<i>{BY_YEAR[y].length || '·'}</i></button>
              ))}
              <button className={'play' + (playing ? ' on' : '')} onClick={() => { if (playing) { setPlaying(false) } else { setYear(YEARS[0]); setPlaying(true) } }}>{playing ? '■ Stop' : '▶ Play the journey'}</button>
            </div>
            <div className="yearpanel" aria-live="polite">
              {!year && <p className="mono hint2">Pick a year — or press play — and the camera glides to it.</p>}
              {year && (
                <>
                  {BY_YEAR[year].length === 0 && <p className="yeartitle">{YEAR_NOTE[year]}</p>}
                  <div className="posters">
                    {BY_YEAR[year].map((it) => {
                      const pr = ISLANDS[it.gi].projects[it.pi]
                      const th = thumbOf(pr)
                      return (
                        <button key={it.name} style={{ ['--c' as string]: ISLANDS[it.gi].accent }} onClick={() => openProject(it.gi, it.pi)} aria-label={`Open ${it.name}`}>
                          {th ? <img src={th} alt="" loading="lazy" /> : <span className="noimg mono">no media</span>}
                          <em className="mono">{it.name.replace(/ — .*/, '')}</em>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
        <section id="s9" className="stage left end in" aria-labelledby="h9" style={{ ['--a' as string]: ACCENTS[9] }}>
          <div className="block">
            <p className="mono cap">09 — Contact</p>
            <h2 id="h9"><span>LET'S BUILD</span><span>SOMETHING</span></h2>
            <div className="cta">
              <button className="big-btn" onClick={() => setContactOpen(true)}>Send a message <b>→</b></button>
              <a className="big-btn ghost" href={CV_URL} download="Syeda_Aiman_Munawar_CV.pdf">Download CV <b>↓</b></a>
              <a className="big-btn ghost" href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn <b>↗</b></a>
            </div>
            <div className="cta">
              <button className="big-btn ghost" onClick={() => setChatOpen(true)}>Ask Aiman AI <b>→</b></button>
              <button className="big-btn ghost" onClick={() => setPromoOpen(true)}>Watch the promo <b>▶</b></button>
            </div>
            <p className="mono sub">Messages go straight to Aiman's inbox.</p>
          </div>
        </section>
      </main>
      <div className="peek" ref={peek} aria-hidden="true"><img alt="" /></div>

      {questOpen && <Dashboard onClose={() => setQuestOpen(false)} />}
      {contactOpen && <Contact onClose={() => setContactOpen(false)} />}
      {promoOpen && <PromoVideo onClose={() => setPromoOpen(false)} />}
      {chatOpen && <Chat msgs={chatMsgs} setMsgs={setChatMsgs} onClose={() => setChatOpen(false)} onProject={openProject} onSection={go} />}
      {open && <CaseSheet island={ISLANDS[open.gi]} state={open} flat={FLAT} onChange={setOpen} onClose={close} />}
    </div>
  )
}
