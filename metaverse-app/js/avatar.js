/* ========================================
   avatar.js — Stylish 7-head-tall human avatar
   Realistic proportions with knee joints, fashionable outfit
   ======================================== */

const Avatar = {
    avatars: new Map(),

    create(scene, config) {
        const { id, name, color, x, z } = config;
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;

        // ── Stylish color palette ──────────
        const skinColor = 0xf0c8a0;
        const jacketColor = colorHex;
        const shirtColor = 0xf0ede8;
        const pantsColor = 0x2d2d3d;
        const shoeColor = 0x1a1a1a;
        const beltColor = 0x4a3520;
        const hairColor = new THREE.Color(colorHex).multiplyScalar(0.4).getHex();
        const soleColor = 0x3a3a3a;

        const group = new THREE.Group();

        // ── Head ────────────────────────────
        const headGeo = new THREE.SphereGeometry(0.17, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.20;
        head.castShadow = true;
        group.add(head);

        // Hair — stylish short cut with cap + fringe
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });

        const hairCapGeo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
        hairCap.position.y = 2.23;
        hairCap.castShadow = true;
        group.add(hairCap);

        // Side-swept fringe
        const fringeGeo = new THREE.SphereGeometry(0.07, 8, 8);
        const fringe = new THREE.Mesh(fringeGeo, hairMat);
        fringe.scale.set(1.3, 0.5, 0.9);
        fringe.position.set(0.06, 2.16, 0.13);
        group.add(fringe);

        // Eyes — refined small dots
        const eyeGeo = new THREE.SphereGeometry(0.022, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        [-0.055, 0.055].forEach(offsetX => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(offsetX, 2.21, 0.155);
            group.add(eye);
        });

        // Mouth — subtle
        const mouthGeo = new THREE.SphereGeometry(0.012, 6, 6);
        mouthGeo.scale(1.2, 0.4, 0.4);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc08070 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 2.13, 0.16);
        group.add(mouth);

        // ── Neck ───────────────────────────
        const neckGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.10, 8);
        const neckMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 1.99;
        group.add(neck);

        // ── Shirt collar peek ──────────────
        const collarGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.05, 10);
        const collarMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.position.y = 1.95;
        group.add(collar);

        // ── Jacket (upper torso) ───────────
        const jacketGeo = new THREE.CylinderGeometry(0.20, 0.14, 0.56, 12);
        const jacketMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.65 });
        const jacket = new THREE.Mesh(jacketGeo, jacketMat);
        jacket.position.y = 1.66;
        jacket.castShadow = true;
        group.add(jacket);

        // ── Belt ───────────────────────────
        const beltGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12);
        const beltMat = new THREE.MeshStandardMaterial({ color: beltColor, roughness: 0.5, metalness: 0.15 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.y = 1.37;
        group.add(belt);

        // Belt buckle
        const buckleGeo = new THREE.BoxGeometry(0.035, 0.03, 0.02);
        const buckleMat = new THREE.MeshStandardMaterial({ color: 0xc0a860, roughness: 0.3, metalness: 0.6 });
        const buckle = new THREE.Mesh(buckleGeo, buckleMat);
        buckle.position.set(0, 1.37, 0.155);
        group.add(buckle);

        // ── Pants (lower torso) ────────────
        const pantsGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.22, 12);
        const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
        const pants = new THREE.Mesh(pantsGeo, pantsMat);
        pants.position.y = 1.25;
        pants.castShadow = true;
        group.add(pants);

        // ── Arms (pivot at shoulder) ───────
        [-1, 1].forEach(side => {
            const armPivot = new THREE.Group();
            armPivot.position.set(side * 0.26, 1.88, 0);

            // Upper arm (jacket sleeve)
            const upperArmGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8);
            const upperArmMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.65 });
            const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
            upperArm.position.y = -0.21;
            upperArm.castShadow = true;
            armPivot.add(upperArm);

            // Forearm (skin — rolled-up sleeves look)
            const forearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.32, 8);
            const forearmMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
            const forearm = new THREE.Mesh(forearmGeo, forearmMat);
            forearm.position.y = -0.55;
            forearm.castShadow = true;
            armPivot.add(forearm);

            // Hand
            const handGeo = new THREE.SphereGeometry(0.04, 8, 8);
            const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
            const hand = new THREE.Mesh(handGeo, handMat);
            hand.position.y = -0.76;
            armPivot.add(hand);

            armPivot.userData.isArm = true;
            armPivot.userData.side = side;
            group.add(armPivot);
        });

        // ── Legs (pivot at hip, with knee joint) ──
        [-1, 1].forEach(side => {
            const legPivot = new THREE.Group();
            legPivot.position.set(side * 0.09, 1.14, 0);

            // Thigh
            const thighGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.48, 8);
            const thighMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
            const thigh = new THREE.Mesh(thighGeo, thighMat);
            thigh.position.y = -0.27;
            thigh.castShadow = true;
            legPivot.add(thigh);

            // Knee pivot
            const kneePivot = new THREE.Group();
            kneePivot.position.y = -0.52;

            // Shin
            const shinGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.48, 8);
            const shinMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
            const shin = new THREE.Mesh(shinGeo, shinMat);
            shin.position.y = -0.26;
            shin.castShadow = true;
            kneePivot.add(shin);

            // Shoe
            const shoeGeo = new THREE.BoxGeometry(0.10, 0.08, 0.22);
            const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.4, metalness: 0.05 });
            const shoe = new THREE.Mesh(shoeGeo, shoeMat);
            shoe.position.set(0, -0.56, 0.03);
            kneePivot.add(shoe);

            // Shoe sole accent
            const soleGeo = new THREE.BoxGeometry(0.10, 0.02, 0.23);
            const soleMat = new THREE.MeshStandardMaterial({ color: soleColor, roughness: 0.8 });
            const sole = new THREE.Mesh(soleGeo, soleMat);
            sole.position.set(0, -0.60, 0.03);
            kneePivot.add(sole);

            kneePivot.userData.isKnee = true;
            legPivot.add(kneePivot);

            legPivot.userData.isLeg = true;
            legPivot.userData.side = side;
            group.add(legPivot);
        });

        // ── Name label ──────────────────────
        const nameLabel = this._createTextSprite(name);
        nameLabel.position.y = 2.75;
        nameLabel.scale.set(2, 0.5, 1);
        group.add(nameLabel);

        // ── Emote label ─────────────────────
        const emoteLabel = this._createTextSprite('');
        emoteLabel.position.y = 3.10;
        emoteLabel.scale.set(1.5, 0.5, 1);
        emoteLabel.visible = false;
        group.add(emoteLabel);

        // ── Shadow disc ─────────────────────
        const shadowGeo = new THREE.CircleGeometry(0.28, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.18
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

    _updateKnees(child, targetAngle, lerpFactor) {
        child.children.forEach(part => {
            if (part.userData.isKnee) {
                part.rotation.x = lerpFactor < 1
                    ? Utils.lerp(part.rotation.x, targetAngle, lerpFactor)
                    : targetAngle;
            }
        });
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
                // Walking animation with knee bend
                avatar.walkPhase += dt * 7;

                // Subtle body bob
                g.position.y = Math.abs(Math.sin(avatar.walkPhase * 2)) * 0.025;

                g.children.forEach(child => {
                    if (child.userData.isLeg) {
                        const hipAngle = Math.sin(avatar.walkPhase) * 0.35 * child.userData.side;
                        child.rotation.x = hipAngle;
                        // Knee bends during forward swing
                        this._updateKnees(child, Math.max(0, hipAngle) * 1.4, 1);
                    }
                    if (child.userData.isArm) {
                        child.rotation.x = Math.sin(avatar.walkPhase) * 0.28 * -child.userData.side;
                    }
                });
            } else {
                // Return to idle stance
                g.position.y = Utils.lerp(g.position.y, 0, 0.1);
                g.children.forEach(child => {
                    if (child.userData.isLeg) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.08);
                        this._updateKnees(child, 0, 0.08);
                    }
                    if (child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, 0, 0.08);
                        child.rotation.z = Utils.lerp(child.rotation.z, 0, 0.08);
                    }
                });
            }

            // Dance emote — spin and bounce with knees
            if (avatar.currentEmote === 'dance') {
                avatar.walkPhase += dt * 6;
                g.rotation.y += 0.04;
                g.position.y = Math.abs(Math.sin(time * 4)) * 0.1;
                g.children.forEach(child => {
                    if (child.userData.isArm) {
                        child.rotation.x = Math.sin(time * 5 + child.userData.side) * 0.6;
                        child.rotation.z = Math.sin(time * 3) * 0.2 * child.userData.side;
                    }
                    if (child.userData.isLeg) {
                        const legAngle = Math.sin(time * 4 + child.userData.side) * 0.25;
                        child.rotation.x = legAngle;
                        this._updateKnees(child, Math.max(0, legAngle) * 1.5, 1);
                    }
                });
            }

            // Sit emote — chair pose with knee bend
            if (avatar.currentEmote === 'sit') {
                g.position.y = -0.5;
                g.children.forEach(child => {
                    if (child.userData.isLeg) {
                        child.rotation.x = Utils.lerp(child.rotation.x, -Math.PI / 2, 0.1);
                        this._updateKnees(child, Math.PI / 2, 0.1);
                    }
                    if (child.userData.isArm) {
                        child.rotation.x = Utils.lerp(child.rotation.x, -0.15, 0.08);
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
                        child.rotation.x = -0.6;
                        child.rotation.z = clap * 0.25 * child.userData.side;
                    }
                });
            }
        });
    }
};
