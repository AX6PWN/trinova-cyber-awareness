/* ============================================================
   CYBERSAFE 360° — AUTHENTICATION CORE
   Password hashing (scrypt) • Server-side sessions • Guards
   ============================================================ */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = 'cs_session';
const LEGACY_SALT = '_cybersafe_salt_2026';
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

/* ------------------------------------------------------------
   PASSWORD HASHING
   Stored format: scrypt$<salt-hex>$<hash-hex>
   Legacy format (sha256 + static salt) is still verified and
   transparently upgraded to scrypt on the next successful login.
   ------------------------------------------------------------ */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, SCRYPT_PARAMS).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return { valid: false, needsUpgrade: false };

  // Current format
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return { valid: false, needsUpgrade: false };
    const candidate = crypto.scryptSync(String(password), salt, KEYLEN, SCRYPT_PARAMS);
    const expected = Buffer.from(hash, 'hex');
    const valid = candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    return { valid, needsUpgrade: false };
  }

  // Legacy format: sha256(password + static salt)
  const legacy = crypto.createHash('sha256').update(String(password) + LEGACY_SALT).digest('hex');
  const valid = legacy === stored;
  return { valid, needsUpgrade: valid };
}

/* ------------------------------------------------------------
   PASSWORD VALIDATION (enforced on register / reset / change)
   ------------------------------------------------------------ */

function validatePassword(password, email) {
  const pwd = String(password || '');
  if (pwd.length < 8) return 'Password must be at least 8 characters long.';
  if (pwd.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(pwd)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one symbol (!@#$/&*...).';
  if (email && pwd.toLowerCase() === String(email).trim().toLowerCase()) {
    return 'Password cannot be the same as your email address.';
  }
  if (/^(password|12345678|qwerty|letmein|welcome)/i.test(pwd)) {
    return 'Password is too common. Please choose something less predictable.';
  }
  return null;
}

function validateEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return 'Please enter a valid email address.';
  if (clean.length > 254) return 'Email address is too long.';
  return null;
}

/* ------------------------------------------------------------
   SERVER-SIDE SESSION STORE (file-backed, cookie delivered)
   ------------------------------------------------------------ */

let sessions = null;

function loadSessions() {
  if (sessions) return sessions;
  sessions = {};
  try {
    if (fs.existsSync(SESSION_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) || {};
    }
  } catch (err) {
    console.warn('[Auth] Failed reading session store, starting fresh:', err.message);
    sessions = {};
  }
  pruneSessions();
  return sessions;
}

function saveSessions() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('[Auth] Failed writing session store:', err.message);
  }
}

function pruneSessions() {
  const now = Date.now();
  let dirty = false;
  Object.keys(sessions || {}).forEach(sid => {
    if (!sessions[sid] || sessions[sid].expiresAt < now) {
      delete sessions[sid];
      dirty = true;
    }
  });
  return dirty;
}

function createSession(user) {
  const store = loadSessions();
  const sid = crypto.randomBytes(32).toString('hex');
  store[sid] = {
    userId: user.id,
    role: user.role,
    orgId: user.orgId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  saveSessions();
  return sid;
}

function getSession(sid) {
  if (!sid) return null;
  const store = loadSessions();
  const session = store[sid];
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    delete store[sid];
    saveSessions();
    return null;
  }
  return { sid, ...session };
}

function destroySession(sid) {
  if (!sid) return false;
  const store = loadSessions();
  if (!store[sid]) return false;
  delete store[sid];
  saveSessions();
  return true;
}

function destroyUserSessions(userId) {
  const store = loadSessions();
  let removed = 0;
  Object.keys(store).forEach(sid => {
    if (store[sid].userId === userId) {
      delete store[sid];
      removed++;
    }
  });
  if (removed) saveSessions();
  return removed;
}

/* ------------------------------------------------------------
   COOKIES
   ------------------------------------------------------------ */

function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  const jar = {};
  if (!header) return jar;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) jar[k] = decodeURIComponent(v);
  });
  return jar;
}

function extractSid(req) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const authHeader = req.headers && req.headers.authorization;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  return null;
}

function buildSessionCookie(sid, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sid)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`
  ];
  if (process.env.COOKIE_SECURE === 'true') parts.push('Secure');
  return parts.join('; ');
}

function clearCookie() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.COOKIE_SECURE === 'true') parts.push('Secure');
  return parts.join('; ');
}

/* ------------------------------------------------------------
   REQUEST GUARDS
   ------------------------------------------------------------ */

/**
 * Resolve the authenticated user for a request.
 * Populates req.session + req.authUser (full db record) when valid.
 */
function attachSession(req) {
  req.session = null;
  req.authUser = null;
  const sid = extractSid(req);
  const session = getSession(sid);
  if (!session) return null;
  req.session = session;
  return session;
}

/** Returns true when the request carries a valid session. */
function isAuthenticated(req) {
  return Boolean(req.session);
}

/** Returns true when the session role is one of the allowed roles. */
function hasRole(req, roles) {
  if (!req.session) return false;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.includes(req.session.role);
}

/* ------------------------------------------------------------
   PASSWORD RESET TOKENS (stored in the database file)
   ------------------------------------------------------------ */

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

function createResetToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  createSession,
  getSession,
  destroySession,
  destroyUserSessions,
  parseCookies,
  extractSid,
  buildSessionCookie,
  clearCookie,
  attachSession,
  isAuthenticated,
  hasRole,
  createResetToken,
  hashToken,
  RESET_TTL_MS,
  COOKIE_NAME
};
