const LEVELS = [
  'rgba(255, 255, 255, 0.08)',
  'rgba(255, 255, 255, 0.22)',
  'rgba(255, 255, 255, 0.45)',
  'rgba(255, 255, 255, 0.72)',
  '#ffffff',
]

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(key) {
  const d = new Date(`${key}T00:00:00`)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildWeeks(days) {
  const byDate = new Map((days || []).map((d) => [d.date, d]))
  const weeks = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - cursor.getDay())
  cursor.setDate(cursor.getDate() - 52 * 7)
  while (weeks.length < 53) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const key = toKey(cursor)
      const entry = byDate.get(key)
      week.push({
        date: key,
        count: entry ? entry.count : 0,
        level: entry ? Math.min(entry.level, 4) : 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function ContributionGraph({ contributions, noun = 'contribution' }) {
  const weeks = buildWeeks(contributions)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="no-scrollbar w-full overflow-x-auto pb-2">
        <div className="mx-auto flex w-max gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className="graph-cell"
                  style={{ backgroundColor: LEVELS[cell.level] }}
                  title={`${cell.count} ${noun}${cell.count === 1 ? '' : 's'} on ${formatDate(cell.date)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
        <span>Less</span>
        {LEVELS.map((color) => (
          <span
            key={color}
            className="graph-cell"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

export default ContributionGraph
