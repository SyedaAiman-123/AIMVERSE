import { ABOUT, CV_URL, EDUCATION, EXPERIENCE, FACTS, ISLANDS, LINKEDIN, SKILL_GROUPS } from '../data'

/* The campus tour: visible roadside "portfolio stops". Every word on a stop's card comes from data.ts (the same CV / owner-supplied
   facts the main portfolio uses) — nothing is duplicated or invented here. Order = suggested route (no timer, nothing is missable). */

export type CardSection = { h?: string; sub?: string; p?: string; items?: string[]; link?: { href: string; label: string } }
export type StopCard = { kicker: string; title: string; sections: CardSection[]; links?: { href: string; label: string }[] }
export type Stop = { id: string; x: number; z: number; rot: number; color: string; name: string; sign: [string, string]; card: StopCard }

const projectSections = (id: string): CardSection[] =>
  ISLANDS.find((i) => i.id === id)!.projects.map((p) => ({
    h: p.name, sub: [p.tag, p.year, p.team].filter(Boolean).join(' · '), p: p.blurb, link: p.link ? { href: p.link.href, label: p.link.label } : undefined,
  }))

const island = (id: string, x: number, name: string, kicker: string): Stop => {
  const isl = ISLANDS.find((i) => i.id === id)!
  return { id, x, z: 14, rot: 0, color: isl.accent, name, sign: [isl.title[0] + ' ' + isl.title[1], `${isl.projects.length} project${isl.projects.length > 1 ? 's' : ''}`], card: { kicker, title: isl.title.join(' '), sections: projectSections(id) } }
}

export const STOPS: Stop[] = [
  { id: 'about', x: 8, z: -5.5, rot: Math.PI / 2, color: '#4DF3C8', name: 'About Syeda Aiman', sign: ['ABOUT & EDUCATION', 'Start here'],
    card: { kicker: 'Stop 1 · Welcome', title: 'Syeda Aiman Munawar', sections: [
      { p: ABOUT },
      { h: EDUCATION.degree, sub: `${EDUCATION.school} · ${EDUCATION.span}` },
      { h: 'Highlights', items: [EDUCATION.matric, EDUCATION.achievement, 'CEGA training — ' + EDUCATION.cega.join(' · '), ...EXPERIENCE.map((e) => `${e.role} · ${e.org} · ${e.duration}`)] },
      { h: 'Quick facts', items: FACTS.filter((f) => ['projects', 'engines'].includes(f.id)).map((f) => `${f.title} — ${f.body}`) },
    ] } },
  island('game', -22, 'Game Development', 'Stop 2 · Projects'),
  island('cyber', -34, 'Cyber & 3D Web', 'Stop 3 · Projects'),
  island('vr', -46, 'VR & Immersive', 'Stop 4 · Projects'),
  island('ai', -58, 'AI & Computer Vision', 'Stop 5 · Projects'),
  island('motion', -70, 'Motion & Animation', 'Stop 6 · Projects'),
  { id: 'skills', x: -62, z: 28.4, rot: Math.PI, color: '#A58BFF', name: 'Skills & tools', sign: ['SKILLS & TOOLS', `${SKILL_GROUPS.length} categories`],
    card: { kicker: 'Stop 7 · Skills', title: 'Skills & tools', sections: SKILL_GROUPS.map((g) => ({ h: g.name, p: g.skills.join(' · ') })) } },
  { id: 'contact', x: 30, z: -9.6, rot: 0, color: '#FFC53D', name: 'Contact & CV', sign: ['CONTACT & CV', 'Say hello'],
    card: { kicker: 'Stop 8 · Contact', title: "Let's connect", sections: [{ p: 'Thank you for visiting. You can read the full CV or connect on LinkedIn — or exit to the regular AIMVERSE portfolio from the pause menu (Esc) to use the contact form.' }], links: [{ href: LINKEDIN, label: 'LinkedIn' }, { href: CV_URL, label: 'Download CV (PDF)' }] } },
]

export const stopById = (id: string) => STOPS.find((s) => s.id === id)
