/* ═══════════════════════════════════════════════════════════════
   CREDVANTA — Debtor Page JS
   ═══════════════════════════════════════════════════════════════
   SETUP: Replace the URL below with your deployed DebtorForms.gs
   Web App URL (see google-apps-script/DebtorForms.gs).
   ═══════════════════════════════════════════════════════════════ */

const DEBTOR_FORMS_URL = 'https://script.google.com/macros/s/AKfycbxuBNeel2LuT6khaVTnqjCq7dHZlzY1wjG0xqLv4y8a8gr5xe3gFKK3hm2CRxWcodpzxg/exec';

/* ─── Scroll reveal ──────────────────────────────── */
const debtorRevealObs = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); debtorRevealObs.unobserve(e.target); }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('[data-reveal]').forEach(el => debtorRevealObs.observe(el));

/* ─── Footer year ────────────────────────────────── */
const debtorYearEl = document.getElementById('footer-year');
if (debtorYearEl) debtorYearEl.textContent = new Date().getFullYear();

/* ═══════════════════════════════════════════════════
   MODAL HELPERS
   ═══════════════════════════════════════════════════ */
function openDebtorModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  const first = el.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 60);
  el.addEventListener('click', function onBd(e) {
    if (e.target === el) { closeDebtorModal(id); el.removeEventListener('click', onBd); }
  });
}
function closeDebtorModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = true;
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => closeDebtorModal(m.id));
  }
});

/* ═══════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════ */
document.querySelectorAll('.dfaq-question').forEach(btn => {
  btn.addEventListener('click', function() {
    const isOpen = this.getAttribute('aria-expanded') === 'true';
    const answerId = this.getAttribute('aria-controls');
    // Collapse all
    document.querySelectorAll('.dfaq-question').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      const aId = b.getAttribute('aria-controls');
      const a = aId ? document.getElementById(aId) : null;
      if (a) a.hidden = true;
    });
    // Open clicked (unless it was already open)
    if (!isOpen) {
      this.setAttribute('aria-expanded', 'true');
      const answer = answerId ? document.getElementById(answerId) : null;
      if (answer) answer.hidden = false;
    }
  });
});

/* ═══════════════════════════════════════════════════
   FILE UPLOAD HELPERS
   ═══════════════════════════════════════════════════ */
function initFileUpload(zoneId, inputId, listId) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const list  = document.getElementById(listId);
  if (!zone || !input || !list) return;

  let files = [];

  function renderList() {
    list.innerHTML = '';
    list.hidden = files.length === 0;
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'modal-file-item';
      li.innerHTML = `<span>${f.name} <small style="color:var(--gray-400)">(${(f.size/1024).toFixed(1)} KB)</small></span>
        <button type="button" class="modal-file-remove" aria-label="Remove ${f.name}">&times;</button>`;
      li.querySelector('.modal-file-remove').addEventListener('click', () => {
        files.splice(i, 1); renderList();
      });
      list.appendChild(li);
    });
  }

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    files = files.concat(Array.from(e.dataTransfer.files)); renderList();
  });
  input.addEventListener('change', () => {
    files = files.concat(Array.from(input.files)); input.value = ''; renderList();
  });

  zone._getFiles = () => files;
}

initFileUpload('mdi-upload-zone', 'mdi-files', 'mdi-file-list');
initFileUpload('mpo-upload-zone', 'mpo-files', 'mpo-file-list');

