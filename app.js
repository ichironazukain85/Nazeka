// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  if (document.querySelector(".install-banner")) return;

  const banner = document.createElement("div");
  banner.className = "install-banner";
  banner.innerHTML = `
    <div class="install-banner-text">
      <strong>Nazeka をホーム画面に追加</strong>
      <span>いつでもすぐに診断できます</span>
    </div>
    <button class="btn btn-primary" id="install-btn">追加</button>
    <button class="install-banner-close" id="install-close">&times;</button>
  `;
  document.body.appendChild(banner);

  document.getElementById("install-btn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    banner.remove();
  });

  document.getElementById("install-close").addEventListener("click", () => {
    banner.remove();
  });
}

// ===== State =====
let currentQuestion = 0;
let answers = {};

// ===== Dimension Category Labels =====
const dimensionLabels = {
  EI: "外向性・内向性",
  SN: "感覚・直感",
  TF: "思考・感情",
  JP: "判断・知覚",
};

const optionLetters = ["A", "B", "C", "D"];

// ===== Screen Management =====
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const screen = document.getElementById(screenId);
  screen.classList.add("active");
  window.scrollTo(0, 0);
}

// ===== Quiz Flow =====
function startQuiz() {
  currentQuestion = 0;
  answers = {};
  showScreen("quiz-screen");
  renderQuestion();
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function renderQuestion() {
  const q = questions[currentQuestion];
  const card = document.getElementById("question-card");

  // Animate card
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "cardSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)";

  // Back button
  const backBtn = document.getElementById("back-btn");
  backBtn.disabled = currentQuestion === 0;

  // Progress
  const progress = (currentQuestion / questions.length) * 100;
  document.getElementById("progress-fill").style.width = progress + "%";
  document.getElementById("progress-text").textContent =
    `${currentQuestion + 1} / ${questions.length}`;

  // Category
  document.getElementById("question-category").textContent =
    dimensionLabels[q.dimension] || "";

  // Question text
  document.getElementById("question-text").textContent =
    `Q${currentQuestion + 1}. ${q.text}`;

  // Options
  const container = document.getElementById("options-container");
  container.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `
      <span class="option-label">${optionLetters[idx]}</span>
      <span class="option-text">${opt.text}</span>
    `;
    btn.addEventListener("click", () => selectOption(q.dimension, opt.score, btn));
    container.appendChild(btn);
  });
}

function selectOption(dimension, score, btn) {
  // Visual feedback
  document.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");

  // Store answer
  if (!answers[dimension]) {
    answers[dimension] = [];
  }
  const dimQuestions = questions.filter((q) => q.dimension === dimension);
  const dimIndex = dimQuestions.indexOf(questions[currentQuestion]);
  answers[dimension][dimIndex] = score;

  // Advance after short delay
  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < questions.length) {
      renderQuestion();
    } else {
      showAnalyzing();
    }
  }, 400);
}

// ===== Analysis =====
function showAnalyzing() {
  showScreen("analyzing-screen");

  const messages = [
    "回答を集計しています",
    "性格パターンを分析中...",
    "あなたに合った仕事を検索中...",
    "結果をまとめています...",
  ];

  let i = 0;
  const textEl = document.getElementById("analyzing-text");
  const interval = setInterval(() => {
    i++;
    if (i < messages.length) {
      textEl.style.opacity = "0";
      setTimeout(() => {
        textEl.textContent = messages[i];
        textEl.style.opacity = "1";
      }, 150);
    } else {
      clearInterval(interval);
      showResult();
    }
  }, 800);
}

function calculateType() {
  const scores = {};

  for (const [dim, vals] of Object.entries(answers)) {
    const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    scores[dim] = avg;
  }

  const EI = (scores["EI"] || 0.5) >= 0.5 ? "E" : "I";
  const SN = (scores["SN"] || 0.5) >= 0.5 ? "N" : "S";
  const TF = (scores["TF"] || 0.5) >= 0.5 ? "F" : "T";
  const JP = (scores["JP"] || 0.5) >= 0.5 ? "P" : "J";

  const typeCode = EI + SN + TF + JP;

  return { typeCode, scores };
}

