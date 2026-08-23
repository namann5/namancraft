import { useState } from 'react'
import { sfx, isMusicOn, toggleMusic } from '../sound'
import VoxelIcon from './VoxelIcon'

// Ambient music toggle. Off by default (browser autoplay policies + taste).
export default function MusicToggle({ className = '' }) {
  const [on, setOn] = useState(isMusicOn)

  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? 'Music: on' : 'Music: off'}
      onClick={() => {
        const next = toggleMusic()
        setOn(next)
        sfx.click()
      }}
      onMouseEnter={sfx.hover}
      className={`mc-slot flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:text-[#ffe066] ${className}`}
    >
      <span style={{ opacity: on ? 1 : 0.4 }}>
        <VoxelIcon type="note" size={18} />
      </span>
      <span className="font-pixel text-[9px] text-[#f4f1ea]">{on ? 'MUSIC ON' : 'MUSIC OFF'}</span>
    </button>
  )
}
