import McPanel from './McPanel'
import VoxelIcon from './VoxelIcon'
import { useGithubData } from '../../../hooks/useGithubData'
import { INVENTORY, JOURNEY, ACHIEVEMENTS, LINKS } from '../data/portfolio'
import { sfx } from '../sound'

export function ProjectsSection({ onClose }) {
  const data = useGithubData().data
  const all = [...(data.own || []), ...(data.openSource || [])]
  const names = [
    'Ai_deepfake',
    'Ai_Customer_Service',
    'autonomous-driving-system-clean',
    'MergeShip',
    'SecuScan',
    'UltimateHealth',
    'Rocket.Chat',
    'story-spark-ai',
  ]
  const projects = names.map((n) => all.find((p) => p.name === n)).filter(Boolean)

  return (
    <McPanel title="Projects" subtitle="Structures built & shipped" onClose={onClose} wide>
      <ul className="flex flex-col gap-3">
        {projects.length === 0 && (
          <li className="font-pixel py-6 text-center text-xs text-[#9aa39a]">Loading from GitHub…</li>
        )}
        {projects.map((p, i) => (
          <li key={p.name}>
            <a
              href={p.html_url || `${LINKS.github}/${p.name}`}
              target="_blank"
              rel="noreferrer"
              onMouseEnter={sfx.hover}
              className="mc-slot group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#2e2e2e]"
            >
              <span className="font-pixel w-8 shrink-0 text-xs text-[#ffe066]/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <VoxelIcon type={p.fork ? 'compass' : 'chest'} size={30} />
              <span className="min-w-0 flex-1">
                <span className="font-pixel block truncate text-xs text-[#f4f1ea] transition-colors group-hover:text-[#ffe066]">
                  {p.name}
                </span>
                <span className="mt-2 block truncate text-sm text-[#9aa39a]">
                  {p.description || 'No description yet.'}
                </span>
              </span>
              {Number(p.stargazers_count) > 0 && (
                <span className="font-pixel shrink-0 text-xs text-[#ffd166]" title={`${p.stargazers_count} stars`}>
                  ★{p.stargazers_count}
                </span>
              )}
              {p.fork && (
                <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[#5ec8f0]">OSS</span>
              )}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-xs uppercase tracking-[0.25em] text-[#9aa39a]/70">
        Full list on GitHub
      </p>
    </McPanel>
  )
}

const ABOUT = {
  intro:
    'Creative developer building AI that spots deepfakes, software that drives cars, and interfaces people actually use.',
  interests: ['AI & computer vision', 'Autonomous systems', 'Open source', '3D / clay worlds'],
  philosophy:
    'Build things that ship. Favor clean architecture, honest tooling, and small sharp commits over demo-ware — every structure in this world corresponds to something real.',
  focus:
    'Deepfake detection · Autonomous driving · AI customer service · and this very world (the Peacock Realms).',
}

export function HomeSection({ onClose }) {
  const facts = [
    { k: 'Role', v: 'Full Stack Developer' },
    { k: 'Base', v: 'Agra, Uttar Pradesh, India' },
    { k: 'Stack', v: 'Java · JS/React · Node · Python' },
    { k: 'Status', v: 'Open to opportunities' },
  ]
  return (
    <McPanel title="The Haveli" subtitle="Inside the ancestral home — about the builder" onClose={onClose} wide>
      <p className="text-sm leading-relaxed text-[#c9cfc4]">{ABOUT.intro}</p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {facts.map((f) => (
          <li key={f.k} className="mc-slot flex items-center gap-3 px-4 py-3">
            <span className="font-pixel shrink-0 text-[10px] text-[#ffe066]/80">{f.k}</span>
            <span className="text-sm text-[#c9cfc4]">{f.v}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <section>
          <h3 className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#ffc97e]">Interests</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {ABOUT.interests.map((i) => (
              <li key={i} className="mc-slot px-3 py-2 text-sm text-[#c9cfc4]">
                {i}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#ffc97e]">Now</h3>
          <p className="mt-2 mc-slot px-3 py-2 text-sm leading-relaxed text-[#c9cfc4]">{ABOUT.focus}</p>
        </section>
      </div>

      <section className="mt-5">
        <h3 className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#ffc97e]">Development philosophy</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#9aa39a]">{ABOUT.philosophy}</p>
      </section>
    </McPanel>
  )
}

export function JourneySection({ onClose }) {
  return (
    <McPanel title="My Journey" subtitle="The road so far" onClose={onClose} wide>
      <ol className="relative flex flex-col gap-1 border-l-[3px] border-black pl-0">
        {JOURNEY.map((entry, i) => (
          <li key={i} className="relative flex gap-4 py-3 pl-5 pr-2">
            <span
              className="absolute -left-[11px] top-6 h-4 w-4 border-[3px] border-black"
              style={{ background: i % 2 ? '#7a5a33' : '#3ddc84' }}
              aria-hidden="true"
            />
            <div className="mc-slot shrink-0 px-3 py-2">
              <span className="font-pixel text-[10px] text-[#ffe066]">{entry.year}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-pixel text-xs leading-relaxed text-[#f4f1ea]">{entry.title}</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#9aa39a]">{entry.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </McPanel>
  )
}

export function InventorySection({ onClose }) {
  return (
    <McPanel title="My Toolkit" subtitle="Technical skills — tools of the trade" onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {INVENTORY.map((item) => (
          <div key={item.name} className="group relative">
            <button
              type="button"
              onMouseEnter={sfx.hover}
              className="mc-slot flex aspect-square w-full flex-col items-center justify-center gap-2 p-2 transition-colors hover:bg-[#333]"
              aria-label={`${item.name} — ${item.note}`}
            >
              <VoxelIcon type={item.icon} size={40} />
              <span className="font-pixel max-w-full truncate px-1 text-[9px]" style={{ color: item.rarity }}>
                {item.name}
              </span>
            </button>
            <div className="mc-tooltip pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 px-3 py-2 text-center font-pixel text-[9px] leading-relaxed group-hover:block">
              {item.note}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[10px] uppercase tracking-[0.3em] text-[#9aa39a]/70">
        Hover an item for lore · Live language stats at the Stat Farm in-world
      </p>
    </McPanel>
  )
}

const RARITY_COLORS = {
  common: '#cdcdcd',
  rare: '#5ec8f0',
  epic: '#c78aff',
}

export function AchievementsSection({ onClose }) {
  const github = useGithubData().data
  const extras = [
    github?.totalStars > 0 && `★ ${github.totalStars} stars earned`,
    github?.contributionsTotal > 0 && `${github.contributionsTotal.toLocaleString()} contributions`,
  ].filter(Boolean)

  return (
      <McPanel title="Medals" subtitle="Honours earned" onClose={onClose} wide>
      <ul className="flex flex-col gap-3">
        {ACHIEVEMENTS.map((a) => (
          <li key={a.title} className="mc-slot flex items-center gap-4 px-4 py-3.5">
            <VoxelIcon type={a.icon} size={34} />
            <div className="min-w-0 flex-1">
              <h3 className="font-pixel text-xs" style={{ color: RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common }}>
                {a.title}
              </h3>
              <p className="mt-2 text-sm leading-snug text-[#9aa39a]">{a.text}</p>
            </div>
          </li>
        ))}
        {extras.length > 0 && (
          <li className="pt-1 text-center text-xs uppercase tracking-[0.25em] text-[#9aa39a]/80">
            {extras.join(' · ')}
          </li>
        )}
      </ul>
    </McPanel>
  )
}

export function ConnectSection({ onClose }) {
  const rows = [
    { label: 'GitHub', href: LINKS.github, note: 'namann5', icon: 'compass' },
    { label: 'Email', href: LINKS.email, note: 'naman.2002.as@gmail.com', icon: 'book' },
    { label: 'LinkedIn', href: LINKS.linkedin, note: 'in/naman-singh-dev', icon: 'diamond' },
    { label: 'Instagram', href: LINKS.instagram, note: '@naman5_', icon: 'camera' },
    { label: 'Resume', href: LINKS.resume, note: 'PDF coming soon', icon: 'chest' },
  ]
  return (
    <McPanel title="Connect" subtitle="Open the courtyard gate" onClose={onClose}>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label}>
            <a
              href={r.href}
              target={r.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              onMouseEnter={sfx.hover}
              className="mc-slot group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[#2e2e2e]"
            >
              <VoxelIcon type={r.icon} size={32} />
              <span className="flex-1">
                <span className="font-pixel block text-xs text-[#f4f1ea] transition-colors group-hover:text-[#ffe066]">
                  {r.label}
                </span>
                <span className="mt-2 block truncate text-sm text-[#9aa39a]">{r.note}</span>
              </span>
              <span className="font-pixel text-xs text-[#ffe066]/60">→</span>
            </a>
          </li>
        ))}
      </ul>
    </McPanel>
  )
}
