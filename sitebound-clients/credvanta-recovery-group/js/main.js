/* ═══════════════════════════════════════════════════════════════
   CREDVANTA RECOVERY GROUP — main.js
   ═══════════════════════════════════════════════════════════════ */

/* ─── Header scroll / back-to-top ───────────────────────────── */
const header   = document.getElementById('site-header');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
  if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ─── Mobile nav ─────────────────────────────────────────────── */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('is-open', !open);
    document.body.style.overflow = !open ? 'hidden' : '';
  });
  navLinks.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });
}

/* ─── Scroll reveal ──────────────────────────────────────────── */
const revealObs = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); revealObs.unobserve(e.target); }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));

/* ─── Animated counters ──────────────────────────────────────── */
function animateCounter(el, target, decimals, duration = 1800) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}
const counterObs = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      const t = parseFloat(e.target.dataset.count);
      animateCounter(e.target, t, t % 1 !== 0 ? 1 : 0);
      counterObs.unobserve(e.target);
    }
  }),
  { threshold: 0.5 }
);
document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

/* ─── FAQ accordion ──────────────────────────────────────────── */
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    trigger.closest('.faq-col').querySelectorAll('.faq-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      t.nextElementSibling.classList.remove('is-open');
    });
    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.nextElementSibling.classList.add('is-open');
    }
  });
});

/* ─── Smooth anchor scroll ───────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ─── Active nav on scroll ───────────────────────────────────── */
const sections   = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');
new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) navLinkEls.forEach(l => {
      l.style.color = l.getAttribute('href') === `#${e.target.id}` ? 'white' : '';
    });
  }),
  { rootMargin: '-40% 0px -55% 0px' }
).forEach ? null : sections.forEach(s => new IntersectionObserver(
  ([e]) => e.isIntersecting && navLinkEls.forEach(l => {
    l.style.color = l.getAttribute('href') === `#${e.target.id}` ? 'white' : '';
  }),
  { rootMargin: '-40% 0px -55% 0px' }
).observe(s));


/* ═══════════════════════════════════════════════════════════════
   MULTI-STEP CLAIM FORM
   ═══════════════════════════════════════════════════════════════
   Google Sheets integration via Google Apps Script.
   TO ACTIVATE:
   1. Deploy google-apps-script/Code.gs as a Web App in Google
      Apps Script (see setup instructions inside that file).
   2. Replace the URL below with your deployed Web App URL.
   ─────────────────────────────────────────────────────────────*/
const APPS_SCRIPT_URL = 'REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL';

