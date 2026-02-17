/* ========================================
   avatar.js — Human-shaped avatar with walking animation
   Cute chibi proportions: big head, short body, visible legs
   ======================================== */

const Avatar = {
    avatars: new Map(),

    create(scene, config) {
        const { id, name, color, x, z } = config;
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;
        const skinColor = 0xf0c8a0;
        const shoeColor = new THREE.Color(colorHex).multiplyScalar(0.5).getHex();
        const pantsColor = new THREE.Color(colorHex).multiplyScalar(0.6).getHex();

        const group = new THREE.Group();

        // ── Head ────────────────────────────
        const headGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.25;
        head.castShadow = true;
        group.add(head);

        // Hair — cap on top of head
        const hairGeo = new THREE.SphereGeometry(0.50, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const hairMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 2.28;
        hair.castShadow = true;
        group.add(hair);

        // Eyes — simple black dots
        const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        [-0.14, 0.14].forEach(offsetX => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(offsetX, 2.28, 0.43);
            group.add(eye);
        });

        // Cheek blush
        const blushGeo = new THREE.SphereGeometry(0.055, 8, 8);
        const blushMat = new THREE.MeshBasicMaterial({
            color: 0xf8a0a0, transparent: true, opacity: 0.45
        });
        [-0.26, 0.26].forEach(offsetX => {
            const blush = new THREE.Mesh(blushGeo, blushMat);
            blush.position.set(offsetX, 2.18, 0.40);
            group.add(blush);
        });

        // Mouth — small curve
        const mouthGeo = new THREE.SphereGeometry(0.025, 6, 6);
        mouthGeo.scale(2.0, 0.6, 0.5);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc07060 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 2.14, 0.44);
        group.add(mouth);

        // ── Torso ───────────────────────────
        const torsoGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.7, 12);
        const torsoMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.45;
        torso.castShadow = true;
        group.add(torso);

        // ── Arms (pivot-based for swing animation) ──
        [-1, 1].forEach(side => {
            const armPivot = new THREE.Group();
            armPivot.position.set(side * 0.38, 1.72, 0);

            // Upper arm
            const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.y = -0.25;
            arm.castShadow = true;
            armPivot.add(arm);

            // Hand
            const handGeo = new THREE.SphereGeometry(0.07, 8, 8);
            const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
            const hand = new THREE.Mesh(handGeo, handMat);
            hand.position.y = -0.52;
            armPivot.add(hand);

            armPivot.userData.isArm = true;
            armPivot.userData.side = side;
            group.add(armPivot);
        });

        // ── Legs (pivot-based for walk animation) ──
        [-1, 1].forEach(side => {
            const legPivot = new THREE.Group();
            legPivot.position.set(side * 0.13, 1.08, 0);

            // Thigh/leg
            const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.75, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.y = -0.4;
            leg.castShadow = true;
            legPivot.add(leg);

            // Foot/shoe
            const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.24);
            const footMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.7 });
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(0, -0.82, 0.04);
            legPivot.add(foot);

            legPivot.userData.isLeg = true;
            legPivot.userData.side = side;
            group.add(legPivot);
        });

        // ── Name label ──────────────────────
        const nameLabel = this._createTextSprite(name);
        nameLabel.position.y = 3.1;
        nameLabel.scale.set(2, 0.5, 1);
        group.add(nameLabel);

        // ── Emote label ─────────────────────
        const emoteLabel = this._createTextSprite('');
        emoteLabel.position.y = 3.6;
        emoteLabel.scale.set(1.5, 0.5, 1);
        emoteLabel.visible = false;
        group.add(emoteLabel);

        // ── Shadow disc ─────────────────────
        const shadowGeo = new THREE.CircleGeometry(0.4, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.15
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
            walkPhase: Math.random() * Math.PI * 2,
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

            // Smooth position interpolation
            g.position.x = Utils.lerp(g.position.x, avatar.targetX, 0.1);
            g.position.z = Utils.lerp(g.position.z, avatar.targetZ, 0.1);

            // Smooth rotation
            let diff = avatar.targetRotY - g.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            g.rotation.y += diff * 0.1;

            const speed = Math.abs(avatar.velocity.x) + Math.abs(avatar.velocity.z);

            if (speed > 0.01) {
                // Walking animation
                avatar.walkPhase += dt * 8;

                // Subtle body bob
                g.position.y = Math.abs(Math.sin(avatar.walkPhase * 2)) * 0.05;

                g.children.forEach(child => {
                    if (child.userData.isLeg) {
                        // Legs swing forward/backward alternately
                        child.rotation.x = Math.sin(avatar.walkPhase) * 0.6 * child.userData.side;
                    }
                    if (child.userData.isArm) {
                        // Arms swing opposite to legs
                        child.rotation.x = Math.sin(avatar.walkPhase) * 0.45 * -child.userData.side;
                    }
                });
            } else {
                // Return to idle stance
                g.position.y = Utils.lerp(g.position.y, 0, 0.1);
                g.children.forEach(child => {
                    if (child.userData.isLeg || child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.08);
                    }
                });
            }

            // Dance emote — spin and bounce
            if (avatar.currentEmote === 'dance') {
                avatar.walkPhase += dt * 6;
                g.rotation.y += 0.04;
                g.position.y = Math.abs(Math.sin(time * 4)) * 0.15;
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Math.sin(time * 5 + child.userData.side) * 0.8;
                        child.rotation.z = Math.sin(time * 3) * 0.3 * child.userData.side;
                    }
                    if (child.userData.isLeg) {
                        child.rotation.x = Math.sin(time * 4 + child.userData.side) * 0.3;
                    }
                });
            }

            // Sit emote — bend legs forward
            if (avatar.currentEmote === 'sit') {
                g.position.y = -0.4;
                g.children.forEach(child => {
                    if (child.userData.isLeg) {
                        child.rotation.x = Utils.lerp(child.rotation.x, -Math.PI / 3, 0.1);
                    }
                    if (child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.08);
                    }
                });
            }

            // Wave emote — raise one arm
            if (avatar.currentEmote === 'wave') {
                g.children.forEach(child => {
                    if (child.userData.isArm && child.userData.side === 1) {
                        child.rotation.x = -0.3;
                        child.rotation.z = Math.sin(time * 6) * 0.3 - 1.2;
                    }
                });
            }

            // Clap emote — both arms forward
            if (avatar.currentEmote === 'clap') {
                const clap = Math.sin(time * 8);
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = -0.8;
                        child.rotation.z = clap * 0.3 * child.userData.side;
                    }
                });
            }
        });
    }
};
