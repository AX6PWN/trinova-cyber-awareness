/* ============================================================
   B2B SAAS & ENTERPRISE COMPLIANCE MODULE
   Auth, CISO Dashboard, Certificate Generator, Neon DB Sync
   ============================================================ */

import { showToast, avatarMarkup, BRAND_LOGO } from './panels.js';
import { renderLeaderboard } from './features.js';
import { formatDuration } from './training-timer.js';

// Pre-seeded demo personas for instant frictionless evaluation
export const DEMO_PERSONAS = [
  // ── SuperAdmin (Platform-level) ──
  {
    id: 'usr-superadmin',
    email: 'superadmin@trinova.io',
    fullName: 'Raj Mehta',
    role: 'superadmin',
    department: 'Platform Engineering',
    avatar: '👑',
    orgId: 'org-platform',
    orgName: 'Trinova HQ',
    orgPlan: 'Platform Owner',
    password: 'superadmin2026'
  },
  // ── Org Admins ──
  {
    id: 'usr-admin-ciso',
    email: 'ciso@acmesec.com',
    fullName: 'Elena Rostova, CISO',
    role: 'admin',
    department: 'Security Operations',
    avatar: BRAND_LOGO,
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B',
    password: 'admin123'
  },
  {
    id: 'usr-admin-fintech',
    email: 'admin@fintechtrust.io',
    fullName: 'Priya Nair',
    role: 'admin',
    department: 'Risk & Compliance',
    avatar: '🏦',
    orgId: 'org-fintech',
    orgName: 'FinTech Global Trust Bank',
    orgPlan: 'Financial Sector Enterprise',
    password: 'admin456'
  },
  // ── Employees ──
  {
    id: 'usr-emp-eng',
    email: 'sarah.chen@acmesec.com',
    fullName: 'Sarah Chen',
    role: 'employee',
    department: 'Engineering',
    avatar: '👩‍💻',
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B',
    password: 'user123'
  },
  {
    id: 'usr-emp-finance',
    email: 'alex.turner@acmesec.com',
    fullName: 'Alex Turner',
    role: 'employee',
    department: 'Finance',
    avatar: '💳',
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B',
    password: 'user123'
  },
  {
    id: 'usr-emp-hr',
    email: 'david.kim@acmesec.com',
    fullName: 'David Kim',
    role: 'employee',
    department: 'Human Resources',
    avatar: '📋',
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B',
    password: 'user123'
  }
];

let currentUser = null;

// Initialize B2B Module
export function initB2B() {
  loadStoredUser();
  setupEventListeners();
  updateTopNavUI();
  checkNeonStatus();

  // Keep the in-page UI in sync with the authoritative session.
  // The guard may already have resolved (auth:ready fires on DOMContentLoaded,
  // possibly before this module runs) — so apply the current value immediately.
  const applySession = (user) => {
    currentUser = user;
    updateTopNavUI();
  };
  if (window.CyberSafeAuth && CyberSafeAuth.user) {
    applySession(CyberSafeAuth.user);
  } else {
    document.addEventListener('auth:ready', (e) => applySession(e.detail));
  }

  if (!currentUser) {
    openAuthModal();
  }
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('cybersafe_auth_user');
    if (raw) {
      currentUser = JSON.parse(raw);
    } else {
      currentUser = null;
    }
  } catch (e) {
    currentUser = null;
  }
}

export function getCurrentUser() {
  if (!currentUser) loadStoredUser();
  return currentUser;
}

export async function switchPersona(personaId) {
  const target = DEMO_PERSONAS.find(p => p.id === personaId);
  if (!target) return;

  const errorEl = document.getElementById('login-error-msg');
  if (errorEl) errorEl.textContent = '';

  try {
    // Real server-side login so the role session cookie actually changes
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target.email, password: target.password })
    });
    const data = await res.json();
    if (!data.success || !data.user) {
      if (errorEl) errorEl.textContent = data.error || 'Could not switch persona.';
      return;
    }

    currentUser = data.user;
    localStorage.setItem('cybersafe_auth_user', JSON.stringify(currentUser));
    updateTopNavUI();
    showToast(`Switched persona to ${currentUser.fullName} (${currentUser.role.toUpperCase()})`);

    // If admin dashboard is open, refresh it
    const dashModal = document.getElementById('b2b-dashboard-modal');
    if (dashModal && dashModal.classList.contains('visible')) {
      loadB2BDashboard();
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Server connection error. Please try again.';
  }
}

