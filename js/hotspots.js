/* ============================================================
   HOTSPOTS MODULE — Data-driven hotspot manager
   ============================================================ */

// --- Billboard Component for Hotspots ---
if (typeof AFRAME !== 'undefined' && !AFRAME.components['hotspot-billboard']) {
  const _camWorldPos = new THREE.Vector3();
  AFRAME.registerComponent('hotspot-billboard', {
    tick: function () {
      const scene = this.el.sceneEl;
      if (scene && scene.camera) {
        scene.camera.getWorldPosition(_camWorldPos);
        this.el.object3D.lookAt(_camWorldPos);
      }
    }
  });
}

// --- Hotspot Data Configuration ---
export const HOTSPOT_DATA = [
  {
    id: 'phishing',
    badgeNumber: '',
    title: 'Phishing',
    icon: '✉️',
    iconAlt: '📧',
    tooltip: 'Phishing: Spot the warning signs',
    cssClass: 'phishing',
    position: { x: -9.35, y: 1.34, z: 3.65 },
    cameraTarget: { x: -7, y: 90, z: 0 },
    topic: {
      subtitle: 'Email & Message Threats',
      whatIsIt: 'Phishing is a deceptive attempt to trick you into revealing personal information, credentials, or taking an unsafe action, usually through fake emails, messages, or websites that impersonate trusted organisations.',
      redFlags: [
        'Urgent or threatening language demanding immediate action',
        'Suspicious or misspelled sender email address',
        'Unexpected attachments or links',
        'Mismatched URLs (hover to check before clicking)',
        'Requests for passwords, financial info, or personal data'
      ],
      scenario: {
        text: 'You receive an email from "IT-Support@universlty.ac.uk" saying your account will be locked in 24 hours unless you verify your credentials immediately via the link provided.',
        question: 'What should you do?',
        options: [
          { text: 'Click the link and enter your credentials quickly', correct: false },
          { text: 'Forward it to the real IT department and do NOT click the link', correct: true },
          { text: 'Reply asking if it is legitimate', correct: false },
          { text: 'Ignore it entirely without reporting', correct: false }
        ],
        correctFeedback: '✅ Correct! Always verify suspicious emails through official channels. Notice the misspelled domain "universlty", a classic phishing red flag.',
        incorrectFeedback: '❌ Not quite. The email has several red flags: misspelled domain, urgency pressure, and credential request. Always report suspicious emails to your IT department without clicking any links.'
      }
    }
  },
  {
    id: 'passwords',
    badgeNumber: '',
    title: 'Passwords',
    icon: '🔒',
    iconAlt: '🔑',
    tooltip: 'Passwords: Build stronger account protection',
    cssClass: 'passwords',
    position: { x: -8.80, y: 1.18, z: 3.48 },
    cameraTarget: { x: -16, y: 92, z: 0 },
    topic: {
      subtitle: 'Account & Credential Security',
      whatIsIt: 'Passwords are the first line of defence for your digital accounts. Weak or reused passwords are one of the most common causes of data breaches; attackers can crack simple passwords in seconds using automated tools.',
      redFlags: [
        'Using the same password across multiple accounts',
        'Passwords shorter than 12 characters',
        'Using personal information (birthdays, pet names)',
        'Writing passwords on sticky notes near your computer',
        'Sharing passwords with colleagues via email or chat'
      ],
      scenario: {
        text: 'Your colleague asks you to share your login credentials so they can access a shared drive while you are on leave.',
        question: 'What is the best response?',
        options: [
          { text: 'Share your password because they need it for work', correct: false },
          { text: 'Send it via encrypted email for safety', correct: false },
          { text: 'Decline and ask IT to set up proper shared access', correct: true },
          { text: 'Write it on a note and leave it in your desk drawer', correct: false }
        ],
        correctFeedback: '✅ Correct! Never share your credentials. IT can set up proper access controls, shared folders, or delegate permissions without compromising your account.',
        incorrectFeedback: '❌ Not quite. Sharing passwords, even with trusted colleagues, violates security policy and creates accountability gaps. Always use proper access management through IT.'
      }
    }
  },
  {
    id: 'mfa',
    badgeNumber: '',
    title: 'Multi-Factor Authentication',
    icon: '🛡️',
    iconAlt: '📱',
    tooltip: 'MFA: Stop unauthorized account access',
    cssClass: 'mfa',
    position: { x: -8.85, y: 1.25, z: 4.15 },
    cameraTarget: { x: -16, y: 65, z: 0 },
    topic: {
      subtitle: 'Authentication & Access Control',
      whatIsIt: 'Multi-Factor Authentication (MFA) adds an extra layer of security by requiring two or more verification factors: something you know (password), something you have (phone/token), or something you are (fingerprint). Even if your password is stolen, MFA blocks unauthorised access.',
      redFlags: [
        'Receiving MFA codes you did not request (someone may have your password)',
        'Being asked to share or forward your MFA code',
        'Phone calls claiming to be IT asking for your verification code',
        'Disabling MFA because it is "inconvenient"',
        'Using SMS-only MFA when app-based options are available'
      ],
      scenario: {
        text: 'You receive a phone call from someone claiming to be from your university IT helpdesk. They say there has been a security breach and they need the 6-digit code that was just sent to your phone to "secure your account".',
        question: 'What should you do?',
        options: [
          { text: 'Read them the code because they said they are from IT', correct: false },
          { text: 'Hang up, never share MFA codes, and call IT directly to verify', correct: true },
          { text: 'Ask them to prove they are from IT before sharing', correct: false },
          { text: 'Share only the first 3 digits for partial verification', correct: false }
        ],
        correctFeedback: '✅ Correct! Legitimate IT staff will never ask for your MFA code. An unsolicited code means someone already has your password: change it immediately and report the incident.',
        incorrectFeedback: '❌ Not quite. No legitimate support agent will ever ask for your MFA code. This is a social engineering attack. Hang up and contact IT through official channels immediately.'
      }
    }
  },
  {
    id: 'social-engineering',
    badgeNumber: '',
    title: 'Social Engineering',
    icon: '🎭',
    iconAlt: '☎️',
    tooltip: 'Social Engineering: Stay alert against psychological pressure',
    cssClass: 'social-engineering',
    position: { x: -8.95, y: 1.28, z: 4.60 },
    cameraTarget: { x: -12, y: 48, z: 0 },
    topic: {
      subtitle: 'Human Manipulation Tactics',
      whatIsIt: 'Social engineering exploits human psychology rather than technical vulnerabilities. Attackers use urgency, authority, fear, or trust to manipulate people into revealing information, granting access, or bypassing security procedures.',
      redFlags: [
        'Extreme urgency: "This must be done RIGHT NOW"',
        'Authority pressure: "The CEO personally requested this"',
        'Unusual requests that bypass normal procedures',
        'Emotional manipulation: flattery, sympathy, or threats',
        'Requests to keep the interaction secret or confidential'
      ],
      scenario: {
        text: 'You receive a phone call from someone claiming to be a senior manager from another department. They urgently need you to transfer a file with employee data to an external email address "before the board meeting in 20 minutes."',
        question: 'How should you respond?',
        options: [
          { text: 'Send the file because a senior manager would not lie about this', correct: false },
          { text: 'Send it but CC your own manager for transparency', correct: false },
          { text: 'Politely decline, verify their identity through official channels, and follow data handling procedures', correct: true },
          { text: 'Ask them to send an email request first, then send the file', correct: false }
        ],
        correctFeedback: '✅ Correct! The urgency, authority claims, and request to bypass normal data procedures are classic social engineering tactics. Always verify identity through official directories and follow established data handling policies.',
        incorrectFeedback: '❌ Not quite. This scenario combines urgency, authority, and an unusual request, three hallmarks of social engineering. Always verify identity independently and never bypass data handling procedures, regardless of who appears to be asking.'
      }
    }
  },
  {
    id: 'safe-browsing',
    badgeNumber: '',
    title: 'Safe Browsing',
    icon: '🌐',
    iconAlt: '🔍',
    tooltip: 'Safe Browsing: Check before you click',
    cssClass: 'safe-browsing',
    position: { x: -9.40, y: 1.30, z: 2.30 },
    cameraTarget: { x: -7, y: 135, z: 0 },
    topic: {
      subtitle: 'Web & Download Safety',
      whatIsIt: 'Safe browsing means being vigilant about the websites you visit, links you click, and files you download. Malicious websites can install malware, steal credentials through fake login pages, or exploit browser vulnerabilities, often without any visible warning.',
      redFlags: [
        'Missing HTTPS (no padlock icon) on login or payment pages',
        'Shortened or obfuscated URLs hiding the real destination',
        'Pop-ups claiming your computer is infected',
        'Unexpected file downloads or browser extension requests',
        'Websites with excessive ads, typos, or unprofessional design'
      ],
      scenario: {
        text: 'While researching for a project, you find a free PDF download of an expensive textbook on a website you have never visited before. The URL shows "free-textb00ks-download.xyz" and the browser shows no padlock icon.',
        question: 'What should you do?',
        options: [
          { text: 'Download it because free textbooks save money', correct: false },
          { text: 'Check if the university library has a legitimate digital copy instead', correct: true },
          { text: 'Download it but scan with antivirus afterwards', correct: false },
          { text: 'Use a VPN and then download it for safety', correct: false }
        ],
        correctFeedback: '✅ Correct! The suspicious domain, lack of HTTPS, and "too good to be true" offer are major red flags. Pirated content sites are prime vectors for malware. Always use legitimate sources like your university library.',
        incorrectFeedback: '❌ Not quite. This site has multiple warning signs: suspicious domain with character substitution, no HTTPS, and distribution of copyrighted content. Such sites commonly bundle malware with downloads. Use legitimate library resources instead.'
      }
    }
  },
  {
    id: 'usb-security',
    badgeNumber: '',
    title: 'USB & Device Security',
    icon: '🔌',
    iconAlt: '💾',
    tooltip: 'USB & Device Security: Think before you plug in',
    cssClass: 'usb-security',
    position: { x: -8.82, y: 1.18, z: 3.15 },
    cameraTarget: { x: -16, y: 112, z: 0 },
    topic: {
      subtitle: 'Physical & Removable Media Threats',
      whatIsIt: 'USB drives and unknown devices can be weaponised to deliver malware, steal data, or gain unauthorised access to systems. "USB drop" attacks, where infected drives are deliberately left in public areas, remain one of the most effective physical attack vectors.',
      redFlags: [
        'Finding a USB drive in a car park, hallway, or common area',
        'Receiving a USB drive from an unknown person or organisation',
        'USB drives labelled with enticing names like "Confidential" or "Payroll"',
        'Devices that look like USB drives but could be hardware keyloggers',
        'Charging cables or adapters from unknown sources'
      ],
      scenario: {
        text: 'You find a USB flash drive labelled "Staff Bonus List Q4" in the office car park. You are curious whether it belongs to someone in your department.',
        question: 'What should you do?',
        options: [
          { text: 'Plug it into your computer to check the contents and find the owner', correct: false },
          { text: 'Give it to a colleague and let them check it', correct: false },
          { text: 'Hand it to IT security without plugging it into any device', correct: true },
          { text: 'Plug it into a personal device instead of a work computer', correct: false }
        ],
        correctFeedback: '✅ Correct! Never plug unknown USB devices into any computer. The enticing label is a classic social engineering tactic. IT security has isolated systems to safely examine suspicious devices.',
        incorrectFeedback: '❌ Not quite. This is a classic "USB drop" attack. The enticing label is designed to exploit curiosity. Plugging it into ANY device, work or personal, could install malware. Always hand unknown devices to IT security.'
      }
    }
  }
];

