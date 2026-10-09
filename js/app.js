/* ============================================================
   APP MODULE: Application controller and state management
   ============================================================ */

import { initHotspots, getCompletedCount, HOTSPOT_DATA } from './hotspots.js';
import { focusCamera, resetCamera } from './camera.js';
import { openPanel, closePanel, updateProgress, showToast } from './panels.js';
import { startQuiz, closeQuiz, getLastTrainingResult, downloadTrainingResults } from './quiz.js';
import { initDebug } from './debug.js';
import { initB2B, openB2BDashboard, openCertificateModal } from './b2b.js';
import { initThreatIntel, initInviteEmployee } from './features.js';

// --- App State ---
let appState = 'welcome'; // 'welcome' | 'training' | 'quiz' | 'results'
let sceneReady = false;

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  // Initialize B2B SaaS Engine (Auth, CISO Dashboard, Neon DB Status)
  initB2B();

  // Initialize new feature modules
  initThreatIntel();
  initInviteEmployee();

  // Update Last Training Result display from LocalStorage
  updateLastTrainingResultDisplay();
  window.updateLastTrainingResultDisplay = updateLastTrainingResultDisplay;

  // Welcome screen: Enter Training button
  const enterBtn = document.getElementById('btn-enter-training');
  if (enterBtn) {
    enterBtn.addEventListener('click', enterTraining);
  }

  // Welcome screen: role-aware shortcut (dashboard link or CISO modal)
  document.getElementById('btn-welcome-ciso')?.addEventListener('click', (e) => {
    const target = e.currentTarget?.dataset?.target;
    if (target) window.location.href = target;
    else openB2BDashboard();
  });

  // HUD buttons
  document.getElementById('btn-hud-ciso-dash')?.addEventListener('click', openB2BDashboard);
  document.getElementById('btn-hud-certificate')?.addEventListener('click', () => openCertificateModal());
  document.getElementById('btn-see-previous-result')?.addEventListener('click', openPreviousResultModal);
  document.getElementById('btn-close-prev-result-x')?.addEventListener('click', closePreviousResultModal);
  document.getElementById('btn-close-prev-result')?.addEventListener('click', closePreviousResultModal);

  // Download buttons
  document.getElementById('btn-download-csv-modal')?.addEventListener('click', () => downloadTrainingResults('csv'));
  document.getElementById('btn-download-json-modal')?.addEventListener('click', () => downloadTrainingResults('json'));
  document.getElementById('btn-download-results-csv-results')?.addEventListener('click', () => downloadTrainingResults('csv'));
  document.getElementById('btn-download-results-json-results')?.addEventListener('click', () => downloadTrainingResults('json'));

  document.getElementById('btn-reset-camera')?.addEventListener('click', () => {
    resetCamera();
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFullscreen);

  document.getElementById('btn-exit-training')?.addEventListener('click', exitTraining);

  document.getElementById('btn-start-quiz')?.addEventListener('click', () => {
    startQuiz();
  });

  // A-Frame scene loaded
  const scene = document.querySelector('a-scene');
  if (scene) {
    if (scene.hasLoaded) {
      onSceneReady(scene);
    } else {
      scene.addEventListener('loaded', () => onSceneReady(scene));
    }
  }

  // Init debug mode
  initDebug();

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);
}

function onSceneReady(scene) {
  sceneReady = true;
  console.log('[App] A-Frame scene loaded');

  // Initialise hotspots
  initHotspots(scene, onHotspotClick);

  // Update progress bar
  updateProgress();
}

// --- Screen Transitions ---

function enterTraining() {
  appState = 'training';

  // Hide welcome screen
  const welcome = document.getElementById('welcome-screen');
  welcome.classList.add('hidden');

  // Show HUD
  const hud = document.getElementById('hud');
  hud.classList.add('visible');

  // Show explore hint
  const hint = document.getElementById('explore-hint');
  hint.classList.add('visible');

  // We check if B2B user is logged in
  if (window.currentUser) {
    showToast(`Welcome to the simulation, ${window.currentUser.fullName}`);
  }
}

function exitTraining() {
  // "Exit Training" returns the learner to their role dashboard
  if (window.CyberSafeAuth && window.CyberSafeAuth.user) {
    const target = window.CyberSafeAuth.dashboardFor[window.CyberSafeAuth.user.role] || '/employee';
    window.location.replace(target);
    return;
  }

  appState = 'welcome';

  // Show welcome screen
  const welcome = document.getElementById('welcome-screen');
  if (welcome) welcome.classList.remove('hidden');

  // Hide HUD
  const hud = document.getElementById('hud');
  if (hud) hud.classList.remove('visible');

  // Hide explore hint
  const hint = document.getElementById('explore-hint');
  if (hint) hint.classList.remove('visible');
}