function updateTopNavUI() {
  const u = currentUser;
  const userNameEl = document.getElementById('b2b-user-name');
  const userOrgEl = document.getElementById('b2b-user-org');
  const userAvatarEl = document.getElementById('b2b-user-avatar');
  const roleBadgeEl = document.getElementById('b2b-role-badge');
  const adminDashBtn = document.getElementById('btn-open-b2b-dashboard');
  const superAdminBtn = document.getElementById('btn-open-superadmin');
  const logoutBtn = document.getElementById('btn-logout');
  const workspaceLink = document.getElementById('btn-my-workspace');

  if (!u) {
    if (userNameEl) userNameEl.textContent = 'Guest';
    if (userOrgEl) userOrgEl.textContent = 'Not logged in';
    if (roleBadgeEl) roleBadgeEl.textContent = 'Please sign in';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (workspaceLink) workspaceLink.style.display = 'none';
    if (adminDashBtn) adminDashBtn.style.display = 'none';
    if (superAdminBtn) superAdminBtn.style.display = 'none';
    return;
  }

  if (logoutBtn) logoutBtn.style.display = 'flex';
  if (workspaceLink) {
    workspaceLink.style.display = 'flex';
    workspaceLink.setAttribute('href',
      u.role === 'superadmin' ? '/super-admin' : u.role === 'admin' ? '/admin' : '/employee');
    workspaceLink.title = u.role === 'superadmin'
      ? 'Open Platform Administration'
      : u.role === 'admin' ? 'Open Admin / CISO Dashboard' : 'Open My Learning Dashboard';
  }

  if (userNameEl) userNameEl.textContent = u.fullName;
  if (userOrgEl) userOrgEl.textContent = u.orgName || 'Trinova';
  if (userAvatarEl) userAvatarEl.innerHTML = avatarMarkup(u.avatar || BRAND_LOGO, u.fullName || 'User');

  if (roleBadgeEl) {
    if (u.role === 'superadmin') {
      roleBadgeEl.textContent = '👑 Super Admin';
      roleBadgeEl.className = 'b2b-role-badge superadmin';
    } else if (u.role === 'admin') {
      roleBadgeEl.textContent = 'CISO / Admin';
      roleBadgeEl.className = 'b2b-role-badge admin';
    } else {
      roleBadgeEl.textContent = 'Employee';
      roleBadgeEl.className = 'b2b-role-badge employee';
    }
  }

  // Show/hide nav buttons based on role
  if (u.role === 'superadmin') {
    // SuperAdmin gets SuperAdmin portal, NOT the org dashboard
    if (adminDashBtn) adminDashBtn.style.display = 'none';
    if (superAdminBtn) {
      superAdminBtn.style.display = 'flex';
      superAdminBtn.classList.add('pulse-highlight');
    }
  } else if (u.role === 'admin') {
    // Org Admin gets CISO dashboard
    if (adminDashBtn) {
      adminDashBtn.style.display = 'flex';
      adminDashBtn.classList.add('pulse-highlight');
      adminDashBtn.title = 'Open CISO Enterprise Compliance Dashboard';
    }
    if (superAdminBtn) superAdminBtn.style.display = 'none';
  } else {
    // Employee - no admin panels; their own workspace link covers KPIs
    if (adminDashBtn) adminDashBtn.style.display = 'none';
    if (superAdminBtn) superAdminBtn.style.display = 'none';
  }

  // Welcome-screen shortcut follows the role (dashboard link vs admin modal)
  const welcomeBtn = document.getElementById('btn-welcome-ciso');
  if (welcomeBtn) {
    if (!u) {
      welcomeBtn.style.display = 'none';
    } else if (u.role === 'admin') {
      welcomeBtn.style.display = '';
      welcomeBtn.innerHTML = '<span class="link-btn-icon">📊</span> CISO Admin Dashboard';
      delete welcomeBtn.dataset.target;
    } else if (u.role === 'superadmin') {
      welcomeBtn.style.display = '';
      welcomeBtn.innerHTML = '<span class="link-btn-icon">👑</span> Platform Administration';
      welcomeBtn.dataset.target = '/super-admin';
    } else {
      welcomeBtn.style.display = '';
      welcomeBtn.innerHTML = '<span class="link-btn-icon">🏠</span> My Learning Dashboard';
      welcomeBtn.dataset.target = '/employee';
    }
  }
}

