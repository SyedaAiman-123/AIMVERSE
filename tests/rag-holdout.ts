/** Held-out questions written AFTER tuning the retrieval thresholds. Reported as-is, never used for tuning. */
import { answer, retrieve } from '../frontend/api/_rag/engine'

const OK: { q: string; ref?: string[]; has?: string }[] = [
  { q: 'What did Aiman make in Unity?', ref: ['project:0:2', 'project:0:3', 'project:2:0', 'project:2:1', 'project:0:5'] },
  { q: 'Has she worked with MongoDB?', ref: ['project:0:0'], has: 'MongoDB' },
  { q: 'How many projects does she have?', has: '15' },
  { q: 'Tell me about the drone app', ref: ['project:2:2'] },
  { q: "What is Chef's Special?", ref: ['project:4:0'] },
  { q: 'What did she do in the CEGA training?', has: 'CEGA' },
]
const NO = [
  'What is the weather in Karachi today?',
  'Can you help me with my calculus homework?',
  'Who is the president of Pakistan?',
  'What is her favourite food?',
  'Give me some stock tips',
  'What does Kubernetes do?',
]
async function main() {
let a = 0, b = 0
for (const t of OK) {
  const r = retrieve(t.q, null, 5, {})
  const top = r.hits.slice(0, 3)
  const refOk = !!t.ref && top.some((h) => t.ref!.includes(h.chunk.ref))
  const hasOk = !!t.has && top.some((h) => h.chunk.text.toLowerCase().includes(t.has!.toLowerCase()))
  const pass = (refOk || hasOk) && (await answer(t.q, [], {})).mode !== 'refusal' // an answer-bearing passage suffices
  if (pass) a++
  console.log(pass ? 'PASS' : 'FAIL', '|', t.q, '|', top.map((h) => h.chunk.ref).join(','), '| conf', r.bmConf.toFixed(2))
}
for (const q of NO) {
  const res = await answer(q, [], {})
  const pass = res.mode === 'refusal' || res.mode === 'blocked'
  if (pass) b++
  console.log(pass ? 'PASS' : 'FAIL', '|', q, '|', res.mode, '| conf', retrieve(q, null, 5, {}).bmConf.toFixed(2))
}
console.log(`HOLDOUT answerable ${a}/${OK.length}, must-refuse ${b}/${NO.length}`)
}
main()
