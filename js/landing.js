/* ============================================================
   TRINOVA — LANDING PAGE CONTROLLER
   Session-aware header, mobile nav, CTAs, contact form
   ============================================================ */

(function () {
  const DASH = { superadmin: '/super-admin', admin: '/admin', employee: '/employee' };
  let sessionUser = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- Session-aware header ---------- */

  async function resolveSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      sessionUser = res.ok ? ((await res.json()).user || null) : null;
    } catch (err) {
      sessionUser = null;
    }
    renderSessionUI();
  }

  function renderSessionUI() {
    const signedIn = !!sessionUser;

    // Header buttons
    $$('.signed-out').forEach(el => { el.hidden = signedIn; });
    $$('.signed-in').forEach(el => { el.hidden = !signedIn; });

    // Dashboard link target follows the role
    if (signedIn) {
      const target = DASH[sessionUser.role] || '/employee';
      $$('[data-dash-link]').forEach(el => { el.href = target; });
    }
  }

  /* ---------- Start Training CTA ---------- */

  function startTraining() {
    // Never guess: wait for session resolution before choosing the target
    const go = () => { window.location.href = sessionUser ? '/training' : '/register'; };
    if (sessionReady) {
      Promise.race([sessionReady, new Promise(r => setTimeout(r, 3000))]).then(go, go);
    } else {
      go();
    }
  }

  $$('[data-start-training]').forEach(btn => btn.addEventListener('click', startTraining));
  const topCta = $('#lp-start-top');
  if (topCta) topCta.addEventListener('click', startTraining);

  /* ---------- Mobile menu ---------- */

  const burger = $('#lp-burger');
  const mobileNav = $('#lp-mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    mobileNav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Active nav highlight ---------- */

  const sections = ['what', 'training', 'topics', 'how', 'features', 'about', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('#lp-nav a').forEach(a => {
          a.style.color = a.getAttribute('href') === '#' + entry.target.id ? '#2563eb' : '';
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => observer.observe(s));
  }

  /* ---------- Contact form (client-side demo) ---------- */

  const form = $('#lp-contact-form');
  const note = $('#lp-contact-note');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#ct-name').value.trim();
      const email = $('#ct-email').value.trim();
      const message = $('#ct-msg').value.trim();
      note.classList.remove('error');

      if (!name || !email || !message) {
        note.textContent = 'Please fill in your name, email and message.';
        note.classList.add('error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'Please enter a valid email address.';
        note.classList.add('error');
        return;
      }

      form.reset();
      note.textContent = 'Thanks! Your message has been received — we will reply within one business day.';
      showToast('Message sent — we will be in touch shortly.');
    });
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  /* ---------- Misc ---------- */

  const year = $('#lp-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const sessionReady = resolveSession();
})();
