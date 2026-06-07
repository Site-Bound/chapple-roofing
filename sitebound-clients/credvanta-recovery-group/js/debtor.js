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

/* ═══════════════════════════════════════════════════════════════
   AUTO-OPEN FORM FROM URL
   Lets the team email shareable links that open the right form:
     /debtor?form=payment-plan       → Payment Plan
     /debtor?form=dispute            → Dispute an Invoice
     /debtor?form=proof-of-payment   → Upload Proof of Payment
     /debtor?form=callback           → Request a Call Back
   Also accepts the same value as a URL hash (e.g. /debtor#form=dispute).
   Optional &ref=INV-001 pre-fills the invoice reference inside the form.
   ═══════════════════════════════════════════════════════════════ */
(function initFormDeepLinks() {
  const FORM_MAP = {
    'payment-plan':      'modal-payment-plan',
    'payment_plan':      'modal-payment-plan',
    'paymentplan':       'modal-payment-plan',
    'dispute':           'modal-dispute',
    'proof-of-payment':  'modal-proof-payment',
    'proof_of_payment':  'modal-proof-payment',
    'proof-payment':     'modal-proof-payment',
    'proof':             'modal-proof-payment',
    'callback':          'modal-callback',
    'call-back':         'modal-callback',
    'call_back':         'modal-callback',
  };

  // Field IDs for pre-fill (matches the invoice/reference input inside each modal)
  const REF_FIELDS = {
    'modal-payment-plan':  'mpp-invoice',
    'modal-dispute':       'mdi-invoice',
    'modal-proof-payment': 'mpo-invoice',
    'modal-callback':      'mcb-invoice',
  };

  // Read the requested form from query string OR hash (e.g. ?form=dispute or #form=dispute)
  const params  = new URLSearchParams(window.location.search);
  const hashStr = (window.location.hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(hashStr.includes('=') ? hashStr : '');

  const requested = (params.get('form') || hashParams.get('form') || '').trim().toLowerCase();
  if (!requested) return;

  const modalId = FORM_MAP[requested];
  if (!modalId) return;

  // Optional invoice reference pre-fill
  const ref = (params.get('ref') || hashParams.get('ref') || '').trim();

  // Wait until the DOM is ready, then open the matching modal
  function openAndFill() {
    openDebtorModal(modalId);
    if (ref) {
      const fieldId = REF_FIELDS[modalId];
      const input = fieldId ? document.getElementById(fieldId) : null;
      if (input) input.value = ref;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openAndFill);
  } else {
    openAndFill();
  }
})();

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
   (Constants + helpers defined in main.js which loads first)
   ═══════════════════════════════════════════════════════════════ */
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

      const balance = parseFloat(record.current_balance) || 0;
      const balanceEl = document.getElementById('lk-balance');
      balanceEl.textContent = formatGBP(balance);

      /* Show payment option only when money is still owed and status allows payment */
      const blockPayment = balance <= 0 || isPaymentBlocked(record.status);
      document.getElementById('lk-pay-action').hidden = blockPayment;

      /* Dynamic status message */
      const msgEl     = document.getElementById('lk-status-msg');
      const msgTextEl = document.getElementById('lk-status-msg-text');
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
      const invoiceField  = document.getElementById('d-invoice');
      const amountField   = document.getElementById('d-amount');
      const amountHint    = document.getElementById('d-amount-hint');
      const amountFull    = document.getElementById('d-amount-full');
      if (invoiceField) {
        invoiceField.value = ref;
        // Store the creditor's merchant ID so payment routes to the correct account
        invoiceField.dataset.merchantId = record.payment_token_id || '';
      }
      if (!blockPayment && amountField) {
        amountField.value = balance.toFixed(2);
        amountField.max   = balance.toFixed(2);
        if (amountFull) amountFull.textContent = formatGBP(balance);
        if (amountHint) amountHint.hidden = false;
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

  if (resetBtn)  resetBtn.addEventListener('click', () => {
    lookupInput.value = '';
    const amtHint = document.getElementById('d-amount-hint');
    if (amtHint) amtHint.hidden = true;
    showState('lookup');
  });
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
   TAYLR PAYMENT — DEBTOR PORTAL
   (taylrPayment helper defined in main.js, which loads first)
   ═══════════════════════════════════════════════════════════════ */
(function initDebtorTaylr() {
  const payBtn = document.getElementById('d-pay-btn');
  if (!payBtn) return;

  payBtn.disabled = false;

  payBtn.addEventListener('click', () => {
    const invEl = document.getElementById('d-invoice');
    taylrPayment({
      ref:        invEl?.value?.trim()            || '',
      amount:     document.getElementById('d-amount')?.value || '',
      email:      document.getElementById('d-email')?.value  || '',
      merchantId: invEl?.dataset?.merchantId      || '',
      btn:        payBtn,
      errorEl:    document.getElementById('d-card-errors'),
    });
  });
})();