// ===== Result Display =====
function showResult() {
  const { typeCode, scores } = calculateType();
  const type = personalityTypes[typeCode];

  if (!type) {
    console.error("Unknown type:", typeCode);
    return;
  }

  // Header
  document.getElementById("result-emoji").textContent = type.emoji;
  document.getElementById("result-type-name").textContent = type.name;
  document.getElementById("result-type-code").textContent = typeCode;

  // Description
  document.getElementById("result-description-text").textContent = type.description;

  // Strengths
  const strengthsList = document.getElementById("strengths-list");
  strengthsList.innerHTML = type.strengths
    .map((s) => `<div class="strength-tag">${s}</div>`)
    .join("");

  // Dimension chart
  renderDimensionChart(scores);

  // Jobs
  const jobsList = document.getElementById("jobs-list");
  jobsList.innerHTML = type.jobs
    .map(
      (job, idx) => `
    <div class="job-card">
      <div class="job-rank job-rank--${idx + 1}">${idx + 1}</div>
      <div class="job-card-body">
        <div class="job-card-header">
          <span class="job-title">${job.title}</span>
          <span class="job-match ${job.match >= 90 ? "high" : "medium"}">
            ${job.match}%
          </span>
        </div>
        <p class="job-reason">${job.reason}</p>
      </div>
    </div>
  `
    )
    .join("");

  showScreen("result-screen");

  // Confetti
  launchConfetti();

  // Store for sharing
  window._lastResult = { typeCode, type };
}

function renderDimensionChart(scores) {
  const dimensions = [
    { key: "EI", left: "内向的 (I)", right: "外向的 (E)" },
    { key: "SN", left: "現実的 (S)", right: "直感的 (N)" },
    { key: "TF", left: "論理的 (T)", right: "感情的 (F)" },
    { key: "JP", left: "計画的 (J)", right: "柔軟的 (P)" },
  ];

  const chart = document.getElementById("dimension-chart");
  chart.innerHTML = dimensions
    .map((dim) => {
      const score = scores[dim.key] || 0.5;
      const leftWidth = Math.max(0, (0.5 - score) / 0.5) * 50;
      const rightWidth = Math.max(0, (score - 0.5) / 0.5) * 50;
      const leftPct = Math.round((1 - score) * 100);
      const rightPct = Math.round(score * 100);

      return `
      <div class="dimension-row">
        <span class="dimension-label left">${dim.left}</span>
        <span class="dimension-percentage left-pct">${leftPct}%</span>
        <div class="dimension-bar-bg">
          <div class="dimension-bar-fill left-fill" style="width: ${leftWidth}%"></div>
          <div class="dimension-bar-fill right-fill" style="width: ${rightWidth}%"></div>
          <div class="dimension-bar-center"></div>
        </div>
        <span class="dimension-percentage right-pct">${rightPct}%</span>
        <span class="dimension-label right">${dim.right}</span>
      </div>
    `;
    })
    .join("");
}

// ===== Confetti =====
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#6c5ce7", "#fd79a8", "#00cec9", "#fdcb6e", "#a29bfe", "#fff"];
  const particles = [];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frame > maxFrames * 0.6) {
      const fadeRatio = (frame - maxFrames * 0.6) / (maxFrames * 0.4);
      particles.forEach((p) => (p.opacity = Math.max(0, 1 - fadeRatio)));
    }

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// ===== Actions =====
function resetQuiz() {
  currentQuestion = 0;
  answers = {};
  showScreen("start-screen");
}

function shareResult() {
  if (!window._lastResult) return;

  const { typeCode, type } = window._lastResult;
  const text = `【Nazeka 性格診断結果】\n私の性格タイプは「${type.name}」（${typeCode}）でした！\nおすすめの仕事：${type.jobs[0].title}\n\n#Nazeka #性格診断 #適職診断`;

  if (navigator.share) {
    navigator.share({ title: "Nazeka - 性格診断結果", text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("結果をコピーしました！");
    });
  }
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
