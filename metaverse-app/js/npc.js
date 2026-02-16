/* ========================================
   npc.js — NPC (simulated other users)
   ======================================== */

const NPC = {
    npcs: [],

    NAMES: ['Hana', 'Ren', 'Yuki', 'Sora', 'Aki', 'Mio', 'Kai', 'Ryo'],
    COLORS: ['#ef5350', '#66bb6a', '#ffa726', '#ab47bc', '#ec407a', '#26c6da', '#ffee58', '#8d6e63'],
    MESSAGES: [
        'Hey there!',
        'This place is awesome',
        'Nice avatar!',
        'Anyone want to explore?',
        'Love the vibe here',
        'Just chilling',
        'What a great room',
        'Welcome!',
        'Looking around...',
        'This is so cool',
    ],

    scene: null,

    init(scene, roomId, count) {
        this.scene = scene;
        this.npcs = [];

        for (let i = 0; i < count; i++) {
            const name = this.NAMES[i % this.NAMES.length];
            const color = this.COLORS[i % this.COLORS.length];
            const x = Utils.randomRange(-25, 25);
            const z = Utils.randomRange(-25, 25);

            const id = 'npc_' + Utils.generateId();
            const avatarData = Avatar.create(scene, { id, name, color, x, z });

            const npc = {
                id,
                name,
                color,
                avatarData,
                state: 'idle',
                stateTimer: Utils.randomRange(2, 8),
                targetX: x,
                targetZ: z,
                chatTimer: Utils.randomRange(10, 30)
            };

            this.npcs.push(npc);
        }
    },

    update(dt, time) {
        this.npcs.forEach(npc => {
            npc.stateTimer -= dt;
            npc.chatTimer -= dt;

            // State machine
            if (npc.stateTimer <= 0) {
                if (npc.state === 'idle') {
                    // Start walking to a random point
                    npc.state = 'walking';
                    npc.targetX = Utils.randomRange(-25, 25);
                    npc.targetZ = Utils.randomRange(-25, 25);
                    npc.stateTimer = Utils.randomRange(3, 8);
                } else {
                    // Stop and idle
                    npc.state = 'idle';
                    npc.stateTimer = Utils.randomRange(3, 10);
                }
            }

            const avatar = npc.avatarData;

            if (npc.state === 'walking') {
                const dx = npc.targetX - avatar.group.position.x;
                const dz = npc.targetZ - avatar.group.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 0.5) {
                    const speed = 4;
                    avatar.targetX += (dx / dist) * speed * dt;
                    avatar.targetZ += (dz / dist) * speed * dt;
                    avatar.targetRotY = Math.atan2(dx, dz);
                    avatar.velocity.x = (dx / dist) * speed;
                    avatar.velocity.z = (dz / dist) * speed;
                } else {
                    npc.state = 'idle';
                    npc.stateTimer = Utils.randomRange(3, 8);
                    avatar.velocity.x = 0;
                    avatar.velocity.z = 0;
                }
            } else {
                avatar.velocity.x = 0;
                avatar.velocity.z = 0;
            }

            // Occasional chat
            if (npc.chatTimer <= 0) {
                const msg = this.MESSAGES[Utils.randomInt(0, this.MESSAGES.length - 1)];
                Chat.addMessage(npc.name, msg, npc.color, false);
                npc.chatTimer = Utils.randomRange(15, 45);

                // Occasional emote
                if (Math.random() < 0.3) {
                    const emotes = ['wave', 'dance', 'clap'];
                    Avatar.playEmote(npc.id, emotes[Utils.randomInt(0, emotes.length - 1)]);
                }
            }
        });
    },

    getCount() {
        return this.npcs.length;
    },

    cleanup(scene) {
        this.npcs.forEach(npc => {
            Avatar.remove(scene, npc.id);
        });
        this.npcs = [];
    },

    getPositions() {
        return this.npcs.map(npc => ({
            x: npc.avatarData.group.position.x,
            z: npc.avatarData.group.position.z,
            color: npc.color
        }));
    }
};
