import * as THREE from 'three'

// Shared, mutable state read every frame by the 3D scene (kept outside React on purpose).
export const scroll = { progress: 0, smooth: 0, velocity: 0 }
export const SECTION_COUNT = 10 // gateway, about, 5 destinations, skills, journey, contact

/** 0 = cinematic close-up on the avatar (entry screen), 1 = free flight along the scroll path. */
export const intro = { t: 0 }
/** Lets the DOM trigger avatar animations. */
export const avatarBus: { wave: () => void; play: (name: string) => void } = { wave: () => {}, play: () => {} }
/** Where the skill constellation and journey scenes sit (world z). */
export const SKILLS_Z = -98
export const JOURNEY_Z = -116
/** Pointer-driven effects shared by every world. */
export const fx = {
  ground: new THREE.Vector3(0, 0, -9999), // where the pointer ray meets the floor
  click: new THREE.Vector3(0, 0, -9999),
  clickT: -100,
  pressed: false,
  time: 0,
  charge: 0, // 0..1 while the visitor holds the entry button
  gaze: null as { x: number; y: number } | null, // where the avatar should look (overrides the cursor)
  journeyShift: 0, // lateral camera nudge toward the selected journey year
}

export const ACCENTS = ['#FF4A1C', '#FF4A1C', '#FFC53D', '#4DF3C8', '#A58BFF', '#B8FF3D', '#FF3D8B', '#6BB8FF', '#FF8A3D', '#FF4A1C']
export const SKY: [string, string][] = [
  ['#07080d', '#34120a'],
  ['#07080d', '#3a1409'],
  ['#0a0905', '#43310a'],
  ['#03100e', '#07402f'],
  ['#080616', '#2e1d63'],
  ['#0a1003', '#32480a'],
  ['#12040a', '#560b30'],
  ['#040b14', '#0f3358'],
  ['#100803', '#4d2508'],
  ['#07080d', '#34120a'],
]

// Island centres (x, z). Camera flies past them one by one.
export const ISLAND_POS: [number, number][] = [[3.6, -16], [-3.6, -32], [3.6, -48], [-3.6, -64], [3.6, -80]]

export const tint = {
  top: new THREE.Color('#07080d'),
  bot: new THREE.Color('#34120a'),
  accent: new THREE.Color('#FF4A1C'),
}
