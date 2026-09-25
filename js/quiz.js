/* ============================================================
   QUIZ MODULE — 12-question multiple-choice quiz engine
   ============================================================ */

// --- Question Bank (2 per topic) ---
const QUESTIONS = [
  // Phishing (2)
  {
    topic: 'phishing',
    question: 'Which of the following is the MOST reliable way to verify if an email is legitimate?',
    options: [
      'Check if the email looks professional',
      'Contact the supposed sender through a separate, verified channel',
      'Click the link to see where it leads',
      'Reply to the email asking for confirmation'
    ],
    correct: 1,
    explanation: 'Contacting the sender through a known, verified channel (e.g., official phone number or website) is the safest way to confirm an email\'s legitimacy.'
  },
  {
    topic: 'phishing',
    question: 'A phishing email is MOST likely to contain which of these?',
    options: [
      'A detailed privacy policy',
      'An invitation to an upcoming meeting',
      'An urgent request to verify your account via a link',
      'A notification that your password was changed successfully'
    ],
    correct: 2,
    explanation: 'Phishing emails typically create urgency (e.g., "verify now or lose access") and include deceptive links designed to steal credentials.'
  },
  // Passwords (2)
  {
    topic: 'passwords',
    question: 'Which password practice provides the STRONGEST security?',
    options: [
      'Using a memorable phrase with mixed characters: "Coffee$Morning#2024!"',
      'Using your birthday with special characters: "12Dec!1990"',
      'Using the same strong password across all accounts',
      'Changing your password every week to a simple variation'
    ],
    correct: 0,
    explanation: 'A passphrase with mixed character types is both strong and memorable. Personal information is guessable, password reuse is dangerous, and frequent minor changes create weak patterns.'
  },
  {
    topic: 'passwords',
    question: 'What is the primary benefit of using a password manager?',
    options: [
      'It makes your passwords impossible to hack',
      'It lets you use one password for everything safely',
      'It generates and stores unique, strong passwords for each account',
      'It automatically changes your passwords every month'
    ],
    correct: 2,
    explanation: 'Password managers generate unique, complex passwords for every account and store them securely, eliminating the need to remember or reuse passwords.'
  },
  // MFA (2)
  {
    topic: 'mfa',
    question: 'Which form of MFA is generally considered MOST secure?',
    options: [
      'SMS text message codes',
      'Email verification codes',
      'Hardware security key or authenticator app',
      'Security questions (e.g., mother\'s maiden name)'
    ],
    correct: 2,
    explanation: 'Hardware security keys and authenticator apps are resistant to SIM-swapping and interception attacks that can compromise SMS and email-based codes. Security questions are not true MFA.'
  },
  {
    topic: 'mfa',
    question: 'You receive an unexpected MFA code on your phone that you didn\'t request. What does this likely mean?',
    options: [
      'Your authentication app is malfunctioning',
      'Someone has your password and is trying to log in',
      'Your account has been upgraded with new security features',
      'It\'s a routine security test from IT'
    ],
    correct: 1,
    explanation: 'An unsolicited MFA code strongly suggests someone has obtained your password and is attempting to access your account. Change your password immediately and report it.'
  },
  // Social Engineering (2)
  {
    topic: 'social-engineering',
    question: 'Which social engineering technique involves an attacker creating a fabricated scenario to extract information?',
    options: [
      'Phishing',
      'Pretexting',
      'Tailgating',
      'Shoulder surfing'
    ],
    correct: 1,
    explanation: 'Pretexting involves creating a fabricated scenario (pretext), such as pretending to be IT support or a manager, to manipulate the target into providing information or access.'
  },
  {
    topic: 'social-engineering',
    question: 'What is the BEST defence against social engineering attacks?',
    options: [
      'Installing the latest antivirus software',
      'Using a VPN for all internet traffic',
      'Verifying identities and following established procedures, regardless of urgency',
      'Only communicating via encrypted email'
    ],
    correct: 2,
    explanation: 'Social engineering exploits human behaviour, not technology. The best defence is always verifying identities independently and following established security procedures, no matter how urgent the request seems.'
  },
  // Safe Browsing (2)
  {
    topic: 'safe-browsing',
    question: 'What does the padlock icon in a browser\'s address bar indicate?',
    options: [
      'The website is completely safe and trustworthy',
      'The website has been verified by your IT department',
      'The connection between your browser and the server is encrypted',
      'The website does not contain any malware'
    ],
    correct: 2,
    explanation: 'The padlock icon indicates an encrypted HTTPS connection, not that the website is safe. Malicious websites can also use HTTPS. Always verify the actual domain name.'
  },
  {
    topic: 'safe-browsing',
    question: 'You see a pop-up warning saying "Your computer is infected! Call this number immediately." What should you do?',
    options: [
      'Call the number because it looks like a genuine Microsoft warning',
      'Close the browser tab immediately and run your actual antivirus software',
      'Follow the instructions to download their recommended security tool',
      'Turn off your computer and wait 24 hours'
    ],
    correct: 1,
    explanation: 'These pop-ups are "scareware", fake alerts designed to trick you into calling scammers or downloading malware. Close the tab and use your legitimate security software.'
  },
  // USB / Device Security (2)
  {
    topic: 'usb-security',
    question: 'Why are "USB drop" attacks effective?',
    options: [
      'USB drives can bypass all antivirus software',
      'They exploit human curiosity to get malware onto internal networks',
      'USB malware cannot be detected by any security tool',
      'USB drives can hack into computers even when not plugged in'
    ],
    correct: 1,
    explanation: 'USB drop attacks exploit natural human curiosity. When someone plugs in a found drive, it can automatically execute malware that may bypass network security since it enters from inside the perimeter.'
  },
  {
    topic: 'usb-security',
    question: 'Which of the following is a safe practice regarding USB devices?',
    options: [
      'Using any USB drive as long as you scan it with antivirus first',
      'Only using personally-owned USB drives on work computers',
      'Using only organisation-approved, encrypted USB devices',
      'Formatting found USB drives before use to remove any threats'
    ],
    correct: 2,
    explanation: 'Organisation-approved encrypted devices have proper security controls. Scanning and formatting cannot reliably remove all threats because some malware resides in USB firmware itself.'
  }
];

