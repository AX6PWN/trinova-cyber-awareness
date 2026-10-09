/* ============================================================
   CYBERSAFE 360° — B2B SAAS BACKEND & HTTP SERVER
   Hybrid Neon Postgres + Static Server
   Role-based route protection: superadmin / admin / employee
   ============================================================ */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./backend/db');
const auth = require('./backend/auth');

// Warehouse GLB is hosted on Cloudflare R2; proxied through the server to avoid CORS
const WAREHOUSE_GLB_URL = 'https://pub-e993468365744434bd90a486983e2131.r2.dev/automated_warehouse_-.glb';

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ------------------------------------------------------------
// PAGE ROUTES
// ------------------------------------------------------------

// Open pages — served to everyone (signed-in users keep their session)
const OPEN_PAGES = {
  '/': 'landing.html',
  '/landing': 'landing.html',
  '/landing.html': 'landing.html',  // .html alias (GitHub Pages nav compat)
  '/index.html': 'landing.html'     // index.html now IS the landing page
};

// Public pages — signed-in users are bounced to their dashboard
const PUBLIC_PAGES = {
  '/login': 'login.html',
  '/login.html': 'login.html',
  '/register': 'register.html',
  '/register.html': 'register.html',
  '/forgot-password': 'forgot-password.html',
  '/forgot-password.html': 'forgot-password.html'
};

// Protected pages — require a valid session
const PROTECTED_PAGES = {
  '/training': 'training.html',       // training.html is now the 360° app
  '/training.html': 'training.html',
  '/certificate': 'certificate.html',
  '/certificate.html': 'certificate.html',
  '/employee': 'employee.html',
  '/employee.html': 'employee.html',
  '/admin': 'admin.html',
  '/admin.html': 'admin.html',
  '/super-admin': 'super-admin.html',
  '/super-admin.html': 'super-admin.html'
};

// Role allow-list per page (enforced server-side, not in the UI)
const PAGE_ROLES = {
  '/employee': ['employee', 'admin', 'superadmin'],
  '/employee.html': ['employee', 'admin', 'superadmin'],
  '/admin': ['admin', 'superadmin'],
  '/admin.html': ['admin', 'superadmin'],
  '/super-admin': ['superadmin'],
  '/super-admin.html': ['superadmin']
};

function dashboardFor(role) {
  if (role === 'superadmin') return '/super-admin';
  if (role === 'admin') return '/admin';
  return '/employee';
}

// Only page routes and API calls need a session lookup. Static assets
// (/css, /js, /assets) are served without touching the session store,
// so the shared Neon lookup runs once per navigation instead of per file.
function needsSession(pathname) {
  return pathname.startsWith('/api/') ||
    Boolean(OPEN_PAGES[pathname] || PUBLIC_PAGES[pathname] || PROTECTED_PAGES[pathname]);
}

// Static asset directories that are safe to serve without a session
const PUBLIC_STATIC_DIRS = ['/css/', '/js/', '/assets/'];

// ------------------------------------------------------------
// WAREHOUSE GLB PROXY
// Streams the 103 MB model from Cloudflare R2 through the server.
// This avoids all browser CORS restrictions — the browser sees a
// same-origin request to /assets/warehouse.glb.
// ------------------------------------------------------------

function handleWarehouseProxy(res) {
  https.get(WAREHOUSE_GLB_URL, (r2res) => {
    if (r2res.statusCode !== 200) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Upstream error: ${r2res.statusCode}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'public, max-age=86400',   // cache 24 h in CDN/browser
      'Access-Control-Allow-Origin': '*'
    });
    r2res.pipe(res);
    r2res.on('error', (err) => {
      console.error('[Proxy] R2 stream error:', err.message);
      res.end();
    });
  }).on('error', (err) => {
    console.error('[Proxy] R2 fetch error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Failed to fetch model from upstream');
  });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function redirect(res, location, status = 302) {
  res.writeHead(status, {
    'Location': location,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  });
  res.end();
}

function serveFile(res, filePath, contentType, { noStore = false } = {}) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': noStore ? 'no-store, no-cache, must-revalidate' : 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/** Resolve the authenticated user record (or null when gone/disabled). */
function currentUser(req) {
  if (req.authUser) return req.authUser;
  if (!req.session) return null;
  const user = db.getUser(req.session.userId);
  // Stale session pointing at a deleted or disabled account = not signed in
  if (!user || user.status === 'disabled') return null;
  req.authUser = user;
  return user;
}

