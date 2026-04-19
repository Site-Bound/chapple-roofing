import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const SERVICES = [
  {
    num: '01',
    id: 'new-roofs',
    title: 'New Roofs',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21H3V10.5z"/></svg>,
    intro: 'Whether your roof is past its best or you are building something new, we manage the full installation from survey to sign-off.',
    body: 'Every new roof starts with a proper survey and a clear, itemised quote so you know exactly what you are getting before a single tile goes up. We use quality materials from trusted suppliers and take the time to do the detailing right — flashings, ridge work, valleys — because that is where most roofs fail.',
    points: ['Full strip and re-roof on residential and commercial properties', 'Natural slate and concrete or clay tile installations', 'Breathable membrane and modern batten systems', 'Ridge, hip, and valley detailing done properly', 'New roof structures for extensions and outbuildings', 'All work guaranteed and fully insured'],
  },
  {
    num: '02',
    id: 'roof-repairs',
    title: 'Roof Repairs',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    intro: 'From a single slipped slate to a persistent leak that nobody else has been able to track down — we find it and fix it properly.',
    body: 'Roof repairs are our bread and butter. Over the years we have tracked down leaks that other roofers could not find, replaced tiles on everything from Victorian terraces to modern new builds, and sorted storm damage quickly and efficiently. If you have got a damp patch, water running down a wall, or something that does not look right, give us a call — we will come and look for free.',
    points: ['Broken, cracked, or slipped tile and slate replacement', 'Leak investigation and repair', 'Flashing repairs and resealing', 'Ridge tile repointing and re-bedding', 'Valley repairs and replacement', 'Storm damage assessment and repair'],
  },
  {
    num: '03',
    id: 'flat-roofs',
    title: 'Flat Roofs',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16"/></svg>,
    intro: 'Modern flat roof systems installed correctly — that means proper falls, quality waterproofing, and a result that lasts 25 years or more.',
    body: 'Flat roofs have a bad reputation that comes entirely from poor installation and cheap materials. When the job is done right — correct system, proper drainage, quality waterproofing — you will not have problems. We work with GRP fibreglass, EPDM rubber, and traditional felt depending on your property and budget, and every installation comes with a guarantee.',
    points: ['GRP fibreglass flat roofs — the most durable solution', 'EPDM rubber roofing systems', 'Traditional felt flat roof replacement', 'Flat roof repairs and patch work', 'Garage roofs, extension roofs, bay windows', 'Proper falls and drainage designed in from the start'],
  },
  {
    num: '04',
    id: 'guttering-fascias',
    title: 'Guttering & Fascias',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12M6 3a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2M6 3v3m12-3v3M6 6h12"/></svg>,
    intro: 'Blocked, sagging, or cracked gutters quietly cause serious damage. We replace or repair them properly before it becomes a bigger problem.',
    body: 'Water finding its way behind gutters and into the wall is one of the most common causes of damp in older properties. We replace gutters and fascias as part of roofing projects and as standalone jobs. Whether you want cast iron maintained, or a full uPVC or aluminium replacement, we will advise honestly and do the work correctly.',
    points: ['Full gutter replacement — uPVC, cast iron, and aluminium', 'Fascia and soffit board replacement', 'Downpipe replacement and rerouting', 'Gutter cleaning and maintenance', 'Gutter joint repair and resealing', 'Valley gutter clearing and repair'],
  },
  {
    num: '05',
    id: 'chimney-work',
    title: 'Chimney Work',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
    intro: 'Chimneys take a battering from Rosudgeon weather. Failed flashing and crumbling mortar are two of the most common sources of hidden damp.',
    body: 'We carry out all chimney-related roofing work — from simple repointing of the flaunching to complete stack rebuilds. A failed lead flashing or crumbling mortar can let water into your chimney breast and cause serious internal damp that is expensive to put right. We will inspect your chimney properly and give you an honest assessment of what needs doing.',
    points: ['Chimney repointing — mortar and flaunching', 'Lead flashing repair and replacement', 'Chimney stack rebuilds and repairs', 'Chimney pot replacement and cowl fitting', 'Damp investigation related to chimney stacks', 'Redundant chimney capping and weatherproofing'],
  },
  {
    num: '06',
    id: 'emergency-call-outs',
    title: 'Emergency Call Outs',
    icon: <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    intro: 'When storm damage or an active leak cannot wait, we respond fast to make your property safe and weathertight.',
    body: 'We offer emergency call-outs across Rosudgeon for situations that cannot wait for a regular appointment. Where possible we aim to be on site the same day to carry out emergency weatherproofing and make the property safe. We can also assist with insurance claims by providing a full written report of the damage.',
    points: ['Storm damage — same-day response where possible', 'Active leaks causing internal water ingress', 'Roof sections lifted or blown away', 'Emergency temporary weatherproofing', 'Fallen ridge tiles and structural damage', 'Insurance damage reports and assessments'],
  },
]

