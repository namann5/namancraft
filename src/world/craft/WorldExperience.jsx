import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, RepeatWrapping } from 'three'
import Player from './player'
import { INTRO_CAM_START } from './controls'
import SunsetSky from './environment/SunsetSky'
import DayNightCycle from './environment/DayNightCycle'
import Clouds from './environment/Clouds'
import Particles from './environment/Particles'
import Ambience from './environment/Ambience'
import Clock from './environment/Clock'
import { dayState } from './environment/dayCycle'
import ZonePanel from './ui/ZonePanel'
import TouchControls from './ui/TouchControls'
import MainMenu from './ui/MainMenu'
import PauseMenu from './ui/PauseMenu'
import WelcomeToast from './ui/WelcomeToast'
import { ProjectsSection, JourneySection, InventorySection, AchievementsSection, ConnectSection, HomeSection } from './ui/sections'
import { ZONES } from './zones'
import { worldControls } from './controls'
import { primeMusic } from './sound'
import { skipIntro } from './avatar'

const SECTION_COMPONENTS = {
  projects: ProjectsSection,
  journey: JourneySection,
  inventory: InventorySection,
  achievements: AchievementsSection,
  connect: ConnectSection,
}

const MENU_CAM_START = INTRO_CAM_START

function WorldModel() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/world/world.glb`)
  const waterRef = useRef(null)
  const glowRef = useRef([])

  useEffect(() => {
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh) return
      obj.receiveShadow = true
      const name = obj.material?.name || ''
      if (name.includes('water')) {
        waterRef.current = obj
        obj.castShadow = false
        obj.material.transparent = true
        obj.material.opacity = 0.82
        obj.material.map.wrapS = RepeatWrapping
        obj.material.map.wrapT = RepeatWrapping
        return
      }
      obj.castShadow = true
      if (name.startsWith('mat_beacon_') || name === 'mat_flame') {
        glowRef.current.push(obj)
      }
    })
    return () => {
      waterRef.current = null
      glowRef.current = []
    }
  }, [gltf.scene])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const water = waterRef.current
    if (water?.material?.map) {
      water.material.map.offset.x = Math.sin(t * 0.08) * 0.06
      water.material.map.offset.y = (water.material.map.offset.y - dt * 0.02) % 1
    }
    glowRef.current.forEach((mesh, i) => {
      const boost = dayState.glowBoost
      if (mesh.material.name === 'mat_flame') {
        // torch flicker: fast, noisy — brighter at night
        mesh.material.emissiveIntensity =
          (1.1 + Math.sin(t * 11 + i * 2.3) * 0.25 + Math.sin(t * 23 + i) * 0.12) * boost
      } else {
        mesh.material.emissiveIntensity = (0.75 + Math.sin(t * 2 + i * 1.7) * 0.35) * boost
      }
    })
  })

  return <primitive object={gltf.scene} />
}

export default function WorldExperience() {
  // intro -> menu -> entering -> playing <-> paused
  const [phase, setPhase] = useState('intro')
  const [ready, setReady] = useState(false)
  const [menuReady, setMenuReady] = useState(false)
  const [nearby, setNearby] = useState(null)
  const [zonePanel, setZonePanel] = useState(null)
  const [section, setSection] = useState(null)
  const [welcomed, setWelcomed] = useState(false)
  const zonePanelRef = useRef(null)
  // true from PLAY WORLD until the TPP dolly finishes (guards lock events)
  const flightRef = useRef(false)
  const isTouch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])

  // subtle ambient attempt during the intro (respects stored music pref;
  // browsers may hold the context until the first gesture — that's fine)
  useEffect(() => {
    primeMusic()
  }, [])

  // any key / click skips the walking intro
  useEffect(() => {
    if (phase !== 'intro') return undefined
    const skip = () => skipIntro()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [phase])

  const camMode = phase === 'intro' ? 'intro' : phase === 'menu' ? 'menu' : phase === 'entering' ? 'entering' : 'game'

  const openZonePanel = useCallback(
    (key) => {
      zonePanelRef.current = key
      setZonePanel(key)
      if (!isTouch && document.pointerLockElement) document.exitPointerLock()
    },
    [isTouch],
  )

  const closeZonePanel = useCallback(() => {
    zonePanelRef.current = null
    setZonePanel(null)
    if (!isTouch) worldControls.current?.lock()
  }, [isTouch])

  const closeSection = useCallback(() => setSection(null), [])

  // Flight finished: hand control to the player.
  const startPlaying = useCallback(() => {
    flightRef.current = false
    setNearby(null)
    setWelcomed(true)
    setPhase('playing')
  }, [])

  const handleIntroDone = useCallback(() => {
    setPhase('menu')
    setMenuReady(true)
  }, [])

  const handlePlay = useCallback(() => {
    if (!ready || flightRef.current) return
    primeMusic(true)
    flightRef.current = true
    setWelcomed(false)
    setPhase('entering')
    if (!isTouch) worldControls.current?.lock()
  }, [ready, isTouch])

  const resumeWorld = useCallback(() => {
    if (isTouch) {
      setPhase('playing')
    } else {
      worldControls.current?.lock()
    }
  }, [isTouch])

  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 70, near: 0.1, far: 700, position: MENU_CAM_START }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.1
        }}
      >
        <SunsetSky />
        <DayNightCycle />
        <fogExp2 attach="fog" args={['#e8a06a', 0.0038]} />

        <Suspense fallback={null}>
          <WorldModel />
          <Clouds />
          <Particles />
          <Clock />
          <Ambience />
        </Suspense>

        <Player
          camMode={camMode}
          paused={phase === 'paused'}
          touch={isTouch}
          active={phase === 'playing'}
          onReady={() => setReady(true)}
          onIntroDone={handleIntroDone}
          onEnterDone={startPlaying}
          onLockChange={(locked) => {
            if (locked) {
              // during the PLAY WORLD dolly the lock event is expected; wait
              if (flightRef.current) return
              closeZonePanel()
              setNearby(null)
              setPhase('playing')
            } else if (flightRef.current) {
              // user bailed mid-transition (ESC)
              flightRef.current = false
              setPhase('paused')
            } else if (!zonePanelRef.current && !section) {
              setPhase((prev) => (prev === 'playing' ? 'paused' : prev))
            }
          }}
          onNearby={setNearby}
          onInteract={openZonePanel}
        />
      </Canvas>

      {/* cinematic black opening, fades out once the world appears */}
      {!menuReady && <div className="intro-fade" aria-hidden="true" />}

      {/* welcome toast: mounted once after the first fly-in, self-hides */}
      {welcomed && !section && !zonePanel && <WelcomeToast show />}

      {/* in-world HUD */}
      {phase === 'playing' && !zonePanel && !section && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4f1ea]/80" />
          {nearby && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
              <p className="mc-slot px-5 py-3 text-sm uppercase tracking-[0.22em] text-[#f4f1ea]" style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,.7), inset -2px -2px 0 rgba(255,255,255,.12), 0 6px 18px rgba(0,0,0,.55)' }}>
                <span className="font-pixel text-xs" style={{ color: ZONES[nearby].accent }}>
                  E
                </span>
                <span className="ml-3 text-xs">{ZONES[nearby].verb || 'View'} {ZONES[nearby].title}</span>
              </p>
            </div>
          )}
        </>
      )}

      {/* touch controls */}
      {isTouch && phase === 'playing' && !zonePanel && !section && (
        <>
          <button
            type="button"
            onClick={() => setPhase('paused')}
            className="mc-btn font-pixel absolute right-4 top-4 z-20 px-4 py-2.5 text-xs"
            aria-label="Pause"
          >
            II
          </button>
          <TouchControls
            nearby={nearby}
            accent={nearby ? ZONES[nearby].accent : '#ffd9a0'}
            onInteract={() => nearby && openZonePanel(nearby)}
          />
        </>
      )}

      {/* zone interaction panels (house + clock get dedicated overlays) */}
      {zonePanel &&
        (zonePanel === 'home' ? (
          <HomeSection onClose={closeZonePanel} />
        ) : zonePanel === 'journey' ? (
          <JourneySection onClose={closeZonePanel} />
        ) : (
          <ZonePanel zoneKey={zonePanel} onClose={closeZonePanel} />
        ))}

      {/* menu section overlays */}
      {section && !zonePanel && (
        (() => {
          const SectionComp = SECTION_COMPONENTS[section]
          return SectionComp ? <SectionComp onClose={closeSection} /> : null
        })()
      )}

      {/* main menu (stays mounted through 'entering' for the fade-out) */}
      {(phase === 'menu' || phase === 'entering') && !section && !zonePanel && (
        <MainMenu
          ready={ready}
          entering={phase === 'entering'}
          onPlay={handlePlay}
          onSection={setSection}
          touch={isTouch}
        />
      )}
      {phase === 'paused' && !section && (
        <PauseMenu
          onResume={resumeWorld}
          onMainMenu={() => setPhase('menu')}
          onSection={(key) => setSection(key)}
        />
      )}
    </div>
  )
}
