import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
]

function Nav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-[#0c120e]/70 to-transparent pb-8 pt-8 max-sm:pb-5 max-sm:pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 max-sm:gap-x-5">
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `text-sm uppercase tracking-[0.2em] text-[#f4f1ea] max-sm:text-xs max-sm:tracking-[0.15em] ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-80'
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Nav
