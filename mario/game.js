"use strict";

/* =========================================================
   スーパー・ジャンプアドベンチャー
   HTML5 Canvas で作ったマリオ風プラットフォーマー
   ========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const VIEW_W = canvas.width;   // 800
const VIEW_H = canvas.height;  // 450
const TILE = 40;               // 1マスのピクセル数

// ---- 物理パラメータ ----
const GRAVITY = 0.8;
const MOVE_ACCEL = 0.9;
const MAX_RUN = 5.2;
const FRICTION = 0.78;
const JUMP_POWER = 14.5;
const ENEMY_SPEED = 1.2;

/* =========================================================
   レベルデータ
   X = 地面/ブロック  B = レンガ  ? = コインブロック
   C = コイン  E = 敵  G = ゴール旗  P = プレイヤー開始位置
   ========================================================= */
const LEVEL = [
  "                                                                                                ",
  "                                                                                                ",
  "                                                                                                ",
  "                                                                                                ",
  "                                                                   CCCCC                        ",
  "                   CCC                                            XXXXXXX                        ",
  "                  XXXXX                            CCCC             E                  B?B       ",
  "          CCC            B?B            E         XXXXXX                       CECCC             ",
  "         XXXXX                         CCCCC                                  XXXXXXX            ",
  "                                      XXXXXXX                                                    ",
  "                                                                                                ",
  "   P            E         E                   CCC E                     CCC E         E      G   ",
  "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX   XXXXXXXXXXXXXXXXXXXXXXXXX   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX ",
  "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX   XXXXXXXXXXXXXXXXXXXXXXXXX   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX ",
];

const ROWS = LEVEL.length;
const COLS = Math.max(...LEVEL.map(r => r.length));
const LEVEL_W = COLS * TILE;
const LEVEL_H = ROWS * TILE;

// solid タイルかどうか
function isSolidChar(ch) {
  return ch === "X" || ch === "B" || ch === "?";
}

/* =========================================================
   ゲーム状態
   ========================================================= */
let solids = [];     // {x,y,w,h,type,col,row,used}
let coins = [];      // {x,y,r,taken,bob}
let enemies = [];    // {x,y,w,h,vx,alive,squashTime}
let goal = null;     // {x,y,w,h}
let player = null;
let camX = 0;
let score = 0;
let coinsCollected = 0;
let lives = 3;
let gameState = "start"; // start | playing | dead | win
let elapsedFrames = 0;

const keys = { left: false, right: false, jump: false };

/* =========================================================
   レベル構築
   ========================================================= */
function buildLevel() {
  solids = [];
  coins = [];
  enemies = [];
  goal = null;
  let spawn = { x: 80, y: 80 };

  for (let r = 0; r < ROWS; r++) {
    const row = LEVEL[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const x = c * TILE;
      const y = r * TILE;
      switch (ch) {
        case "X":
          solids.push({ x, y, w: TILE, h: TILE, type: "ground", col: c, row: r });
          break;
        case "B":
          solids.push({ x, y, w: TILE, h: TILE, type: "brick", col: c, row: r });
          break;
        case "?":
          solids.push({ x, y, w: TILE, h: TILE, type: "question", col: c, row: r, used: false });
          break;
        case "C":
          coins.push({ x: x + TILE / 2, y: y + TILE / 2, r: 9, taken: false, bob: Math.random() * Math.PI * 2 });
          break;
        case "E":
          enemies.push({ x: x + 4, y: y + 4, w: TILE - 8, h: TILE - 8, vx: -ENEMY_SPEED, alive: true, squashTime: 0 });
          break;
        case "G":
          goal = { x: x + TILE / 2 - 4, y: y, w: 8, h: TILE };
          break;
        case "P":
          spawn = { x: x, y: y };
          break;
      }
    }
  }

  player = {
    x: spawn.x,
    y: spawn.y,
    w: 28,
    h: 36,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    invuln: 0,
    walkFrame: 0,
  };
  camX = 0;
}

