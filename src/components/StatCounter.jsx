import { useEffect, useRef, useState } from 'react'

function StatCounter({ value, label }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(value)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const duration = 1400
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.round(eased * value))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <span className="gradient-text text-4xl font-semibold tracking-[-0.04em] max-sm:text-3xl">
        {display.toLocaleString()}
      </span>
      <span className="text-xs uppercase tracking-[0.25em] text-[#c9d4cb]/60">
        {label}
      </span>
    </div>
  )
}

export default StatCounter
