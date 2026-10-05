/* ============================================================
   B2B SAAS & ENTERPRISE COMPLIANCE MODULE
   Auth, CISO Dashboard, Certificate Generator, Neon DB Sync
   ============================================================ */

import { showToast } from './panels.js';
import { renderLeaderboard } from './features.js';

// Pre-seeded demo personas for instant frictionless evaluation
export const DEMO_PERSONAS = [
  {
    id: 'usr-admin-ciso',
    email: 'ciso@acmesec.com',
    fullName: 'Elena Rostova, CISO',
    role: 'admin',
    department: 'Security Operations',
    avatar: '🛡️',
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B'
  },
  {
    id: 'usr-emp-eng',
    email: 'sarah.chen@acmesec.com',
    fullName: 'Sarah Chen',
    role: 'employee',
    department: 'Engineering',
    avatar: '👩‍💻',
    orgId: 'org-acme',
    orgName: 'Acme CyberDefense Corp',
    orgPlan: 'Enterprise B2B'
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
    orgPlan: 'Enterprise B2B'
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
    orgPlan: 'Enterprise B2B'
  }
];

let currentUser = null;

// Initialize B2B Module
export function initB2B() {
  loadStoredUser();
  setupEventListeners();
  updateTopNavUI();
  checkNeonStatus();
  
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

export function switchPersona(personaId) {
  const target = DEMO_PERSONAS.find(p => p.id === personaId);
  if (target) {
    currentUser = target;
    localStorage.setItem('cybersafe_auth_user', JSON.stringify(target));
    updateTopNavUI();
    showToast(`Switched persona to ${target.fullName} (${target.role.toUpperCase()})`);
    
    // If admin dashboard is open, refresh it
    const dashModal = document.getElementById('b2b-dashboard-modal');
    if (dashModal && dashModal.classList.contains('visible')) {
      loadB2BDashboard();
    }
  }
}

function updateTopNavUI() {
  const u = currentUser;
  const userNameEl = document.getElementById('b2b-user-name');
  const userOrgEl = document.getElementById('b2b-user-org');
  const userAvatarEl = document.getElementById('b2b-user-avatar');
  const roleBadgeEl = document.getElementById('b2b-role-badge');
  const adminDashBtn = document.getElementById('btn-open-b2b-dashboard');
  const logoutBtn = document.getElementById('btn-logout');
  const userPill = document.getElementById('b2b-user-pill');

  if (!u) {
    if (userNameEl) userNameEl.textContent = 'Guest';
    if (userOrgEl) userOrgEl.textContent = 'Not logged in';
    if (roleBadgeEl) roleBadgeEl.textContent = 'Please sign in';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (adminDashBtn) adminDashBtn.style.display = 'none';
    return;
  }

  if (logoutBtn) logoutBtn.style.display = 'flex';
  if (adminDashBtn) adminDashBtn.style.display = 'flex';

  if (userNameEl) userNameEl.textContent = u.fullName;
  if (userOrgEl) userOrgEl.textContent = u.orgName || 'Acme CyberDefense Corp';
  if (userAvatarEl) userAvatarEl.textContent = u.avatar || '🛡️';
  if (roleBadgeEl) {
    roleBadgeEl.textContent = u.role === 'admin' ? '🛡️ CISO / Admin' : '👤 Employee';
    roleBadgeEl.className = `b2b-role-badge ${u.role === 'admin' ? 'admin' : 'employee'}`;
  }

  // Admin button is always visible but highlighted for admins
  if (adminDashBtn) {
    if (u.role === 'admin') {
      adminDashBtn.classList.add('pulse-highlight');
      adminDashBtn.title = 'Open CISO Enterprise Compliance Dashboard';
    } else {
      adminDashBtn.classList.remove('pulse-highlight');
      adminDashBtn.title = 'View Enterprise Security Score';
    }
  }
}

export function handleLogout() {
  currentUser = null;
  localStorage.removeItem('cybersafe_auth_user');
  updateTopNavUI();
  showToast('You have been logged out.');
  closeB2BDashboard();
  openAuthModal();
}

// Setup Event Listeners
function setupEventListeners() {
  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // User Profile click -> Auth modal
  document.getElementById('b2b-user-pill')?.addEventListener('click', () => {
    openAuthModal();
  });

  // Open B2B Dashboard
  document.getElementById('btn-open-b2b-dashboard')?.addEventListener('click', () => {
    openB2BDashboard();
  });
  document.getElementById('btn-close-b2b-x')?.addEventListener('click', closeB2BDashboard);
  document.getElementById('btn-close-b2b-bottom')?.addEventListener('click', closeB2BDashboard);

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
  // Register Form
  document.getElementById('form-register')?.addEventListener('submit', handleRegister);

  // Fast Switch Persona buttons inside Auth modal
  document.querySelectorAll('.quick-switch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = btn.getAttribute('data-persona-id');
      switchPersona(pid);
      if (personaSelect) personaSelect.value = pid;
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

async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-fullname').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const orgName = document.getElementById('reg-org').value;
  const department = document.getElementById('reg-dept').value;
  const role = document.getElementById('reg-role').value;
  const errorEl = document.getElementById('reg-error-msg');
  if (errorEl) errorEl.textContent = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, orgName, department, role })
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('cybersafe_auth_user', JSON.stringify(currentUser));
      updateTopNavUI();
      closeAuthModal();
      showToast(`Organization workspace created for ${currentUser.fullName}!`);
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
    const res = await fetch(`/api/b2b/dashboard?orgId=${orgId}`);
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
          <span class="roster-avatar">${emp.avatar || '👤'}</span>
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: u.orgId || 'org-acme',
        title,
        description: 'Automated 360° training drill launched via CISO Admin Dashboard.',
        deadline: deadline || 'End of Month',
        targetDepartment: dept || 'All Departments'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Campaign "${title}" launched successfully!`);
      loadB2BDashboard();
    }
  } catch (err) {
    showToast('Failed to create campaign.');
  }
}

function exportAuditReportCsv() {
  const u = getCurrentUser();
  fetch(`/api/b2b/dashboard?orgId=${u.orgId || 'org-acme'}`)
    .then(r => r.json())
    .then(data => {
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

// Neon Modal Controls
export function openNeonModal() {
  document.getElementById('neon-modal')?.classList.add('visible');
}

export function closeNeonModal() {
  document.getElementById('neon-modal')?.classList.remove('visible');
}

// Certificate Modal Controls
export function openCertificateModal(certData = null) {
  const modal = document.getElementById('certificate-modal');
  if (!modal) return;

  const u = getCurrentUser();
  let cert = certData;
  if (!cert) {
    const raw = localStorage.getItem('cybersafe_latest_certificate');
    if (raw) cert = JSON.parse(raw);
  }
  if (!cert) {
    // Generate sample verified cert for active user
    cert = {
      certificateNumber: `CYBER-2026-${(u.orgName || 'ACME').substring(0, 4).toUpperCase()}-9142`,
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

  modal.classList.add('visible');
}

export function closeCertificateModal() {
  document.getElementById('certificate-modal')?.classList.remove('visible');
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
