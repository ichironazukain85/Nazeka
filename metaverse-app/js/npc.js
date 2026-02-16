/* ========================================
   npc.js — NPC (simulated other users)
   Metapa-style: pastel colors, cute names
   ======================================== */

const NPC = {
    npcs: [],

    NAMES: ['Hana', 'Ren', 'Yuki', 'Sora', 'Aki', 'Mio', 'Kai', 'Ryo'],
    COLORS: ['#f8bbd0', '#b2dfdb', '#c5cae9', '#fff9c4', '#ffe0b2', '#d1c4e9', '#b3e5fc', '#c8e6c9'],
    MESSAGES: [
        'こんにちは!',
        'いい天気だね',
        'かわいいアバター!',
        '一緒に探検しない?',
        'ここ楽しいね',
        'のんびり中',
        'いい雰囲気だね',
        'ようこそ!',
        'きょろきょろ...',
        'すてきな場所!',
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

            this.npcs.push({
                id, name, color, avatarData,
                state: 'idle',
                stateTimer: Utils.randomRange(2, 8),
                targetX: x, targetZ: z,
                chatTimer: Utils.randomRange(10, 30)
            });
        }
    },

    update(dt, time) {
        this.npcs.forEach(npc => {
            npc.stateTimer -= dt;
            npc.chatTimer -= dt;

            if (npc.stateTimer <= 0) {
                if (npc.state === 'idle') {
                    npc.state = 'walking';
                    npc.targetX = Utils.randomRange(-25, 25);
                    npc.targetZ = Utils.randomRange(-25, 25);
                    npc.stateTimer = Utils.randomRange(3, 8);
                } else {
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
                    const speed = 3.5;
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

            if (npc.chatTimer <= 0) {
                const msg = this.MESSAGES[Utils.randomInt(0, this.MESSAGES.length - 1)];
                Chat.addMessage(npc.name, msg, npc.color, false);
                npc.chatTimer = Utils.randomRange(15, 45);
                if (Math.random() < 0.3) {
                    const emotes = ['wave', 'dance', 'clap'];
                    Avatar.playEmote(npc.id, emotes[Utils.randomInt(0, emotes.length - 1)]);
                }
            }
        });
    },

    getCount() { return this.npcs.length; },

    cleanup(scene) {
        this.npcs.forEach(npc => Avatar.remove(scene, npc.id));
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