/* ── Base64 encode files ── */
function encodeFiles(files) {
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({ name: file.name, type: file.type, data: reader.result.split(',')[1] });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

/* ── Shared submit helper ── */
async function submitDebtorForm(payload, btn, origHTML, formWrapId, successId, errorId) {
  const errEl = document.getElementById(errorId);
  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    if (!DEBTOR_FORMS_URL.includes('REPLACE')) {
      await fetch(DEBTOR_FORMS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString(),
      });
    } else {
      await new Promise(r => setTimeout(r, 700)); // dev preview
    }
    document.getElementById(formWrapId).hidden = true;
    document.getElementById(successId).hidden  = false;
  } catch {
    errEl.textContent = 'Something went wrong. Please try again or call 0800 975 7066.';
    errEl.hidden = false;
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

/* ── Validation ── */
function validateModal(fields) {
  for (const { el, label } of fields) {
    if (!el) continue;
    const val = el.type === 'checkbox' ? el.checked : el.value.trim();
    if (!val) return `Please complete: ${label}`;
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()))
      return 'Please enter a valid email address.';
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   INVOICE LOOKUP — Supabase
   ═══════════════════════════════════════════════════════════════ */
const SUPABASE_URL     = 'https://idvxdnswxqxhqcnzqmvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdnhkbnN3eHF4aHFjbnpxbXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjA3NDgsImV4cCI6MjA5MzkzNjc0OH0.4E5b7OQeTBNKMI4p0k23Deaftd4scSYqVudACSiKg68';

async function lookupInvoice(query) {
  const q = encodeURIComponent(query.trim().toUpperCase());
  const fields = [
    'case_reference_number', 'client_invoice_number', 'client_name',
    'debtor_contact_name',   'debtor_business_name',
    'original_balance',      'current_balance',
    'status',                'payment_token_id',
  ].join(',');
  /* Try both reference and invoice number fields, case-insensitive */
  const url = `${SUPABASE_URL}/rest/v1/live_cases`
    + `?or=(case_reference_number.ilike.${q},client_invoice_number.ilike.${q})`
    + `&select=${fields}&limit=1`;

  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
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
  if (s.includes('legal') || s.includes('escalat'))                         return 'legal';
  if (s.includes('active') || s.includes('open'))                           return 'active';
  return 'pending';
}

function isClosed(status) {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('closed') || s.includes('settled') || s.includes('paid');
}

(function initLookup() {
  const lookupState  = document.getElementById('invoice-lookup-state');
  const resultState  = document.getElementById('invoice-result-state');
  const paymentState = document.getElementById('debtor-stripe-form');
  const successState = document.getElementById('debtor-payment-success');

  const lookupInput  = document.getElementById('lookup-ref');
  const lookupBtn    = document.getElementById('lookup-btn');
  const lookupError  = document.getElementById('lookup-error');

  const resetBtn     = document.getElementById('lookup-reset');
  const proceedBtn   = document.getElementById('lk-proceed-btn');
  const backBtn      = document.getElementById('payment-back-btn');

  if (!lookupState || !lookupInput || !lookupBtn) return;

  function showState(name) {
    lookupState.hidden  = name !== 'lookup';
    resultState.hidden  = name !== 'result';
    paymentState.hidden = name !== 'payment';
    successState.hidden = name !== 'success';
  }

  function showError(msg) {
    lookupError.textContent = msg;
    lookupError.hidden = false;
  }

  function clearError() { lookupError.hidden = true; }

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

      /* Populate result fields */
      const ref = record.case_reference_number || record.client_invoice_number || query;
      document.getElementById('lk-ref').textContent      = ref;
      document.getElementById('lk-creditor').textContent = record.client_name || '—';
      document.getElementById('lk-debtor').textContent   =
        record.debtor_business_name || record.debtor_contact_name || '—';

      const statusEl   = document.getElementById('lk-status-badge');
      const statusText = record.status || 'Active';
      statusEl.textContent = statusText;
      statusEl.className = `lookup-status-badge lookup-status-badge--${getStatusClass(record.status)}`;

      const balanceEl = document.getElementById('lk-balance');
      balanceEl.textContent = formatGBP(record.current_balance);

      const closed = isClosed(record.status);
      document.getElementById('lk-pay-action').hidden = closed;
      document.getElementById('lk-closed-msg').hidden  = !closed;

      /* Pre-fill payment form */
      const invoiceField = document.getElementById('d-invoice');
      const amountField  = document.getElementById('d-amount');
      if (invoiceField) invoiceField.value = ref;
      if (amountField && record.current_balance) {
        amountField.value = parseFloat(record.current_balance).toFixed(2);
      }

      lookupBtn.disabled = false;
      lookupBtn.innerHTML = origHTML;
      showState('result');

    } catch (err) {
      showError('Something went wrong during the lookup. Please try again or call 0800 975 7066.');
      lookupBtn.disabled = false;
      lookupBtn.innerHTML = origHTML;
    }
  }

  lookupBtn.addEventListener('click', doLookup);
  lookupInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });

  if (resetBtn)  resetBtn.addEventListener('click',  () => showState('lookup'));
  if (proceedBtn) proceedBtn.addEventListener('click', () => showState('payment'));
  if (backBtn)   backBtn.addEventListener('click',   () => showState('result'));
})();

