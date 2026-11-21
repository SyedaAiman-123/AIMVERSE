import { useEffect } from 'react'

/** keeps Tab inside an open dialog (keyboard users cannot tab out into the hidden scene) */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = ref.current; if (!el || !active) return
    const items = () => [...el.querySelectorAll<HTMLElement>('button,a[href],input,select,video[controls]')].filter((x) => !x.hasAttribute('disabled'))
    if (!el.contains(document.activeElement)) items()[0]?.focus()
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const f = items(); if (!f.length) return
      const first = f[0], last = f[f.length - 1], inside = el.contains(document.activeElement)
      if (!inside) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', k, true); return () => document.removeEventListener('keydown', k, true)
  }, [ref, active])
}

