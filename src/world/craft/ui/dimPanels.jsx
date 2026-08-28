import McPanel from './McPanel'
import VoxelIcon from './VoxelIcon'
import { sfx } from '../sound'
import { LINKS, RESUME, ACHIEVEMENTS } from '../data/portfolio'
import { useGithubData } from '../../../hooks/useGithubData'

// ------------------------------------------------------------------
// Dimension overlay panels — opened via [E] interactions inside the
// dimensions. All share the McPanel stone-slab shell so they feel
// like in-world game windows rather than webpage cards.
// ------------------------------------------------------------------

const RARITY_COLORS = {
  common: '#cdcdcd',
  rare: '#5ec8f0',
  epic: '#c78aff',
}

export function AdvancementPanel({ data, onClose }) {
  const color = RARITY_COLORS[data.rarity] || RARITY_COLORS.common
  return (
    <McPanel title={data.title} subtitle="Advancement unlocked" onClose={onClose}>
      <div className="flex items-center gap-4">
        <VoxelIcon type={data.icon} size={52} />
        <div className="flex flex-col gap-2">
          <span className="font-pixel text-[10px]" style={{ color }}>
            {(data.rarity || 'common').toUpperCase()}
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#9aa39a]">
            {data.category} · {data.date}
          </span>
        </div>
      </div>
      <p className="mc-slot mt-5 px-4 py-4 text-sm leading-relaxed text-[#c9cfc4]">{data.text}</p>
      <p className="mt-5 text-center text-[10px] uppercase tracking-[0.3em] text-[#9aa39a]/70">
        Advancement progress saved to the guild ledger
      </p>
    </McPanel>
  )
}

function LevelPips({ level }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-4 w-4 border-[3px] border-black"
          style={{
            background: n <= level ? '#7ddc6a' : '#242424',
            boxShadow: n <= level ? 'inset -2px -2px 0 rgba(0,0,0,.35), inset 2px 2px 0 rgba(255,255,255,.35)' : 'inset 2px 2px 0 rgba(0,0,0,.55)',
          }}
        />
      ))}
    </div>
  )
}

export function SkillPanel({ data, onClose }) {
  return (
    <McPanel title={data.name} subtitle={`${data.category} · Rangoli Court station`} onClose={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-pixel text-[10px] uppercase" style={{ color: data.color }}>
          Experience level
        </span>
        <LevelPips level={data.level} />
      </div>
      <p className="mt-6 font-pixel text-[10px] uppercase tracking-[0.25em] text-[#9aa39a]">
        Built with it
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {data.built.map((b) => (
          <li key={b} className="mc-slot px-4 py-3 text-sm text-[#c9cfc4]">
            {b}
          </li>
        ))}
      </ul>
    </McPanel>
  )
}

const PROJECT_FEATURES = {
  Ai_deepfake: [
    'Detects synthetic media with computer-vision models',
    'End-to-end training and inference pipeline',
    'Results presented with explainability in mind',
  ],
  autonomous_driving_system_clean: [
    'Perception module for road scene understanding',
    'Planning and control layers on top',
    'Clean architecture kept testable end to end',
  ],
  Ai_Customer_Service: [
    'Context-aware support conversations',
    'Full-stack platform, not just a demo',
    'Follow-through so tickets actually resolve',
  ],
}

export function ProjectPanel({ data, onClose }) {
  const github = useGithubData().data
  const all = [...(github.own || []), ...(github.openSource || [])]
  const repo =
    all.find((p) => p.name === data.name) ||
    all.find((p) => p.name.toLowerCase() === data.name.toLowerCase())

  const url = repo?.html_url || `${LINKS.github}/${data.name}`
  const featureKey = data.name.replace(/-/g, '_')
  const features = PROJECT_FEATURES[featureKey]
  const description =
    repo?.description ||
    (data.tag === 'OPEN SOURCE' ? 'Open-source contribution work.' : null)

  return (
    <McPanel
      title={data.name.replace(/_/g, ' ').replace(/-/g, ' ')}
      subtitle={data.tag}
      onClose={onClose}
      wide
    >
      <p className="mc-slot px-4 py-4 text-sm leading-relaxed text-[#c9cfc4]">
        {description || 'A project shipped by Naman — open the repo for the full story.'}
      </p>

      {features && (
        <>
          <p className="mt-5 font-pixel text-[10px] uppercase tracking-[0.25em] text-[#ffe066]/80">
            Key features
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {features.map((f) => (
              <li key={f} className="mc-slot flex items-center gap-3 px-4 py-2.5 text-sm text-[#c9cfc4]">
                <span className="h-3 w-3 shrink-0 border-2 border-black bg-[#3ddc84]" />
                {f}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={url} target="_blank" rel="noreferrer" onMouseEnter={sfx.hover} className="mc-btn mc-btn--primary font-pixel px-4 py-3 text-[10px]">
          GITHUB REPO →
        </a>
        {repo && Number(repo.stargazers_count) > 0 && (
          <span className="font-pixel text-xs text-[#ffd166]">★ {repo.stargazers_count}</span>
        )}
        {repo?.fork && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#5ec8f0]">OSS contribution</span>
        )}
      </div>
      {!repo && (
        <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-[#9aa39a]/70">
          Loading live repo data…
        </p>
      )}
    </McPanel>
  )
}

const RESUME_TITLES = {
  education: 'Education',
  experience: 'Experience',
  oss: 'Open Source',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
}

function ResumeRows({ rows }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.k} className="mc-slot flex items-start gap-4 px-4 py-3">
          <span className="font-pixel w-20 shrink-0 pt-1 text-[9px] text-[#ffe066]/80">{r.k.toUpperCase()}</span>
          <span className="text-sm leading-relaxed text-[#c9cfc4]">{r.v}</span>
        </li>
      ))}
    </ul>
  )
}

export function ResumeSectionPanel({ data, onClose }) {
  const topic = data.topic
  const title = RESUME_TITLES[topic] || data.title

  return (
    <McPanel title={title} subtitle="Temple of the Past · resume archive" onClose={onClose}>
      {topic === 'achievements' ? (
        <ul className="flex flex-col gap-2">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.title} className="mc-slot flex items-center gap-3 px-4 py-3">
              <VoxelIcon type={a.icon} size={26} />
              <span className="text-sm text-[#c9cfc4]">{a.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ResumeRows rows={RESUME[topic] || [{ k: 'Soon', v: 'This page is still being written.' }]} />
      )}
    </McPanel>
  )
}

// The giant central book opens the full resume.
export function ResumeFullPanel({ onClose }) {
  return (
    <McPanel title="Resume" subtitle="Naman Singh — Full Stack Developer" onClose={onClose} wide>
      {Object.entries(RESUME).map(([topic, rows]) => (
        <section key={topic} className="mb-6">
          <h3 className="font-pixel mb-3 text-[10px] uppercase tracking-[0.3em] text-[#ffe066]">
            {RESUME_TITLES[topic]}
          </h3>
          <ResumeRows rows={rows} />
        </section>
      ))}
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-[#9aa39a]/70">
        PDF version coming soon · everything above is live in this world
      </p>
    </McPanel>
  )
}
