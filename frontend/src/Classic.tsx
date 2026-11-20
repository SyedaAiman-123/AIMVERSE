import { useState } from 'react'
import { CV_URL, EXPERIENCE, FLAT, ISLANDS, LINKEDIN, SKILLS } from './data'
import CaseSheet, { type OpenState } from './CaseSheet'
import Contact from './Contact'
import PromoVideo from './PromoVideo'
import { BRAND } from './brand'

export default function Classic({ canReturn, onWorld }: { canReturn: boolean; onWorld: () => void }) {
  const [open, setOpen] = useState<OpenState | null>(null)
  const [contact, setContact] = useState(false)
  const [promo, setPromo] = useState(false)
  return (
    <div className="classic">
      <a className="skip-link" href="#content">Skip to content</a>
      <header className="bar solid">
        <a className="word" href="#home">{BRAND.name}</a>
        <nav aria-label="Sections" className="bar-r mono">
          <a href="#about">About</a><a href="#skills">Skills</a><a href="#projects">Projects</a><a href="#education">Education</a><a href="#contact">Contact</a>
          <a className="dl" href={CV_URL} download="Syeda_Aiman_Munawar_CV.pdf">CV ↓</a>
          {canReturn && <button onClick={onWorld}>3D view</button>}
        </nav>
      </header>
      <main id="content" tabIndex={-1}>
        <section className="c-hero" id="home">
          <p className="mono cap">Beyond the Portfolio. Into the Experience.</p>
          <h1><span>SYEDA AIMAN</span><span>MUNAWAR</span></h1>
          <p className="mono sub">Game Developer | 3D &amp; Interactive Applications | Computer Science</p>
          <a className="big-btn" href={CV_URL} download="Syeda_Aiman_Munawar_CV.pdf">Download CV <b>↓</b></a>
        </section>

        <section id="about">
          <h2>About</h2>
          <p className="lead">Computer Science student at NED University of Engineering and Technology with hands-on experience building interactive applications across game development, immersive VR/XR, 3D web technologies, computer vision, and creative motion design. Experienced with Unity, Unreal Engine 5, Three.js, React Native, Python, C#, C++, and related development tools. Interested in creating engaging digital experiences that combine programming, interaction, and visual design.</p>
        </section>

        <section id="skills">
          <h2>Technical skills</h2>
          <dl className="skills">{SKILLS.map(([k, v]) => (<div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>))}</dl>
        </section>

        <section id="projects">
          <h2>Projects</h2>
          {ISLANDS.map((i, gi) => (
            <div key={i.id} className="group" style={{ ['--a' as string]: i.accent }}>
              <h3>{i.title.join(' ')}</h3>
              <div className="cards">
                {i.projects.map((p, pi) => (
                  <article key={p.name} className="card">
                    {p.media ? (
                      <button className="thumb" onClick={() => setOpen({ gi, pi, mi: 0 })} aria-label={`Open ${p.name}`}>
                        <img src={p.media[0].img ?? `/media/${p.media[0].slug}.jpg`} alt={p.media[0].illustrative ? `Illustration for ${p.name}` : `Still from ${p.name}`} loading="lazy" /><span className="mono">Open ↗</span>
                      </button>
                    ) : (<div className="thumb empty mono">No media supplied</div>)}
                    <p className="mono cap">{p.tag}</p>
                    <h4>{p.name}</h4>
                    <p>{p.blurb}</p>
                    {p.note && <p className="mono note">{p.note}</p>}
                    <p className="mono meta">{p.year ?? 'Year: to be added'} · {p.team ?? 'Team: to be added'}</p>
                    <button className="more mono" onClick={() => setOpen({ gi, pi, mi: 0 })}>Full case file →</button>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section id="education">
          <h2>Education, training &amp; achievement</h2>
          <ul className="plain">
            {EXPERIENCE.map((x) => <li key={x.org}><strong>Experience</strong> — {x.role}, {x.org} ({x.duration})</li>)}
            <li><strong>BS Computer Science &amp; IT</strong> — NED University of Engineering and Technology, 2023 – Present</li>
            <li><strong>Matriculation</strong> — 98.3%, Position Holder</li>
            <li><strong>Centre of Excellence for Game Development (CEGA)</strong> — Pre-Production Track; Unreal Engine Production Track; Post-Production — After Effects &amp; Motion</li>
            <li><strong>Achievement</strong> — All-Pakistan Speech Competition, Winner</li>
          </ul>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p><a href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn — Syeda Aiman Munawar ↗</a></p>
          <p><button className="big-btn sm" onClick={() => setContact(true)}>Send a message <b>→</b></button>{' '}
            <button className="big-btn sm ghost" onClick={() => setPromo(true)}>Watch the promo <b>▶</b></button></p>
        </section>
      </main>
      <footer className="mono">© Syeda Aiman Munawar · NED University · Roll No. CTGA-003</footer>
      {contact && <Contact onClose={() => setContact(false)} />}
      {promo && <PromoVideo onClose={() => setPromo(false)} />}
      {open && <CaseSheet island={ISLANDS[open.gi]} state={open} flat={FLAT} onChange={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}