// --- State ---
let currentQuestionIndex = 0;
let answers = [];          // user's selected answer index per question
let quizFinished = false;

/**
 * Start (or restart) the quiz.
 */
export function startQuiz() {
  currentQuestionIndex = 0;
  answers = [];
  quizFinished = false;

  const screen = document.getElementById('quiz-screen');
  screen.classList.add('visible');

  renderQuestion();
}

/**
 * Close the quiz screen.
 */
export function closeQuiz() {
  const screen = document.getElementById('quiz-screen');
  screen.classList.remove('visible');
}

/**
 * Show the results screen.
 */
export function showResults() {
  closeQuiz();

  const resultsScreen = document.getElementById('results-screen');
  resultsScreen.classList.add('visible');

  const score = calculateScore();
  const total = QUESTIONS.length;
  const percent = Math.round((score / total) * 100);
  const pass = percent >= 70;
  const status = pass ? 'Passed' : 'Needs Review';

  // Save latest quiz/training result to browser LocalStorage
  saveTrainingResult(score, total, percent, status);
  if (typeof window.updateLastTrainingResultDisplay === 'function') {
    window.updateLastTrainingResultDisplay();
  }

  // Score circle
  const circle = document.querySelector('.results-score-circle');
  circle.className = `results-score-circle ${pass ? 'pass' : 'fail'}`;
  circle.querySelector('.score-number').textContent = `${percent}%`;
  circle.querySelector('.score-label').textContent = `${score} / ${total} correct`;

  // Message
  document.querySelector('.results-message').textContent =
    pass ? '🎉 Excellent Work!' : '📚 Keep Learning!';
  document.querySelector('.results-subtitle').textContent =
    pass
      ? 'You demonstrated strong cybersecurity awareness. Stay vigilant!'
      : `You need 70% to pass. Review the topics and try again.`;

  // Breakdown per topic
  const breakdown = document.querySelector('.results-breakdown');
  breakdown.innerHTML = '';

  const topics = [
    { id: 'phishing', label: 'Phishing', icon: '✉️' },
    { id: 'passwords', label: 'Passwords', icon: '🔒' },
    { id: 'mfa', label: 'MFA', icon: '🛡️' },
    { id: 'social-engineering', label: 'Social Eng.', icon: '🎭' },
    { id: 'safe-browsing', label: 'Safe Browsing', icon: '🌐' },
    { id: 'usb-security', label: 'USB Security', icon: '🔌' }
  ];

  topics.forEach(t => {
    const topicQs = QUESTIONS.map((q, i) => ({ ...q, idx: i })).filter(q => q.topic === t.id);
    const topicCorrect = topicQs.filter(q => answers[q.idx] === q.correct).length;
    const topicTotal = topicQs.length;

    const item = document.createElement('div');
    item.className = 'breakdown-item';
    item.innerHTML = `
      <span class="breakdown-icon">${t.icon}</span>
      <div>
        <div class="breakdown-label">${t.label}</div>
        <div class="breakdown-score ${topicCorrect === topicTotal ? 'good' : 'bad'}">${topicCorrect}/${topicTotal}</div>
      </div>
    `;
    breakdown.appendChild(item);
  });

  // Action buttons
  document.getElementById('btn-retake-quiz').onclick = () => {
    resultsScreen.classList.remove('visible');
    startQuiz();
  };

  document.getElementById('btn-return-training').onclick = () => {
    resultsScreen.classList.remove('visible');
  };
}

