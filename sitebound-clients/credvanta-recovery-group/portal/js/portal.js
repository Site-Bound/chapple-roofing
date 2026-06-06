/* ============================================================
   portal.js — Credvanta Recovery Group Client Portal
   Handles: login, password reset, set-password, dashboard
   ============================================================ */

const API_BASE = '/portal';
const TOKEN_KEY = 'crg_portal_token';
const CLIENT_REF_KEY = 'crg_portal_ref';
const CLIENT_NAME_KEY = 'crg_portal_name';

/* ── Demo mode ───────────────────────────────────────────────
   Credentials: Client Reference = DEMO  /  Password = demo1234
   Bypasses all API calls and renders mock data so the portal
   can be reviewed before Supabase is configured.
   ──────────────────────────────────────────────────────────── */
const DEMO_TOKEN = '__DEMO__';
const DEMO_REF   = 'DEMO';
const DEMO_PASS  = 'demo1234';

function isDemo() {
  return localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN;
}

// Demo cases use live_cases field names so the same renderCaseCard works for both
const DEMO_CASES = [
  {
    case_reference_number: 'CRG-2024-001',
    client_invoice_number: 'INV-2024-0341',
    debtor_business_name:  'Smith Engineering Ltd',
    debtor_contact_name:   'John Smith',
    original_balance:      4200.00,
    current_balance:       4200.00,
    status:                'Active',
  },
  {
    case_reference_number: 'CRG-2024-002',
    client_invoice_number: 'INV-2024-0298',
    debtor_business_name:  'Riverside Contractors',
    debtor_contact_name:   null,
    original_balance:      8750.00,
    current_balance:       8750.00,
    status:                'Letter Sent',
  },
  {
    case_reference_number: 'CRG-2024-003',
    client_invoice_number: null,
    debtor_business_name:  'Apex Media Group PLC',
    debtor_contact_name:   null,
    original_balance:      1850.00,
    current_balance:       1850.00,
    status:                'Submitted',
  },
  {
    case_reference_number: 'CRG-2024-004',
    client_invoice_number: 'INV-2024-0187',
    debtor_business_name:  null,
    debtor_contact_name:   'Johnson & Partners',
    original_balance:      3100.00,
    current_balance:       0.00,
    status:                'Settled',
  },
];

/* ── Utility ─────────────────────────────────────────────── */

function apiUrl(path) {
  return `${API_BASE}/${path}`;
}

function saveSession(token, clientRef, fullName) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_REF_KEY, clientRef);
  if (fullName) localStorage.setItem(CLIENT_NAME_KEY, fullName);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_REF_KEY);
  localStorage.removeItem(CLIENT_NAME_KEY);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getClientRef() {
  return localStorage.getItem(CLIENT_REF_KEY);
}

function getClientName() {
  return localStorage.getItem(CLIENT_NAME_KEY) || getClientRef() || 'Client';
}

function setLoading(btn, loading, defaultText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.orig = btn.textContent;
    btn.textContent = 'Please wait…';
  } else {
    btn.disabled = false;
    btn.textContent = defaultText || btn.dataset.orig || btn.textContent;
  }
}

function showError(el, textEl, message) {
  el.hidden = false;
  textEl.textContent = message;
}