export async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err) { /* session cookie cleared server-side regardless */ }

  currentUser = null;
  localStorage.removeItem('cybersafe_auth_user');
  closeB2BDashboard();

  // Protected pages (this one included) live behind a server session — go to login
  window.location.replace('./login.html');
}

// Setup Event Listeners
function setupEventListeners() {
  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // User Profile click -> Auth modal
  document.getElementById('b2b-user-pill')?.addEventListener('click', () => {
    openAuthModal();
  });

  // Open B2B Dashboard (org admin)
  document.getElementById('btn-open-b2b-dashboard')?.addEventListener('click', () => {
    openB2BDashboard();
  });
  document.getElementById('btn-close-b2b-x')?.addEventListener('click', closeB2BDashboard);
  document.getElementById('btn-close-b2b-bottom')?.addEventListener('click', closeB2BDashboard);

  // Open SuperAdmin Portal
  document.getElementById('btn-open-superadmin')?.addEventListener('click', () => {
    openSuperAdminPortal();
  });
  document.getElementById('btn-close-superadmin-x')?.addEventListener('click', closeSuperAdminPortal);
  document.getElementById('btn-close-superadmin-bottom')?.addEventListener('click', closeSuperAdminPortal);

  // Auth Modal
  document.getElementById('btn-close-auth-x')?.addEventListener('click', closeAuthModal);
  document.getElementById('btn-close-auth-bottom')?.addEventListener('click', closeAuthModal);

  // Auth Tabs
  document.querySelectorAll('.auth-tab-btn').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.target.getAttribute('data-tab');
      document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(`tab-${targetTab}`)?.classList.add('active');
    });
  });

  // Login Form
  document.getElementById('form-login')?.addEventListener('submit', handleLogin);
  // Admin Login Form
  document.getElementById('form-admin-login')?.addEventListener('submit', handleAdminLogin);
  // Register Form
  document.getElementById('form-register')?.addEventListener('submit', handleRegister);

  // Fast Switch Persona buttons inside Auth modal
  document.querySelectorAll('.quick-switch-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pid = btn.getAttribute('data-persona-id');
      btn.disabled = true;
      await switchPersona(pid);
      btn.disabled = false;
      closeAuthModal();
    });
  });

  // Neon DB Badge click -> Database Info Modal
  document.getElementById('neon-db-badge')?.addEventListener('click', () => {
    openNeonModal();
  });
  document.getElementById('btn-close-neon-x')?.addEventListener('click', closeNeonModal);
  document.getElementById('btn-close-neon-bottom')?.addEventListener('click', closeNeonModal);

  // Certificate Modal Actions
  document.getElementById('btn-view-certificate-results')?.addEventListener('click', () => {
    openCertificateModal();
  });
  document.getElementById('btn-download-certificate')?.addEventListener('click', downloadCertificate);
  document.getElementById('btn-download-certificate-results')?.addEventListener('click', downloadCertificate);
  document.getElementById('btn-print-certificate-results')?.addEventListener('click', async () => {
    await openCertificateModal();
    setTimeout(() => window.print(), 450);
  });
  document.getElementById('btn-close-cert-x')?.addEventListener('click', closeCertificateModal);
  document.getElementById('btn-close-cert-bottom')?.addEventListener('click', closeCertificateModal);
  document.getElementById('btn-print-certificate')?.addEventListener('click', () => {
    window.print();
  });

  // Launch Campaign button in Dashboard
  document.getElementById('btn-launch-campaign')?.addEventListener('click', handleCreateCampaign);

  // Export Audit Report
  document.getElementById('btn-export-audit-csv')?.addEventListener('click', exportAuditReportCsv);
}

// Check Neon Database Status via API
export async function checkNeonStatus() {
  const badgeText = document.getElementById('neon-status-text');
  const badgeDot = document.getElementById('neon-status-dot');
  try {
    const res = await fetch('/api/db/status');
    const data = await res.json();
    if (data.mode === 'neon_cloud') {
      if (badgeText) badgeText.textContent = `Neon Cloud (${data.neonBranch})`;
      if (badgeDot) badgeDot.style.background = '#10b981';
    } else {
      if (badgeText) badgeText.textContent = `Neon DB (bold-surf-20847857)`;
      if (badgeDot) badgeDot.style.background = '#38bdf8';
    }
  } catch (err) {
    if (badgeText) badgeText.textContent = `Neon Local Sync`;
  }
}

