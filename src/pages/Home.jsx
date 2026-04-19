import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const SERVICES = [
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21H3V10.5z"/></svg>,
    title: 'New Roofs',
    desc: 'Full installations from strip to finish — slate, tile, and modern systems built to last decades.',
  },
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    title: 'Roof Repairs',
    desc: 'From a single slipped slate to a persistent leak nobody else can find — we track it down and fix it.',
  },
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16"/></svg>,
    title: 'Flat Roofs',
    desc: 'GRP fibreglass, EPDM rubber, and felt systems installed with proper falls and full waterproofing guarantees.',
  },
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12M6 3a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2M6 3v3m12-3v3M6 6h12"/></svg>,
    title: 'Guttering & Fascias',
    desc: 'New gutters, fascias, and downpipes fitted or replaced. Protect your walls before water causes real damage.',
  },
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
    title: 'Chimney Work',
    desc: 'Repointing, lead flashing, pot replacement, and full stack rebuilds — keeping your chimney tight.',
  },
  {
    icon: <svg width="28" height="28" fill="none" stroke="#e09118" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    title: 'Emergency Call Outs',
    desc: 'Storm damage, active leaks, roof blown off — we respond fast to make your property safe and weathertight.',
  },
]

const REASONS = [
  { n: '01', title: 'X Years of Experience', body: 'Operating across Rosudgeon since X, we have worked on hundreds of properties — from Victorian terraces to modern extensions. When we say we have seen it before, we mean it.' },
  { n: '02', title: 'Fully Insured on Every Job', body: 'Full public liability insurance is in place on every project we take on. You are covered, your property is covered, and there are no grey areas.' },
  { n: '03', title: 'No Hidden Costs. Ever.', body: 'Every quote is clear, itemised, and agreed before we start. What we quote is what you pay. We will never hit you with extras once the work is underway.' },
  { n: '04', title: 'Built on Word of Mouth', body: 'Our reputation has grown almost entirely through recommendations. We are not a national franchise — we care about every job because our next customer hears about it from the last one.' },
  { n: '05', title: 'Quality Materials Throughout', body: 'We only use materials we trust. No substitutions, no budget alternatives slipped in without telling you. Every job is done the way we would want our own home done.' },
  { n: '06', title: 'Free Roof Inspections', body: 'Not sure if you have a problem? We will come and look, give you an honest opinion, and tell you exactly what — if anything — needs doing. No charge, no obligation.' },
]

const TRUST = [
  { fig: 'X+', sub: 'Years Trading' },
  { fig: 'X+', sub: 'Roofs Completed' },
  { fig: '100%', sub: 'Fully Insured' },
  { fig: '£0', sub: 'Call-Out Charge' },
]

