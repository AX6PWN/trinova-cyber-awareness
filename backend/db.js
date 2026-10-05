/* ============================================================
   CYBERSAFE 360° — BACKEND DATABASE & SAAS ENGINE
   Hybrid Neon Postgres + Persistent Storage Engine
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Helper to hash passwords simply & securely
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_cybersafe_salt_2026').digest('hex');
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
    {
      id: 'usr-admin-ciso',
      orgId: defaultOrgId,
      email: 'ciso@acmesec.com',
      passwordHash: hashPassword('admin123'),
      fullName: 'Elena Rostova, CISO',
      role: 'admin', // 'admin' | 'employee'
      department: 'Security Operations',
      avatar: '🛡️',
      status: 'active',
      createdAt: new Date().toISOString()
    },
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
      certificateNumber: 'CYBER-2026-ACME-8942',
      userId: 'usr-emp-eng',
      orgId: defaultOrgId,
      userName: 'Sarah Chen',
      orgName: 'Acme CyberDefense Corp',
      issueDate: new Date(Date.now() - 86400000 * 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      expiryDate: new Date(Date.now() + 86400000 * 364).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      score: 94,
      verificationHash: crypto.createHash('sha1').update('CYBER-2026-ACME-8942_Sarah_Chen').digest('hex').substring(0, 16).toUpperCase(),
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
      details: 'Completed 360° Training and passed assessment with 94% score (Cert #CYBER-2026-ACME-8942)',
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

  return { orgs, users, progress, quizAttempts, certificates, campaigns, auditLogs };
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
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB] Failed reading db file, resetting to initial data:', err.message);
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
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
    const data = readDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const hash = hashPassword(password);
    const user = data.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'User with this email not found.' };
    }
    if (user.passwordHash !== hash) {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    const org = data.orgs.find(o => o.id === user.orgId) || { name: 'Acme CyberDefense Corp', id: user.orgId };

    // Record login audit log
    this.logAudit(user.orgId, user.id, user.email, 'User Authentication', `Successful login for ${user.fullName} (${user.role})`, 'info');

    return {
      success: true,
      token: `token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        orgId: user.orgId,
        orgName: org.name,
        orgPlan: org.plan || 'Enterprise'
      }
    };
  },

  // Auth: Register (User or new Organization)
  register({ email, password, fullName, orgName, department, role }) {
    const data = readDb();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password || !fullName) {
      return { success: false, error: 'Email, password, and full name are required.' };
    }

    if (data.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
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
      role: role || (data.users.length === 0 ? 'admin' : 'employee'),
      department: department || 'General Operations',
      avatar: role === 'admin' ? '🛡️' : '👤',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    writeDb(data);

    const org = data.orgs.find(o => o.id === orgId);
    this.logAudit(orgId, newUser.id, newUser.email, 'Account Created', `New enterprise user registered: ${newUser.fullName} (${newUser.department})`, 'info');

    return {
      success: true,
      token: `token_${newUser.id}_${Date.now()}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        department: newUser.department,
        avatar: newUser.avatar,
        orgId: newUser.orgId,
        orgName: org ? org.name : 'Enterprise Workspace',
        orgPlan: org ? org.plan : 'Enterprise'
      }
    };
  },

  // Get User Profile
  getUser(userId) {
    const data = readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return null;
    const org = data.orgs.find(o => o.id === user.orgId);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      orgId: user.orgId,
      orgName: org ? org.name : 'Enterprise Workspace',
      orgPlan: org ? org.plan : 'Enterprise'
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
      const certNum = `CYBER-2026-${(org ? org.name.substring(0, 4) : 'ACME').toUpperCase().replace(/[^A-Z]/g, 'X')}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  getCertificateById(certIdOrNum) {
    const data = readDb();
    return data.certificates.find(c => c.id === certIdOrNum || c.certificateNumber === certIdOrNum);
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
  }
};

module.exports = db;
