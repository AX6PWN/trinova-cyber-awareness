/* ============================================================
   TRAINING TIMER — server-anchored duration tracking
   - Starts when the learner clicks "Start Training"
   - Keeps running across training, hotspots and the quiz
   - Survives refresh / disconnect by resuming the active session
   - Duration is always validated server-side from persisted timestamps
   ============================================================ */

export const COURSE_ID = 'cyber-awareness-360';
export const COURSE_NAME = 'Trinova Cyber Awareness 360';

let session = null;      // active session: { id, startedAt, status, ... }
let clockOffsetMs = 0;   // serverNow - Date.now(), corrects client clock drift
let timerEl = null;
let tickHandle = 0;

function activeUserId() {
  try {
    const raw = localStorage.getItem('cybersafe_auth_user');
    if (raw) return JSON.parse(raw).id || null;
  } catch (e) { /* ignore */ }
  return null;
}

function storageKey() {
  const id = activeUserId();
  return id ? `cybersafe_training_session_${id}` : null;
}

export function storeLocalSession(s) {
  const key = storageKey();
  if (!key || !s) return;
  try {
    localStorage.setItem(key, JSON.stringify({ id: s.id, startedAt: s.startedAt, status: s.status }));
  } catch (e) { /* private mode */ }
}

export function readLocalSession() {
  const key = storageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearLocalSession() {
  const key = storageKey();
  if (key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
}

export function serverNowMs() {
  return Date.now() + clockOffsetMs;
}

export function getSession() {
  return session;
}

export function elapsedSeconds() {
  if (!session || !session.startedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.round((serverNowMs() - start) / 1000));
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function startTicking() {
  if (!tickHandle) {
    // 500ms so the displayed second stays current even when the main thread
    // is busy rendering the 3D warehouse (a 1s interval can drift behind).
    tickHandle = setInterval(updateTimerUI, 500);
  }
}

function applySession(s, serverNow) {
  session = s || null;
  if (serverNow) clockOffsetMs = Number(serverNow) - Date.now();
  if (session) storeLocalSession(session);
  updateTimerUI();
  if (session) startTicking();
}

function updateTimerUI() {
  if (!timerEl) return;
  timerEl.textContent = formatDuration(elapsedSeconds());
}

/** Bind the visible timer element (id or element) and start ticking. */
export function bindTimer(elOrId) {
  timerEl = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  updateTimerUI();
  startTicking();
}

export function stopTimer() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = 0;
  }
}

/** Start a new training session (or resume the active one on the server). */
export async function startTraining() {
  try {
    const res = await fetch('/api/training/start', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: COURSE_ID, courseName: COURSE_NAME })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.session) return null;
    applySession(data.session, data.serverNow);
    return session;
  } catch (e) {
    return null;
  }
}

/** Recover a running session after a refresh / reconnect. */
export async function resumeTraining() {
  try {
    const res = await fetch(`/api/training/session?courseId=${encodeURIComponent(COURSE_ID)}`, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.session) {
      applySession(data.session, data.session.serverNow);
      return session;
    }
  } catch (e) { /* offline */ }
  return null;
}

/** Complete the active session with the final quiz result. Idempotent. */
export async function completeTraining(quiz = {}) {
  if (!session) session = readLocalSession();
  if (!session || !session.id) {
    // Last resort: ask the server for the active session before completing
    await resumeTraining();
  }
  if (!session || !session.id) return null;

  const res = await fetch('/api/training/complete', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session.id, ...quiz })
  });
  if (!res.ok) throw new Error('Failed to complete training');

  const data = await res.json();
  clearLocalSession();
  stopTimer();
  session = null;
  return data;
}
