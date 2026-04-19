import { Link } from 'react-router-dom'

const SERVICE_LINKS = [
  { label: 'New Roofs', to: '/services#new-roofs' },
  { label: 'Roof Repairs', to: '/services#roof-repairs' },
  { label: 'Flat Roofs', to: '/services#flat-roofs' },
  { label: 'Guttering & Fascias', to: '/services#guttering-fascias' },
  { label: 'Chimney Work', to: '/services#chimney-work' },
  { label: 'Emergency Call Outs', to: '/services#emergency-call-outs' },
]

const AREAS = ['Penzance', 'Helston', 'Marazion', 'Porthleven', 'St Ives', 'Hayle', 'Mullion', 'Praa Sands', 'Breage', 'Perranuthnoe']

export default function Footer() {
  return (
    <footer style={{ background: '#040c18', borderTop: '1px solid rgba(224,145,24,0.15)' }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '64px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', paddingBottom: '56px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
              <div style={{ width: '34px', height: '34px', background: '#e09118', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M1 11L10 2L19 11" stroke="#07101f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 8.5V18H16V8.5" stroke="#07101f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '15px', color: '#f6f1e9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chapple Roofing</div>
            </Link>
            <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '14px', color: '#6e8aaa', lineHeight: 1.7 }}>
              [TAGLINE]
            </p>
            <p style={{ fontFamily: "'Lora',serif", fontSize: '13px', color: '#4e6880', lineHeight: 1.7, marginTop: '12px' }}>
              Serving homeowners across Rosudgeon since X.
            </p>
          </div>

          {/* Services */}
          <div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginBottom: '20px' }}>Services</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SERVICE_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} style={{ fontFamily: "'Lora',serif", fontSize: '13px', color: '#6e8aaa', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#bfcfe8'}
                    onMouseLeave={e => e.target.style.color = '#6e8aaa'}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginBottom: '20px' }}>Company</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[{ to: '/', l: 'Home' }, { to: '/about', l: 'About Us' }, { to: '/contact', l: 'Contact' }, { to: '/contact', l: 'Get a Quote' }].map(({ to, l }) => (
                <li key={l}>
                  <Link to={to} style={{ fontFamily: "'Lora',serif", fontSize: '13px', color: '#6e8aaa', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#bfcfe8'}
                    onMouseLeave={e => e.target.style.color = '#6e8aaa'}
                  >{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginBottom: '20px' }}>Get in Touch</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <a href="tel:07971100197" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#bfcfe8', transition: 'color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e09118' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#bfcfe8' }}
              >
                <div style={{ width: '30px', height: '30px', border: '1px solid rgba(224,145,24,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em' }}>07971 100197</span>
              </a>
            </div>
          </div>
        </div>

        {/* Areas */}
        <div style={{ padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e09118', marginRight: '4px' }}>Coverage:</span>
            {AREAS.map(a => (
              <span key={a} style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#4e6880', padding: '3px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>{a}</span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div style={{ padding: '20px 0', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#3d5268' }}>
            &copy; {new Date().getFullYear()} Chapple Roofing. All rights reserved.
          </p>
          <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#3d5268', fontStyle: 'italic' }}>
            Fully insured &middot; Free quotes &middot; Rosudgeon
          </p>
        </div>
      </div>
    </footer>
  )
}
