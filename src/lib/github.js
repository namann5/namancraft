import { FALLBACK_CONTRIBUTIONS, FALLBACK_REPOS, FALLBACK_USER } from './fallback'

export const GITHUB_USERNAME = 'namann5'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function sumTotal(total) {
  if (!total) return 0
  if (typeof total === 'number') return total
  return Object.values(total).reduce((acc, n) => acc + Number(n), 0)
}

export function derive(repos) {
  const own = (repos || [])
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
  const featured = own.filter((r) => r.description || r.homepage).slice(0, 4)
  const totalStars = own.reduce((acc, r) => acc + r.stargazers_count, 0)
  const counts = {}
  own.forEach((r) => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1
  })
  const languages = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const openSource = (repos || [])
    .filter((r) => r.fork)
    .sort((a, b) => (b.description ? 1 : 0) - (a.description ? 1 : 0))
  return { own, featured, totalStars, languages, openSource }
}

export function buildDataFromFallback() {
  const contributions = FALLBACK_CONTRIBUTIONS.contributions || []
  return {
    user: FALLBACK_USER,
    repos: FALLBACK_REPOS,
    contributions,
    contributionsTotal: sumTotal(FALLBACK_CONTRIBUTIONS.total),
    ...derive(FALLBACK_REPOS),
  }
}

function mergeRepos(curated, live) {
  const byName = new Map()
  for (const repo of curated) byName.set(repo.name, repo)
  for (const repo of live) {
    const existing = byName.get(repo.name)
    if (existing) {
      byName.set(repo.name, { ...repo, ...existing })
    } else {
      byName.set(repo.name, repo)
    }
  }
  return [...byName.values()]
}

export async function fetchGithubData() {
  const [userRes, reposRes, contribRes] = await Promise.allSettled([
    fetchJson(`https://api.github.com/users/${GITHUB_USERNAME}`),
    fetchJson(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
    ),
    fetchJson(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}`),
  ])

  const user = userRes.status === 'fulfilled' ? userRes.value : FALLBACK_USER
  const liveRepos = reposRes.status === 'fulfilled' ? reposRes.value : []
  const contributionsRaw =
    contribRes.status === 'fulfilled' ? contribRes.value : FALLBACK_CONTRIBUTIONS

  const repos = mergeRepos(FALLBACK_REPOS, liveRepos)

  return {
    user,
    repos,
    contributions: Array.isArray(contributionsRaw)
      ? contributionsRaw
      : contributionsRaw.contributions || [],
    contributionsTotal: sumTotal(contributionsRaw.total),
    ...derive(repos),
  }
}