// --- Hotspot Click Handler ---

async function onHotspotClick(data) {
  // Open the topic panel
  openPanel(data);
}

// --- Fullscreen ---

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// --- Keyboard Shortcuts ---

function handleKeydown(e) {
  // Escape: close panels, modals, quiz
  if (e.key === 'Escape') {
    closePanel();
    closeQuiz();
    closePreviousResultModal();
    document.getElementById('training-mistake-modal')?.classList.remove('visible');
  }

  // R: reset camera
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    if (appState === 'training') {
      resetCamera();
    }
  }

  // F: fullscreen
  if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
    if (appState === 'training') {
      toggleFullscreen();
    }
  }
}

// --- Utility ---

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Previous Training Result Modal Handlers ---

export function openPreviousResultModal() {
  const modal = document.getElementById('previous-result-modal');
  const content = document.getElementById('prev-result-modal-content');
  const csvBtn = document.getElementById('btn-download-csv-modal');
  const jsonBtn = document.getElementById('btn-download-json-modal');
  if (!modal || !content) return;

  const result = getLastTrainingResult();
  if (!result) {
    content.textContent = 'No previous training result.';
    if (csvBtn) csvBtn.style.display = 'none';
    if (jsonBtn) jsonBtn.style.display = 'none';
  } else {
    const isPass = result.status === 'Passed';
    content.innerHTML = `
      <div class="last-training-grid">
        <div class="last-training-item">
          <span class="last-training-item-label">Score</span>
          <span class="last-training-item-value">${result.score}</span>
        </div>
        <div class="last-training-item">
          <span class="last-training-item-label">Percentage</span>
          <span class="last-training-item-value">${result.percentage}</span>
        </div>
        <div class="last-training-item">
          <span class="last-training-item-label">Result</span>
          <span class="last-training-status-badge ${isPass ? 'pass' : 'fail'}">${result.status}</span>
        </div>
        <div class="last-training-item">
          <span class="last-training-item-label">Date and Time</span>
          <span class="last-training-item-value">${result.date}</span>
        </div>
      </div>
    `;
    if (csvBtn) csvBtn.style.display = 'inline-flex';
    if (jsonBtn) jsonBtn.style.display = 'inline-flex';
  }

  modal.classList.add('visible');

  // Dismiss on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closePreviousResultModal();
    }
  };
}

export function closePreviousResultModal() {
  document.getElementById('previous-result-modal')?.classList.remove('visible');
}

// --- Last Training Result Display (Welcome Screen) ---

export function updateLastTrainingResultDisplay() {
  const container = document.getElementById('last-training-content');
  const card = document.getElementById('last-training-result-card');
  if (!container) return;

  const result = getLastTrainingResult();
  if (!result) {
    container.textContent = '';
    if (card) card.hidden = true;
    return;
  }

  if (card) card.hidden = false;

  const isPass = result.status === 'Passed';
  container.innerHTML = `
    <div class="last-training-grid">
      <div class="last-training-item">
        <span class="last-training-item-label">Score</span>
        <span class="last-training-item-value">${result.score}</span>
      </div>
      <div class="last-training-item">
        <span class="last-training-item-label">Percentage</span>
        <span class="last-training-item-value">${result.percentage}</span>
      </div>
      <div class="last-training-item">
        <span class="last-training-item-label">Result / Status</span>
        <span class="last-training-status-badge ${isPass ? 'pass' : 'fail'}">${result.status}</span>
      </div>
      <div class="last-training-item">
        <span class="last-training-item-label">Date and Time</span>
        <span class="last-training-item-value">${result.date}</span>
      </div>
    </div>
    <div style="margin-top: 10px; display: flex; gap: 8px;">
      <button id="btn-download-welcome-csv" class="btn-action-download" style="padding: 6px 12px; font-size: 11px;">
        <span class="btn-icon">📥</span> Download CSV
      </button>
      <button id="btn-download-welcome-json" class="btn-action-download" style="padding: 6px 12px; font-size: 11px;">
        <span class="btn-icon">💾</span> Download JSON
      </button>
    </div>
  `;

  document.getElementById('btn-download-welcome-csv')?.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadTrainingResults('csv');
  });
  document.getElementById('btn-download-welcome-json')?.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadTrainingResults('json');
  });
}

