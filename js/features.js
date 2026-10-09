/* ============================================================
   CYBERSAFE 360° — NEW FEATURES MODULE
   Threat Intel Feed • Leaderboard • Invite Employee
   ============================================================ */

import { showToast, avatarMarkup } from './panels.js';

// Helper: read current user from localStorage (avoids circular import with b2b.js)
function getStoredUser() {
  try {
    const raw = localStorage.getItem('cybersafe_auth_user');
    return raw ? JSON.parse(raw) : { orgName: 'Acme CyberDefense Corp', orgId: 'org-acme' };
  } catch (e) {
    return { orgName: 'Acme CyberDefense Corp', orgId: 'org-acme' };
  }
}

// ============================================================
// THREAT INTELLIGENCE FEED
// ============================================================

const THREAT_FEED_DATA = [
  {
    severity: 'critical',
    title: 'Active Credential Stuffing Attack Detected',
    detail: 'Automated login attempts from 47 IPs targeting corporate SSO — 1,247 attempts in 8 minutes. IPs sourced from Shodan-indexed botnet infrastructure.',
    time: '2 min ago',
    type: 'attack'
  },
  {
    severity: 'critical',
    title: 'Ransomware Variant "BlackCat v3" — New Signature',
    detail: 'New ALPHV/BlackCat ransomware variant targeting Windows Server 2019 via unpatched SMB relay. MITRE ATT&CK: T1486 Data Encrypted for Impact.',
    time: '11 min ago',
    type: 'malware'
  },
  {
    severity: 'warning',
    title: 'CEO Impersonation Phishing Campaign Identified',
    detail: 'Spear-phishing emails spoofing executive identity targeting Finance and HR departments. Subject: "Urgent wire transfer approval required."',
    time: '18 min ago',
    type: 'phishing'
  },
  {
    severity: 'warning',
    title: 'SIM Swap Fraud Attempt — Executive Mobile Numbers',
    detail: 'Social engineering attempt on telecom carrier to hijack MFA-registered mobile numbers. Affected: 2 executive accounts, status: blocked.',
    time: '34 min ago',
    type: 'social_eng'
  },
  {
    severity: 'info',
    title: 'CVE-2026-41234 — Critical Log4j Variant Disclosed',
    detail: 'New critical RCE vulnerability in Apache Log4j 3.x affecting Java applications. CVSS Score: 9.8 CRITICAL. Patch: upgrade to 3.0.1 immediately.',
    time: '1 hr ago',
    type: 'vuln'
  },
  {
    severity: 'blocked',
    title: 'Malicious USB Drop Simulation Intercepted',
    detail: 'Physical security drill: 3 USB payloads deployed in parking lot intercepted by endpoint detection. Employees who connected devices were flagged for remedial training.',
    time: '2 hrs ago',
    type: 'physical'
  },
  {
    severity: 'blocked',
    title: 'Zero-Day Exploit Attempt Blocked by WAF',
    detail: 'SQL injection + XSS combined payload targeting internal HR portal blocked by Cloudflare WAF rules. Origin: AS13335 TOR exit node.',
    time: '3 hrs ago',
    type: 'waf'
  },
  {
    severity: 'info',
    title: 'CISA Alert: Volt Typhoon APT Campaign Update',
    detail: 'CISA advisory AA24-038A update — Volt Typhoon targeting critical infrastructure using living-off-the-land techniques. Review your PowerShell execution policies.',
    time: '5 hrs ago',
    type: 'apt'
  },
  {
    severity: 'warning',
    title: 'Insider Threat Indicator — Unusual Data Transfer',
    detail: 'User account "jd@company" transferred 4.2 GB to personal cloud storage outside business hours. DLP policy triggered. Account under review.',
    time: '6 hrs ago',
    type: 'insider'
  },
  {
    severity: 'blocked',
    title: 'Multi-Factor Authentication Bypass Attempt Blocked',
    detail: 'Adversary-in-the-middle phishing kit (EvilProxy) targeting MFA tokens. Real-time session cookie theft attempt blocked via FIDO2 hardware key enforcement.',
    time: '8 hrs ago',
    type: 'mfa'
  }
];

