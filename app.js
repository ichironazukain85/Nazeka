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

// ===== Screen Management =====
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const screen = document.getElementById(screenId);
  screen.classList.add("active");
  // Re-trigger animation
  screen.style.animation = "none";
  screen.offsetHeight; // force reflow
  screen.style.animation = "";
  // Scroll to top on screen change
  window.scrollTo(0, 0);
}

// ===== Quiz Flow =====
function startQuiz() {
  currentQuestion = 0;
  answers = {};
  showScreen("quiz-screen");
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentQuestion];
  const card = document.getElementById("question-card");

  // Animate card
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "slideIn 0.4s ease";

  // Progress
  const progress = ((currentQuestion) / questions.length) * 100;
  document.getElementById("progress-fill").style.width = progress + "%";
  document.getElementById("progress-text").textContent =
    `${currentQuestion + 1} / ${questions.length}`;

  // Question text
  document.getElementById("question-text").textContent =
    `Q${currentQuestion + 1}. ${q.text}`;

  // Options
  const container = document.getElementById("options-container");
  container.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt.text;
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
  // Replace or add score for this question index within the dimension
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
  }, 350);
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
      textEl.textContent = messages[i];
    } else {
      clearInterval(interval);
      showResult();
    }
  }, 700);
}

function calculateType() {
  const scores = {};

  // Calculate average score for each dimension
  for (const [dim, vals] of Object.entries(answers)) {
    const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    scores[dim] = avg;
  }

  // Determine type letters
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
      (job) => `
    <div class="job-card">
      <div class="job-card-header">
        <span class="job-title">${job.title}</span>
        <span class="job-match ${job.match >= 90 ? "high" : "medium"}">
          適性 ${job.match}%
        </span>
      </div>
      <p class="job-reason">${job.reason}</p>
    </div>
  `
    )
    .join("");

  showScreen("result-screen");

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
      // score 0 = fully left, 1 = fully right
      const leftWidth = Math.max(0, (0.5 - score) / 0.5) * 50;
      const rightWidth = Math.max(0, (score - 0.5) / 0.5) * 50;

      return `
      <div class="dimension-row">
        <span class="dimension-label left">${dim.left}</span>
        <div class="dimension-bar-bg">
          <div class="dimension-bar-fill left-fill" style="width: ${leftWidth}%"></div>
          <div class="dimension-bar-fill right-fill" style="width: ${rightWidth}%"></div>
          <div class="dimension-bar-center"></div>
        </div>
        <span class="dimension-label right">${dim.right}</span>
      </div>
    `;
    })
    .join("");
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
