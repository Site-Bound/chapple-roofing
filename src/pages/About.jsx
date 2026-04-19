import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const VALUES = [
  { n: '01', title: 'Honest Assessment', body: 'If your roof only needs a small repair, we will tell you. We are not here to sell you a full replacement you do not need. Our business runs on referrals, and that only works when people trust us.' },
  { n: '02', title: 'On Time, Every Time', body: 'We show up when we say we will. We keep you informed as work progresses. When we are done, we clear up properly. It sounds basic, but it is how we have operated since day one.' },
  { n: '03', title: 'Materials We Would Use at Home', body: 'We do not substitute quality materials for cheaper alternatives to save a few pounds. Every component that goes on your roof is something we would put on our own.' },
  { n: '04', title: 'Work That Actually Lasts', body: 'A quick fix that fails in 18 months is not a fix — it is an inconvenience with a delayed bill attached. We take the time to do things properly so you are not calling us back for the same problem.' },
]

const AREAS = ['Penzance', 'Helston', 'Marazion', 'Porthleven', 'St Ives', 'Hayle', 'Mullion', 'Praa Sands', 'Breage', 'Perranuthnoe']

export default function About() {
  const ref1 = useReveal()
  const ref2 = useReveal()
  const ref3 = useReveal()

  return (
    <>
      {/* Header */}
      <section style={{ background: '#07101f', paddingTop: '140px', paddingBottom: '72px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', bottom: '-60px', left: '-40px', fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 'clamp(140px,22vw,280px)', color: 'rgba(224,145,24,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>X</div>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div className="label" style={{ marginBottom: '24px' }}>Our Story</div>
          <h1 className="display" style={{ fontSize: 'clamp(52px,8vw,108px)', color: '#f6f1e9', maxWidth: '700px' }}>
            About<br /><span style={{ color: '#e09118' }}>Chapple Roofing</span>
          </h1>
          <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: 'clamp(15px,1.4vw,17px)', lineHeight: 1.8, color: '#6e8aaa', maxWidth: '520px', marginTop: '24px' }}>
            A roofing company that takes pride in its work, looks after its customers, and always turns up when it says it will.
          </p>
        </div>
      </section>

      {/* Story section */}
      <section ref={ref1} style={{ background: '#f6f1e9', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ gap: '80px', alignItems: 'start' }} className="grid grid-cols-1 lg:grid-cols-2">

            {/* Big stat */}
            <div className="reveal-left" style={{ position: 'relative' }}>
              <div style={{ borderLeft: '4px solid #e09118', paddingLeft: '28px', marginBottom: '40px' }}>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 'clamp(80px,13vw,160px)', color: '#07101f', lineHeight: 0.85 }}>X</div>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginTop: '10px' }}>Years Trading</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[['X+', 'Roofs Completed'], ['£0', 'Hidden Fees'], ['100%', 'Fully Insured'], ['Rosudgeon', 'Coverage']].map(([n, l]) => (
                  <div key={l} style={{ background: 'white', padding: '20px', borderTop: '3px solid #e09118' }}>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: '28px', color: '#07101f', lineHeight: 1 }}>{n}</div>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8fa3b5', marginTop: '6px' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Story text */}
            <div className="reveal">
              <h2 className="display" style={{ fontSize: 'clamp(32px,4vw,52px)', color: '#07101f', marginBottom: '28px' }}>
                Rosudgeon Born<br />and Bred.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080' }}>
                  Chapple Roofing has served Rosudgeon since X, built on a simple premise: be straight with customers, use decent materials, and do the job properly.
                </p>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080' }}>
                  Over more than a decade, we have worked on hundreds of properties across the region — Victorian terraced houses, modern extensions, commercial units, and everything in between. The problems change, the standards do not.
                </p>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080' }}>
                  Our business has grown almost entirely through word of mouth. When a customer recommends us to a neighbour, it is because we did the job right, charged a fair price, and were easy to deal with. That is the standard we hold ourselves to on every single job.
                </p>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080' }}>
                  We are fully insured, we work to current British Standards, and we only use materials from trusted UK suppliers. Every quote is free, clear, and itemised — no ambiguity, no surprises.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section ref={ref2} style={{ background: '#07101f', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: '56px' }}>
            <div className="label-static reveal" style={{ marginBottom: '20px' }}>How We Work</div>
            <h2 className="display reveal d1" style={{ fontSize: 'clamp(38px,5.5vw,72px)', color: '#f6f1e9', maxWidth: '560px' }}>
              The Principles<br />Behind Every Job.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
            {VALUES.map(({ n, title, body }, i) => (
              <div key={n} className={`reveal d${i + 1}`} style={{ background: '#0b1829', padding: '36px 28px', borderTop: '3px solid rgba(224,145,24,0.15)', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderTopColor = '#e09118'}
                onMouseLeave={e => e.currentTarget.style.borderTopColor = 'rgba(224,145,24,0.15)'}
              >
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.14em', color: '#e09118', marginBottom: '16px' }}>{n}</div>
                <h3 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '22px', color: '#f6f1e9', marginBottom: '14px', lineHeight: 1.1 }}>{title}</h3>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '14px', lineHeight: 1.75, color: '#6e8aaa' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas + Standards */}
      <section ref={ref3} style={{ background: '#ece5da', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ gap: '80px' }} className="grid grid-cols-1 lg:grid-cols-2">

            {/* Areas */}
            <div className="reveal-left">
              <div className="label-static" style={{ marginBottom: '20px' }}>Where We Work</div>
              <h2 className="display" style={{ fontSize: 'clamp(32px,4vw,52px)', color: '#07101f', marginBottom: '28px' }}>Coverage<br />Across the<br />Rosudgeon.</h2>
              <p style={{ fontFamily: "'Lora',serif", fontSize: '14px', lineHeight: 1.8, color: '#5a7080', marginBottom: '28px' }}>
                We cover a wide area across Rosudgeon. If you are not sure whether we work in your location, just give us a call — there is a good chance we do.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AREAS.map(a => (
                  <span key={a} style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#5a7080', padding: '5px 12px', border: '1px solid rgba(7,16,31,0.15)', background: 'white' }}>{a}</span>
                ))}
              </div>
            </div>

            {/* Standards */}
            <div className="reveal">
              <div className="label-static" style={{ marginBottom: '20px' }}>Our Standards</div>
              <h2 className="display" style={{ fontSize: 'clamp(32px,4vw,52px)', color: '#07101f', marginBottom: '28px' }}>Professional<br />Standards on<br />Every Job.</h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Full public liability insurance — covered on every job',
                  'Works to current British Standard for roofing ([INDUSTRY STANDARD])',
                  'All materials sourced from approved UK suppliers',
                  'Ongoing professional development to stay current',
                  'DBS checked — safe to work in occupied homes',
                  'Free written quotations with clear, itemised pricing',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#e09118', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <svg width="12" height="12" fill="none" stroke="#07101f" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <span style={{ fontFamily: "'Lora',serif", fontSize: '14px', lineHeight: 1.7, color: '#5a7080' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #c4780c 0%, #e09118 50%, #f5b030 100%)', padding: 'clamp(56px,7vw,96px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 'clamp(36px,5.5vw,72px)', color: '#07101f', marginBottom: '20px' }}>
            Ready to Work With Us?
          </h2>
          <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '17px', lineHeight: 1.8, color: 'rgba(7,16,31,0.6)', marginBottom: '36px', maxWidth: '440px', margin: '0 auto 36px' }}>
            Free inspection, clear quote, no obligation. Get in touch today.
          </p>
          <Link to="/contact" className="btn-dark">Contact Us Today</Link>
        </div>
      </section>
    </>
  )
}
