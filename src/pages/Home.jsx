import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Nav from '../components/Nav'
import StatCounter from '../components/StatCounter'
import Marquee from '../components/Marquee'
import { useGithubData } from '../hooks/useGithubData'
import { useLeetCodeData } from '../hooks/useLeetCodeData'
import { GITHUB_USERNAME } from '../lib/github'
import { LEETCODE_USERNAME } from '../lib/leetcode'
import { scrollState } from '../lib/smoothScroll'

const MARQUEE_ITEMS = [
  'Deepfake Detection',
  'Autonomous Driving',
  'AI Customer Service',
  'MergeShip',
  'SecuScan',
  'UltimateHealth',
  'StorySpark AI',
  'Open Source',
  'Hackathons',
  'Node.js',
  'React',
  'Python',
  'TypeScript',
]

function useScrollProgress() {
  const [progress, setProgress] = useState(scrollState.progress)
  useEffect(() => {
    let rafId
    let last = scrollState.progress
    const tick = () => {
      if (Math.abs(scrollState.progress - last) > 0.003) {
        last = scrollState.progress
        setProgress(last)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])
  return progress
}

function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-1000 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function Chapter({ eyebrow, title, children, id }) {
  return (
    <section
      id={id}
      className="relative flex min-h-svh items-center justify-center px-5 py-24 max-sm:py-16"
    >
      <Reveal>
        <div className="glass-card flex w-[min(100%,720px)] flex-col items-center gap-10 px-10 py-14 text-center max-sm:gap-7 max-sm:px-7 max-sm:py-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#c9d4cb]/70 sm:text-sm sm:tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="gradient-text font-display text-5xl font-medium leading-[1.05] tracking-[-0.02em] max-sm:text-4xl">
            {title}
          </h2>
          {children}
        </div>
      </Reveal>
    </section>
  )
}

function Hero({ progress, user }) {
  const opacity = Math.max(1 - progress * 6, 0)
  const y = progress * -60

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center px-5 pt-28 pb-40">
      <div
        className="flex w-[min(100%,760px)] flex-col items-center gap-8 text-center max-sm:gap-6"
        style={{ opacity, transform: `translateY(${y}px)` }}
      >
        <p className="text-xs uppercase tracking-[0.4em] text-[#c9d4cb]/80 sm:text-sm sm:tracking-[0.35em]">
          {user?.location || 'Agra, Uttar Pradesh, India'} · Creative Developer
        </p>
        <h1 className="hero-title">Naman Singh</h1>
        <div className="h-px w-[min(90%,480px)] bg-[#f4f1ea]/70" aria-hidden="true" />
        <p className="max-w-[560px] text-xl font-medium leading-[1.35] tracking-[-0.5px] text-[#f4f1ea]/90 max-sm:text-lg max-sm:tracking-[-0.3px]">
          I build AI that catches deepfakes, software that drives cars, and
          interfaces people actually use.
        </p>
        <p className="text-sm uppercase tracking-[0.25em] text-[#c9d4cb]/70">
          Open source · Hackathons · Rabbit holes
        </p>
      </div>

      <div className="scroll-hint absolute bottom-20 flex flex-col items-center gap-3" aria-hidden="true">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#c9d4cb]/70">
          Scroll to climb
        </span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path
            d="M8 2v20M8 22l-6-6M8 22l6-6"
            stroke="#f4f1ea"
            strokeOpacity="0.7"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  )
}

function Home() {
  const progress = useScrollProgress()
  const { data } = useGithubData()
  const leetcode = useLeetCodeData().data
  const user = data?.user

  const stats = [
    { value: user.followers ?? 0, label: 'Followers' },
    { value: data.own.length, label: 'Repos' },
    { value: data.totalStars, label: 'Stars' },
    { value: data.contributionsTotal, label: 'Contributions' },
  ]

  const featured = (data.featured || []).slice(0, 3)

  return (
    <main className="font-brand relative min-h-svh w-full overflow-x-hidden bg-[#0c120e]">
      <header className="fixed left-1/2 top-6 z-20 -translate-x-1/2">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
      </header>

      <div className="relative z-10 flex flex-col">
        <Hero progress={progress} user={user} />

        <Marquee items={MARQUEE_ITEMS} />

        <Chapter id="numbers" eyebrow={`// live from github.com/${GITHUB_USERNAME}`} title="The numbers">
          <div className="grid w-full grid-cols-2 gap-10 sm:grid-cols-4">
            {stats.map((stat) => (
              <StatCounter key={stat.label} {...stat} />
            ))}
          </div>
          <p className="text-sm font-medium tracking-[-0.3px] text-[#c9d4cb]/80">
            Pulled straight from the repo. Every star earned its keep.
          </p>
        </Chapter>

        <Chapter id="work" eyebrow="// Selected work" title="Trails I've walked">
          {featured.length === 0 ? (
            <p className="text-base font-medium tracking-[-0.4px] text-[#c9d4cb]/70">
              Nothing here yet — the summit still ahead.
            </p>
          ) : (
            <ul className="w-full text-left">
              {featured.map((project, index) => (
                <li
                  key={project.name}
                  className="flex flex-col gap-1 border-b border-[#f4f1ea]/25 py-6 max-sm:py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="text-sm text-[#c9d4cb]/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <a
                      href={project.html_url || `https://github.com/namann5/${project.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-display text-2xl font-medium tracking-[-0.5px] text-[#f4f1ea] transition-opacity hover:opacity-70"
                    >
                      {project.name}
                    </a>
                  </div>
                  <p className="text-sm font-medium tracking-[-0.2px] text-[#c9d4cb]/70 sm:max-w-[55%] sm:text-right">
                    {project.language || '—'}
                    {project.stargazers_count > 0 && ` · ★ ${project.stargazers_count}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/projects"
            className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffd9a0] transition-opacity hover:opacity-70"
          >
            View all projects →
          </Link>
        </Chapter>

        <Chapter id="summit" eyebrow="// The summit" title="A slow climb">
          <p className="max-w-[540px] text-lg font-medium leading-[1.6] tracking-[-0.4px] text-[#f4f1ea]/85 max-sm:text-base">
            Every mountain starts at the bottom. Mine started with a deepfake
            detector, kept going through self-driving software, and now climbs
            open source by open source.
          </p>
          <p className="text-base font-medium leading-[1.6] tracking-[-0.3px] text-[#c9d4cb]/75 max-sm:text-sm">
            Day job: turning coffee into commits. Side quest: contributing to
            projects until the neighbors' WiFi router gives up.
          </p>
          <Link
            to="/about"
            className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffd9a0] transition-opacity hover:opacity-70"
          >
            Read the summit story →
          </Link>
        </Chapter>

        <Chapter id="basecamp" eyebrow="// Base camp" title="Let's talk">
          <a
            href="mailto:naman.2002.as@gmail.com"
            className="block break-all text-2xl font-medium leading-[1.1] tracking-[-1px] text-[#f4f1ea] transition-opacity hover:opacity-70 max-sm:text-xl"
          >
            naman.2002.as@gmail.com
          </a>
          <p className="max-w-[520px] text-base font-medium leading-[1.6] tracking-[-0.3px] text-[#c9d4cb]/75 max-sm:text-sm">
            {leetcode.totalSolved} problems solved · ranked #{leetcode.ranking.toLocaleString()}{' '}
            on LeetCode. Open to work, collabs, and conversations. Reply time:
            faster than a GitHub Actions run.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <Link to="/projects" className="text-sm uppercase tracking-[0.25em] text-[#f4f1ea]/70 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]">
              Projects
            </Link>
            <Link to="/skills" className="text-sm uppercase tracking-[0.25em] text-[#f4f1ea]/70 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]">
              Skills
            </Link>
            <Link to="/contact" className="text-sm uppercase tracking-[0.25em] text-[#f4f1ea]/70 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]">
              Contact
            </Link>
            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm uppercase tracking-[0.25em] text-[#f4f1ea]/70 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]"
            >
              GitHub
            </a>
            <a
              href={`https://leetcode.com/${LEETCODE_USERNAME}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm uppercase tracking-[0.25em] text-[#f4f1ea]/70 transition-opacity hover:opacity-100 hover:text-[#f4f1ea]"
            >
              LeetCode
            </a>
          </div>
        </Chapter>

        <footer className="relative z-10 px-5 pb-36 pt-10">
          <div className="mx-auto flex w-[min(100%,720px)] flex-col items-center gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c9d4cb]/50">
              © 2026 Naman Singh
            </p>
            <p className="text-sm font-medium tracking-[-0.3px] text-[#c9d4cb]/60">
              Built among the mountains with React, Three.js, and Lenis.
            </p>
          </div>
        </footer>
      </div>

      <Nav />
    </main>
  )
}

export default Home
