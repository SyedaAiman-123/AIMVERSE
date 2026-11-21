// NEDVERSE (Quest Mode) production entry, served at /nedverse.html. Falls back to a plain page when WebGL is unavailable.
import { createRoot } from 'react-dom/client'
import PlayScene from './PlayScene'
import { BRAND } from '../brand'

const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }
const touch = new URLSearchParams(location.search).get('touch') === '1' || matchMedia('(pointer: coarse)').matches
createRoot(document.getElementById('root')!).render(
  hasWebGL() ? <PlayScene touch={touch} /> : (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, color: '#ece7db', font: '16px system-ui', textAlign: 'center' }}>
      <div><h1 style={{ margin: 0 }}>{BRAND.quest}</h1><p>This browser cannot show the 3D campus. Everything is also available in the regular {BRAND.name} portfolio.</p><p><a style={{ color: '#4DF3C8' }} href="/">Open the {BRAND.name} portfolio</a></p></div>
    </div>
  ),
)
