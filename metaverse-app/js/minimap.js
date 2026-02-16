/* ========================================
   minimap.js — Top-down minimap renderer
   ======================================== */

const Minimap = {
    canvas: null,
    ctx: null,
    visible: false,
    scale: 2.2, // pixels per world unit

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

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Clear
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        this.ctx.fillRect(0, 0, w, h);

        // Room boundary
        const roomPixels = World.ROOM_SIZE * this.scale;
        this.ctx.strokeStyle = 'rgba(100, 140, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            cx - roomPixels / 2,
            cy - roomPixels / 2,
            roomPixels,
            roomPixels
        );

        // Grid
        this.ctx.strokeStyle = 'rgba(100, 140, 255, 0.08)';
        const gridStep = 10 * this.scale;
        for (let gx = cx - roomPixels / 2; gx <= cx + roomPixels / 2; gx += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(gx, cy - roomPixels / 2);
            this.ctx.lineTo(gx, cy + roomPixels / 2);
            this.ctx.stroke();
        }
        for (let gy = cy - roomPixels / 2; gy <= cy + roomPixels / 2; gy += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(cx - roomPixels / 2, gy);
            this.ctx.lineTo(cx + roomPixels / 2, gy);
            this.ctx.stroke();
        }

        const px = playerAvatar ? playerAvatar.group.position.x : 0;
        const pz = playerAvatar ? playerAvatar.group.position.z : 0;

        // NPC dots
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

        // Player dot (center with direction indicator)
        this.ctx.fillStyle = '#4fc3f7';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Player direction arrow
        if (playerAvatar) {
            const rot = playerAvatar.group.rotation.y;
            const arrowLen = 10;
            this.ctx.strokeStyle = '#4fc3f7';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(
                cx + Math.sin(rot) * arrowLen,
                cy + Math.cos(rot) * arrowLen
            );
            this.ctx.stroke();
        }

        // Legend
        this.ctx.fillStyle = 'rgba(200, 200, 220, 0.5)';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('MAP', 6, 14);
    }
};
