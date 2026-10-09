/* ============================================================
   EMPLOYEE DASHBOARD — own progress, results, profile
   ============================================================ */

(function () {
  const TOPICS = [
    { id: 'phishing', label: 'Phishing', icon: '✉️' },
    { id: 'passwords', label: 'Passwords', icon: '🔒' },
    { id: 'mfa', label: 'MFA', icon: '🛡️' },
    { id: 'social-engineering', label: 'Social Eng.', icon: '🎭' },
    { id: 'safe-browsing', label: 'Safe Browsing', icon: '🌐' },
    { id: 'usb-security', label: 'USB Security', icon: '🔌' },
    { id: 'ransomware', label: 'Ransomware', icon: '🗄️' },
    { id: 'physical-security', label: 'Physical Sec.', icon: '🪪' }
  ];

  let user = null;

  function onAuth(cb) {
    // auth:ready may have already fired before this script executed
    if (window.CyberSafeAuth && window.CyberSafeAuth.user) {
      cb(window.CyberSafeAuth.user);
    } else {
      document.addEventListener('auth:ready', (e) => cb(e.detail), { once: true });
    }
  }

  onAuth(async (u) => {
    user = u;
    renderProfile(user);
    document.getElementById('btn-logout')?.addEventListener('click', () => window.CyberSafeAuth.logout());
    await Promise.all([loadProgress(), loadResults(), loadCertificates()]);
    renderPath();
  });

  /* ---------- Guided training path ---------- */

  const state = { topics: 0, attempts: 0, passed: false, certs: 0 };

  function renderPath() {
    const total = TOPICS.length;
    const done = {
      1: state.topics > 0,
      2: state.topics > 0,
      3: state.topics >= total,
      4: state.passed,
      5: state.certs > 0
    };
    const current = [1, 2, 3, 4, 5].find(n => !done[n]) || null;

    [1, 2, 3, 4, 5].forEach(n => {
      const li = document.querySelector(`.path-step[data-step="${n}"]`);
      const badge = document.getElementById(`path-state-${n}`);
      if (!li || !badge) return;
      li.classList.toggle('done', done[n]);
      li.classList.toggle('active', n === current);
      badge.textContent = done[n] ? '✓ Done'
        : n === current ? (state.attempts > 0 && n === 4 ? 'Retake' : 'In progress')
        : n === 5 ? 'Locked' : 'Waiting';
    });

    document.getElementById('path-badge').textContent =
      current === null ? 'All steps complete 🎉' : `Step ${current} of 5`;

    const label = document.getElementById('start-training-label');
    if (label) label.textContent = state.topics > 0 ? 'Continue 360° Training' : 'Start 360° Training';
  }

  function renderProfile(u) {
    document.getElementById('chip-name').textContent = u.fullName || u.email;
    document.getElementById('chip-role').textContent = u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('chip-role').className = 'chip-role ' + (u.role || 'employee');
    const av = String(u.avatar || '');
    if (av && !av.includes('/') && av.length <= 8) {
      document.getElementById('chip-avatar').textContent = av;
    }

    document.getElementById('hero-title').textContent = `Welcome back, ${(u.fullName || '').split(' ')[0] || 'there'} 👋`;
    document.getElementById('hero-sub').textContent =
      `${u.orgName || 'Your workspace'} · ${u.department || 'General Operations'} · Complete the 360° training and pass the quiz to earn your certificate.`;

    document.getElementById('p-name').textContent = u.fullName || '—';
    document.getElementById('p-email').textContent = u.email || '—';
    document.getElementById('p-org').textContent = u.orgName || '—';
    document.getElementById('p-dept').textContent = u.department || '—';
    document.getElementById('p-role').textContent =
      u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin / CISO' : 'Employee';
    document.getElementById('p-status').textContent = u.status === 'disabled' ? 'Disabled' : 'Active';
    document.getElementById('profile-badge').textContent = u.orgPlan || 'Enterprise';
  }

  async function guardedJson(url, options) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
    if (window.CyberSafeAuth.guardResponse(res)) return null;
    return res.json();
  }

  async function loadProgress() {
    const data = await guardedJson('/api/training/progress');
    if (!data) return;
    const done = new Set((data.progress || []).map(p => p.topicId));
    const count = TOPICS.filter(t => done.has(t.id)).length;
    state.topics = count;

    document.getElementById('kpi-topics').textContent = `${count}/${TOPICS.length}`;
    document.getElementById('topics-badge').textContent = `${count} / ${TOPICS.length}`;
    document.getElementById('topics-bar').style.width = `${(count / TOPICS.length) * 100}%`;

    document.getElementById('topic-chips').innerHTML = TOPICS.map(t => `
      <span class="topic-chip ${done.has(t.id) ? 'done' : ''}">
        ${done.has(t.id) ? '✓' : t.icon} ${t.label}
      </span>
    `).join('');
  }

  async function loadResults() {
    const data = await guardedJson('/api/quiz/history');
    if (!data) return;
    const history = data.history || [];
    state.attempts = history.length;
    state.passed = history.some(h => h.status === 'Pass');
    document.getElementById('kpi-attempts').textContent = String(history.length);
    document.getElementById('results-badge').textContent = `${history.length} attempt${history.length === 1 ? '' : 's'}`;

    const best = history.reduce((max, h) => Math.max(max, Number(h.percentage) || 0), 0);
    document.getElementById('kpi-best').textContent = history.length ? `${best}%` : '—';

    const list = document.getElementById('results-list');
    if (!history.length) {
      list.innerHTML = '<div class="empty-state">No quiz attempts yet — finish the training to unlock the quiz.</div>';
      return;
    }
    list.innerHTML = history.map(h => {
      const pass = h.status === 'Pass';
      const date = new Date(h.createdAt).toLocaleString();
      return `
        <div class="result-row">
          <div>
            <div class="r-score">${h.percentage}% · ${pass ? 'Passed' : h.status}</div>
            <div class="r-date">${date} · ${h.score || ''}</div>
          </div>
          <span class="badge ${pass ? 'badge-ok' : 'badge-warn'}">${pass ? '✓ Passed' : 'Needs Review'}</span>
        </div>
      `;
    }).join('');
  }

  async function loadCertificates() {
    const data = await guardedJson('/api/certificates');
    if (!data) return;
    const certs = data.certificates || [];
    state.certs = certs.length;
    document.getElementById('kpi-cert').textContent = certs.length ? 'Earned' : 'Locked';
    document.getElementById('certs-badge').textContent = String(certs.length);

    const list = document.getElementById('certs-list');
    if (!certs.length) {
      list.innerHTML = '<div class="empty-state">Certificates are issued automatically when you score 70% or higher.</div>';
      return;
    }
    const newest = certs.slice().sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))[0];
    list.innerHTML = certs.map(c => `
      <div class="result-row">
        <div>
          <div class="r-score">🎓 ${c.certificateNumber}</div>
          <div class="r-date">Issued ${c.issueDate} · Expires ${c.expiryDate} · Score ${c.score}%</div>
        </div>
        <div class="cert-row-actions">
          <a class="btn-xs" href="/certificate?id=${encodeURIComponent(c.id || c.certificateNumber)}">View</a>
          <a class="btn-xs" href="/certificate?id=${encodeURIComponent(c.id || c.certificateNumber)}&print=1">Download</a>
        </div>
      </div>
    `).join('');

    const certLink = document.getElementById('path-cert-link');
    if (certLink) certLink.href = `/certificate?id=${encodeURIComponent(newest.id || newest.certificateNumber)}`;
  }
})();
