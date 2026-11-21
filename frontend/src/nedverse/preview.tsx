// Dev-only preview of the NEDVERSE environment prototype (nedverse.html). Not part of the production build.
import { createRoot } from 'react-dom/client'
import PrototypeScene from './PrototypeScene'
const q = new URLSearchParams(location.search)
const cam = q.get('cam') ?? '1'
createRoot(document.getElementById('root')!).render(<PrototypeScene camId={cam} still={q.get('still') === '1'} free={q.get('free') === '1'} />)
window.addEventListener('keydown', (e) => { if (/^[1-6]$/.test(e.key)) { q.set('cam', e.key); location.search = q.toString() } })
