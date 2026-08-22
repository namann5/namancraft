import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import Skills from './pages/Skills'
import Contact from './pages/Contact'
import { initLenis, destroyLenis, getLenis } from './lib/smoothScroll'
import './index.css'

const WorldExperience = lazy(() => import('./world/craft/WorldExperience'))

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])
  return null
}

function App() {
  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ScrollReset />
      <Routes>
        <Route path="/" element={<Suspense fallback={null}><WorldExperience /></Suspense>} />
        <Route path="/classic" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/world" element={<Suspense fallback={null}><WorldExperience /></Suspense>} />
        <Route path="*" element={<Suspense fallback={null}><WorldExperience /></Suspense>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
