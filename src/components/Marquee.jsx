function Marquee({ items }) {
  const line = `${items.join('  /  ')}  /  `

  return (
    <div className="relative z-10 overflow-hidden border-y border-white/20 py-5">
      <div className="marquee-track" aria-hidden="true">
        <span className="marquee-item">{line}</span>
        <span className="marquee-item">{line}</span>
      </div>
    </div>
  )
}

export default Marquee