/* =========================================================
   当たり判定ユーティリティ
   ========================================================= */
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// X軸とY軸を分離して solid と衝突解決
function moveAndCollide(ent) {
  // --- X軸 ---
  ent.x += ent.vx;
  for (const s of solids) {
    if (aabb(ent, s)) {
      if (ent.vx > 0) ent.x = s.x - ent.w;
      else if (ent.vx < 0) ent.x = s.x + s.w;
      ent.vx = 0;
    }
  }
  // --- Y軸 ---
  ent.y += ent.vy;
  ent.onGround = false;
  for (const s of solids) {
    if (aabb(ent, s)) {
      if (ent.vy > 0) {
        // 落下中：上に乗る
        ent.y = s.y - ent.h;
        ent.vy = 0;
        ent.onGround = true;
      } else if (ent.vy < 0) {
        // 上昇中：頭をぶつける
        ent.y = s.y + s.h;
        ent.vy = 0;
        hitBlockFromBelow(s);
      }
    }
  }
}

// 下からブロックを叩いたとき
function hitBlockFromBelow(s) {
  if (s.type === "question" && !s.used) {
    s.used = true;
    score += 200;
    coinsCollected += 1;
    // ブロックの上にコインが弾けるエフェクト代わりにスコアコイン
    spawnPopCoin(s.x + TILE / 2, s.y - 6);
  }
}

let popCoins = []; // 叩いたとき飛び出す演出コイン
function spawnPopCoin(x, y) {
  popCoins.push({ x, y, vy: -7, life: 28 });
}

/* =========================================================
   更新処理
   ========================================================= */
function update() {
  elapsedFrames++;

  // --- プレイヤー入力 ---
  if (keys.left) {
    player.vx -= MOVE_ACCEL;
    player.facing = -1;
  }
  if (keys.right) {
    player.vx += MOVE_ACCEL;
    player.facing = 1;
  }
  if (!keys.left && !keys.right) {
    player.vx *= FRICTION;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }
  player.vx = Math.max(-MAX_RUN, Math.min(MAX_RUN, player.vx));

  // ジャンプ
  if (keys.jump && player.onGround) {
    player.vy = -JUMP_POWER;
    player.onGround = false;
  }
  // ジャンプの高さ調整（離したら減速）
  if (!keys.jump && player.vy < -5) {
    player.vy = -5;
  }

  player.vy += GRAVITY;
  if (player.vy > 18) player.vy = 18;

  moveAndCollide(player);

  // 歩行アニメ用
  if (Math.abs(player.vx) > 0.4 && player.onGround) player.walkFrame += 0.2;
  else player.walkFrame = 0;

  if (player.invuln > 0) player.invuln--;

  // 画面外（左端）に出ないように
  if (player.x < 0) { player.x = 0; player.vx = 0; }

  // 落下死
  if (player.y > LEVEL_H + 80) {
    loseLife();
    return;
  }

  // --- 敵の更新 ---
  for (const e of enemies) {
    if (!e.alive) {
      if (e.squashTime > 0) e.squashTime--;
      continue;
    }
    e.vy = (e.vy || 0) + GRAVITY;
    if (e.vy > 18) e.vy = 18;

    // X移動 + 壁で反転
    e.x += e.vx;
    let hitWall = false;
    for (const s of solids) {
      if (aabb(e, s)) {
        if (e.vx > 0) e.x = s.x - e.w;
        else if (e.vx < 0) e.x = s.x + s.w;
        hitWall = true;
      }
    }
    if (hitWall) e.vx *= -1;

    // Y移動
    e.y += e.vy;
    let onGround = false;
    for (const s of solids) {
      if (aabb(e, s)) {
        if (e.vy > 0) { e.y = s.y - e.h; e.vy = 0; onGround = true; }
        else if (e.vy < 0) { e.y = s.y + s.h; e.vy = 0; }
      }
    }

    // 足元に床がなければ反転（落ちない敵）
    if (onGround) {
      const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const footY = e.y + e.h + 4;
      let groundAhead = false;
      for (const s of solids) {
        if (aheadX >= s.x && aheadX <= s.x + s.w && footY >= s.y && footY <= s.y + s.h) {
          groundAhead = true;
          break;
        }
      }
      if (!groundAhead) e.vx *= -1;
    }

    // 奈落に落ちた敵は消す
    if (e.y > LEVEL_H + 80) e.alive = false;

    // --- プレイヤーとの接触 ---
    if (aabb(player, e)) {
      const playerFalling = player.vy > 0;
      const playerAbove = player.y + player.h - e.y < 18;
      if (playerFalling && playerAbove) {
        // 踏みつけ
        e.alive = false;
        e.squashTime = 22;
        player.vy = -JUMP_POWER * 0.62;
        score += 100;
      } else if (player.invuln === 0) {
        damagePlayer();
      }
    }
  }

  // --- コイン取得 ---
  const pc = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const co of coins) {
    if (co.taken) continue;
    co.bob += 0.12;
    const box = { x: co.x - co.r, y: co.y - co.r, w: co.r * 2, h: co.r * 2 };
    if (aabb(pc, box)) {
      co.taken = true;
      coinsCollected++;
      score += 50;
    }
  }

  // 演出コイン
  for (const p of popCoins) {
    p.y += p.vy;
    p.vy += 0.5;
    p.life--;
  }
  popCoins = popCoins.filter(p => p.life > 0);

  // --- ゴール判定 ---
  if (goal && aabb(player, goal)) {
    winGame();
    return;
  }

  // --- カメラ追従 ---
  const target = player.x - VIEW_W * 0.4;
  camX += (target - camX) * 0.12;
  camX = Math.max(0, Math.min(camX, LEVEL_W - VIEW_W));
}