/* ═══════════════════════════════════════════════════
   FORM: Payment Plan
   ═══════════════════════════════════════════════════ */
(function() {
  const form = document.getElementById('form-payment-plan');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errMsg = validateModal([
      { el: document.getElementById('mpp-invoice'), label: 'Invoice / Reference Number' },
      { el: document.getElementById('mpp-company'), label: 'Company Name' },
      { el: document.getElementById('mpp-name'),    label: 'Debtor Name' },
      { el: document.getElementById('mpp-phone'),   label: 'Best Contact Number' },
      { el: document.getElementById('mpp-email'),   label: 'Best Email Address' },
      { el: document.getElementById('mpp-plan'),    label: 'Proposed Payment Plan' },
    ]);
    if (errMsg) {
      const errEl = document.getElementById('mpp-error');
      errEl.textContent = errMsg; errEl.hidden = false; return;
    }
    const btn = document.getElementById('mpp-submit');
    await submitDebtorForm({
      formType:     'payment-plan',
      invoice:      document.getElementById('mpp-invoice').value.trim(),
      company:      document.getElementById('mpp-company').value.trim(),
      name:         document.getElementById('mpp-name').value.trim(),
      phone:        document.getElementById('mpp-phone').value.trim(),
      email:        document.getElementById('mpp-email').value.trim(),
      callbackTime: document.getElementById('mpp-callback').value.trim(),
      plan:         document.getElementById('mpp-plan').value.trim(),
    }, btn, btn.innerHTML, 'mpp-form-wrap', 'mpp-success', 'mpp-error');
  });
})();

/* ═══════════════════════════════════════════════════
   FORM: Dispute an Invoice
   ═══════════════════════════════════════════════════ */
(function() {
  const form = document.getElementById('form-dispute');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errMsg = validateModal([
      { el: document.getElementById('mdi-invoice'), label: 'Invoice / Reference Number' },
      { el: document.getElementById('mdi-company'), label: 'Company Name' },
      { el: document.getElementById('mdi-name'),    label: 'Debtor Name' },
      { el: document.getElementById('mdi-phone'),   label: 'Best Contact Number' },
      { el: document.getElementById('mdi-email'),   label: 'Best Email Address' },
      { el: document.getElementById('mdi-reason'),  label: 'Reason for Dispute' },
      { el: document.getElementById('mdi-details'), label: 'Full Details of Your Dispute' },
      { el: document.getElementById('mdi-confirm'), label: 'Confirmation checkbox' },
    ]);
    if (errMsg) {
      const errEl = document.getElementById('mdi-error');
      errEl.textContent = errMsg; errEl.hidden = false; return;
    }
    const btn      = document.getElementById('mdi-submit');
    const zone     = document.getElementById('mdi-upload-zone');
    const rawFiles = zone && zone._getFiles ? zone._getFiles() : [];
    let   filesJson = '[]';
    try { if (rawFiles.length) filesJson = JSON.stringify(await encodeFiles(rawFiles)); } catch {}
    await submitDebtorForm({
      formType:     'dispute',
      invoice:      document.getElementById('mdi-invoice').value.trim(),
      company:      document.getElementById('mdi-company').value.trim(),
      name:         document.getElementById('mdi-name').value.trim(),
      phone:        document.getElementById('mdi-phone').value.trim(),
      email:        document.getElementById('mdi-email').value.trim(),
      callbackTime: document.getElementById('mdi-callback').value.trim(),
      reason:       document.getElementById('mdi-reason').value,
      details:      document.getElementById('mdi-details').value.trim(),
      files:        filesJson,
    }, btn, btn.innerHTML, 'mdi-form-wrap', 'mdi-success', 'mdi-error');
  });
})();

