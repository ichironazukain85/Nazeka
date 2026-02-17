/* ========================================
   sky.js — Gentle day/night cycle
   Metapa-style: soft, warm transitions
   ======================================== */

const Sky = {
    cycleSpeed: 0.015,
    timeOfDay: 0,
    clouds: [],
    sunMesh: null,

    SKY_COLORS: {
        day:     { r: 0.60, g: 0.80, b: 0.95 },
        sunset:  { r: 0.90, g: 0.65, b: 0.50 },
        night:   { r: 0.12, g: 0.14, b: 0.28 },
        dawn:    { r: 0.85, g: 0.70, b: 0.60 }
    },

    init(scene) {
        this._createClouds(scene);
        this._createSun(scene);
    },

    _createClouds(scene) {
        for (let i = 0; i < 12; i++) {
            const g = new THREE.Group();
            const count = Utils.randomInt(3, 5);
            for (let j = 0; j < count; j++) {
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(Utils.randomRange(2, 4), 12, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 1,
                        metalness: 0,
                        transparent: true,
                        opacity: 0.45
                    })
                );
                puff.position.set(j * 3.5 - count, Utils.randomRange(-0.5, 0.5), Utils.randomRange(-1, 1));
                puff.scale.y = 0.5;
                g.add(puff);
            }
            g.position.set(
                Utils.randomRange(-60, 60),
                Utils.randomRange(25, 45),
                Utils.randomRange(-60, 60)
            );
            g.userData.cloudSpeed = Utils.randomRange(0.02, 0.06);
            g.userData.cloudOffset = Utils.randomRange(-60, 60);
            scene.add(g);
            this.clouds.push(g);
        }
    },

    _createSun(scene) {
        const geo = new THREE.SphereGeometry(4, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xfff8e1,
            transparent: true,
            fog: false
        });
        this.sunMesh = new THREE.Mesh(geo, mat);
        scene.add(this.sunMesh);
    },

    update(time, scene, roomConfig) {
        this.timeOfDay = time * this.cycleSpeed;
        const sunAngle = this.timeOfDay % (Math.PI * 2);
        const sunY = Math.cos(sunAngle);
        const sunX = Math.sin(sunAngle);
        const phase = (sunAngle / (Math.PI * 2)) % 1;

        const skyColor = this._getSkyColor(phase);
        scene.background = new THREE.Color(skyColor.r, skyColor.g, skyColor.b);
        if (scene.fog) {
            scene.fog.color.setRGB(skyColor.r, skyColor.g, skyColor.b);
        }

        // Sun
        if (this.sunMesh) {
            this.sunMesh.position.set(sunX * 80, sunY * 80, -40);
            this.sunMesh.material.opacity = Math.max(0, sunY * 0.6 + 0.2);
            this.sunMesh.visible = sunY > -0.2;
        }

        // Clouds drift
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.cloudSpeed;
            if (cloud.position.x > 70) cloud.position.x = -70;

            // Cloud opacity based on time of day
            const nightness = Math.max(0, -sunY);
            cloud.children.forEach(puff => {
                puff.material.opacity = Utils.lerp(0.45, 0.15, nightness);
            });
        });

        // Adjust lighting
        this._updateLighting(scene, sunY, phase);
    },

    _getSkyColor(phase) {
        const c = this.SKY_COLORS;
        let r, g, b;
        if (phase < 0.2) {
            const t = phase / 0.2;
            r = Utils.lerp(c.day.r, c.sunset.r, t);
            g = Utils.lerp(c.day.g, c.sunset.g, t);
            b = Utils.lerp(c.day.b, c.sunset.b, t);
        } else if (phase < 0.3) {
            const t = (phase - 0.2) / 0.1;
            r = Utils.lerp(c.sunset.r, c.night.r, t);
            g = Utils.lerp(c.sunset.g, c.night.g, t);
            b = Utils.lerp(c.sunset.b, c.night.b, t);
        } else if (phase < 0.7) {
            r = c.night.r; g = c.night.g; b = c.night.b;
        } else if (phase < 0.8) {
            const t = (phase - 0.7) / 0.1;
            r = Utils.lerp(c.night.r, c.dawn.r, t);
            g = Utils.lerp(c.night.g, c.dawn.g, t);
            b = Utils.lerp(c.night.b, c.dawn.b, t);
        } else {
            const t = (phase - 0.8) / 0.2;
            r = Utils.lerp(c.dawn.r, c.day.r, t);
            g = Utils.lerp(c.dawn.g, c.day.g, t);
            b = Utils.lerp(c.dawn.b, c.day.b, t);
        }
        return { r, g, b };
    },

    _updateLighting(scene, sunY, phase) {
        scene.traverse((child) => {
            if (child.isDirectionalLight) {
                child.intensity = Math.max(0.15, sunY) * 0.7;
                if (phase > 0.15 && phase < 0.35) child.color.setRGB(1.0, 0.82, 0.65);
                else if (phase > 0.65 && phase < 0.85) child.color.setRGB(1.0, 0.85, 0.7);
                else child.color.setRGB(1.0, 0.96, 0.9);
                child.position.set(Math.sin(this.timeOfDay % (Math.PI * 2)) * 50, Math.max(10, Math.cos(this.timeOfDay % (Math.PI * 2)) * 50), 20);
            }
            if (child.isAmbientLight) {
                child.intensity = Utils.lerp(0.5, 0.15, Math.max(0, -sunY));
            }
            if (child.isHemisphereLight) {
                child.intensity = Utils.lerp(0.35, 0.1, Math.max(0, -sunY));
            }
        });
    },

    cleanup(scene) {
        this.clouds.forEach(c => scene.remove(c));
        this.clouds = [];
        if (this.sunMesh) { scene.remove(this.sunMesh); this.sunMesh = null; }
    }
};
