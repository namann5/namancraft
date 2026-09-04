import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MusicToggle from '../world/craft/ui/MusicToggle'
import VoxelIcon from '../world/craft/ui/VoxelIcon'
import { sfx } from '../world/craft/sound'

const BASE = import.meta.env.BASE_URL
const HERO_IMG = `${BASE}hero/hero.png`
const HERO_VIDEO = `${BASE}hero/hero.mp4`

export default function CinematicHero() {
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
  const [videoOk, setVideoOk] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.oncanplay = () => setVideoOk(true)
    v.onerror = () => {}
    v.src = HERO_VIDEO
    return () => {
      v.src = ''
    }
  }, [])

  // scroll (or wheel) reveals the enter affordance / triggers the descent
  useEffect(() => {
    let guard = false
    const go = () => {
      if (guard || started.current) return
      guard = true
      started.current = true
      sfx.click()
      setEntering(true)
      setTimeout(() => navigate('/world'), 900)
    }
    const onWheel = (e) => {
      if (e.deltaY > 0) go()
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [navigate])

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* cinematic hero backdrop: video with rendered PNG fallback */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1400ms] ${entering ? 'scale-105 opacity-90' : 'scale-100 opacity-100'}`}
        style={{ transform: entering ? 'scale(1.06)' : 'scale(1)' }}
      >
        {videoOk ? (
          <video
            className="h-full w-full object-cover"
            src={HERO_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            poster={HERO_IMG}
          />
        ) : (
          <img
            className="h-full w-full object-cover"
            src={HERO_IMG}
            alt="NamanCraft — a cinematic voxel world"
            draggable={false}
          />
        )}
      </div>

      {/* cinematic grade + vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,8,14,0.35) 0%, rgba(6,8,14,0.0) 32%, rgba(6,8,14,0.25) 70%, rgba(4,6,10,0.72) 100%)',
        }}
        aria-hidden="true"
      />

      {/* top-right menu / music */}
      <div className="absolute right-4 top-4 z-30">
        <MusicToggle />
      </div>

      {/* title sequence UI */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 pb-[12svh] text-center">
        <div className="rv relative flex flex-col items-center" style={{ animationDelay: '200ms' }}>
          <h1 className="font-pixel text-[clamp(30px,7vw,60px)] leading-tight text-white [text-shadow:0_4px_0_#3a3a3a,0_6px_3px_rgba(0,0,0,0.7)]">
            NAMANCRAFT
          </h1>
          <p className="animate-mc-splash font-pixel absolute -right-4 -top-4 origin-right whitespace-nowrap text-[10px] text-[#ffe066] [text-shadow:2px_2px_0_rgba(0,0,0,0.7)] sm:-right-10 sm:text-sm">
            Explore • Build • Create
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1.5">
          <p className="rv text-base uppercase tracking-[0.35em] text-[#f4f1ea]/95 [text-shadow:1px_1px_0_rgba(0,0,0,0.85)] sm:text-lg" style={{ animationDelay: '420ms' }}>
            Naman Singh
          </p>
          <p className="rv text-xs uppercase tracking-[0.28em] text-[#c9d4cb]/85 [text-shadow:1px_1px_0_rgba(0,0,0,0.85)]" style={{ animationDelay: '520ms' }}>
            Full Stack Developer
          </p>
        </div>
      </div>

      {/* bottom bar: enter the world */}
      <div className="rv absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 pb-10" style={{ animationDelay: '900ms' }}>
        <button
          type="button"
          onClick={() => {
            if (started.current) return
            started.current = true
            sfx.click()
            setEntering(true)
            setTimeout(() => navigate('/world'), 900)
          }}
          onMouseEnter={sfx.hover}
          className="mc-btn mc-btn--primary font-pixel flex h-[58px] items-center gap-3 px-8 text-sm tracking-wide"
        >
          <VoxelIcon type="grass" size={20} />
          {entering ? 'ENTERING…' : 'ENTER THE WORLD'}
        </button>
        <p className="font-pixel animate-pulse text-[10px] uppercase tracking-[0.3em] text-[#ffe066]/85 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">
          SCROLL TO EXPLORE
        </p>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#9aa39a]/70 [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">
          NamanCraft — a cinematic voxel portfolio
        </p>
      </div>

      {/* fade to black on exit */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 bg-black transition-opacity duration-700 ${entering ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
    </div>
  )
}