/* ═══════════════════════════════════════════════════
   FORM: Upload Proof of Payment
   ═══════════════════════════════════════════════════ */
(function() {
  const form = document.getElementById('form-proof-payment');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errMsg = validateModal([
      { el: document.getElementById('mpo-invoice'), label: 'Invoice / Reference Number' },
      { el: document.getElementById('mpo-company'), label: 'Company Name' },
      { el: document.getElementById('mpo-name'),    label: 'Debtor Name' },
      { el: document.getElementById('mpo-phone'),   label: 'Best Contact Number' },
      { el: document.getElementById('mpo-email'),   label: 'Best Email Address' },
    ]);
    if (errMsg) {
      const errEl = document.getElementById('mpo-error');
      errEl.textContent = errMsg; errEl.hidden = false; return;
    }
    const btn      = document.getElementById('mpo-submit');
    const zone     = document.getElementById('mpo-upload-zone');
    const rawFiles = zone && zone._getFiles ? zone._getFiles() : [];
    let   filesJson = '[]';
    try { if (rawFiles.length) filesJson = JSON.stringify(await encodeFiles(rawFiles)); } catch {}
    await submitDebtorForm({
      formType: 'proof-of-payment',
      invoice:  document.getElementById('mpo-invoice').value.trim(),
      company:  document.getElementById('mpo-company').value.trim(),
      name:     document.getElementById('mpo-name').value.trim(),
      phone:    document.getElementById('mpo-phone').value.trim(),
      email:    document.getElementById('mpo-email').value.trim(),
      files:    filesJson,
    }, btn, btn.innerHTML, 'mpo-form-wrap', 'mpo-success', 'mpo-error');
  });
})();

/* ═══════════════════════════════════════════════════
   FORM: Request a Call Back
   ═══════════════════════════════════════════════════ */
(function() {
  const form = document.getElementById('form-callback');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errMsg = validateModal([
      { el: document.getElementById('mcb-invoice'),  label: 'Invoice / Reference Number' },
      { el: document.getElementById('mcb-company'),  label: 'Company Name' },
      { el: document.getElementById('mcb-name'),     label: 'Debtor Name' },
      { el: document.getElementById('mcb-phone'),    label: 'Best Contact Number' },
      { el: document.getElementById('mcb-email'),    label: 'Best Email Address' },
      { el: document.getElementById('mcb-callback'), label: 'Best Time for a Call Back' },
    ]);
    if (errMsg) {
      const errEl = document.getElementById('mcb-error');
      errEl.textContent = errMsg; errEl.hidden = false; return;
    }
    const btn = document.getElementById('mcb-submit');
    await submitDebtorForm({
      formType:     'callback',
      invoice:      document.getElementById('mcb-invoice').value.trim(),
      company:      document.getElementById('mcb-company').value.trim(),
      name:         document.getElementById('mcb-name').value.trim(),
      phone:        document.getElementById('mcb-phone').value.trim(),
      email:        document.getElementById('mcb-email').value.trim(),
      callbackTime: document.getElementById('mcb-callback').value.trim(),
    }, btn, btn.innerHTML, 'mcb-form-wrap', 'mcb-success', 'mcb-error');
  });
})();

