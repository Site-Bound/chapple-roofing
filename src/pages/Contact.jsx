import { useState } from 'react'
import { useReveal } from '../hooks/useReveal'

const SERVICES = ['New Roof', 'Roof Repair', 'Flat Roof', 'Guttering & Fascias', 'Chimney Work', 'Emergency Call Out', 'Not Sure — Need Advice']

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const ref = useReveal()

  function change(e) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
    if (errors.contact && (name === 'phone' || name === 'email')) setErrors(p => ({ ...p, contact: '' }))
  }

  function submit(e) {
    e.preventDefault()
    const err = {}
    if (!form.name.trim()) err.name = 'Please enter your name'
    if (!form.phone.trim() && !form.email.trim()) err.contact = 'Please provide a phone number or email'
    if (!form.message.trim()) err.message = 'Please describe the work you need'
    if (Object.keys(err).length) { setErrors(err); return }
    setSent(true)
  }

  return (
    <>
      {/* Header */}
      <section style={{ background: '#07101f', paddingTop: '140px', paddingBottom: '72px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: '-20px', right: '-40px', fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 'clamp(140px,22vw,280px)', color: 'rgba(224,145,24,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          GET IN<br />TOUCH
        </div>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div className="label" style={{ marginBottom: '24px' }}>Get in Touch</div>
          <h1 className="display" style={{ fontSize: 'clamp(52px,8vw,108px)', color: '#f6f1e9', maxWidth: '700px' }}>
            Free Quote.<br /><span style={{ color: '#e09118' }}>No Obligation.</span>
          </h1>
          <p style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(15px,1.4vw,17px)', lineHeight: 1.8, color: '#6e8aaa', maxWidth: '520px', marginTop: '24px' }}>
            Fill in the form or give us a call. We will come and look at the job, tell you honestly what needs doing, and give you a clear, itemised quote — all completely free.
          </p>
        </div>
      </section>

      {/* Main contact section */}
      <section ref={ref} style={{ background: '#f6f1e9', padding: 'clamp(64px,8vw,112px) 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ gap: '80px', alignItems: 'start' }} className="grid grid-cols-1 lg:grid-cols-2">

            {/* Form */}
            <div className="reveal-left">
              {sent ? (
                <div style={{ background: 'white', padding: '56px 40px', borderTop: '4px solid #e09118', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', background: '#e09118', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <svg width="24" height="24" fill="none" stroke="#07101f" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '32px', color: '#07101f', marginBottom: '12px' }}>Message Sent</h2>
                  <p style={{ fontFamily: "'Lora',serif", fontSize: '15px', lineHeight: 1.8, color: '#5a7080', maxWidth: '360px', margin: '0 auto' }}>
                    Thanks for getting in touch. We will review your enquiry and respond as soon as possible — usually the same day.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} noValidate style={{ background: 'white', padding: '40px', borderTop: '4px solid #e09118' }}>
                  <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '26px', color: '#07101f', marginBottom: '32px' }}>
                    Tell Us About Your Roof
                  </h2>

                  <div style={{ gap: '20px', marginBottom: '20px' }} className="grid grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="form-label">Full Name <span style={{ color: '#e09118' }}>*</span></label>
                      <input name="name" value={form.name} onChange={change} placeholder="Your name" className={`form-input${errors.name ? ' error' : ''}`} />
                      {errors.name && <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label className="form-label">Type of Work</label>
                      <select name="service" value={form.service} onChange={change} className="form-input" style={{ cursor: 'pointer' }}>
                        <option value="">Select a service...</option>
                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ gap: '20px', marginBottom: '20px' }} className="grid grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input name="phone" value={form.phone} onChange={change} placeholder="07971 100197" type="tel" className={`form-input${errors.contact ? ' error' : ''}`} />
                    </div>
                    <div>
                      <label className="form-label">Email Address</label>
                      <input name="email" value={form.email} onChange={change} placeholder="you@example.com" type="email" className={`form-input${errors.contact ? ' error' : ''}`} />
                    </div>
                  </div>
                  {errors.contact && <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>{errors.contact}</p>}

                  <div style={{ marginBottom: '28px' }}>
                    <label className="form-label">Describe the Work Needed <span style={{ color: '#e09118' }}>*</span></label>
                    <textarea
                      name="message" value={form.message} onChange={change} rows={5}
                      placeholder="Tell us about the problem or the work you need. Include your location and any other details that might be helpful."
                      className={`form-input${errors.message ? ' error' : ''}`}
                      style={{ resize: 'vertical' }}
                    />
                    {errors.message && <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>{errors.message}</p>}
                  </div>

                  <button type="submit" className="btn-amber" style={{ width: '100%', justifyContent: 'center' }}>
                    Send Enquiry
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </button>
                  <p style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '12px', color: '#8fa3b5', marginTop: '16px', textAlign: 'center' }}>
                    We only use your details to respond to your enquiry. No marketing, no sharing.
                  </p>
                </form>
              )}
            </div>

            {/* Contact info */}
            <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ background: '#07101f', padding: '28px' }}>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginBottom: '16px' }}>
                  Call Us Directly
                </div>
                <a href="tel:07971100197" style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: '28px', color: '#f6f1e9', lineHeight: 1, letterSpacing: '0.02em', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#e09118'}
                    onMouseLeave={e => e.target.style.color = '#f6f1e9'}
                  >
                    07971 100197
                  </div>
                </a>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '12px', color: '#4e6880', marginTop: '8px' }}>[HOURS]</p>
              </div>

              <div style={{ background: 'white', padding: '24px', borderLeft: '4px solid #e09118' }}>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e09118', marginBottom: '10px' }}>Coverage Area</div>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '13px', lineHeight: 1.7, color: '#5a7080' }}>
                  We cover Penzance, Helston, Marazion, Porthleven, and all surrounding towns and villages across Rosudgeon.
                </p>
              </div>

              <div style={{ background: '#fff5e6', padding: '24px', border: '1px solid rgba(224,145,24,0.2)', borderLeft: '4px solid #e09118' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <svg width="16" height="16" fill="none" stroke="#e09118" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 800, fontSize: '13px', letterSpacing: '0.06em', color: '#c4780c' }}>EMERGENCY?</span>
                </div>
                <p style={{ fontFamily: "'Lora',serif", fontSize: '13px', lineHeight: 1.7, color: '#7a5a20' }}>
                  For storm damage or active leaks, call <strong>07971 100197</strong> directly. We offer same-day emergency response across Rosudgeon where possible.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  )
}
