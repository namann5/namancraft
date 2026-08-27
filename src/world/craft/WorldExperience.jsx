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
import TravelOverlay from './ui/TravelOverlay'
import { ProjectsSection, JourneySection, InventorySection, AchievementsSection, ConnectSection, HomeSection } from './ui/sections'
import { AdvancementPanel, SkillPanel, ProjectPanel, ResumeSectionPanel, ResumeFullPanel } from './ui/dimPanels'
import Portal from './dimensions/Portal'
import VoxelSign from './dimensions/signs'
import { WORLDS, worldMeta } from './dimensions/worlds'
import { useWorldStore, setTravel, travelFx, getField, setArrival } from './dimensions/worldStore'
import { worldControls } from './controls'
import { primeMusic, sfx } from './sound'
import { skipIntro } from './avatar'
import { portalBus } from './dimensions/portalBus'

const SECTION_COMPONENTS = {
  projects: ProjectsSection,
  journey: JourneySection,
  inventory: InventorySection,
  achievements: AchievementsSection,
  connect: ConnectSection,
}

const MENU_CAM_START = INTRO_CAM_START

// ------------------------------------------------------------------
// Portal hub — the four gateways standing in the overworld. Positions
// are snapped to the terrain at runtime so they always sit on grass.
// ------------------------------------------------------------------
const HUB_PORTALS = [
  { id: 'nether', x: -13, z: -36, rotY: Math.PI / 2, title: 'ACHIEVEMENTS', subtitle: 'THE NETHER' },
  { id: 'end', x: -20, z: -66, rotY: Math.PI * 0.72, title: 'RESUME', subtitle: 'THE END' },
  { id: 'skills', x: 14, z: -78, rotY: -Math.PI * 0.72, title: 'SKILLS', subtitle: 'TECH REALM' },
  { id: 'projects', x: 16, z: -88, rotY: -Math.PI / 2, title: 'PROJECTS', subtitle: 'BUILD DISTRICT' },
]

// directional signposts at the path junction, pointing down the trail
const JUNCTION_SIGNS = [
  { x: -4.6, z: -11.6, line: '< THE NETHER', color: '#ffb03a' },
  { x: -1.6, z: -12.1, line: '< THE END', color: '#d9b3ff' },
  { x: 1.6, z: -12.1, line: 'TECH REALM >', color: '#7fe0ae' },
  { x: 4.6, z: -11.6, line: 'BUILD CITY >', color: '#ffd97a' },
]

function PortalHub() {
  const field = getField('overworld')
  if (!field) return null
  return (
    <>
      {HUB_PORTALS.map((h) => (
        <Portal
          key={h.id}
          id={h.id}
          position={[h.x, field.groundAt(h.x, h.z), h.z]}
          rotationY={h.rotY}
          title={h.title}
          subtitle={h.subtitle}
        />
      ))}
      {JUNCTION_SIGNS.map((s) => (
        <VoxelSign
          key={s.line}
          position={[s.x, field.groundAt(s.x, s.z), s.z]}
          lines={[s.line]}
          colors={[s.color]}
          width={3.4}
          height={0.95}
        />
      ))}
    </>
  )
}

function OverworldScene() {
  return (
    <>
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
      <PortalHub />
    </>
  )
}