const canManage = (req) => auth.hasRole(req, ['admin', 'superadmin']);
const isSuperAdmin = (req) => auth.hasRole(req, 'superadmin');

// ------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------

async function handleApi(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const actor = currentUser(req);

  try {
    /* ---------- Public auth routes ---------- */

    // Database Status (public — used by the login screen badge)
    if (pathname === '/api/db/status' && method === 'GET') {
      return sendJson(res, 200, db.getDbStatus());
    }

    // Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = db.login(body.email, body.password);
      if (!result.success) return sendJson(res, 401, result);

      let sid;
      try {
        sid = await auth.createSession({ id: result.user.id, role: result.user.role, orgId: result.user.orgId });
      } catch (sessionErr) {
        console.error('[Auth] createSession failed during login:', sessionErr && sessionErr.name, sessionErr && sessionErr.message);
        return sendJson(res, 503, {
          success: false,
          error: 'Session service is temporarily unavailable. Please try again in a moment.',
          retryable: true
        });
      }
      return sendJson(res, 200, result, { 'Set-Cookie': auth.buildSessionCookie(sid, 7 * 24 * 3600) });
    }

    // Register (public → always an Employee account)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = db.register(body);
      if (!result.success) return sendJson(res, 400, result);

      let sid;
      try {
        sid = await auth.createSession({ id: result.user.id, role: result.user.role, orgId: result.user.orgId });
      } catch (sessionErr) {
        console.error('[Auth] createSession failed during register:', sessionErr && sessionErr.name, sessionErr && sessionErr.message);
        return sendJson(res, 503, {
          success: false,
          error: 'Session service is temporarily unavailable. Your account was created — please try signing in again in a moment.',
          retryable: true
        });
      }
      return sendJson(res, 201, result, { 'Set-Cookie': auth.buildSessionCookie(sid, 7 * 24 * 3600) });
    }

    // Logout — destroys the server session AND clears the cookie
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const sid = auth.extractSid(req);
      await auth.destroySession(sid);
      return sendJson(res, 200, { success: true }, { 'Set-Cookie': auth.clearCookie() });
    }

    // Current session
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!actor) return sendJson(res, 401, { error: 'Authentication required' });
      return sendJson(res, 200, { user: actor });
    }

    // Forgot password
    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const body = await parseJsonBody(req);
      const emailError = auth.validateEmail(body.email);
      if (emailError) return sendJson(res, 400, { success: false, error: emailError });

      const result = db.createPasswordReset(body.email);
      const payload = { success: true, message: 'If that email exists, a reset link has been issued.' };
      // This prototype has no mail server: expose the one-time link for local use.
      if (result.token) payload.resetUrl = `/forgot-password?token=${result.token}`;
      return sendJson(res, 200, payload);
    }

    // Reset password
    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await db.resetPassword(body.token, body.password);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 200, { success: true, message: 'Password updated. Please sign in.' });
    }

    // Change password (signed in)
    if (pathname === '/api/auth/change-password' && method === 'POST') {
      if (!actor) return sendJson(res, 401, { error: 'Authentication required' });
      const body = await parseJsonBody(req);
      const result = db.changePassword(actor.id, body.currentPassword, body.newPassword);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    }

    /* ---------- Authenticated routes below ---------- */

    if (!actor) {
      return sendJson(res, 401, { error: 'Authentication required', redirectTo: '/login' });
    }

    // B2B SaaS Dashboard (Admin / Super Admin only)
    if (pathname === '/api/b2b/dashboard' && method === 'GET') {
      if (!canManage(req)) {
        return sendJson(res, 403, { error: 'Admin access required', redirectTo: dashboardFor(actor.role) });
      }
      // Admins can only ever read their own organization
      const orgId = actor.role === 'superadmin'
        ? (parsedUrl.searchParams.get('orgId') || actor.orgId)
        : actor.orgId;
      return sendJson(res, 200, db.getB2BDashboard(orgId));
    }

    // SuperAdmin: Platform System Dashboard
    if (pathname === '/api/superadmin/dashboard' && method === 'GET') {
      if (!isSuperAdmin(req)) {
        return sendJson(res, 403, { error: 'Super Admin access required', redirectTo: dashboardFor(actor.role) });
      }
      return sendJson(res, 200, db.getSystemDashboard());
    }

    // B2B Create Campaign (Admin / Super Admin)
    if (pathname === '/api/b2b/campaigns' && method === 'POST') {
      if (!canManage(req)) {
        return sendJson(res, 403, { error: 'Admin access required', redirectTo: dashboardFor(actor.role) });
      }
      const body = await parseJsonBody(req);
      const orgId = actor.role === 'superadmin' ? (body.orgId || actor.orgId) : actor.orgId;
      return sendJson(res, 201, db.createCampaign(orgId, body));
    }

    /* ---------- User management (Admin / Super Admin) ---------- */

    if (pathname === '/api/admin/users' && method === 'GET') {
      if (!canManage(req)) return sendJson(res, 403, { error: 'Admin access required' });
      const users = db.listUsers({ orgId: actor.role === 'superadmin' ? null : actor.orgId });
      return sendJson(res, 200, { users });
    }

    if (pathname === '/api/admin/users' && method === 'POST') {
      if (!canManage(req)) return sendJson(res, 403, { error: 'Admin access required' });
      const body = await parseJsonBody(req);
      const result = db.adminCreateUser(body, actor);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 201, result);
    }

    const userDetailMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userDetailMatch && method === 'GET') {
      if (!canManage(req)) return sendJson(res, 403, { error: 'Admin access required' });
      const detail = db.getUserWithDetails(userDetailMatch[1]);
      if (!detail) return sendJson(res, 404, { error: 'User not found' });
      if (actor.role !== 'superadmin' && detail.user.orgId !== actor.orgId) {
        return sendJson(res, 403, { error: 'You can only view users in your own organization' });
      }
      return sendJson(res, 200, detail);
    }

    const roleMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
    if (roleMatch && method === 'PUT') {
      if (!isSuperAdmin(req)) {
        return sendJson(res, 403, { error: 'Only a Super Admin can change roles', redirectTo: dashboardFor(actor.role) });
      }
      const body = await parseJsonBody(req);
      const result = await db.updateUserRole(roleMatch[1], body.role, actor);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    }

    const statusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && method === 'PUT') {
      if (!canManage(req)) return sendJson(res, 403, { error: 'Admin access required' });
      const body = await parseJsonBody(req);
      const target = db.getUser(statusMatch[1]);
      if (!target) return sendJson(res, 404, { error: 'User not found' });
      if (actor.role !== 'superadmin' && (target.orgId !== actor.orgId || target.role !== 'employee')) {
        return sendJson(res, 403, { error: 'You can only manage employees in your own organization' });
      }
      const result = await db.setUserStatus(statusMatch[1], body.status, actor);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    }

    const deleteMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (!canManage(req)) return sendJson(res, 403, { error: 'Admin access required' });
      const result = await db.deleteUser(deleteMatch[1], actor);
      if (!result.success) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    }

    /* ---------- Training / quiz (self-scoped for employees) ---------- */

    // Training Progress: Get
    if (pathname === '/api/training/progress' && method === 'GET') {
      const requested = parsedUrl.searchParams.get('userId');
      const userId = canManage(req) && requested ? requested : actor.id;
      return sendJson(res, 200, { progress: db.getUserProgress(userId), userId });
    }

    // Training Progress: Complete Topic (always recorded for the session user)
    if (pathname === '/api/training/complete-topic' && method === 'POST') {
      const body = await parseJsonBody(req);
      const topicId = body.topicId;
      if (!topicId) return sendJson(res, 400, { error: 'topicId is required' });
      const result = db.saveProgress(actor.id, topicId, body.topicTitle);
      return sendJson(res, 200, result);
    }

    // Quiz: Submit Attempt & Auto-Issue Certificate (always for the session user)
    if (pathname === '/api/quiz/submit' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = db.saveQuizAttempt(actor.id, {
        score: body.score,
        percentage: body.percentage,
        status: body.status,
        breakdown: body.breakdown
      });
      return sendJson(res, 200, result);
    }

    // Quiz: History
    if (pathname === '/api/quiz/history' && method === 'GET') {
      const requested = parsedUrl.searchParams.get('userId');
      const userId = canManage(req) && requested ? requested : actor.id;
      return sendJson(res, 200, { history: db.getUserQuizHistory(userId), userId });
    }

    // Certificates: list (?userId= for admins, ?all=1 for the Super Admin)
    if (pathname === '/api/certificates' && method === 'GET') {
      if (parsedUrl.searchParams.get('all') === '1') {
        if (!isSuperAdmin(req)) {
          return sendJson(res, 403, { error: 'Super Admin access required', redirectTo: dashboardFor(actor.role) });
        }
        return sendJson(res, 200, { certificates: db.getAllCertificates(), all: true });
      }
      const requested = parsedUrl.searchParams.get('userId');
      const userId = canManage(req) && requested ? requested : actor.id;
      return sendJson(res, 200, { certificates: db.getUserCertificates(userId), userId });
    }

    // Certificates: by id / number
    if (pathname.startsWith('/api/certificates/') && method === 'GET') {
      const certId = pathname.replace('/api/certificates/', '');
      const cert = db.getCertificateById(certId);
      if (!cert) return sendJson(res, 404, { error: 'Certificate not found' });
      if (!canManage(req) && cert.userId !== actor.id) {
        return sendJson(res, 403, { error: 'You can only view your own certificates' });
      }
      return sendJson(res, 200, { certificate: cert });
    }

    return sendJson(res, 404, { error: 'API route not found' });
  } catch (apiError) {
    console.error('[API Error]:', apiError);
    return sendJson(res, 500, { error: 'Internal Server Error', message: apiError.message });
  }
}

