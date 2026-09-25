/* ============================================================
   APP MODULE: Application controller and state management
   ============================================================ */

import { initHotspots, getCompletedCount, HOTSPOT_DATA } from './hotspots.js';
import { focusCamera, resetCamera } from './camera.js';
import { openPanel, closePanel, updateProgress, showToast } from './panels.js';
import { startQuiz, closeQuiz, getLastTrainingResult, downloadTrainingResults } from './quiz.js';
import { initDebug } from './debug.js';

// --- App State ---
let appState = 'welcome'; // 'welcome' | 'training' | 'quiz' | 'results'
let sceneReady = false;

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  // Update Last Training Result display from LocalStorage
  updateLastTrainingResultDisplay();
  window.updateLastTrainingResultDisplay = updateLastTrainingResultDisplay;

  // Welcome screen: Enter Training button
  const enterBtn = document.getElementById('btn-enter-training');
  if (enterBtn) {
    enterBtn.addEventListener('click', enterTraining);
  }

  // HUD buttons
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

  // Auto-hide hint after 6s
  setTimeout(() => {
    hint.classList.remove('visible');
  }, 6000);
}

// --- Hotspot Click Handler ---

async function onHotspotClick(data) {
  // Smooth camera focus toward the hotspot area
  try {
    await focusCamera(data.cameraTarget, 1000);
  } catch (e) {
    console.warn('[App] Camera focus failed, opening panel directly:', e);
  }

  // Small delay after camera movement for visual smoothness
  await delay(200);

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
  if (!container) return;

  const result = getLastTrainingResult();
  if (!result) {
    container.textContent = 'No previous training result.';
    return;
  }

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