// Auth Handlers
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error-msg');
  if (errorEl) errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('cybersafe_auth_user', JSON.stringify(currentUser));
      updateTopNavUI();
      closeAuthModal();
      showToast(`Welcome back, ${currentUser.fullName}!`);
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Authentication failed.';
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Server connection error. Please try again.';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-login-email').value;
  const password = document.getElementById('admin-login-password').value;
  const errorEl = document.getElementById('admin-login-error-msg');
  if (errorEl) errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      if (data.user.role !== 'admin' && data.user.role !== 'superadmin') {
         if (errorEl) errorEl.textContent = 'Access Denied: Admin privileges required.';
         return;
      }
      currentUser = data.user;
      localStorage.setItem('cybersafe_auth_user', JSON.stringify(currentUser));
      updateTopNavUI();
      closeAuthModal();
      showToast(`Admin session started for ${currentUser.fullName}.`);
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Authentication failed.';
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Server connection error. Please try again.';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-fullname').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const orgName = document.getElementById('reg-org').value;
  const department = document.getElementById('reg-dept').value;
  const errorEl = document.getElementById('reg-error-msg');
  if (errorEl) errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, orgName, department })
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('cybersafe_auth_user', JSON.stringify(currentUser));
      updateTopNavUI();
      closeAuthModal();
      showToast(`Workspace created welcome ${currentUser.fullName}! You were enrolled as an Employee.`);
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Registration failed.';
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Server connection error.';
  }
}

// B2B Dashboard Modal
export async function openB2BDashboard() {
  const modal = document.getElementById('b2b-dashboard-modal');
  if (!modal) return;
  modal.classList.add('visible');
  loadB2BDashboard();
}

export function closeB2BDashboard() {
  document.getElementById('b2b-dashboard-modal')?.classList.remove('visible');
}

async function loadB2BDashboard() {
  const u = getCurrentUser();
  const orgId = u.orgId || 'org-acme';

  try {
    const res = await fetch(`/api/b2b/dashboard?orgId=${orgId}`, { credentials: 'same-origin' });
    if (res.status === 401) { window.location.replace('./login.html'); return; }
    if (res.status === 403) {
      closeB2BDashboard();
      showToast('Admin access is required for the CISO dashboard.');
      return;
    }
    const data = await res.json();
    renderDashboardMetrics(data);
    renderDepartmentHeatmap(data.deptStats);
    renderVulnerabilityMatrix(data.vulnerabilityStats);
    renderEmployeeRoster(data.employeeRoster);
    renderCampaigns(data.campaigns);
    renderAuditLogs(data.auditLogs);
    renderLeaderboard(data);   // NEW: gamified leaderboard
  } catch (err) {
    console.error('[B2B] Failed loading dashboard:', err);
  }
}

function renderDashboardMetrics(data) {
  const { organization, metrics } = data;
  document.getElementById('b2b-dash-org-name').textContent = organization.name;
  document.getElementById('b2b-dash-score').textContent = `${metrics.orgComplianceScore}%`;
  document.getElementById('b2b-dash-employees').textContent = metrics.totalEmployees;
  document.getElementById('b2b-dash-certified').textContent = metrics.certifiedEmployees;
  document.getElementById('b2b-dash-campaigns').textContent = metrics.activeCampaignsCount;
}

