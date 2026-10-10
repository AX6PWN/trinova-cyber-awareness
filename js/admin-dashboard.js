/* ============================================================
   ADMIN DASHBOARD — employees, training results, audit trail
   ============================================================ */

(function () {
  let actor = null;
  let dashboardData = null;

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  async function guardedJson(url, options) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
    if (window.CyberSafeAuth.guardResponse(res)) return null;
    return res.json();
  }

  function onAuth(cb) {
    // auth:ready may have already fired before this script executed
    if (window.CyberSafeAuth && window.CyberSafeAuth.user) {
      cb(window.CyberSafeAuth.user);
    } else {
      document.addEventListener('auth:ready', (e) => cb(e.detail), { once: true });
    }
  }

  onAuth(async (a) => {
    actor = a;

    document.getElementById('chip-name').textContent = actor.fullName || actor.email;
    document.getElementById('chip-role').textContent = actor.role === 'superadmin' ? 'Super Admin' : 'Admin / CISO';
    document.getElementById('chip-role').className = 'chip-role ' + actor.role;
    const av = String(actor.avatar || '');
    if (av && !av.includes('/') && av.length <= 8) {
      document.getElementById('chip-avatar').textContent = av;
    }
    document.getElementById('hero-title').textContent = `${actor.orgName || 'Organization'} Compliance Hub`;
    document.getElementById('hero-sub').textContent =
      `Signed in as ${actor.fullName} · manage employees, training completion and results.`;

    if (actor.role === 'superadmin') {
      document.getElementById('nav-superadmin').style.display = '';
    }

    document.getElementById('btn-logout')?.addEventListener('click', () => window.CyberSafeAuth.logout());
    document.getElementById('btn-export-audit')?.addEventListener('click', exportAuditCsv);
    document.getElementById('form-invite')?.addEventListener('submit', handleInvite);
    document.getElementById('btn-close-detail-x')?.addEventListener('click', closeDetail);
    document.getElementById('btn-close-detail')?.addEventListener('click', closeDetail);
    document.getElementById('user-detail-modal')?.addEventListener('click', (ev) => {
      if (ev.target.id === 'user-detail-modal') closeDetail();
    });

    await Promise.all([loadDashboard(), loadUsers()]);
  });

  /* ---------- KPIs + audit ---------- */

  async function loadDashboard() {
    const data = await guardedJson('/api/b2b/dashboard');
    if (!data) return;
    dashboardData = data;

    document.getElementById('kpi-employees').textContent = data.metrics.totalEmployees;
    document.getElementById('kpi-certified').textContent = data.metrics.certifiedEmployees;
    document.getElementById('kpi-score').textContent = `${data.metrics.orgComplianceScore}%`;
    document.getElementById('kpi-campaigns').textContent = data.metrics.activeCampaignsCount;

    const logs = data.auditLogs || [];
    const list = document.getElementById('audit-list');
    if (!logs.length) {
      list.innerHTML = '<div class="empty-state">No audit entries yet.</div>';
      return;
    }
    list.innerHTML = logs.map(l => {
      const t = new Date(l.timestamp);
      return `
        <div class="activity-row">
          <span class="act-time">${t.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          <span class="act-badge ${l.severity === 'warning' ? 'warning' : l.severity === 'error' ? 'error' : 'info'}">${esc(l.severity)}</span>
          <span><strong>${esc(l.action)}</strong> ${esc(l.details)} <span class="muted">(${esc(l.userEmail)})</span></span>
        </div>
      `;
    }).join('');
  }

  /* ---------- Employee roster ---------- */

  async function loadUsers() {
    const data = await guardedJson('/api/admin/users');
    if (!data) return;
    const users = data.users || [];
    document.getElementById('roster-badge').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;

    const tbody = document.getElementById('users-tbody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users yet create your first employee.</div></td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'superadmin' ? 'role-superadmin' : u.role === 'admin' ? 'role-admin' : 'role-employee';
      const roleLabel = u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Employee';
      const statusBadge = u.status === 'disabled' ? 'badge-danger' : 'badge-ok';
      const statusLabel = u.status === 'disabled' ? 'Disabled' : 'Active';
      const score = u.lastScore === 'Not Taken' ? '—' : u.lastScore;
      const isSelf = u.id === actor.id;
      return `
        <tr>
          <td>
            <div class="cell-user">
              <span class="cell-avatar">${u.avatar && !String(u.avatar).includes('/') && String(u.avatar).length <= 8 ? u.avatar : '👤'}</span>
              <div>
                <div class="cell-name">${esc(u.fullName)}</div>
                <div class="cell-email">${esc(u.email)}</div>
              </div>
            </div>
          </td>
          <td>${esc(u.department)}</td>
          <td><span class="badge ${roleBadge}">${roleLabel}</span></td>
          <td style="min-width:120px;">
            <div class="mini-bar" style="margin-bottom:4px;"><span style="width:${Math.round((u.topicsCompleted / (u.totalTopics || 6)) * 100)}%"></span></div>
            <span class="muted" style="font-size:11.5px;">${u.topicsCompleted}/${u.totalTopics || 6} topics</span>
          </td>
          <td><strong>${esc(score)}</strong>${u.certified ? ' 🎓' : ''}</td>
          <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-xs" data-act="detail" data-id="${u.id}">Details</button>
              ${isSelf ? '' : `
                <button class="btn-xs ${u.status === 'disabled' ? '' : 'danger'}" data-act="status" data-id="${u.id}" data-status="${u.status === 'disabled' ? 'active' : 'disabled'}">
                  ${u.status === 'disabled' ? 'Enable' : 'Disable'}
                </button>
                <button class="btn-xs danger" data-act="delete" data-id="${u.id}">Remove</button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (btn.dataset.act === 'detail') openDetail(id);
        if (btn.dataset.act === 'status') changeStatus(id, btn.dataset.status);
        if (btn.dataset.act === 'delete') removeUser(id);
      });
    });
  }

  /* ---------- Detail modal ---------- */

  async function openDetail(userId) {
    const modal = document.getElementById('user-detail-modal');
    const body = document.getElementById('detail-body');
    modal.classList.add('visible');
    body.innerHTML = '<div class="empty-state">Loading…</div>';

    const data = await guardedJson(`/api/admin/users/${userId}`);
    if (!data) { modal.classList.remove('visible'); return; }

    const u = data.user;
    document.getElementById('detail-title').textContent = u.fullName;

    const progress = data.progress || [];
    const attempts = data.quizAttempts || [];
    const certs = data.certificates || [];

    body.innerHTML = `
      <div class="profile-grid" style="margin-bottom:16px;">
        <div><div class="p-label">Email</div><div class="p-value">${esc(u.email)}</div></div>
        <div><div class="p-label">Department</div><div class="p-value">${esc(u.department)}</div></div>
        <div><div class="p-label">Role</div><div class="p-value">${esc(u.role)}</div></div>
        <div><div class="p-label">Training progress</div><div class="p-value">${progress.length}/6 topics</div></div>
      </div>
      <div class="panel-title" style="border:0; padding-left:0; padding-right:0;">Quiz attempts</div>
      ${attempts.length ? attempts.map(a => `
        <div class="result-row" style="padding-left:0; padding-right:0;">
          <div>
            <div class="r-score">${a.percentage}% · ${esc(a.score)}</div>
            <div class="r-date">${new Date(a.createdAt).toLocaleString()}</div>
          </div>
          <span class="badge ${a.status === 'Pass' ? 'badge-ok' : 'badge-warn'}">${esc(a.status)}</span>
        </div>
      `).join('') : '<div class="empty-state">No quiz attempts yet.</div>'}
      <div class="panel-title" style="border:0; padding-left:0; padding-right:0; margin-top:8px;">Certificates</div>
      ${certs.length ? certs.map(c => `
        <div class="result-row" style="padding-left:0; padding-right:0;">
          <div>
            <div class="r-score">🎓 ${esc(c.certificateNumber)}</div>
            <div class="r-date">Issued ${esc(c.issueDate)} · Score ${c.score}%</div>
          </div>
          <div class="cert-row-actions">
            <span class="badge badge-ok">Verified</span>
            <a class="btn-xs primary" href="/certificate?id=${encodeURIComponent(c.id || c.certificateNumber)}">View</a>
          </div>
        </div>
      `).join('') : '<div class="empty-state">No certificates issued.</div>'}
    `;
  }

  function closeDetail() {
    document.getElementById('user-detail-modal')?.classList.remove('visible');
  }

  /* ---------- Actions ---------- */

  async function handleInvite(e) {
    e.preventDefault();
    const errEl = document.getElementById('invite-error-msg');
    const okEl = document.getElementById('invite-success-msg');
    errEl.textContent = '';
    okEl.classList.remove('visible');

    const fullName = document.getElementById('inv-name').value.trim();
    const email = document.getElementById('inv-email').value.trim();
    const department = document.getElementById('inv-dept').value;
    const password = document.getElementById('inv-password').value;

    if (!fullName || !email) {
      errEl.textContent = 'Full name and work email are required.';
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, department, password: password || undefined, role: 'employee' })
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (res.ok && data.success) {
        okEl.textContent = `✅ ${fullName} was created and enrolled as an Employee.`;
        okEl.classList.add('visible');
        e.target.reset();
        await Promise.all([loadUsers(), loadDashboard()]);
      } else {
        errEl.textContent = data.error || 'Could not create the account.';
      }
    } catch (err) {
      errEl.textContent = 'Server connection error. Please try again.';
    }
  }

  async function changeStatus(userId, status) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (data.success) {
        showToast(status === 'disabled' ? 'Account disabled and signed out.' : 'Account re-enabled.');
        await loadUsers();
      } else {
        showToast(data.error || 'Could not update the account.');
      }
    } catch (e) {
      showToast('Server connection error.');
    }
  }

  async function removeUser(userId) {
    if (!window.confirm('Remove this account and all of its training data? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (data.success) {
        showToast('Account removed.');
        await Promise.all([loadUsers(), loadDashboard()]);
      } else {
        showToast(data.error || 'Could not remove the account.');
      }
    } catch (e) {
      showToast('Server connection error.');
    }
  }

  function exportAuditCsv() {
    if (!dashboardData) { showToast('Audit data is still loading.'); return; }
    const rows = [['Timestamp', 'User', 'Severity', 'Action', 'Details']];
    (dashboardData.auditLogs || []).forEach(l => {
      rows.push([
        `"${l.timestamp}"`,
        `"${l.userEmail}"`,
        `"${l.severity}"`,
        `"${l.action}"`,
        `"${String(l.details || '').replace(/"/g, '""')}"`
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cybersafe_audit_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Audit report downloaded (CSV).');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
})();