function damagePlayer() {
  player.invuln = 90;
  player.vy = -8;
  player.vx = -player.facing * 6;
  lives--;
  if (lives <= 0) {
    setTimeout(() => endGame(false), 400);
  }
}

function loseLife() {
  lives--;
  if (lives <= 0) {
    endGame(false);
  } else {
    // リスポーン
    const spawn = findSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 60;
    camX = 0;
  }
}

function findSpawn() {
  for (let r = 0; r < ROWS; r++) {
    const c = LEVEL[r].indexOf("P");
    if (c >= 0) return { x: c * TILE, y: r * TILE };
  }
  return { x: 80, y: 80 };
}

function winGame() {
  if (gameState !== "playing") return;
  endGame(true);
}

/* =========================================================
   描画
   ========================================================= */
function draw() {
  // 空グラデーション
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#5c94fc");
  sky.addColorStop(1, "#9bd0ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawClouds();
  drawHills();

  ctx.save();
  ctx.translate(-Math.round(camX), 0);

  drawSolids();
  drawCoins();
  drawPopCoins();
  drawGoal();
  drawEnemies();
  drawPlayer();

  ctx.restore();

  drawHUD();
}

function drawClouds() {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 260 - camX * 0.3) % (LEVEL_W)) ;
    let x = cx;
    if (x < -120) x += LEVEL_W;
    const y = 50 + (i % 3) * 40;
    cloud(x, y);
  }
}
function cloud(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 4, 22, 0, Math.PI * 2);
  ctx.arc(x + 48, y, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawHills() {
  ctx.fillStyle = "#5cae3a";
  for (let i = 0; i < 8; i++) {
    let x = (i * 320 - camX * 0.5);
    x = ((x % LEVEL_W) + LEVEL_W) % LEVEL_W;
    const baseY = LEVEL_H - 2 * TILE;
    ctx.beginPath();
    ctx.moveTo(x - 90, baseY);
    ctx.quadraticCurveTo(x, baseY - 120, x + 90, baseY);
    ctx.fill();
  }
}

function drawSolids() {
  for (const s of solids) {
    if (s.x + s.w < camX || s.x > camX + VIEW_W) continue;
    if (s.type === "ground") {
      ctx.fillStyle = "#c8722b";
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = "#7fce4b";
      if (s.row === 0 || LEVEL[s.row - 1][s.col] !== "X") {
        ctx.fillRect(s.x, s.y, s.w, 8);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
    } else if (s.type === "brick") {
      ctx.fillStyle = "#b5651d";
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.h / 2); ctx.lineTo(s.x + s.w, s.y + s.h / 2);
      ctx.moveTo(s.x + s.w / 2, s.y); ctx.lineTo(s.x + s.w / 2, s.y + s.h / 2);
      ctx.moveTo(s.x + s.w / 4, s.y + s.h / 2); ctx.lineTo(s.x + s.w / 4, s.y + s.h);
      ctx.moveTo(s.x + 3 * s.w / 4, s.y + s.h / 2); ctx.lineTo(s.x + 3 * s.w / 4, s.y + s.h);
      ctx.stroke();
    } else if (s.type === "question") {
      ctx.fillStyle = s.used ? "#9b7a3a" : "#f0a821";
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3);
      if (!s.used) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", s.x + s.w / 2, s.y + s.h / 2 + 1);
      }
    }
  }
}

