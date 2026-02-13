// ============================================================
// テトリス - Tetris Game
// ============================================================

(() => {
    "use strict";

    // --- Constants ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const NEXT_BLOCK_SIZE = 20;
    const HOLD_BLOCK_SIZE = 20;

    const COLORS = {
        I: "#00f0f0",
        O: "#f0f000",
        T: "#a000f0",
        S: "#00f000",
        Z: "#f00000",
        J: "#0000f0",
        L: "#f0a000",
    };

    const GHOST_ALPHA = 0.25;

    // Tetromino shapes (rotation states)
    const TETROMINOES = {
        I: [
            [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
            [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
            [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
            [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
        ],
        O: [
            [[1,1],[1,1]],
            [[1,1],[1,1]],
            [[1,1],[1,1]],
            [[1,1],[1,1]],
        ],
        T: [
            [[0,1,0],[1,1,1],[0,0,0]],
            [[0,1,0],[0,1,1],[0,1,0]],
            [[0,0,0],[1,1,1],[0,1,0]],
            [[0,1,0],[1,1,0],[0,1,0]],
        ],
        S: [
            [[0,1,1],[1,1,0],[0,0,0]],
            [[0,1,0],[0,1,1],[0,0,1]],
            [[0,0,0],[0,1,1],[1,1,0]],
            [[1,0,0],[1,1,0],[0,1,0]],
        ],
        Z: [
            [[1,1,0],[0,1,1],[0,0,0]],
            [[0,0,1],[0,1,1],[0,1,0]],
            [[0,0,0],[1,1,0],[0,1,1]],
            [[0,1,0],[1,1,0],[1,0,0]],
        ],
        J: [
            [[1,0,0],[1,1,1],[0,0,0]],
            [[0,1,1],[0,1,0],[0,1,0]],
            [[0,0,0],[1,1,1],[0,0,1]],
            [[0,1,0],[0,1,0],[1,1,0]],
        ],
        L: [
            [[0,0,1],[1,1,1],[0,0,0]],
            [[0,1,0],[0,1,0],[0,1,1]],
            [[0,0,0],[1,1,1],[1,0,0]],
            [[1,1,0],[0,1,0],[0,1,0]],
        ],
    };

    // SRS wall kick data
    const WALL_KICKS = {
        normal: [
            [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
            [[0,0],[1,0],[1,-1],[0,2],[1,2]],
            [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
            [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
        ],
        I: [
            [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
            [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
            [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
            [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
        ],
    };

    // Scoring
    const SCORE_TABLE = [0, 100, 300, 500, 800];
    const LINES_PER_LEVEL = 10;

    // --- Canvas Setup ---
    const gameCanvas = document.getElementById("gameCanvas");
    const gameCtx = gameCanvas.getContext("2d");
    const nextCanvas = document.getElementById("nextCanvas");
    const nextCtx = nextCanvas.getContext("2d");
    const holdCanvas = document.getElementById("holdCanvas");
    const holdCtx = holdCanvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const linesEl = document.getElementById("lines");
    const overlay = document.getElementById("overlay");
    const overlayText = document.getElementById("overlayText");
    const restartBtn = document.getElementById("restartBtn");

    // --- Game State ---
    let board = [];
    let currentPiece = null;
    let nextPieces = [];
    let holdPiece = null;
    let canHold = true;
    let score = 0;
    let level = 1;
    let totalLines = 0;
    let gameOver = false;
    let paused = false;
    let dropInterval = 1000;
    let lastDrop = 0;
    let animationId = null;
    let bag = [];

    // --- Bag Randomizer (7-bag) ---
    function generateBag() {
        const pieces = ["I", "O", "T", "S", "Z", "J", "L"];
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        return pieces;
    }

    function nextFromBag() {
        if (bag.length === 0) {
            bag = generateBag();
        }
        return bag.pop();
    }

    // --- Piece Creation ---
    function createPiece(type) {
        const shapes = TETROMINOES[type];
        return {
            type,
            rotation: 0,
            shape: shapes[0],
            x: Math.floor(COLS / 2) - Math.ceil(shapes[0][0].length / 2),
            y: 0,
        };
    }

    function spawnPiece() {
        while (nextPieces.length < 3) {
            nextPieces.push(nextFromBag());
        }
        const type = nextPieces.shift();
        nextPieces.push(nextFromBag());
        currentPiece = createPiece(type);

        if (!isValidPosition(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            gameOver = true;
            showOverlay("GAME OVER");
        }
        canHold = true;
    }

    // --- Board ---
    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    function isValidPosition(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const x = px + c;
                const y = py + r;
                if (x < 0 || x >= COLS || y >= ROWS) return false;
                if (y >= 0 && board[y][x]) return false;
            }
        }
        return true;
    }

    function lockPiece() {
        const { shape, x, y, type } = currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const boardY = y + r;
                const boardX = x + c;
                if (boardY < 0) {
                    gameOver = true;
                    showOverlay("GAME OVER");
                    return;
                }
                board[boardY][boardX] = type;
            }
        }
        clearLines();
        spawnPiece();
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== null)) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(null));
                cleared++;
                r++; // re-check this row
            }
        }
        if (cleared > 0) {
            totalLines += cleared;
            score += SCORE_TABLE[cleared] * level;
            level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;
            dropInterval = Math.max(50, 1000 - (level - 1) * 80);
            updateUI();
        }
    }

    // --- Movement ---
    function movePiece(dx, dy) {
        if (gameOver || paused) return false;
        const newX = currentPiece.x + dx;
        const newY = currentPiece.y + dy;
        if (isValidPosition(currentPiece.shape, newX, newY)) {
            currentPiece.x = newX;
            currentPiece.y = newY;
            return true;
        }
        return false;
    }

    function rotatePiece(dir) {
        if (gameOver || paused) return;
        const { type, rotation } = currentPiece;
        const newRotation = (rotation + dir + 4) % 4;
        const newShape = TETROMINOES[type][newRotation];
        const kicks = type === "I" ? WALL_KICKS.I : WALL_KICKS.normal;
        const kickIndex = dir === 1
            ? rotation
            : (rotation + 3) % 4;

        for (const [kx, ky] of kicks[kickIndex]) {
            const testX = currentPiece.x + kx;
            const testY = currentPiece.y - ky;
            if (isValidPosition(newShape, testX, testY)) {
                currentPiece.shape = newShape;
                currentPiece.rotation = newRotation;
                currentPiece.x = testX;
                currentPiece.y = testY;
                return;
            }
        }
    }

    function hardDrop() {
        if (gameOver || paused) return;
        let dropped = 0;
        while (movePiece(0, 1)) {
            dropped++;
        }
        score += dropped * 2;
        updateUI();
        lockPiece();
    }

    function getGhostY() {
        let ghostY = currentPiece.y;
        while (isValidPosition(currentPiece.shape, currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    function holdCurrentPiece() {
        if (gameOver || paused || !canHold) return;
        canHold = false;
        const type = currentPiece.type;
        if (holdPiece) {
            const prev = holdPiece;
            holdPiece = type;
            currentPiece = createPiece(prev);
        } else {
            holdPiece = type;
            spawnPiece();
        }
    }

    // --- Drawing ---
    function drawBlock(ctx, x, y, color, size, alpha) {
        ctx.globalAlpha = alpha || 1;
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x * size, y * size, size, size * 0.15);
        ctx.fillRect(x * size, y * size, size * 0.15, size);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(x * size, y * size + size * 0.85, size, size * 0.15);
        ctx.fillRect(x * size + size * 0.85, y * size, size * 0.15, size);

        // Border
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size, y * size, size, size);
        ctx.globalAlpha = 1;
    }

    function drawBoard() {
        gameCtx.fillStyle = "#0a0a0a";
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Grid lines
        gameCtx.strokeStyle = "rgba(255,255,255,0.03)";
        gameCtx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                gameCtx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Placed blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(gameCtx, c, r, COLORS[board[r][c]], BLOCK_SIZE);
                }
            }
        }

        if (currentPiece && !gameOver) {
            // Ghost piece
            const ghostY = getGhostY();
            const { shape, x, type } = currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        drawBlock(gameCtx, x + c, ghostY + r, COLORS[type], BLOCK_SIZE, GHOST_ALPHA);
                    }
                }
            }

            // Current piece
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        drawBlock(gameCtx, x + c, currentPiece.y + r, COLORS[type], BLOCK_SIZE);
                    }
                }
            }
        }
    }

    function drawPreview(ctx, canvas, type, blockSize) {
        ctx.fillStyle = "#16213e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!type) return;
        const shape = TETROMINOES[type][0];
        const offsetX = (canvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (canvas.height - shape.length * blockSize) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = COLORS[type];
                    const bx = offsetX + c * blockSize;
                    const by = offsetY + r * blockSize;
                    ctx.fillRect(bx, by, blockSize, blockSize);
                    ctx.strokeStyle = "rgba(0,0,0,0.3)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, blockSize, blockSize);
                }
            }
        }
    }

    function drawNext() {
        nextCtx.fillStyle = "#16213e";
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        const slotHeight = nextCanvas.height / 3;
        for (let i = 0; i < Math.min(3, nextPieces.length); i++) {
            const type = nextPieces[i];
            const shape = TETROMINOES[type][0];
            const offsetX = (nextCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;
            const offsetY = slotHeight * i + (slotHeight - shape.length * NEXT_BLOCK_SIZE) / 2;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        nextCtx.fillStyle = COLORS[type];
                        const bx = offsetX + c * NEXT_BLOCK_SIZE;
                        const by = offsetY + r * NEXT_BLOCK_SIZE;
                        nextCtx.fillRect(bx, by, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                        nextCtx.strokeStyle = "rgba(0,0,0,0.3)";
                        nextCtx.lineWidth = 1;
                        nextCtx.strokeRect(bx, by, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                    }
                }
            }
        }
    }

    function drawHold() {
        drawPreview(holdCtx, holdCanvas, holdPiece, HOLD_BLOCK_SIZE);
    }

    function draw() {
        drawBoard();
        drawNext();
        drawHold();
    }

    // --- UI ---
    function updateUI() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = totalLines;
    }

    function showOverlay(text) {
        overlayText.textContent = text;
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
    }

    // --- Game Loop ---
    function gameLoop(timestamp) {
        if (gameOver) {
            draw();
            return;
        }
        if (!paused) {
            if (timestamp - lastDrop > dropInterval) {
                if (!movePiece(0, 1)) {
                    lockPiece();
                }
                lastDrop = timestamp;
            }
            draw();
        }
        animationId = requestAnimationFrame(gameLoop);
    }

    // --- Input ---
    document.addEventListener("keydown", (e) => {
        if (gameOver && e.key !== "Enter") return;

        switch (e.key) {
            case "ArrowLeft":
                e.preventDefault();
                movePiece(-1, 0);
                break;
            case "ArrowRight":
                e.preventDefault();
                movePiece(1, 0);
                break;
            case "ArrowDown":
                e.preventDefault();
                if (movePiece(0, 1)) {
                    score += 1;
                    updateUI();
                }
                break;
            case "ArrowUp":
                e.preventDefault();
                rotatePiece(1);
                break;
            case "z":
            case "Z":
                rotatePiece(-1);
                break;
            case " ":
                e.preventDefault();
                hardDrop();
                break;
            case "c":
            case "C":
                holdCurrentPiece();
                break;
            case "p":
            case "P":
                togglePause();
                break;
            case "Enter":
                if (gameOver) startGame();
                break;
        }
    });

    restartBtn.addEventListener("click", () => {
        startGame();
    });

    // --- Touch Controls ---
    function bindTouchBtn(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;
        let intervalId = null;

        const start = (e) => {
            e.preventDefault();
            action();
            // Repeat for directional buttons
            if (id === "btnLeft" || id === "btnRight" || id === "btnDown") {
                intervalId = setInterval(action, 100);
            }
        };
        const stop = (e) => {
            e.preventDefault();
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        btn.addEventListener("touchstart", start, { passive: false });
        btn.addEventListener("touchend", stop, { passive: false });
        btn.addEventListener("touchcancel", stop, { passive: false });
        // Mouse fallback for testing
        btn.addEventListener("mousedown", start);
        btn.addEventListener("mouseup", stop);
        btn.addEventListener("mouseleave", stop);
    }

    bindTouchBtn("btnLeft", () => movePiece(-1, 0));
    bindTouchBtn("btnRight", () => movePiece(1, 0));
    bindTouchBtn("btnDown", () => {
        if (movePiece(0, 1)) {
            score += 1;
            updateUI();
        }
    });
    bindTouchBtn("btnRotate", () => rotatePiece(1));
    bindTouchBtn("btnHardDrop", () => hardDrop());
    bindTouchBtn("btnHold", () => holdCurrentPiece());

    // --- Swipe on game canvas ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    gameCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
    }, { passive: false });

    gameCanvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < 15 && absDy < 15 && dt < 300) {
            // Tap = rotate
            rotatePiece(1);
        } else if (absDy > absDx && dy > 40) {
            // Swipe down = hard drop
            hardDrop();
        }
    }, { passive: false });

    // Prevent scroll / zoom on mobile while playing
    document.addEventListener("touchmove", (e) => {
        if (e.target.closest(".game-container") || e.target.closest(".touch-controls")) {
            e.preventDefault();
        }
    }, { passive: false });

    // --- Responsive Canvas Sizing ---
    function resizeGame() {
        const isMobile = window.innerWidth <= 600;
        if (!isMobile) return;

        const availWidth = window.innerWidth;
        // Board takes ~55% of width, side panels take the rest
        const boardWidth = Math.floor(availWidth * 0.55);
        const scale = boardWidth / 300; // 300 = original canvas width

        const container = document.querySelector(".game-container");
        container.style.transform = `scale(${Math.min(scale, 1)})`;
        container.style.transformOrigin = "top center";
    }

    window.addEventListener("resize", resizeGame);
    resizeGame();

    function togglePause() {
        if (gameOver) return;
        paused = !paused;
        if (paused) {
            showOverlay("PAUSED");
        } else {
            hideOverlay();
            lastDrop = performance.now();
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    // --- Start / Restart ---
    function startGame() {
        board = createBoard();
        bag = [];
        nextPieces = [];
        holdPiece = null;
        canHold = true;
        score = 0;
        level = 1;
        totalLines = 0;
        gameOver = false;
        paused = false;
        dropInterval = 1000;
        lastDrop = performance.now();
        updateUI();
        hideOverlay();
        spawnPiece();

        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        animationId = requestAnimationFrame(gameLoop);
    }

    // --- Init ---
    startGame();
})();
