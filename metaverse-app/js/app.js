/* ========================================
   app.js — Main application entry point
   ======================================== */

const App = {
    scene: null,
    camera: null,
    renderer: null,
    clock: null,

    playerId: null,
    playerAvatar: null,
    playerName: 'Player',
    playerColor: '#4fc3f7',
    currentRoom: 'plaza',
    roomConfig: null,

    isRunning: false,

    init() {
        this._setupLobby();
    },

    // ── Lobby ────────────────────────────

    _setupLobby() {
        const enterBtn = document.getElementById('enter-btn');
        const usernameInput = document.getElementById('username-input');
        const colorOptions = document.querySelectorAll('.color-option');
        const roomCards = document.querySelectorAll('.room-card');

        // Color selection
        colorOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.playerColor = opt.dataset.color;
            });
        });

        // Room selection
        roomCards.forEach(card => {
            card.addEventListener('click', () => {
                roomCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.currentRoom = card.dataset.room;
            });
        });

        // Enter button
        enterBtn.addEventListener('click', () => {
            this.playerName = usernameInput.value.trim() || 'Player';
            this._enterWorld();
        });

        // Enter key on username
        usernameInput.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                this.playerName = usernameInput.value.trim() || 'Player';
                this._enterWorld();
            }
        });
    },

    // ── World Entry ──────────────────────

    _enterWorld() {
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('world-screen').classList.remove('hidden');

        this._initThree();
        this._initSystems();
        this._buildWorld();
        this._spawnPlayer();
        this._spawnNPCs();
        this._setupHUD();

        this.isRunning = true;
        this._loop();
    },

    _initThree() {
        const canvas = document.getElementById('metaverse-canvas');

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.clock = new THREE.Clock();

        // Resize handling
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    },

    _initSystems() {
        const canvas = document.getElementById('metaverse-canvas');
        Controls.init(this.camera, canvas);
        Minimap.init();

        Chat.init((text) => {
            Chat.addMessage(this.playerName, text, this.playerColor, false);
        });
    },

    _buildWorld() {
        this.roomConfig = World.build(this.scene, this.currentRoom);
        document.getElementById('room-label').textContent = this.roomConfig.name;
    },

    _spawnPlayer() {
        this.playerId = 'player_' + Utils.generateId();
        this.playerAvatar = Avatar.create(this.scene, {
            id: this.playerId,
            name: this.playerName,
            color: this.playerColor,
            x: 0,
            z: 5
        });

        Chat.addSystemMessage(`${this.playerName} entered ${this.roomConfig.name}`);
    },

    _spawnNPCs() {
        const npcCount = Utils.randomInt(3, 6);
        NPC.init(this.scene, this.currentRoom, npcCount);
        this._updateUserCount();

        Chat.addSystemMessage(`${NPC.getCount()} others are here`);
    },

    _updateUserCount() {
        const total = 1 + NPC.getCount();
        document.getElementById('user-count').textContent = `${total} online`;
    },

    // ── HUD ──────────────────────────────

    _setupHUD() {
        // Minimap toggle
        document.getElementById('btn-minimap').addEventListener('click', () => {
            Minimap.toggle();
        });

        // Emote picker
        const emotePicker = document.getElementById('emote-picker');
        document.getElementById('btn-emote').addEventListener('click', () => {
            emotePicker.classList.toggle('hidden');
        });

        document.querySelectorAll('.emote-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const emote = opt.dataset.emote;
                Avatar.playEmote(this.playerId, emote);
                Chat.addSystemMessage(`${this.playerName} does ${emote}`);
                emotePicker.classList.add('hidden');
            });
        });

        // Exit button
        document.getElementById('btn-exit').addEventListener('click', () => {
            this._exitWorld();
        });
    },

    _exitWorld() {
        this.isRunning = false;

        // Cleanup
        NPC.cleanup(this.scene);
        Avatar.remove(this.scene, this.playerId);
        Avatar.avatars.clear();

        if (this.renderer) {
            this.renderer.dispose();
        }

        // Reset state
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.playerAvatar = null;

        // Clear chat
        document.getElementById('chat-messages').innerHTML = '';

        // Show lobby
        document.getElementById('world-screen').classList.add('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    },

    // ── Game Loop ────────────────────────

    _loop() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this._loop());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.getElapsedTime();

        // Update systems
        Controls.update(dt, this.playerAvatar);
        Avatar.update(time, dt);
        NPC.update(dt, time);
        World.update(time);
        Minimap.draw(this.playerAvatar, NPC.getPositions(), this.roomConfig);

        // Render
        this.renderer.render(this.scene, this.camera);
    }
};

// ── Bootstrap ────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
