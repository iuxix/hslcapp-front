// ============================================================
// EXAM ENGINE — Real API + Chapter Names
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

let timerEl = null;
const chapterNameCache = {}; // ← NEW: chapter names cache

(function () {
  console.log("exam.js loaded");

  if (!requireLogin()) return;

  timerEl = document.getElementById("timer");

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

    if (state.questions.length === 0) {
      showToast("Test has no questions", "error");
      setTimeout(() => (window.location.href = "exam-start.html"), 2000);
      return;
    }

    const expiresAt = new Date(parsed.expires_at).getTime();
    state.remainingSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

    document.getElementById("examTitle").textContent = `Test #${state.testId}`;
    document.getElementById("examSubtitle").textContent =
      `${state.questions.length} Q • ${Math.floor(state.remainingSec / 60)} min`;

    // Prefetch chapter names (background)
    prefetchChapterNames();

    console.log("Starting render...");
    renderQuestion();
    updateTimer();
    startTimer();
    openQuestionTiming();
    console.log("Render complete!");

  } catch (e) {
    console.error("Exam init error:", e);
    showToast("Failed to load exam: " + e.message, "error", 5000);
    setTimeout(() => (window.location.href = "exam-start.html"), 3000);
  }
})();

// ============================================================
// PREFETCH CHAPTER NAMES — background
// ============================================================

async function prefetchChapterNames() {
  const chapterIds = [...new Set(state.questions.map(q => q.chapter_id))];

  for (const chId of chapterIds) {
    if (chapterNameCache[chId]) continue;
    try {
      const ch = await PublicAPI.getChapter(chId);
      chapterNameCache[chId] = ch.name;
      console.log(`Chapter ${chId}: ${ch.name}`);

      // Re-render current question if it's this chapter
      const currentQ = state.questions[state.currentIndex];
      if (currentQ && currentQ.chapter_id === chId) {
        updateChapterLabel();
      }
    } catch (e) {
      chapterNameCache[chId] = `Chapter ${chId}`;
    }
  }
}

function getChapterName(chId) {
  return chapterNameCache[chId] || `Chapter ${chId}`;
}

function updateChapterLabel() {
  const q = state.questions[state.currentIndex];
  if (!q) return;
  const el = document.getElementById("qChapter");
  if (el) {
    el.textContent = getChapterName(q.chapter_id);
  }
}

// ============================================================
// RENDER
// ============================================================

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  q.visited = true;

  const card = document.querySelector(".question-card");
  if (card) {
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  }

  document.getElementById("qNumber").textContent =
    `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  document.getElementById("qDifficulty").textContent =
    q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "Easy";

  // Chapter name
  const qChapterEl = document.getElementById("qChapter");
  if (qChapterEl) {
    qChapterEl.textContent = getChapterName(q.chapter_id);
  }

  const qTextEl = document.getElementById("qText");
  qTextEl.textContent = q.question_text || "No question text";

  const optsEl = document.getElementById("optionsList");
  optsEl.innerHTML = "";

  (q.options || []).forEach((opt) => {
    const div = document.createElement("div");
    div.className = "option" + (q.selectedOption === opt.option_label ? " selected" : "");
    div.innerHTML = `
      <div class="option-label">${opt.option_label}</div>
      <div class="option-text">${escapeHtml(opt.option_text)}</div>
    `;
    div.onclick = () => selectOption(opt.option_label);
    optsEl.appendChild(div);
  });

  const markBtn = document.getElementById("markBtn");
  if (markBtn) {
    if (q.marked) {
      markBtn.classList.add("btn-marked");
      markBtn.textContent = "🔖 Marked";
    } else {
      markBtn.classList.remove("btn-marked");
      markBtn.textContent = "🔖 Mark";
    }
  }

  document.getElementById("prevBtn").disabled = state.currentIndex === 0;
  document.getElementById("nextBtn").textContent =
    state.currentIndex === state.questions.length - 1 ? "Review ✓" : "Next →";

  renderPalette();
}

function selectOption(label) {
  const q = state.questions[state.currentIndex];
  q.selectedOption = label;

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
  if (markBtn) {
    if (q.marked) {
      markBtn.classList.add("btn-marked");
      markBtn.textContent = "🔖 Marked";
    } else {
      markBtn.classList.remove("btn-marked");
      markBtn.textContent = "🔖 Mark";
    }
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
  if (!grid) return;
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
  if (!sheet) return;
  const open = force !== undefined ? force : !sheet.classList.contains("open");
  if (open) sheet.classList.add("open");
  else sheet.classList.remove("open");
}

// ============================================================
// TIMER
// ============================================================

function updateTimer() {
  const el = timerEl || document.getElementById("timer");
  if (!el) return;
  timerEl = el;

  const mins = Math.floor(state.remainingSec / 60);
  const secs = state.remainingSec % 60;
  el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (state.remainingSec <= 60) el.className = "timer danger";
  else if (state.remainingSec <= 300) el.className = "timer warning";
  else el.className = "timer";
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
  try {
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
  } catch (e) {
    console.error("confirmSubmit error:", e);
  }
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
    showToast("Submitting...", "info", 1000);
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
// EXIT — Without Saving Anything
// ============================================================

function confirmExit() {
  try {
    showModal({
      title: "Exit Exam?",
      content: "Agar aap exit karenge toh ye test save NAHI hoga. Progress delete ho jayega.",
      customContent: `
        <button class="exit-option danger" onclick="window.__exitWithoutSave()">
          <span class="exit-icon">✕</span>
          <span class="exit-info">
            <span class="exit-title">Exit Without Saving</span>
            <span class="exit-sub">Progress delete ho jayega. Fresh start karna padega.</span>
          </span>
        </button>
        <button class="exit-option" onclick="closeModal()">
          <span class="exit-icon">↩</span>
          <span class="exit-info">
            <span class="exit-title">Stay on Exam</span>
            <span class="exit-sub">Cancel and continue the test.</span>
          </span>
        </button>
      `,
      actions: [],
    });
  } catch (e) {
    console.error("confirmExit error:", e);
  }
}

window.__exitWithoutSave = async function () {
  closeModal();

  // Timer band karo
  state.submitted = true;
  clearInterval(state.timerInterval);

  try {
    showToast("Exiting...", "info", 800);
    // Server pe test abandon karo (kuch save nahi hoga)
    await ExamAPI.abandon(state.testId);
  } catch (e) {
    console.error("Abandon error:", e);
    // Agar abandon fail bhi ho jaye, local data toh clear karo
  }

  // Local data saaf karo
  localStorage.removeItem("currentTestData");
  localStorage.removeItem("currentTestId");

  showToast("Exam exited", "info", 800);
  setTimeout(() => (window.location.href = "dashboard.html"), 500);
};

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderMathIn(element) {
  return;
}

window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.toggleMark = toggleMark;
window.clearAnswer = clearAnswer;
window.confirmSubmit = confirmSubmit;
window.confirmExit = confirmExit;
window.togglePalette = togglePalette;
window.renderMathIn = renderMathIn;
