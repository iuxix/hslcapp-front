// ============================================================
// EXAM ENGINE — Real API + Smooth Animations
// ============================================================

let state = {
  testId: null,
  questions: [],
  currentIndex: 0,
  remainingSec: 0,
  submitted: false,
  timerInterval: null,
  currentOpenTQId: null,
};

(function () {
  if (!requireLogin()) return;

  const testData = localStorage.getItem("currentTestData");
  if (!testData) {
    showToast("No active test", "error");
    setTimeout(() => (window.location.href = "exam-start.html"), 1500);
    return;
  }

  try {
    const parsed = JSON.parse(testData);
    state.testId = parsed.test_id;
    state.questions = (parsed.questions || []).map((q) => ({
      ...q,
      selectedOption: null,
      marked: false,
      visited: false,
    }));
    const expiresAt = new Date(parsed.expires_at).getTime();
    state.remainingSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  } catch (e) {
    console.error(e);
    showToast("Invalid test data", "error");
    return;
  }

  document.getElementById("examTitle").textContent = `Test #${state.testId}`;
  document.getElementById("examSubtitle").textContent =
    `${state.questions.length} Q • ${Math.floor(state.remainingSec / 60)} min`;

  renderQuestion();
  updateTimer();
  startTimer();
  openQuestionTiming();
})();

