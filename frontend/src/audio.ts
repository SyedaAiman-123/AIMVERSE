import { BRAND } from './brand'
// Original, procedurally synthesised "launch-ad" soundtrack (WebAudio) — upbeat, bright, driving.
// ~116 BPM, I–V–vi–IV progression, four-on-the-floor drums, bass groove, off-beat chord stabs and a sparkling arpeggio.
// No audio files, so nothing to license. Starts only after the user's entry gesture; can be muted any time.

const BPM = 116
const STEP = 60 / BPM / 4 // one 16th note
const PROG: { root: number; minor: boolean }[] = [
  { root: 0, minor: false }, // C
  { root: 7, minor: false }, // G
  { root: 9, minor: true }, //  Am
  { root: 5, minor: false }, // F
]
// per section: transpose (semitones) and which layers play
type Level = { t: number; arp: 0 | 1 | 2; pad: boolean; clap: boolean; hat: 1 | 2; stab: boolean }
const LEVELS: Level[] = [
  { t: 0, arp: 0, pad: false, clap: true, hat: 1, stab: true }, // gateway: hook
  { t: 0, arp: 1, pad: false, clap: true, hat: 1, stab: true }, // about
  { t: 0, arp: 1, pad: false, clap: true, hat: 2, stab: true }, // game: chiptune arp joins
  { t: 2, arp: 2, pad: false, clap: true, hat: 2, stab: true }, // cyber: lifted a tone, faster arp
  { t: 4, arp: 1, pad: true, clap: true, hat: 1, stab: false }, // vr: lush pad, airy
  { t: 5, arp: 2, pad: false, clap: true, hat: 2, stab: true }, // ai: playful
  { t: 7, arp: 2, pad: true, clap: true, hat: 2, stab: true }, // motion: biggest lift
  { t: 9, arp: 2, pad: false, clap: true, hat: 2, stab: true }, // skills: bright and busy
  { t: 5, arp: 1, pad: true, clap: true, hat: 1, stab: true }, // journey: reflective
  { t: 0, arp: 1, pad: true, clap: true, hat: 1, stab: true }, // contact: resolve
]

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

type Engine = {
  ctx: AudioContext
  master: GainNode
  duck: GainNode
  drums: GainNode
  music: GainNode
  send: GainNode
  noise: AudioBuffer
  timer: number
  next: number
  step: number
  air: GainNode
  airFilter: BiquadFilterNode
  riser?: { stop: (fast?: boolean) => void; set: (p: number) => void }
}
let e: Engine | null = null
let on = false
let muted = false
let playing = false
let section = 0

function noiseBuffer(ctx: AudioContext) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function build(): Engine {
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  comp.attack.value = 0.004
  comp.release.value = 0.18
  const duck = ctx.createGain() // user-level ducking (e.g. while a case file is open)
  comp.connect(duck)
  duck.connect(master)
  master.connect(ctx.destination)

  const drums = ctx.createGain()
  const music = ctx.createGain() // sidechain-style pump happens here
  drums.connect(comp)
  music.connect(comp)

  // slap-back echo for stabs and arps
  const send = ctx.createGain()
  send.gain.value = 1
  const delay = ctx.createDelay(1)
  delay.delayTime.value = STEP * 3 // dotted-eighth echo
  const fb = ctx.createGain()
  fb.gain.value = 0.32
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 3500
  send.connect(delay)
  delay.connect(damp)
  damp.connect(fb)
  fb.connect(delay)
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  damp.connect(wet)
  wet.connect(comp)

  // travel whoosh bed (driven by scroll speed)
  const noise = noiseBuffer(ctx)
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const airFilter = ctx.createBiquadFilter()
  airFilter.type = 'bandpass'
  airFilter.frequency.value = 600
  airFilter.Q.value = 0.8
  const air = ctx.createGain()
  air.gain.value = 0
  src.connect(airFilter)
  airFilter.connect(air)
  air.connect(master)
  src.start()

  return { ctx, master, duck, drums, music, send, noise, timer: 0, next: 0, step: 0, air, airFilter }
}