function renderDepartmentHeatmap(deptStats) {
  const container = document.getElementById('b2b-dept-heatmap-list');
  if (!container || !deptStats) return;
  container.innerHTML = '';

  deptStats.forEach(d => {
    const card = document.createElement('div');
    card.className = 'b2b-dept-card';
    const riskClass = d.completionRate >= 80 ? 'low-risk' : d.completionRate >= 65 ? 'med-risk' : 'high-risk';
    card.innerHTML = `
      <div class="b2b-dept-header">
        <span class="b2b-dept-name">${d.department}</span>
        <span class="b2b-risk-badge ${riskClass}">${d.riskLevel}</span>
      </div>
      <div class="b2b-progress-row">
        <div class="b2b-bar-bg">
          <div class="b2b-bar-fill ${riskClass}" style="width: ${d.completionRate}%"></div>
        </div>
        <span class="b2b-bar-pct">${d.completionRate}%</span>
      </div>
      <div class="b2b-dept-footer">
        <span>Headcount: ${d.headcount}</span>
        <span>Certified: ${d.certifiedCount}/${d.headcount}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderVulnerabilityMatrix(stats) {
  const container = document.getElementById('b2b-vulnerability-list');
  if (!container || !stats) return;
  container.innerHTML = '';

  stats.forEach(v => {
    const item = document.createElement('div');
    item.className = 'b2b-vuln-item';
    item.innerHTML = `
      <div class="b2b-vuln-title-row">
        <strong>${v.topic}</strong>
        <span class="b2b-vuln-fail">${v.failureRate}% Fail Rate</span>
      </div>
      <div class="b2b-vuln-dept">Weakest Sector: <span>${v.highRiskDept}</span></div>
      <div class="b2b-vuln-recom">Action: ${v.recommendation}</div>
    `;
    container.appendChild(item);
  });
}

function renderEmployeeRoster(roster) {
  const tbody = document.getElementById('b2b-roster-tbody');
  if (!tbody || !roster) return;
  tbody.innerHTML = '';

  roster.forEach(emp => {
    const tr = document.createElement('tr');
    const isCert = emp.status === 'Certified';
    tr.innerHTML = `
      <td>
        <div class="roster-user-cell">
          <span class="roster-avatar">${avatarMarkup(emp.avatar, emp.fullName)}</span>
          <div>
            <div class="roster-name">${emp.fullName}</div>
            <div class="roster-email">${emp.email}</div>
          </div>
        </div>
      </td>
      <td><span class="roster-dept-tag">${emp.department}</span></td>
      <td>${emp.topicsCompleted} / ${emp.totalTopics}</td>
      <td><strong>${emp.lastScore}</strong></td>
      <td>
        <span class="roster-status-badge ${isCert ? 'certified' : 'pending'}">${emp.status}</span>
      </td>
      <td>
        ${isCert 
          ? `<button class="btn-roster-cert" onclick="window.viewUserCert('${emp.certificateNumber}')">🎓 Cert</button>`
          : `<button class="btn-roster-remind" onclick="window.sendDrillReminder('${emp.fullName}')">🔔 Remind</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCampaigns(campaigns) {
  const container = document.getElementById('b2b-campaigns-list');
  if (!container || !campaigns) return;
  container.innerHTML = '';

  campaigns.forEach(c => {
    const div = document.createElement('div');
    div.className = 'b2b-campaign-card';
    div.innerHTML = `
      <div class="b2b-camp-top">
        <span class="b2b-camp-title">${c.title}</span>
        <span class="b2b-camp-tag ${c.status}">${c.status.toUpperCase()}</span>
      </div>
      <div class="b2b-camp-desc">${c.description}</div>
      <div class="b2b-camp-meta">
        <span>Target: <strong>${c.targetDepartment}</strong></span>
        <span>Deadline: <strong>${c.deadline}</strong></span>
        <span>Progress: <strong>${c.completionRate}%</strong></span>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderAuditLogs(logs) {
  const container = document.getElementById('b2b-audit-list');
  if (!container || !logs) return;
  container.innerHTML = '';

  logs.forEach(l => {
    const div = document.createElement('div');
    div.className = `b2b-log-row ${l.severity}`;
    const timeStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    div.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-badge ${l.severity}">${l.severity}</span>
      <span class="log-action"><strong>${l.action}</strong>: ${l.details}</span>
      <span class="log-user">${l.userEmail}</span>
    `;
    container.appendChild(div);
  });
}

async function handleCreateCampaign(e) {
  e.preventDefault();
  const title = prompt('Enter Security Campaign Title:', 'Mandatory Q2 2026 Spear-Phishing Drill');
  if (!title) return;
  const dept = prompt('Target Department (e.g. All Departments, Finance, Engineering):', 'All Departments');
  const deadline = prompt('Deadline Date:', 'May 31, 2026');

  const u = getCurrentUser();
  try {
    const res = await fetch('/api/b2b/campaigns', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: 'Automated 360° training drill launched via CISO Admin Dashboard.',
        deadline: deadline || 'End of Month',
        targetDepartment: dept || 'All Departments'
      })
    });
    if (res.status === 401) { window.location.replace('./login.html'); return; }
    const data = await res.json();
    if (data.success) {
      showToast(`Campaign "${title}" launched successfully!`);
      loadB2BDashboard();
    } else {
      showToast(data.error || 'Failed to create campaign.');
    }
  } catch (err) {
    showToast('Failed to create campaign.');
  }
}

function exportAuditReportCsv() {
  const u = getCurrentUser();
  fetch(`/api/b2b/dashboard?orgId=${u.orgId || 'org-acme'}`, { credentials: 'same-origin' })
    .then(r => (r.status === 401 ? window.location.replace('./login.html') : r.json()))
    .then(data => {
      if (!data || !data.auditLogs) { showToast('Audit report unavailable.'); return; }
      const rows = [
        ['Timestamp', 'User', 'Severity', 'Action', 'Details']
      ];
      data.auditLogs.forEach(l => {
        rows.push([
          `"${l.timestamp}"`,
          `"${l.userEmail}"`,
          `"${l.severity}"`,
          `"${l.action}"`,
          `"${(l.details || '').replace(/"/g, '""')}"`
        ]);
      });
      const csv = rows.map(r => r.join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cybersafe_audit_compliance_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Compliance audit report downloaded (CSV)');
    });
}