function DimensionScene({ world }) {
  const def = WORLDS[world]
  if (!def || !def.Component) return null
  const Comp = def.Component
  return (
    <Suspense fallback={null}>
      <Comp />
    </Suspense>
  )
}

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
  const [panel, setPanel] = useState(null) // unified interaction panel
  const [section, setSection] = useState(null)
  const [welcomed, setWelcomed] = useState(false)
  const world = useWorldStore((s) => s.world)
  const travel = useWorldStore((s) => s.travel)
  const panelRef = useRef(null)
  // true from PLAY WORLD until the TPP dolly finishes (guards lock events)
  const flightRef = useRef(false)
  const travelRef = useRef(false)
  const travelTimers = useRef([])
  const isTouch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  // origin hub portal position for spawn-at-hub on return to overworld
  const originRef = useRef(null)
  const [autoWalking, setAutoWalking] = useState(false)

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

  useEffect(() => () => {
    travelTimers.current.forEach(clearTimeout)
  }, [])

  const camMode =
    phase === 'intro' ? 'intro' :
    phase === 'menu' ? 'menu' :
    phase === 'entering' ? 'entering' : 'game'

  const openPanel = useCallback(
    (next) => {
      panelRef.current = next
      setPanel(next)
      if (!isTouch && document.pointerLockElement) document.exitPointerLock()
    },
    [isTouch],
  )

  const closePanel = useCallback(() => {
    panelRef.current = null
    setPanel(null)
    if (!isTouch && document.pointerLockElement == null) worldControls.current?.lock()
  }, [isTouch])

  const closeSection = useCallback(() => setSection(null), [])

  // ---- dimension travel ------------------------------------------------
  const beginTravel = useCallback(
    (toId, opts = {}) => {
      const st = useWorldStore.getState()
      if (st.travel || travelRef.current) return 'busy'
      if (toId === st.world) return 'same'
      const meta = worldMeta(toId)
      sfx.portal()
      travelRef.current = true
      travelFx.active = true
      setTravel({
        to: toId,
        title: meta.travelTitle,
        color: meta.color,
        color2: meta.color2,
        phase: 'out',
      })

      // record arrival so Player can spawn at the right overworld hub
      const fromPortal = originRef.current
      setArrival(toId === 'overworld' && fromPortal ? fromPortal : null)

      const timers = travelTimers.current
      timers.push(setTimeout(() => {
        // swap dimensions under the cover of the collapsing disc
        setTravel((tr) => (tr ? { ...tr, phase: 'hold' } : tr))
        useWorldStore.getState().setWorld(toId)
      }, 800))
      timers.push(setTimeout(() => {
        sfx.arrive()
        setTravel((tr) => (tr ? { ...tr, phase: 'in' } : tr))
      }, 1900))
      timers.push(setTimeout(() => {
        travelTimers.current = []
        travelRef.current = false
        travelFx.active = false
        setTravel(null)
        if (!isTouch && !document.pointerLockElement && panelRef.current == null) {
          // ESC was pressed mid-flight — fall back to the pause menu
          setPhase('paused')
        }
        opts.after?.()
      }, 2500))
      return 'started'
    },
    [isTouch],
  )

  const handleInteract = useCallback(
    (entry) => {
      const st = useWorldStore.getState()
      if (st.travel || travelRef.current) return
      if (entry?.travel) {
        // record which overworld hub we left from so we land there on return
        if (st.world === 'overworld') {
          originRef.current = { x: entry.x, z: entry.z, rotY: entry.rotY ?? 0 }
        } else {
          originRef.current = null
        }
        beginTravel(entry.travel)
        return
      }
      const spec = entry?.panel
      if (!spec) return
      if (spec.type === 'zone') {
        openPanel({ type: 'zone', key: entry.key.replace(/^zone:/, ''), label: entry.label })
      } else {
        openPanel({ type: spec.type, data: spec.data })
      }
    },
    [beginTravel, openPanel],
  )

  // Flight finished: hand control to the player.
  const startPlaying = useCallback(() => {
    flightRef.current = false
    setNearby(null)
    setWelcomed(true)
    setPhase('playing')
  }, [])

  // portal click bus — Portal.jsx fires portalBus.request(id)
  useEffect(() => {
    portalBus.request = (id) => {
      const st = useWorldStore.getState()
      if (st.travel || travelRef.current) return
      // treat any portal click as an interaction
      const entry = { travel: id, x: 0, z: 0 }
      handleInteract(entry)
    }
    return () => { portalBus.request = null }
  }, [handleInteract])

  // auto-walk arrival: Player walks the character to the return portal
  const handleAutoReturn = useCallback(() => {
    const st = useWorldStore.getState()
    if (st.travel || travelRef.current) return
    handleInteract({ travel: 'overworld', x: 0, z: 0 })
  }, [handleInteract])

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

  // quit-to-title travels home first when stranded in another dimension
  const goTitle = useCallback(() => {
    setSection(null)
    if (useWorldStore.getState().world !== 'overworld') {
      beginTravel('overworld', { after: () => setPhase('menu') })
    } else {
      setPhase('menu')
    }
  }, [beginTravel])

  const traveling = Boolean(travel)

  // safety net: if the game is "playing" but pointer lock silently dropped
  // (e.g. a panel closed via ESC inside Chrome's re-lock cooldown), any
  // plain click re-grabs it so input can't stay dead.
  const handleCanvasClick = useCallback(() => {
    if (
      phase === 'playing' &&
      !panel &&
      !section &&
      !traveling &&
      !isTouch &&
      !document.pointerLockElement
    ) {
      worldControls.current?.lock()
    }
  }, [phase, panel, section, traveling, isTouch])

  // tiny automation hook used by the headless smoke tests
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => {
    window.__nc = {
      travel: (id) => beginTravel(id),
      state: () => ({
        world: useWorldStore.getState().world,
        phase: phaseRef.current,
        travel: useWorldStore.getState().travel?.phase ?? null,
      }),
    }
    return () => {
      delete window.__nc
    }
  }, [beginTravel])

  return (
    <div className="fixed inset-0 bg-black" onClick={handleCanvasClick}>
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
        {world === 'overworld' ? <OverworldScene /> : <DimensionScene world={world} />}

        <Player
          camMode={camMode}
          paused={phase === 'paused'}
          touch={isTouch}
          active={phase === 'playing'}
          inputBlocked={Boolean(panel || section)}
          onReady={() => setReady(true)}
          onIntroDone={handleIntroDone}
          onEnterDone={startPlaying}
          onLockChange={(locked) => {
            if (travelRef.current) return // lock churn during teleports is noise
            if (locked) {
              // during the PLAY WORLD dolly the lock event is expected; wait
              if (flightRef.current) return
              if (panelRef.current) {
                panelRef.current = null
                setPanel(null)
              }
              setNearby(null)
              setPhase('playing')
            } else if (flightRef.current) {
              // user bailed mid-transition (ESC)
              flightRef.current = false
              setPhase('paused')
            } else if (!panelRef.current && !section) {
              setPhase((prev) => (prev === 'playing' ? 'paused' : prev))
            }
          }}
          onNearby={setNearby}
          onInteract={handleInteract}
          onAutoReturn={handleAutoReturn}
          onAutoChange={setAutoWalking}
        />
      </Canvas>

      {/* cinematic black opening, fades out once the world appears */}
      {!menuReady && <div className="intro-fade" aria-hidden="true" />}

      {/* dimension teleport cinematics */}
      <TravelOverlay travel={travel} />

      {/* welcome toast: mounted once after the first fly-in, self-hides */}
      {welcomed && !section && !panel && <WelcomeToast show />}

      {/* in-world HUD */}
      {phase === 'playing' && !panel && !section && !traveling && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4f1ea]/80" />
          {autoWalking && (
            <p className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 font-pixel text-[10px] uppercase tracking-[0.3em] text-[#c084fc]/80">
              Heading to the portal...
            </p>
          )}
          {nearby && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
              <p className="mc-slot px-5 py-3 text-sm uppercase tracking-[0.22em] text-[#f4f1ea]" style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,.7), inset -2px -2px 0 rgba(255,255,255,.12), 0 6px 18px rgba(0,0,0,.55)' }}>
                {nearby.travel ? (
                  <span className="font-pixel text-xs text-[#c084fc]">[ CLICK ]</span>
                ) : (
                  <span className="font-pixel text-xs" style={{ color: nearby.accent }}>E</span>
                )}
                <span className="ml-3 text-xs">{nearby.verb || 'View'} {nearby.label}</span>
              </p>
            </div>
          )}
        </>
      )}

      {/* touch controls */}
      {isTouch && phase === 'playing' && !panel && !section && !traveling && (
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
            nearby={Boolean(nearby)}
            accent={nearby ? nearby.accent : '#ffd9a0'}
            onInteract={() => nearby && handleInteract(nearby)}
          />
        </>
      )}

      {/* interaction panels (zones + dimension discoveries) */}
      {panel &&
        (panel.type === 'zone' ? (
          panel.key === 'home' ? (
            <HomeSection onClose={closePanel} />
          ) : panel.key === 'journey' ? (
            <JourneySection onClose={closePanel} />
          ) : (
            <ZonePanel zoneKey={panel.key} onClose={closePanel} />
          )
        ) : panel.type === 'advancement' ? (
          <AdvancementPanel data={panel.data} onClose={closePanel} />
        ) : panel.type === 'skill' ? (
          <SkillPanel data={panel.data} onClose={closePanel} />
        ) : panel.type === 'project' ? (
          <ProjectPanel data={panel.data} onClose={closePanel} />
        ) : panel.type === 'resumeSection' ? (
          <ResumeSectionPanel data={panel.data} onClose={closePanel} />
        ) : panel.type === 'resumeBook' ? (
          <ResumeFullPanel onClose={closePanel} />
        ) : null)}

      {/* menu section overlays */}
      {section && !panel && (
        (() => {
          const SectionComp = SECTION_COMPONENTS[section]
          return SectionComp ? <SectionComp onClose={closeSection} /> : null
        })()
      )}

      {/* main menu (stays mounted through 'entering' for the fade-out) */}
      {(phase === 'menu' || phase === 'entering') && !section && !panel && (
        <MainMenu
          ready={ready}
          entering={phase === 'entering'}
          onPlay={handlePlay}
          onSection={setSection}
          touch={isTouch}
        />
      )}
      {phase === 'paused' && !section && !traveling && (
        <PauseMenu
          onResume={resumeWorld}
          onMainMenu={goTitle}
          onSection={(key) => setSection(key)}
        />
      )}
    </div>
  )
}