export default function Services() {
  const pageRef = useReveal()

  return (
    <>
      {/* Header */}
      <section style={{ background: '#07101f', paddingTop: '140px', paddingBottom: '72px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
          <svg viewBox="0 0 400 400" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M50 380 L200 40 L350 380" stroke="#e09118" strokeWidth="2"/>
            <path d="M20 380 L200 10 L380 380" stroke="#e09118" strokeWidth="1"/>
          </svg>
        </div>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div className="label" style={{ marginBottom: '24px' }}>What We Do</div>
          <h1 className="display" style={{ fontSize: 'clamp(52px,8vw,108px)', color: '#f6f1e9', maxWidth: '700px' }}>
            Our Roofing<br /><span style={{ color: '#e09118' }}>Services.</span>
          </h1>
          <p style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(15px,1.4vw,17px)', lineHeight: 1.8, color: '#6e8aaa', maxWidth: '560px', marginTop: '24px' }}>
            We cover everything from a single broken tile to a complete re-roof. Every job — large or small — gets the same attention to detail and the same standard of finish.
          </p>
        </div>
      </section>

      {/* Services */}
      <div ref={pageRef}>
        {SERVICES.map(({ num, id, title, icon, intro, body, points }, i) => (
          <section
            key={num}
            id={id}
            style={{
              background: i % 2 === 0 ? '#f6f1e9' : '#ece5da',
              padding: 'clamp(56px,7vw,96px) 0',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Ghost number background */}
            <div aria-hidden style={{
              position: 'absolute', top: '-20px', right: '24px',
              fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900,
              fontSize: 'clamp(120px,18vw,240px)', color: 'rgba(7,16,31,0.05)',
              lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
            }}>
              {num}
            </div>

            <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
              <div style={{ gap: '80px', alignItems: 'start' }} className="grid grid-cols-1 lg:grid-cols-2">

                {/* Left */}
                <div className="reveal-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ width: '52px', height: '52px', background: '#07101f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e09118', flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e09118' }}>
                      {num}
                    </div>
                  </div>
                  <h2 className="display" style={{ fontSize: 'clamp(38px,4.5vw,60px)', color: '#07101f', marginBottom: '16px' }}>
                    {title}
                  </h2>
                  <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '16px', lineHeight: 1.7, color: '#8fa3b5' }}>
                    {intro}
                  </p>
                </div>

                {/* Right */}
                <div className="reveal">
                  <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.85, color: '#5a7080', marginBottom: '28px' }}>
                    {body}
                  </p>
                  <div style={{ gap: '10px 24px' }} className="grid grid-cols-1 sm:grid-cols-2">
                    {points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ width: '6px', height: '6px', background: '#e09118', flexShrink: 0, marginTop: '6px' }} />
                        <span style={{ fontFamily: "'Lora',serif", fontSize: '13px', lineHeight: 1.6, color: '#4e6880' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section style={{ background: '#07101f', padding: 'clamp(56px,7vw,96px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="display" style={{ fontSize: 'clamp(36px,5vw,64px)', color: '#f6f1e9' }}>
                Not Sure<br />What You Need?
              </h2>
              <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.8, color: '#6e8aaa', maxWidth: '440px', marginTop: '16px' }}>
                Give us a call or drop us a message and we will come and take a look for free. Honest advice, no hard sell.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <Link to="/contact" className="btn-amber">Request a Free Quote</Link>
              <a href="tel:07971100197" className="btn-ghost">Call 07971 100197</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
