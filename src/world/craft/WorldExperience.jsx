import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFSoftShadowMap, RepeatWrapping } from 'three'
import * as THREE from 'three'
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
import QuickView from './ui/QuickView'
import { AdvancementPanel, SkillPanel, ProjectPanel, ResumeSectionPanel, ResumeFullPanel } from './ui/dimPanels'
import Portal from './dimensions/Portal'
import VoxelSign from './dimensions/signs'
import { WORLDS, worldMeta } from './dimensions/worlds'
import { useWorldStore, setTravel, travelFx, getField, setArrival } from './dimensions/worldStore'
import { worldControls } from './controls'
import { primeMusic, sfx } from './sound'
import { skipIntro } from './avatar'
import { portalBus } from './dimensions/portalBus'
import { getQuality } from './quality'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

const SECTION_COMPONENTS = {
  projects: ProjectsSection,
  journey: JourneySection,
  inventory: InventorySection,
  achievements: AchievementsSection,
  connect: ConnectSection,
  quickview: QuickView,
}

const MENU_CAM_START = INTRO_CAM_START

// Eagerly fetch a dimension's lazy chunk ahead of the world swap so the
// destination is ready the moment the portal overlay lifts (cuts perceived
// load pop). Overworld is a GLB rendered directly, so it's skipped here.
function preloadWorld(id) {
  const Comp = WORLDS[id]?.Component
  if (!Comp || id === 'overworld') return
  try {
    const payload = Comp._payload
    if (payload && typeof payload.then === 'function') {
      payload.then(() => {})
    } else if (Comp._init) {
      Comp._init(Comp._payload)
    }
  } catch {
    /* already loading or loaded — fine */
  }
}

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
      <fogExp2 attach="fog" args={['#e8a06a', 0.0038]} baseDensity={0.0038 * getQuality().fogDensityScale} />
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
  const emisRef = useRef([])

  useEffect(() => {
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh) return
      obj.receiveShadow = true
      const name = obj.material?.name || ''
      const mat = obj.material

      // water: translucent, slightly reflective animated surface
      if (name.includes('water')) {
        waterRef.current = obj
        obj.castShadow = false
        mat.transparent = true
        mat.opacity = 0.82
        if (mat.map) {
          mat.map.wrapS = RepeatWrapping
          mat.map.wrapT = RepeatWrapping
        }
        mat.roughness = 0.35
        mat.metalness = 0.1
        mat.envMapIntensity = 0.9
        return
      }

      obj.castShadow = true

      // emissive night surfaces: warm windows, flames, beacons, clock
      // glow, pink blossom and flowers all "light up" after dusk.
      if (
        name.startsWith('mat_beacon_') ||
        name === 'mat_flame' ||
        name === 'mat_window' ||
        name === 'mat_clockglow' ||
        name === 'mat_blossom' ||
        name.startsWith('mat_flower_')
      ) {
        emisRef.current.push(obj)
        mat.toneMapped = false
        return
      }

      // opaque voxel surfaces: keep the shared texture, make them matte
      // so they catch shader light instead of looking plasticky.
      mat.roughness = 0.94
      mat.metalness = 0
      mat.envMapIntensity = 0.5

      // ---- realistic voxel shading ------------------------------------
      // Bake directional shading + deterministic value noise + contact
      // AO into vertex colors so the baked world reads like the live
      // dimensions (top bright, sides darker, subtle per-block variation).
      // Kept off emissive/water above; applied to everything else.
      applyVertexShading(obj)
    })
    return () => {
      waterRef.current = null
      emisRef.current = []
    }
  }, [gltf.scene])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const water = waterRef.current
    if (water?.material?.map) {
      water.material.map.offset.x = Math.sin(t * 0.08) * 0.06
      water.material.map.offset.y = (water.material.map.offset.y - dt * 0.02) % 1
    }
    const boost = dayState.glowBoost // 1 (day) .. ~2.1 (night)
    for (let i = 0; i < emisRef.current.length; i += 1) {
      const mesh = emisRef.current[i]
      const n = mesh.material?.name || ''
      const m = mesh.material
      if (n === 'mat_flame') {
        m.emissiveIntensity = (1.2 + Math.sin(t * 11 + i * 2.3) * 0.25 + Math.sin(t * 23 + i) * 0.12) * boost
        m.emissive.set('#ff9a3c')
      } else if (n === 'mat_window') {
        m.emissiveIntensity = (0.85 + Math.sin(t * 1.4 + i * 1.9) * 0.12) * boost
        m.emissive.set('#ffcf7a')
      } else if (n === 'mat_clockglow') {
        m.emissive.set('#ffe9c0')
        m.emissiveIntensity = (0.7 + Math.sin(t * 2 + i) * 0.18) * boost
      } else if (n === 'mat_blossom') {
        m.emissive.set('#ff9ec0')
        m.emissiveIntensity = (0.35 + Math.sin(t * 1.2 + i) * 0.12) * boost * 0.5
      } else if (n.startsWith('mat_flower_')) {
        m.emissiveIntensity = (0.4 + Math.sin(t * 1.6 + i * 1.3) * 0.14) * boost * 0.6
      } else {
        // beacons keep their own accent colour
        m.emissiveIntensity = (0.8 + Math.sin(t * 2 + i * 1.7) * 0.35) * boost
      }
    }
  })

  return <primitive object={gltf.scene} />
}

