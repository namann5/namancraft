import { useEffect } from 'react'
import { useGithubData } from '../../../hooks/useGithubData'
import { useLeetCodeData } from '../../../hooks/useLeetCodeData'
import { ZONES } from '../zones'
import { worldControls } from '../controls'

const FOCUS = ['AI / ML', 'Computer Vision', 'Full-Stack', 'Open Source', 'Hackathons', 'Creative Direction']

const MAJOR_PROJECTS = [
  'Ai_deepfake',
  'Ai_Customer_Service',
  'autonomous-driving-system-clean',
  'MergeShip',
  'SecuScan',
  'UltimateHealth',
  'Rocket.Chat',
  'story-spark-ai',
]

function StatRow({ label, value, children }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[#f4f1ea]/25 py-4">
      <span className="text-sm uppercase tracking-[0.2em] text-[#c9d4cb]/70">{label}</span>
      <span className="font-display text-xl font-medium tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
        {children ?? value}
      </span>
    </div>
  )
}

function AboutPanel() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <p className="font-display text-xl leading-[1.5] tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
        I build weird things that work — AI that spots deepfakes, software that
        drives cars, and open-source tools people actually use.
      </p>
      <p className="text-base font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb]">
        Day job: turning coffee into commits. Side quest: contributing to
        projects like MergeShip, SecuScan, and UltimateHealth.
      </p>
      <div>
        <StatRow label="Base" value="Agra, Uttar Pradesh, India" />
        <StatRow label="Role" value="Creative Developer" />
        <StatRow label="Status" value="Open to opportunities" />
      </div>
    </div>
  )
}

function StatsPanel() {
  const github = useGithubData().data
  const leetcode = useLeetCodeData().data
  const user = github?.user
  return (
    <div className="text-left">
      <StatRow label="Followers" value={user?.followers ?? 0} />
      <StatRow label="Repos" value={github.own.length} />
      <StatRow label="Stars earned" value={github.totalStars.toLocaleString()} />
      <StatRow label="Contributions" value={github.contributionsTotal.toLocaleString()} />
      <StatRow label="LeetCode solved" value={leetcode?.totalSolved ?? '—'} />
      <StatRow
        label="Hard problems"
        value={leetcode?.hardSolved ?? '—'}
      />
      <p className="pt-4 text-xs uppercase tracking-[0.25em] text-[#c9d4cb]/60">
        Live from GitHub & LeetCode APIs
      </p>
    </div>
  )
}

