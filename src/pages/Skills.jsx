import PageShell from '../components/PageShell'
import { useGithubData } from '../hooks/useGithubData'

const FOCUS = ['AI / ML', 'Computer Vision', 'Full-Stack', 'Open Source', 'Hackathons', 'Creative Direction']

function Skills() {
  const { data } = useGithubData()
  const languages = data?.languages || []
  const maxCount = languages.length ? languages[0][1] : 1

  return (
    <PageShell>
      <div className="w-full max-w-[720px] text-center">
        <h1 className="gradient-text page-title">Skills</h1>
        <div
          className="mx-auto mt-10 h-px w-full bg-[#f4f1ea]/50 max-sm:mt-8"
          aria-hidden="true"
        />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 max-sm:mt-8">
          {FOCUS.map((item) => (
            <span
              key={item}
              className="text-sm font-medium uppercase tracking-[0.2em] text-[#c9d4cb]"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-[620px] text-lg font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb] max-sm:mt-8 max-sm:text-base">
          Sorted by how many repos survive to prove it. Live from GitHub,
          obviously.
        </p>
        <div className="mt-12 text-left">
          {languages.map(([language, count]) => (
            <div
              key={language}
              className="border-b border-[#f4f1ea]/25 py-5 max-sm:py-4"
            >
              <div className="flex items-baseline justify-between gap-6">
                <span className="font-display text-xl font-medium tracking-[-0.4px] text-[#f4f1ea] max-sm:text-lg">
                  {language}
                </span>
                <span className="text-sm text-[#c9d4cb]/60">
                  {count} repo{count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 h-px w-full bg-[#f4f1ea]/10">
                <div
                  className="h-px bg-[#ffd9a0] transition-[width] duration-700"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

export default Skills