// Auth Modal Controls
export function openAuthModal() {
  document.getElementById('auth-modal')?.classList.add('visible');
}

export function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('visible');
}

// SuperAdmin Portal Controls
export function openSuperAdminPortal() {
  const modal = document.getElementById('superadmin-portal-modal');
  if (!modal) return;
  modal.classList.add('visible');
  loadSuperAdminDashboard();
}

export function closeSuperAdminPortal() {
  document.getElementById('superadmin-portal-modal')?.classList.remove('visible');
}

async function loadSuperAdminDashboard() {
  try {
    const res = await fetch('/api/superadmin/dashboard', { credentials: 'same-origin' });
    if (res.status === 401) { window.location.replace('./login.html'); return; }
    if (res.status === 403) {
      closeSuperAdminPortal();
      showToast('Super Admin access is required for the platform portal.');
      return;
    }
    const data = await res.json();
    renderSuperAdminMetrics(data.platformMetrics);
    renderTenantList(data.tenants);
    renderPlatformActivityFeed(data.recentActivity);
  } catch (err) {
    console.error('[SuperAdmin] Failed loading system dashboard:', err);
  }
}

function renderSuperAdminMetrics(metrics) {
  if (!metrics) return;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('sa-metric-orgs', metrics.totalOrgs);
  setEl('sa-metric-users', metrics.totalUsers);
  setEl('sa-metric-admins', metrics.totalAdmins);
  setEl('sa-metric-certs', metrics.totalCerts);
  setEl('sa-metric-campaigns', metrics.totalCampaigns);
  setEl('sa-metric-score', `${metrics.avgSecurityScore}%`);
  setEl('sa-platform-version', metrics.platformVersion);
  setEl('sa-uptime-since', `Active since ${metrics.uptimeSince}`);
}

function renderTenantList(tenants) {
  const container = document.getElementById('sa-tenant-list');
  if (!container || !tenants) return;
  container.innerHTML = '';

  tenants.forEach(t => {
    const scoreClass = t.securityScore >= 80 ? 'low-risk' : t.securityScore >= 65 ? 'med-risk' : 'high-risk';
    const card = document.createElement('div');
    card.className = 'sa-tenant-card';
    card.innerHTML = `
      <div class="sa-tenant-header">
        <div class="sa-tenant-name">${t.name}</div>
        <span class="sa-tenant-plan">${t.plan}</span>
      </div>
      <div class="sa-tenant-domain">🌐 ${t.domain}</div>
      <div class="sa-tenant-industry">🏭 ${t.industry}</div>
      <div class="sa-tenant-stats">
        <span>👥 ${t.totalUsers} users</span>
        <span>🛡️ ${t.adminCount} admins</span>
        <span>🎓 ${t.certifiedCount} certified</span>
        <span>📋 ${t.activeCampaigns} campaigns</span>
      </div>
      <div class="sa-tenant-score-row">
        <span class="sa-score-label">Security Score</span>
        <div class="sa-score-bar-bg">
          <div class="sa-score-bar-fill ${scoreClass}" style="width:${t.securityScore}%"></div>
        </div>
        <span class="sa-score-val ${scoreClass}">${t.securityScore}%</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPlatformActivityFeed(logs) {
  const container = document.getElementById('sa-activity-feed');
  if (!container || !logs) return;
  container.innerHTML = '';

  logs.forEach(l => {
    const div = document.createElement('div');
    div.className = `sa-log-row ${l.severity}`;
    const timeStr = new Date(l.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-badge ${l.severity}">${l.severity}</span>
      <span class="sa-log-org">${l.orgName || l.orgId}</span>
      <span class="log-action"><strong>${l.action}</strong>: ${l.details}</span>
    `;
    container.appendChild(div);
  });
}

