import { useEffect, useState } from 'react'
import { fetchLeetCodeData, buildLeetCodeFromFallback } from '../lib/leetcode'

export function useLeetCodeData() {
  const [data, setData] = useState(() => buildLeetCodeFromFallback())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchLeetCodeData()
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
