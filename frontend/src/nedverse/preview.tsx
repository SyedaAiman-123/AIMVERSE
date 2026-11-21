// Dev-only preview of the NEDVERSE environment (nedverse.html). Not part of the production build.
//   ?play=1          -> playable third-person mode (WASD, Shift, mouse, E)      ?touch=1 -> force touch controls
//   ?cam=1..6[&free=1] -> fixed camera presets of the Phase 3 prototype
import { createRoot } from 'react-dom/client'
import PrototypeScene from './PrototypeScene'
import PlayScene from './PlayScene'
const q = new URLSearchParams(location.search)
const root = createRoot(document.getElementById('root')!)
if (q.get('play') === '1') { document.querySelector('.tag')?.remove(); root.render(<PlayScene touch={q.get('touch') === '1' || matchMedia('(pointer: coarse)').matches} />) }
else {
  root.render(<PrototypeScene camId={q.get('cam') ?? '1'} still={q.get('still') === '1'} free={q.get('free') === '1'} />)
  window.addEventListener('keydown', (e) => { if (/^[1-6]$/.test(e.key)) { q.set('cam', e.key); location.search = q.toString() } })
}
