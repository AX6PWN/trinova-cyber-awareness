AFRAME.registerComponent('third-person-controller', {
  schema: {
    speed: { type: 'number', default: 2.5 },
    runSpeed: { type: 'number', default: 5 },
    cameraRig: { type: 'selector', default: '#camera-rig' },
  },

  init: function () {
    this.keys = {};
    this.isDragging = false;
    this.pitch = 0.12; // slight downward tilt
    // yaw = PI places the camera in the open aisle to the north of the
    // workstation, looking south toward the desk and the warehouse beyond.
    this.yaw = Math.PI; // camera starts behind the player, facing the workstation

    // Orbit camera + reusable maths scratch space (no per-frame allocations).
    this.cameraDistance = 4.2;
    this.cameraTargetHeight = 1.35;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._dirVec = new THREE.Vector3();
    this._camPos = new THREE.Vector3();

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // The real camera entity is the single source of truth for forward/right.
    this.cameraEl = document.getElementById('main-camera');
    
    // Bind event listeners
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    // On-screen arrow buttons (d-pad) mirror the WASD/arrow keys exactly.
    this.initMovePad();
    
  },

  onKeyDown: function (e) {
    this.keys[e.code] = true;
    if (e.code === 'KeyE') {
      this.tryInteract();
    }
  },

  onKeyUp: function (e) {
    this.keys[e.code] = false;
  },

  onMouseDown: function (e) {
    // Clicks on the on-screen d-pad must not start a camera drag.
    if (e.target && e.target.closest && e.target.closest('#move-pad')) return;
    if (e.button === 0) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  },

  onMouseMove: function (e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    this.yaw -= deltaX * 0.005;
    this.pitch -= deltaY * 0.005;
    
    // Clamp pitch to avoid gimbal lock
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  },

  onMouseUp: function (e) {
    if (e.button === 0) {
      this.isDragging = false;
    }
  },

  // On-screen d-pad. Writes directly into the same key map the keyboard
  // uses, so the buttons and WASD can never disagree.
  initMovePad: function () {
    const pad = document.getElementById('move-pad');
    if (!pad) return;

    pad.querySelectorAll('[data-code]').forEach((btn) => {
      const code = btn.getAttribute('data-code');

      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys[code] = true;
        btn.classList.add('active');
        if (e.pointerId !== undefined) {
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        }
      };
      const release = (e) => {
        if (e) e.stopPropagation();
        this.keys[code] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  },

  tryInteract: function () {
    const hotspots = document.querySelectorAll('.hotspot');
    const myPos = this.el.object3D.position;
    
    let closest = null;
    let minDist = 3.0;
    
    hotspots.forEach(hs => {
      if (hs.getAttribute('visible') === false) return; 
      const hsPos = hs.object3D.position;
      const dist = myPos.distanceTo(hsPos);
      if (dist < minDist) {
        minDist = dist;
        closest = hs;
      }
    });
    
    if (closest) {
      closest.emit('click');
    }
  },

  tick: function (time, timeDelta) {
    if (timeDelta === 0) return;
    // Clamp dt so a stalled tab never produces a huge movement jump.
    const dt = Math.min(timeDelta / 1000, 0.05);

    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = isRunning ? this.data.runSpeed : this.data.speed;

    const rig = this.data.cameraRig ? this.data.cameraRig.object3D : null;

    // --- 1. Orient the camera to face the player ------------------------
    // Build the rotation explicitly. We deliberately do NOT use
    // Object3D.lookAt(): for a plain (non-camera) entity, lookAt() aims its
    // +Z axis at the target, which leaves the child camera (looking down -Z)
    // pointing AWAY from the scene and reverses every perceived direction.
    if (rig) {
      this._euler.set(-this.pitch, this.yaw, 0, 'YXZ');
      rig.quaternion.setFromEuler(this._euler);
    }

    // --- 2. Build the movement basis from the real camera ---------------
    // forward = camera's -Z projected onto the horizontal plane
    // right    = forward x worldUp (the camera's own right axis)
    // IMPORTANT: use the actual render camera (scene.camera / the camera
    // object), not the a-camera entity wrapper, whose local axes are flipped
    // relative to what the user actually sees.
    let haveForward = false;
    const sceneCam = (this.el.sceneEl && this.el.sceneEl.camera) || null;
    let camObj = sceneCam;
    if (!camObj && this.cameraEl) {
      camObj = (typeof this.cameraEl.getObject3D === 'function' && this.cameraEl.getObject3D('camera'))
        || this.cameraEl.object3D;
    }
    if (camObj) {
      camObj.getWorldDirection(this._forward);
      this._forward.y = 0;
      if (this._forward.lengthSq() > 1e-8) {
        this._forward.normalize();
        haveForward = true;
      }
    }
    if (!haveForward) {
      this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    }
    this._right.crossVectors(this._forward, this._up).normalize();

    // --- 3. Read input (keys and on-screen buttons share this one path) --
    let moveZ = 0; // +1 forward, -1 backward
    let moveX = 0; // +1 right,   -1 left
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;

    // --- 4. Apply movement along the camera basis -----------------------
    this._dirVec.set(
      this._right.x * moveX + this._forward.x * moveZ,
      0,
      this._right.z * moveX + this._forward.z * moveZ
    );

    if (this._dirVec.lengthSq() > 1e-8) {
      this._dirVec.normalize();
      this.direction.copy(this._dirVec);
      this.el.object3D.position.addScaledVector(this._dirVec, speed * dt);

      const p = this.el.object3D.position;
      p.y = 0;
      if (p.x > 30) p.x = 30;
      if (p.x < -30) p.x = -30;
      if (p.z > 30) p.z = 30;
      if (p.z < -30) p.z = -30;

      // Rotate the (invisible) avatar toward its travel direction.
      const targetAngle = Math.atan2(this._dirVec.x, this._dirVec.z);
      let currentRotation = this.el.object3D.rotation.y;
      let diff = targetAngle - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.el.object3D.rotation.y += diff * 10 * dt;
    } else {
      this.direction.set(0, 0, 0);
    }

    // --- 5. Follow the player with the orbit camera ---------------------
    if (rig) {
      const p = this.el.object3D.position;
      const distance = this.cameraDistance;
      const targetHeight = this.cameraTargetHeight;
      const pX = p.x;
      const pY = p.y + targetHeight;
      const pZ = p.z;

      const camX = pX + distance * Math.sin(this.yaw) * Math.cos(this.pitch);
      const camY = pY + distance * Math.sin(this.pitch);
      const camZ = pZ + distance * Math.cos(this.yaw) * Math.cos(this.pitch);

      rig.position.lerp(this._camPos.set(camX, camY, camZ), 10 * dt);
    }
    
    const hotspots = document.querySelectorAll('.hotspot');
    let nearAny = false;
    let closestTitle = "Explore";
    let minDist = 3.0;

    hotspots.forEach(hs => {
      if (hs.getAttribute('visible') !== false) {
        const dist = this.el.object3D.position.distanceTo(hs.object3D.position);
        if (dist < minDist) {
          nearAny = true;
          minDist = dist;
          // Find the title element inside the hotspot
          const titleId = hs.getAttribute('data-hotspot-id');
          // For now just format the ID nicely if we don't have direct access to title
          closestTitle = titleId.replace(/-/g, ' ');
        }
      }
    });
    
    const interactUI = document.getElementById('interact-ui');
    const topicTitleEl = document.getElementById('interact-topic-title');
    if (interactUI) {
      if (nearAny) {
        interactUI.style.display = 'block';
        if (topicTitleEl) topicTitleEl.textContent = closestTitle;
      } else {
        interactUI.style.display = 'none';
      }
    }
  }
});
