import { useMemo } from 'react'
import { sfx } from '../sound'
import { LINKS, SPLASHES } from '../data/portfolio'
import MusicToggle from './MusicToggle'
import VoxelIcon from './VoxelIcon'

const SECTIONS = [
  { key: 'projects', label: 'Projects', icon: 'chest' },
  { key: 'journey', label: 'My Journey', icon: 'map' },
  { key: 'inventory', label: 'Inventory', icon: 'sword' },
  { key: 'achievements', label: 'Achievements', icon: 'trophy' },
  { key: 'connect', label: 'Connect', icon: 'enderchest' },
]

export default function MainMenu({ ready, entering, onPlay, onSection, touch }) {
  const splash = useMemo(() => SPLASHES[Math.floor(Math.random() * SPLASHES.length)], [])

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center transition-opacity duration-700 ${
        entering ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* vignette to keep the world cinematic and the menu readable */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(5,8,6,0.18) 0%, rgba(5,8,6,0.55) 78%, rgba(4,7,5,0.82) 100%)',
        }}
        aria-hidden="true"
      />

      {/* ambient music toggle */}
      <div className="absolute right-4 top-4 z-30">
        <MusicToggle />
      </div>

      <div className="relative flex w-full max-w-[520px] flex-1 flex-col items-center justify-center px-4 pb-24 pt-[7svh] max-sm:pb-20">
        {/* title block */}
        <div className="animate-mc-rise relative flex flex-col items-center">
          <h1 className="font-pixel text-center text-[clamp(26px,6vw,52px)] leading-tight text-white [text-shadow:0_4px_0_#3a3a3a,0_6px_2px_rgba(0,0,0,0.65)]">
            NAMANCRAFT
          </h1>
          <p className="animate-mc-splash font-pixel absolute -right-4 -top-4 origin-right whitespace-nowrap text-[10px] text-[#ffe066] [text-shadow:2px_2px_0_rgba(0,0,0,0.7)] sm:-right-10 sm:text-xs">
            {splash}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f4f1ea]/95 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)] sm:text-base">
            Naman Singh
          </p>
          <p className="text-xs uppercase tracking-[0.28em] text-[#c9d4cb]/85 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">
            Full Stack Developer
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.42em] text-[#ffe066]/90 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">
            Explore • Build • Create
          </p>
        </div>

        {/* buttons */}
        <nav className="mt-10 flex w-full flex-col items-stretch gap-3" aria-label="Main menu">
          <button
            type="button"
            disabled={!ready || entering}
            onClick={() => {
              sfx.click()
              onPlay()
            }}
            onMouseEnter={sfx.hover}
            className="mc-btn mc-btn--primary font-pixel flex h-[64px] w-full items-center justify-center gap-3 text-base tracking-wide max-sm:h-[58px] max-sm:text-sm"
          >
            <VoxelIcon type="grass" size={22} />
            {!ready ? 'LOADING…' : 'PLAY WORLD'}
          </button>

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {SECTIONS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                disabled={!ready}
                onClick={() => {
                  sfx.open()
                  onSection(s.key)
                }}
                onMouseEnter={sfx.hover}
                className={`mc-btn font-pixel flex h-[46px] items-center justify-center gap-2.5 text-[11px] ${i === SECTIONS.length - 1 ? 'col-span-2 max-sm:col-span-1' : ''}`}
              >
                <VoxelIcon type={s.icon} size={16} />
                {s.label.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>

        {touch && (
          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.25em] text-[#9aa39a]/80">
            Touch controls supported — joystick + drag to look
          </p>
        )}
      </div>

      {/* bottom bar */}
      <footer className="relative flex w-full items-end justify-between px-4 pb-3 text-[10px] uppercase tracking-[0.22em] text-[#c9d4cb]/70 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)] max-sm:flex-col max-sm:items-center max-sm:gap-2">
        <span>NamanCraft v1.0</span>
        <nav className="flex items-center gap-3" aria-label="Quick links">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#ffe066]">
            GitHub
          </a>
          <span aria-hidden="true">•</span>
          <a href={LINKS.linkedin} className="transition-colors hover:text-[#ffe066]">
            LinkedIn
          </a>
          <span aria-hidden="true">•</span>
          <a href={LINKS.resume} className="transition-colors hover:text-[#ffe066]">
            Resume
          </a>
        </nav>
      </footer>
    </div>
  )
}
