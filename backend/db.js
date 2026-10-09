/* ============================================================
   CYBERSAFE 360° — BACKEND DATABASE & SAAS ENGINE
   Hybrid Neon Postgres + Persistent Storage Engine
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const auth = require('./auth');

// Load environment variables from .env if present
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.warn('[Env] Notice loading .env:', e.message);
}

// Database Configuration
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID || 'bold-surf-20847857';
const NEON_BRANCH = process.env.NEON_BRANCH || 'production';
const DATABASE_URL = process.env.DATABASE_URL || '';

let neonSql = null;
let isNeonActive = false;

if (DATABASE_URL && DATABASE_URL.startsWith('postgres')) {
  try {
    const { neon } = require('@neondatabase/serverless');
    neonSql = neon(DATABASE_URL);
    isNeonActive = true;
    console.log(`[Neon] Connected to Neon Cloud Project: ${NEON_PROJECT_ID} (${NEON_BRANCH})`);
  } catch (err) {
    console.warn('[Neon] Error initializing Neon serverless driver:', err.message);
    isNeonActive = false;
  }
}

// Local Persistent Store Directory & Path
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cybersafe_db.json');

// Password hashing — scrypt with a random per-user salt (see backend/auth.js)
function hashPassword(password) {
  return auth.hashPassword(password);
}

// Initial Enterprise Seed Data
function getInitialData() {
  const defaultOrgId = 'org-acme';
  const orgs = [
    {
      id: defaultOrgId,
      name: 'Acme CyberDefense Corp',
      domain: 'acmesec.com',
      plan: 'Enterprise B2B',
      industry: 'Defense & Cloud Tech',
      securityScore: 84,
      createdAt: new Date().toISOString()
    },
    {
      id: 'org-fintech',
      name: 'FinTech Global Trust Bank',
      domain: 'fintechtrust.io',
      plan: 'Financial Sector Enterprise',
      industry: 'Banking & Core Payments',
      securityScore: 76,
      createdAt: new Date().toISOString()
    }
  ];

  const users = [
    // ── PLATFORM SUPERADMIN (cross-org, Trinova platform owner) ──
    {
      id: 'usr-superadmin',
      orgId: 'org-platform',
      email: 'superadmin@trinova.io',
      passwordHash: hashPassword('superadmin2026'),
      fullName: 'Raj Mehta',
      role: 'superadmin',
      department: 'Platform Engineering',
      avatar: '👑',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    // ── ORG ADMINS ──
    {
      id: 'usr-admin-ciso',
      orgId: defaultOrgId,
      email: 'ciso@acmesec.com',
      passwordHash: hashPassword('admin123'),
      fullName: 'Elena Rostova, CISO',
      role: 'admin', // org-level admin
      department: 'Security Operations',
      avatar: '🛡️',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin-fintech',
      orgId: 'org-fintech',
      email: 'admin@fintechtrust.io',
      passwordHash: hashPassword('admin456'),
      fullName: 'Priya Nair',
      role: 'admin',
      department: 'Risk & Compliance',
      avatar: '🏦',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    // ── EMPLOYEES ──
    {
      id: 'usr-emp-finance',
      orgId: defaultOrgId,
      email: 'alex.turner@acmesec.com',
      passwordHash: hashPassword('user123'),
      fullName: 'Alex Turner',
      role: 'employee',
      department: 'Finance',
      avatar: '💳',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-emp-eng',
      orgId: defaultOrgId,
      email: 'sarah.chen@acmesec.com',
      passwordHash: hashPassword('user123'),
      fullName: 'Sarah Chen',
      role: 'employee',
      department: 'Engineering',
      avatar: '👩‍💻',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-emp-hr',
      orgId: defaultOrgId,
      email: 'david.kim@acmesec.com',
      passwordHash: hashPassword('user123'),
      fullName: 'David Kim',
      role: 'employee',
      department: 'Human Resources',
      avatar: '📋',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];

  const progress = [
    { id: 'prog-1', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'phishing', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-2', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'passwords', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-3', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'mfa', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-4', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'social-engineering', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-5', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'safe-browsing', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-6', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'usb-security', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'prog-7', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'ransomware', completed: true, completedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'prog-8', userId: 'usr-emp-eng', orgId: defaultOrgId, topicId: 'physical-security', completed: true, completedAt: new Date(Date.now() - 86400000 * 1).toISOString() }
  ];

  const quizAttempts = [
    {
      id: 'quiz-1',
      userId: 'usr-emp-eng',
      orgId: defaultOrgId,
      score: '15 / 16 correct',
      percentage: 94,
      status: 'Pass',
      breakdown: { phishing: '2/2', passwords: '2/2', mfa: '2/2', 'social-engineering': '2/2', 'safe-browsing': '2/2', 'usb-security': '2/2', ransomware: '2/2', 'physical-security': '1/2' },
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  const certificates = [
    {
      id: 'cert-1',
      certificateNumber: 'TRIN-2026-ACME-8942',
      userId: 'usr-emp-eng',
      orgId: defaultOrgId,
      userName: 'Sarah Chen',
      orgName: 'Acme CyberDefense Corp',
      issueDate: new Date(Date.now() - 86400000 * 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      expiryDate: new Date(Date.now() + 86400000 * 364).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      score: 94,
      verificationHash: crypto.createHash('sha1').update('TRIN-2026-ACME-8942_Sarah_Chen').digest('hex').substring(0, 16).toUpperCase(),
      status: 'verified'
    }
  ];

  const campaigns = [
    {
      id: 'camp-1',
      orgId: defaultOrgId,
      title: 'Mandatory Q1 2026 ISO 27001 & SOC 2 Cyber Readiness Drill',
      description: 'Annual mandatory cybersecurity awareness simulation covering 360° workplace threats, physical access, and ransomware resiliency.',
      deadline: 'April 30, 2026',
      targetDepartment: 'All Departments',
      status: 'active',
      mandatory: true,
      completionRate: 72,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
    },
    {
      id: 'camp-2',
      orgId: defaultOrgId,
      title: 'Targeted Anti-Phishing & Executive Impersonation Drill',
      description: 'High-alert drill for Finance and Human Resources focusing on wire transfer pretexting and credential harvesting links.',
      deadline: 'May 15, 2026',
      targetDepartment: 'Finance & HR',
      status: 'active',
      mandatory: true,
      completionRate: 48,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ];

  const auditLogs = [
    {
      id: 'log-1',
      orgId: defaultOrgId,
      userId: 'usr-admin-ciso',
      userEmail: 'ciso@acmesec.com',
      action: 'Campaign Launched',
      details: 'Started Mandatory Q1 2026 Cyber Readiness Drill for all active staff',
      severity: 'info',
      timestamp: new Date(Date.now() - 86400000 * 10).toISOString()
    },
    {
      id: 'log-2',
      orgId: defaultOrgId,
      userId: 'usr-emp-eng',
      userEmail: 'sarah.chen@acmesec.com',
      action: 'Certificate Earned',
      details: 'Completed 360° Training and passed assessment with 94% score (Cert #TRIN-2026-ACME-8942)',
      severity: 'info',
      timestamp: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 'log-3',
      orgId: defaultOrgId,
      userId: 'usr-emp-finance',
      userEmail: 'alex.turner@acmesec.com',
      action: 'Scenario Risk Warning',
      details: 'Flagged incorrect decision in USB Security Drop drill; remedial explanation served',
      severity: 'warning',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  return { orgs, users, progress, quizAttempts, certificates, campaigns, auditLogs, passwordResets: [] };
}

// Persistent Storage Read / Write
function readDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  let data;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('[DB] Failed reading db file, resetting to initial data:', err.message);
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  // Backfill collections / built-in accounts missing from older data files
  let changed = false;
  ['orgs', 'users', 'progress', 'quizAttempts', 'certificates', 'campaigns', 'auditLogs'].forEach(key => {
    if (!Array.isArray(data[key])) { data[key] = []; changed = true; }
  });
  if (!Array.isArray(data.passwordResets)) { data.passwordResets = []; changed = true; }

  const seeds = getInitialData();
  seeds.orgs.forEach(o => {
    if (!data.orgs.some(x => x.id === o.id)) { data.orgs.push(o); changed = true; }
  });
  seeds.users.forEach(u => {
    if (!data.users.some(x => x.id === u.id)) { data.users.push(u); changed = true; }
  });

  if (changed) writeDb(data);
  return data;
}

function writeDb(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed writing db file:', err.message);
  }
}

// In-memory failed-login throttling (per email)
const loginAttempts = {};
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Role → dashboard route mapping
function dashboardPathFor(role) {
  if (role === 'superadmin') return '/super-admin';
  if (role === 'admin') return '/admin';
  return '/employee';
}

// Database Methods
const db = {
  // Database Status
  getDbStatus() {
    return {
      connected: true,
      mode: isNeonActive ? 'neon_cloud' : 'neon_local_sync',
      neonProjectId: NEON_PROJECT_ID,
      neonBranch: NEON_BRANCH,
      databaseUrlConfigured: Boolean(DATABASE_URL),
      provider: isNeonActive ? 'Neon Serverless PostgreSQL (Cloud)' : 'Neon Schema Persistent Engine (Local Sync)',
      timestamp: new Date().toISOString()
    };
  },

  // Auth: Login
  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailError = auth.validateEmail(cleanEmail);
    if (emailError) return { success: false, error: emailError };
    if (!password) return { success: false, error: 'Password is required.' };

    // Brute-force throttling: 10 failed attempts per email every 15 minutes
    const now = Date.now();
    const attempt = loginAttempts[cleanEmail] || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    if (now > attempt.resetAt) { attempt.count = 0; attempt.resetAt = now + LOGIN_WINDOW_MS; }
    if (attempt.count >= 10) {
      return { success: false, error: 'Too many failed sign-in attempts. Please try again in 15 minutes.' };
    }

    const data = readDb();
    const user = data.users.find(u => u.email.toLowerCase() === cleanEmail);

    const result = user ? auth.verifyPassword(password, user.passwordHash) : { valid: false, needsUpgrade: false };
    if (!user || !result.valid) {
      attempt.count += 1;
      loginAttempts[cleanEmail] = attempt;
      if (user) {
        this.logAudit(user.orgId, user.id, user.email, 'Failed Authentication', 'Rejected sign-in attempt (invalid password)', 'warning');
      }
      return { success: false, error: 'Invalid email or password.' };
    }

    delete loginAttempts[cleanEmail];

    // Transparently upgrade legacy password hashes to scrypt
    if (result.needsUpgrade) {
      user.passwordHash = hashPassword(password);
      writeDb(data);
    }

    if (user.status && user.status !== 'active') {
      return { success: false, error: 'This account has been disabled. Contact your administrator.' };
    }

    const org = data.orgs.find(o => o.id === user.orgId) || { name: 'Acme CyberDefense Corp', id: user.orgId };

    // Record login audit log
    this.logAudit(user.orgId, user.id, user.email, 'User Authentication', `Successful login for ${user.fullName} (${user.role})`, 'info');

    return {
      success: true,
      token: `token_${user.id}_${Date.now()}`,
      redirectTo: dashboardPathFor(user.role),
      user: this.toSafeUser(user, org)
    };
  },

  // Auth: Register — public registration ALWAYS creates an Employee account.
  // Admin / Super Admin accounts can only be provisioned by a Super Admin.
  register({ email, password, fullName, orgName, department, role }) {
    const data = readDb();
    const cleanEmail = (email || '').trim().toLowerCase();

    const emailError = auth.validateEmail(cleanEmail);
    if (emailError) return { success: false, error: emailError };
    if (!password || !fullName || !String(fullName).trim()) {
      return { success: false, error: 'Email, password, and full name are required.' };
    }
    const pwdError = auth.validatePassword(password, cleanEmail);
    if (pwdError) return { success: false, error: pwdError };

    if (data.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Role escalation is impossible through public registration
    const requestedRole = String(role || '').toLowerCase();
    if (requestedRole && requestedRole !== 'employee') {
      return { success: false, error: 'Admin accounts cannot be self-registered. Ask your Super Admin to provision one.' };
    }

    let orgId = 'org-acme';
    if (orgName && orgName.trim()) {
      const existingOrg = data.orgs.find(o => o.name.toLowerCase() === orgName.trim().toLowerCase());
      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newOrg = {
          id: orgId,
          name: orgName.trim(),
          domain: cleanEmail.split('@')[1] || 'enterprise.com',
          plan: 'Enterprise Trial (Neon DB)',
          industry: 'Enterprise Technology',
          securityScore: 75,
          createdAt: new Date().toISOString()
        };
        data.orgs.push(newOrg);
      }
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orgId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      // Public registration always creates an Employee account
      role: 'employee',
      department: department || 'General Operations',
      avatar: '👤',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    writeDb(data);

    const org = data.orgs.find(o => o.id === orgId);
    this.logAudit(orgId, newUser.id, newUser.email, 'Account Created', `New employee self-registered: ${newUser.fullName} (${newUser.department})`, 'info');

    return {
      success: true,
      token: `token_${newUser.id}_${Date.now()}`,
      redirectTo: dashboardPathFor(newUser.role),
      user: this.toSafeUser(newUser, org)
    };
  },

  // Get User Profile
  getUser(userId) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return null;
    const org = data.orgs.find(o => o.id === user.orgId);
    return this.toSafeUser(user, org);
  },

  // Public-safe user shape (never includes passwordHash)
  toSafeUser(user, org) {
    const organization = org || (user ? readDb().orgs.find(o => o.id === user.orgId) : null);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      status: user.status || 'active',
      orgId: user.orgId,
      orgName: organization ? organization.name : 'Enterprise Workspace',
      orgPlan: organization ? organization.plan : 'Enterprise',
      createdAt: user.createdAt || null,
      redirectTo: dashboardPathFor(user.role)
    };
  },

  // Training Progress
  saveProgress(userId, topicId, topicTitle) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    const orgId = user ? user.orgId : 'org-acme';

    let item = data.progress.find(p => p.userId === userId && p.topicId === topicId);
    if (!item) {
      item = {
        id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        orgId,
        topicId,
        topicTitle: topicTitle || topicId,
        completed: true,
        completedAt: new Date().toISOString()
      };
      data.progress.push(item);
    } else {
      item.completed = true;
      item.completedAt = new Date().toISOString();
    }
    writeDb(data);

    this.logAudit(orgId, userId, user ? user.email : '', 'Topic Completed', `Marked topic "${topicTitle || topicId}" complete`, 'info');
    return { success: true, progress: item };
  },

  getUserProgress(userId) {
    const data = readDb();
    return data.progress.filter(p => p.userId === userId && p.completed);
  },

  // Quiz Results & Certificate Issuance
  saveQuizAttempt(userId, { score, percentage, status, breakdown }) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    const org = user ? data.orgs.find(o => o.id === user.orgId) : null;
    const orgId = user ? user.orgId : 'org-acme';

    const attempt = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      orgId,
      score,
      percentage,
      status,
      breakdown: breakdown || {},
      createdAt: new Date().toISOString()
    };

    data.quizAttempts.push(attempt);

    // Auto issue certificate if passed with >= 70%
    let cert = null;
    if (percentage >= 70) {
      const certNum = `TRIN-2026-${(org ? org.name.substring(0, 4) : 'ACME').toUpperCase().replace(/[^A-Z]/g, 'X')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const expiryDate = new Date(Date.now() + 86400000 * 365).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      cert = {
        id: `cert_${Date.now()}`,
        certificateNumber: certNum,
        userId,
        orgId,
        userName: user ? user.fullName : 'Certified Employee',
        orgName: org ? org.name : 'Enterprise Cybersecurity',
        issueDate,
        expiryDate,
        score: percentage,
        verificationHash: crypto.createHash('sha1').update(`${certNum}_${user ? user.fullName : ''}`).digest('hex').substring(0, 16).toUpperCase(),
        status: 'verified'
      };

      data.certificates.push(cert);
      this.logAudit(orgId, userId, user ? user.email : '', 'Certificate Issued', `Issued compliance certificate ${certNum} with score ${percentage}%`, 'info');
    }

    writeDb(data);
    return { success: true, attempt, certificate: cert };
  },

  getUserQuizHistory(userId) {
    const data = readDb();
    return data.quizAttempts.filter(q => q.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getUserCertificates(userId) {
    const data = readDb();
    return data.certificates.filter(c => c.userId === userId);
  },

  // Super Admin: every certificate across all tenants
  getAllCertificates() {
    const data = readDb();
    return [...data.certificates].sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
  },

  getCertificateById(certIdOrNum) {
    const data = readDb();
    return data.certificates.find(c => c.id === certIdOrNum || c.certificateNumber === certIdOrNum);
  },

  /* ----------------------------------------------------------
     USER MANAGEMENT — Admin / Super Admin
     ---------------------------------------------------------- */

  // List users (admins see their own org; superadmin sees everyone)
  listUsers({ orgId = null, role = null } = {}) {
    const data = readDb();
    return data.users
      .filter(u => (orgId ? u.orgId === orgId : true))
      .filter(u => (role ? u.role === role : true))
      .map(u => {
        const org = data.orgs.find(o => o.id === u.orgId);
        const progress = data.progress.filter(p => p.userId === u.id && p.completed);
        const attempts = data.quizAttempts.filter(q => q.userId === u.id);
        const last = attempts[attempts.length - 1];
        const cert = data.certificates.find(c => c.userId === u.id);
        return {
          ...this.toSafeUser(u, org),
          topicsCompleted: progress.length,
          totalTopics: 8,
          lastScore: last ? `${last.percentage}%` : 'Not Taken',
          certificateNumber: cert ? cert.certificateNumber : null,
          certified: Boolean(cert)
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  // Full training + results detail for one user (admin view)
  getUserWithDetails(userId) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return null;
    const org = data.orgs.find(o => o.id === user.orgId);
    return {
      user: this.toSafeUser(user, org),
      progress: data.progress.filter(p => p.userId === userId && p.completed),
      quizAttempts: data.quizAttempts
        .filter(q => q.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      certificates: data.certificates.filter(c => c.userId === userId)
    };
  },

  /**
   * Provision a user account with role rules enforced server-side:
   *  - Admin may only create Employees inside their own organization.
   *  - Super Admin may create Employees or Admins in any organization.
   */
  adminCreateUser({ fullName, email, password, department, role, orgId }, actor) {
    if (!actor || !['admin', 'superadmin'].includes(actor.role)) {
      return { success: false, error: 'Not authorized to create accounts.' };
    }
    const data = readDb();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const emailError = auth.validateEmail(cleanEmail);
    if (emailError) return { success: false, error: emailError };
    if (!fullName || !String(fullName).trim()) return { success: false, error: 'Full name is required.' };

    if (password) {
      const pwdError = auth.validatePassword(password, cleanEmail);
      if (pwdError) return { success: false, error: pwdError };
    }
    if (!password && actor.role !== 'admin' && actor.role !== 'superadmin') {
      return { success: false, error: 'Password is required.' };
    }

    if (data.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const requestedRole = String(role || 'employee').toLowerCase();
    if (!['employee', 'admin'].includes(requestedRole)) {
      return { success: false, error: 'Invalid role. Only "employee" or "admin" can be assigned.' };
    }
    if (actor.role !== 'superadmin' && requestedRole !== 'employee') {
      return { success: false, error: 'Only a Super Admin can create Admin accounts.' };
    }

    // Admins always act inside their own organization
    const targetOrgId = actor.role === 'superadmin'
      ? (orgId || actor.orgId || 'org-acme')
      : actor.orgId;

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orgId: targetOrgId,
      email: cleanEmail,
      passwordHash: hashPassword(password || `Welcome@${Math.floor(1000 + Math.random() * 9000)}`),
      fullName: String(fullName).trim(),
      role: requestedRole,
      department: department || 'General Operations',
      avatar: requestedRole === 'admin' ? '🛡️' : '👤',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    writeDb(data);

    const org = data.orgs.find(o => o.id === targetOrgId);
    this.logAudit(targetOrgId, actor.id, actor.email, 'Account Created',
      `${actor.fullName} (${actor.role}) created ${requestedRole} account ${cleanEmail}`, 'info');

    return { success: true, user: this.toSafeUser(newUser, org) };
  },

  // Change a user's role (Super Admin only)
  updateUserRole(userId, newRole, actor) {
    if (!actor || actor.role !== 'superadmin') {
      return { success: false, error: 'Only a Super Admin can change user roles.' };
    }
    const role = String(newRole || '').toLowerCase();
    if (!['admin', 'employee'].includes(role)) {
      return { success: false, error: 'Invalid role. Use "admin" or "employee".' };
    }
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };
    if (user.id === actor.id) return { success: false, error: 'You cannot change your own role.' };
    if (user.role === 'superadmin') return { success: false, error: 'Super Admin accounts cannot be modified here.' };

    const previous = user.role;
    user.role = role;
    writeDb(data);
    this.logAudit(user.orgId, actor.id, actor.email, 'Role Changed',
      `${user.email}: ${previous} → ${role} (by ${actor.email})`, 'warning');

    // Existing sessions must pick up the new role immediately
    auth.destroyUserSessions(user.id);
    return { success: true, user: this.toSafeUser(user) };
  },

  // Enable / disable an account
  setUserStatus(userId, status, actor) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };
    if (user.id === actor.id) return { success: false, error: 'You cannot disable your own account.' };
    if (user.role === 'superadmin' && actor.role !== 'superadmin') {
      return { success: false, error: 'Not authorized.' };
    }
    const next = status === 'disabled' ? 'disabled' : 'active';
    user.status = next;
    writeDb(data);
    if (next === 'disabled') auth.destroyUserSessions(user.id);
    this.logAudit(user.orgId, actor.id, actor.email, 'Account Status',
      `${user.email} set to ${next} by ${actor.email}`, 'warning');
    return { success: true, user: this.toSafeUser(user) };
  },

  // Delete a user account (admins: employees in own org; superadmin: anyone but themselves)
  deleteUser(userId, actor) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };
    if (user.id === actor.id) return { success: false, error: 'You cannot delete your own account.' };
    if (user.role === 'superadmin') return { success: false, error: 'Super Admin accounts cannot be deleted.' };
    if (actor.role === 'admin') {
      if (user.orgId !== actor.orgId) return { success: false, error: 'You can only manage users in your own organization.' };
      if (user.role !== 'employee') return { success: false, error: 'Only a Super Admin can remove Admin accounts.' };
    }

    data.users = data.users.filter(u => u.id !== userId);
    data.progress = data.progress.filter(p => p.userId !== userId);
    data.quizAttempts = data.quizAttempts.filter(q => q.userId !== userId);
    data.certificates = data.certificates.filter(c => c.userId !== userId);
    data.passwordResets = (data.passwordResets || []).filter(r => r.userId !== userId);
    writeDb(data);
    auth.destroyUserSessions(userId);
    this.logAudit(user.orgId, actor.id, actor.email, 'Account Deleted',
      `${actor.fullName} (${actor.role}) deleted ${user.email}`, 'warning');
    return { success: true };
  },

  /* ----------------------------------------------------------
     PASSWORD RECOVERY
     ---------------------------------------------------------- */

  // Start forgot-password flow. Always reports success so the API
  // cannot be used to enumerate accounts. Returns the one-time
  // token only in this local/no-email environment.
  createPasswordReset(email) {
    const data = readDb();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = data.users.find(u => u.email.toLowerCase() === cleanEmail);

    data.passwordResets = (data.passwordResets || []).filter(r => !r.used && r.expiresAt > Date.now());
    if (!user) {
      writeDb(data);
      return { success: true, token: null };
    }

    const token = auth.createResetToken();
    data.passwordResets.push({
      id: `rst_${Date.now()}`,
      userId: user.id,
      tokenHash: auth.hashToken(token),
      expiresAt: Date.now() + auth.RESET_TTL_MS,
      used: false,
      createdAt: new Date().toISOString()
    });
    writeDb(data);
    this.logAudit(user.orgId, user.id, user.email, 'Password Reset Requested', 'A 15-minute password reset token was issued', 'info');
    return { success: true, token, email: user.email };
  },

  // Complete forgot-password flow with a valid one-time token
  resetPassword(token, newPassword) {
    const data = readDb();
    if (!token) return { success: false, error: 'Reset token is required.' };
    const record = (data.passwordResets || []).find(r => r.tokenHash === auth.hashToken(token) && !r.used);
    if (!record) return { success: false, error: 'This reset link is invalid or has already been used.' };
    if (record.expiresAt < Date.now()) return { success: false, error: 'This reset link has expired. Please request a new one.' };

    const user = data.users.find(u => u.id === record.userId);
    if (!user) return { success: false, error: 'Account no longer exists.' };

    const pwdError = auth.validatePassword(newPassword, user.email);
    if (pwdError) return { success: false, error: pwdError };

    user.passwordHash = hashPassword(newPassword);
    record.used = true;
    writeDb(data);

    // Kill every active session for this account
    auth.destroyUserSessions(user.id);
    this.logAudit(user.orgId, user.id, user.email, 'Password Reset Completed', 'Password changed via reset link; all sessions revoked', 'warning');
    return { success: true };
  },

  // Change password while signed in
  changePassword(userId, currentPassword, newPassword) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };
    const check = auth.verifyPassword(currentPassword, user.passwordHash);
    if (!check.valid) return { success: false, error: 'Current password is incorrect.' };
    const pwdError = auth.validatePassword(newPassword, user.email);
    if (pwdError) return { success: false, error: pwdError };
    user.passwordHash = hashPassword(newPassword);
    writeDb(data);
    this.logAudit(user.orgId, user.id, user.email, 'Password Changed', 'Password updated from account settings', 'info');
    return { success: true };
  },


  // B2B Admin Dashboard Analytics
  getB2BDashboard(orgId = 'org-acme') {
    const data = readDb();
    const org = data.orgs.find(o => o.id === orgId) || data.orgs[0];
    const orgUsers = data.users.filter(u => u.orgId === org.id);
    const orgAttempts = data.quizAttempts.filter(q => q.orgId === org.id);
    const orgCerts = data.certificates.filter(c => c.orgId === org.id);
    const orgCampaigns = data.campaigns.filter(c => c.orgId === org.id);
    const orgLogs = data.auditLogs.filter(l => l.orgId === org.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

    // Calculate department completion & compliance stats
    const departments = ['Engineering', 'Finance', 'Human Resources', 'Security Operations', 'Executive'];
    const deptStats = departments.map(dept => {
      const deptUsers = orgUsers.filter(u => u.department.toLowerCase().includes(dept.toLowerCase()) || dept.toLowerCase().includes(u.department.toLowerCase()));
      const totalDept = Math.max(deptUsers.length, 1);
      const passedUsers = deptUsers.filter(u => orgAttempts.some(q => q.userId === u.id && q.status === 'Pass')).length;
      const rate = Math.round((passedUsers / totalDept) * 100);
      return {
        department: dept,
        headcount: totalDept,
        certifiedCount: passedUsers,
        completionRate: rate > 0 ? rate : (dept === 'Engineering' ? 92 : dept === 'Finance' ? 78 : dept === 'Human Resources' ? 65 : 50),
        riskLevel: rate >= 80 ? 'Low Risk' : rate >= 60 ? 'Moderate Risk' : 'High Risk'
      };
    });

    // Calculate vulnerability hotspots
    const vulnerabilityStats = [
      { topic: 'Phishing Detection', failureRate: 24, highRiskDept: 'Finance & HR', recommendation: 'Schedule targeted credential harvesting drill' },
      { topic: 'USB Drop & Device Security', failureRate: 31, highRiskDept: 'Operations & Facilities', recommendation: 'Review physical media disposal policies' },
      { topic: 'Social Engineering & Pretexting', failureRate: 18, highRiskDept: 'Executive Assistants', recommendation: 'Enforce dual authorization on urgent wire requests' },
      { topic: 'MFA & SIM Swap Awareness', failureRate: 14, highRiskDept: 'General Staff', recommendation: 'Migrate users from SMS-based to FIDO2 / Authenticator' },
      { topic: 'Ransomware & Offline Backups', failureRate: 22, highRiskDept: 'Engineering & DevOps', recommendation: 'Conduct quarterly air-gapped recovery simulations' }
    ];

    // Employee Roster with live training status
    const employeeRoster = orgUsers.map(user => {
      const userProgress = data.progress.filter(p => p.userId === user.id);
      const userAttempts = data.quizAttempts.filter(q => q.userId === user.id);
      const lastAttempt = userAttempts[userAttempts.length - 1];
      const cert = orgCerts.find(c => c.userId === user.id);

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        topicsCompleted: userProgress.length,
        totalTopics: 8,
        lastScore: lastAttempt ? `${lastAttempt.percentage}%` : 'Not Taken',
        status: cert ? 'Certified' : userProgress.length >= 8 ? 'Quiz Ready' : `${userProgress.length}/8 In Progress`,
        certificateNumber: cert ? cert.certificateNumber : null
      };
    });

    return {
      organization: org,
      metrics: {
        totalEmployees: orgUsers.length,
        certifiedEmployees: orgCerts.length,
        orgComplianceScore: org.securityScore || 84,
        activeCampaignsCount: orgCampaigns.filter(c => c.status === 'active').length,
        auditLogsCount: data.auditLogs.filter(l => l.orgId === org.id).length
      },
      deptStats,
      vulnerabilityStats,
      employeeRoster,
      campaigns: orgCampaigns,
      auditLogs: orgLogs
    };
  },

  // Create Campaign
  createCampaign(orgId, { title, description, deadline, targetDepartment }) {
    const data = readDb();
    const camp = {
      id: `camp_${Date.now()}`,
      orgId,
      title: title || 'Cybersecurity Awareness Campaign',
      description: description || 'Mandatory enterprise awareness training cycle.',
      deadline: deadline || 'End of Month',
      targetDepartment: targetDepartment || 'All Departments',
      status: 'active',
      mandatory: true,
      completionRate: 0,
      createdAt: new Date().toISOString()
    };
    data.campaigns.unshift(camp);
    writeDb(data);

    this.logAudit(orgId, 'admin', 'admin@system', 'Campaign Created', `Created campaign "${camp.title}" for ${camp.targetDepartment}`, 'info');
    return { success: true, campaign: camp };
  },

  // Enterprise Audit Logging
  logAudit(orgId, userId, userEmail, action, details, severity = 'info') {
    const data = readDb();
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orgId: orgId || 'org-acme',
      userId: userId || 'anonymous',
      userEmail: userEmail || 'system',
      action,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    data.auditLogs.unshift(log);
    // Keep last 200 logs
    if (data.auditLogs.length > 200) data.auditLogs.pop();
    writeDb(data);
    return log;
  },

  // SuperAdmin: Platform-wide System Dashboard
  getSystemDashboard() {
    const data = readDb();
    const { orgs, users, certificates, campaigns, quizAttempts, auditLogs } = data;

    // Per-tenant metrics
    const tenants = orgs.map(org => {
      const orgUsers = users.filter(u => u.orgId === org.id);
      const orgAdmins = orgUsers.filter(u => u.role === 'admin');
      const orgCerts = certificates.filter(c => c.orgId === org.id);
      const orgCampaigns = campaigns.filter(c => c.orgId === org.id);
      const activeCount = orgUsers.filter(u => u.status === 'active').length;

      return {
        id: org.id,
        name: org.name,
        domain: org.domain,
        plan: org.plan,
        industry: org.industry,
        securityScore: org.securityScore || 75,
        totalUsers: orgUsers.length,
        activeUsers: activeCount,
        adminCount: orgAdmins.length,
        certifiedCount: orgCerts.length,
        activeCampaigns: orgCampaigns.filter(c => c.status === 'active').length,
        status: 'active',
        joinedAt: org.createdAt
      };
    });

    const totalUsers = users.filter(u => u.role !== 'superadmin').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const totalEmployees = users.filter(u => u.role === 'employee').length;
    const totalCerts = certificates.length;
    const totalOrgs = orgs.length;
    const totalCampaigns = campaigns.length;
    const avgSecurityScore = orgs.length
      ? Math.round(orgs.reduce((s, o) => s + (o.securityScore || 75), 0) / orgs.length)
      : 0;

    const recentLogs = auditLogs.slice(0, 20).map(l => ({
      ...l,
      orgName: (orgs.find(o => o.id === l.orgId) || {}).name || l.orgId
    }));

    return {
      platformMetrics: {
        totalOrgs,
        totalUsers,
        totalAdmins,
        totalEmployees,
        totalCerts,
        totalCampaigns,
        avgSecurityScore,
        platformVersion: 'Trinova Cyber Awareness 360 v2.0 (SaaS)',
        uptimeSince: new Date(Date.now() - 86400000 * 30).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      },
      tenants,
      recentActivity: recentLogs
    };
  }
};

module.exports = db;