let threatFeedVisible = false;

export function initThreatIntel() {
  // Open Threat Intel button
  document.getElementById('btn-open-threat-intel')?.addEventListener('click', openThreatIntel);
  
  // Close buttons
  document.getElementById('btn-close-threat-x')?.addEventListener('click', closeThreatIntel);
  document.getElementById('btn-close-threat-bottom')?.addEventListener('click', closeThreatIntel);
  
  // Refresh button
  document.getElementById('btn-refresh-threat-feed')?.addEventListener('click', () => {
    refreshThreatFeed();
  });

  // Click backdrop to close
  document.getElementById('threat-intel-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('threat-intel-modal')) {
      closeThreatIntel();
    }
  });
}

function openThreatIntel() {
  const modal = document.getElementById('threat-intel-modal');
  if (!modal) return;
  modal.classList.add('visible');
  threatFeedVisible = true;
  renderThreatFeed();
  updateThreatTimestamp();
}

function closeThreatIntel() {
  document.getElementById('threat-intel-modal')?.classList.remove('visible');
  threatFeedVisible = false;
}

function renderThreatFeed() {
  const feed = document.getElementById('threat-intel-feed');
  if (!feed) return;

  // Animate in with stagger
  feed.innerHTML = THREAT_FEED_DATA.map((item, i) => `
    <div class="threat-feed-item ${item.severity}" style="animation-delay: ${i * 0.06}s">
      <span class="threat-feed-severity sev-${item.severity}">
        ${item.severity === 'critical' ? '🔴 CRITICAL' :
          item.severity === 'warning'  ? '🟡 WARNING'  :
          item.severity === 'blocked'  ? '🟢 BLOCKED'  : 'ℹ️ INFO'}
      </span>
      <div class="threat-feed-content">
        <div class="threat-feed-title">${item.title}</div>
        <div class="threat-feed-detail">${item.detail}</div>
      </div>
      <div class="threat-feed-time">${item.time}</div>
    </div>
  `).join('');
}

function refreshThreatFeed() {
  const feed = document.getElementById('threat-intel-feed');
  if (!feed) return;
  
  // Shuffle a couple of times to simulate fresh data
  const shuffled = [...THREAT_FEED_DATA].sort(() => Math.random() - 0.5);
  feed.innerHTML = shuffled.map((item, i) => `
    <div class="threat-feed-item ${item.severity}" style="animation-delay: ${i * 0.05}s">
      <span class="threat-feed-severity sev-${item.severity}">
        ${item.severity === 'critical' ? '🔴 CRITICAL' :
          item.severity === 'warning'  ? '🟡 WARNING'  :
          item.severity === 'blocked'  ? '🟢 BLOCKED'  : 'ℹ️ INFO'}
      </span>
      <div class="threat-feed-content">
        <div class="threat-feed-title">${item.title}</div>
        <div class="threat-feed-detail">${item.detail}</div>
      </div>
      <div class="threat-feed-time">${item.time}</div>
    </div>
  `).join('');

  updateThreatTimestamp();
  showToast('Threat feed refreshed with latest intelligence.');
}

function updateThreatTimestamp() {
  const el = document.getElementById('threat-last-updated');
  if (el) {
    const now = new Date();
    el.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }
}

// ============================================================
// LEADERBOARD (rendered inside B2B Dashboard)
// ============================================================

