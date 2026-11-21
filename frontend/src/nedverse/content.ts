import { BY_YEAR, EDUCATION, EXPERIENCE, FACTS, FLAT, ISLANDS, LINKEDIN, SKILL_GROUPS, YEARS, projectsFor, thumbOf } from '../data'
import { STOPS, stopById, type StopCard } from './tour'
import { ZONES } from './layout'

/* Builds the panel shown for every interactive object. Every field comes from data.ts (the CV / owner-supplied facts used by the main
   portfolio). Missing facts are simply left out - never invented. */

export type Panel = StopCard & { accent: string; hero?: { img?: string; video?: string; alt: string }; chips?: string[] }

function projectPanel(gi: number, pi: number): Panel {
  const isl = ISLANDS[gi], p = isl.projects[pi], poster = thumbOf(p)
  const m = p.media?.[0], video = m && !m.img && !m.illustrative ? `/media/${m.slug}.mp4` : undefined
  const sections: Panel['sections'] = []
  sections.push({ sub: [p.tag, p.year, p.team].filter(Boolean).join(' · '), p: p.blurb })
  if (p.role) sections.push({ h: 'My contribution', p: p.role })
  if (p.context) sections.push({ h: 'Context', p: p.context })
  if (p.highlight) sections.push({ h: 'Highlight', p: p.highlight })
  if (p.features?.length) sections.push({ h: 'Features', items: p.features })
  if (p.built?.length) sections.push({ h: 'How it was built', items: p.built })
  if (p.learned) sections.push({ h: 'What I learned', p: p.learned })
  if (p.note) sections.push({ p: p.note })
  if (p.media?.length) sections.push({ h: 'Media', items: p.media.map((x) => x.label + (x.desc ? ' — ' + x.desc : '')) })
  if (p.link) sections.push({ link: { href: p.link.href, label: p.link.label } })
  return { kicker: `Workstation · ${isl.title.join(' ')}`, title: p.name, accent: isl.accent, sections, chips: p.stack, hero: poster || video ? { img: poster ?? undefined, video, alt: p.name } : undefined }
}

function skillPanel(i: number): Panel {
  const g = SKILL_GROUPS[i]
  return {
    kicker: 'Library · Skill shelf', title: g.name, accent: g.color, chips: g.skills,
    sections: [{ p: 'Where each skill appears in my projects (matched from the projects\' own descriptions):' }, ...g.skills.map((s) => { const ps = projectsFor(s).map((x) => x.name); return { h: s, p: ps.length ? ps.join(' · ') : 'Learning / coursework — no project listed yet.' } })],
  }
}

function factPanel(id: string): Panel | null {
  const f = FACTS.find((x) => x.id === id); if (!f) return null
  const sections: Panel['sections'] = [{ p: f.body }]
  if (id === 'edu') sections.push({ items: [`${EDUCATION.degree}`, `${EDUCATION.school}`, EDUCATION.span] })
  if (id === 'matric') sections.push({ p: EDUCATION.matric })
  if (id === 'speech') sections.push({ p: EDUCATION.achievement })
  if (id === 'cega') sections.push({ items: EDUCATION.cega })
  if (id === 'kda') sections.push({ items: EXPERIENCE.map((e) => `${e.role} · ${e.org} · ${e.duration}`), p: 'Duties and dates beyond this have not been supplied, so none are claimed.' })
  if (id === 'projects') sections.push(...YEARS.filter((y) => BY_YEAR[y].length).map((y) => ({ h: y, p: BY_YEAR[y].map((p) => p.name).join(' · ') })))
  if (id === 'engines') sections.push({ p: 'Unity (2D/3D), Unreal Engine 5, Three.js — see the Library shelves for the full skill list.' })
  return { kicker: 'Exhibition · Milestone', title: f.title, accent: '#FFC53D', sections }
}

function kioskPanel(): Panel {
  return {
    kicker: 'Welcome kiosk', title: 'Campus map', accent: '#4DF3C8',
    sections: [
      { p: 'An unofficial, student-created exploration of an NED-inspired campus. Drive or walk; stops open as you reach them.' },
      { h: 'Zones', items: ZONES.map((z) => `${z.id} · ${z.name}${z.id === 'C' ? ' — walk in: 15 project workstations' : z.id === 'D' ? ' — walk in: 6 skill shelves' : z.id === 'F' ? ' — walk in: milestones and achievements' : ''}`) },
      { h: 'Tour stops (by car or on foot)', items: STOPS.map((s) => s.name) },
      { p: 'Look at the mini-map (top-left) for your position. Press Esc to pause or leave to the regular portfolio.' },
    ],
  }
}

/** Panel for any interactive id, or null (plain cards are handled by the HUD). */
export function getPanel(id: string): Panel | null {
  if (id.startsWith('stop:')) { const s = stopById(id.slice(5)); return s ? { ...s.card, accent: s.color } : null }
  if (id.startsWith('proj:')) { const [, gi, pi] = id.split(':').map(Number) as [string, number, number]; return ISLANDS[gi]?.projects[pi] ? projectPanel(gi, pi) : null }
  if (id.startsWith('skill:')) { const i = +id.slice(6); return SKILL_GROUPS[i] ? skillPanel(i) : null }
  if (id.startsWith('fact:')) return factPanel(id.slice(5))
  if (id === 'kiosk') return kioskPanel()
  return null
}
export const PROJECT_COUNT = FLAT.length
export const LINKEDIN_URL = LINKEDIN
