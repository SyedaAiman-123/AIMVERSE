/** Fresh held-out set, written after all tuning and run ONCE. Reported as-is. */
import { answer, retrieve } from '../frontend/api/_rag/engine'

const OK: { q: string; ref?: string[]; has?: string }[] = [
  { q: 'What is the Virtual Board built with?', has: 'OpenCV' },
  { q: 'When did she make Dungeon 2D Crawler?', ref: ['project:0:2'], has: '2025' },
  { q: 'Tell me about her mobile app project', ref: ['project:2:2'] },
  { q: 'Who were her teammates in the game jam at TechFest 2024?', ref: ['project:0:4'], has: 'Rafia' },
  { q: 'What did she do for Between Waking animatics?', ref: ['project:4:1'] },
  { q: 'Does she have experience with React Native?', has: 'React Native' },
]
const NO = ['What is the meaning of life?', 'Can you recommend a good restaurant in Lahore?', 'What is her opinion on politics?', 'Translate hello to French']

async function main() {
  let a = 0, b = 0
  for (const t of OK) {
    const top = retrieve(t.q, null, 5, {}).hits.slice(0, 3)
    const refOk = !!t.ref && top.some((h) => t.ref!.includes(h.chunk.ref))
    const hasOk = !!t.has && top.some((h) => h.chunk.text.toLowerCase().includes(t.has!.toLowerCase()))
    const pass = (refOk || hasOk) && (await answer(t.q, [], {})).mode !== 'refusal'
    if (pass) a++
    console.log(pass ? 'PASS' : 'FAIL', '|', t.q, '|', top.map((h) => h.chunk.ref).join(','))
  }
  for (const q of NO) {
    const res = await answer(q, [], {})
    const pass = res.mode === 'refusal' || res.mode === 'blocked'
    if (pass) b++
    console.log(pass ? 'PASS' : 'FAIL', '|', q, '|', res.mode)
  }
  console.log(`HOLDOUT-2 answerable ${a}/${OK.length}, must-refuse ${b}/${NO.length}`)
}
main()