// --- State ---
const completedTopics = new Set();

// --- Public API ---

/**
 * Initialise all hotspots in the A-Frame scene.
 * @param {HTMLElement} scene — the <a-scene> element
 * @param {Function} onHotspotClick — callback(hotspotData)
 */
export function initHotspots(scene, onHotspotClick) {
  const container = document.createElement('a-entity');
  container.setAttribute('id', 'hotspot-container');
  scene.appendChild(container);

  HOTSPOT_DATA.forEach(data => {
    createHotspot(container, data, onHotspotClick);
  });
}

/**
 * Mark a topic as completed and update the hotspot visual.
 */
export function markCompleted(topicId) {
  completedTopics.add(topicId);
  const el = document.querySelector(`#hotspot-${topicId}`);
  if (el) {
    // Change outer rings to vibrant emerald green
    const ring = el.querySelector('.hotspot-ring');
    if (ring) {
      ring.setAttribute('material', 'color', '#10b981');
      ring.setAttribute('material', 'opacity', 0.98);
    }
    const innerRing = el.querySelector('.hotspot-inner-ring');
    if (innerRing) {
      innerRing.setAttribute('material', 'color', '#34d399');
    }
    const dot = el.querySelector('.hotspot-status-dot');
    if (dot) {
      dot.setAttribute('material', 'color', '#10b981');
    }

    // Update label text color to indicate completed
    const label = el.querySelector('.hotspot-label');
    if (label) {
      label.setAttribute('color', '#10b981');
    }

    // Update icon image with emerald glow
    const iconImg = el.querySelector('.hotspot-icon-img');
    const data = getHotspotData(topicId);
    if (iconImg && data) {
      iconImg.setAttribute('src', getIconTexture(data.icon, true));
    }
  }
}

