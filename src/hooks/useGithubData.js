import { useEffect, useState } from 'react'
import { fetchGithubData, buildDataFromFallback } from '../lib/github'

export function useGithubData() {
  const [data, setData] = useState(() => buildDataFromFallback())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchGithubData()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
