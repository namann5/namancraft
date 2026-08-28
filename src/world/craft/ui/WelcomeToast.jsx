import { useEffect, useState } from 'react'

const HINTS = [
  { key: 'WASD', label: 'Explore' },
  { key: 'E', label: 'Interact' },
  { key: 'ESC', label: 'Menu' },
]

export default function WelcomeToast({ show }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return undefined
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 5200)
    return () => clearTimeout(t)
  }, [show])

  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-[14svh] z-20 -translate-x-1/2 text-center transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-live="polite"
    >
      <p className="font-pixel text-sm text-white [text-shadow:0_2px_14px_rgba(255,166,80,0.3)] sm:text-base">
        WELCOME TO THE PEACOCK REALMS
      </p>
      <div className="mt-5 flex items-center justify-center gap-4 max-sm:gap-2.5">
        {HINTS.map((h) => (
          <span key={h.key} className="flex items-center gap-2">
            <kbd className="mc-slot font-pixel px-2 py-1.5 text-[9px] text-[#ffe066]">{h.key}</kbd>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#f4f1ea]/90 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">
              {h.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