/**
 * Check if a topic is completed.
 */
export function isCompleted(topicId) {
  return completedTopics.has(topicId);
}

/**
 * Get count of completed topics.
 */
export function getCompletedCount() {
  return completedTopics.size;
}

/**
 * Get hotspot data by ID.
 */
export function getHotspotData(id) {
  return HOTSPOT_DATA.find(h => h.id === id);
}

// --- Icon Texture Generator ---
const iconTextureCache = {};
function getIconTexture(icon, isCompleted = false) {
  const cacheKey = `${icon}_${isCompleted}`;
  if (iconTextureCache[cacheKey]) return iconTextureCache[cacheKey];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // Modern ambient glow behind emoji
  ctx.shadowColor = isCompleted ? 'rgba(16, 185, 129, 0.75)' : 'rgba(56, 189, 248, 0.75)';
  ctx.shadowBlur = 18;
  ctx.font = '74px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 64, 68);

  const url = canvas.toDataURL('image/png');
  iconTextureCache[cacheKey] = url;
  return url;
}

// --- Internal ---

function createHotspot(container, data, onHotspotClick) {
  // Main billboard entity
  const el = document.createElement('a-entity');
  el.setAttribute('id', `hotspot-${data.id}`);
  el.setAttribute('class', 'hotspot clickable');
  el.setAttribute('data-hotspot-id', data.id);
  el.setAttribute('position', `${data.position.x} ${data.position.y} ${data.position.z}`);
  el.setAttribute('hotspot-billboard', '');

  // Outer primary pulsing cyber ring
  const ring = document.createElement('a-ring');
  ring.setAttribute('class', 'hotspot-ring');
  ring.setAttribute('radius-inner', '0.048');
  ring.setAttribute('radius-outer', '0.065');
  ring.setAttribute('material', {
    color: '#00d2ff',
    opacity: 0.95,
    side: 'double',
    transparent: true,
    depthTest: false
  });
  ring.setAttribute('animation__pulse', {
    property: 'scale',
    from: '1 1 1',
    to: '1.18 1.18 1.18',
    dur: 1100,
    dir: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });
  el.appendChild(ring);

  // Secondary fine concentric accent ring
  const innerRing = document.createElement('a-ring');
  innerRing.setAttribute('class', 'hotspot-inner-ring');
  innerRing.setAttribute('radius-inner', '0.042');
  innerRing.setAttribute('radius-outer', '0.045');
  innerRing.setAttribute('material', {
    color: '#38bdf8',
    opacity: 0.75,
    side: 'double',
    transparent: true,
    depthTest: false
  });
  el.appendChild(innerRing);

  // Inner dark backdrop circle (glass aesthetic)
  const inner = document.createElement('a-circle');
  inner.setAttribute('radius', '0.044');
  inner.setAttribute('color', '#060b18');
  inner.setAttribute('material', { opacity: 0.95, transparent: true, side: 'double', depthTest: false });
  inner.setAttribute('position', '0 0 0.005');
  el.appendChild(inner);

  // Hotspot emoji icon (crisp 2D texture, NO numbers displayed)
  const iconImg = document.createElement('a-image');
  iconImg.setAttribute('class', 'hotspot-icon-img');
  iconImg.setAttribute('src', getIconTexture(data.icon, false));
  iconImg.setAttribute('width', '0.062');
  iconImg.setAttribute('height', '0.062');
  iconImg.setAttribute('position', '0 0 0.012');
  iconImg.setAttribute('material', { transparent: true, depthTest: false });
  el.appendChild(iconImg);

  // Text label pill background below icon
  const labelText = data.title;
  const labelWidth = Math.max(labelText.length * 0.017 + 0.09, 0.20);
  const labelBg = document.createElement('a-plane');
  labelBg.setAttribute('width', labelWidth);
  labelBg.setAttribute('height', '0.042');
  labelBg.setAttribute('color', '#060c1c');
  labelBg.setAttribute('material', { opacity: 0, transparent: true, side: 'double', depthTest: false });
  labelBg.setAttribute('position', '0 -0.090 0.012');
  el.appendChild(labelBg);

  // Pill subtle glowing border line
  const labelBorder = document.createElement('a-plane');
  labelBorder.setAttribute('width', labelWidth + 0.004);
  labelBorder.setAttribute('height', '0.045');
  labelBorder.setAttribute('color', '#00d2ff');
  labelBorder.setAttribute('material', { opacity: 0, transparent: true, side: 'double', depthTest: false });
  labelBorder.setAttribute('position', '0 -0.090 0.010');
  el.appendChild(labelBorder);

  // Status indicator dot inside label pill (left side)
  const dot = document.createElement('a-circle');
  dot.setAttribute('class', 'hotspot-status-dot');
  dot.setAttribute('radius', '0.0045');
  dot.setAttribute('color', '#00d2ff');
  dot.setAttribute('material', { opacity: 0, transparent: true, depthTest: false });
  dot.setAttribute('position', `${-labelWidth / 2 + 0.016} -0.090 0.016`);
  el.appendChild(dot);

  // Text label with the exact topic name (NO numbers)
  // const label = document.createElement('a-text');
  // label.setAttribute('class', 'hotspot-label');
  // label.setAttribute('value', labelText);
  // label.setAttribute('align', 'center');
  // label.setAttribute('color', '#f7f7f7');
  // label.setAttribute('width', '1.05');
  // label.setAttribute('position', '0.008 -0.090 0.016');
  // label.setAttribute('material', { depthTest: false });
  // el.appendChild(label);

  // Solid invisible hit disc covering entire hotspot area for 100% instant clickability
  const hitArea = document.createElement('a-circle');
  hitArea.setAttribute('radius', '0.12');
  hitArea.setAttribute('material', { opacity: 0.001, transparent: true, side: 'double', depthTest: false });
  hitArea.setAttribute('position', '0 -0.02 0.025');
  hitArea.setAttribute('class', 'clickable');
  el.appendChild(hitArea);

  // Force renderOrder to 9999 so hotspots are never occluded by 3D desk/monitors
  el.addEventListener('loaded', () => {
    el.object3D.renderOrder = 9999;
    el.object3D.traverse(child => {
      child.renderOrder = 9999;
      if (child.material) {
        child.material.depthTest = false;
      }
    });
  });

  // Click handler: instant response on click or tap
  let isHandlingClick = false;
  const triggerClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isHandlingClick) return;
    isHandlingClick = true;
    setTimeout(() => { isHandlingClick = false; }, 300);
    hideTooltip();
    if (onHotspotClick) onHotspotClick(data);
  };

  el.addEventListener('click', triggerClick);
  hitArea.addEventListener('click', triggerClick);

  // Hover & Tooltip
  el.addEventListener('mouseenter', () => {
    if (completedTopics.has(data.id)) return;
    el.setAttribute('scale', '1.2 1.2 1.2');
    showTooltip(data, el);
  });

  el.addEventListener('mouseleave', () => {
    el.setAttribute('scale', '1 1 1');
    hideTooltip();
  });

  container.appendChild(el);
}

