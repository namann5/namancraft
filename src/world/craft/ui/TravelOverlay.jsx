// ------------------------------------------------------------------
// TravelOverlay — full-screen dimension-travel cinematic.
//
// phase 'out' : portal-colored disc expands from center + label pops
// phase 'hold': covered; world swap happens behind this
// phase 'in'  : overlay dissolves revealing the new dimension
//
// When traveling to a dimension (nether/end/skills/projects) a
// rendered cinematic still for that dimension fades in behind the
// disc so the cover doubles as a stylized destination preview.
// ------------------------------------------------------------------

const DIM_STILLS = {
  nether: `${import.meta.env.BASE_URL}dims/nether.png`,
  end: `${import.meta.env.BASE_URL}dims/end.png`,
  skills: `${import.meta.env.BASE_URL}dims/skills.png`,
  projects: `${import.meta.env.BASE_URL}dims/projects.png`,
}

export default function TravelOverlay({ travel }) {
  if (!travel) return null
  const { color, color2, title, phase } = travel
  const still = DIM_STILLS[travel.to]

  return (
    <div className={`travel-overlay ${phase}`} style={{ '--tc': color, '--tc2': color2 }} aria-hidden="true">
      {still && (
        <div className="travel-still" style={{ backgroundImage: `url("${still}")` }} />
      )}
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
