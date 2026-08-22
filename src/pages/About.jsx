import PageShell from '../components/PageShell'
import { useGithubData } from '../hooks/useGithubData'
import { GITHUB_USERNAME } from '../lib/github'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#f4f1ea]/25 py-5 max-sm:py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="text-xs uppercase tracking-[0.25em] text-[#c9d4cb]/60">
        {label}
      </span>
      <span className="font-display text-xl font-medium tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
        {value}
      </span>
    </div>
  )
}

function About() {
  const { data } = useGithubData()
  const user = data?.user
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'May 2025'

  const rows = [
    { label: 'Name', value: user.name || GITHUB_USERNAME },
    { label: 'Bio', value: user.bio || 'Craxyy stuff' },
    { label: 'Location', value: user.location || 'Agra, Uttar Pradesh' },
    { label: 'Followers', value: String(user.followers ?? 0) },
    { label: 'Public repos', value: String(data.own.length) },
    { label: 'Contributions', value: data.contributionsTotal.toLocaleString() },
    { label: 'Joined GitHub', value: joined },
  ]

  return (
    <PageShell>
      <div className="w-full max-w-[720px] text-center">
        <h1 className="gradient-text page-title">About</h1>
        <div
          className="mx-auto mt-10 h-px w-full bg-[#f4f1ea]/50 max-sm:mt-8"
          aria-hidden="true"
        />
        <div className="mt-10 flex flex-col gap-8 max-sm:mt-8">
          <p className="font-display text-xl font-normal leading-[1.5] tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
            I build weird things that work — AI that spots deepfakes, software
            that drives cars, and open-source tools people actually use.
          </p>
          <p className="text-lg font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb] max-sm:text-base">
            Day job: turning coffee into commits. Side quest: contributing to
            projects like MergeShip, SecuScan, and UltimateHealth until the
            neighbors' WiFi router gives up.
          </p>
        </div>
        <div className="mt-12 text-left">
          {rows.map((row) => (
            <InfoRow key={row.label} {...row} />
          ))}
        </div>
      </div>
    </PageShell>
  )
}

export default About
