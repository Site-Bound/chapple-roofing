/* ============================================================
   Credvanta Recovery Group — Cookie Consent Banner
   - Respects Google Consent Mode v2
   - Stores choice in localStorage
   - Shows banner on first visit; hides on subsequent visits
   ============================================================ */

(function () {
  const CONSENT_KEY = 'crg_cookie_consent';

  /* ── Inject styles ───────────────────────────────────────── */
  const css = `
    #crg-cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 99999;
      background: #1a3a6b;
      color: #fff;
      font-family: 'Outfit', system-ui, sans-serif;
      font-size: 0.9rem;
      line-height: 1.5;
      box-shadow: 0 -4px 24px rgba(0,0,0,.25);
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(.4,0,.2,1);
    }
    #crg-cookie-banner.crg-visible {
      transform: translateY(0);
    }
    .crg-cookie-inner {
      max-width: 1180px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .crg-cookie-text {
      flex: 1;
      min-width: 240px;
    }
    .crg-cookie-text p {
      margin: 0;
      color: rgba(255,255,255,.9);
    }
    .crg-cookie-text strong {
      color: #fff;
    }
    .crg-cookie-text a {
      color: #93C5FD;
      text-decoration: underline;
    }
    .crg-cookie-text a:hover {
      color: #fff;
    }
    .crg-cookie-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .crg-btn-reject,
    .crg-btn-accept {
      padding: 9px 20px;
      border-radius: 6px;
      font-family: 'Outfit', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      line-height: 1;
    }
    .crg-btn-reject {
      background: transparent;
      color: rgba(255,255,255,.85);
      border: 1.5px solid rgba(255,255,255,.4);
    }
    .crg-btn-reject:hover {
      background: rgba(255,255,255,.1);
      border-color: rgba(255,255,255,.7);
      color: #fff;
    }
    .crg-btn-accept {
      background: #1851C4;
      color: #fff;
      border: 1.5px solid #1851C4;
      box-shadow: 0 2px 8px rgba(24,81,196,.4);
    }
    .crg-btn-accept:hover {
      background: #2563EB;
      border-color: #2563EB;
    }
    @media (max-width: 600px) {
      .crg-cookie-inner { padding: 14px 16px; gap: 14px; }
      .crg-cookie-actions { width: 100%; }
      .crg-btn-reject, .crg-btn-accept { flex: 1; text-align: center; justify-content: center; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Consent helpers ─────────────────────────────────────── */
  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
  }

  function updateGoogleConsent(granted) {
    if (typeof window.gtag === 'function') {
      const state = granted ? 'granted' : 'denied';
      window.gtag('consent', 'update', {
        ad_storage:          state,
        ad_user_data:        state,
        ad_personalization:  state,
        analytics_storage:   state,
      });
    }
  }

  /* ── Banner ──────────────────────────────────────────────── */
  function removeBanner() {
    const el = document.getElementById('crg-cookie-banner');
    if (!el) return;
    el.classList.remove('crg-visible');
    setTimeout(() => el.remove(), 400);
  }

  function showBanner() {
    if (document.getElementById('crg-cookie-banner')) return;

    const cookiePolicyHref = window.location.pathname.includes('/portal/')
      ? '/cookie-policy.html'
      : 'cookie-policy.html';

    const banner = document.createElement('div');
    banner.id = 'crg-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
      <div class="crg-cookie-inner">
        <div class="crg-cookie-text">
          <p><strong>We use cookies</strong> to improve your experience and analyse site traffic.
          Some cookies are essential; others help us understand how you use our site.
          <a href="${cookiePolicyHref}">Cookie &amp; Website Policy</a></p>
        </div>
        <div class="crg-cookie-actions">
          <button type="button" id="crg-cookie-reject" class="crg-btn-reject">Essential only</button>
          <button type="button" id="crg-cookie-accept" class="crg-btn-accept">Accept all</button>
        </div>
      </div>`;

    document.body.appendChild(banner);

    // Slide up
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('crg-visible')));

    document.getElementById('crg-cookie-accept').addEventListener('click', function () {
      saveConsent('accepted');
      updateGoogleConsent(true);
      removeBanner();
    });

    document.getElementById('crg-cookie-reject').addEventListener('click', function () {
      saveConsent('rejected');
      updateGoogleConsent(false);
      removeBanner();
    });
  }

  /* ── Initialise ──────────────────────────────────────────── */
  const stored = getConsent();

  if (stored === 'accepted') {
    // Previously accepted — grant consent immediately
    updateGoogleConsent(true);
  } else if (stored === null) {
    // No decision yet — show banner after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
  // 'rejected' → Google Consent Mode stays in default denied state; no banner
})();
