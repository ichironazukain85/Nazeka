/* ========================================
   portals.js — Soft pastel teleportation portals
   Metapa-style: gentle glowing arches
   ======================================== */

const Portals = {
    portals: [],
    portalMeshes: [],
    PORTAL_RADIUS: 2,
    TELEPORT_DISTANCE: 3,
    cooldown: false,

    PORTAL_CONFIGS: {
        plaza:   [
            { targetRoom: 'gallery',  x: -30, z: -30, label: 'ギャラリー' },
            { targetRoom: 'garden',   x:  30, z: -30, label: 'ガーデン' },
            { targetRoom: 'lounge',   x:   0, z:  30, label: 'ラウンジ' }
        ],
        gallery: [
            { targetRoom: 'plaza',   x:  0,  z:  30, label: 'ひろば' },
            { targetRoom: 'garden',  x: -25, z: -25, label: 'ガーデン' },
            { targetRoom: 'lounge',  x:  25, z: -25, label: 'ラウンジ' }
        ],
        garden: [
            { targetRoom: 'plaza',   x:  0,  z:  30, label: 'ひろば' },
            { targetRoom: 'gallery', x: -25, z: -25, label: 'ギャラリー' },
            { targetRoom: 'lounge',  x:  25, z: -25, label: 'ラウンジ' }
        ],
        lounge: [
            { targetRoom: 'plaza',   x:  0,  z: -30, label: 'ひろば' },
            { targetRoom: 'gallery', x: -25, z:  25, label: 'ギャラリー' },
            { targetRoom: 'garden',  x:  25, z:  25, label: 'ガーデン' }
        ]
    },

    init(scene, roomId) {
        this.cleanup(scene);
        this.cooldown = false;

        (this.PORTAL_CONFIGS[roomId] || []).forEach(cfg => {
            const group = new THREE.Group();
            group.position.set(cfg.x, 0, cfg.z);

            // Arch ring — soft pastel
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(this.PORTAL_RADIUS, 0.18, 8, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xa5d6a7,
                    emissive: 0x81c784,
                    emissiveIntensity: 0.4,
                    roughness: 0.5
                })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 2;
            group.add(ring);

            // Inner glow disc
            const disc = new THREE.Mesh(
                new THREE.CircleGeometry(this.PORTAL_RADIUS - 0.2, 32),
                new THREE.MeshBasicMaterial({
                    color: 0xc8e6c9,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide
                })
            );
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = 2;
            group.add(disc);

            // Soft light
            const light = new THREE.PointLight(0xa5d6a7, 0.5, 10);
            light.position.y = 2;
            group.add(light);

            // Label
            const label = this._createLabel(cfg.label);
            label.position.y = 4.2;
            label.scale.set(3, 0.75, 1);
            group.add(label);

            // Ground ring
            const groundRing = new THREE.Mesh(
                new THREE.RingGeometry(this.PORTAL_RADIUS - 0.3, this.PORTAL_RADIUS + 0.3, 32),
                new THREE.MeshBasicMaterial({ color: 0xa5d6a7, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
            );
            groundRing.rotation.x = -Math.PI / 2;
            groundRing.position.y = 0.02;
            group.add(groundRing);

            scene.add(group);
            this.portals.push({ group, config: cfg, disc, ring, light });
            this.portalMeshes.push(group);
        });
    },

    _createLabel(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(24, 8); ctx.lineTo(232, 8);
        ctx.quadraticCurveTo(248, 8, 248, 24); ctx.lineTo(248, 40);
        ctx.quadraticCurveTo(248, 56, 232, 56); ctx.lineTo(24, 56);
        ctx.quadraticCurveTo(8, 56, 8, 40); ctx.lineTo(8, 24);
        ctx.quadraticCurveTo(8, 8, 24, 8);
        ctx.closePath(); ctx.fill();

        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5c6bc0';
        ctx.fillText('\u2192 ' + text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    },

    update(time, playerAvatar) {
        if (!playerAvatar) return null;
        const px = playerAvatar.group.position.x;
        const pz = playerAvatar.group.position.z;

        let nearest = null, nearestDist = Infinity;

        this.portals.forEach(portal => {
            const dx = px - portal.config.x, dz = pz - portal.config.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            portal.disc.material.opacity = 0.2 + Math.sin(time * 2) * 0.08;
            portal.ring.rotation.z = time * 0.3;
            portal.light.intensity = 0.4 + Math.sin(time * 1.5) * 0.15;

            if (dist < 8) {
                const prox = 1 - dist / 8;
                portal.disc.material.opacity = 0.2 + prox * 0.3;
                portal.light.intensity = 0.5 + prox * 0.8;
            }

            if (dist < nearestDist) { nearestDist = dist; nearest = portal; }
        });

        if (nearest && nearestDist < this.TELEPORT_DISTANCE && !this.cooldown) {
            return nearest.config.targetRoom;
        }
        return null;
    },

    cleanup(scene) {
        this.portals.forEach(p => scene.remove(p.group));
        this.portals = [];
        this.portalMeshes = [];
    }
};
