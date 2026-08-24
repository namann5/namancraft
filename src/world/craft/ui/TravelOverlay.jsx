// ------------------------------------------------------------------
// TravelOverlay — full-screen dimension-travel cinematic.
//
// phase 'out' : portal-colored disc expands from center + label pops
// phase 'hold': covered; world swap happens behind this
// phase 'in'  : overlay dissolves revealing the new dimension
// ------------------------------------------------------------------

export default function TravelOverlay({ travel }) {
  if (!travel) return null
  const { color, color2, title, phase } = travel

  return (
    <div className={`travel-overlay ${phase}`} style={{ '--tc': color, '--tc2': color2 }} aria-hidden="true">
      <div className="travel-disc" />
      <div className="travel-ring" />
      <div className="travel-inner" />
      <p className="travel-title font-pixel">{title}</p>
      <div className="travel-bar">
        <i />
      </div>
      <p className="travel-sub">DIMENSION SHIFT IN PROGRESS</p>
    </div>
  )
}
