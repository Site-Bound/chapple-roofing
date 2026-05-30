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

const DEMO_CASES = [
  {
    id: 'demo-1',
    debtor_name:       'Smith Engineering Ltd',
    debtor_company:    'Smith Engineering Ltd',
    amount_owed:       4200.00,
    invoice_number:    'INV-2024-0341',
    status:            'active',
    status_notes:      'Initial contact has been made with the debtor. They have acknowledged the debt and we are awaiting a payment proposal.',
    status_updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    submitted_at:      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    documents: [{ filename: 'Invoice-INV-2024-0341.pdf' }, { filename: 'Delivery-Note.pdf' }],
  },
  {
    id: 'demo-2',
    debtor_name:       'Riverside Contractors',
    debtor_company:    null,
    amount_owed:       8750.00,
    invoice_number:    'INV-2024-0298',
    status:            'letter_sent',
    status_notes:      'A formal Letter Before Action has been sent by recorded delivery. The debtor has 7 days to respond before legal proceedings are considered.',
    status_updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    submitted_at:      new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    documents: [{ filename: 'Invoice-INV-2024-0298.pdf' }],
  },
  {
    id: 'demo-3',
    debtor_name:       'Apex Media Group',
    debtor_company:    'Apex Media Group PLC',
    amount_owed:       1850.00,
    invoice_number:    null,
    status:            'submitted',
    status_notes:      null,
    status_updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    submitted_at:      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    documents: [],
  },
  {
    id: 'demo-4',
    debtor_name:       'Johnson & Partners',
    debtor_company:    null,
    amount_owed:       3100.00,
    invoice_number:    'INV-2024-0187',
    status:            'settled',
    status_notes:      'Full payment of £3,100.00 received on 12 May 2025. This case is now closed.',
    status_updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    submitted_at:      new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    documents: [{ filename: 'Invoice-INV-2024-0187.pdf' }, { filename: 'Signed-Agreement.pdf' }],
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

const STATUS_LABELS = {
  submitted:    'Submitted',
  active:       'Active',
  letter_sent:  'Letter Sent',
  in_dispute:   'In Dispute',
  legal:        'Legal Action',
  settled:      'Settled',
  closed:       'Closed',
};

const STATUS_BADGE_CLASS = {
  submitted:    'badge-submitted',
  active:       'badge-active',
  letter_sent:  'badge-letter',
  in_dispute:   'badge-dispute',
  legal:        'badge-legal',
  settled:      'badge-settled',
  closed:       'badge-closed',
};

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  const cls   = STATUS_BADGE_CLASS[status] || 'badge-submitted';
  return `<span class="badge ${cls}">${label}</span>`;
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

  // ── Form submit ────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errBox);

    const debtorName = document.getElementById('debtor-name').value.trim();
    const amountOwed = document.getElementById('amount-owed').value.trim();

    if (!debtorName) {
      showError(errBox, errText, 'Debtor name is required.');
      return;
    }
    if (!amountOwed || parseFloat(amountOwed) <= 0) {
      showError(errBox, errText, 'Please enter a valid amount owed.');
      return;
    }

    setLoading(btn, true);

    try {
      const fd = new FormData();
      fd.append('debtorName',    debtorName);
      fd.append('debtorCompany', document.getElementById('debtor-company').value.trim());
      fd.append('debtorEmail',   document.getElementById('debtor-email').value.trim());
      fd.append('debtorPhone',   document.getElementById('debtor-phone').value.trim());
      fd.append('debtorAddress', document.getElementById('debtor-address').value.trim());
      fd.append('amountOwed',    amountOwed);
      fd.append('invoiceNumber', document.getElementById('invoice-number').value.trim());
      fd.append('invoiceDate',   document.getElementById('invoice-date').value);
      fd.append('description',   document.getElementById('description').value.trim());

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

      // Show success
      form.style.display         = 'none';
      successPanel.style.display = '';

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

let _allCases = []; // stored for client-side search filtering

async function loadCases(token) {
  const loading    = document.getElementById('cases-loading');
  const empty      = document.getElementById('cases-empty');
  const noResults  = document.getElementById('cases-no-results');
  const grid       = document.getElementById('cases-grid');
  const countBadge = document.getElementById('cases-count');
  const searchWrap = document.getElementById('cases-search-wrap');

  // Demo mode — skip API, use mock data
  if (isDemo()) {
    loading.style.display = 'none';
    _allCases = DEMO_CASES;
    const activeCount = _allCases.filter(c => !['settled','closed'].includes(c.status)).length;
    countBadge.textContent   = activeCount;
    countBadge.style.display = activeCount > 0 ? '' : 'none';
    if (searchWrap) searchWrap.style.display = '';
    renderCasesGrid(_allCases);
    const searchInput = document.getElementById('cases-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) { if (noResults) noResults.style.display = 'none'; renderCasesGrid(_allCases); return; }
        const filtered = _allCases.filter(c =>
          (c.debtor_name || '').toLowerCase().includes(q) ||
          (c.debtor_company || '').toLowerCase().includes(q) ||
          (c.invoice_number || '').toLowerCase().includes(q)
        );
        if (filtered.length === 0) { grid.style.display = 'none'; if (noResults) noResults.style.display = ''; }
        else { if (noResults) noResults.style.display = 'none'; renderCasesGrid(filtered); }
      });
    }
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
    loading.style.display = 'none';

    if (!res.ok || !Array.isArray(data.cases)) {
      empty.style.display = '';
      return;
    }

    _allCases = data.cases;

    // Badge — open (non-settled/closed) case count
    const activeCount = _allCases.filter(c => !['settled', 'closed'].includes(c.status)).length;
    countBadge.textContent   = activeCount;
    countBadge.style.display = activeCount > 0 ? '' : 'none';

    if (_allCases.length === 0) {
      empty.style.display = '';
      return;
    }

    // Show search bar once more than one case exists
    if (_allCases.length > 1 && searchWrap) searchWrap.style.display = '';

    renderCasesGrid(_allCases);

    // Wire up search
    const searchInput = document.getElementById('cases-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          if (noResults) noResults.style.display = 'none';
          renderCasesGrid(_allCases);
          return;
        }
        const filtered = _allCases.filter(c =>
          (c.debtor_name    || '').toLowerCase().includes(q) ||
          (c.debtor_company || '').toLowerCase().includes(q) ||
          (c.invoice_number || '').toLowerCase().includes(q)
        );
        if (filtered.length === 0) {
          grid.style.display                         = 'none';
          if (noResults) noResults.style.display     = '';
        } else {
          if (noResults) noResults.style.display     = 'none';
          renderCasesGrid(filtered);
        }
      });
    }
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

