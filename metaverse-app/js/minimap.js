/* ========================================
   minimap.js — Pastel minimap renderer
   ======================================== */

const Minimap = {
    canvas: null,
    ctx: null,
    visible: false,
    scale: 2.2,

    init() {
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    toggle() {
        this.visible = !this.visible;
        this.canvas.classList.toggle('hidden', !this.visible);
    },

    draw(playerAvatar, npcPositions, roomConfig) {
        if (!this.visible || !this.ctx) return;

        const w = this.canvas.width, h = this.canvas.height;
        const cx = w / 2, cy = h / 2;

        // Soft background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.fillRect(0, 0, w, h);

        // Room boundary
        const roomPx = World.ROOM_SIZE * this.scale;
        this.ctx.strokeStyle = 'rgba(165, 214, 167, 0.35)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cx - roomPx / 2, cy - roomPx / 2, roomPx, roomPx);

        // Grid
        this.ctx.strokeStyle = 'rgba(165, 214, 167, 0.1)';
        const step = 10 * this.scale;
        for (let gx = cx - roomPx / 2; gx <= cx + roomPx / 2; gx += step) {
            this.ctx.beginPath(); this.ctx.moveTo(gx, cy - roomPx / 2);
            this.ctx.lineTo(gx, cy + roomPx / 2); this.ctx.stroke();
        }
        for (let gy = cy - roomPx / 2; gy <= cy + roomPx / 2; gy += step) {
            this.ctx.beginPath(); this.ctx.moveTo(cx - roomPx / 2, gy);
            this.ctx.lineTo(cx + roomPx / 2, gy); this.ctx.stroke();
        }

        const px = playerAvatar ? playerAvatar.group.position.x : 0;
        const pz = playerAvatar ? playerAvatar.group.position.z : 0;

        // NPC dots — pastel colors
        npcPositions.forEach(npc => {
            const nx = cx + (npc.x - px) * this.scale;
            const ny = cy + (npc.z - pz) * this.scale;
            if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
                this.ctx.fillStyle = npc.color;
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Player dot — soft green
        this.ctx.fillStyle = '#81c784';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Direction arrow
        if (playerAvatar) {
            const rot = playerAvatar.group.rotation.y;
            this.ctx.strokeStyle = '#81c784';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.sin(rot) * 10, cy + Math.cos(rot) * 10);
            this.ctx.stroke();
        }

        // Label
        this.ctx.fillStyle = 'rgba(140, 140, 160, 0.5)';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('MAP', 6, 14);
    }
};
