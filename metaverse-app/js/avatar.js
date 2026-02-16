/* ========================================
   avatar.js — Cute egg/bean avatar (Metapa-style)
   Big round head, small body, dot eyes
   ======================================== */

const Avatar = {
    avatars: new Map(),

    create(scene, config) {
        const { id, name, color, x, z } = config;
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;

        const group = new THREE.Group();

        // Body — egg/bean shape (wider bottom sphere + upper body)
        const bodyGeo = new THREE.SphereGeometry(0.55, 16, 16);
        bodyGeo.scale(1, 1.2, 0.9);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.85,
            metalness: 0.0
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        group.add(body);

        // Head — big and round (Metapa proportions: head > body)
        const headGeo = new THREE.SphereGeometry(0.65, 20, 20);
        const headMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.8,
            metalness: 0.0
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.1;
        head.castShadow = true;
        group.add(head);

        // Eyes — simple black dots (Metapa-style)
        const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

        [-0.18, 0.18].forEach(offsetX => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(offsetX, 2.15, 0.58);
            group.add(eye);
        });

        // Cheek blush — soft pink circles
        const blushGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const blushMat = new THREE.MeshBasicMaterial({
            color: 0xf8bbd0,
            transparent: true,
            opacity: 0.5
        });
        [-0.32, 0.32].forEach(offsetX => {
            const blush = new THREE.Mesh(blushGeo, blushMat);
            blush.position.set(offsetX, 2.0, 0.55);
            group.add(blush);
        });

        // Small stubby arms
        const armGeo = new THREE.SphereGeometry(0.15, 8, 8);
        armGeo.scale(1, 1.3, 0.8);
        const armMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.85 });
        [-0.6, 0.6].forEach(offsetX => {
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(offsetX, 1.0, 0);
            arm.castShadow = true;
            arm.userData.isArm = true;
            arm.userData.side = offsetX > 0 ? 1 : -1;
            group.add(arm);
        });

        // Small feet
        const footGeo = new THREE.SphereGeometry(0.15, 8, 8);
        footGeo.scale(1.2, 0.5, 1.3);
        const footMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.85 });
        [-0.2, 0.2].forEach(offsetX => {
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(offsetX, 0.08, 0.05);
            group.add(foot);
        });

        // Name label
        const nameLabel = this._createTextSprite(name);
        nameLabel.position.y = 3.1;
        nameLabel.scale.set(2, 0.5, 1);
        group.add(nameLabel);

        // Emote label
        const emoteLabel = this._createTextSprite('');
        emoteLabel.position.y = 3.6;
        emoteLabel.scale.set(1.5, 0.5, 1);
        emoteLabel.visible = false;
        group.add(emoteLabel);

        // Soft shadow disc
        const shadowGeo = new THREE.CircleGeometry(0.5, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.12
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        group.add(shadow);

        group.position.set(x || 0, 0, z || 0);
        scene.add(group);

        const avatarData = {
            group, nameLabel, emoteLabel, config,
            targetX: x || 0, targetZ: z || 0, targetRotY: 0,
            velocity: { x: 0, z: 0 },
            isMoving: false,
            bobPhase: Math.random() * Math.PI * 2,
            emoteTimeout: null,
            currentEmote: null
        };

        this.avatars.set(id, avatarData);
        return avatarData;
    },

    _drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    },

    _createTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        if (text) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            this._drawRoundedRect(ctx, 16, 8, 224, 48, 24);

            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#5a5a6a';
            ctx.fillText(text, 128, 32);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        return new THREE.Sprite(mat);
    },

    updateSpriteText(sprite, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this._drawRoundedRect(ctx, 16, 8, 224, 48, 24);

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5a5a6a';
        ctx.fillText(text, 128, 32);

        sprite.material.map.dispose();
        sprite.material.map = new THREE.CanvasTexture(canvas);
        sprite.material.map.needsUpdate = true;
    },

    remove(scene, id) {
        const avatar = this.avatars.get(id);
        if (!avatar) return;
        scene.remove(avatar.group);
        this.avatars.delete(id);
    },

    playEmote(id, emoteType) {
        const avatar = this.avatars.get(id);
        if (!avatar) return;

        const emoteMap = { wave: '\u{1F44B}', dance: '\u{1F483}', sit: '\u{1FA91}', clap: '\u{1F44F}' };
        const emoji = emoteMap[emoteType] || emoteType;
        avatar.currentEmote = emoteType;
        avatar.emoteLabel.visible = true;
        this.updateSpriteText(avatar.emoteLabel, emoji);

        if (avatar.emoteTimeout) clearTimeout(avatar.emoteTimeout);
        avatar.emoteTimeout = setTimeout(() => {
            avatar.emoteLabel.visible = false;
            avatar.currentEmote = null;
        }, 3000);
    },

    update(time, dt) {
        this.avatars.forEach((avatar) => {
            const g = avatar.group;

            g.position.x = Utils.lerp(g.position.x, avatar.targetX, 0.1);
            g.position.z = Utils.lerp(g.position.z, avatar.targetZ, 0.1);

            let diff = avatar.targetRotY - g.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            g.rotation.y += diff * 0.1;

            const speed = Math.abs(avatar.velocity.x) + Math.abs(avatar.velocity.z);
            if (speed > 0.01) {
                avatar.bobPhase += dt * 6;
                // Cute gentle bounce
                g.position.y = Math.abs(Math.sin(avatar.bobPhase)) * 0.12;

                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Math.sin(avatar.bobPhase) * 0.4 * child.userData.side;
                    }
                });
            } else {
                g.position.y = Utils.lerp(g.position.y, 0, 0.1);
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.05);
                    }
                });
            }

            // Dance: gentle sway
            if (avatar.currentEmote === 'dance') {
                g.rotation.y += 0.04;
                g.position.y = Math.abs(Math.sin(time * 4)) * 0.2;
            }

            if (avatar.currentEmote === 'sit') {
                g.position.y = -0.25;
            }
        });
    }
};