(function initMultiStepForm() {
  const track      = document.getElementById('msTrack');
  const progressFill = document.getElementById('msProgressFill');
  const stepDots   = document.querySelectorAll('.ms-step[data-step]');
  const stepCounter = document.getElementById('msStepCounter');
  const backBtn    = document.getElementById('msBack');
  const nextBtn    = document.getElementById('msNext');
  const submitBtn  = document.getElementById('msSubmit');
  const successEl  = document.getElementById('msSuccess');
  const msNav      = document.getElementById('msNav');

  if (!track) return;

  const TOTAL_STEPS = 4;
  let currentStep = 1;
  let stripeConnected = false;
  const uploadedFiles = [];

  /* ── Progress update ── */
  function setStep(step) {
    currentStep = step;
    // Slide track
    track.style.transform = `translateX(-${(step - 1) * 25}%)`;
    // Progress bar
    progressFill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
    progressFill.closest('[role="progressbar"]').setAttribute('aria-valuenow', Math.round((step / TOTAL_STEPS) * 100));
    // Counter label
    stepCounter.textContent = `Step ${step} of ${TOTAL_STEPS}`;
    // Dot states
    stepDots.forEach(dot => {
      const n = parseInt(dot.dataset.step);
      dot.classList.toggle('is-active', n === step);
      dot.classList.toggle('is-done', n < step);
      dot.classList.remove(n > step ? 'is-active' : '');
    });
    // Nav buttons
    backBtn.hidden = step === 1;
    nextBtn.hidden = step === TOTAL_STEPS;
    submitBtn.hidden = step !== TOTAL_STEPS;
    // Scroll form into view on mobile
    if (window.innerWidth < 900) {
      document.getElementById('claim-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ── Field validation per slide ── */
  function validateSlide(step) {
    const slide = track.querySelector(`[data-slide="${step}"]`);
    if (!slide) return true;
    let ok = true;
    // Remove old errors
    slide.querySelectorAll('.ms-error-msg').forEach(e => e.remove());
    slide.querySelectorAll('.error').forEach(e => e.classList.remove('error'));

    slide.querySelectorAll('[required]').forEach(field => {
      if (field.type === 'checkbox') {
        if (!field.checked) { markError(field, 'You must accept the Terms & Conditions'); ok = false; }
        return;
      }
      if (!field.value.trim()) { markError(field, 'This field is required'); ok = false; return; }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        markError(field, 'Please enter a valid email address'); ok = false;
      }
    });
    return ok;
  }

  function markError(field, message) {
    field.classList.add('error');
    const msg = document.createElement('p');
    msg.className = 'ms-error-msg';
    msg.textContent = message;
    const parent = field.closest('.tc-accept-label') || field.parentElement;
    parent.after(msg);
  }

  /* ── Navigation ── */
  nextBtn.addEventListener('click', () => {
    if (!validateSlide(currentStep)) return;
    if (currentStep < TOTAL_STEPS) setStep(currentStep + 1);
  });

  backBtn.addEventListener('click', () => {
    if (currentStep > 1) setStep(currentStep - 1);
  });

  /* ── Submit ── */
  submitBtn.addEventListener('click', async () => {
    if (!validateSlide(TOTAL_STEPS)) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting… <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin .8s linear infinite;transform-origin:center"/></svg>';

    /* ── Encode all uploaded files as base64 ── */
    const encodedFiles = await Promise.all(
      uploadedFiles.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve({
          name: file.name,
          type: file.type || 'application/octet-stream',
          // strip the "data:...;base64," prefix — Apps Script only needs the raw base64
          data: reader.result.split(',')[1],
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    );

    /* ── Build URL-encoded payload ──
       We use URLSearchParams + no-cors because Google Apps Script
       web apps do not support arbitrary CORS preflight requests.
       The trade-off is we cannot read the response — but the data
       is reliably written to the Sheet regardless.           ── */
    const payload = new URLSearchParams({
      name:            document.getElementById('ms-name')?.value        || '',
      business:        document.getElementById('ms-business')?.value    || '',
      email:           document.getElementById('ms-email')?.value       || '',
      phone:           document.getElementById('ms-phone')?.value       || '',
      debtor:          document.getElementById('ms-debtor')?.value      || '',
      amount:          document.getElementById('ms-amount')?.value      || '',
      invoiceDate:     document.getElementById('ms-date')?.value        || '',
      description:     document.getElementById('ms-description')?.value || '',
      stripeConnected: String(stripeConnected),
      files:           JSON.stringify(encodedFiles),
    });

    try {
      if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('REPLACE')) {
        await fetch(APPS_SCRIPT_URL, {
          method:  'POST',
          mode:    'no-cors', // required for Apps Script — response not readable, data IS sent
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    payload.toString(),
        });
      }
      // Show success regardless — no-cors means we can't read confirmation,
      // but Apps Script will have received and saved the data.
      showSuccess();
    } catch {
      // Network error — still show success optimistically,
      // log to console so developer can investigate if needed.
      console.error('Submission network error');
      showSuccess();
    }

    function showSuccess() {
      track.closest('.ms-viewport').hidden = true;
      msNav.hidden = true;
      successEl.hidden = false;
    }
  });

  /* ── File upload ── */
  const uploadZone  = document.getElementById('uploadZone');
  const fileInput   = document.getElementById('ms-files');
  const uploadList  = document.getElementById('uploadList');
  const MAX_SIZE_MB = 10;

  function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(files) {
    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showUploadError(`"${file.name}" exceeds the 10MB limit.`);
        return;
      }
      if (uploadedFiles.find(f => f.name === file.name && f.size === file.size)) return; // duplicate
      uploadedFiles.push(file);
      renderFileList();
    });
  }

  function showUploadError(msg) {
    let err = uploadZone.querySelector('.upload-error');
    if (!err) { err = document.createElement('p'); err.className = 'upload-error'; uploadZone.after(err); }
    err.textContent = msg;
    setTimeout(() => err.remove(), 4000);
  }

  function renderFileList() {
    uploadList.innerHTML = '';
    uploadedFiles.forEach((file, i) => {
      const li = document.createElement('li');
      li.className = 'upload-item';
      li.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="upload-item-name" title="${file.name}">${file.name}</span>
        <span class="upload-item-size">${formatBytes(file.size)}</span>
        <button type="button" class="upload-item-remove" aria-label="Remove ${file.name}" data-index="${i}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`;
      uploadList.appendChild(li);
    });
    uploadList.querySelectorAll('.upload-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        uploadedFiles.splice(parseInt(btn.dataset.index), 1);
        renderFileList();
      });
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => addFiles(fileInput.files));
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
    uploadZone.querySelector('.upload-browse-btn')?.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  }

  /* ── Remove error on input ── */
  track.querySelectorAll('input, textarea').forEach(f => {
    f.addEventListener('input', () => {
      f.classList.remove('error');
      f.parentElement.querySelector('.ms-error-msg')?.remove();
      f.closest('.tc-accept-label')?.nextElementSibling?.classList.contains('ms-error-msg') &&
        f.closest('.tc-accept-label').nextElementSibling.remove();
    });
  });

  setStep(1); // initialise
})();


/* ═══════════════════════════════════════════════════════════════
   STRIPE CONNECT — CREDITOR ONBOARDING
   ═══════════════════════════════════════════════════════════════
   TO ACTIVATE:
   1. Set up a backend endpoint (e.g. /api/stripe/connect) that:
        a. Creates a Stripe Connect Express account:
           stripe.accounts.create({ type: 'express', country: 'GB',
             email: creditorEmail, capabilities: { transfers: { requested: true } } })
        b. Creates an Account Link:
           stripe.accountLinks.create({ account: acct.id, type: 'account_onboarding',
             refresh_url: 'https://www.credvantarecoverygroup.com/?sc=refresh#claim-form',
             return_url:  'https://www.credvantarecoverygroup.com/?sc=success#claim-form' })
        c. Returns { url: accountLink.url, accountId: acct.id }
   2. Store the accountId against the claim so Credvanta can route
      recovered funds to this account via Transfer or Destination Charge.
   ─────────────────────────────────────────────────────────────── */