/* ---------- instruments ---------- */
function kick(t: number, vel = 1) {
  if (!e) return
  const { ctx, drums, music } = e
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(155, t)
  o.frequency.exponentialRampToValueAtTime(46, t + 0.11)
  g.gain.setValueAtTime(0.95 * vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
  o.connect(g)
  g.connect(drums)
  o.start(t)
  o.stop(t + 0.36)
  // pump the melodic bus on every kick
  music.gain.cancelScheduledValues(t)
  music.gain.setValueAtTime(0.55, t)
  music.gain.linearRampToValueAtTime(1, t + 0.2)
}
function noiseHit(t: number, type: BiquadFilterType, freq: number, q: number, gain: number, dur: number, bus: GainNode) {
  if (!e) return
  const { ctx, noise } = e
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  s.connect(f)
  f.connect(g)
  g.connect(bus)
  s.start(t, Math.random())
  s.stop(t + dur + 0.02)
}
const clap = (t: number) => {
  if (!e) return
  ;[0, 0.011, 0.022].forEach((d, i) => noiseHit(t + d, 'bandpass', 1700, 0.9, i === 2 ? 0.34 : 0.2, i === 2 ? 0.2 : 0.03, e!.drums))
}
const hat = (t: number, open: boolean, v = 0.12) => e && noiseHit(t, 'highpass', 7500, 0.7, v, open ? 0.2 : 0.045, e.drums)

function tone(t: number, f: number, dur: number, type: OscillatorType, gain: number, cutoff: number, echo = 0) {
  if (!e) return
  const { ctx, music, send } = e
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = f
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(cutoff * 2.2, t)
  lp.frequency.exponentialRampToValueAtTime(cutoff, t + dur * 0.6)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(lp)
  lp.connect(g)
  g.connect(music)
  if (echo) {
    const s = ctx.createGain()
    s.gain.value = echo
    g.connect(s)
    s.connect(send)
  }
  o.start(t)
  o.stop(t + dur + 0.05)
}

function bass(t: number, m: number, dur: number) {
  tone(t, mtof(m), dur, 'sawtooth', 0.2, 700)
  tone(t, mtof(m - 12), dur, 'sine', 0.22, 300)
}
function stab(t: number, notes: number[]) {
  notes.forEach((m) => tone(t, mtof(m), STEP * 2.6, 'sawtooth', 0.045, 2600, 0.35))
}
function pad(t: number, notes: number[]) {
  if (!e) return
  const { ctx, music } = e
  notes.forEach((m) => {
    ;[-6, 6].forEach((det) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = mtof(m)
      o.detune.value = det
      const g = ctx.createGain()
      const bar = STEP * 16
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.03, t + 0.25)
      g.gain.linearRampToValueAtTime(0.0001, t + bar)
      o.connect(g)
      g.connect(music)
      o.start(t)
      o.stop(t + bar + 0.05)
    })
  })
}

/* ---------- sequencer ---------- */
function schedule(step: number, t: number) {
  const lv = LEVELS[section]
  const bar = Math.floor(step / 16) % 4
  const s = step % 16
  const ch = PROG[bar]
  const root = 48 + ch.root + lv.t // C3-based
  const third = ch.minor ? 3 : 4
  const triad = [root, root + third, root + 7]

  // drums
  if (s % 4 === 0) kick(t, s === 0 ? 1 : 0.9)
  if (lv.clap && (s === 4 || s === 12)) clap(t)
  if (s % 4 === 2) hat(t, true, 0.1) // off-beat open hat
  if (lv.hat === 2 && s % 2 === 1) hat(t, false, 0.05) // ghost 16ths
  if (s % 4 === 0 && lv.hat === 1) hat(t, false, 0.06)
  if (bar === 3 && s >= 12 && s % 1 === 0) noiseHit(t, 'bandpass', 2200 + (s - 12) * 500, 1, 0.07, 0.06, e!.drums) // fill into the loop

  // bass groove: root / octave / fifth bounce
  const bassPat: Record<number, number> = { 0: 0, 3: 0, 6: 12, 8: 0, 11: 0, 14: 7 }
  if (s in bassPat) bass(t, root - 12 + bassPat[s], STEP * 2.2)

  // chord stabs on the off-beats
  if (lv.stab && (s === 2 || s === 6 || s === 10 || s === 14) && s !== 14) stab(t, [...triad.map((n) => n + 12), root + 24])
  if (lv.stab && s === 15) stab(t, triad.map((n) => n + 12))

  // pad: one chord per bar
  if (lv.pad && s === 0) pad(t, [root + 12, root + 12 + third, root + 19])

  // arpeggio
  if (lv.arp) {
    const tones = [triad[0] + 24, triad[1] + 24, triad[2] + 24, triad[0] + 36]
    const pat = lv.arp === 1 ? [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1] : [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2]
    const k = pat[s]
    if (k >= 0) tone(t, mtof(tones[k]), STEP * 1.6, lv.arp === 1 ? 'square' : 'sawtooth', lv.arp === 1 ? 0.03 : 0.028, lv.arp === 1 ? 3200 : 4200, 0.5)
  }
}

function tick() {
  if (!e || !playing || muted) return
  while (e.next < e.ctx.currentTime + 0.14) {
    schedule(e.step, e.next)
    e.next += STEP
    e.step++
  }
}

function blip(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, slide = 0) {
  if (!e || !on || muted) return
  const { ctx, master, send } = e
  const o = ctx.createOscillator()
  o.type = type
  const g = ctx.createGain()
  const t = ctx.currentTime
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(master)
  g.connect(send)
  o.start(t)
  o.stop(t + dur + 0.05)
}

