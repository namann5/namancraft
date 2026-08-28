import { useEffect } from 'react'
import { sfx } from '../sound'

// Shared heritage panel shell: warm clay card, gold accent line,
// title bar with a close button. Escape closes.
export default function McPanel({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="animate-mc-fade-in absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div
        className={`mc-panel animate-mc-rise flex max-h-[88svh] w-full flex-col overflow-hidden ${
          wide ? 'max-w-[760px]' : 'max-w-[560px]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-4 border-b border-[#f5c877]/25 bg-[#241a11] px-5 py-4">
          <div>
            <h2 className="font-pixel text-sm text-[#f5c877] sm:text-base">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-[#9aa39a]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.click()
              onClose()
            }}
            onMouseEnter={sfx.hover}
            className="mc-btn font-pixel px-3 py-2 text-xs"
            aria-label="Close panel"
          >
            X
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