// ------------------------------------------------------------------
// Realistic voxel shading for the baked overworld.
//
// The live dimensions bake directional light + AO + value-noise into
// per-vertex colors (see dimensions/voxelMesh.js). The overworld GLB has
// textures but no vertex colors, so it tends to look uniformly flat. This
// reproduces the same "top bright / sides darker / subtle jitter" model
// so the whole world shares one consistent, Minecraft-with-shaders look.
// ------------------------------------------------------------------
function applyVertexShading(mesh) {
  const geo = mesh.geometry
  if (!geo || !geo.attributes.position || !geo.attributes.normal) return
  const pos = geo.attributes.position
  const norm = geo.attributes.normal

  let color = geo.attributes.color
  if (!color) {
    color = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3)
    color.needsUpdate = true
    geo.setAttribute('color', color)
  }
  const col = color.array

  // per-block hash so neighbouring voxels vary slightly (like real voxel AO)
  const hash = (x, y, z) => {
    let h = (x * 374761393 + y * 668265263 + z * 1440662683) | 0
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) >>> 0) / 4294967295
  }

  for (let i = 0; i < pos.count; i += 1) {
    const nx = pos.getX(i)
    const ny = pos.getY(i)
    const nz = pos.getZ(i)
    const px = norm.getX(i)
    const py = norm.getY(i)
    const pz = norm.getZ(i)

    // directional shade by face orientation (same ramp as voxel mesher)
    const top = Math.max(0, py)
    const side = Math.max(0, Math.abs(px), Math.abs(pz))
    let shade = 0.55 + 0.45 * top + 0.22 * side

    // subtle deterministic jitter per block for texture variety
    shade *= 0.94 + 0.12 * hash(Math.floor(nx), Math.floor(ny), Math.floor(nz))

    // crude contact AO: faces low to the ground get a little darker
    const heightAo = Math.max(0, 1 - Math.min(1, Math.max(0, ny + 3) / 9)) * 0.16
    shade *= 1 - heightAo

    // top faces (grass/stone) catch a warm highlight at anchor height
    if (py > 0.8 && ny > 0) shade *= 1.04

    col[i * 3] = shade
    col[i * 3 + 1] = shade
    col[i * 3 + 2] = shade
  }
  color.needsUpdate = true
  geo.computeBoundingSphere()

  // let the material tint the textured albedo by these vertex colors
  if (mesh.material) {
    mesh.material.vertexColors = true
    mesh.material.needsUpdate = true
  }
}

