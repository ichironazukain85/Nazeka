/* ========================================
   interaction.js — NPC interaction & click handling
   ======================================== */

const Interaction = {
    raycaster: null,
    mouse: new THREE.Vector2(),
    infoPanel: null,
    isInfoVisible: false,
    selectedNPC: null,
    interactionRadius: 5,

    NPC_DIALOGUES: {
        greeting: [
            'Hey! Welcome to the metaverse!',
            'Nice to meet you!',
            'Having fun exploring?',
            'Love this place!',
            'What do you think of this room?'
        ],
        about: [
            'I come here every day to relax.',
            'I\'m an explorer, always looking for new rooms.',
            'I\'ve been here since the beginning!',
            'I love meeting new people here.',
            'This is my favorite spot in the whole world.'
        ],
        tip: [
            'Tip: Try walking into the portals to visit other rooms!',
            'Tip: Press the Emote button to express yourself!',
            'Tip: Use the minimap to find your way around!',
            'Tip: Scroll to zoom in and out!',
            'Tip: Each room has its own unique atmosphere!'
        ]
    },

    _camera: null,
    _initialized: false,

    init(camera, canvas) {
        this._camera = camera;
        this.raycaster = new THREE.Raycaster();

        if (!this.infoPanel) {
            this._createInfoPanel();
        }

        // Prevent duplicate event listener registration on re-entry
        if (this._initialized) return;
        this._initialized = true;

        // Click/tap handler — uses this._camera so it always uses current camera
        const handler = (e) => {
            if (Touch.isMobile) return;
            this._onClick(e, this._camera);
        };

        canvas.addEventListener('click', handler);

        // Mobile tap
        if (Touch.isMobile) {
            canvas.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1) {
                    const touch = e.changedTouches[0];
                    this._onTap(touch.clientX, touch.clientY, this._camera);
                }
            });
        }
    },

    _createInfoPanel() {
        this.infoPanel = document.createElement('div');
        this.infoPanel.id = 'npc-info-panel';
        this.infoPanel.className = 'hidden';
        this.infoPanel.innerHTML = `
            <div class="npc-info-header">
                <span class="npc-info-color"></span>
                <span class="npc-info-name"></span>
                <button class="npc-info-close">&times;</button>
            </div>
            <div class="npc-info-dialogue"></div>
            <div class="npc-info-actions">
                <button class="npc-action-btn" data-action="greet">Wave</button>
                <button class="npc-action-btn" data-action="talk">Talk</button>
                <button class="npc-action-btn" data-action="tip">Ask Tip</button>
            </div>
        `;

        document.getElementById('world-screen').appendChild(this.infoPanel);

        // Close button
        this.infoPanel.querySelector('.npc-info-close').addEventListener('click', () => {
            this.hideInfo();
        });

        // Action buttons
        this.infoPanel.querySelectorAll('.npc-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this._doAction(action);
            });
        });
    },

    _onClick(e, camera) {
        if (Controls.isPointerLocked) return;

        const rect = e.target.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this._castRay(camera);
    },

    _onTap(x, y, camera) {
        const canvas = document.getElementById('metaverse-canvas');
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

        this._castRay(camera);
    },

    _castRay(camera) {
        this.raycaster.setFromCamera(this.mouse, camera);

        // Check NPC avatars
        const npcGroups = NPC.npcs.map(npc => npc.avatarData.group);
        const intersects = this.raycaster.intersectObjects(npcGroups, true);

        if (intersects.length > 0) {
            // Find which NPC was clicked
            let clickedGroup = intersects[0].object;
            while (clickedGroup.parent && !NPC.npcs.find(n => n.avatarData.group === clickedGroup)) {
                clickedGroup = clickedGroup.parent;
            }

            const npc = NPC.npcs.find(n => n.avatarData.group === clickedGroup);
            if (npc) {
                this.showInfo(npc);
            }
        } else {
            this.hideInfo();
        }
    },

    showInfo(npc) {
        this.selectedNPC = npc;
        this.isInfoVisible = true;

        const panel = this.infoPanel;
        panel.classList.remove('hidden');

        panel.querySelector('.npc-info-name').textContent = npc.name;
        panel.querySelector('.npc-info-color').style.backgroundColor = npc.color;

        const greeting = this.NPC_DIALOGUES.greeting[
            Utils.randomInt(0, this.NPC_DIALOGUES.greeting.length - 1)
        ];
        panel.querySelector('.npc-info-dialogue').textContent = greeting;

        // NPC waves when clicked
        Avatar.playEmote(npc.id, 'wave');
        Chat.addMessage(npc.name, greeting, npc.color, false);
    },

    hideInfo() {
        this.isInfoVisible = false;
        this.selectedNPC = null;
        this.infoPanel.classList.add('hidden');
    },

    _doAction(action) {
        if (!this.selectedNPC) return;

        const npc = this.selectedNPC;
        let dialoguePool;
        let emote;

        switch (action) {
            case 'greet':
                dialoguePool = this.NPC_DIALOGUES.greeting;
                emote = 'wave';
                // Player also waves
                if (App.playerId) {
                    Avatar.playEmote(App.playerId, 'wave');
                }
                break;
            case 'talk':
                dialoguePool = this.NPC_DIALOGUES.about;
                emote = null;
                break;
            case 'tip':
                dialoguePool = this.NPC_DIALOGUES.tip;
                emote = 'clap';
                break;
            default:
                return;
        }

        const dialogue = dialoguePool[Utils.randomInt(0, dialoguePool.length - 1)];
        this.infoPanel.querySelector('.npc-info-dialogue').textContent = dialogue;

        Chat.addMessage(npc.name, dialogue, npc.color, false);

        if (emote) {
            Avatar.playEmote(npc.id, emote);
        }
    },

    cleanup() {
        this.hideInfo();
        this._camera = null;
    }
};