function renderCaseCard(c) {
  const invoiceRow = c.invoice_number
    ? `<div class="case-meta-row"><span class="case-meta-label">Invoice</span><span>${escHtml(c.invoice_number)}</span></div>`
    : '';

  // Contextual status message — same pattern as main site debtor lookup
  const msgDef = STATUS_MESSAGES[c.status];
  const msgTypeClass = msgDef
    ? { info: 'case-status-msg--info', warning: 'case-status-msg--warning', success: 'case-status-msg--success' }[msgDef.type] || ''
    : '';

  const updatedAt = c.status_updated_at ? formatDate(c.status_updated_at) : null;

  const updateBlock = `
    <div class="case-update">
      ${msgDef
        ? `<p class="case-status-msg ${msgTypeClass}">${msgDef.text}</p>`
        : ''}
      ${c.status_notes
        ? `<div class="case-team-note">
            <span class="case-team-note-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Latest update from Credvanta
            </span>
            <p>${escHtml(c.status_notes)}</p>
          </div>`
        : ''}
      ${updatedAt
        ? `<p class="case-updated-at">Last updated ${updatedAt}</p>`
        : ''}
    </div>`;

  return `
    <div class="case-card">
      <div class="case-card-header">
        <div>
          <div class="case-debtor">${escHtml(c.debtor_name)}${c.debtor_company ? ` <span class="case-company">· ${escHtml(c.debtor_company)}</span>` : ''}</div>
          <div class="case-amount">${formatCurrency(c.amount_owed)}</div>
        </div>
        <div>${statusBadge(c.status)}</div>
      </div>
      <div class="case-meta">
        <div class="case-meta-row"><span class="case-meta-label">Submitted</span><span>${formatDate(c.submitted_at)}</span></div>
        ${invoiceRow}
      </div>
      ${updateBlock}
      ${buildDocsHtml(c.documents || [])}
    </div>`;
}

function buildDocsHtml(docs) {
  if (!docs || !docs.length) return '';
  const count = docs.length;
  const items = docs.map(d =>
    `<li class="case-doc-item">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 3v4a1 1 0 001 1h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="1.5"/></svg>
      ${escHtml(d.filename || d.file_name || '')}
    </li>`
  ).join('');
  return `
    <div class="case-docs">
      <button type="button" class="case-docs-toggle" data-count="${count}">
        Show ${count} document${count === 1 ? '' : 's'}
      </button>
      <ul class="case-doc-list" style="display:none">${items}</ul>
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
