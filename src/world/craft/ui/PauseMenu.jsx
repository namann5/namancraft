import { sfx } from '../sound'
import { LINKS } from '../data/portfolio'

export default function PauseMenu({ onResume, onMainMenu, onSection }) {
  return (
    <div className="animate-mc-fade-in absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/65 px-4 backdrop-blur-[3px]">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-6">
        <h2 className="font-pixel text-lg text-white [text-shadow:0_4px_0_#3a3a3a,0_6px_2px_rgba(0,0,0,0.7)]">
          GAME MENU
        </h2>

        <nav className="flex w-full flex-col gap-3" aria-label="Game menu">
          <button
            type="button"
            onClick={() => {
              sfx.click()
              onResume()
            }}
            onMouseEnter={sfx.hover}
            className="mc-btn mc-btn--primary font-pixel h-[52px] w-full text-xs"
          >
            BACK TO WORLD
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                sfx.open()
                onSection('projects')
              }}
              onMouseEnter={sfx.hover}
              className="mc-btn font-pixel h-[44px] text-[10px]"
            >
              PROJECTS
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.open()
                onSection('inventory')
              }}
              onMouseEnter={sfx.hover}
              className="mc-btn font-pixel h-[44px] text-[10px]"
            >
              INVENTORY
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.click()
              onMainMenu()
            }}
            onMouseEnter={sfx.hover}
            className="mc-btn font-pixel h-[46px] w-full text-[11px]"
          >
            SAVE & QUIT TO TITLE
          </button>
        </nav>

        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c9d4cb]/60">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-[#ffe066]">
            GitHub
          </a>{' '}
          •{' '}
          <a href={LINKS.email} className="hover:text-[#ffe066]">
            Email
          </a>
        </p>
      </div>
    </div>
  )
}