const VOL = 0.85

export const audio = {
  get on() { return on && !muted },
  /** Create the engine inside a user gesture (e.g. pointerdown on the entry button). */
  async prime() {
    if (!e) e = build()
    await e.ctx.resume()
    on = true
  },
  /** Tension riser while the visitor holds the entry button. p = 0..1 */
  riser(p: number) {
    if (!e || muted) return
    if (!e.riser) {
      const { ctx, master, noise } = e
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.2
      const ng = ctx.createGain()
      ng.gain.value = 0
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      const og = ctx.createGain()
      og.gain.value = 0
      src.connect(bp)
      bp.connect(ng)
      ng.connect(master)
      o.connect(lp)
      lp.connect(og)
      og.connect(master)
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(VOL, ctx.currentTime, 0.05)
      src.start()
      o.start()
      e.riser = {
        set: (v) => {
          const t = ctx.currentTime
          bp.frequency.setTargetAtTime(300 + v * v * 7000, t, 0.05)
          ng.gain.setTargetAtTime(0.02 + v * 0.22, t, 0.05)
          o.frequency.setTargetAtTime(90 + v * v * 900, t, 0.05)
          lp.frequency.setTargetAtTime(300 + v * 3500, t, 0.05)
          og.gain.setTargetAtTime(0.02 + v * 0.1, t, 0.05)
        },
        stop: (fast) => {
          const t = ctx.currentTime
          ng.gain.setTargetAtTime(0, t, fast ? 0.04 : 0.15)
          og.gain.setTargetAtTime(0, t, fast ? 0.04 : 0.15)
          setTimeout(() => { src.stop(); o.stop() }, 900)
        },
      }
    }
    e.riser.set(p)
  },
  riserStop(fast = true) {
    e?.riser?.stop(fast)
    if (e) e.riser = undefined
  },
  /** The beat drop: impact, crash, then the track kicks in on the one. */
  drop() {
    if (!e) return
    const { ctx, master } = e
    on = true
    this.riserStop(true)
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.02)
    const t = ctx.currentTime + 0.03
    // sub boom
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(28, t + 1.1)
    g.gain.setValueAtTime(0.9, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
    o.connect(g)
    g.connect(master)
    o.start(t)
    o.stop(t + 1.3)
    // crash
    noiseHit(t, 'highpass', 3500, 0.6, 0.35, 1.8, master as GainNode)
    playing = true
    e.step = 0
    e.next = t
    if (!e.timer) e.timer = window.setInterval(tick, 25)
  },
  setMuted(m: boolean) {
    muted = m
    if (!e) return
    const t = e.ctx.currentTime
    e.master.gain.cancelScheduledValues(t)
    e.master.gain.setTargetAtTime(m ? 0 : VOL, t, 0.08)
    if (!m) {
      e.ctx.resume()
      if (playing) e.next = Math.max(e.next, e.ctx.currentTime + 0.05)
    }
    try { localStorage.setItem(BRAND.storage.sound, m ? 'off' : 'on') } catch { /* private mode */ }
  },
  get muted() { return muted },
  setSection(i: number) {
    section = i
    if (e && on && !muted) this.swoosh()
  },
  /** lower the music while a case file is open */
  duck(d: boolean) {
    if (!e) return
    e.duck.gain.setTargetAtTime(d ? 0.35 : 1, e.ctx.currentTime, 0.2)
  },
  swoosh() {
    if (!e || muted) return
    noiseHit(e.ctx.currentTime, 'bandpass', 1800, 0.6, 0.12, 0.7, e.master)
  },
  travel(v: number) {
    if (!e || !on || muted) return
    const a = Math.min(1, Math.abs(v))
    const t = e.ctx.currentTime
    e.air.gain.setTargetAtTime(a * 0.07, t, 0.15)
    e.airFilter.frequency.setTargetAtTime(500 + a * 2400, t, 0.15)
  },
  note(i: number) { blip([523, 587, 659, 784, 880, 1047, 1175][i % 7], 0.55, 'triangle', 0.08) },
    tick() { blip(1568, 0.05, 'triangle', 0.04) },
  select() { blip(784, 0.1, 'square', 0.04); setTimeout(() => blip(1175, 0.16, 'square', 0.04), 70) },
  open() { blip(440, 0.5, 'sawtooth', 0.04, 3); blip(880, 0.4, 'triangle', 0.05, 2) },
  close() { blip(880, 0.3, 'triangle', 0.05, 0.5) },
  chime() { [1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => blip(f, 1.2, 'triangle', 0.045), i * 90)) },
  pulse() { blip(220, 0.35, 'square', 0.03, 0.4) },
  stored(): boolean { try { return (localStorage.getItem(BRAND.storage.sound) ?? localStorage.getItem(BRAND.storage.soundLegacy)) !== 'off' } catch { return true } },
}
