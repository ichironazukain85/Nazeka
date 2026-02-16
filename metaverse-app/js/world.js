/* ========================================
   world.js — 3D world/room generation
   ======================================== */

const World = {
    ROOM_SIZE: 80,
    WALL_HEIGHT: 12,

    rooms: {
        plaza: {
            name: 'Plaza',
            groundColor: 0x4a4a7a,
            skyColor: 0x1a1a4e,
            fogColor: 0x1a1a4e,
            ambientColor: 0x8080cc,
            sunColor: 0xccccff,
            features: 'plaza'
        },
        gallery: {
            name: 'Gallery',
            groundColor: 0x5a5a5a,
            skyColor: 0x2a2a2a,
            fogColor: 0x2a2a2a,
            ambientColor: 0x909090,
            sunColor: 0xffffff,
            features: 'gallery'
        },
        garden: {
            name: 'Garden',
            groundColor: 0x3a6a3a,
            skyColor: 0x152a4e,
            fogColor: 0x152a4e,
            ambientColor: 0x70a070,
            sunColor: 0xfff4cc,
            features: 'garden'
        },
        lounge: {
            name: 'Lounge',
            groundColor: 0x5a4a3a,
            skyColor: 0x2a1a10,
            fogColor: 0x2a1a10,
            ambientColor: 0x906850,
            sunColor: 0xffddaa,
            features: 'lounge'
        }
    },

    objectsGroup: null,

    build(scene, roomId) {
        const config = this.rooms[roomId] || this.rooms.plaza;

        // Clear existing world objects
        if (this.objectsGroup) {
            scene.remove(this.objectsGroup);
        }
        this.objectsGroup = new THREE.Group();

        // Sky / Fog
        scene.background = new THREE.Color(config.skyColor);
        scene.fog = new THREE.FogExp2(config.fogColor, 0.008);

        // Lighting
        const ambient = new THREE.AmbientLight(config.ambientColor, 1.0);
        this.objectsGroup.add(ambient);

        const sun = new THREE.DirectionalLight(config.sunColor, 1.2);
        sun.position.set(30, 50, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 120;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.objectsGroup.add(sun);

        const hemi = new THREE.HemisphereLight(0x8899dd, 0x445566, 0.6);
        this.objectsGroup.add(hemi);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(this.ROOM_SIZE, this.ROOM_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({
            color: config.groundColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.objectsGroup.add(ground);

        // Grid overlay
        const gridHelper = new THREE.GridHelper(this.ROOM_SIZE, 40, 0x6666aa, 0x555588);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.objectsGroup.add(gridHelper);

        // Build room features
        this._buildFeatures(config.features);

        // Boundary walls (invisible collision + visible glow edges)
        this._buildBoundaries();

        scene.add(this.objectsGroup);
        return config;
    },

    _buildBoundaries() {
        const half = this.ROOM_SIZE / 2;
        const edgeMat = new THREE.MeshBasicMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.15
        });

        const positions = [
            { x: 0,     z: -half, ry: 0 },
            { x: 0,     z: half,  ry: 0 },
            { x: -half,  z: 0,    ry: Math.PI / 2 },
            { x: half,   z: 0,    ry: Math.PI / 2 }
        ];

        positions.forEach(p => {
            const geo = new THREE.PlaneGeometry(this.ROOM_SIZE, this.WALL_HEIGHT);
            const wall = new THREE.Mesh(geo, edgeMat);
            wall.position.set(p.x, this.WALL_HEIGHT / 2, p.z);
            wall.rotation.y = p.ry;
            this.objectsGroup.add(wall);
        });
    },

    _buildFeatures(type) {
        switch (type) {
            case 'plaza':   this._buildPlaza(); break;
            case 'gallery': this._buildGallery(); break;
            case 'garden':  this._buildGarden(); break;
            case 'lounge':  this._buildLounge(); break;
        }
    },

    _buildPlaza() {
        // Central fountain
        const fountainBase = new THREE.Mesh(
            new THREE.CylinderGeometry(4, 4.5, 1.2, 24),
            new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.3 })
        );
        fountainBase.position.y = 0.6;
        fountainBase.castShadow = true;
        this.objectsGroup.add(fountainBase);

        const fountainPillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.8, 3, 12),
            new THREE.MeshStandardMaterial({ color: 0x667799 })
        );
        fountainPillar.position.y = 2.7;
        fountainPillar.castShadow = true;
        this.objectsGroup.add(fountainPillar);

        const waterRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.3, 8, 32),
            new THREE.MeshStandardMaterial({
                color: 0x4488cc,
                transparent: true,
                opacity: 0.6,
                emissive: 0x224466,
                emissiveIntensity: 0.3
            })
        );
        waterRing.rotation.x = -Math.PI / 2;
        waterRing.position.y = 1.3;
        this.objectsGroup.add(waterRing);

        // Benches around fountain
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 10;
            this._createBench(
                Math.sin(angle) * dist,
                Math.cos(angle) * dist,
                angle + Math.PI
            );
        }

        // Decorative pillars
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 20;
            this._createPillar(
                Math.sin(angle) * dist,
                Math.cos(angle) * dist
            );
        }

        // Floating orbs
        for (let i = 0; i < 12; i++) {
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x88aaff,
                    emissive: 0x4466cc,
                    emissiveIntensity: 0.8,
                    transparent: true,
                    opacity: 0.7
                })
            );
            orb.position.set(
                Utils.randomRange(-30, 30),
                Utils.randomRange(3, 8),
                Utils.randomRange(-30, 30)
            );
            orb.userData.floatOffset = Math.random() * Math.PI * 2;
            orb.userData.floatSpeed = Utils.randomRange(0.5, 1.5);
            orb.userData.isFloating = true;
            this.objectsGroup.add(orb);
        }
    },

    _buildGallery() {
        // Exhibition walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });

        const wallPositions = [
            { x: -10, z: 0, ry: 0, w: 20 },
            { x: 10, z: 0, ry: 0, w: 20 },
            { x: 0, z: -15, ry: Math.PI / 2, w: 16 },
            { x: 0, z: 15, ry: Math.PI / 2, w: 16 },
        ];

        wallPositions.forEach(wp => {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 6, wp.w),
                wallMat
            );
            wall.position.set(wp.x, 3, wp.z);
            wall.rotation.y = wp.ry;
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.objectsGroup.add(wall);
        });

        // Art frames (colored rectangles on walls)
        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff];
        for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1;
            const idx = i % 4;
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 2.5, 3),
                new THREE.MeshStandardMaterial({
                    color: colors[i],
                    emissive: colors[i],
                    emissiveIntensity: 0.2
                })
            );
            frame.position.set(side * 10 + side * -0.2, 3.5, -6 + idx * 4);
            this.objectsGroup.add(frame);

            // Spotlight for each art piece
            const spotLight = new THREE.PointLight(colors[i], 0.4, 6);
            spotLight.position.set(side * 10 + side * -2, 5, -6 + idx * 4);
            this.objectsGroup.add(spotLight);
        }

        // Sculptures (geometric shapes on pedestals)
        const shapes = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.OctahedronGeometry(1, 0),
            new THREE.TorusKnotGeometry(0.7, 0.3, 64, 8),
            new THREE.DodecahedronGeometry(1, 0)
        ];

        shapes.forEach((geo, i) => {
            const pedestal = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1.5),
                new THREE.MeshStandardMaterial({ color: 0x444444 })
            );
            pedestal.position.set(-6 + i * 4, 0.75, 0);
            pedestal.castShadow = true;
            this.objectsGroup.add(pedestal);

            const sculpture = new THREE.Mesh(
                geo,
                new THREE.MeshStandardMaterial({
                    color: 0xccccff,
                    metalness: 0.8,
                    roughness: 0.2
                })
            );
            sculpture.position.set(-6 + i * 4, 2.5, 0);
            sculpture.castShadow = true;
            sculpture.userData.isFloating = true;
            sculpture.userData.floatOffset = i;
            sculpture.userData.floatSpeed = 0.8;
            sculpture.userData.rotates = true;
            this.objectsGroup.add(sculpture);
        });
    },

    _buildGarden() {
        // Trees
        for (let i = 0; i < 20; i++) {
            const x = Utils.randomRange(-35, 35);
            const z = Utils.randomRange(-35, 35);
            if (Utils.distance2D(x, z, 0, 0) < 5) continue;
            this._createTree(x, z);
        }

        // Flower patches
        for (let i = 0; i < 40; i++) {
            const x = Utils.randomRange(-30, 30);
            const z = Utils.randomRange(-30, 30);
            this._createFlower(x, z);
        }

        // Pond
        const pond = new THREE.Mesh(
            new THREE.CircleGeometry(6, 32),
            new THREE.MeshStandardMaterial({
                color: 0x2266aa,
                transparent: true,
                opacity: 0.7,
                emissive: 0x112244,
                emissiveIntensity: 0.3,
                roughness: 0.1
            })
        );
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(15, 0.05, 15);
        this.objectsGroup.add(pond);

        // Stepping stones
        for (let i = 0; i < 8; i++) {
            const stone = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.9, 0.15, 8),
                new THREE.MeshStandardMaterial({ color: 0x888888 })
            );
            stone.position.set(-20 + i * 5, 0.08, -5 + Math.sin(i) * 3);
            stone.receiveShadow = true;
            this.objectsGroup.add(stone);
        }

        // Fireflies
        for (let i = 0; i < 20; i++) {
            const fly = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0xaaff66,
                    transparent: true,
                    opacity: 0.8
                })
            );
            fly.position.set(
                Utils.randomRange(-30, 30),
                Utils.randomRange(1, 4),
                Utils.randomRange(-30, 30)
            );
            fly.userData.isFloating = true;
            fly.userData.floatOffset = Math.random() * Math.PI * 2;
            fly.userData.floatSpeed = Utils.randomRange(1, 3);
            fly.userData.wanderAngle = Math.random() * Math.PI * 2;
            fly.userData.isFirefly = true;
            this.objectsGroup.add(fly);
        }
    },

    _buildLounge() {
        // Circular sofas
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const dist = 12;
            const cx = Math.sin(angle) * dist;
            const cz = Math.cos(angle) * dist;

            // Sofa arc
            const sofa = new THREE.Mesh(
                new THREE.TorusGeometry(3, 0.8, 8, 16, Math.PI),
                new THREE.MeshStandardMaterial({
                    color: 0x664433,
                    roughness: 0.8
                })
            );
            sofa.rotation.x = -Math.PI / 2;
            sofa.rotation.z = angle;
            sofa.position.set(cx, 0.8, cz);
            sofa.castShadow = true;
            this.objectsGroup.add(sofa);

            // Coffee table
            const table = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1, 0.6, 16),
                new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.5 })
            );
            table.position.set(cx, 0.3, cz);
            table.castShadow = true;
            this.objectsGroup.add(table);
        }

        // Central fireplace
        const fireplaceBase = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2.2, 0.8, 16),
            new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        fireplaceBase.position.y = 0.4;
        this.objectsGroup.add(fireplaceBase);

        // Fire light
        const fireLight = new THREE.PointLight(0xff6622, 1.5, 20);
        fireLight.position.set(0, 2, 0);
        fireLight.userData.isFireLight = true;
        this.objectsGroup.add(fireLight);

        // Fire particles (simple glowing boxes)
        for (let i = 0; i < 8; i++) {
            const flame = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.6, 0.3),
                new THREE.MeshBasicMaterial({
                    color: 0xff4400,
                    transparent: true,
                    opacity: 0.8
                })
            );
            flame.position.set(
                Utils.randomRange(-0.8, 0.8),
                Utils.randomRange(0.8, 2),
                Utils.randomRange(-0.8, 0.8)
            );
            flame.userData.isFlame = true;
            flame.userData.floatOffset = Math.random() * Math.PI * 2;
            this.objectsGroup.add(flame);
        }

        // Bookshelves along edges
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 28;
            const bookshelf = new THREE.Mesh(
                new THREE.BoxGeometry(6, 5, 1),
                new THREE.MeshStandardMaterial({ color: 0x553311 })
            );
            bookshelf.position.set(Math.sin(angle) * dist, 2.5, Math.cos(angle) * dist);
            bookshelf.rotation.y = angle;
            bookshelf.castShadow = true;
            this.objectsGroup.add(bookshelf);

            // Book colors on shelf
            for (let j = 0; j < 5; j++) {
                const book = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.8 + Math.random() * 0.4, 0.7),
                    new THREE.MeshStandardMaterial({
                        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.3)
                    })
                );
                book.position.set(
                    Math.sin(angle) * (dist - 0.3) + Math.cos(angle) * (-2 + j),
                    1.5 + j * 0.9,
                    Math.cos(angle) * (dist - 0.3) - Math.sin(angle) * (-2 + j)
                );
                book.rotation.y = angle;
                this.objectsGroup.add(book);
            }
        }

        // Warm ambient
        const warmLight = new THREE.PointLight(0xffaa66, 0.4, 40);
        warmLight.position.set(0, 8, 0);
        this.objectsGroup.add(warmLight);
    },

    _createBench(x, z, rotation) {
        const group = new THREE.Group();
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.2, 1),
            new THREE.MeshStandardMaterial({ color: 0x885533 })
        );
        seat.position.y = 0.7;
        group.add(seat);

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x885533 })
        );
        back.position.set(0, 1.2, -0.45);
        group.add(back);

        for (let i = -1; i <= 1; i += 2) {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.7, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x444444 })
            );
            leg.position.set(i * 1.2, 0.35, 0);
            group.add(leg);
        }

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        group.castShadow = true;
        this.objectsGroup.add(group);
    },

    _createPillar(x, z) {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.6, 6, 8),
            new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.4, metalness: 0.3 })
        );
        pillar.position.set(x, 3, z);
        pillar.castShadow = true;
        this.objectsGroup.add(pillar);

        // Glowing top
        const topLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 12, 12),
            new THREE.MeshStandardMaterial({
                color: 0x88aaff,
                emissive: 0x4466cc,
                emissiveIntensity: 1
            })
        );
        topLight.position.set(x, 6.3, z);
        this.objectsGroup.add(topLight);
    },

    _createTree(x, z) {
        const trunkHeight = Utils.randomRange(3, 6);
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 8),
            new THREE.MeshStandardMaterial({ color: 0x664422 })
        );
        trunk.position.set(x, trunkHeight / 2, z);
        trunk.castShadow = true;
        this.objectsGroup.add(trunk);

        const crownRadius = Utils.randomRange(2, 4);
        const crown = new THREE.Mesh(
            new THREE.SphereGeometry(crownRadius, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x336633,
                roughness: 0.9
            })
        );
        crown.position.set(x, trunkHeight + crownRadius * 0.5, z);
        crown.castShadow = true;
        this.objectsGroup.add(crown);
    },

    _createFlower(x, z) {
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4),
            new THREE.MeshStandardMaterial({ color: 0x338833 })
        );
        stem.position.set(x, 0.25, z);
        this.objectsGroup.add(stem);

        const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 6),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                emissive: new THREE.Color().setHSL(Math.random(), 0.5, 0.2),
                emissiveIntensity: 0.3
            })
        );
        petal.position.set(x, 0.55, z);
        this.objectsGroup.add(petal);
    },

    update(time) {
        if (!this.objectsGroup) return;

        this.objectsGroup.children.forEach(child => {
            if (child.userData.isFloating) {
                const offset = child.userData.floatOffset || 0;
                const speed = child.userData.floatSpeed || 1;
                child.position.y += Math.sin(time * speed + offset) * 0.003;

                if (child.userData.rotates) {
                    child.rotation.y += 0.01;
                    child.rotation.x += 0.005;
                }

                if (child.userData.isFirefly) {
                    child.userData.wanderAngle += Utils.randomRange(-0.05, 0.05);
                    child.position.x += Math.sin(child.userData.wanderAngle) * 0.02;
                    child.position.z += Math.cos(child.userData.wanderAngle) * 0.02;
                    child.position.x = Utils.clamp(child.position.x, -35, 35);
                    child.position.z = Utils.clamp(child.position.z, -35, 35);
                    child.material.opacity = 0.4 + Math.sin(time * 3 + offset) * 0.4;
                }
            }

            if (child.userData.isFlame) {
                const offset = child.userData.floatOffset || 0;
                child.position.y = 1 + Math.sin(time * 4 + offset) * 0.4;
                child.material.opacity = 0.5 + Math.sin(time * 6 + offset) * 0.3;
                child.scale.y = 0.8 + Math.sin(time * 5 + offset) * 0.4;
            }

            if (child.userData.isFireLight) {
                child.intensity = 1.2 + Math.sin(time * 3) * 0.3;
            }
        });
    }
};
