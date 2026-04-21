/* ═══════════════════════════════════════════════════════
   Outdoor Solutions — Main JS
   Nav scroll, mobile menu, active links, scroll reveal,
   form validation + EmailJS submission.
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Nav: add .scrolled class on scroll ── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run on load in case page is already scrolled
  }

  /* ── 2. Hamburger / mobile nav ── */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      if (isOpen) {
        mobileNav.classList.add('open');
        document.body.style.overflow = 'hidden';
        hamburger.setAttribute('aria-expanded', 'true');
      } else {
        closeMobileNav();
      }
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileNav);
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (
        mobileNav.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeMobileNav();
      }
    });
  }

  function closeMobileNav() {
    hamburger?.classList.remove('open');
    mobileNav?.classList.remove('open');
    document.body.style.overflow = '';
    hamburger?.setAttribute('aria-expanded', 'false');
  }

  /* ── 3. Active nav link ── */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (
      href === currentFile ||
      (currentFile === '' && href === 'index.html') ||
      (currentFile === 'index.html' && href === 'index.html')
    ) {
      link.classList.add('active');
    }
  });

  /* ── 4. Scroll reveal (IntersectionObserver) ── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── 5. Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h'), 10) || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        closeMobileNav();
      }
    });
  });

  /* ── 6. Contact form: validation + EmailJS ── */
  const surveyForm = document.getElementById('surveyForm');
  const formSuccess = document.getElementById('formSuccess');

  if (surveyForm && formSuccess) {
    // Initialise EmailJS
    if (typeof emailjs !== 'undefined') {
      emailjs.init('E8xMzKP_rXnhFo5kB');
    }

    surveyForm.addEventListener('submit', async e => {
      e.preventDefault();

      let isValid = true;

      // Validate required fields
      surveyForm.querySelectorAll('[required]').forEach(field => {
        const group = field.closest('.form-group');
        const errorEl = group?.querySelector('.field-error');
        if (!field.value.trim()) {
          markError(group, errorEl, 'This field is required.');
          isValid = false;
        } else {
          clearError(group, errorEl);
        }
      });

      // Validate email format
      const emailField = surveyForm.querySelector('input[type="email"]');
      if (emailField && emailField.value.trim()) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(emailField.value.trim())) {
          const group = emailField.closest('.form-group');
          const errorEl = group?.querySelector('.field-error');
          markError(group, errorEl, 'Please enter a valid email address.');
          isValid = false;
        }
      }

      if (!isValid) return;

      // Submit
      const submitBtn = surveyForm.querySelector('[type="submit"]');
      const origLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      try {
        if (typeof emailjs !== 'undefined') {
          await emailjs.sendForm('service_ku0sla4', 'PLACEHOLDER_TEMPLATE_ID', surveyForm);
        }
        surveyForm.style.display = 'none';
        formSuccess.style.display = 'block';
      } catch (err) {
        console.error('EmailJS error:', err);
        submitBtn.textContent = origLabel;
        submitBtn.disabled = false;
        // Graceful inline fallback
        const errMsg = surveyForm.querySelector('.form-submit-error');
        if (errMsg) errMsg.style.display = 'block';
      }
    });

    // Live clear errors
    surveyForm.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => {
        if (field.value.trim()) {
          const group = field.closest('.form-group');
          const errorEl = group?.querySelector('.field-error');
          clearError(group, errorEl);
        }
      });
    });
  }

  function markError(group, errorEl, msg) {
    group?.classList.add('has-error');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
  }
  function clearError(group, errorEl) {
    group?.classList.remove('has-error');
    errorEl?.classList.remove('visible');
  }

  /* ── 7. Footer year ── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
