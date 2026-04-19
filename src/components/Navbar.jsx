import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? '#07101f' : 'rgba(7,16,31,0.88)',
        borderBottom: `1px solid ${scrolled ? 'rgba(224,145,24,0.18)' : 'transparent'}`,
        backdropFilter: 'blur(10px)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* Amber top stripe */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #e09118 0%, #b8760f 100%)' }} />

      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '38px', height: '38px', background: '#e09118',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M1 11L10 2L19 11" stroke="#07101f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8.5V18H16V8.5" stroke="#07101f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 800, fontSize: '16px', letterSpacing: '0.04em',
              color: '#f6f1e9', lineHeight: 1.1, textTransform: 'uppercase',
            }}>
              Chapple Roofing
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ alignItems: 'center', gap: '4px' }} className="hidden md:flex">
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
            <Link to="/contact" className="btn-amber" style={{ padding: '10px 22px', fontSize: '12px', marginLeft: '12px' }}>
              Free Quote
            </Link>
          </nav>

          {/* Hamburger */}
          <button
            className="md:hidden"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bfcfe8', padding: '8px' }}
          >
            {open ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: '#0b1829', borderTop: '1px solid rgba(224,145,24,0.12)' }}>
          <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '16px 24px 24px' }}>
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ display: 'block', padding: '14px 0', fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                {label}
              </NavLink>
            ))}
            <Link to="/contact" className="btn-amber" style={{ marginTop: '20px', justifyContent: 'center', width: '100%' }}>
              Get a Free Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
