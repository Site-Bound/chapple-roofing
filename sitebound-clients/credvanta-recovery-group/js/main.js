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

/* ─── Active nav on scroll — highlight current section ──────── */
const sections   = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');
sections.forEach(s => new IntersectionObserver(
  ([e]) => {
    if (e.isIntersecting) {
      navLinkEls.forEach(l => l.classList.remove('is-active'));
      navLinkEls.forEach(l => {
        if (l.getAttribute('href') === `#${e.target.id}`) l.classList.add('is-active');
      });
    }
  },
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
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzWDyBaEdV1quwpw-CKHuKDsRioIKozg0RBn-KqEtZUfOs6rHZXm99oCqxQ53VTApLwfA/exec';

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

  /* ── Viewport height — matches active slide so card shrinks/grows ── */
  const viewport = track.closest('.ms-viewport');

  function updateViewportHeight() {
    if (!viewport) return;
    const slide = track.querySelector(`[data-slide="${currentStep}"]`);
    if (slide) viewport.style.height = slide.offsetHeight + 'px';
  }

  // Re-measure on resize so the card stays correct at every breakpoint
  window.addEventListener('resize', updateViewportHeight, { passive: true });

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
      if (n > step) dot.classList.remove('is-active');
    });
    // Nav buttons
    backBtn.hidden = step === 1;
    nextBtn.hidden = step === TOTAL_STEPS;
    submitBtn.hidden = step !== TOTAL_STEPS;
    // Update viewport height to match the new active slide
    // requestAnimationFrame ensures the slide has painted before measuring
    requestAnimationFrame(updateViewportHeight);
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
        if (!field.checked) {
          markError(field, field.dataset.error || 'You must accept the Terms & Conditions');
          ok = false;
        }
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

  /* ── Draft ID — generated once on first Step 1 Continue ───────
     Sent with both the Step 1 enquiry POST and the Step 4 full
     submit, allowing the Apps Script to update the same row. */
  const DRAFT_ID_KEY = 'crg_claim_draft_id';

  function getDraftId() {
    try {
      let id = localStorage.getItem(DRAFT_ID_KEY);
      if (!id) {
        id = 'CRG-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        localStorage.setItem(DRAFT_ID_KEY, id);
      }
      return id;
    } catch {
      return 'CRG-' + Date.now();
    }
  }

  /* ── Draft save / restore (localStorage) ──────────────────────
     Saves field values and checkbox states after each validated
     "Continue" click so a returning visitor doesn't have to start
     over. Data is cleared on successful submit. */
  const DRAFT_KEY    = 'crg_claim_draft';
  const DRAFT_FIELDS = ['ms-name','ms-business','ms-email','ms-phone',
                        'ms-debtor','ms-debtor-contact','ms-debtor-email',
                        'ms-debtor-tel','ms-debtor-mobile','ms-debtor-address',
                        'ms-amount','ms-date','ms-description'];
  const DRAFT_CHECKS = ['ms-consent']; // checkboxes handled separately

  function saveDraft() {
    try {
      const draft = {};
      DRAFT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft[id] = el.value;
      });
      DRAFT_CHECKS.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft[id] = el.checked;
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      DRAFT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && draft[id] !== undefined) el.value = draft[id];
      });
      DRAFT_CHECKS.forEach(id => {
        const el = document.getElementById(id);
        if (el && draft[id] !== undefined) el.checked = draft[id];
      });
    } catch {}
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_ID_KEY);
    } catch {}
  }

  restoreDraft(); // populate fields if a draft exists

  /* ── Step 1 enquiry POST ───────────────────────────────────────
     Fires after Step 1 validates. Creates a row in Google Sheets
     with the contact details and consent. No email is triggered
     at this stage — that happens only on full submit at Step 4.
     Uses no-cors (Apps Script limitation) so errors are silent. */
  function sendEnquiry() {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('REPLACE')) return;
    const payload = new URLSearchParams({
      status:   'enquiry',
      draftId:  getDraftId(),
      name:     document.getElementById('ms-name')?.value     || '',
      business: document.getElementById('ms-business')?.value || '',
      email:    document.getElementById('ms-email')?.value    || '',
      phone:    document.getElementById('ms-phone')?.value    || '',
      consent:  document.getElementById('ms-consent')?.checked ? 'Yes' : 'No',
    });
    fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payload.toString(),
    }).catch(e => console.error('[enquiry POST]', e));
  }

  /* ── Navigation ── */
  nextBtn.addEventListener('click', () => {
    if (!validateSlide(currentStep)) { requestAnimationFrame(updateViewportHeight); return; }
    saveDraft();
    if (currentStep === 1) sendEnquiry(); // capture contact + consent immediately
    if (currentStep < TOTAL_STEPS) setStep(currentStep + 1);
  });

  backBtn.addEventListener('click', () => {
    if (currentStep > 1) setStep(currentStep - 1);
  });

  /* ── Submit ── */
  submitBtn.addEventListener('click', async () => {
    if (!validateSlide(TOTAL_STEPS)) { requestAnimationFrame(updateViewportHeight); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting… <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin .8s linear infinite;transform-origin:center"/></svg>';

    /* ── Encode uploaded files as base64 ──
       Wrapped in its own try-catch so a file-read failure doesn't
       block the submission — we fall back to sending without files. */
    let encodedFiles = [];
    try {
      encodedFiles = await Promise.all(
        uploadedFiles.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: reader.result.split(',')[1],
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );
    } catch (e) {
      console.error('[claim submit] file encoding failed — submitting without files:', e);
    }

    /* ── Build URL-encoded payload ── */
    const payload = new URLSearchParams({
      status:                   'complete',
      draftId:                  getDraftId(),
      name:                     document.getElementById('ms-name')?.value     || '',
      business:                 document.getElementById('ms-business')?.value || '',
      email:                    document.getElementById('ms-email')?.value    || '',
      phone:                    document.getElementById('ms-phone')?.value    || '',
      consent:                  document.getElementById('ms-consent')?.checked ? 'Yes' : 'No',
      debtor_company:           document.getElementById('ms-debtor')?.value          || '',
      debtor_contact_name:      document.getElementById('ms-debtor-contact')?.value  || '',
      debtor_contact_email:     document.getElementById('ms-debtor-email')?.value    || '',
      debtor_contact_telephone: document.getElementById('ms-debtor-tel')?.value      || '',
      debtor_contact_mobile:    document.getElementById('ms-debtor-mobile')?.value   || '',
      debtor_address:           document.getElementById('ms-debtor-address')?.value  || '',
      debtor:                   document.getElementById('ms-debtor')?.value          || '',
      amount:                   document.getElementById('ms-amount')?.value      || '',
      invoiceDate:              document.getElementById('ms-date')?.value        || '',
      description:              document.getElementById('ms-description')?.value || '',
      stripeConnected:          String(stripeConnected),
      files:                    JSON.stringify(encodedFiles),
    });

    /* ── Fire and forget — same pattern as sendEnquiry() ──
       Apps Script web apps process synchronously and can take 10–30 s
       when uploading files to Google Drive. Awaiting the response caused
       the button to spin for the full duration. Since we use no-cors and
       cannot read the response anyway, we dispatch and show success
       immediately — Apps Script will write the data regardless. */
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('REPLACE')) {
      fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    payload.toString(),
      }).catch(e => console.error('[claim submit]', e));
    }

    clearDraft();
    track.closest('.ms-viewport').hidden = true;
    msNav.hidden = true;
    successEl.hidden = false;
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
   TAYLR PAYMENT — shared helper + homepage portal handler
   Signs params via /sign-payment (Cloudflare Pages Function),
   then submits a hidden form to the Taylr hosted payment page.
   ═══════════════════════════════════════════════════════════════ */

