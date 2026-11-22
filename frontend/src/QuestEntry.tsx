import { useEffect, useState } from 'react'

/** Header button: opens NEDVERSE (Quest Mode), the 3D campus exploration at /nedverse.html. Shows your saved level once the (lazy) quest data has loaded,
    so the heavy 3D/layout code never delays the first paint of the portfolio. */
export function QuestButton() {
  const [info, setInfo] = useState<{ label: string; xp: number } | null>(null)
  useEffect(() => {
    let off = () => {}
    import('./nedverse/quests').then((m) => { const upd = () => { const g = m.getQuests(); setInfo({ label: g.label, xp: g.xp }) }; upd(); off = m.subscribeQuests(upd) }).catch(() => {})
    return () => off()
  }, [])
  return (
    <a className="qbtn" href="/nedverse.html" aria-label={`Open Quest Mode, the NEDVERSE campus.${info ? ` ${info.label}, ${info.xp} XP` : ''}`} title="Quest Mode · explore the NEDVERSE campus">
      <span>Quest Mode</span>
    </a>
  )
}
