AFRAME.registerComponent('third-person-controller', {
  schema: {
    speed: { type: 'number', default: 2.5 },
    runSpeed: { type: 'number', default: 5 },
    cameraRig: { type: 'selector', default: '#camera-rig' },
  },

  init: function () {
    this.keys = {};
    this.isDragging = false;
    this.pitch = 0.2; // slight down angle
    this.yaw = 0; // camera starts directly behind
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
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
    const dt = timeDelta / 1000;
    
    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = isRunning ? this.data.runSpeed : this.data.speed;
    
    let moveZ = 0;
    let moveX = 0;
    
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    
    const isMoving = moveX !== 0 || moveZ !== 0;
    
    if (isMoving) {
      this.direction.set(moveX, 0, moveZ).normalize();
      this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      
      this.el.object3D.position.addScaledVector(this.direction, speed * dt);
      
      const p = this.el.object3D.position;
      p.y = 0; 
      
      if(p.x > 30) p.x = 30;
      if(p.x < -30) p.x = -30;
      if(p.z > 30) p.z = 30;
      if(p.z < -30) p.z = -30;
      
      const targetAngle = Math.atan2(this.direction.x, this.direction.z);
      
      let currentRotation = this.el.object3D.rotation.y;
      let diff = targetAngle - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.el.object3D.rotation.y += diff * 10 * dt;
    }
    
    if (this.data.cameraRig) {
      const rig = this.data.cameraRig.object3D;
      const distance = 3.5;
      const targetHeight = 1.2; 
      
      const pX = this.el.object3D.position.x;
      const pY = this.el.object3D.position.y + targetHeight;
      const pZ = this.el.object3D.position.z;

      const camX = pX + distance * Math.sin(this.yaw) * Math.cos(this.pitch);
      const camY = pY + distance * Math.sin(this.pitch); // Changed to + so camera goes above player
      const camZ = pZ + distance * Math.cos(this.yaw) * Math.cos(this.pitch);
      
      rig.position.lerp(new THREE.Vector3(camX, camY, camZ), 10 * dt);
      
      const target = new THREE.Vector3(pX, pY, pZ);
      rig.lookAt(target);
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