function hideError(el) {
  el.hidden = true;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Map free-text live_cases status to a badge CSS class.
   Uses substring matching — same logic as getStatusClass() on the main site. */
function liveStatusClass(status) {
  if (!status) return 'badge-submitted';
  const s = status.toLowerCase();
  if (s.includes('settled') || s.includes('paid') || s.includes('closed')) return 'badge-settled';
  if (s.includes('legal') || s.includes('court') || s.includes('litigation')) return 'badge-legal';
  if (s.includes('dispute')) return 'badge-dispute';
  if (s.includes('letter')) return 'badge-letter';
  if (s.includes('active') || s.includes('open')) return 'badge-active';
  return 'badge-submitted';
}

/* Returns true for cases that are still open (not settled/paid/closed) */
function isOpenCase(status) {
  if (!status) return true;
  const s = status.toLowerCase();
  return !(s.includes('settled') || s.includes('paid') || s.includes('closed'));
}

function statusBadge(status) {
  return `<span class="badge ${liveStatusClass(status)}">${escHtml(status || 'Submitted')}</span>`;
}

/* ── Router ──────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  switch (page) {
    case 'login':        initLogin();        break;
    case 'reset':        initReset();        break;
    case 'set-password': initSetPassword();  break;
    case 'dashboard':    initDashboard();    break;
  }
});

/* ── Login Page ──────────────────────────────────────────── */

function initLogin() {
  // Already logged in? Go straight to dashboard
  if (getToken()) {
    window.location.replace('/portal/dashboard');
    return;
  }

  const form    = document.getElementById('login-form');
  const btn     = document.getElementById('login-btn');
  const errBox  = document.getElementById('login-error');
  const errText = document.getElementById('login-error-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errBox);

    const clientRef = document.getElementById('client-ref').value.trim().toUpperCase();
    const password  = document.getElementById('password').value;

    if (!clientRef || !password) {
      showError(errBox, errText, 'Please enter your client reference and password.');
      return;
    }

    // Demo mode — no API call needed
    if (clientRef === DEMO_REF && password === DEMO_PASS) {
      saveSession(DEMO_TOKEN, DEMO_REF, 'Demo Account');
      window.location.replace('/portal/dashboard');
      return;
    }

    setLoading(btn, true);

    try {
      const res  = await fetch(apiUrl('login'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientRef, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(errBox, errText, data.error || 'Invalid credentials. Please try again.');
        return;
      }

      saveSession(data.token, data.clientRef, data.fullName);
      window.location.replace('/portal/dashboard');
    } catch {
      showError(errBox, errText, 'Could not connect. Please check your connection and try again.');
    } finally {
      setLoading(btn, false, 'Sign In');
    }
  });
}

/* ── Reset Password Page ─────────────────────────────────── */

function initReset() {
  const form      = document.getElementById('reset-form');
  const btn       = document.getElementById('reset-btn');
  const errBox    = document.getElementById('reset-error');
  const errText   = document.getElementById('reset-error-text');
  const formWrap  = document.getElementById('reset-form-wrap');
  const successWrap = document.getElementById('reset-success-wrap');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errBox);

    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
      showError(errBox, errText, 'Please enter your email address.');
      return;
    }

    setLoading(btn, true);

    try {
      const res = await fetch(apiUrl('request-reset'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });

      // Always show success — API never reveals whether email is registered
      if (res.ok || res.status === 200) {
        formWrap.style.display = 'none';
        successWrap.style.display = '';
        return;
      }

      const data = await res.json().catch(() => ({}));
      showError(errBox, errText, data.error || 'Something went wrong. Please try again.');
    } catch {
      showError(errBox, errText, 'Could not connect. Please check your connection and try again.');
    } finally {
      setLoading(btn, false, 'Send Reset Link');
    }
  });
}

/* ── Set Password Page ───────────────────────────────────── */

function initSetPassword() {
  const params   = new URLSearchParams(window.location.search);
  const token    = params.get('token');
  const clientRef = params.get('ref');

  const formWrap    = document.getElementById('set-password-form-wrap');
  const invalidWrap = document.getElementById('set-password-invalid-wrap');

  // If no token/ref in URL, show invalid state immediately
  if (!token || !clientRef) {
    formWrap.style.display    = 'none';
    invalidWrap.style.display = '';
    return;
  }

  const form    = document.getElementById('set-password-form');
  const btn     = document.getElementById('set-password-btn');
  const errBox  = document.getElementById('set-password-error');
  const errText = document.getElementById('set-password-error-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errBox);

    const newPassword     = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword.length < 8) {
      showError(errBox, errText, 'Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(errBox, errText, 'Passwords do not match.');
      return;
    }

    setLoading(btn, true);

    try {
      const res  = await fetch(apiUrl('set-password'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, clientRef, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          // Token invalid or expired — show the invalid state
          formWrap.style.display    = 'none';
          invalidWrap.style.display = '';
          return;
        }
        showError(errBox, errText, data.error || 'Something went wrong. Please try again.');
        return;
      }

      // Success — redirect to login with a small delay so user sees the button change
      btn.textContent = 'Password updated!';
      setTimeout(() => {
        window.location.replace('/portal/');
      }, 1200);
    } catch {
      showError(errBox, errText, 'Could not connect. Please check your connection and try again.');
      setLoading(btn, false, 'Set Password');
    }
  });
}

/* ── Dashboard Page ──────────────────────────────────────── */

