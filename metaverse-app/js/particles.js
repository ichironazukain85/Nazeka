/* ========================================
   particles.js — Soft ambient particles
   Metapa-style: gentle, pastel
   ======================================== */

const Particles = {
    systems: [],

    PRESETS: {
        plaza:   { type: 'sparkle', count: 50, color: 0xfff9c4, minY: 2, maxY: 10, speed: 0.2, size: 0.1 },
        gallery: { type: 'dust',    count: 35, color: 0xd1c4e9, minY: 1, maxY: 7,  speed: 0.08, size: 0.06 },
        garden:  { type: 'petal',   count: 45, color: 0xf8bbd0, minY: 1, maxY: 9,  speed: 0.3, size: 0.15 },
        lounge:  { type: 'ember',   count: 25, color: 0xffe0b2, minY: 0.5, maxY: 5, speed: 0.4, size: 0.08 }
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
                x: Utils.randomRange(-0.2, 0.2) * preset.speed,
                y: Utils.randomRange(-0.1, 0.1) * preset.speed,
                z: Utils.randomRange(-0.2, 0.2) * preset.speed
            });
            phases.push(Math.random() * Math.PI * 2);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: preset.color, size: preset.size,
            transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        this.systems.push({ points, velocities, phases, preset, spread });
    },

    update(time) {
        this.systems.forEach(sys => {
            const pos = sys.points.geometry.getAttribute('position');
            const arr = pos.array;
            const count = arr.length / 3;

            for (let i = 0; i < count; i++) {
                const v = sys.velocities[i], ph = sys.phases[i];
                arr[i * 3] += v.x * 0.016;
                arr[i * 3 + 1] += v.y * 0.016;
                arr[i * 3 + 2] += v.z * 0.016;

                switch (sys.preset.type) {
                    case 'sparkle':
                        arr[i * 3] += Math.sin(time * 0.4 + ph) * 0.003;
                        arr[i * 3 + 1] += Math.sin(time * 0.3 + ph * 2) * 0.002;
                        break;
                    case 'dust':
                        arr[i * 3] += Math.sin(time * 0.15 + ph) * 0.001;
                        break;
                    case 'petal':
                        arr[i * 3] += Math.sin(time * 0.6 + ph) * 0.01;
                        arr[i * 3 + 1] -= 0.008;
                        arr[i * 3 + 2] += Math.cos(time * 0.5 + ph) * 0.007;
                        break;
                    case 'ember':
                        arr[i * 3] += Math.sin(time * 1.0 + ph) * 0.006;
                        arr[i * 3 + 1] += 0.01;
                        break;
                }

                if (arr[i * 3] > sys.spread) arr[i * 3] = -sys.spread;
                if (arr[i * 3] < -sys.spread) arr[i * 3] = sys.spread;
                if (arr[i * 3 + 2] > sys.spread) arr[i * 3 + 2] = -sys.spread;
                if (arr[i * 3 + 2] < -sys.spread) arr[i * 3 + 2] = sys.spread;
                if (arr[i * 3 + 1] > sys.preset.maxY) arr[i * 3 + 1] = sys.preset.minY;
                if (arr[i * 3 + 1] < sys.preset.minY) arr[i * 3 + 1] = sys.preset.maxY;
            }
            pos.needsUpdate = true;

            if (sys.preset.type === 'sparkle') {
                sys.points.material.opacity = 0.3 + Math.sin(time * 1.5) * 0.2;
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
