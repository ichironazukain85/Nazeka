/* ========================================
   sky.js — Day/night cycle & starfield
   ======================================== */

const Sky = {
    cycleSpeed: 0.02,    // Full cycle in ~314 seconds (~5 min)
    timeOfDay: 0,        // 0 = noon, PI = midnight
    stars: null,
    sunMesh: null,
    moonMesh: null,

    // Color stops for sky gradient
    SKY_COLORS: {
        day:       { r: 0.35, g: 0.55, b: 0.85 },
        sunset:    { r: 0.85, g: 0.35, b: 0.20 },
        night:     { r: 0.02, g: 0.02, b: 0.08 },
        dawn:      { r: 0.75, g: 0.45, b: 0.35 }
    },

    init(scene) {
        this._createStars(scene);
        this._createSun(scene);
        this._createMoon(scene);
    },

    _createStars(scene) {
        const count = 600;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Distribute on a large sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 90;

            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // only upper hemisphere
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            sizes[i] = Math.random() * 2 + 0.5;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.4,
            transparent: true,
            opacity: 0,
            sizeAttenuation: true,
            depthWrite: false
        });

        this.stars = new THREE.Points(geo, mat);
        scene.add(this.stars);
    },

    _createSun(scene) {
        const geo = new THREE.SphereGeometry(3, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffdd44,
            transparent: true,
            fog: false
        });
        this.sunMesh = new THREE.Mesh(geo, mat);
        scene.add(this.sunMesh);
    },

    _createMoon(scene) {
        const geo = new THREE.SphereGeometry(2, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xccccee,
            transparent: true,
            fog: false
        });
        this.moonMesh = new THREE.Mesh(geo, mat);
        scene.add(this.moonMesh);
    },

    update(time, scene, roomConfig) {
        this.timeOfDay = time * this.cycleSpeed;

        // Sun angle: 0 at noon (top), PI at midnight (bottom)
        const sunAngle = this.timeOfDay % (Math.PI * 2);
        const sunY = Math.cos(sunAngle);  // 1 at noon, -1 at midnight
        const sunX = Math.sin(sunAngle);

        // Determine phase (0-1): 0=noon, 0.25=sunset, 0.5=midnight, 0.75=dawn
        const phase = (sunAngle / (Math.PI * 2)) % 1;

        // Sky color blending
        const skyColor = this._getSkyColor(phase);
        scene.background = new THREE.Color(skyColor.r, skyColor.g, skyColor.b);
        if (scene.fog) {
            scene.fog.color.setRGB(skyColor.r, skyColor.g, skyColor.b);
        }

        // Star visibility (fade in at night)
        if (this.stars) {
            const nightFactor = Math.max(0, -sunY);
            this.stars.material.opacity = nightFactor * 0.9;

            // Subtle twinkling via rotation
            this.stars.rotation.y = time * 0.002;
        }

        // Sun position & visibility
        if (this.sunMesh) {
            const sunDist = 80;
            this.sunMesh.position.set(sunX * sunDist, sunY * sunDist, -30);
            this.sunMesh.material.opacity = Math.max(0, sunY);
            this.sunMesh.visible = sunY > -0.1;
        }

        // Moon position & visibility (opposite the sun)
        if (this.moonMesh) {
            const moonDist = 80;
            this.moonMesh.position.set(-sunX * moonDist, -sunY * moonDist, 20);
            this.moonMesh.material.opacity = Math.max(0, -sunY) * 0.8;
            this.moonMesh.visible = sunY < 0.1;
        }

        // Adjust scene lights based on time of day
        this._updateLighting(scene, sunY, phase);
    },

    _getSkyColor(phase) {
        const c = this.SKY_COLORS;
        let r, g, b;

        if (phase < 0.2) {
            // Noon -> approaching sunset
            const t = phase / 0.2;
            r = Utils.lerp(c.day.r, c.sunset.r, t);
            g = Utils.lerp(c.day.g, c.sunset.g, t);
            b = Utils.lerp(c.day.b, c.sunset.b, t);
        } else if (phase < 0.3) {
            // Sunset -> night
            const t = (phase - 0.2) / 0.1;
            r = Utils.lerp(c.sunset.r, c.night.r, t);
            g = Utils.lerp(c.sunset.g, c.night.g, t);
            b = Utils.lerp(c.sunset.b, c.night.b, t);
        } else if (phase < 0.7) {
            // Night
            r = c.night.r;
            g = c.night.g;
            b = c.night.b;
        } else if (phase < 0.8) {
            // Night -> dawn
            const t = (phase - 0.7) / 0.1;
            r = Utils.lerp(c.night.r, c.dawn.r, t);
            g = Utils.lerp(c.night.g, c.dawn.g, t);
            b = Utils.lerp(c.night.b, c.dawn.b, t);
        } else {
            // Dawn -> noon
            const t = (phase - 0.8) / 0.2;
            r = Utils.lerp(c.dawn.r, c.day.r, t);
            g = Utils.lerp(c.dawn.g, c.day.g, t);
            b = Utils.lerp(c.dawn.b, c.day.b, t);
        }

        return { r, g, b };
    },

    _updateLighting(scene, sunY, phase) {
        // Find directional light and ambient light in the scene
        scene.traverse((child) => {
            if (child.isDirectionalLight) {
                // Sun intensity follows sun position
                child.intensity = Math.max(0.1, sunY) * 1.2;

                // Color shifts from white to warm orange at sunset
                if (phase > 0.15 && phase < 0.35) {
                    child.color.setRGB(1.0, 0.7, 0.4);
                } else if (phase > 0.65 && phase < 0.85) {
                    child.color.setRGB(1.0, 0.75, 0.5);
                } else {
                    child.color.setRGB(1.0, 1.0, 0.95);
                }

                // Move light with sun
                child.position.set(
                    Math.sin(this.timeOfDay % (Math.PI * 2)) * 50,
                    Math.max(5, Math.cos(this.timeOfDay % (Math.PI * 2)) * 50),
                    20
                );
            }

            if (child.isAmbientLight) {
                // Dim ambient at night
                const nightness = Math.max(0, -sunY);
                child.intensity = Utils.lerp(1.0, 0.15, nightness);
            }

            if (child.isHemisphereLight) {
                const nightness = Math.max(0, -sunY);
                child.intensity = Utils.lerp(0.6, 0.1, nightness);
            }
        });
    },

    cleanup(scene) {
        if (this.stars) {
            scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
            this.stars = null;
        }
        if (this.sunMesh) {
            scene.remove(this.sunMesh);
            this.sunMesh.geometry.dispose();
            this.sunMesh.material.dispose();
            this.sunMesh = null;
        }
        if (this.moonMesh) {
            scene.remove(this.moonMesh);
            this.moonMesh.geometry.dispose();
            this.moonMesh.material.dispose();
            this.moonMesh = null;
        }
    }
};