function initDashboard() {
  const token = getToken();
  if (!token) {
    window.location.replace('/portal/');
    return;
  }

  // Populate name in topbar
  document.getElementById('topbar-name').textContent = getClientName();

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.replace('/portal/');
  });

  // Tab switching
  initTabs();

  // Submit form
  initSubmitForm(token);

  // Cases (load immediately — badge count needed)
  loadCases(token);
}

/* ── Tab Switching ───────────────────────────────────────── */

function initTabs() {
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const panels   = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      panels.forEach(p => {
        p.classList.toggle('active', p.id === `panel-${target}`);
      });
    });
  });
}

/* ── Submit Form ─────────────────────────────────────────── */

function initSubmitForm(token) {
  const form         = document.getElementById('submit-form');
  const btn          = document.getElementById('submit-btn');
  const errBox       = document.getElementById('submit-error');
  const errText      = document.getElementById('submit-error-text');
  const successPanel = document.getElementById('submit-success');
  const clearBtn     = document.getElementById('clear-form-btn');
  const anotherBtn   = document.getElementById('submit-another-btn');
  const successLogoutBtn = document.getElementById('submit-logout-btn');
  const fileInput    = document.getElementById('file-input');
  const fileDrop     = document.getElementById('file-drop');
  const fileList     = document.getElementById('file-list');

  let selectedFiles = [];

  // ── File handling ──────────────────────────────

  fileDrop.addEventListener('click', (e) => {
    if (e.target === fileInput) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  fileDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDrop.classList.add('drag-over');
  });

  fileDrop.addEventListener('dragleave', () => {
    fileDrop.classList.remove('drag-over');
  });

  fileDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDrop.classList.remove('drag-over');
    addFiles(Array.from(e.dataTransfer.files));
  });

  function addFiles(files) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    files.forEach(f => {
      if (f.size > maxSize) {
        alert(`"${f.name}" exceeds the 10MB limit and was not added.`);
        return;
      }
      if (selectedFiles.some(x => x.name === f.name && x.size === f.size)) return;
      selectedFiles.push(f);
    });
    renderFileList();
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
  }

  function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 3v4a1 1 0 001 1h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="1.5"/></svg>
        <span class="file-name">${escapeHtml(f.name)}</span>
        <span class="file-size">${formatFileSize(f.size)}</span>
        <button type="button" class="file-remove" aria-label="Remove file" data-index="${i}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`;
      fileList.appendChild(li);
    });

    fileList.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFile(parseInt(btn.dataset.index, 10)));
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Clear ──────────────────────────────────────

  clearBtn.addEventListener('click', () => {
    form.reset();
    selectedFiles = [];
    renderFileList();
    hideError(errBox);
  });

  // ── Submit another ─────────────────────────────

  anotherBtn.addEventListener('click', () => {
    form.reset();
    selectedFiles = [];
    renderFileList();
    hideError(errBox);
    successPanel.style.display = 'none';
    form.style.display         = '';
  });

  // Sign out from success panel
  if (successLogoutBtn) {
    successLogoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.replace('/portal/');
    });
  }

  // ── Form submit ────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errBox);

    const debtorName = document.getElementById('debtor-name').value.trim();
    const amountOwed = document.getElementById('amount-owed').value.trim();

    const debtorCompany = document.getElementById('debtor-company').value.trim();

    if (!debtorCompany) {
      showError(errBox, errText, 'Debtor company is required.');
      return;
    }
    if (!debtorName) {
      showError(errBox, errText, 'Debtor contact name is required.');
      return;
    }
    if (!amountOwed || parseFloat(amountOwed) <= 0) {
      showError(errBox, errText, 'Please enter a valid amount owed.');
      return;
    }

    setLoading(btn, true);

    try {
      // Optional chaining so missing form fields (e.g. stale cached HTML)
      // send blank values rather than crashing the submit handler
      const val = id => document.getElementById(id)?.value?.trim() ?? '';

      const fd = new FormData();
      fd.append('debtorCompany',     debtorCompany);
      fd.append('debtorContactName', debtorName);
      fd.append('debtorEmail',       val('debtor-email'));
      fd.append('debtorTelephone',   val('debtor-telephone'));
      fd.append('debtorMobile',      val('debtor-mobile'));
      fd.append('debtorAddress',     val('debtor-address'));
      fd.append('amountOwed',        amountOwed);
      fd.append('invoiceNumber',     val('invoice-number'));
      fd.append('invoiceDate',       document.getElementById('invoice-date')?.value ?? '');
      fd.append('description',       val('description'));

      selectedFiles.forEach(f => fd.append('files', f));

      const res  = await fetch(apiUrl('submit-case'), {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();

      if (res.status === 401) {
        // Session expired
        clearSession();
        window.location.replace('/portal/');
        return;
      }

      if (!res.ok) {
        showError(errBox, errText, data.error || 'Failed to submit case. Please try again.');
        return;
      }

      // Show success — must use explicit 'block' because .success-panel
      // has display:none in CSS; setting to '' would fall back to that rule.
      form.style.display         = 'none';
      successPanel.style.display = 'block';

      // Refresh cases list and badge in background
      loadCases(token);
    } catch {
      showError(errBox, errText, 'Could not connect. Please check your connection and try again.');
    } finally {
      setLoading(btn, false, 'Submit Case');
    }
  });
}

