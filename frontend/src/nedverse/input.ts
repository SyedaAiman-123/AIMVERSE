/* Player input store: keyboard (WASD / arrows, Shift = run, E = interact, Esc = pause/close), mouse drag + wheel (camera),
   and touch (virtual joystick + drag-to-look on the right side). Everything is polled once per frame by the player. */

export const input = {
  keys: new Set<string>(),
  stick: { x: 0, y: 0 },            // touch joystick, y > 0 = forward
  runToggle: false,                 // touch "run" button
  lookDX: 0, lookDY: 0, zoom: 0,    // accumulated since the last frame
  interact: false,                  // edge-triggered
  escape: false,                    // edge-triggered
  enabled: true,                    // false while a panel / pause menu is open: movement is ignored, nothing can drift
}

export function resetInput() { input.keys.clear(); input.stick.x = input.stick.y = 0; input.lookDX = input.lookDY = input.zoom = 0; input.interact = input.escape = false }
export function setInputEnabled(on: boolean) { input.enabled = on; if (!on) { input.keys.clear(); input.stick.x = input.stick.y = 0 } }

/** Current movement intent: x = right, z = forward (both −1..1), run flag. */
export function readMove() {
  if (!input.enabled) return { x: 0, z: 0, run: false }
  const k = input.keys
  let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
  let z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
  x += input.stick.x; z += input.stick.y
  const m = Math.hypot(x, z); if (m > 1) { x /= m; z /= m }
  const run = k.has('ShiftLeft') || k.has('ShiftRight') || input.runToggle || Math.hypot(input.stick.x, input.stick.y) > 0.92
  return { x, z, run }
}

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'])

/** Attach listeners to the window + a canvas wrapper element; returns a detach function. */
export function attachInput(el: HTMLElement) {
  const kd = (e: KeyboardEvent) => {
    if (e.code === 'Escape') { if (!e.repeat) input.escape = true; return }
    if (!input.enabled) return
    if (MOVE_KEYS.has(e.code)) { input.keys.add(e.code); e.preventDefault() }
    else if (e.code === 'KeyE' && !e.repeat) input.interact = true
  }
  const ku = (e: KeyboardEvent) => { input.keys.delete(e.code) }
  const blur = () => input.keys.clear()
  let drag: { id: number; x: number; y: number } | null = null
  const pd = (e: PointerEvent) => {
    if (!input.enabled) return
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.4) return   // left side belongs to the joystick
    if ((e.target as HTMLElement).closest('[data-ui]')) return
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId)
  }
  const pm = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; input.lookDX += e.clientX - drag.x; input.lookDY += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY }
  const pu = (e: PointerEvent) => { if (drag && e.pointerId === drag.id) drag = null }
  const wh = (e: WheelEvent) => { if (input.enabled) { input.zoom += e.deltaY; e.preventDefault() } }
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', blur)
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu); el.addEventListener('wheel', wh, { passive: false })
  return () => {
    removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', blur)
    el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wh)
  }
}