// ============================================================
// RENDER — smooth question transitions
// ============================================================

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  q.visited = true;

  // Animate question card
  const card = document.querySelector(".question-card");
  if (card) {
    card.style.animation = "none";
    void card.offsetWidth; // force reflow
    card.style.animation = "";
  }

  document.getElementById("qNumber").textContent =
    `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  document.getElementById("qDifficulty").textContent =
    q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "Easy";
  document.getElementById("qChapter").textContent = `Ch ${q.chapter_id}`;
  document.getElementById("qText").textContent = q.question_text;

  const optsEl = document.getElementById("optionsList");
  optsEl.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const div = document.createElement("div");
    div.className = "option" + (q.selectedOption === opt.option_label ? " selected" : "");
    div.style.animationDelay = `${idx * 40}ms`;
    div.innerHTML = `
      <div class="option-label">${opt.option_label}</div>
      <div class="option-text">${escapeHtml(opt.option_text)}</div>
    `;
    div.onclick = () => selectOption(opt.option_label);
    optsEl.appendChild(div);
  });

  const markBtn = document.getElementById("markBtn");
  if (q.marked) {
    markBtn.classList.add("btn-marked");
    markBtn.textContent = "🔖 Marked";
  } else {
    markBtn.classList.remove("btn-marked");
    markBtn.textContent = "🔖 Mark";
  }

  document.getElementById("prevBtn").disabled = state.currentIndex === 0;
  document.getElementById("nextBtn").textContent =
    state.currentIndex === state.questions.length - 1 ? "Review ✓" : "Next →";

  renderPalette();
}

function selectOption(label) {
  const q = state.questions[state.currentIndex];
  q.selectedOption = label;

  // Smooth update — only toggle classes
  document.querySelectorAll("#optionsList .option").forEach((div, i) => {
    const opt = q.options[i];
    div.classList.toggle("selected", opt.option_label === label);
  });

  ExamAPI.saveAnswer(state.testId, q.test_question_id, label)
    .catch((e) => console.error("Save answer error:", e));

  renderPalette();
}

function clearAnswer() {
  const q = state.questions[state.currentIndex];
  q.selectedOption = null;

  document.querySelectorAll("#optionsList .option").forEach((div) => {
    div.classList.remove("selected");
  });

  ExamAPI.saveAnswer(state.testId, q.test_question_id, null)
    .catch((e) => console.error("Clear answer error:", e));

  renderPalette();
}

function toggleMark() {
  const q = state.questions[state.currentIndex];
  q.marked = !q.marked;

  const markBtn = document.getElementById("markBtn");
  if (q.marked) {
    markBtn.classList.add("btn-marked");
    markBtn.textContent = "🔖 Marked";
  } else {
    markBtn.classList.remove("btn-marked");
    markBtn.textContent = "🔖 Mark";
  }

  renderPalette();
}

function prevQuestion() {
  if (state.currentIndex > 0) {
    closeCurrentTiming();
    state.currentIndex--;
    renderQuestion();
    openQuestionTiming();
  }
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    closeCurrentTiming();
    state.currentIndex++;
    renderQuestion();
    openQuestionTiming();
  } else {
    confirmSubmit();
  }
}

// ============================================================
// TIMING
// ============================================================

function openQuestionTiming() {
  const q = state.questions[state.currentIndex];
  if (!q) return;
  state.currentOpenTQId = q.test_question_id;

  ExamAPI.recordTiming(state.testId, q.test_question_id, "open", null)
    .catch((e) => console.error("Timing open error:", e));
}

function closeCurrentTiming() {
  const q = state.questions[state.currentIndex];
  if (!q || !state.currentOpenTQId) return;

  ExamAPI.recordTiming(state.testId, q.test_question_id, "close", q.selectedOption)
    .catch((e) => console.error("Timing close error:", e));

  state.currentOpenTQId = null;
}

// ============================================================
// PALETTE
// ============================================================

function renderPalette() {
  const grid = document.getElementById("paletteGrid");
  grid.innerHTML = "";

  state.questions.forEach((q, i) => {
    const btn = document.createElement("button");
    let cls = "palette-bubble ";
    if (q.selectedOption) cls += "answered ";
    else if (q.visited) cls += "not-answered ";
    else cls += "not-visited ";
    if (q.marked) cls += "marked ";
    if (i === state.currentIndex) cls += "current";
    btn.className = cls;
    btn.textContent = i + 1;
    btn.onclick = () => {
      closeCurrentTiming();
      state.currentIndex = i;
      renderQuestion();
      openQuestionTiming();
      togglePalette(false);
    };
    grid.appendChild(btn);
  });
}

function togglePalette(force) {
  const sheet = document.getElementById("paletteSheet");
  const open = force !== undefined ? force : !sheet.classList.contains("open");
  if (open) sheet.classList.add("open");
  else sheet.classList.remove("open");
}

// ============================================================
// TIMER
// ============================================================

const timerEl = document.getElementById("timer");

function updateTimer() {
  const mins = Math.floor(state.remainingSec / 60);
  const secs = state.remainingSec % 60;
  timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (state.remainingSec <= 60) timerEl.className = "timer danger";
  else if (state.remainingSec <= 300) timerEl.className = "timer warning";
  else timerEl.className = "timer";
}

function startTimer() {
  state.timerInterval = setInterval(() => {
    if (state.submitted) return;
    state.remainingSec--;
    updateTimer();
    if (state.remainingSec <= 0) {
      clearInterval(state.timerInterval);
      submitTest(true);
    }
  }, 1000);
}

// ============================================================
// SUBMIT
// ============================================================

function confirmSubmit() {
  const answered = state.questions.filter((q) => q.selectedOption).length;
  const notAnswered = state.questions.length - answered;
  const marked = state.questions.filter((q) => q.marked).length;

  showModal({
    title: "Submit Test?",
    content: "Once submitted, you cannot change your answers.",
    stats: [
      { value: answered, label: "Answered", color: "var(--color-success)" },
      { value: notAnswered, label: "Not answered", color: "var(--color-danger)" },
      { value: marked, label: "Marked", color: "var(--color-accent)" },
    ],
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Yes, Submit", style: "primary", onClick: "window.__doSubmit()" },
    ],
  });
}

window.__doSubmit = function () {
  closeModal();
  setTimeout(() => submitTest(false), 200);
};

async function submitTest(auto) {
  if (state.submitted) return;
  state.submitted = true;
  clearInterval(state.timerInterval);
  closeCurrentTiming();

  try {
    await ExamAPI.submit(state.testId);
    localStorage.removeItem("currentTestData");
    localStorage.removeItem("currentTestId");
    localStorage.setItem("lastTestId", state.testId);
    window.location.href = `results.html?test_id=${state.testId}`;
  } catch (error) {
    console.error("Submit error:", error);
    showToast(error.message || "Submit failed", "error");
    state.submitted = false;
  }
}

// ============================================================
// EXIT / PAUSE
// ============================================================

function confirmExit() {
  showModal({
    title: "Pause Exam?",
    content: "Your answers are already saved to the server.",
    customContent: `
      <button class="exit-option" onclick="window.__saveAndExit()">
        <span class="exit-icon">💾</span>
        <span class="exit-info">
          <span class="exit-title">Save & Exit</span>
          <span class="exit-sub">Your progress is saved. Resume later.</span>
        </span>
      </button>
      <button class="exit-option danger" onclick="closeModal()">
        <span class="exit-icon">✕</span>
        <span class="exit-info">
          <span class="exit-title">Stay on Exam</span>
          <span class="exit-sub">Cancel and continue the test.</span>
        </span>
      </button>
    `,
    actions: [],
  });
}

window.__saveAndExit = function () {
  closeModal();
  state.submitted = true;
  clearInterval(state.timerInterval);
  closeCurrentTiming();
  showToast("Progress saved!", "success", 1000);
  setTimeout(() => (window.location.href = "dashboard.html"), 800);
};

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.toggleMark = toggleMark;
window.clearAnswer = clearAnswer;
window.confirmSubmit = confirmSubmit;
window.confirmExit = confirmExit;
window.togglePalette = togglePalette;