/* ── Status messages (mirrors main site debtor lookup) ───────── */

const STATUS_MESSAGES = {
  submitted:   { type: 'info',    text: 'Your case has been received and is being reviewed by our team. We will be in touch shortly.' },
  active:      { type: 'info',    text: 'Your case is being actively worked on. Our team will keep you updated on progress.' },
  letter_sent: { type: 'info',    text: 'A formal demand letter has been sent to the debtor. We are awaiting their response.' },
  in_dispute:  { type: 'warning', text: 'The debtor has raised a dispute. Our team is reviewing the details and will contact you.' },
  legal:       { type: 'warning', text: 'Your case has been referred for legal action. Our team will update you as proceedings progress.' },
  settled:     { type: 'success', text: 'This debt has been successfully recovered. Thank you for using Credvanta Recovery Group.' },
  closed:      { type: 'info',    text: 'This case has been closed. Please contact us if you have any questions.' },
};

/* ── Cases Panel ─────────────────────────────────────────── */

let _allCases     = []; // all cases for the client
let _activeSubtab = 'ongoing'; // 'ongoing' or 'closed'

/* Apply both sub-tab filter AND search filter, then render */
function refreshCasesView() {
  const grid       = document.getElementById('cases-grid');
  const noResults  = document.getElementById('cases-no-results');
  const subEmpty   = document.getElementById('subtab-empty');
  const subEmptyTxt = document.getElementById('subtab-empty-text');
  const searchInput = document.getElementById('cases-search');
  const q = (searchInput?.value || '').trim().toLowerCase();

  // Filter by sub-tab
  const bySubtab = _allCases.filter(c =>
    _activeSubtab === 'ongoing' ? isOpenCase(c.status) : !isOpenCase(c.status)
  );

  // Apply search if any
  const filtered = q ? bySubtab.filter(c => caseMatchesSearch(c, q)) : bySubtab;

  // Reset display states
  if (noResults) noResults.style.display = 'none';
  if (subEmpty)  subEmpty.style.display  = 'none';

  if (filtered.length === 0) {
    grid.style.display = 'none';
    if (q) {
      if (noResults) noResults.style.display = '';
    } else {
      if (subEmptyTxt) subEmptyTxt.textContent = `No ${_activeSubtab} cases.`;
      if (subEmpty)    subEmpty.style.display = '';
    }
    return;
  }

  renderCasesGrid(filtered);
}

/* Wire up the Ongoing/Closed sub-tab buttons (idempotent) */
function initSubtabs() {
  const subtabBtns = document.querySelectorAll('.subtab-btn');
  subtabBtns.forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      _activeSubtab = btn.dataset.subtab;
      subtabBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      refreshCasesView();
    });
  });
}

