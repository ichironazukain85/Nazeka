/* ========================================
   particles.js — Ambient particle effects
   ======================================== */

const Particles = {
    systems: [],

    PRESETS: {
        plaza: {
            type: 'sparkle',
            count: 80,
            color: 0x88aaff,
            minY: 2,
            maxY: 12,
            speed: 0.3,
            size: 0.15
        },
        gallery: {
            type: 'dust',
            count: 50,
            color: 0xaaaaaa,
            minY: 1,
            maxY: 8,
            speed: 0.1,
            size: 0.08
        },
        garden: {
            type: 'petal',
            count: 60,
            color: 0xffaacc,
            minY: 1,
            maxY: 10,
            speed: 0.5,
            size: 0.2
        },
        lounge: {
            type: 'ember',
            count: 40,
            color: 0xff6622,
            minY: 0.5,
            maxY: 6,
            speed: 0.8,
            size: 0.12
        }
    },

    init(scene, roomId) {
        this.cleanup(scene);

        const preset = this.PRESETS[roomId] || this.PRESETS.plaza;
        this._createSystem(scene, preset);
    },

    _createSystem(scene, preset) {
        const count = preset.count;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const phases = [];
        const spread = 35;

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = Utils.randomRange(-spread, spread);
            positions[i * 3 + 1] = Utils.randomRange(preset.minY, preset.maxY);
            positions[i * 3 + 2] = Utils.randomRange(-spread, spread);

            velocities.push({
                x: Utils.randomRange(-0.3, 0.3) * preset.speed,
                y: Utils.randomRange(-0.1, 0.2) * preset.speed,
                z: Utils.randomRange(-0.3, 0.3) * preset.speed
            });

            phases.push(Math.random() * Math.PI * 2);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: preset.color,
            size: preset.size,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geo, mat);
        scene.add(points);

        this.systems.push({
            points,
            velocities,
            phases,
            preset,
            spread
        });
    },

    update(time) {
        this.systems.forEach(sys => {
            const positions = sys.points.geometry.getAttribute('position');
            const arr = positions.array;
            const count = arr.length / 3;

            for (let i = 0; i < count; i++) {
                const vel = sys.velocities[i];
                const phase = sys.phases[i];

                // Base movement
                arr[i * 3]     += vel.x * 0.016;
                arr[i * 3 + 1] += vel.y * 0.016;
                arr[i * 3 + 2] += vel.z * 0.016;

                // Type-specific behavior
                switch (sys.preset.type) {
                    case 'sparkle':
                        // Float and drift with gentle oscillation
                        arr[i * 3]     += Math.sin(time * 0.5 + phase) * 0.005;
                        arr[i * 3 + 1] += Math.sin(time * 0.3 + phase * 2) * 0.003;
                        break;

                    case 'dust':
                        // Very slow drift
                        arr[i * 3] += Math.sin(time * 0.2 + phase) * 0.002;
                        arr[i * 3 + 1] += Math.sin(time * 0.15 + phase) * 0.001;
                        break;

                    case 'petal':
                        // Falling with lateral sway (like cherry blossom petals)
                        arr[i * 3]     += Math.sin(time * 0.8 + phase) * 0.015;
                        arr[i * 3 + 1] -= 0.01;  // gentle fall
                        arr[i * 3 + 2] += Math.cos(time * 0.6 + phase) * 0.01;
                        break;

                    case 'ember':
                        // Rise upward, sway
                        arr[i * 3]     += Math.sin(time * 1.5 + phase) * 0.01;
                        arr[i * 3 + 1] += 0.015;  // rise
                        arr[i * 3 + 2] += Math.cos(time * 1.2 + phase) * 0.008;
                        break;
                }

                // Wrap around boundaries
                if (arr[i * 3] > sys.spread) arr[i * 3] = -sys.spread;
                if (arr[i * 3] < -sys.spread) arr[i * 3] = sys.spread;
                if (arr[i * 3 + 2] > sys.spread) arr[i * 3 + 2] = -sys.spread;
                if (arr[i * 3 + 2] < -sys.spread) arr[i * 3 + 2] = sys.spread;

                // Y bounds: wrap
                if (arr[i * 3 + 1] > sys.preset.maxY) {
                    arr[i * 3 + 1] = sys.preset.minY;
                }
                if (arr[i * 3 + 1] < sys.preset.minY) {
                    arr[i * 3 + 1] = sys.preset.maxY;
                }
            }

            positions.needsUpdate = true;

            // Pulsing opacity for sparkle and ember
            if (sys.preset.type === 'sparkle' || sys.preset.type === 'ember') {
                sys.points.material.opacity = 0.4 + Math.sin(time * 2) * 0.3;
            }
        });
    },

    cleanup(scene) {
        this.systems.forEach(sys => {
            scene.remove(sys.points);
            sys.points.geometry.dispose();
            sys.points.material.dispose();
        });
        this.systems = [];
    }
};