function drawCoins() {
  for (const co of coins) {
    if (co.taken) continue;
    const yy = co.y + Math.sin(co.bob) * 3;
    const wobble = Math.abs(Math.cos(co.bob));
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.ellipse(co.x, yy, co.r * (0.35 + 0.65 * wobble), co.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bf9000";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawPopCoins() {
  ctx.fillStyle = "#ffd700";
  for (const p of popCoins) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoal() {
  if (!goal) return;
  // ポール
  ctx.fillStyle = "#cfcfcf";
  ctx.fillRect(goal.x, goal.y - TILE * 6, goal.w, TILE * 7);
  // 旗
  ctx.fillStyle = "#e52521";
  ctx.beginPath();
  ctx.moveTo(goal.x, goal.y - TILE * 6);
  ctx.lineTo(goal.x - 42, goal.y - TILE * 6 + 16);
  ctx.lineTo(goal.x, goal.y - TILE * 6 + 32);
  ctx.fill();
  // 玉
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(goal.x + goal.w / 2, goal.y - TILE * 6 - 4, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive && e.squashTime <= 0) continue;
    if (e.x + e.w < camX || e.x > camX + VIEW_W) continue;

    if (!e.alive) {
      // つぶれた敵
      ctx.fillStyle = "#8b4a2b";
      ctx.fillRect(e.x, e.y + e.h - 8, e.w, 8);
      continue;
    }
    // 胴体（クリボー風）
    ctx.fillStyle = "#9b5523";
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h * 0.4, e.w / 2, e.h * 0.42, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(e.x, e.y + e.h * 0.4, e.w, e.h * 0.45);
    // 足
    ctx.fillStyle = "#3a1d0e";
    const f = Math.sin(elapsedFrames * 0.2) > 0 ? 1 : -1;
    ctx.fillRect(e.x + 2, e.y + e.h - 6, e.w * 0.4, 6);
    ctx.fillRect(e.x + e.w * 0.6 - 2, e.y + e.h - 6, e.w * 0.4, 6);
    // 目
    ctx.fillStyle = "#fff";
    ctx.fillRect(e.x + e.w * 0.22, e.y + e.h * 0.28, 6, 8);
    ctx.fillRect(e.x + e.w * 0.62, e.y + e.h * 0.28, 6, 8);
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x + e.w * 0.24, e.y + e.h * 0.32, 3, 4);
    ctx.fillRect(e.x + e.w * 0.64, e.y + e.h * 0.32, 3, 4);
  }
}

function drawPlayer() {
  // 無敵中は点滅
  if (player.invuln > 0 && Math.floor(player.invuln / 5) % 2 === 0) return;

  const px = player.x, py = player.y, w = player.w, h = player.h;
  ctx.save();
  // 体（オーバーオール）
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(px + 2, py + h * 0.45, w - 4, h * 0.55);
  // シャツ
  ctx.fillStyle = "#e52521";
  ctx.fillRect(px + 2, py + h * 0.35, w - 4, h * 0.2);
  // 顔
  ctx.fillStyle = "#ffce9e";
  ctx.fillRect(px + 5, py + h * 0.12, w - 10, h * 0.28);
  // 帽子
  ctx.fillStyle = "#e52521";
  ctx.fillRect(px + 2, py + 2, w - 4, h * 0.16);
  ctx.fillRect(player.facing > 0 ? px + w - 6 : px - 4, py + h * 0.1, 10, 6);
  // 目
  ctx.fillStyle = "#000";
  const eyeX = player.facing > 0 ? px + w - 11 : px + 7;
  ctx.fillRect(eyeX, py + h * 0.2, 3, 5);
  // 足（歩行）
  ctx.fillStyle = "#5a2e0d";
  const step = Math.sin(player.walkFrame) * 4;
  ctx.fillRect(px + 3, py + h - 5 + (player.onGround ? step : 0), 9, 5);
  ctx.fillRect(px + w - 12, py + h - 5 - (player.onGround ? step : 0), 9, 5);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, VIEW_W, 36);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("🪙 × " + coinsCollected, 16, 18);
  ctx.fillText("SCORE " + score, 160, 18);
  ctx.textAlign = "right";
  ctx.fillText("残機 × " + Math.max(0, lives), VIEW_W - 16, 18);
}