// ------------------------------------------------------------
// PAGE ROUTES (server-side access control)
// ------------------------------------------------------------

function handlePage(req, res, pathname) {
  const user = currentUser(req);

  // Open pages (landing) — always served, session is resolved client-side
  if (OPEN_PAGES[pathname]) {
    return serveFile(res, path.join(ROOT, OPEN_PAGES[pathname]), MIME_TYPES['.html'], { noStore: true });
  }


  // Public pages
  if (PUBLIC_PAGES[pathname]) {
    if (user) return redirect(res, dashboardFor(user.role));
    return serveFile(res, path.join(ROOT, PUBLIC_PAGES[pathname]), MIME_TYPES['.html'], { noStore: true });
  }

  // Protected pages
  if (PROTECTED_PAGES[pathname]) {
    // 1. Must be signed in (and active)
    if (!user) {
      return redirect(res, '/login');
    }
    // 2. Must hold an allowed role for this page
    const allowed = PAGE_ROLES[pathname];
    if (allowed && !allowed.includes(user.role)) {
      // Role escalation attempts land on their own dashboard
      return redirect(res, dashboardFor(user.role));
    }
    return serveFile(res, path.join(ROOT, PROTECTED_PAGES[pathname]), MIME_TYPES['.html'], { noStore: true });
  }

  return false; // not a page route
}

