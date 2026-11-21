import { useEffect, useMemo, useRef, useState } from 'react'
import { FACTS, FLAT, SKILL_GROUPS } from '../data'
import { BRAND } from '../brand'
import { useFocusTrap } from './focus'

/** The ending: shown once when every quest is complete (and from the journal on request). Cinematic letterbox, three title cards,
    then a choice: return to the AIMVERSE portfolio, or keep exploring. */
export function Finale({ onKeep }: { onKeep: () => void }) {
  const slides = useMemo(() => [
    { big: 'You have explored NEDVERSE.', small: 'Every zone visited. Every milestone opened.', note: `${FLAT.length} projects · ${SKILL_GROUPS.length} skill shelves · ${FACTS.length} milestones` },
    { big: '2023 → today', small: 'It began with one decision to study Computer Science & IT.', note: 'Games, VR, 3D web, computer vision and motion design.' },
    { big: 'MUCH MORE TO COME', small: 'in the career ahead.', note: `${BRAND.owner}` },
  ], [])
  const [i, setI] = useState(0), box = useRef<HTMLDivElement>(null)
  const last = i >= slides.length
  useEffect(() => { if (last) return; const t = setTimeout(() => setI((k) => k + 1), i === slides.length - 1 ? 4200 : 3600); return () => clearTimeout(t) }, [i, last, slides.length])
  useFocusTrap(box, last)
  const sl = slides[Math.min(i, slides.length - 1)]
  return (
    <div className="nv-story nv-finale" ref={box} role="dialog" aria-modal="true" aria-label="The end of the tour">
      <div className="nv-bar top" /><div className="nv-bar bot" />
      {!last && <div className="nv-slide" key={i}><b>{sl.big}</b><span>{sl.small}</span><em>{sl.note}</em></div>}
      {last && (
        <div className="nv-end">
          <div className="nv-confetti wide" aria-hidden>{Array.from({ length: 40 }, (_, k) => <i key={k} style={{ left: `${(k * 29) % 100}%`, background: ['#4DF3C8', '#FFC53D', '#FF3D8B', '#A58BFF', '#ffffff'][k % 5], animationDelay: `${(k % 11) * 0.12}s`, animationDuration: `${2 + (k % 5) * 0.4}s` }} />)}</div>
          <b>MUCH MORE TO COME</b><span>in the career ahead.</span>
          <p>Thank you for exploring {BRAND.quest}.</p>
          <div className="nv-row">
            <a className="nv-btn" href="/" autoFocus>Return to the {BRAND.name} portfolio</a>
            <button className="nv-btn ghost" onClick={onKeep}>Keep exploring</button>
          </div>
        </div>
      )}
      {!last && <button className="nv-skip" onClick={() => setI(slides.length)}>Skip ▸</button>}
    </div>
  )
}
