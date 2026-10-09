/* ============================================================
   CYBERSAFE 360° — CLIENT SESSION GUARD
   Server is the authority; this mirrors route protection in the
   browser and keeps the cached UI from surviving logout/back.
   Configure per page:
     window.PAGE_AUTH = { public: true }              // login/register/forgot
     window.PAGE_AUTH = { roles: ['employee'] }       // employee dashboard
     window.PAGE_AUTH = { roles: ['admin'] }          // admin dashboard
     window.PAGE_AUTH = { roles: ['superadmin'] }     // super admin dashboard
   ============================================================ */

(function () {
  const DASH = {
    superadmin: './super-admin.html',
    admin: './admin.html',
    employee: './employee.html'
  };

  const AUTH_KEY = 'cybersafe_auth_user';

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: { 'Cache-Control': 'no-store' },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch (err) {
      return null;
    }
  }

  function storeUser(user) {
    try {
      if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_KEY);
    } catch (e) { /* private mode */ }
  }

  const CyberSafeAuth = {
    user: null,

    /** Resolve the current session (also updates stored UI state). */
    async refresh() {
      const user = await fetchMe();
      CyberSafeAuth.user = user;
      storeUser(user);
      return user;
    },

    /**
     * Require a signed-in user with one of the allowed roles.
     * Redirects (replace — no history entry) when the check fails.
     * Returns the user or null when redirected.
     */
    async require(roles) {
      const user = await CyberSafeAuth.refresh();
      if (!user) {
        window.location.replace('./login.html');
        return null;
      }
      if (roles && roles.length && !roles.includes(user.role)) {
        window.location.replace(DASH[user.role] || '/employee');
        return null;
      }
      return user;
    },

    /** Full logout: kill server session + all local auth state. */
    async logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Cache-Control': 'no-store' }
        });
      } catch (err) { /* session cookie is cleared below regardless */ }

      storeUser(null);
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('cybersafe_') && k.includes('auth'))
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}

      // Replace + purge history so Back cannot restore a protected page
      window.location.replace('./login.html');
    },

    /**
     * Feed every authenticated fetch() response through this.
     * Handles session expiry (401) and role denial (403).
     * Returns true when the response was handled (i.e. redirecting).
     */
    guardResponse(res) {
      if (res.status === 401) {
        storeUser(null);
        window.location.replace('./login.html');
        return true;
      }
      if (res.status === 403) {
        // Try to recover the body for a target route, else fall back
        res.clone().json()
          .then(body => {
            const target = (body && body.redirectTo) || null;
            window.location.replace(target || DASH[window.CYBERSAFE_ROLE] || '/employee');
          })
          .catch(() => {
            window.location.replace(DASH[window.CYBERSAFE_ROLE] || '/employee');
          });
        return true;
      }
      return false;
    },

    dashboardFor: DASH
  };

  window.CyberSafeAuth = CyberSafeAuth;

  // ------------------------------------------------------------
  // Automatic page guard
  // ------------------------------------------------------------

  async function runGuard() {
    const cfg = window.PAGE_AUTH || {};
    const user = await CyberSafeAuth.refresh();

    if (cfg.public) {
      // Already signed in? Never show login/register again.
      if (user) window.location.replace(DASH[user.role] || '/employee');
      return;
    }

    if (!user) {
      window.location.replace('./login.html');
      return;
    }
    if (cfg.roles && cfg.roles.length && !cfg.roles.includes(user.role)) {
      window.location.replace(DASH[user.role] || '/employee');
      return;
    }
    window.CYBERSAFE_ROLE = user.role;
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: user }));
  }

  function start() {
    // Always wait for DOMContentLoaded (or the next tick when it already
    // fired): every deferred script — including page controllers that listen
    // for auth:ready — must have executed before we dispatch.
    if (document.readyState === 'complete') {
      setTimeout(runGuard, 0);
    } else {
      document.addEventListener('DOMContentLoaded', () => setTimeout(runGuard, 0), { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Back/forward cache: re-validate whenever the page is restored
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) runGuard();
  });

  // Tab refocus — catch server-side session revocation (e.g. password reset)
  window.addEventListener('focus', () => {
    const cfg = window.PAGE_AUTH || {};
    if (cfg.public) return;
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          storeUser(null);
          window.location.replace('./login.html');
        }
      })
      .catch(() => {});
  });
})();
