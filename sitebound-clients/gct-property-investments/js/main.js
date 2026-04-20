/* ============================================================
   GCT Property Investments Ltd — main.js
   ============================================================ */

// ── EmailJS config ──────────────────────────────────────────
const EMAILJS_SERVICE_ID          = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID         = 'YOUR_TEMPLATE_ID';        // enquiry form (book.html)
const EMAILJS_TEMPLATE_ID_CONTACT = 'YOUR_CONTACT_TEMPLATE_ID'; // contact form
const EMAILJS_PUBLIC_KEY          = 'YOUR_PUBLIC_KEY';

// ── Init EmailJS ─────────────────────────────────────────────
if (typeof emailjs !== 'undefined') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ── Nav: scroll shadow ───────────────────────────────────────
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
}

// ── Nav: mobile hamburger ────────────────────────────────────
const hamburger = document.querySelector('.nav-hamburger');
const mobileNav = document.querySelector('.nav-mobile');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close on internal link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Nav: active link highlight ───────────────────────────────
(function markActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const isHome = (page === '' || page === 'index.html') && (href === 'index.html' || href === './');
    if (href === page || isHome) a.classList.add('active');
  });
})();

// ── Scroll-triggered fade-up animations ─────────────────────
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ── Enquiry form (book.html) ─────────────────────────────────
const enquiryForm = document.getElementById('enquiry-form');
if (enquiryForm) {
  enquiryForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = enquiryForm.querySelector('.btn-submit');
    const success = document.getElementById('form-success');
    const orig    = btn.textContent;

    btn.textContent = 'Sending…';
    btn.disabled    = true;

    const data = {
      name:          enquiryForm.querySelector('[name="name"]').value,
      email:         enquiryForm.querySelector('[name="email"]').value,
      phone:         enquiryForm.querySelector('[name="phone"]').value,
      budget:        enquiryForm.querySelector('[name="budget"]').value,
      property_type: enquiryForm.querySelector('[name="property_type"]').value,
      location:      enquiryForm.querySelector('[name="location"]').value,
      strategy:      enquiryForm.querySelector('[name="strategy"]').value,
      finance:       enquiryForm.querySelector('[name="finance"]').value,
      timeline:      enquiryForm.querySelector('[name="timeline"]').value,
      notes:         enquiryForm.querySelector('[name="notes"]').value,
    };

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, data);
      enquiryForm.style.display = 'none';
      success.classList.add('visible');
      success.focus();
    } catch {
      btn.textContent = orig;
      btn.disabled    = false;
      alert('Something went wrong — please try again or email us directly at info@gctpropertyinvestments.co.uk');
    }
  });
}

// ── Contact form (contact.html) ──────────────────────────────
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = contactForm.querySelector('.btn-submit');
    const success = document.getElementById('contact-success');
    const orig    = btn.textContent;

    btn.textContent = 'Sending…';
    btn.disabled    = true;

    const data = {
      name:    contactForm.querySelector('[name="name"]').value,
      email:   contactForm.querySelector('[name="email"]').value,
      message: contactForm.querySelector('[name="message"]').value,
    };

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_CONTACT, data);
      contactForm.style.display = 'none';
      success.classList.add('visible');
      success.focus();
    } catch {
      btn.textContent = orig;
      btn.disabled    = false;
      alert('Something went wrong — please try again or email us directly at info@gctpropertyinvestments.co.uk');
    }
  });
}
