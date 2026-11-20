import { useEffect, useRef } from 'react'
import { BRAND } from './brand'

export const PROMO_URL = BRAND.promoFile

/** Modal player for the After Effects promo. The file is only requested once the dialog is opened (preload="none" until then). */
export default function PromoVideo({ onClose }: { onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const vid = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const d = dlg.current
    if (d && !d.open) d.showModal()
    const v = vid.current
    return () => { v?.pause() }
  }, [])

  return (
    <dialog ref={dlg} className="promo-dialog" aria-label={`${BRAND.name} promo video`} onClose={onClose}
      onClick={(e) => { if (e.target === dlg.current) dlg.current?.close() }}>
      <div className="promo-box">
        <div className="promo-head">
          <span className="mono">{BRAND.name} — PROMO · MADE IN ADOBE AFTER EFFECTS</span>
          <button className="promo-x" onClick={() => dlg.current?.close()} aria-label="Close video">CLOSE ✕</button>
        </div>
        <video ref={vid} src={PROMO_URL} controls autoPlay playsInline preload="auto" />
      </div>
    </dialog>
  )
}
