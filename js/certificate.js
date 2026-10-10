/* ============================================================
   TRINOVA — CERTIFICATE PAGE CONTROLLER
   Load → render → view / download / print
   ============================================================ */

(function () {
  let actor = null;
  let currentCert = null;

  const $ = (id) => document.getElementById(id);

  const A4_W = (297 * 96) / 25.4; // 1122.5px — A4 landscape width
  const A4_H = (210 * 96) / 25.4; // 793.7px  — A4 landscape height

  /* Format elapsed seconds as HH:MM:SS (matches the in-app HUD timer) */
  function formatDuration(totalSeconds) {
    if (totalSeconds == null || totalSeconds === '') return '—';
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  /* Fit the certificate content inside the fixed A4 sheet, then scale the
     whole sheet so it stays fully visible in the viewer (and lightbox). */
  function fitA4Certificate() {
    const wrap = $('cert-wrap');
    const paper = $('cert-paper');
    const inner = paper && paper.querySelector('.cert-border-outer');
    if (!wrap || wrap.hidden || !inner) return;

    const w0 = inner.offsetWidth;
    const h0 = inner.offsetHeight;
    if (w0 > 0 && h0 > 0) {
      const s = Math.min((A4_W - 32) / w0, (A4_H - 32) / h0);
      const tx = (A4_W - w0 * s) / 2;
      const ty = (A4_H - h0 * s) / 2;
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    }

    const wrapTop = wrap.getBoundingClientRect().top + (window.scrollY || 0);
    // keep the sheet within both the viewport and the main column (max-width 1120px)
    const host = wrap.parentElement;
    let hostW = Infinity;
    if (host) {
      const hc = getComputedStyle(host);
      hostW = host.clientWidth - (parseFloat(hc.paddingLeft) || 0) - (parseFloat(hc.paddingRight) || 0);
    }
    const availW = Math.min(document.documentElement.clientWidth - 72, hostW);
    const availH = window.innerHeight - wrapTop - 48;
    const fit = Math.max(0.08, Math.min(1, availW / A4_W, availH / A4_H));

    document.documentElement.style.setProperty('--cert-fit', String(fit));
    wrap.style.width = `${A4_W * fit}px`;
    wrap.style.height = `${A4_H * fit}px`;

    const stage = $('cert-lightbox-stage');
    if (stage) {
      stage.style.width = `${A4_W * fit}px`;
      stage.style.height = `${A4_H * fit}px`;
      stage.style.maxWidth = 'none';
      stage.style.maxHeight = 'none';
    }
  }

  let fitRaf = 0;
  window.addEventListener('resize', () => {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(() => {
      fitRaf = 0;
      fitA4Certificate();
    });
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => fitA4Certificate()).catch(() => {});
  }

  function onAuth(cb) {
    if (window.CyberSafeAuth && window.CyberSafeAuth.user) {
      cb(window.CyberSafeAuth.user);
    } else {
      document.addEventListener('auth:ready', (e) => cb(e.detail), { once: true });
    }
  }

  onAuth(async (u) => {
    actor = u;
    $('chip-name').textContent = u.fullName || u.email;
    $('chip-role').textContent = u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin / CISO' : 'Employee';
    $('chip-role').className = 'chip-role ' + (u.role || 'employee');
    const av = String(u.avatar || '');
    if (av && !av.includes('/') && av.length <= 8) $('chip-avatar').textContent = av;

    $('btn-logout')?.addEventListener('click', () => window.CyberSafeAuth.logout());
    $('cert-year').textContent = String(new Date().getFullYear());

    $('btn-view-cert')?.addEventListener('click', openLightbox);
    $('btn-close-lightbox')?.addEventListener('click', closeLightbox);
    $('cert-lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'cert-lightbox' || e.target.id === 'cert-lightbox-stage') closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
    $('btn-print-cert')?.addEventListener('click', () => window.print());
    $('btn-download-cert')?.addEventListener('click', () => {
      showToast('Choose “Save as PDF” in the print dialog to download your certificate.');
      setTimeout(() => window.print(), 600);
    });

    await loadCertificate();
  });

  async function loadCertificate() {
    const certId = new URLSearchParams(window.location.search).get('id');

    try {
      const url = certId ? `/api/certificates/${encodeURIComponent(certId)}` : '/api/certificates';
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });

      if (res.status === 401) {
        window.CyberSafeAuth.guardResponse(res);
        return;
      }
      if (res.status === 403 || res.status === 404) {
        showState('denied');
        $('cert-denied-msg').textContent = res.status === 404
          ? 'That certificate does not exist. Check the certificate ID and try again.'
          : 'You can only view certificates belonging to your account.';
        return;
      }
      if (!res.ok) {
        showState('denied');
        $('cert-denied-msg').textContent = 'Something went wrong while loading this certificate.';
        return;
      }

      const data = await res.json();
      const list = certId ? [data.certificate] : (data.certificates || []);
      const cert = list
        .filter(Boolean)
        .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))[0];

      if (!cert) {
        showState('empty');
        return;
      }

      renderCertificate(cert);
    } catch (err) {
      showState('denied');
      $('cert-denied-msg').textContent = 'Server connection error. Please try again.';
    }
  }

  function showState(state) {
    $('cert-loading').hidden = true;
    $('cert-wrap').hidden = state !== 'ok';
    $('cert-empty').hidden = state !== 'empty';
    $('cert-denied').hidden = state !== 'denied';
    document.querySelector('.cert-actions').style.display = state === 'ok' ? '' : 'none';
    if (state !== 'ok') {
      $('cert-page-title').textContent = 'Certificate';
    }
  }

  function renderCertificate(cert) {
    currentCert = cert;
    showState('ok');

    $('cert-name').textContent = cert.userName || 'Certified Employee';
    $('cert-score').textContent = `${cert.score}%`;
    $('cert-date').textContent = cert.issueDate || '—';
    $('cert-duration').textContent = formatDuration(cert.durationSeconds);
    $('cert-status').textContent = cert.status === 'verified' ? 'Passed' : (cert.status || 'Passed');
    $('cert-id').textContent = cert.certificateNumber || cert.id || '—';
    $('cert-quiz-score').textContent = cert.quizScore || `${cert.score}%`;
    $('cert-hash').textContent = cert.verificationHash || '—';
    $('cert-org').textContent = cert.orgName || '—';

    const viewingOther = cert.userId && actor && cert.userId !== actor.id;
    $('cert-page-title').textContent = viewingOther
      ? `Certificate · ${cert.userName || 'Employee'}`
      : 'My Certificate';
    $('cert-page-sub').textContent = viewingOther
      ? `Viewing the Cyber Awareness 360 certificate issued to ${cert.userName || 'this employee'}.`
      : `Certificate ${cert.certificateNumber} · issued ${cert.issueDate} · score ${cert.score}%.`;

    document.title = `Certificate ${cert.certificateNumber} · Trinova`;

    fitA4Certificate();

    // "Download" deep link (?print=1) opens the print/save-as-PDF dialog
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      setTimeout(() => window.print(), 700);
    }
  }

  /* ---------- Distraction-free view ---------- */

  function openLightbox() {
    if (!currentCert) return;
    const stage = $('cert-lightbox-stage');
    stage.innerHTML = '';
    stage.appendChild($('cert-paper').cloneNode(true));
    
    const box = $('cert-lightbox');
    box.hidden = false;
    // Force reflow for animation
    void box.offsetWidth;
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const box = $('cert-lightbox');
    if (!box || box.hidden) return;
    
    box.classList.remove('open');
    setTimeout(() => {
      box.hidden = true;
      $('cert-lightbox-stage').innerHTML = ''; // Clean up DOM
      document.body.style.overflow = '';
    }, 200);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
  }
})();
