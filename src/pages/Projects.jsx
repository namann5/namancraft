import PageShell from '../components/PageShell'
import ProjectList from '../components/ProjectList'
import { useGithubData } from '../hooks/useGithubData'

const MAJOR_PROJECTS = new Set([
  'Ai_deepfake',
  'Ai_Customer_Service',
  'autonomous-driving-system-clean',
  'MergeShip',
  'SecuScan',
  'UltimateHealth',
  'Rocket.Chat',
  'story-spark-ai',
])

function Projects() {
  const { data } = useGithubData()
  const majorOwn = (data.own || []).filter((p) => MAJOR_PROJECTS.has(p.name))
  const majorOpenSource = (data.openSource || []).filter((p) =>
    MAJOR_PROJECTS.has(p.name),
  )

  return (
    <PageShell>
      <div className="w-full max-w-[720px] text-center">
        <h1 className="gradient-text page-title">Projects</h1>
        <div
          className="mx-auto mt-10 h-px w-full bg-[#f4f1ea]/50 max-sm:mt-8"
          aria-hidden="true"
        />
        <p className="mx-auto mt-10 max-w-[620px] text-lg font-medium leading-[1.6] tracking-[-0.4px] text-[#c9d4cb] max-sm:mt-8 max-sm:text-base">
          A curated selection of the things I've built and shipped.
        </p>
        <div className="mt-12 text-left">
          <ProjectList projects={majorOwn} numbered showFork={false} />
        </div>
        {majorOpenSource.length > 0 && (
          <>
            <p className="mt-16 text-xs uppercase tracking-[0.3em] text-[#c9d4cb]/60">
              // Open source contributions
            </p>
            <div className="mt-8 text-left">
              <ProjectList projects={majorOpenSource} numbered showFork />
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}

export default Projects
