import { useRef } from 'react'
import { touchInput } from '../input'

const LOOK_SENSITIVITY = 0.0045
const JOYSTICK_RADIUS = 52

export default function TouchControls({ nearby, accent, onInteract }) {
  const lookState = useRef({ id: null, lastX: 0, lastY: 0 })
  const stickState = useRef({ id: null, centerX: 0, centerY: 0 })
  const stickRef = useRef(null)
  const nubRef = useRef(null)

  const onLookStart = (e) => {
    const t = e.changedTouches[0]
    if (lookState.current.id !== null) return
    lookState.current = { id: t.identifier, lastX: t.clientX, lastY: t.clientY }
  }

  const onLookMove = (e) => {
    const s = lookState.current
    if (s.id === null) return
    for (const t of e.changedTouches) {
      if (t.identifier !== s.id) continue
      touchInput.lookDx += (t.clientX - s.lastX) * LOOK_SENSITIVITY
      touchInput.lookDy += (t.clientY - s.lastY) * LOOK_SENSITIVITY
      s.lastX = t.clientX
      s.lastY = t.clientY
    }
    e.preventDefault()
  }

  const onLookEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === lookState.current.id) {
        lookState.current.id = null
      }
    }
  }

  const setNub = (dx, dy) => {
    if (!nubRef.current) return
    nubRef.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const onStickStart = (e) => {
    e.stopPropagation()
    const t = e.changedTouches[0]
    const rect = stickRef.current.getBoundingClientRect()
    stickState.current = {
      id: t.identifier,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    }
    touchInput.active = true
  }

  const onStickMove = (e) => {
    const s = stickState.current
    if (s.id === null) return
    e.stopPropagation()
    e.preventDefault()
    for (const t of e.changedTouches) {
      if (t.identifier !== s.id) continue
      let dx = t.clientX - s.centerX
      let dy = t.clientY - s.centerY
      const len = Math.hypot(dx, dy)
      if (len > JOYSTICK_RADIUS) {
        dx = (dx / len) * JOYSTICK_RADIUS
        dy = (dy / len) * JOYSTICK_RADIUS
      }
      setNub(dx, dy)
      touchInput.moveX = dx / JOYSTICK_RADIUS
      touchInput.moveY = dy / JOYSTICK_RADIUS
    }
  }

  const onStickEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickState.current.id) {
        stickState.current.id = null
        touchInput.moveX = 0
        touchInput.moveY = 0
        setNub(0, 0)
      }
    }
    e.stopPropagation()
  }

  return (
    <>
      <div
        className="absolute inset-0 z-10 touch-none"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
        aria-hidden="true"
      />

      <div
        ref={stickRef}
        className="absolute left-6 z-20 flex h-[124px] w-[124px] touch-none items-center justify-center rounded-full border border-[#f4f1ea]/30 bg-[#0c120e]/40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}
        onTouchStart={onStickStart}
        onTouchMove={onStickMove}
        onTouchEnd={onStickEnd}
        onTouchCancel={onStickEnd}
        aria-hidden="true"
      >
        <div
          ref={nubRef}
          className="h-12 w-12 rounded-full border border-[#f4f1ea]/50 bg-[#f4f1ea]/25"
        />
      </div>

      <button
        type="button"
        className="absolute z-20 h-16 w-16 touch-none rounded-full border border-[#f4f1ea]/50 bg-[#0c120e]/60 text-xs uppercase tracking-widest text-[#f4f1ea] active:bg-[#f4f1ea]/25"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)', right: 24 }}
        onTouchStart={(e) => {
          e.preventDefault()
          touchInput.jump = true
        }}
        onTouchEnd={() => {
          touchInput.jump = false
        }}
        aria-label="Jump"
      >
        Jump
      </button>

      {nearby && (
        <button
          type="button"
          onClick={onInteract}
          className="absolute z-20 rounded-full border px-5 py-3 text-xs uppercase tracking-[0.2em] backdrop-blur-sm"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 132px)',
            right: 24,
            color: accent,
            borderColor: `${accent}80`,
            background: '#0c120eaa',
          }}
        >
          Open · E
        </button>
      )}
    </>
  )
}