/* =========================================================
   メインループ
   ========================================================= */
function loop() {
  if (gameState === "playing") {
    update();
  }
  draw();
  requestAnimationFrame(loop);
}

/* =========================================================
   画面遷移
   ========================================================= */
const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const endTitle = document.getElementById("end-title");
const endMsg = document.getElementById("end-msg");
const touchControls = document.getElementById("touch-controls");

function startGame() {
  score = 0;
  coinsCollected = 0;
  lives = 3;
  popCoins = [];
  buildLevel();
  gameState = "playing";
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
}

function endGame(won) {
  gameState = won ? "win" : "dead";
  endTitle.textContent = won ? "クリア！ 🎉" : "ゲームオーバー";
  endMsg.textContent = `コイン ${coinsCollected} 枚 ／ スコア ${score}`;
  endScreen.classList.remove("hidden");
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);

/* =========================================================
   入力
   ========================================================= */
function setKey(action, val) {
  if (action === "left") keys.left = val;
  else if (action === "right") keys.right = val;
  else if (action === "jump") keys.jump = val;
}

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "ArrowLeft": case "KeyA": setKey("left", true); break;
    case "ArrowRight": case "KeyD": setKey("right", true); break;
    case "ArrowUp": case "KeyW": case "Space": setKey("jump", true); e.preventDefault(); break;
    case "Enter":
      if (gameState !== "playing") startGame();
      break;
  }
});
window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "ArrowLeft": case "KeyA": setKey("left", false); break;
    case "ArrowRight": case "KeyD": setKey("right", false); break;
    case "ArrowUp": case "KeyW": case "Space": setKey("jump", false); break;
  }
});

// タッチ操作
function isTouchDevice() {
  return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}
if (isTouchDevice()) {
  touchControls.classList.remove("hidden");
}
document.querySelectorAll(".tbtn").forEach(btn => {
  const action = btn.dataset.key;
  const press = (e) => { e.preventDefault(); setKey(action, true); };
  const release = (e) => { e.preventDefault(); setKey(action, false); };
  btn.addEventListener("touchstart", press, { passive: false });
  btn.addEventListener("touchend", release, { passive: false });
  btn.addEventListener("touchcancel", release, { passive: false });
  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);
});

// 初期化
buildLevel();
loop();
