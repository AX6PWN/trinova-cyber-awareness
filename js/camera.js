/* ============================================================
   CAMERA MODULE — Smooth camera focus and reset
   ============================================================ */

let isAnimating = false;

/**
 * Smoothly rotate the camera toward a target rotation.
 * Uses the camera-rig entity to avoid conflicting with look-controls.
 *
 * @param {Object} targetRotation — { x, y, z } in degrees
 * @param {number} duration — animation duration in ms (default 1200)
 * @returns {Promise} resolves when animation completes
 */
export function focusCamera(targetRotation, duration = 1200) {
  return new Promise((resolve) => {
    if (isAnimating) {
      resolve();
      return;
    }

    const cameraEl = document.querySelector('[camera]');
    const lookControls = cameraEl?.components?.['look-controls'];

    if (!cameraEl || !lookControls) {
      resolve();
      return;
    }

    isAnimating = true;

    // Read current look-controls pitch/yaw
    const currentYaw = THREE.MathUtils.radToDeg(lookControls.yawObject.rotation.y);
    const currentPitch = THREE.MathUtils.radToDeg(lookControls.pitchObject.rotation.x);

    // Target yaw/pitch
    const targetYaw = targetRotation.y;
    const targetPitch = targetRotation.x || 0;

    // Calculate shortest yaw path with robust modulo wrapping
    let deltaYaw = ((targetYaw - currentYaw) % 360 + 540) % 360 - 180;
    const deltaPitch = targetPitch - currentPitch;

    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Ease in-out cubic
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const newYaw = currentYaw + deltaYaw * eased;
      const newPitch = currentPitch + deltaPitch * eased;

      // Apply to look-controls internal objects
      lookControls.yawObject.rotation.y = THREE.MathUtils.degToRad(newYaw);
      lookControls.pitchObject.rotation.x = THREE.MathUtils.degToRad(newPitch);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimating = false;
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Reset camera to default workspace-looking orientation.
 */
export function resetCamera() {
  return focusCamera({ x: -16, y: 30, z: 0 }, 800);
}

/**
 * Check if camera is currently animating.
 */
export function isCameraAnimating() {
  return isAnimating;
}