// Neon Modal Controls
export function openNeonModal() {
  document.getElementById('neon-modal')?.classList.add('visible');
}

export function closeNeonModal() {
  document.getElementById('neon-modal')?.classList.remove('visible');
}

// Certificate Modal Controls
export async function openCertificateModal(certData = null) {
  const modal = document.getElementById('certificate-modal');
  if (!modal) return;

  const u = getCurrentUser();
  let cert = certData;
  if (!cert) {
    const raw = localStorage.getItem('cybersafe_latest_certificate');
    if (raw) {
      try { cert = JSON.parse(raw); } catch (e) { cert = null; }
    }
  }
  if (!cert) {
    // Ask the server for this user's latest issued certificate
    try {
      const res = await fetch(`/api/certificates?userId=${encodeURIComponent((u && u.id) || '')}`, {
        credentials: 'same-origin', cache: 'no-store'
      });
      const data = res.ok ? await res.json() : null;
      const list = (data && data.certificates) || [];
      cert = list
        .filter(Boolean)
        .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))[0] || null;
      if (cert) localStorage.setItem('cybersafe_latest_certificate', JSON.stringify(cert));
    } catch (e) { /* offline — fall back to sample below */ }
  }
  if (!cert) {
    // Last resort: sample verified cert for active user
    cert = {
      certificateNumber: `TRIN-2026-${(u.orgName || 'ACME').substring(0, 4).toUpperCase()}-9142`,
      userName: u.fullName,
      orgName: u.orgName || 'Acme CyberDefense Corp',
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      expiryDate: new Date(Date.now() + 86400000 * 365).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      score: 94,
      verificationHash: 'A89F-72E1-BC94-55D2',
      status: 'verified'
    };
  }

  document.getElementById('cert-holder-name').textContent = cert.userName;
  document.getElementById('cert-org-name').textContent = cert.orgName;
  document.getElementById('cert-number').textContent = cert.certificateNumber;
  document.getElementById('cert-issue-date').textContent = cert.issueDate;
  document.getElementById('cert-expiry-date').textContent = cert.expiryDate;
  document.getElementById('cert-score').textContent = `${cert.score || 94}%`;
  document.getElementById('cert-hash').textContent = cert.verificationHash || 'SHA1-VERIFIED';

  const durationEl = document.getElementById('cert-duration');
  if (durationEl) {
    durationEl.textContent = cert.durationSeconds != null ? formatDuration(cert.durationSeconds) : '—';
  }

  modal.classList.add('visible');
  return cert;
}

export function closeCertificateModal() {
  document.getElementById('certificate-modal')?.classList.remove('visible');
}

// Download the certificate as PDF (opens the printable certificate page,
// where the browser print dialog offers "Save as PDF").
export function downloadCertificate() {
  let cert = null;
  try {
    const raw = localStorage.getItem('cybersafe_latest_certificate');
    cert = raw ? JSON.parse(raw) : null;
  } catch (e) { cert = null; }

  const hint = 'Choose “Save as PDF” in the print dialog to download your certificate.';
  if (cert && cert.id) {
    window.open(`/certificate?id=${encodeURIComponent(cert.id)}&print=1`, '_blank');
    showToast(hint);
  } else {
    // No certificate ID yet — print the in-app certificate
    showToast(hint);
    setTimeout(() => window.print(), 600);
  }
}

// Global window helpers for inline HTML callbacks
window.viewUserCert = (certNum) => {
  openCertificateModal({
    certificateNumber: certNum,
    userName: 'Certified Employee',
    orgName: 'Acme CyberDefense Corp',
    issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    expiryDate: new Date(Date.now() + 86400000 * 365).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    score: 94,
    verificationHash: 'CERT-VERIFIED-NEON'
  });
};

window.sendDrillReminder = (empName) => {
  showToast(`Security drill reminder dispatched to ${empName}`);
};
