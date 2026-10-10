/* ============================================================
   SUPER ADMIN DASHBOARD — platform-wide users, roles, tenants
   ============================================================ */

(function () {
  let actor = null;

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
    document.getElementById('hero-sub').textContent =
      `Signed in as ${actor.fullName} · full access across all tenants, admins, employees, training and results.`;

    document.getElementById('btn-logout')?.addEventListener('click', () => window.CyberSafeAuth.logout());
    document.getElementById('form-create')?.addEventListener('submit', handleCreate);

    await Promise.all([loadPlatform(), loadUsers(), loadCertificates()]);
  });

  /* ---------- Certificates (all tenants) ---------- */

  async function loadCertificates() {
    const data = await guardedJson('/api/certificates?all=1');
    if (!data) return;
    const certs = data.certificates || [];
    const badge = document.getElementById('certs-badge');
    const tbody = document.getElementById('certs-tbody');
    if (badge) badge.textContent = String(certs.length);
    if (!tbody) return;

    if (!certs.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No certificates issued yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = certs.map(c => `
      <tr>
        <td><strong>${esc(c.certificateNumber)}</strong></td>
        <td>${esc(c.userName)}</td>
        <td>${esc(c.orgName)}</td>
        <td><strong>${esc(c.score)}%</strong></td>
        <td>${esc(c.issueDate)}</td>
        <td><span class="badge badge-ok">Verified</span></td>
        <td>
          <div class="table-actions">
            <a class="btn-xs primary" href="/certificate?id=${encodeURIComponent(c.id || c.certificateNumber)}">View</a>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /* ---------- Platform metrics ---------- */

  async function loadPlatform() {
    const data = await guardedJson('/api/superadmin/dashboard');
    if (!data) return;
    const m = data.platformMetrics || {};

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpi-orgs', m.totalOrgs);
    set('kpi-users', m.totalUsers);
    set('kpi-admins', m.totalAdmins);
    set('kpi-certs', m.totalCerts);
    set('kpi-campaigns', m.totalCampaigns);
    set('kpi-score', `${m.avgSecurityScore}%`);

    const tenants = data.tenants || [];
    document.getElementById('tenants-badge').textContent = `${tenants.length}`;
    document.getElementById('tenant-grid').innerHTML = tenants.length ? tenants.map(t => `
      <div class="tenant-card">
        <div class="t-name">${esc(t.name)}</div>
        <div class="t-meta">${esc(t.plan)} · 🌐 ${esc(t.domain)}</div>
        <div class="t-meta">🏭 ${esc(t.industry)}</div>
        <div class="t-stats">
          <span>👥 ${t.totalUsers} users</span>
          <span>🛡️ ${t.adminCount} admins</span>
          <span>🎓 ${t.certifiedCount} certified</span>
          <span>📋 ${t.activeCampaigns} campaigns</span>
        </div>
        <div style="margin-top:10px;">
          <div class="mini-bar"><span style="width:${t.securityScore}%"></span></div>
          <div class="muted" style="font-size:11.5px; margin-top:4px;">Security score ${t.securityScore}%</div>
        </div>
      </div>
    `).join('') : '<div class="empty-state">No tenants registered.</div>';

    const activity = data.recentActivity || [];
    document.getElementById('activity-list').innerHTML = activity.length ? activity.map(l => {
      const t = new Date(l.timestamp);
      return `
        <div class="activity-row">
          <span class="act-time">${t.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          <span class="act-badge ${l.severity === 'warning' ? 'warning' : l.severity === 'error' ? 'error' : 'info'}">${esc(l.severity)}</span>
          <span><strong>${esc(l.action)}</strong> ${esc(l.details)} <span class="muted">(${esc(l.userEmail)} · ${esc(l.orgName)})</span></span>
        </div>
      `;
    }).join('') : '<div class="empty-state">No recent activity.</div>';
  }

  /* ---------- User management ---------- */

  async function loadUsers() {
    const data = await guardedJson('/api/admin/users');
    if (!data) return;
    const users = data.users || [];
    document.getElementById('users-badge').textContent = `${users.length} users`;

    const tbody = document.getElementById('users-tbody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users found.</div></td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = u.id === actor.id;
      const isSuper = u.role === 'superadmin';
      const roleBadge = isSuper ? 'role-superadmin' : u.role === 'admin' ? 'role-admin' : 'role-employee';
      const statusBadge = u.status === 'disabled' ? 'badge-danger' : 'badge-ok';
      const statusLabel = u.status === 'disabled' ? 'Disabled' : 'Active';
      return `
        <tr>
          <td>
            <div class="cell-user">
              <span class="cell-avatar">${u.avatar && !String(u.avatar).includes('/') && String(u.avatar).length <= 8 ? u.avatar : '👤'}</span>
              <div>
                <div class="cell-name">${esc(u.fullName)}${isSelf ? ' <span class="badge badge-muted">you</span>' : ''}</div>
                <div class="cell-email">${esc(u.email)}</div>
              </div>
            </div>
          </td>
          <td>${esc(u.orgName)}</td>
          <td>
            ${isSuper ? `<span class="badge ${roleBadge}">Super Admin</span>` : `
              <select class="auth-input-select role-select" data-id="${u.id}" style="max-width:130px; padding:5px 8px; font-size:12px;">
                <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Employee</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            `}
          </td>
          <td style="min-width:110px;">
            <div class="mini-bar" style="margin-bottom:4px;"><span style="width:${Math.round((u.topicsCompleted / (u.totalTopics || 6)) * 100)}%"></span></div>
            <span class="muted" style="font-size:11.5px;">${u.topicsCompleted}/${u.totalTopics || 6} topics</span>
          </td>
          <td><strong>${u.lastScore === 'Not Taken' ? '—' : esc(u.lastScore)}</strong>${u.certified ? ' 🎓' : ''}</td>
          <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              ${isSelf || isSuper ? '' : `
                <button class="btn-xs ${u.status === 'disabled' ? '' : 'danger'}" data-act="status" data-id="${u.id}" data-status="${u.status === 'disabled' ? 'active' : 'disabled'}">
                  ${u.status === 'disabled' ? 'Enable' : 'Disable'}
                </button>
                <button class="btn-xs danger" data-act="delete" data-id="${u.id}">Delete</button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', () => changeRole(sel.dataset.id, sel.value));
    });
    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.act === 'status') changeStatus(btn.dataset.id, btn.dataset.status);
        if (btn.dataset.act === 'delete') removeUser(btn.dataset.id);
      });
    });
  }

  async function changeRole(userId, role) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (data.success) {
        showToast(`Role updated to ${role}. Their sessions were revoked.`);
        await loadUsers();
      } else {
        showToast(data.error || 'Could not change the role.');
        await loadUsers();
      }
    } catch (e) {
      showToast('Server connection error.');
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
    if (!window.confirm('Delete this account and all of its training data? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (data.success) {
        showToast('Account deleted.');
        await Promise.all([loadUsers(), loadPlatform()]);
      } else {
        showToast(data.error || 'Could not delete the account.');
      }
    } catch (e) {
      showToast('Server connection error.');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const errEl = document.getElementById('create-error-msg');
    const okEl = document.getElementById('create-success-msg');
    errEl.textContent = '';
    okEl.classList.remove('visible');

    const fullName = document.getElementById('ca-name').value.trim();
    const email = document.getElementById('ca-email').value.trim();
    const role = document.getElementById('ca-role').value;
    const department = document.getElementById('ca-dept').value;
    const password = document.getElementById('ca-password').value;

    if (!fullName || !email) {
      errEl.textContent = 'Full name and email are required.';
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, role, department, password: password || undefined })
      });
      if (window.CyberSafeAuth.guardResponse(res)) return;
      const data = await res.json();
      if (res.ok && data.success) {
        okEl.textContent = `✅ ${fullName} created as ${role === 'admin' ? 'an Admin' : 'an Employee'}.`;
        okEl.classList.add('visible');
        e.target.reset();
        await Promise.all([loadUsers(), loadPlatform()]);
      } else {
        errEl.textContent = data.error || 'Could not create the account.';
      }
    } catch (err) {
      errEl.textContent = 'Server connection error. Please try again.';
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
})();
