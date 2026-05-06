/* ═══════════════════════════════════════════════════════════════
   CREDVANTA — Debtor Page JS
   ═══════════════════════════════════════════════════════════════ */

/* ─── Scroll reveal (debtor page) ───────────────────────────── */
const revealObs = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); revealObs.unobserve(e.target); }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));

/* ─── Footer year ────────────────────────────────────────────── */
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═══════════════════════════════════════════════════════════════
   STRIPE PAYMENT — DEBTOR PORTAL
   ═══════════════════════════════════════════════════════════════
   TO ACTIVATE:
   1. Replace STRIPE_PUBLISHABLE_KEY with your live key (pk_live_...)
   2. Set up backend endpoint /api/debtor/payment-intent that:
        a. Accepts { invoiceNumber, amount, email }
        b. Looks up the creditor's connected Stripe Account ID
           from your database (stored during creditor onboarding)
        c. Creates a PaymentIntent with Stripe Connect routing:
           stripe.paymentIntents.create({
             amount,                   // in pence
             currency: 'gbp',
             receipt_email: email,
             transfer_data: {
               destination: creditorStripeAccountId,
             },
             application_fee_amount: Math.round(amount * 0.15), // 15% Credvanta fee
           })
        d. Returns { clientSecret }
   3. Set up webhook to listen for payment_intent.succeeded to
      mark invoice as paid in your database
   ─────────────────────────────────────────────────────────────── */
const STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_KEY';

(function initDebtorStripe() {
  if (typeof Stripe === 'undefined' || STRIPE_PK.includes('REPLACE')) {
    // Not yet configured — show coming soon state
    const payBtn = document.getElementById('d-pay-btn');
    if (payBtn) {
      payBtn.textContent = 'Online payments coming soon';
      payBtn.disabled = true;
    }
    return;
  }

  const stripe   = Stripe(STRIPE_PK);
  const elements = stripe.elements();
  const cardMount = document.getElementById('d-card-element');
  if (!cardMount) return;

  // Mount Stripe Card Element
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

  // Payment Request Button (Apple Pay / Google Pay)
  const pr = stripe.paymentRequest({
    country: 'GB', currency: 'gbp',
    total: { label: 'Invoice Payment', amount: 100 }, // amount updated on pay click
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

  // Pay button
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
        resetPayBtn(btn);
        return;
      }

      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: { email },
        },
      });

      if (stripeError) {
        document.getElementById('d-card-errors').textContent = stripeError.message;
        resetPayBtn(btn);
      } else {
        // Success
        document.getElementById('debtor-stripe-form').hidden = true;
        document.getElementById('debtor-payment-success').hidden = false;
        document.querySelector('.sc-routing-notice')?.remove();
      }
    } catch {
      document.getElementById('d-card-errors').textContent =
        'Something went wrong. Please try again or call us on 0800 048 8285.';
      resetPayBtn(btn);
    }
  });

  function resetPayBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Pay Securely`;
  }
})();
