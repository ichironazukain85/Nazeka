/* ========================================
   world.js — 3D world/room generation
   Metapa-style: bright, pastel, friendly
   ======================================== */

const World = {
    ROOM_SIZE: 80,
    WALL_HEIGHT: 12,

    rooms: {
        plaza: {
            name: 'ひろば',
            groundColor: 0xe8ddd0,
            skyColor: 0xc8e6f7,
            fogColor: 0xc8e6f7,
            ambientColor: 0xfff8f0,
            sunColor: 0xfff5e6,
            features: 'plaza'
        },
        gallery: {
            name: 'ギャラリー',
            groundColor: 0xf0ece6,
            skyColor: 0xe8e0f0,
            fogColor: 0xe8e0f0,
            ambientColor: 0xf8f4ff,
            sunColor: 0xfff0ff,
            features: 'gallery'
        },
        garden: {
            name: 'ガーデン',
            groundColor: 0xc8e6c0,
            skyColor: 0xd4eef8,
            fogColor: 0xd4eef8,
            ambientColor: 0xf0fff0,
            sunColor: 0xfff8e0,
            features: 'garden'
        },
        lounge: {
            name: 'ラウンジ',
            groundColor: 0xe8dcd0,
            skyColor: 0xf0e8dd,
            fogColor: 0xf0e8dd,
            ambientColor: 0xfff4e8,
            sunColor: 0xffe8cc,
            features: 'lounge'
        }
    },

    objectsGroup: null,

    build(scene, roomId) {
        const config = this.rooms[roomId] || this.rooms.plaza;

        if (this.objectsGroup) {
            scene.remove(this.objectsGroup);
        }
        this.objectsGroup = new THREE.Group();

        scene.background = new THREE.Color(config.skyColor);
        scene.fog = new THREE.FogExp2(config.fogColor, 0.006);

        const ambient = new THREE.AmbientLight(config.ambientColor, 1.2);
        this.objectsGroup.add(ambient);

        const sun = new THREE.DirectionalLight(config.sunColor, 0.9);
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

        const hemi = new THREE.HemisphereLight(0xddeeff, 0xf0e8d8, 0.8);
        this.objectsGroup.add(hemi);

        const groundGeo = new THREE.PlaneGeometry(this.ROOM_SIZE, this.ROOM_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({
            color: config.groundColor,
            roughness: 0.95,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.objectsGroup.add(ground);

        const gridHelper = new THREE.GridHelper(this.ROOM_SIZE, 20, 0xd8d0c4, 0xddd6ca);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        this.objectsGroup.add(gridHelper);

        this._buildFeatures(config.features);
        this._buildBoundaries();

        scene.add(this.objectsGroup);
        return config;
    },

    _buildBoundaries() {
        const half = this.ROOM_SIZE / 2;
        const edgeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.04
        });
        [
            { x: 0, z: -half, ry: 0 },
            { x: 0, z: half, ry: 0 },
            { x: -half, z: 0, ry: Math.PI / 2 },
            { x: half, z: 0, ry: Math.PI / 2 }
        ].forEach(p => {
            const wall = new THREE.Mesh(
                new THREE.PlaneGeometry(this.ROOM_SIZE, this.WALL_HEIGHT),
                edgeMat
            );
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
        this.objectsGroup.add(this._mesh(
            new THREE.CylinderGeometry(4, 4.5, 1.2, 24),
            { color: 0xd8d0c4, roughness: 0.8 },
            { y: 0.6, shadow: true }
        ));
        this.objectsGroup.add(this._mesh(
            new THREE.CylinderGeometry(0.6, 0.8, 3, 12),
            { color: 0xe0d8cc },
            { y: 2.7, shadow: true }
        ));
        this.objectsGroup.add(this._mesh(
            new THREE.TorusGeometry(2.5, 0.3, 8, 32),
            { color: 0x90caf9, transparent: true, opacity: 0.5 },
            { y: 1.3, rx: -Math.PI / 2 }
        ));

        // Benches
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, d = 10;
            this._createBench(Math.sin(a) * d, Math.cos(a) * d, a + Math.PI);
        }

        // Pastel buildings
        const colors = [0xf8bbd0, 0xb2dfdb, 0xc5cae9, 0xfff9c4, 0xffe0b2, 0xd1c4e9];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, d = 22;
            this._createBuilding(Math.sin(a) * d, Math.cos(a) * d, colors[i], a);
        }

        // Lamp posts
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2, d = 15;
            this._createLampPost(Math.sin(a) * d, Math.cos(a) * d);
        }
    },

    _buildGallery() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0ea, roughness: 0.9 });
        [
            { x: -10, z: 0, ry: 0, w: 20 },
            { x: 10, z: 0, ry: 0, w: 20 },
            { x: 0, z: -15, ry: Math.PI / 2, w: 16 },
            { x: 0, z: 15, ry: Math.PI / 2, w: 16 }
        ].forEach(wp => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, wp.w), wallMat);
            wall.position.set(wp.x, 3, wp.z);
            wall.rotation.y = wp.ry;
            wall.castShadow = true;
            this.objectsGroup.add(wall);
        });

        const artColors = [0xf48fb1, 0x81c784, 0x64b5f6, 0xffd54f, 0xce93d8, 0x4dd0e1, 0xffab91, 0xa5d6a7];
        for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1;
            const idx = i % 4;
            this.objectsGroup.add(this._mesh(
                new THREE.BoxGeometry(0.08, 3, 3.5),
                { color: 0xffffff },
                { x: side * 10 + side * -0.2, y: 3.5, z: -6 + idx * 4 }
            ));
            this.objectsGroup.add(this._mesh(
                new THREE.BoxGeometry(0.05, 2.2, 2.8),
                { color: artColors[i], emissive: artColors[i], emissiveIntensity: 0.1 },
                { x: side * 10 + side * -0.25, y: 3.5, z: -6 + idx * 4 }
            ));
        }

        const shapes = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.OctahedronGeometry(1, 0),
            new THREE.TorusKnotGeometry(0.7, 0.3, 64, 8),
            new THREE.DodecahedronGeometry(1, 0)
        ];
        const sColors = [0xf8bbd0, 0xb2dfdb, 0xc5cae9, 0xfff9c4];
        shapes.forEach((geo, i) => {
            this.objectsGroup.add(this._mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1.5),
                { color: 0xffffff, roughness: 0.9 },
                { x: -6 + i * 4, y: 0.75, z: 0, shadow: true }
            ));
            const s = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
                color: sColors[i], roughness: 0.4, metalness: 0.1
            }));
            s.position.set(-6 + i * 4, 2.5, 0);
            s.castShadow = true;
            s.userData = { isFloating: true, floatOffset: i, floatSpeed: 0.8, rotates: true };
            this.objectsGroup.add(s);
        });
    },

    _buildGarden() {
        for (let i = 0; i < 20; i++) {
            const x = Utils.randomRange(-35, 35), z = Utils.randomRange(-35, 35);
            if (Utils.distance2D(x, z, 0, 0) < 5) continue;
            this._createTree(x, z);
        }
        for (let i = 0; i < 50; i++) {
            this._createFlower(Utils.randomRange(-30, 30), Utils.randomRange(-30, 30));
        }

        this.objectsGroup.add(this._mesh(
            new THREE.CircleGeometry(6, 32),
            { color: 0x90caf9, transparent: true, opacity: 0.6, roughness: 0.1 },
            { x: 15, y: 0.05, z: 15, rx: -Math.PI / 2 }
        ));

        for (let i = 0; i < 8; i++) {
            this.objectsGroup.add(this._mesh(
                new THREE.CylinderGeometry(0.8, 0.9, 0.15, 8),
                { color: 0xe0d8cc },
                { x: -20 + i * 5, y: 0.08, z: -5 + Math.sin(i) * 3 }
            ));
        }

        for (let i = 0; i < 15; i++) {
            const fly = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.85, 0.5, 0.8),
                    transparent: true, opacity: 0.7
                })
            );
            fly.position.set(Utils.randomRange(-30, 30), Utils.randomRange(1, 4), Utils.randomRange(-30, 30));
            fly.userData = {
                isFloating: true, floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: Utils.randomRange(1, 3), wanderAngle: Math.random() * Math.PI * 2,
                isFirefly: true
            };
            this.objectsGroup.add(fly);
        }
    },

    _buildLounge() {
        const sofaColors = [0xf8bbd0, 0xb2dfdb, 0xc5cae9, 0xffe0b2];
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4, d = 12;
            const cx = Math.sin(a) * d, cz = Math.cos(a) * d;

            const sofa = new THREE.Mesh(
                new THREE.TorusGeometry(3, 0.8, 8, 16, Math.PI),
                new THREE.MeshStandardMaterial({ color: sofaColors[i], roughness: 0.9 })
            );
            sofa.rotation.set(-Math.PI / 2, 0, a);
            sofa.position.set(cx, 0.8, cz);
            sofa.castShadow = true;
            this.objectsGroup.add(sofa);

            this.objectsGroup.add(this._mesh(
                new THREE.CylinderGeometry(1, 1, 0.5, 16),
                { color: 0xffffff, roughness: 0.8 },
                { x: cx, y: 0.25, z: cz, shadow: true }
            ));
        }

        this.objectsGroup.add(this._mesh(
            new THREE.CylinderGeometry(2, 2.2, 0.4, 16),
            { color: 0xf5f0ea },
            { y: 0.2 }
        ));

        const fl = new THREE.PointLight(0xffe0b2, 1.0, 20);
        fl.position.set(0, 2, 0);
        fl.userData.isFireLight = true;
        this.objectsGroup.add(fl);

        for (let i = 0; i < 5; i++) {
            const flame = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xfff3e0, transparent: true, opacity: 0.7 })
            );
            flame.position.set(Utils.randomRange(-0.8, 0.8), Utils.randomRange(0.5, 1.5), Utils.randomRange(-0.8, 0.8));
            flame.userData = { isFlame: true, floatOffset: Math.random() * Math.PI * 2 };
            this.objectsGroup.add(flame);
        }

        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, d = 28;
            const bx = Math.sin(a) * d, bz = Math.cos(a) * d;
            const shelf = this._mesh(
                new THREE.BoxGeometry(6, 5, 1),
                { color: 0xe8dcd0, roughness: 0.9 },
                { x: bx, y: 2.5, z: bz, shadow: true }
            );
            shelf.rotation.y = a;
            this.objectsGroup.add(shelf);

            const bookColors = [0xf8bbd0, 0xb2dfdb, 0xc5cae9, 0xfff9c4, 0xd1c4e9];
            for (let j = 0; j < 5; j++) {
                const book = this._mesh(
                    new THREE.BoxGeometry(0.5, 0.8 + Math.random() * 0.4, 0.7),
                    { color: bookColors[j] },
                    {
                        x: Math.sin(a) * (d - 0.3) + Math.cos(a) * (-2 + j),
                        y: 1.5 + j * 0.9,
                        z: Math.cos(a) * (d - 0.3) - Math.sin(a) * (-2 + j)
                    }
                );
                book.rotation.y = a;
                this.objectsGroup.add(book);
            }
        }

        const wl = new THREE.PointLight(0xfff3e0, 0.3, 40);
        wl.position.set(0, 8, 0);
        this.objectsGroup.add(wl);
    },

    // ── Helpers ──────────────────────────

    _mesh(geo, matOpts, posOpts) {
        const mat = new THREE.MeshStandardMaterial(matOpts);
        const mesh = new THREE.Mesh(geo, mat);
        if (posOpts) {
            if (posOpts.x !== undefined) mesh.position.x = posOpts.x;
            if (posOpts.y !== undefined) mesh.position.y = posOpts.y;
            if (posOpts.z !== undefined) mesh.position.z = posOpts.z;
            if (posOpts.rx !== undefined) mesh.rotation.x = posOpts.rx;
            if (posOpts.shadow) mesh.castShadow = true;
        }
        return mesh;
    },

    _createBench(x, z, rotation) {
        const g = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0xe0d4c0 }));
        seat.position.y = 0.7; g.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.15), new THREE.MeshStandardMaterial({ color: 0xe0d4c0 }));
        back.position.set(0, 1.2, -0.45); g.add(back);
        [-1, 1].forEach(s => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.8), new THREE.MeshStandardMaterial({ color: 0xd0c8b8 }));
            leg.position.set(s * 1.2, 0.35, 0); g.add(leg);
        });
        g.position.set(x, 0, z);
        g.rotation.y = rotation;
        this.objectsGroup.add(g);
    },

    _createBuilding(x, z, color, angle) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
        body.position.y = 2.5; body.castShadow = true; g.add(body);

        const rc = new THREE.Color(color).multiplyScalar(0.85);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 2.5, 4), new THREE.MeshStandardMaterial({ color: rc, roughness: 0.9 }));
        roof.position.y = 6.2; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);

        const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0xe8dcd0 }));
        door.position.set(0, 1, 2.55); g.add(door);

        const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xfff8e1, emissiveIntensity: 0.2 }));
        win.position.set(0, 3.5, 2.55); g.add(win);

        g.position.set(x, 0, z);
        g.rotation.y = angle + Math.PI;
        this.objectsGroup.add(g);
    },

    _createLampPost(x, z) {
        this.objectsGroup.add(this._mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), { color: 0xd0c8b8 }, { x, y: 2, z }));
        this.objectsGroup.add(this._mesh(new THREE.SphereGeometry(0.35, 12, 12), { color: 0xfff8e1, emissive: 0xfff3e0, emissiveIntensity: 0.5 }, { x, y: 4.2, z }));
        const l = new THREE.PointLight(0xfff3e0, 0.3, 8);
        l.position.set(x, 4.2, z);
        this.objectsGroup.add(l);
    },

    _createTree(x, z) {
        const h = Utils.randomRange(2.5, 4.5);
        this.objectsGroup.add(this._mesh(new THREE.CylinderGeometry(0.25, 0.35, h, 8), { color: 0xc8b898 }, { x, y: h / 2, z, shadow: true }));
        const r = Utils.randomRange(2, 3.5);
        const cc = [0xa5d6a7, 0xc5e1a5, 0x81c784, 0xaed581];
        this.objectsGroup.add(this._mesh(new THREE.SphereGeometry(r, 12, 12), { color: cc[Math.floor(Math.random() * cc.length)], roughness: 0.9 }, { x, y: h + r * 0.4, z, shadow: true }));
    },

    _createFlower(x, z) {
        this.objectsGroup.add(this._mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), { color: 0x81c784 }, { x, y: 0.2, z }));
        const pc = [0xf48fb1, 0xce93d8, 0xfff176, 0xff8a65, 0x80deea, 0xf8bbd0];
        this.objectsGroup.add(this._mesh(new THREE.SphereGeometry(0.15, 6, 6), { color: pc[Math.floor(Math.random() * pc.length)] }, { x, y: 0.45, z }));
    },

    update(time) {
        if (!this.objectsGroup) return;
        this.objectsGroup.children.forEach(child => {
            if (child.userData.isFloating) {
                const o = child.userData.floatOffset || 0, sp = child.userData.floatSpeed || 1;
                child.position.y += Math.sin(time * sp + o) * 0.002;
                if (child.userData.rotates) { child.rotation.y += 0.008; child.rotation.x += 0.004; }
                if (child.userData.isFirefly) {
                    child.userData.wanderAngle += Utils.randomRange(-0.05, 0.05);
                    child.position.x += Math.sin(child.userData.wanderAngle) * 0.015;
                    child.position.z += Math.cos(child.userData.wanderAngle) * 0.015;
                    child.position.x = Utils.clamp(child.position.x, -35, 35);
                    child.position.z = Utils.clamp(child.position.z, -35, 35);
                    child.material.opacity = 0.4 + Math.sin(time * 2 + o) * 0.3;
                }
            }
            if (child.userData.isFlame) {
                const o = child.userData.floatOffset || 0;
                child.position.y = 0.8 + Math.sin(time * 2 + o) * 0.2;
                child.material.opacity = 0.4 + Math.sin(time * 3 + o) * 0.2;
            }
            if (child.userData.isFireLight) { child.intensity = 0.8 + Math.sin(time * 2) * 0.2; }
        });
    }
};
