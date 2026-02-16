/* ========================================
   portals.js — Room-to-room teleportation portals
   ======================================== */

const Portals = {
    portals: [],
    portalMeshes: [],
    PORTAL_RADIUS: 2,
    TELEPORT_DISTANCE: 3,
    cooldown: false,

    PORTAL_CONFIGS: {
        plaza: [
            { targetRoom: 'gallery',  x: -30, z: -30, label: 'Gallery' },
            { targetRoom: 'garden',   x:  30, z: -30, label: 'Garden' },
            { targetRoom: 'lounge',   x:   0, z:  30, label: 'Lounge' }
        ],
        gallery: [
            { targetRoom: 'plaza',   x:  0,  z:  30, label: 'Plaza' },
            { targetRoom: 'garden',  x: -25, z: -25, label: 'Garden' },
            { targetRoom: 'lounge',  x:  25, z: -25, label: 'Lounge' }
        ],
        garden: [
            { targetRoom: 'plaza',   x:  0,  z:  30, label: 'Plaza' },
            { targetRoom: 'gallery', x: -25, z: -25, label: 'Gallery' },
            { targetRoom: 'lounge',  x:  25, z: -25, label: 'Lounge' }
        ],
        lounge: [
            { targetRoom: 'plaza',   x:  0,  z: -30, label: 'Plaza' },
            { targetRoom: 'gallery', x: -25, z:  25, label: 'Gallery' },
            { targetRoom: 'garden',  x:  25, z:  25, label: 'Garden' }
        ]
    },

    init(scene, roomId) {
        this.cleanup(scene);
        this.cooldown = false;

        const configs = this.PORTAL_CONFIGS[roomId] || [];

        configs.forEach(cfg => {
            const group = new THREE.Group();
            group.position.set(cfg.x, 0, cfg.z);

            // Base ring
            const ringGeo = new THREE.TorusGeometry(this.PORTAL_RADIUS, 0.15, 8, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x6644ff,
                emissive: 0x4422cc,
                emissiveIntensity: 0.8,
                metalness: 0.8,
                roughness: 0.2
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 2;
            group.add(ring);

            // Inner portal surface (shimmering disc)
            const discGeo = new THREE.CircleGeometry(this.PORTAL_RADIUS - 0.2, 32);
            const discMat = new THREE.MeshBasicMaterial({
                color: 0x8866ff,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const disc = new THREE.Mesh(discGeo, discMat);
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = 2;
            group.add(disc);

            // Vertical energy beam
            const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xaa88ff,
                transparent: true,
                opacity: 0.3
            });

            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const beam = new THREE.Mesh(beamGeo, beamMat);
                beam.position.set(
                    Math.cos(angle) * this.PORTAL_RADIUS,
                    2,
                    Math.sin(angle) * this.PORTAL_RADIUS
                );
                group.add(beam);
            }

            // Glow light
            const light = new THREE.PointLight(0x8866ff, 0.8, 10);
            light.position.y = 2;
            group.add(light);

            // Label sprite
            const label = this._createLabel(cfg.label);
            label.position.y = 4.5;
            label.scale.set(3, 0.75, 1);
            group.add(label);

            // Ground indicator ring
            const groundRingGeo = new THREE.RingGeometry(
                this.PORTAL_RADIUS - 0.3,
                this.PORTAL_RADIUS + 0.3,
                32
            );
            const groundRingMat = new THREE.MeshBasicMaterial({
                color: 0x6644ff,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
            groundRing.rotation.x = -Math.PI / 2;
            groundRing.position.y = 0.02;
            group.add(groundRing);

            scene.add(group);

            this.portals.push({
                group,
                config: cfg,
                disc,
                ring,
                light
            });
            this.portalMeshes.push(group);
        });
    },

    _createLabel(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 256, 64);

        // Background pill
        ctx.fillStyle = 'rgba(60, 30, 120, 0.7)';
        ctx.beginPath();
        ctx.moveTo(24, 8);
        ctx.lineTo(232, 8);
        ctx.quadraticCurveTo(248, 8, 248, 24);
        ctx.lineTo(248, 40);
        ctx.quadraticCurveTo(248, 56, 232, 56);
        ctx.lineTo(24, 56);
        ctx.quadraticCurveTo(8, 56, 8, 40);
        ctx.lineTo(8, 24);
        ctx.quadraticCurveTo(8, 8, 24, 8);
        ctx.closePath();
        ctx.fill();

        // Arrow + text
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ccaaff';
        ctx.fillText('\u2192 ' + text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        return new THREE.Sprite(mat);
    },

    update(time, playerAvatar) {
        if (!playerAvatar) return;

        const px = playerAvatar.group.position.x;
        const pz = playerAvatar.group.position.z;

        let nearestPortal = null;
        let nearestDist = Infinity;

        this.portals.forEach(portal => {
            const dx = px - portal.config.x;
            const dz = pz - portal.config.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Animate
            portal.disc.material.opacity = 0.3 + Math.sin(time * 3) * 0.15;
            portal.ring.rotation.z = time * 0.5;
            portal.light.intensity = 0.6 + Math.sin(time * 2) * 0.3;

            // Proximity glow
            if (dist < 8) {
                const proximity = 1 - (dist / 8);
                portal.disc.material.opacity = 0.3 + proximity * 0.4;
                portal.light.intensity = 0.8 + proximity * 1.2;
            }

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPortal = portal;
            }
        });

        // Check teleportation
        if (nearestPortal && nearestDist < this.TELEPORT_DISTANCE && !this.cooldown) {
            return nearestPortal.config.targetRoom;
        }

        return null;
    },

    cleanup(scene) {
        this.portals.forEach(portal => {
            scene.remove(portal.group);
        });
        this.portals = [];
        this.portalMeshes = [];
    }
};
