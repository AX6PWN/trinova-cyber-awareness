/* ============================================================
   PANELS MODULE — Topic information panels with scenarios
   ============================================================ */

import { markCompleted, isCompleted, getCompletedCount, HOTSPOT_DATA } from './hotspots.js';

let currentTopicId = null;
let isPanelOpen = false;

// Global helper to get active user ID
function getActiveUserId() {
  try {
    const raw = localStorage.getItem('cybersafe_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.id;
    }
  } catch (e) {}
  return 'usr-emp-eng';
}

/**
 * Open the topic panel for a given hotspot data object.
 */
export function openPanel(data) {
  if (isPanelOpen) return;

  currentTopicId = data.id;
  isPanelOpen = true;

  const overlay = document.getElementById('topic-panel-overlay');
  const panel = document.getElementById('topic-panel');

  // Populate panel content
  populatePanel(data);

  // Show
  overlay.classList.add('visible');
  // Small delay to trigger CSS transition
  requestAnimationFrame(() => {
    panel.classList.add('visible');
  });

  // Close handlers
  overlay.onclick = () => closePanel();
}

/**
 * Close the currently open topic panel.
 */
export function closePanel() {
  if (!isPanelOpen) return;

  const overlay = document.getElementById('topic-panel-overlay');
  const panel = document.getElementById('topic-panel');

  panel.classList.remove('visible');
  setTimeout(() => {
    overlay.classList.remove('visible');
    isPanelOpen = false;
    currentTopicId = null;
  }, 350);
}

/**
 * Check if panel is currently open.
 */
export function isPanelVisible() {
  return isPanelOpen;
}

// --- Internal ---

function populatePanel(data) {
  const topic = data.topic;
  const completed = isCompleted(data.id);

  // Header
  const iconEl = document.querySelector('.panel-topic-icon');
  iconEl.className = `panel-topic-icon ${data.cssClass}`;
  iconEl.textContent = data.icon;

  document.querySelector('.panel-topic-title').textContent = data.title;
  document.querySelector('.panel-topic-subtitle').textContent = topic.subtitle;

  // Close button
  document.querySelector('.panel-close-btn').onclick = () => closePanel();

  // Body — What is it
  document.getElementById('panel-what-is-it').textContent = topic.whatIsIt;

  // Red flags
  const flagsList = document.getElementById('panel-red-flags');
  flagsList.innerHTML = '';
  topic.redFlags.forEach(flag => {
    const li = document.createElement('li');
    li.textContent = flag;
    flagsList.appendChild(li);
  });

  // Scenario
  document.getElementById('panel-scenario-text').textContent = topic.scenario.text;
  document.getElementById('panel-scenario-question').textContent = topic.scenario.question;

  // Scenario options
  const optionsContainer = document.getElementById('panel-scenario-options');
  optionsContainer.innerHTML = '';

  const feedbackEl = document.getElementById('panel-scenario-feedback');
  feedbackEl.className = 'scenario-feedback';
  feedbackEl.textContent = '';

  let scenarioAnswered = false;

  topic.scenario.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'scenario-option-btn';
    btn.textContent = `${String.fromCharCode(65 + i)}. ${opt.text}`;
    btn.setAttribute('data-correct', opt.correct);

    btn.onclick = () => {
      if (scenarioAnswered) return;
      scenarioAnswered = true;

      // Disable all buttons
      optionsContainer.querySelectorAll('.scenario-option-btn').forEach(b => {
        b.disabled = true;
        if (b.getAttribute('data-correct') === 'true') {
          b.classList.add('correct');
        }
      });

      if (opt.correct) {
        btn.classList.add('correct');
        feedbackEl.className = 'scenario-feedback visible correct';
        feedbackEl.textContent = topic.scenario.correctFeedback;
      } else {
        btn.classList.add('incorrect');
        feedbackEl.className = 'scenario-feedback visible incorrect';
        feedbackEl.textContent = topic.scenario.incorrectFeedback;

        // Immediately show the training mistake warning popup explaining mistake & safer action
        showTrainingMistakePopup(data, opt);
      }
    };

    optionsContainer.appendChild(btn);
  });

  // Mark complete button
  const completeBtn = document.getElementById('btn-mark-complete');
  if (completed) {
    completeBtn.className = 'btn-complete completed';
    completeBtn.innerHTML = '✓ Completed';
    completeBtn.onclick = null;
  } else {
    completeBtn.className = 'btn-complete';
    completeBtn.innerHTML = '✓ Mark Complete';
    completeBtn.onclick = () => {
      markCompleted(data.id);
      completeBtn.className = 'btn-complete completed';
      completeBtn.innerHTML = '✓ Completed';
      completeBtn.onclick = null;

      // Sync with Backend API
      const userId = getActiveUserId();
      fetch('/api/training/complete-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topicId: data.id, topicTitle: data.title })
      }).catch(err => console.log('[API] Offline sync mode for topic completion'));

      // Update HUD
      updateProgress();

      // Toast
      const total = HOTSPOT_DATA.length;
      showToast(`${data.title} marked complete! (${getCompletedCount()}/${total})`);
    };
  }

  // Close panel button at bottom
  document.getElementById('btn-close-panel').onclick = () => closePanel();
}

/**
 * Display the immediate warning popup when an incorrect decision is made during training.
 */
function showTrainingMistakePopup(data, selectedOpt) {
  const modal = document.getElementById('training-mistake-modal');
  const descEl = document.getElementById('mistake-desc-text');
  const safeEl = document.getElementById('mistake-safe-action-text');
  if (!modal || !descEl || !safeEl) return;

  const topic = data.topic;
  const correctOption = topic.scenario.options.find(o => o.correct);

  descEl.textContent = `You selected: "${selectedOpt.text}". ${topic.scenario.incorrectFeedback.replace(/^[❌\s*Not quite\.\s*]+/i, '')}`;
  safeEl.textContent = correctOption 
    ? `Safer practice: ${correctOption.text}. ${topic.scenario.correctFeedback.replace(/^[✅\s*Correct!\s*]+/i, '')}`
    : topic.scenario.correctFeedback;

  modal.classList.add('visible');

  const closeModal = () => {
    modal.classList.remove('visible');
  };

  const closeX = document.getElementById('btn-close-mistake-x');
  const ackBtn = document.getElementById('btn-ack-mistake');
  if (closeX) closeX.onclick = closeModal;
  if (ackBtn) ackBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

function updateProgress() {
  const count = getCompletedCount();
  const total = HOTSPOT_DATA.length;
  const fill = document.querySelector('.progress-fill');
  const text = document.getElementById('progress-text');
  if (fill) fill.style.width = `${(count / total) * 100}%`;
  if (text) text.textContent = `${count}/${total} Topics`;

  // Show quiz button when all done
  const quizBtn = document.getElementById('btn-start-quiz');
  if (quizBtn && count >= total) {
    quizBtn.style.display = 'flex';
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// Export for use by app.js
export { updateProgress, showToast };
