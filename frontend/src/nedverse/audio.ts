/* NEDVERSE sound: everything is synthesised with WebAudio (no audio files, nothing downloaded or copyrighted).
   Engine hum that follows the car's speed, footsteps, car door + start-up, horn, impact thud, stop chime, UI click,
   wind ambience and distant birds once on campus. M (or the speaker button) mutes; the choice is remembered. */

type Ctx = AudioContext
const KEY = 'aimverse:nedverse:mute'
let ctx: Ctx | null = null, master: GainNode | null = null
let eng: { o1: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; g: GainNode } | null = null
let wind: { g: GainNode; bp: BiquadFilterNode } | null = null
let horn: { o: OscillatorNode[]; g: GainNode } | null = null
let noiseBuf: AudioBuffer | null = null
let volume = 0.8
let muted = (() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })()
const subs = new Set<() => void>()
let stepDist = 0, birdT = 4
// ---- generative background music: pads + pulsing bass + soft kick/hats + a brighter pluck melody over C - G - Am - F, 100 bpm.
//      "energy" rises while you drive and fades when you stand still, so the score follows the play without ever getting loud. ----
let musicBus: GainNode | null = null, echo: DelayNode | null = null, nextBar = 0, barIdx = 0, musicTimer = 0, energy = 0.3, energyTarget = 0.3, barsScheduled = 0
const CH = [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 261.63]]
const BASS = [65.41, 49, 55, 43.65]
const BEAT = 60 / 100
function kick(t: number, vol: number) {
  if (!ctx || !musicBus) return
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.22)
}
function hat(t: number, vol: number) {
  if (!ctx || !musicBus || !noiseBuf) return
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.05); s.connect(hp); hp.connect(g); g.connect(musicBus); s.start(t, Math.random(), 0.07)
}
function scheduleBar(t: number, i: number) {
  if (!ctx || !musicBus || !echo) return
  const ch = CH[i % 4], bar = BEAT * 4, e = energy
  barsScheduled++
  ch.forEach((f, k) => {   // pad: two soft oscillators per note through a low-pass
    [0, 5].forEach((det) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain(), lp = ctx!.createBiquadFilter()
      o.type = k === 0 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det - 2; lp.type = 'lowpass'; lp.frequency.value = 1300 + e * 900
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.026, t + 0.9); g.gain.setValueAtTime(0.026, t + bar - 0.7); g.gain.linearRampToValueAtTime(0.0001, t + bar + 0.6)
      o.connect(lp); lp.connect(g); g.connect(musicBus!); o.start(t); o.stop(t + bar + 0.8)
    })
  })
  for (let n = 0; n < 8; n++) {   // pulsing eighth-note bass (octave jumps give it drive)
    const tt = t + n * BEAT * 0.5, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter()
    o.type = 'triangle'; o.frequency.value = BASS[i % 4] * (n % 4 === 3 ? 2 : 1); lp.type = 'lowpass'; lp.frequency.value = 420
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.05 + 0.04 * e, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0006, tt + BEAT * 0.45)
    o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(tt); o.stop(tt + BEAT * 0.5)
  }
  for (let b = 0; b < 4; b++) { if (b % 2 === 0 || e > 0.55) kick(t + b * BEAT, 0.07 + 0.1 * e) }       // soft kick on 1 and 3 (all four beats when driving)
  for (let b = 0; b < 8; b++) { if (b % 2 === 1 || e > 0.7) hat(t + b * BEAT * 0.5, 0.012 + 0.03 * e) }   // off-beat hats
  for (let n = 0; n < 8; n++) {   // brighter arpeggio, denser with energy
    if (Math.random() > 0.55 + 0.35 * e) continue
    const tt = t + n * BEAT * 0.5, f = ch[Math.floor(Math.random() * 3)] * (Math.random() < 0.5 ? 2 : 1)
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.034, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0004, tt + 0.55)
    o.connect(g); g.connect(musicBus); g.connect(echo); o.start(tt); o.stop(tt + 0.6)
  }
}
function startMusic() {
  if (!ctx || !master || musicBus) return
  musicBus = ctx.createGain(); musicBus.gain.value = 0.9; musicBus.connect(master)
  echo = ctx.createDelay(1); echo.delayTime.value = BEAT * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.38; const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'; lpf.frequency.value = 1800; const wet = ctx.createGain(); wet.gain.value = 0.5
  echo.connect(lpf); lpf.connect(fb); fb.connect(echo); lpf.connect(wet); wet.connect(musicBus)
  nextBar = ctx.currentTime + 0.3
  musicTimer = window.setInterval(() => { if (!ctx) return; while (nextBar < ctx.currentTime + 2) { scheduleBar(nextBar, barIdx++); nextBar += BEAT * 4 } }, 400)
}

const safe = (fn: () => void) => { try { fn() } catch { /* audio is optional */ } }

