/* ============================================================
   APP MODULE — Application controller and state management
   ============================================================ */

import { initHotspots, getCompletedCount, HOTSPOT_DATA } from './hotspots.js';
import { focusCamera, resetCamera } from './camera.js';
import { openPanel, closePanel, updateProgress, showToast } from './panels.js';
import { startQuiz, closeQuiz } from './quiz.js';
import { initDebug } from './debug.js';

// --- App State ---
let appState = 'welcome'; // 'welcome' | 'training' | 'quiz' | 'results'
let sceneReady = false;

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  // Welcome screen — Enter Training button
  const enterBtn = document.getElementById('btn-enter-training');
  if (enterBtn) {
    enterBtn.addEventListener('click', enterTraining);
  }

  // HUD buttons
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
  // Escape — close panels/quiz
  if (e.key === 'Escape') {
    closePanel();
    closeQuiz();
  }

  // R — reset camera
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    if (appState === 'training') {
      resetCamera();
    }
  }

  // F — fullscreen
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