/* ═══════════════════════════════════════════════════════════════
   STRIPE PAYMENT — DEBTOR PORTAL
   ═══════════════════════════════════════════════════════════════
   TO ACTIVATE:
   1. Replace STRIPE_PK with your live key (pk_live_...)
   2. Set up backend endpoint /api/debtor/payment-intent that:
        a. Accepts { invoiceNumber, amount, email }
        b. Looks up the creditor's connected Stripe Account ID
        c. Creates a PaymentIntent with Stripe Connect routing:
           stripe.paymentIntents.create({
             amount, currency: 'gbp', receipt_email: email,
             transfer_data: { destination: creditorStripeAccountId },
             application_fee_amount: Math.round(amount * 0.15),
           })
        d. Returns { clientSecret }
   3. Set up webhook for payment_intent.succeeded
   ─────────────────────────────────────────────── */
const STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_KEY';

(function initDebtorStripe() {
  if (typeof Stripe === 'undefined' || STRIPE_PK.includes('REPLACE')) {
    const payBtn = document.getElementById('d-pay-btn');
    if (payBtn) {
      payBtn.textContent = 'Online payments coming soon';
      payBtn.disabled = true;
    }
    return;
  }

  const stripe    = Stripe(STRIPE_PK);
  const elements  = stripe.elements();
  const cardMount = document.getElementById('d-card-element');
  if (!cardMount) return;

  cardMount.innerHTML = '';
  const card = elements.create('card', {
    style: {
      base: {
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: '15px',
        color: '#1E293B',
        '::placeholder': { color: '#94A3B8' },
      },
      invalid: { color: '#ef4444' },
    },
  });
  card.mount('#d-card-element');
  card.on('change', e => {
    document.getElementById('d-card-errors').textContent = e.error?.message || '';
  });
  card.on('ready', () => {
    document.getElementById('d-pay-btn').disabled = false;
  });

  const pr = stripe.paymentRequest({
    country: 'GB', currency: 'gbp',
    total: { label: 'Invoice Payment', amount: 100 },
    requestPayerName: true, requestPayerEmail: true,
  });
  const prBtn = elements.create('paymentRequestButton', {
    paymentRequest: pr,
    style: { paymentRequestButton: { theme: 'dark', height: '44px' } },
  });
  pr.canMakePayment().then(result => {
    if (result) {
      document.getElementById('d-pay-divider').hidden = false;
      prBtn.mount('#d-pr-button');
    }
  });

  document.getElementById('d-pay-btn')?.addEventListener('click', async () => {
    const btn     = document.getElementById('d-pay-btn');
    const invoice = document.getElementById('d-invoice')?.value?.trim();
    const email   = document.getElementById('d-email')?.value?.trim();
    const amount  = Math.round(parseFloat(document.getElementById('d-amount')?.value || '0') * 100);

    document.getElementById('d-card-errors').textContent = '';
    if (!amount || amount < 1) {
      document.getElementById('d-card-errors').textContent = 'Please enter the invoice amount.';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('d-card-errors').textContent = 'Please enter a valid email address for your receipt.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Processing…`;

    try {
      const res = await fetch('/api/debtor/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber: invoice, amount, email }),
      });
      const { clientSecret, error: serverError } = await res.json();
      if (serverError) {
        document.getElementById('d-card-errors').textContent = serverError;
        resetPayBtn(btn); return;
      }
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card, billing_details: { email } },
      });
      if (stripeError) {
        document.getElementById('d-card-errors').textContent = stripeError.message;
        resetPayBtn(btn);
      } else {
        document.getElementById('debtor-stripe-form').hidden = true;
        document.getElementById('debtor-payment-success').hidden = false;
        document.querySelector('.sc-routing-notice')?.remove();
      }
    } catch {
      document.getElementById('d-card-errors').textContent =
        'Something went wrong. Please try again or call us on 0800 975 7066.';
      resetPayBtn(btn);
    }
  });

  function resetPayBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Pay Securely`;
  }
})();
