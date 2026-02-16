/* ========================================
   avatar.js — Avatar creation and management
   ======================================== */

const Avatar = {
    avatars: new Map(), // id -> { group, nameLabel, emoteLabel, config }

    // Capsule shape compatible with Three.js r128 (CapsuleGeometry was added in r138)
    _createCapsuleGeo(radius, halfHeight, capSegs, radialSegs) {
        const top = new THREE.SphereGeometry(radius, radialSegs, capSegs, 0, Math.PI * 2, 0, Math.PI / 2);
        const mid = new THREE.CylinderGeometry(radius, radius, halfHeight, radialSegs, 1, true);
        const bot = new THREE.SphereGeometry(radius, radialSegs, capSegs, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

        top.translate(0, halfHeight / 2, 0);
        bot.translate(0, -halfHeight / 2, 0);

        const merged = new THREE.BufferGeometry();
        const geoms = [top, mid, bot].map(g => {
            const pos = g.getAttribute('position').array;
            const norm = g.getAttribute('normal').array;
            const idx = g.index ? Array.from(g.index.array) : [];
            return { pos, norm, idx };
        });

        let totalVerts = 0;
        let totalIdx = 0;
        geoms.forEach(g => { totalVerts += g.pos.length / 3; totalIdx += g.idx.length; });

        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const indices = [];
        let vertOffset = 0;
        let idxOffset = 0;

        geoms.forEach(g => {
            positions.set(g.pos, vertOffset * 3);
            normals.set(g.norm, vertOffset * 3);
            g.idx.forEach(i => indices.push(i + vertOffset));
            vertOffset += g.pos.length / 3;
        });

        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        merged.setIndex(indices);
        return merged;
    },

    create(scene, config) {
        const { id, name, color, x, z } = config;
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;

        const group = new THREE.Group();

        // Body (capsule shape built from sphere halves + cylinder)
        const bodyGeo = this._createCapsuleGeo(0.5, 1, 4, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.6,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.5;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.5,
            metalness: 0.1,
            emissive: colorHex,
            emissiveIntensity: 0.1
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.7;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        [-0.15, 0.15].forEach(offsetX => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(offsetX, 2.8, 0.38);
            group.add(eye);
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(offsetX, 2.8, 0.42);
            group.add(pupil);
        });

        // Arms (capsule shape)
        const armGeo = this._createCapsuleGeo(0.15, 0.6, 4, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
        [-0.7, 0.7].forEach(offsetX => {
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(offsetX, 1.5, 0);
            arm.castShadow = true;
            arm.userData.isArm = true;
            arm.userData.side = offsetX > 0 ? 1 : -1;
            group.add(arm);
        });

        // Name label (using sprite)
        const nameLabel = this._createTextSprite(name, colorHex);
        nameLabel.position.y = 3.5;
        nameLabel.scale.set(2, 0.5, 1);
        group.add(nameLabel);

        // Emote label (hidden by default)
        const emoteLabel = this._createTextSprite('', 0xffffff);
        emoteLabel.position.y = 4.0;
        emoteLabel.scale.set(1.5, 0.5, 1);
        emoteLabel.visible = false;
        group.add(emoteLabel);

        // Shadow disc
        const shadowGeo = new THREE.CircleGeometry(0.6, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        group.add(shadow);

        group.position.set(x || 0, 0, z || 0);
        scene.add(group);

        const avatarData = {
            group,
            nameLabel,
            emoteLabel,
            config,
            targetX: x || 0,
            targetZ: z || 0,
            targetRotY: 0,
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

    _createTextSprite(text, bgColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 256, 64);

        if (text) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this._drawRoundedRect(ctx, 8, 8, 240, 48, 8);

            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, 128, 32);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        return new THREE.Sprite(mat);
    },

    updateSpriteText(sprite, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this._drawRoundedRect(ctx, 8, 8, 240, 48, 8);

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
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

        const emoteMap = {
            wave: '&#128075;',
            dance: '&#128131;',
            sit: '&#129682;',
            clap: '&#128079;'
        };

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

            // Smooth position interpolation
            g.position.x = Utils.lerp(g.position.x, avatar.targetX, 0.1);
            g.position.z = Utils.lerp(g.position.z, avatar.targetZ, 0.1);

            // Smooth rotation
            const targetRot = avatar.targetRotY;
            let diff = targetRot - g.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            g.rotation.y += diff * 0.1;

            // Walking bob
            const speed = Math.abs(avatar.velocity.x) + Math.abs(avatar.velocity.z);
            if (speed > 0.01) {
                avatar.bobPhase += dt * 8;
                g.position.y = Math.abs(Math.sin(avatar.bobPhase)) * 0.15;

                // Arm swing
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Math.sin(avatar.bobPhase) * 0.5 * child.userData.side;
                    }
                });
            } else {
                g.position.y = Utils.lerp(g.position.y, 0, 0.1);
                // Idle breathing
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.05);
                    }
                });
            }

            // Dance emote
            if (avatar.currentEmote === 'dance') {
                g.rotation.y += 0.05;
                g.position.y = Math.abs(Math.sin(time * 5)) * 0.3;
            }

            // Sit emote
            if (avatar.currentEmote === 'sit') {
                g.position.y = -0.3;
            }
        });
    }
};