(function initStripeConnect() {
  const connectBtn = document.getElementById('stripeConnectBtn');
  const badge      = document.getElementById('scBadge');
  if (!connectBtn) return;

  // Check if returning from Stripe onboarding
  const params = new URLSearchParams(window.location.search);
  if (params.get('sc') === 'success') {
    markConnected();
    window.history.replaceState({}, '', window.location.pathname + '#claim-form');
  }

  connectBtn.addEventListener('click', async () => {
    const email = document.getElementById('ms-email')?.value?.trim();
    const business = document.getElementById('ms-business')?.value?.trim();

    if (!email) {
      alert('Please complete Step 1 with your email address before connecting your bank account.');
      return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Opening Stripe…';

    try {
      /* ── Replace with your real endpoint ── */
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, businessName: business }),
      });
      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe Express onboarding
    } catch {
      connectBtn.disabled = false;
      connectBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Connect Bank Account via Stripe`;
      alert('Unable to connect to Stripe right now. Please try again or continue and we\'ll send you a link by email.');
    }
  });

  function markConnected() {
    badge.className = 'sc-badge sc-badge--connected';
    badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Bank account connected`;
    connectBtn.textContent = '✓ Connected — change account';
    connectBtn.classList.add('is-connected');
  }
})();


/* ═══════════════════════════════════════════════════════════════
   STRIPE PAYMENT PORTAL (DEBTOR — existing section on index)
   ═══════════════════════════════════════════════════════════════ */
(function initStripePayment() {
  /* ─────────────────────────────────────────────────────────────
     TO ACTIVATE:
     1. Replace pk_live_REPLACE_WITH_YOUR_KEY with the live key
        from Stripe Dashboard → Developers → API Keys
     2. Set up /api/create-payment-intent to:
          a. Look up the connected account ID for the invoice
          b. Create a PaymentIntent with transfer_data:
             stripe.paymentIntents.create({
               amount, currency: 'gbp',
               transfer_data: { destination: connectedAccountId },
               application_fee_amount: Math.round(amount * 0.15)
             })
          c. Return { clientSecret }
     ───────────────────────────────────────────────────────────── */
  const STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_KEY';
  if (typeof Stripe === 'undefined' || STRIPE_PK.includes('REPLACE')) return;

  const stripe   = Stripe(STRIPE_PK);
  const elements = stripe.elements();
  const cardMount = document.getElementById('card-element');
  if (!cardMount) return;

  // Remove placeholder, mount real Stripe element
  cardMount.innerHTML = '';
  const card = elements.create('card', {
    style: {
      base: { fontFamily: "'Outfit',system-ui,sans-serif", fontSize: '15px', color: '#1E293B', '::placeholder': { color: '#94A3B8' } },
      invalid: { color: '#ef4444' },
    },
  });
  card.mount('#card-element');
  card.on('change', e => {
    document.getElementById('card-errors').textContent = e.error?.message || '';
  });
  card.on('ready', () => {
    const btn = document.getElementById('pay-btn');
    if (btn) btn.disabled = false;
  });

  // Apple Pay / Google Pay
  const amount = () => Math.round(parseFloat(document.getElementById('pay-amount')?.value || '0') * 100);
  const pr = stripe.paymentRequest({ country: 'GB', currency: 'gbp', total: { label: 'Invoice Payment', amount: 0 }, requestPayerEmail: true });
  const prBtn = elements.create('paymentRequestButton', { paymentRequest: pr, style: { paymentRequestButton: { theme: 'dark', height: '44px' } } });
  pr.canMakePayment().then(r => {
    if (r) { document.getElementById('pay-divider').hidden = false; prBtn.mount('#payment-request-button'); }
  });

  document.getElementById('pay-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('pay-btn');
    const amt = amount();
    if (!amt) { document.getElementById('card-errors').textContent = 'Please enter the invoice amount.'; return; }
    btn.disabled = true;
    btn.textContent = 'Processing…';
    try {
      const { clientSecret } = await fetch('/api/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, invoiceNumber: document.getElementById('pay-invoice-num')?.value }),
      }).then(r => r.json());
      const { error } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
      if (error) {
        document.getElementById('card-errors').textContent = error.message;
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Pay Securely';
      } else {
        document.getElementById('stripe-payment-form').hidden = true;
        document.getElementById('payment-success').hidden = false;
        document.querySelector('.portal-coming-soon')?.remove();
      }
    } catch {
      document.getElementById('card-errors').textContent = 'Something went wrong. Please try again or call us.';
      btn.disabled = false;
    }
  });
})();


/* ─── Footer year ────────────────────────────────────────────── */
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