// ------------------------------------------------------------
// STATIC FILES (allow-list only)
// ------------------------------------------------------------

function handleStatic(res, pathname) {
  const isPublicDir = PUBLIC_STATIC_DIRS.some(dir => pathname.startsWith(dir));
  if (!isPublicDir) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  const normalized = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, normalized);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }
  serveFile(res, filePath, contentType);
}

// ------------------------------------------------------------
// REQUEST HANDLER (extracted so Vercel can import it)
// ------------------------------------------------------------

async function requestHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Resolve session (if any) before routing. Session storage is shared
  // (Neon) in production, so any instance resolves the same session.
  if (needsSession(pathname)) {
    await auth.attachSession(req);
  }

  // Warehouse GLB proxy — serves the large model from R2 through same origin
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/assets/warehouse.glb') {
    if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Type': 'model/gltf-binary' }); res.end(); return; }
    return handleWarehouseProxy(res);
  }

  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, parsedUrl);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const handled = handlePage(req, res, pathname);
    if (handled !== false) return;
    return handleStatic(res, pathname);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('405 Method Not Allowed');
}

// Vercel: import this file and use the exported handler
module.exports = requestHandler;

// Local dev: run directly with `node server.js`
if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`[Trinova] Enterprise Server running at http://localhost:${PORT}/`);
    console.log(`[Trinova] Neon DB Project: bold-surf-20847857 (production)`);
    console.log(`[Trinova] Routes: /login /register /forgot-password | /employee /admin /super-admin`);
  });
}
