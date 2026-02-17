/* ========================================
   controls.js — Player input and camera
   ======================================== */

const Controls = {
    keys: {},
    mouseX: 0,
    mouseY: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    isPointerLocked: false,
    isJumping: false,
    jumpVelocity: 0,
    playerY: 0,

    camera: null,
    cameraOffset: new THREE.Vector3(0, 4, 8),
    cameraLookOffset: new THREE.Vector3(0, 2, 0),
    yaw: 0,
    pitch: 0.3,
    cameraDistance: 8,

    MOVE_SPEED: 12,
    LOOK_SENSITIVITY: 0.002,
    JUMP_FORCE: 8,
    GRAVITY: 20,
    BOUNDARY: 38,
    _initialized: false,

    init(camera, canvas) {
        this.camera = camera;
        this.keys = {};

        // Prevent duplicate event listener registration on re-entry
        if (this._initialized) return;
        this._initialized = true;

        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space' && !this.isJumping && !this._isChatFocused()) {
                this.isJumping = true;
                this.jumpVelocity = this.JUMP_FORCE;
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Desktop-only: pointer lock
        if (!Touch.isMobile) {
            canvas.addEventListener('click', () => {
                if (!this._isChatFocused()) {
                    canvas.requestPointerLock();
                }
            });

            document.addEventListener('pointerlockchange', () => {
                this.isPointerLocked = document.pointerLockElement === canvas;
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isPointerLocked) {
                    this.mouseDeltaX = e.movementX;
                    this.mouseDeltaY = e.movementY;
                }
            });

            // Scroll to zoom
            canvas.addEventListener('wheel', (e) => {
                this.cameraDistance += e.deltaY * 0.01;
                this.cameraDistance = Utils.clamp(this.cameraDistance, 3, 20);
                e.preventDefault();
            }, { passive: false });
        }
    },

    _isChatFocused() {
        return document.activeElement === document.getElementById('chat-input');
    },

    update(dt, playerAvatar) {
        if (!playerAvatar) return;

        // Camera rotation (desktop only — mobile handled by Touch.update)
        if (!Touch.isMobile && this.isPointerLocked) {
            this.yaw -= this.mouseDeltaX * this.LOOK_SENSITIVITY;
            this.pitch -= this.mouseDeltaY * this.LOOK_SENSITIVITY;
            this.pitch = Utils.clamp(this.pitch, -0.5, 1.2);
        }
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        // Keyboard movement (on mobile, Touch.update handles movement)
        if (!Touch.isMobile) {
            let moveX = 0;
            let moveZ = 0;

            if (!this._isChatFocused()) {
                if (this.keys['KeyW'] || this.keys['ArrowUp'])    moveZ -= 1;
                if (this.keys['KeyS'] || this.keys['ArrowDown'])  moveZ += 1;
                if (this.keys['KeyA'] || this.keys['ArrowLeft'])  moveX -= 1;
                if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
            }

            const hasInput = moveX !== 0 || moveZ !== 0;

            if (hasInput) {
                const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
                moveX /= len;
                moveZ /= len;

                const sin = Math.sin(this.yaw);
                const cos = Math.cos(this.yaw);
                const worldX = moveX * cos - moveZ * sin;
                const worldZ = moveX * sin + moveZ * cos;

                playerAvatar.targetX += worldX * this.MOVE_SPEED * dt;
                playerAvatar.targetZ += worldZ * this.MOVE_SPEED * dt;

                playerAvatar.targetX = Utils.clamp(playerAvatar.targetX, -this.BOUNDARY, this.BOUNDARY);
                playerAvatar.targetZ = Utils.clamp(playerAvatar.targetZ, -this.BOUNDARY, this.BOUNDARY);

                playerAvatar.targetRotY = Math.atan2(worldX, worldZ);

                playerAvatar.velocity.x = worldX * this.MOVE_SPEED;
                playerAvatar.velocity.z = worldZ * this.MOVE_SPEED;
            } else {
                playerAvatar.velocity.x = 0;
                playerAvatar.velocity.z = 0;
            }
        }

        // Jump physics
        if (this.isJumping) {
            this.playerY += this.jumpVelocity * dt;
            this.jumpVelocity -= this.GRAVITY * dt;
            if (this.playerY <= 0) {
                this.playerY = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }

        // Camera follow
        const px = playerAvatar.group.position.x;
        const pz = playerAvatar.group.position.z;

        const camX = px + Math.sin(this.yaw) * this.cameraDistance * Math.cos(this.pitch);
        const camY = 1.5 + this.playerY + this.cameraDistance * Math.sin(this.pitch);
        const camZ = pz + Math.cos(this.yaw) * this.cameraDistance * Math.cos(this.pitch);

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(
            px + this.cameraLookOffset.x,
            1.5 + this.playerY + this.cameraLookOffset.y,
            pz + this.cameraLookOffset.z
        );

        // Apply jump offset to avatar
        playerAvatar.group.position.y = Math.max(playerAvatar.group.position.y, this.playerY);
    }
};