export const audio = {
  get muted() { return muted },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
  /** must be called from a user gesture (first key press / click) */
  start() {
    safe(() => {
      if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return }
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ctx.destination)
      // noise buffer (shared)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      // engine: two detuned oscillators through a low-pass
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain()
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 300; g.gain.value = 0
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o1.start(); o2.start(); eng = { o1, o2, lp, g }
      // wind bed
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6
      const wg = ctx.createGain(); wg.gain.value = 0.02; n.connect(bp); bp.connect(wg); wg.connect(master); n.start(); wind = { g: wg, bp }
      startMusic()
    })
  },
  setMuted(m: boolean) {
    muted = m; try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* private mode */ }
    safe(() => { if (master && ctx) master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.05) })
    subs.forEach((f) => f())
  },
  setVolume(v: number) { volume = Math.min(1, Math.max(0, v)); safe(() => { if (master && ctx && !muted) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05) }) },
  toggle() { audio.setMuted(!muted); if (!muted) audio.click() },

  /** called every frame with the live state */
  update(o: { driving: boolean; carV: number; footSpeed: number; onFoot: boolean; dt: number; campus: boolean }) {
    if (!ctx || !eng || !wind) return
    safe(() => {
      const t = ctx!.currentTime, v = Math.abs(o.carV)
      energyTarget = o.driving ? 0.55 + Math.min(0.4, v / 40) : o.footSpeed > 0.4 ? 0.4 : 0.25; energy += (energyTarget - energy) * Math.min(1, o.dt * 0.6)
      const on = o.driving
      eng!.g.gain.setTargetAtTime(on ? 0.05 + Math.min(0.08, v * 0.004) : 0, t, 0.12)
      const f = 46 + v * 6.2 + (on ? 8 : 0)
      eng!.o1.frequency.setTargetAtTime(f, t, 0.08); eng!.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08)
      eng!.lp.frequency.setTargetAtTime(260 + v * 38, t, 0.1)
      wind!.g.gain.setTargetAtTime(0.018 + Math.min(0.1, v * 0.0055), t, 0.2); wind!.bp.frequency.setTargetAtTime(420 + v * 40, t, 0.2)
      // footsteps: one per stride length covered
      if (o.onFoot && o.footSpeed > 0.4) { stepDist += o.footSpeed * o.dt; const stride = o.footSpeed > 4 ? 1.35 : 0.9; if (stepDist >= stride) { stepDist = 0; audio.step(o.footSpeed > 4) } } else stepDist = 0.5
      // birds on campus
      if (o.campus) { birdT -= o.dt; if (birdT <= 0) { birdT = 3.5 + Math.random() * 6; audio.bird() } }
    })
  },

  step(run: boolean) {
    safe(() => {
      if (!ctx || !master || !noiseBuf || muted) return
      const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.4
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = run ? 1300 : 900; const g = ctx.createGain()
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(run ? 0.14 : 0.09, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.11)
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random(), 0.14)
    })
  },
  door() {
    safe(() => {
      if (!ctx || !master || !noiseBuf || muted) return
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25)
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const ng = ctx.createGain()
      ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06); s.connect(f); f.connect(ng); ng.connect(master); s.start(t, 0, 0.08)
    })
  },
  /** ignition: a short rising rumble */
  ignition() {
    safe(() => {
      if (!ctx || !master || muted) return
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter()
      o.type = 'sawtooth'; o.frequency.setValueAtTime(30, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.5); lp.type = 'lowpass'; lp.frequency.value = 400
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
      o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 0.75)
    })
  },
  chime() { audio.notes([659.25, 830.61, 987.77], 0.11, 0.9) },
  click() { audio.notes([880], 0.0, 0.12, 'square', 0.04) },
  /** the ending: a rising run of notes that resolves on a long chord */
  finale() { audio.notes([261.63, 329.63, 392, 523.25, 659.25, 783.99], 0.16, 1.6); window.setTimeout(() => audio.notes([523.25, 659.25, 783.99, 1046.5], 0.02, 2.8, 'sine', 0.09), 1100) },
  debug() { return { state: ctx?.state ?? 'none', bars: barsScheduled, energy } },
  unlock() { audio.notes([392, 523.25, 659.25, 783.99], 0.12, 1.2) },
  notes(freqs: number[], gap: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
    safe(() => {
      if (!ctx || !master || muted) return
      freqs.forEach((fr, i) => {
        const t = ctx!.currentTime + i * gap, o = ctx!.createOscillator(), g = ctx!.createGain()
        o.type = type; o.frequency.value = fr; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + dur)
        o.connect(g); g.connect(master!); o.start(t); o.stop(t + dur + 0.05)
      })
    })
  },
  thud(strength: number) {
    safe(() => {
      if (!ctx || !master || !noiseBuf || muted) return
      const k = Math.min(1, strength / 14), t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.25); g.gain.setValueAtTime(0.15 + 0.5 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32)
    })
  },
  bird() {
    safe(() => {
      if (!ctx || !master || muted) return
      const n = 2 + Math.floor(Math.random() * 3), base = 2400 + Math.random() * 1800
      for (let i = 0; i < n; i++) {
        const t = ctx.currentTime + i * 0.13, o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.07); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0003, t + 0.09)
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1)
      }
    })
  },
  hornOn(on: boolean) {
    safe(() => {
      if (!ctx || !master) return
      if (on && !horn && !muted) {
        const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.09, ctx.currentTime, 0.01)
        const o = [392, 494].map((f) => { const x = ctx!.createOscillator(); x.type = 'square'; x.frequency.value = f; x.connect(g); x.start(); return x })
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; g.connect(lp); lp.connect(master); horn = { o, g }
      } else if (!on && horn) {
        const h = horn; horn = null; h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); window.setTimeout(() => h.o.forEach((x) => { try { x.stop() } catch { /* already stopped */ } }), 150)
      }
    })
  },
}
if (typeof window !== 'undefined') (window as unknown as { __nedAudio?: unknown }).__nedAudio = audio   // QA hook (state / scheduled bars)
