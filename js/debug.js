/* ============================================================
   DEBUG MODULE — Developer overlay for hotspot positioning
   Enabled via ?debug=true URL parameter
   ============================================================ */

import { HOTSPOT_DATA } from './hotspots.js';

let debugEnabled = false;

/**
 * Initialise debug mode if enabled via URL parameter.
 */
export function initDebug() {
  const params = new URLSearchParams(window.location.search);
  debugEnabled = params.get('debug') === 'true';

  if (!debugEnabled) return;

  console.log('%c[DEBUG MODE ACTIVE]', 'color: #ffd700; font-weight: bold; font-size: 14px;');
  console.log('Hotspot data:', HOTSPOT_DATA);

  const overlay = document.getElementById('debug-overlay');
  if (overlay) {
    overlay.classList.add('visible');
    renderDebugInfo();
  }

  // Log click positions in scene for repositioning
  const scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', () => {
      logCameraRotation();
    });
  }
}

/**
 * Check if debug mode is enabled.
 */
export function isDebugEnabled() {
  return debugEnabled;
}

// --- Internal ---

function renderDebugInfo() {
  const overlay = document.getElementById('debug-overlay');
  if (!overlay) return;

  let html = '<div class="debug-title">🔧 DEBUG: Hotspot Positions</div>';

  HOTSPOT_DATA.forEach(h => {
    html += `
      <div class="debug-hotspot-entry">
        <strong>${h.id}</strong><br>
        pos: (${h.position.x}, ${h.position.y}, ${h.position.z})<br>
        cam: (${h.cameraTarget.x}, ${h.cameraTarget.y}, ${h.cameraTarget.z})
      </div>
    `;
  });

  html += '<div style="margin-top: 8px; font-size: 10px;">Press C to log camera rotation</div>';

  overlay.innerHTML = html;
}

function logCameraRotation() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
      const cam = document.querySelector('[camera]');
      if (cam) {
        const lookControls = cam.components?.['look-controls'];
        if (lookControls) {
          const yaw = THREE.MathUtils.radToDeg(lookControls.yawObject.rotation.y);
          const pitch = THREE.MathUtils.radToDeg(lookControls.pitchObject.rotation.x);
          console.log(`%c[Camera] Yaw: ${yaw.toFixed(2)}°  Pitch: ${pitch.toFixed(2)}°`,
            'color: #4f8cff; font-weight: bold;');
          console.log(`  → cameraTarget: { x: ${Math.round(pitch)}, y: ${Math.round(yaw)}, z: 0 }`);
        }
      }
    }
  });

  // Also log when clicking on a-sky (empty space) to help position new hotspots
  document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      const cam = document.querySelector('[camera]');
      if (cam && cam.components?.['look-controls']) {
        const lc = cam.components['look-controls'];
        const yaw = lc.yawObject.rotation.y;
        const pitch = lc.pitchObject.rotation.x;

        // Convert camera direction to a point on a sphere of radius 9
        const r = 9;
        const x = -r * Math.sin(yaw) * Math.cos(pitch);
        const y = r * Math.sin(pitch);
        const z = -r * Math.cos(yaw) * Math.cos(pitch);

        console.log(`%c[Hotspot Position] Suggested position where camera is looking:`,
          'color: #34d399; font-weight: bold;');
        console.log(`  → position: { x: ${x.toFixed(1)}, y: ${y.toFixed(1)}, z: ${z.toFixed(1)} }`);
      }
    }
  });
}
