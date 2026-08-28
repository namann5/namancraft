import McPanel from './McPanel'
import VoxelIcon from './VoxelIcon'
import { sfx } from '../sound'
import { LINKS, INVENTORY, JOURNEY, ACHIEVEMENTS, RESUME } from '../data/portfolio'
import { useGithubData } from '../../../hooks/useGithubData'

const ABOUT_FACTS = [
  { k: 'Role', v: 'Full Stack Developer' },
  { k: 'Base', v: 'Agra, Uttar Pradesh, India' },
  { k: 'Stack', v: 'Java · JS/React · Node · Python' },
  { k: 'Status', v: 'Open to opportunities' },
]

const PROJECT_NAMES = [
  'Ai_deepfake',
  'Ai_Customer_Service',
  'autonomous-driving-system-clean',
  'MergeShip',
  'SecuScan',
  'UltimateHealth',
  'Rocket.Chat',
  'story-spark-ai',
]

const CONNECT_ROWS = [
  { label: 'GitHub', href: LINKS.github, note: 'namann5', icon: 'compass' },
  { label: 'Email', href: LINKS.email, note: 'naman.2002.as@gmail.com', icon: 'book' },
  { label: 'LinkedIn', href: LINKS.linkedin, note: 'in/naman-singh-dev', icon: 'diamond' },
  { label: 'Instagram', href: LINKS.instagram, note: '@naman5_', icon: 'camera' },
  { label: 'Resume', href: LINKS.resume, note: 'PDF coming soon', icon: 'chest' },
]

function Block({ icon, title, children }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2.5">
        <VoxelIcon type={icon} size={18} />
        <h3 className="font-pixel text-[11px] uppercase tracking-[0.28em] text-[#ffe066]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function FactRow({ k, v }) {
  return (
    <li className="mc-slot flex items-center gap-3 px-4 py-2.5">
      <span className="font-pixel w-20 shrink-0 text-[9px] text-[#ffe066]/80">{k.toUpperCase()}</span>
      <span className="text-sm text-[#c9cfc4]">{v}</span>
    </li>
  )
}

// A single, scrollable "skip the world" résumé — everything a recruiter
// needs in one document. Reuses the same live data as the in-world menus.
export default function QuickView({ onClose }) {
  const github = useGithubData().data
  const all = [...(github.own || []), ...(github.openSource || [])]
  const projects = PROJECT_NAMES.map((n) => all.find((p) => p.name === n)).filter(Boolean)

  return (
    <McPanel
      title="Quick View"
      subtitle="Naman Singh — Full Stack Developer · the whole portfolio on one scroll"
      onClose={onClose}
      wide
    >
      {/* about */}
      <Block icon="chest" title="About">
        <p className="text-sm leading-relaxed text-[#c9cfc4]">
          Creative developer building AI that spots deepfakes, software that drives cars, and
          interfaces people actually use.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ABOUT_FACTS.map((f) => (
            <FactRow key={f.k} {...f} />
          ))}
        </ul>
      </Block>

      {/* skills */}
      <Block icon="sword" title="Skills">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INVENTORY.map((item) => (
            <li key={item.name} className="mc-slot flex items-center gap-2.5 px-3 py-2.5">
              <VoxelIcon type={item.icon} size={22} />
              <span className="font-pixel truncate text-[9px]" style={{ color: item.rarity }}>
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {/* journey / experience */}
      <Block icon="map" title="Experience">
        <ul className="flex flex-col gap-2">
          {JOURNEY.slice(1).map((entry) => (
            <li key={entry.title} className="mc-slot flex items-start gap-3 px-4 py-2.5">
              <span className="font-pixel w-16 shrink-0 pt-0.5 text-[9px] text-[#ffe066]/80">
                {entry.year}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#f4f1ea]">{entry.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#9aa39a]">{entry.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {/* resume rows (education / projects / oss) */}
      <Block icon="book" title="Resume">
        <div className="grid gap-4 sm:grid-cols-2">
          {RESUME.experience && (
            <div>
              <p className="font-pixel mb-2 text-[9px] uppercase tracking-[0.25em] text-[#ffc97e]">
                Experience
              </p>
              <ul className="flex flex-col gap-2">
                {RESUME.experience.map((r) => (
                  <FactRow key={r.k} {...r} />
                ))}
              </ul>
            </div>
          )}
          {RESUME.oss && (
            <div>
              <p className="font-pixel mb-2 text-[9px] uppercase tracking-[0.25em] text-[#ffc97e]">
                Open source
              </p>
              <ul className="flex flex-col gap-2">
                {RESUME.oss.map((r) => (
                  <FactRow key={r.k} {...r} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </Block>

      {/* projects from GitHub */}
      <Block icon="chest" title="Projects">
        {projects.length === 0 ? (
          <p className="mc-slot px-4 py-3 text-center font-pixel text-xs text-[#9aa39a]">
            Loading from GitHub…
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.name}>
                <a
                  href={p.html_url || `${LINKS.github}/${p.name}`}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={sfx.hover}
                  className="mc-slot group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#2e2e2e]"
                >
                  <VoxelIcon type={p.fork ? 'compass' : 'chest'} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="font-pixel block truncate text-xs text-[#f4f1ea] group-hover:text-[#ffe066]">
                      {p.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#9aa39a]">
                      {p.description || 'No description yet.'}
                    </span>
                  </span>
                  {Number(p.stargazers_count) > 0 && (
                    <span className="font-pixel shrink-0 text-[10px] text-[#ffd166]">
                      ★{p.stargazers_count}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {/* achievements */}
      <Block icon="trophy" title="Achievements">
        <ul className="grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.title} className="mc-slot flex items-center gap-3 px-3 py-2.5">
              <VoxelIcon type={a.icon} size={24} />
              <span className="min-w-0">
                <span className="font-pixel block truncate text-[9px] text-[#f4f1ea]">{a.title}</span>
                <span className="mt-1 block text-[11px] leading-snug text-[#9aa39a]">{a.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {/* contact */}
      <Block icon="enderchest" title="Contact">
        <ul className="flex flex-col gap-2">
          {CONNECT_ROWS.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target={r.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                onMouseEnter={sfx.hover}
                className="mc-slot group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#2e2e2e]"
              >
                <VoxelIcon type={r.icon} size={24} />
                <span className="flex-1">
                  <span className="font-pixel block text-[10px] text-[#f4f1ea] group-hover:text-[#ffe066]">
                    {r.label}
                  </span>
                  <span className="mt-1 block text-xs text-[#9aa39a]">{r.note}</span>
                </span>
                <span className="font-pixel text-[10px] text-[#ffe066]/60">→</span>
              </a>
            </li>
          ))}
        </ul>
      </Block>

      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-[#9aa39a]/70">
        This is the whole portfolio in one scroll — or explore it as a realm in-game.
      </p>
    </McPanel>
  )
}