// --- Tooltip ---
function showTooltip(data, el3D) {
  const tooltip = document.getElementById('hotspot-tooltip');
  if (!tooltip) return;

  tooltip.querySelector('.tooltip-icon').textContent = data.icon;
  tooltip.querySelector('.tooltip-title').textContent = data.title;
  tooltip.querySelector('.tooltip-desc').textContent = data.tooltip;
  tooltip.classList.add('visible');

  // Position tooltip based on 3D object screen projection
  updateTooltipPosition(el3D);
}

function hideTooltip() {
  const tooltip = document.getElementById('hotspot-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

function updateTooltipPosition(el3D) {
  const tooltip = document.getElementById('hotspot-tooltip');
  const scene = document.querySelector('a-scene');
  if (!tooltip || !scene || !scene.camera) return;

  try {
    const pos = new THREE.Vector3();
    el3D.object3D.getWorldPosition(pos);

    const camera = scene.camera;
    const canvas = scene.canvas;

    pos.project(camera);

    // If hotspot is behind camera view plane, don't display tooltip
    if (pos.z > 1) {
      tooltip.classList.remove('visible');
      return;
    }

    const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-pos.y * 0.5 + 0.5) * canvas.clientHeight;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  } catch (e) {
    // Fallback — center
    tooltip.style.left = '50%';
    tooltip.style.top = '40%';
  }
}