export function renderLeaderboard(dashboardData) {
  const container = document.getElementById('b2b-leaderboard-list');
  if (!container) return;

  const { employeeRoster } = dashboardData;
  if (!employeeRoster || !employeeRoster.length) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 12px 0;">No employee data available.</div>';
    return;
  }

  // Sort by score: certified first, then by topics completed
  const sorted = [...employeeRoster].sort((a, b) => {
    const scoreA = a.lastScore !== 'Not Taken' ? parseInt(a.lastScore) : 0;
    const scoreB = b.lastScore !== 'Not Taken' ? parseInt(b.lastScore) : 0;
    return scoreB - scoreA;
  });

  const rankEmojis = ['🥇', '🥈', '🥉'];

  container.innerHTML = sorted.map((emp, i) => {
    const isCertified = emp.status === 'Certified';
    const score = emp.lastScore !== 'Not Taken' ? emp.lastScore : `${emp.topicsCompleted}/${emp.totalTopics} Topics`;
    const rankClass = i < 3 ? `rank-${i + 1}` : '';
    const rankDisplay = i < 3 ? rankEmojis[i] : `#${i + 1}`;
    const badgeClass = isCertified ? 'lb-badge-cert' : 'lb-badge-progress';
    const badgeText = isCertified ? '✓ Certified' : emp.status;

    return `
      <div class="leaderboard-item ${rankClass}" style="animation-delay: ${i * 0.08}s">
        <div class="leaderboard-rank">${rankDisplay}</div>
        <div class="leaderboard-avatar">${avatarMarkup(emp.avatar, emp.fullName)}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${emp.fullName}</div>
          <div class="leaderboard-dept">${emp.department}</div>
        </div>
        <div class="leaderboard-score-wrap">
          <div class="leaderboard-score">${score}</div>
          <div class="leaderboard-score-label">${isCertified ? 'Assessment Score' : 'Progress'}</div>
        </div>
        <span class="leaderboard-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }).join('');
}

// ============================================================
// INVITE EMPLOYEE MODAL
// ============================================================

export function initInviteEmployee() {
  // Open from Leaderboard section
  document.getElementById('btn-invite-employee')?.addEventListener('click', openInviteModal);
  
  // Close buttons
  document.getElementById('btn-close-invite-x')?.addEventListener('click', closeInviteModal);
  document.getElementById('btn-close-invite-bottom')?.addEventListener('click', closeInviteModal);
  
  // Backdrop close
  document.getElementById('invite-employee-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('invite-employee-modal')) {
      closeInviteModal();
    }
  });

  // Form submission
  document.getElementById('form-invite-employee')?.addEventListener('submit', handleInviteEmployee);
}

function openInviteModal() {
  const modal = document.getElementById('invite-employee-modal');
  if (!modal) return;
  
  // Reset form
  document.getElementById('form-invite-employee')?.reset();
  const errEl = document.getElementById('invite-error-msg');
  const succEl = document.getElementById('invite-success-msg');
  if (errEl) errEl.textContent = '';
  if (succEl) { succEl.style.display = 'none'; succEl.textContent = ''; }
  
  modal.classList.add('visible');
}

function closeInviteModal() {
  document.getElementById('invite-employee-modal')?.classList.remove('visible');
}

async function handleInviteEmployee(e) {
  e.preventDefault();
  
  const fullName = document.getElementById('invite-fullname')?.value?.trim();
  const email    = document.getElementById('invite-email')?.value?.trim();
  const dept     = document.getElementById('invite-dept')?.value;

  const errEl  = document.getElementById('invite-error-msg');
  const succEl = document.getElementById('invite-success-msg');
  if (errEl) errEl.textContent = '';
  if (succEl) { succEl.style.display = 'none'; }

  if (!fullName || !email) {
    if (errEl) errEl.textContent = 'Full name and email are required.';
    return;
  }

  try {
    // Invited accounts are always Employees — role escalation is a Super Admin right
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        department: dept,
        role: 'employee'
      })
    });

    if (res.status === 401) { window.location.replace('./login.html'); return; }
    if (res.status === 403) {
      if (errEl) errEl.textContent = 'Admin access is required to invite employees.';
      return;
    }

    const data = await res.json();

    if (data.success) {
      if (succEl) {
        succEl.style.display = 'block';
        succEl.textContent = `✅ ${fullName} has been invited and enrolled in the active training campaign!`;
      }
      showToast(`✉️ Invitation sent to ${email}`);
      
      // Auto-close after 3s
      setTimeout(() => {
        closeInviteModal();
      }, 3000);
    } else {
      if (errEl) errEl.textContent = data.error || 'Failed to invite employee.';
    }
  } catch (err) {
    if (errEl) errEl.textContent = 'Network error — server unreachable. Please try again.';
  }
}