// Accessible static fallback for browsers without WebGL: the portfolio
// stays fully readable (and links out to the classic scroll site) even
// when the 3D world cannot render.
function NoWebGL() {
  return (
    <div className="nc-fallback">
      <h1 className="font-pixel text-xl text-[#ffe066]">NAMANCRAFT</h1>
      <p className="font-pixel mt-2 text-[10px] uppercase tracking-[0.3em] text-[#9aa39a]">
        Naman Singh — Full Stack Developer
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <a href={`${import.meta.env.BASE_URL}classic`} className="mc-btn mc-btn--primary font-pixel px-5 py-3 text-xs">
          OPEN CLASSIC SITE →
        </a>
        <span className="text-xs uppercase tracking-[0.25em] text-[#9aa39a]">
          WebGL is off in this browser — the 3D block world can’t render.
        </span>
        <a
          href="mailto:naman.2002.as@gmail.com"
          className="mt-1 text-sm text-[#f4f1ea] underline-offset-4 hover:underline"
        >
          naman.2002.as@gmail.com
        </a>
        <a
          href="https://github.com/namann5"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[#c9d4cb] underline-offset-4 hover:underline"
        >
          github.com/namann5
        </a>
      </div>
    </div>
  )
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
  const [webglOk, setWebglOk] = useState(null) // null = not yet checked
  const world = useWorldStore((s) => s.world)
  const travel = useWorldStore((s) => s.travel)
  const panelRef = useRef(null)

  // WebGL capability check — if 3D is unavailable, show a plain fallback
  // so the portfolio stays readable (no WebGL, no broken black screen).
  useEffect(() => {
    let ok = false
    try {
      const c = document.createElement('canvas')
      const gl =
        c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')
      ok = Boolean(gl)
    } catch {
      ok = false
    }
    setWebglOk(ok)
  }, [])

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

  // reduced-motion users skip the walking intro outright — go straight to
  // the menu instead of the cinematic dolly.
  const reducedMotion = usePrefersReducedMotion()
  useEffect(() => {
    if (reducedMotion && phase === 'intro') {
      skipIntro()
      setPhase('menu')
      setMenuReady(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

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
      // eagerly fetch the destination chunk while the portal overlay plays
      preloadWorld(toId)
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

  // WebGL unavailable → readable static fallback instead of a black void.
  // (Also shown briefly while the capability check runs, before the Canvas
  // is allowed to mount — placed after every hook, stable order.)
  if (webglOk !== true) {
    return <NoWebGL />
  }

  return (
    <div className="fixed inset-0 bg-black" onClick={handleCanvasClick}>
      <Canvas
        shadows
        dpr={getQuality().dpr}
        gl={{ antialias: getQuality().antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 70, near: 0.1, far: 700, position: MENU_CAM_START }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = PCFSoftShadowMap
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

      {/* accessible skip button during the opening cinematic */}
      {phase === 'intro' && (
        <button
          type="button"
          onClick={skipIntro}
          onMouseEnter={sfx.hover}
          className="mc-btn font-pixel absolute right-4 z-40 px-4 py-2.5 text-xs"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          aria-label="Skip intro animation"
        >
          SKIP »
        </button>
      )}

      {/* dimension teleport cinematics */}
      <TravelOverlay travel={travel} />

      {/* cinematic letterbox — subtle framing that deepens mid-travel */}
      <div className={`nc-letterbox nc-letterbox--top${travel ? ' nc-letterbox--travel' : ''}`} aria-hidden="true" />
      <div className={`nc-letterbox nc-letterbox--bottom${travel ? ' nc-letterbox--travel' : ''}`} aria-hidden="true" />

      {/* welcome toast: mounted once after the first fly-in, self-hides */}
      {welcomed && !section && !panel && <WelcomeToast show />}

      {/* in-world HUD */}
      {phase === 'playing' && !panel && !section && !traveling && (
        <>
          <div className="nc-reticle" data-active={nearby ? 'true' : 'false'} aria-hidden="true">
            <i className="nc-reticle-corner nc-reticle-tl" />
            <i className="nc-reticle-corner nc-reticle-tr" />
            <i className="nc-reticle-corner nc-reticle-bl" />
            <i className="nc-reticle-corner nc-reticle-br" />
            <span className="nc-reticle-dot" />
          </div>
          {autoWalking && (
            <p className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 font-pixel text-[10px] uppercase tracking-[0.3em] text-[#c084fc]/80">
              {world === 'overworld' ? 'Traveling onward...' : 'Heading to the portal...'}
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
            className="mc-btn font-pixel absolute right-4 z-20 px-4 py-2.5 text-xs"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
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

      {/* persistent cinematic vignette */}
      <div className="nc-vignette" />
    </div>
  )
}
