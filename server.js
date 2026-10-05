/* ============================================================
   CYBERSAFE 360° — B2B SAAS BACKEND & HTTP SERVER
   Hybrid Neon Postgres + Static Server
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./backend/db');

const PORT = process.env.PORT || 3000;

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
  '.svg': 'image/svg+xml'
};

// Helper: Parse JSON Body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Safeguard max 5MB
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

// Helper: Send JSON Response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Router
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --- API Routes ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Database Status
      if (pathname === '/api/db/status' && req.method === 'GET') {
        const status = db.getDbStatus();
        return sendJson(res, 200, status);
      }

      // 2. Auth: Login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = db.login(body.email, body.password);
        return sendJson(res, result.success ? 200 : 401, result);
      }

      // 3. Auth: Register
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = db.register(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      // 4. Auth: Current User / Me
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '') || parsedUrl.searchParams.get('token');
        if (!token) {
          return sendJson(res, 401, { error: 'Authentication required' });
        }
        // Extract userId from token (token_usr-..._timestamp)
        const parts = token.split('_');
        const userId = parts.length >= 2 ? (parts.slice(1, -1).join('_') || parts[1]) : null;
        const user = db.getUser(userId);
        if (!user) {
          return sendJson(res, 404, { error: 'User session expired or not found' });
        }
        return sendJson(res, 200, { user });
      }

      // 5. B2B SaaS Dashboard Data
      if (pathname === '/api/b2b/dashboard' && req.method === 'GET') {
        const orgId = parsedUrl.searchParams.get('orgId') || 'org-acme';
        const dashboard = db.getB2BDashboard(orgId);
        return sendJson(res, 200, dashboard);
      }

      // 6. B2B Create Campaign
      if (pathname === '/api/b2b/campaigns' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const orgId = body.orgId || 'org-acme';
        const result = db.createCampaign(orgId, body);
        return sendJson(res, 201, result);
      }

      // 7. Training Progress: Get
      if (pathname === '/api/training/progress' && req.method === 'GET') {
        const userId = parsedUrl.searchParams.get('userId') || 'usr-emp-eng';
        const progress = db.getUserProgress(userId);
        return sendJson(res, 200, { progress });
      }

      // 8. Training Progress: Complete Topic
      if (pathname === '/api/training/complete-topic' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { userId, topicId, topicTitle } = body;
        if (!userId || !topicId) {
          return sendJson(res, 400, { error: 'userId and topicId are required' });
        }
        const result = db.saveProgress(userId, topicId, topicTitle);
        return sendJson(res, 200, result);
      }

      // 9. Quiz: Submit Attempt & Auto-Issue Certificate
      if (pathname === '/api/quiz/submit' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { userId, score, percentage, status, breakdown } = body;
        if (!userId) {
          return sendJson(res, 400, { error: 'userId is required' });
        }
        const result = db.saveQuizAttempt(userId, { score, percentage, status, breakdown });
        return sendJson(res, 200, result);
      }

      // 10. Quiz: History
      if (pathname === '/api/quiz/history' && req.method === 'GET') {
        const userId = parsedUrl.searchParams.get('userId') || 'usr-emp-eng';
        const history = db.getUserQuizHistory(userId);
        return sendJson(res, 200, { history });
      }

      // 11. Certificates: Get by ID or User
      if (pathname.startsWith('/api/certificates/') && req.method === 'GET') {
        const certId = pathname.replace('/api/certificates/', '');
        const cert = db.getCertificateById(certId);
        if (!cert) {
          return sendJson(res, 404, { error: 'Certificate not found' });
        }
        return sendJson(res, 200, { certificate: cert });
      }

      if (pathname === '/api/certificates' && req.method === 'GET') {
        const userId = parsedUrl.searchParams.get('userId');
        if (userId) {
          const certs = db.getUserCertificates(userId);
          return sendJson(res, 200, { certificates: certs });
        }
        return sendJson(res, 400, { error: 'userId query parameter required' });
      }

      // Unknown API endpoint
      return sendJson(res, 404, { error: 'API route not found' });
    } catch (apiError) {
      console.error('[API Error]:', apiError);
      return sendJson(res, 500, { error: 'Internal Server Error', message: apiError.message });
    }
  }

  // --- Static Files ---
  const urlPath = decodeURIComponent(pathname);
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[CyberSafe 360°] Enterprise Server running at http://localhost:${PORT}/`);
  console.log(`[CyberSafe 360°] Neon DB Project: bold-surf-20847857 (production)`);
});
