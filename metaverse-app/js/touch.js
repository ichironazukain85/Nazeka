/* ========================================
   touch.js — Virtual joystick & touch camera
   ======================================== */

const Touch = {
    isMobile: false,

    // Joystick state
    joystickActive: false,
    joystickX: 0,        // -1 to 1
    joystickZ: 0,        // -1 to 1
    joystickTouchId: null,
    joystickOriginX: 0,
    joystickOriginY: 0,
    joystickEl: null,
    joystickKnobEl: null,
    JOYSTICK_RADIUS: 50,

    // Camera touch state
    cameraTouchId: null,
    cameraLastX: 0,
    cameraLastY: 0,
    cameraDeltaX: 0,
    cameraDeltaY: 0,
    CAMERA_SENSITIVITY: 0.004,

    // Pinch zoom state
    pinchStartDist: 0,
    pinchStartZoom: 8,

    detect() {
        this.isMobile = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.innerWidth <= 900);
        return this.isMobile;
    },

    _initialized: false,

    init() {
        if (!this.isMobile) return;
        if (this._initialized) return;
        this._initialized = true;

        this.joystickEl = document.getElementById('joystick');
        this.joystickKnobEl = document.getElementById('joystick-knob');

        const canvas = document.getElementById('metaverse-canvas');

        // Show mobile controls
        document.getElementById('mobile-controls').classList.remove('hidden');
        document.getElementById('controls-hint').classList.add('hidden');

        // Prevent default touch behaviors on canvas
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Joystick touch events
        const joystickArea = document.getElementById('joystick-area');
        joystickArea.addEventListener('touchstart', (e) => this._onJoystickStart(e), { passive: false });
        joystickArea.addEventListener('touchmove', (e) => this._onJoystickMove(e), { passive: false });
        joystickArea.addEventListener('touchend', (e) => this._onJoystickEnd(e), { passive: false });
        joystickArea.addEventListener('touchcancel', (e) => this._onJoystickEnd(e), { passive: false });

        // Camera touch events (on the right side / canvas)
        canvas.addEventListener('touchstart', (e) => this._onCameraStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this._onCameraMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this._onCameraEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this._onCameraEnd(e), { passive: false });

        // Jump button
        const jumpBtn = document.getElementById('btn-jump');
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!Controls.isJumping) {
                Controls.isJumping = true;
                Controls.jumpVelocity = Controls.JUMP_FORCE;
            }
        }, { passive: false });

        // Chat toggle button
        const chatToggle = document.getElementById('btn-chat-toggle');
        chatToggle.addEventListener('click', () => {
            const panel = document.getElementById('chat-panel');
            panel.classList.toggle('chat-collapsed');
            chatToggle.textContent = panel.classList.contains('chat-collapsed') ? 'Chat' : 'Hide';
        });
    },

    // ── Joystick ─────────────────────────

    _onJoystickStart(e) {
        e.preventDefault();
        if (this.joystickTouchId !== null) return;

        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;

        const rect = this.joystickEl.getBoundingClientRect();
        this.joystickOriginX = rect.left + rect.width / 2;
        this.joystickOriginY = rect.top + rect.height / 2;

        this._updateJoystick(touch.clientX, touch.clientY);
    },

    _onJoystickMove(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.joystickTouchId) {
                this._updateJoystick(touch.clientX, touch.clientY);
                return;
            }
        }
    },

    _onJoystickEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.joystickX = 0;
                this.joystickZ = 0;
                this.joystickActive = false;
                this.joystickKnobEl.style.transform = 'translate(-50%, -50%)';
                return;
            }
        }
    },

    _updateJoystick(touchX, touchY) {
        let dx = touchX - this.joystickOriginX;
        let dy = touchY - this.joystickOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.JOYSTICK_RADIUS;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        this.joystickX = dx / maxDist;
        this.joystickZ = dy / maxDist;
        this.joystickActive = Math.abs(this.joystickX) > 0.1 || Math.abs(this.joystickZ) > 0.1;

        this.joystickKnobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    },

    // ── Camera ───────────────────────────

    _onCameraStart(e) {
        e.preventDefault();

        if (e.touches.length === 2) {
            // Pinch zoom start
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            this.pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            this.pinchStartZoom = Controls.cameraDistance;
            this.cameraTouchId = null;
            return;
        }

        if (this.cameraTouchId !== null) return;

        const touch = e.changedTouches[0];
        // Only use touches on the right half (left half is joystick area)
        if (touch.clientX < window.innerWidth * 0.35) return;

        this.cameraTouchId = touch.identifier;
        this.cameraLastX = touch.clientX;
        this.cameraLastY = touch.clientY;
    },

    _onCameraMove(e) {
        e.preventDefault();

        // Pinch zoom
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const scale = this.pinchStartDist / dist;
            Controls.cameraDistance = Utils.clamp(this.pinchStartZoom * scale, 3, 20);
            return;
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.cameraTouchId) {
                this.cameraDeltaX = touch.clientX - this.cameraLastX;
                this.cameraDeltaY = touch.clientY - this.cameraLastY;
                this.cameraLastX = touch.clientX;
                this.cameraLastY = touch.clientY;
                return;
            }
        }
    },

    _onCameraEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.cameraTouchId) {
                this.cameraTouchId = null;
                this.cameraDeltaX = 0;
                this.cameraDeltaY = 0;
                return;
            }
        }
    },

    // ── Update (called each frame) ──────

    update(dt, playerAvatar) {
        if (!this.isMobile || !playerAvatar) return;

        // Apply camera rotation from touch
        if (this.cameraDeltaX !== 0 || this.cameraDeltaY !== 0) {
            Controls.yaw -= this.cameraDeltaX * this.CAMERA_SENSITIVITY;
            Controls.pitch -= this.cameraDeltaY * this.CAMERA_SENSITIVITY;
            Controls.pitch = Utils.clamp(Controls.pitch, -0.5, 1.2);
            this.cameraDeltaX = 0;
            this.cameraDeltaY = 0;
        }

        // Apply joystick movement
        if (this.joystickActive) {
            let moveX = this.joystickX;
            let moveZ = this.joystickZ;

            // Rotate relative to camera yaw
            const sin = Math.sin(Controls.yaw);
            const cos = Math.cos(Controls.yaw);
            const worldX = moveX * cos - moveZ * sin;
            const worldZ = moveX * sin + moveZ * cos;

            playerAvatar.targetX += worldX * Controls.MOVE_SPEED * dt;
            playerAvatar.targetZ += worldZ * Controls.MOVE_SPEED * dt;

            playerAvatar.targetX = Utils.clamp(playerAvatar.targetX, -Controls.BOUNDARY, Controls.BOUNDARY);
            playerAvatar.targetZ = Utils.clamp(playerAvatar.targetZ, -Controls.BOUNDARY, Controls.BOUNDARY);

            playerAvatar.targetRotY = Math.atan2(worldX, worldZ);
            playerAvatar.velocity.x = worldX * Controls.MOVE_SPEED;
            playerAvatar.velocity.z = worldZ * Controls.MOVE_SPEED;
        } else {
            // Only clear velocity if keyboard isn't active either
            const hasKeyboard = Controls.keys['KeyW'] || Controls.keys['KeyS'] ||
                Controls.keys['KeyA'] || Controls.keys['KeyD'] ||
                Controls.keys['ArrowUp'] || Controls.keys['ArrowDown'] ||
                Controls.keys['ArrowLeft'] || Controls.keys['ArrowRight'];
            if (!hasKeyboard) {
                playerAvatar.velocity.x = 0;
                playerAvatar.velocity.z = 0;
            }
        }
    }
};