async function loadCases(token) {
  const loading       = document.getElementById('cases-loading');
  const empty         = document.getElementById('cases-empty');
  const countBadge    = document.getElementById('cases-count');
  const searchWrap    = document.getElementById('cases-search-wrap');
  const subtabsWrap   = document.getElementById('cases-subtabs');
  const countOngoing  = document.getElementById('count-ongoing');
  const countClosed   = document.getElementById('count-closed');

  /* Helper to apply case data once received (works for demo and live) */
  function applyCases(cases) {
    loading.style.display = 'none';
    _allCases = cases;

    const ongoing = _allCases.filter(c => isOpenCase(c.status)).length;
    const closed  = _allCases.length - ongoing;

    countBadge.textContent   = ongoing;
    countBadge.style.display = ongoing > 0 ? '' : 'none';
    if (countOngoing) countOngoing.textContent = ongoing;
    if (countClosed)  countClosed.textContent  = closed;

    if (_allCases.length === 0) {
      empty.style.display = '';
      return;
    }

    if (subtabsWrap) subtabsWrap.style.display = '';
    if (searchWrap)  searchWrap.style.display  = '';
    initSubtabs();
    refreshCasesView();

    // Wire up search (idempotent)
    const searchInput = document.getElementById('cases-search');
    if (searchInput && !searchInput.dataset.wired) {
      searchInput.dataset.wired = '1';
      searchInput.addEventListener('input', refreshCasesView);
    }
  }

  // Demo mode — skip API, use mock data
  if (isDemo()) {
    applyCases(DEMO_CASES);
    return;
  }

  try {
    const res = await fetch(apiUrl('cases'), {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401) {
      clearSession();
      window.location.replace('/portal/');
      return;
    }

    const data = await res.json();

    if (!res.ok || !Array.isArray(data.cases)) {
      loading.style.display = 'none';
      empty.style.display = '';
      return;
    }

    applyCases(data.cases);

  } catch {
    loading.style.display = 'none';
    empty.style.display   = '';
  }
}

function renderCasesGrid(cases) {
  const grid = document.getElementById('cases-grid');
  grid.style.display = '';
  grid.innerHTML = cases.map(c => renderCaseCard(c)).join('');

  grid.querySelectorAll('.case-docs-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const docList = btn.closest('.case-card').querySelector('.case-doc-list');
      const open    = docList.style.display !== 'none';
      docList.style.display = open ? 'none' : '';
      btn.textContent = open
        ? `Show ${btn.dataset.count} document${btn.dataset.count === '1' ? '' : 's'}`
        : 'Hide documents';
    });
  });
}

/* Returns true if a live_cases record matches the search query */
function caseMatchesSearch(c, q) {
  return (
    (c.debtor_business_name  || '').toLowerCase().includes(q) ||
    (c.debtor_contact_name   || '').toLowerCase().includes(q) ||
    (c.client_invoice_number || '').toLowerCase().includes(q) ||
    (c.case_reference_number || '').toLowerCase().includes(q)
  );
}

function renderCaseCard(c) {
  // Primary debtor label — business name takes priority
  const debtorLabel  = c.debtor_business_name || c.debtor_contact_name || '—';
  // Show contact name as a secondary tag if both fields are present
  const debtorSub    = c.debtor_business_name && c.debtor_contact_name
    ? ` <span class="case-company">· ${escHtml(c.debtor_contact_name)}</span>` : '';

  // Balances — show initial and outstanding as two clearly labelled lines
  const original = parseFloat(c.original_balance) || 0;
  const current  = parseFloat(c.current_balance);
  const outstanding = !isNaN(current) ? current : original;

  const balanceBlock = `
    <div class="case-balances">
      <div class="case-balance-row">
        <span class="case-balance-label">Initial Balance</span>
        <span class="case-balance-value">${formatCurrency(original)}</span>
      </div>
      <div class="case-balance-row case-balance-row--outstanding">
        <span class="case-balance-label">Outstanding</span>
        <span class="case-balance-value">${formatCurrency(outstanding)}</span>
      </div>
    </div>`;

  // Reference rows
  const refRow = c.case_reference_number
    ? `<div class="case-meta-row"><span class="case-meta-label">Case Ref</span><span>${escHtml(c.case_reference_number)}</span></div>`
    : '';
  const invRow = c.client_invoice_number
    ? `<div class="case-meta-row"><span class="case-meta-label">Invoice</span><span>${escHtml(c.client_invoice_number)}</span></div>`
    : '';

  return `
    <div class="case-card">
      <div class="case-card-header">
        <div class="case-card-debtor">
          <div class="case-debtor">${escHtml(debtorLabel)}${debtorSub}</div>
        </div>
        <div>${statusBadge(c.status)}</div>
      </div>
      ${balanceBlock}
      <div class="case-meta">
        ${refRow}
        ${invRow}
      </div>
    </div>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