// --- Internal ---

function renderQuestion() {
  const q = QUESTIONS[currentQuestionIndex];
  const total = QUESTIONS.length;

  // Progress
  document.querySelector('.quiz-progress-fill').style.width =
    `${((currentQuestionIndex) / total) * 100}%`;
  document.getElementById('quiz-progress-text').textContent =
    `Question ${currentQuestionIndex + 1} of ${total}`;

  // Question
  document.querySelector('.quiz-question-number').textContent =
    `Question ${currentQuestionIndex + 1}`;
  document.querySelector('.quiz-question-text').textContent = q.question;

  // Options
  const container = document.getElementById('quiz-options');
  container.innerHTML = '';

  const feedbackEl = document.getElementById('quiz-feedback');
  feedbackEl.className = 'quiz-feedback';
  feedbackEl.textContent = '';

  const nextBtn = document.getElementById('btn-quiz-next');
  nextBtn.disabled = true;
  nextBtn.textContent = currentQuestionIndex < total - 1 ? 'Next Question →' : 'See Results';

  let answered = false;
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt}</span>`;

    btn.onclick = () => {
      if (answered) return;
      answered = true;
      answers[currentQuestionIndex] = i;

      // Highlight
      container.querySelectorAll('.quiz-option').forEach((b, j) => {
        b.disabled = true;
        if (j === q.correct) b.classList.add('correct-answer');
        if (j === i && i !== q.correct) b.classList.add('wrong-answer');
        if (j === i) b.classList.add('selected');
      });

      // Feedback
      if (i === q.correct) {
        feedbackEl.className = 'quiz-feedback visible correct';
        feedbackEl.textContent = `✅ Correct! ${q.explanation}`;
      } else {
        feedbackEl.className = 'quiz-feedback visible incorrect';
        feedbackEl.textContent = `❌ Incorrect. ${q.explanation}`;
      }

      nextBtn.disabled = false;
    };

    container.appendChild(btn);
  });

  // Next button
  nextBtn.onclick = () => {
    if (!answered) return;
    currentQuestionIndex++;
    if (currentQuestionIndex < total) {
      renderQuestion();
    } else {
      showResults();
    }
  };
}

function calculateScore() {
  return QUESTIONS.reduce((score, q, i) => {
    return score + (answers[i] === q.correct ? 1 : 0);
  }, 0);
}

// --- Browser LocalStorage Persistence & History ---
export const STORAGE_KEY = 'cybersafe_last_training_result';
export const HISTORY_KEY = 'cybersafe_training_history';

export function saveTrainingResult(score, total, percentage, status) {
  try {
    const now = new Date();
    const formattedDate = now.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newResult = {
      id: Date.now(),
      score: `${score} / ${total}`,
      scoreRaw: score,
      total: total,
      percentage: `${percentage}%`,
      percentageRaw: percentage,
      status: status,
      result: status,
      date: formattedDate,
      timestamp: now.toISOString()
    };

    // Keep every completed training result stored locally in history array
    const history = getTrainingHistory();
    history.push(newResult);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // Save as last training result
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResult));

    return newResult;
  } catch (e) {
    console.warn('[Storage] Failed to save training result to localStorage:', e);
    return null;
  }
}

export function getTrainingHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Backward compatibility: check if single last result exists
    const lastRaw = localStorage.getItem(STORAGE_KEY);
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      return [last];
    }
    return [];
  } catch (e) {
    console.warn('[Storage] Failed to retrieve training history from localStorage:', e);
    return [];
  }
}

export function getLastTrainingResult() {
  try {
    const history = getTrainingHistory();
    if (history.length > 0) {
      return history[history.length - 1];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[Storage] Failed to retrieve training result from localStorage:', e);
    return null;
  }
}

export function downloadTrainingResults(format = 'csv') {
  const history = getTrainingHistory();
  if (!history || history.length === 0) {
    return false;
  }

  let blob;
  let filename;

  if (format === 'json') {
    const jsonStr = JSON.stringify(history, null, 2);
    blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    filename = `cybersafe_training_results_${Date.now()}.json`;
  } else {
    // CSV format
    const headers = ['Attempt', 'Date and Time', 'Score', 'Percentage', 'Status'];
    const rows = history.map((item, idx) => {
      const attempt = idx + 1;
      const date = `"${(item.date || '').replace(/"/g, '""')}"`;
      const score = `"${(item.score || '').replace(/"/g, '""')}"`;
      const pct = `"${(item.percentage || '').replace(/"/g, '""')}"`;
      const status = `"${(item.status || '').replace(/"/g, '""')}"`;
      return [attempt, date, score, pct, status].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\r\n');
    blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    filename = `cybersafe_training_results_${Date.now()}.csv`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