export default function Home() {
  const svcRef = useReveal()
  const whyRef = useReveal()
  const aboutRef = useReveal()

  return (
    <>
      {/* ── HERO ── */}
      <section
        style={{
          minHeight: '100vh',
          background: '#07101f',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Background decorative SVG — layered roof lines */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, right: '-5%', width: '60%', height: '100%',
            opacity: 0.055, pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <path d="M100 650 L300 80 L500 650" stroke="#e09118" strokeWidth="2"/>
            <path d="M60 650 L300 30 L540 650" stroke="#e09118" strokeWidth="1.2"/>
            <path d="M20 650 L300 -30 L580 650" stroke="#e09118" strokeWidth="0.7"/>
            <path d="M140 650 L300 130 L460 650" stroke="#e09118" strokeWidth="1.5"/>
            <path d="M180 650 L300 180 L420 650" stroke="#e09118" strokeWidth="1"/>
            <line x1="300" y1="80" x2="300" y2="650" stroke="#e09118" strokeWidth="0.6" strokeDasharray="6 10"/>
          </svg>
        </div>

        {/* Grid texture overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(224,145,24,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(224,145,24,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Main hero content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: '100px', paddingBottom: '40px' }}>
          <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', width: '100%' }}>

            {/* Label */}
            <div className="label h-anim" style={{ animationDelay: '0.1s', marginBottom: '40px' }}>
              Rosudgeon &nbsp;·&nbsp; Fully Insured &nbsp;·&nbsp; Free Quotes
            </div>

            {/* Headline */}
            <div style={{ marginBottom: '32px' }}>
              <div
                className="display h-anim"
                style={{
                  fontSize: 'clamp(62px, 10.5vw, 148px)',
                  color: '#f6f1e9',
                  animationDelay: '0.28s',
                }}
              >
                HONEST
              </div>
              <div
                className="display h-anim"
                style={{
                  fontSize: 'clamp(70px, 13vw, 188px)',
                  color: '#f6f1e9',
                  animationDelay: '0.44s',
                  letterSpacing: '-0.02em',
                }}
              >
                ROOFING.
              </div>
              <div
                className="display h-anim"
                style={{
                  fontSize: 'clamp(44px, 7vw, 102px)',
                  color: '#e09118',
                  animationDelay: '0.6s',
                }}
              >
                DONE RIGHT.
              </div>
            </div>

            {/* Amber bar */}
            <div
              className="amber-bar h-anim"
              style={{ animationDelay: '0.72s', marginBottom: '28px' }}
            />

            {/* Body copy */}
            <p
              className="h-anim"
              style={{
                animationDelay: '0.82s',
                fontFamily: "'Lora', serif", fontSize: 'clamp(15px, 1.4vw, 18px)',
                lineHeight: 1.8, color: '#6e8aaa',
                maxWidth: '520px', marginBottom: '40px',
              }}
            >
              Chapple Roofing has been keeping homes weatherproof across Penzance,
              Helston, Marazion, and Porthleven since X. Honest quotes, quality materials,
              and work that stands the test of time.
            </p>

            {/* CTAs */}
            <div className="h-anim" style={{ animationDelay: '0.94s', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <Link to="/contact" className="btn-amber">
                Get a Free Quote
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <a href="tel:07971100197" className="btn-ghost">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
                07971 100197
              </a>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div
          className="h-anim-fade"
          style={{
            animationDelay: '1.1s',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '24px', gap: '16px' }} className="grid grid-cols-2 sm:grid-cols-4">
            {TRUST.map(({ fig, sub }) => (
              <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '2px', height: '40px', background: '#e09118', flexShrink: 0 }} />
                <div>
                  <div className="stat-fig" style={{ fontSize: '28px' }}>{fig}</div>
                  <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4e6880' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section ref={svcRef} style={{ background: '#f6f1e9', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: '56px' }}>
            <div className="label-static reveal" style={{ marginBottom: '20px' }}>What We Do</div>
            <h2
              className="display reveal d1"
              style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', color: '#07101f', maxWidth: '600px' }}
            >
              Every Roofing Job<br />Covered.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
            {SERVICES.map(({ icon, title, desc }, i) => (
              <div key={title} className={`svc-card reveal d${i + 1}`}>
                <div style={{ marginBottom: '20px' }}>{icon}</div>
                <h3 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '22px', letterSpacing: '0.02em', color: '#07101f', marginBottom: '12px' }}>
                  {title}
                </h3>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '14px', lineHeight: 1.75, color: '#6e8aaa' }}>{desc}</p>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ marginTop: '48px' }}>
            <Link to="/services" className="btn-dark">
              See All Services in Detail
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section ref={whyRef} style={{ background: '#07101f', padding: 'clamp(64px,8vw,112px) 0', position: 'relative', overflow: 'hidden' }}>
        {/* Background numeral */}
        <div aria-hidden style={{ position: 'absolute', top: '-20px', right: '-40px', fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 'clamp(200px,30vw,400px)', color: 'rgba(224,145,24,0.03)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          WHY
        </div>

        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{ gap: '64px', alignItems: 'start', marginBottom: '64px' }} className="grid grid-cols-1 md:grid-cols-2">
            <div>
              <div className="label-static reveal" style={{ color: '#e09118', marginBottom: '20px' }}>Why Choose Us</div>
              <h2 className="display reveal d1" style={{ fontSize: 'clamp(40px,5.5vw,70px)', color: '#f6f1e9', lineHeight: 0.92 }}>
                We Don't<br />Cut Corners.<br /><span style={{ color: '#e09118' }}>Period.</span>
              </h2>
            </div>
            <div className="reveal d2" style={{ paddingTop: '8px' }}>
              <p style={{ fontFamily: "'Lora',serif", fontSize: '16px', lineHeight: 1.85, color: '#6e8aaa' }}>
                There is no shortage of roofers in Rosudgeon. What separates the good ones from the rest is simple: turning up on time, doing the job properly, and standing behind the work. That is what we have built our reputation on — one roof at a time, entirely through word of mouth.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0' }}>
            {REASONS.map(({ n, title, body }, i) => (
              <div key={n} className={`reason-item reveal d${(i % 3) + 1}`} style={{ padding: '28px 0 28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingRight: '32px' }}>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: '13px', letterSpacing: '0.12em', color: '#e09118', marginBottom: '10px' }}>{n}</div>
                <h3 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '20px', color: '#f6f1e9', marginBottom: '10px', lineHeight: 1.1 }}>{title}</h3>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '13px', lineHeight: 1.75, color: '#6e8aaa' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT SNIPPET ── */}
      <section ref={aboutRef} style={{ background: '#ece5da', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ gap: '80px', alignItems: 'center' }} className="grid grid-cols-1 md:grid-cols-2">

            {/* Left: large decorative stat */}
            <div className="reveal-left">
              <div style={{
                fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900,
                fontSize: 'clamp(100px,16vw,200px)', color: '#07101f', lineHeight: 0.85,
                letterSpacing: '-0.04em',
              }}>X</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginTop: '8px', marginBottom: '32px' }}>
                Years in the Trade
              </div>
              <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                {[['X+', 'Roofs Completed'], ['100%', 'Fully Insured'], ['0', 'Hidden Fees']].map(([n, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: '32px', color: '#07101f', lineHeight: 1 }}>{n}</div>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8fa3b5', marginTop: '4px' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: text */}
            <div className="reveal">
              <div className="label-static" style={{ color: '#e09118', marginBottom: '20px' }}>About Us</div>
              <h2 className="display" style={{ fontSize: 'clamp(36px,4.5vw,58px)', color: '#07101f', marginBottom: '24px' }}>
                Roofing Built on<br />Reputation.
              </h2>
              <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080', marginBottom: '16px' }}>
                Chapple Roofing has been serving Rosudgeon since X. Built on a straightforward idea: do quality work, be straight with customers, and stand behind every job.
              </p>
              <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080', marginBottom: '32px' }}>
                Almost all of our business comes through recommendations. That is not an accident — it is the result of consistently doing things right, from the first phone call to the final clean-up.
              </p>
              <Link to="/about" className="btn-dark">
                Read Our Story
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #c4780c 0%, #e09118 50%, #f5b030 100%)', padding: 'clamp(56px,7vw,96px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 'clamp(40px,6vw,80px)', color: '#07101f', marginBottom: '20px' }}>
            Let's Get Your<br />Roof Sorted.
          </h2>
          <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: 'clamp(15px,1.5vw,18px)', color: 'rgba(7,16,31,0.65)', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            Free inspection, honest quote, no obligation. We cover Penzance, Helston, Marazion, Porthleven, and all surrounding areas.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <Link to="/contact" className="btn-dark">Request a Free Quote</Link>
            <a href="tel:07971100197" className="btn-outline-dark">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call 07971 100197
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