function SkillsPanel() {
  const languages = useGithubData().data?.languages || []
  const maxCount = languages.length ? languages[0][1] : 1
  return (
    <div className="flex flex-col gap-8 text-left">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {FOCUS.map((item) => (
          <span key={item} className="text-sm font-medium uppercase tracking-[0.18em] text-[#c9d4cb]">
            {item}
          </span>
        ))}
      </div>
      <div>
        {languages.slice(0, 6).map(([language, count]) => (
          <div key={language} className="border-b border-[#f4f1ea]/25 py-4">
            <div className="flex items-baseline justify-between gap-6">
              <span className="font-display text-lg font-medium text-[#f4f1ea]">{language}</span>
              <span className="text-sm text-[#c9d4cb]/60">{count} repos</span>
            </div>
            <div className="mt-2 h-px w-full bg-[#f4f1ea]/10">
              <div
                className="h-px bg-[#ffd9a0]"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectsPanel() {
  const data = useGithubData().data
  const all = [...(data.own || []), ...(data.openSource || [])]
  const major = MAJOR_PROJECTS.map((name) => all.find((p) => p.name === name)).filter(Boolean)
  return (
    <ul className="text-left">
      {major.length === 0 && (
        <p className="text-[#c9d4cb]/60">Loading projects from GitHub…</p>
      )}
      {major.map((project) => (
        <li key={project.name} className="border-b border-[#f4f1ea]/25 py-4">
          <a
            href={project.html_url || `https://github.com/namann5/${project.name}`}
            target="_blank"
            rel="noreferrer"
            className="font-display text-xl font-medium tracking-[-0.5px] text-[#f4f1ea] transition-opacity hover:opacity-70"
          >
            {project.name}
          </a>
          <p className="mt-1 text-sm font-medium leading-relaxed text-[#c9d4cb]">
            {project.description || 'No description yet.'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function MinePanel() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <p className="font-display text-xl leading-[1.5] tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
        You found the deepest layer. Let's talk.
      </p>
      <div>
        <StatRow label="Email">
          <a href="mailto:naman.2002.as@gmail.com" className="transition-opacity hover:opacity-70">
            naman.2002.as@gmail.com
          </a>
        </StatRow>
        <StatRow label="GitHub">
          <a
            href="https://github.com/namann5"
            target="_blank"
            rel="noreferrer"
            className="transition-opacity hover:opacity-70"
          >
            github.com/namann5
          </a>
        </StatRow>
      </div>
    </div>
  )
}

// The warm finale — a campfire gathering where every thread of the world
// comes back together: links to reach Naman. The closing circle of the
// overworld journey before (or after) exploring the dimensions.
function CampfirePanel() {
  const rows = [
    { label: 'Email', value: 'naman.2002.as@gmail.com', href: 'mailto:naman.2002.as@gmail.com' },
    { label: 'GitHub', value: 'github.com/namann5', href: 'https://github.com/namann5' },
    { label: 'LinkedIn', value: 'in/naman-singh-dev', href: 'https://www.linkedin.com/in/naman-singh-dev' },
    { label: 'Instagram', value: '@naman5_', href: 'https://www.instagram.com/naman5_' },
  ]
  return (
    <div className="flex flex-col gap-6 text-left">
      <p className="font-display text-xl leading-[1.5] tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
        You walked the whole world — the clock, the house, the portals. Settle in by the fire.
      </p>
      <p className="text-base font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb]">
        Every block here is something real: a repo, a project, a contribution. If any of it
        caught your eye, I'd love to talk.
      </p>
      <div>
        {rows.map((r) => (
          <StatRow key={r.label} label={r.label}>
            <a
              href={r.href}
              target={r.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="transition-opacity hover:opacity-70"
            >
              {r.value}
            </a>
          </StatRow>
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-[#c9d4cb]/60">
        Thanks for adventuring — the fire stays lit
      </p>
    </div>
  )
}

const PANELS = {
  about: AboutPanel,
  stats: StatsPanel,
  skills: SkillsPanel,
  projects: ProjectsPanel,
  mine: MinePanel,
  campfire: CampfirePanel,
}

export default function ZonePanel({ zoneKey, onClose }) {
  const zone = ZONES[zoneKey]
  const Panel = PANELS[zoneKey]

  useEffect(() => {
    const onKey = (e) => {
      if ((e.code === 'KeyE' || e.code === 'Escape') && !e.repeat) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!zone || !Panel) return null

  const resume = (e) => {
    e.stopPropagation()
    onClose()
    worldControls.current?.lock()
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0c120e]/70 p-5 backdrop-blur-sm">
      <div className="glass-card flex max-h-[85svh] w-full max-w-[640px] flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-[#f4f1ea]/25 px-8 pt-7 pb-5">
          <div>
            <h2 className="gradient-text font-display text-3xl font-medium tracking-[-0.02em]">
              {zone.title}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.3em]" style={{ color: zone.accent }}>
              {zone.tagline}
            </p>
          </div>
          <button
            type="button"
            onClick={resume}
            className="shrink-0 cursor-pointer border border-[#f4f1ea]/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f4f1ea]/80 transition-colors hover:bg-[#f4f1ea]/10"
          >
            Keep walking · E
          </button>
        </header>
        <div className="overflow-y-auto px-8 py-6">
          <Panel />
        </div>
      </div>
    </div>
  )
}
