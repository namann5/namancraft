import { Link } from 'react-router-dom'
import Logo from './Logo'
import Nav from './Nav'

function PageShell({ children }) {
  return (
    <main className="font-brand isolate relative min-h-svh w-full overflow-x-hidden bg-[#0c120e]">
      <header className="fixed left-1/2 top-6 z-20 -translate-x-1/2">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
      </header>
      <div className="relative z-10 flex flex-col items-center px-5 pt-36 pb-32 max-sm:pt-28">
        {children}
      </div>
      <Nav />
    </main>
  )
}

export default PageShell
