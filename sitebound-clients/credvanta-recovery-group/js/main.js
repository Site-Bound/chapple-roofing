/* ═══════════════════════════════════════════════════════════════
   CREDVANTA RECOVERY GROUP — main.js
   ═══════════════════════════════════════════════════════════════ */

/* ─── Header scroll behaviour ───────────────────────────────── */
const header = document.getElementById('site-header');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 60;
  header.classList.toggle('scrolled', scrolled);
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ─── Mobile nav ─────────────────────────────────────────────── */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!open));
  navLinks.classList.toggle('is-open', !open);
  document.body.style.overflow = !open ? 'hidden' : '';
});

navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
    document.body.style.overflow = '';
  });
});

/* ─── Scroll reveal ──────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

/* ─── Animated stat counters ─────────────────────────────────── */
function animateCounter(el, target, decimals = 0, duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const value = (target * ease).toFixed(decimals);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      const target = parseFloat(e.target.dataset.count);
      const decimals = target % 1 !== 0 ? 1 : 0;
      animateCounter(e.target, target, decimals);
      statsObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.5 }
);
document.querySelectorAll('[data-count]').forEach(el => statsObserver.observe(el));

/* ─── FAQ accordion ──────────────────────────────────────────── */
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    const body   = trigger.nextElementSibling;

    // Close all others in same column
    trigger.closest('.faq-col').querySelectorAll('.faq-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      t.nextElementSibling.classList.remove('is-open');
    });

    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      body.classList.add('is-open');
    }
  });
});

/* ─── Smooth scroll for anchor links ────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const headerH = header.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ─── Claim form validation & submission ─────────────────────── */
const form    = document.getElementById('claimForm');
const success = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    form.querySelectorAll('[required]').forEach(field => {
      const ok = field.value.trim() !== '';
      field.classList.toggle('error', !ok);
      if (!ok) valid = false;
    });

    // Basic email check
    const emailField = form.querySelector('#email');
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
      emailField.classList.add('error');
      valid = false;
    }

    if (!valid) return;

    const btn = form.querySelector('.btn-submit');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    // Simulate async submission — replace with real endpoint
    setTimeout(() => {
      form.hidden = true;
      success.hidden = false;
    }, 1200);
  });

  // Remove error state on input
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('error'));
  });
}

/* ─── Footer year ────────────────────────────────────────────── */
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─── Active nav link on scroll ─────────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');

const activeLinkObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinkEls.forEach(l => {
          l.style.color = l.getAttribute('href') === `#${e.target.id}`
            ? 'white'
            : '';
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
sections.forEach(s => activeLinkObserver.observe(s));