async function taylrPayment({ ref, amount, email, merchantId, minAmount = 7.50, btn, errorEl }) {
  /* Validate */
  const amtVal = parseFloat(amount);
  const minVal = parseFloat(minAmount) || 7.50;
  if (!amount || isNaN(amtVal) || amtVal < minVal) {
    if (errorEl) {
      errorEl.textContent = minVal < 7.50
        ? `The full outstanding balance of £${minVal.toFixed(2)} must be paid.`
        : 'The minimum payment amount is £7.50.';
      errorEl.hidden = false;
    }
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    if (errorEl) { errorEl.textContent = 'Please enter a valid email address for your receipt.'; errorEl.hidden = false; }
    return;
  }

  const origHTML = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin .8s linear infinite;transform-origin:center"/></svg> Redirecting…';
  if (errorEl) errorEl.hidden = true;

  try {
    const payload = { amount: String(amtVal), ref: String(ref), email: email.trim() };
    if (merchantId) payload.merchantId = String(merchantId);

    const res = await fetch('/sign-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { endpoint, params, error } = await res.json();
    if (error) throw new Error(error);

    /* Build and submit hidden form — browser navigates to Taylr HPP */
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.style.display = 'none';
    for (const [k, v] of Object.entries(params)) {
      const inp = document.createElement('input');
      inp.type = 'hidden'; inp.name = k; inp.value = v;
      form.appendChild(inp);
    }
    /* Debug: log params to console so they're visible in DevTools if needed */
    console.log('[Taylr] Submitting to', endpoint, params);
    document.body.appendChild(form);
    form.submit();
  } catch {
    btn.disabled  = false;
    btn.innerHTML = origHTML;
    if (errorEl) {
      errorEl.textContent = 'Payment could not be started. Please try again or call us on 0800 975 7066.';
      errorEl.hidden = false;
    }
  }
}

/* Homepage portal payment handler */
(function initTaylrPayment() {
  const payBtn = document.getElementById('pay-btn');
  if (!payBtn) return;

  payBtn.disabled = false;

  payBtn.addEventListener('click', () => {
    const invEl = document.getElementById('pay-invoice-num');
    taylrPayment({
      ref:        invEl?.value?.trim()          || '',
      amount:     document.getElementById('pay-amount')?.value  || '',
      email:      document.getElementById('pay-email')?.value   || '',
      merchantId: invEl?.dataset?.merchantId    || '',
      btn:        payBtn,
      errorEl:    document.getElementById('card-errors'),
    });
  });
})();


/* ─── Footer year ────────────────────────────────────────────── */
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ═══════════════════════════════════════════════════════════════
   SUPABASE INVOICE LOOKUP — shared helpers
   (used by both the homepage portal card and debtor.html)
   ═══════════════════════════════════════════════════════════════ */
const SUPABASE_URL      = 'https://idvxdnswxqxhqcnzqmvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdnhkbnN3eHF4aHFjbnpxbXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjA3NDgsImV4cCI6MjA5MzkzNjc0OH0.4E5b7OQeTBNKMI4p0k23Deaftd4scSYqVudACSiKg68';

async function lookupInvoice(query) {
  const q      = encodeURIComponent(query.trim().toUpperCase());
  const fields = [
    'case_reference_number','client_invoice_number','client_name',
    'debtor_contact_name','debtor_business_name',
    'original_balance','current_balance','status','payment_token_id',
  ].join(',');
  const url = `${SUPABASE_URL}/rest/v1/live_cases`
    + `?or=(case_reference_number.ilike.${q},client_invoice_number.ilike.${q})`
    + `&select=${fields}&limit=1`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const rows = await res.json();
  return rows.length ? rows[0] : null;
}

function formatGBP(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function getStatusClass(status) {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s.includes('closed') || s.includes('settled') || s.includes('paid')) return 'closed';
  if (s.includes('legal')  || s.includes('escalat'))                        return 'legal';
  if (s.includes('active') || s.includes('open'))                           return 'active';
  return 'pending';
}

function isCaseClosed(status) {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('closed') || s.includes('settled') || s.includes('paid');
}

/* Returns true for statuses where payment must be blocked entirely */
function isPaymentBlocked(status) {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('dispute') || s.includes('consumer');
}

/* Returns { type: 'success'|'info'|'warning', html: '...' } or null (no message needed) */
function getStatusMessage(status, balance) {
  const s = (status || '').toLowerCase();

  if (balance <= 0) {
    return {
      type: 'success',
      html: 'This account has been <strong>settled in full</strong>. No further payment is required. If you have any questions please <a href="tel:08009757066">contact us</a>.'
    };
  }
  if (s.includes('legal') || s.includes('court') || s.includes('litigation') || s.includes('escalat')) {
    return {
      type: 'warning',
      html: 'This account has been <strong>referred for legal action</strong>. You are still able to make payment below to stop any further action being taken.'
    };
  }
  if (s.includes('plan') || s.includes('arrangement') || s.includes('instalment') || s.includes('installment')) {
    return {
      type: 'info',
      html: 'A <strong>payment arrangement</strong> is in place on this account. Please continue to meet your agreed schedule. You are also welcome to make additional payments towards the outstanding balance at any time.'
    };
  }
  if (s.includes('partial') || s.includes('part pay')) {
    return {
      type: 'info',
      html: 'A <strong>partial payment</strong> has been received on this account. The remaining balance is shown above. You are welcome to make additional payments towards this balance at any time.'
    };
  }
  if (s.includes('consumer')) {
    return {
      type: 'error',
      html: '<strong>Unable to Process Payment</strong><br><br>This account has been marked as a consumer debt and returned to our client, as Credvanta Recovery Group only handles business-to-business (B2B) debts involving incorporated businesses.<br><br>Please contact our client directly to resolve this matter. If you believe this is incorrect, please contact our team on <a href="tel:08009757066">0800 975 7066</a>.'
    };
  }
  if (s.includes('dispute')) {
    return {
      type: 'warning',
      html: 'This account is currently <strong>in dispute</strong>. Please give us a call on <a href="tel:08009757066">0800 975 7066</a> and we will be happy to assist.'
    };
  }
  if (s.includes('hold')) {
    return {
      type: 'info',
      html: 'This account is currently <strong>on hold</strong>. Please give us a call on <a href="tel:08009757066">0800 975 7066</a> and we will be happy to assist.'
    };
  }
  /* Active with outstanding balance — no supplementary message needed */
  return null;
}

/* ── Homepage portal card lookup ── */
(function initPortalLookup() {
  const lookupState  = document.getElementById('idx-lookup-state');
  const resultState  = document.getElementById('idx-result-state');
  const paymentState = document.getElementById('stripe-payment-form');
  const successState = document.getElementById('payment-success');
  const lookupInput  = document.getElementById('idx-lookup-ref');
  const lookupBtn    = document.getElementById('idx-lookup-btn');
  const lookupError  = document.getElementById('idx-lookup-error');
  const resetBtn     = document.getElementById('idx-lookup-reset');
  const proceedBtn   = document.getElementById('idx-lk-proceed-btn');
  const backBtn      = document.getElementById('idx-payment-back-btn');

  if (!lookupState || !lookupInput || !lookupBtn) return; // not on this page

  function showState(name) {
    lookupState.hidden  = name !== 'lookup';
    resultState.hidden  = name !== 'result';
    paymentState.hidden = name !== 'payment';
    successState.hidden = name !== 'success';
  }

  function showError(msg) { lookupError.textContent = msg; lookupError.hidden = false; }
  function clearError()   { lookupError.hidden = true; }

  async function doLookup() {
    const query = lookupInput.value.trim();
    if (!query) { showError('Please enter your case reference or invoice number.'); return; }
    clearError();

    const origHTML = lookupBtn.innerHTML;
    lookupBtn.disabled = true;
    lookupBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin .8s linear infinite;transform-origin:center"/></svg> Searching…`;

    try {
      const record = await lookupInvoice(query);

      if (!record) {
        showError('We could not find a case matching that reference. Please check and try again, or call us on 0800 975 7066.');
        lookupBtn.disabled = false;
        lookupBtn.innerHTML = origHTML;
        return;
      }

      const ref = record.case_reference_number || record.client_invoice_number || query;
      document.getElementById('idx-lk-ref').textContent      = ref;
      document.getElementById('idx-lk-creditor').textContent = record.client_name || '—';
      document.getElementById('idx-lk-debtor').textContent   =
        record.debtor_business_name || record.debtor_contact_name || '—';

      const statusEl = document.getElementById('idx-lk-status-badge');
      statusEl.textContent = record.status || 'Active';
      statusEl.className   = `lookup-status-badge lookup-status-badge--${getStatusClass(record.status)}`;

      const balance = parseFloat(record.current_balance) || 0;
      document.getElementById('idx-lk-balance').textContent = formatGBP(balance);

      /* Show payment option only when money is still owed and status allows payment */
      const blockPayment = balance <= 0 || isPaymentBlocked(record.status);
      document.getElementById('idx-lk-pay-action').hidden = blockPayment;

      /* Dynamic status message */
      const msgEl     = document.getElementById('idx-lk-status-msg');
      const msgTextEl = document.getElementById('idx-lk-status-msg-text');
      const statusMsg = getStatusMessage(record.status, balance);
      if (msgEl && msgTextEl) {
        if (statusMsg) {
          msgEl.className       = `lookup-status-msg lookup-status-msg--${statusMsg.type}`;
          msgTextEl.innerHTML   = statusMsg.html;
          msgEl.hidden          = false;
        } else {
          msgEl.hidden = true;
        }
      }

      /* Pre-fill payment form */
      const invEl      = document.getElementById('pay-invoice-num');
      const amtEl      = document.getElementById('pay-amount');
      const amtHintEl  = document.getElementById('pay-amount-hint');
      const amtFullEl  = document.getElementById('pay-amount-full');
      if (invEl) {
        invEl.value = ref;
        // Store the creditor's merchant ID so payment routes to the correct account
        invEl.dataset.merchantId = record.payment_token_id || '';
      }
      if (!blockPayment && amtEl) {
        amtEl.value = balance.toFixed(2);
        amtEl.max   = balance.toFixed(2);
        if (amtFullEl) amtFullEl.textContent = formatGBP(balance);
        if (amtHintEl) amtHintEl.hidden = false;
      }

      lookupBtn.disabled = false;
      lookupBtn.innerHTML = origHTML;
      showState('result');

    } catch {
      showError('Something went wrong. Please try again or call 0800 975 7066.');
      lookupBtn.disabled = false;
      lookupBtn.innerHTML = origHTML;
    }
  }

  lookupBtn.addEventListener('click', doLookup);
  lookupInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });
  if (resetBtn)   resetBtn.addEventListener('click', () => {
    lookupInput.value = '';
    const amtHint = document.getElementById('pay-amount-hint');
    if (amtHint) amtHint.hidden = true;
    showState('lookup');
  });
  if (proceedBtn) proceedBtn.addEventListener('click', () => showState('payment'));
  if (backBtn)    backBtn.addEventListener('click',    () => showState('result'));
})();
