// ============================================================
// EXAM ENGINE — Modern Pro (fixed refresh animation)
// ============================================================

(function () {
  const session = getSession();
  if (!session || session.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const config = {
    type: params.get("type") || "full",
    subjectId: parseInt(params.get("subject")) || 1,
    chapterId: params.get("chapter") ? parseInt(params.get("chapter")) : null,
    difficulty: params.get("difficulty") || "mixed",
    count: parseInt(params.get("count")) || 45,
    durationMin: parseInt(params.get("duration")) || 45,
  };

  let pool = MOCK.questions.filter((q) => q.subject_id === config.subjectId);
  if (config.chapterId) pool = pool.filter((q) => q.chapter_id === config.chapterId);
  if (config.difficulty !== "mixed") pool = pool.filter((q) => q.difficulty === config.difficulty);

  pool = shuffle([...pool]);
  const selected = pool.slice(0, Math.min(config.count, pool.length));

  if (selected.length === 0) {
    showToast("No questions found. Try different options.", "error");
    setTimeout(() => (window.location.href = "exam-start.html"), 1200);
    return;
  }

  const state = {
    questions: selected.map((q) => ({
      ...q,
      shuffledOptions: shuffle([...q.options]),
      selectedOption: null,
      marked: false,
      visited: false,
      openedAt: null,
      timespent: 0,
    })),
    currentIndex: 0,
    startedAt: Date.now(),
    durationSec: config.durationMin * 60,
    remainingSec: config.durationMin * 60,
    submitted: false,
  };

  const PROGRESS_KEY = "seba_exam_progress_" + session.id;

  document.getElementById("examTitle").textContent = getTestTitle(config);
  document.getElementById("examSubtitle").textContent =
    `${getSubjectName(config.subjectId)} • ${selected.length} Q • ${config.durationMin} min`;

  // ============================================================
  // RENDER — No refresh animation on option click
  // ============================================================

  let firstRender = true;

  function renderQuestion() {
    const q = state.questions[state.currentIndex];
    closeCurrentTiming();
    q.visited = true;
    q.openedAt = Date.now();

    document.getElementById("qNumber").textContent =
      `Question ${state.currentIndex + 1} of ${state.questions.length}`;
    document.getElementById("qDifficulty").textContent =
      q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
    document.getElementById("qChapter").textContent = getChapterName(q.chapter_id);
    document.getElementById("qText").textContent = q.text;

    const optsEl = document.getElementById("optionsList");
    optsEl.innerHTML = "";
    q.shuffledOptions.forEach((opt) => {
      const div = document.createElement("div");
      div.className = "option" + (q.selectedOption === opt.label ? " selected" : "");
      div.innerHTML = `
        <div class="option-label">${opt.label}</div>
        <div class="option-text">${opt.text}</div>
      `;
      div.onclick = () => selectOption(opt.label);
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

    // Animate card ONLY on question change, not on option click
    if (firstRender || state._lastIndex !== state.currentIndex) {
      const card = document.querySelector(".question-card");
      if (card) {
        card.style.animation = "none";
        void card.offsetWidth; // force reflow
        card.style.animation = "";
      }
      firstRender = false;
      state._lastIndex = state.currentIndex;
    }

    renderPalette();
  }

  function selectOption(label) {
    const q = state.questions[state.currentIndex];
    q.selectedOption = label;

    // Update just the option styles — no full re-render
    const opts = document.querySelectorAll("#optionsList .option");
    opts.forEach((div, i) => {
      const opt = q.shuffledOptions[i];
      div.classList.toggle("selected", opt.label === label);
    });

    renderPalette(); // palette needs update
  }

  function clearAnswer() {
    const q = state.questions[state.currentIndex];
    q.selectedOption = null;
    const opts = document.querySelectorAll("#optionsList .option");
    opts.forEach((div) => div.classList.remove("selected"));
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
      state.currentIndex--;
      renderQuestion();
    }
  }

  function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      confirmSubmit();
    }
  }

  // ============================================================
  // TIMING
  // ============================================================

  function closeCurrentTiming() {
    state.questions.forEach((q) => {
      if (q.openedAt) {
        q.timespent += Math.floor((Date.now() - q.openedAt) / 1000);
        q.openedAt = null;
      }
    });
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
        state.currentIndex = i;
        renderQuestion();
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

  function tick() {
    if (state.submitted) return;
    state.remainingSec--;
    updateTimer();
    if (state.remainingSec <= 0) {
      submitTest(true);
      return;
    }
    setTimeout(tick, 1000);
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
      content: `Once submitted, you cannot change your answers.`,
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

  function submitTest(auto) {
    if (state.submitted) return;
    state.submitted = true;
    closeCurrentTiming();

    const attemptId = "att_" + Date.now();
    const answers = state.questions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      selected: q.selectedOption,
      correct: q.correct,
      isCorrect: q.selectedOption === q.correct,
      difficulty: q.difficulty,
      chapterId: q.chapter_id,
      sectionId: q.section_id,
      topic: q.topic,
      timespent: q.timespent,
      marked: q.marked,
      explanation: q.explanation,
    }));

    const total = answers.length;
    const correct = answers.filter((a) => a.isCorrect).length;
    const wrong = answers.filter((a) => a.selected && !a.isCorrect).length;
    const unanswered = answers.filter((a) => !a.selected).length;
    const totalTimeSec = Math.floor((Date.now() - state.startedAt) / 1000);
    const percentage = parseFloat(((correct / total) * 100).toFixed(1));

    const attempt = {
      id: attemptId,
      userId: session.id,
      type: config.type,
      subjectId: config.subjectId,
      chapterId: config.chapterId,
      testTitle: getTestTitle(config),
      startedAt: state.startedAt,
      submittedAt: Date.now(),
      totalQuestions: total,
      correct, wrong, unanswered,
      percentage,
      totalTimeSec,
      avgTimeSec: (totalTimeSec / total).toFixed(1),
      answers,
      autoSubmitted: auto || false,
    };

    saveAttempt(attempt);
    updateMistakesBook(attempt);
    localStorage.removeItem(PROGRESS_KEY);
    window.location.href = "results.html?id=" + attemptId;
  }

  function updateMistakesBook(attempt) {
    const mistakes = getMistakes();
    attempt.answers.forEach((a) => {
      if (a.selected && !a.isCorrect) {
        const existing = mistakes.find((m) => m.questionId === a.questionId);
        if (existing) {
          existing.timesWrong++;
          existing.lastWrongAnswer = a.selected;
          existing.lastWrongAt = Date.now();
        } else {
          mistakes.push({
            questionId: a.questionId,
            questionText: a.questionText,
            subjectId: attempt.subjectId,
            chapterId: a.chapterId,
            sectionId: a.sectionId,
            topic: a.topic,
            lastWrongAnswer: a.selected,
            correctAnswer: a.correct,
            explanation: a.explanation,
            timesWrong: 1,
            timesAttempted: 1,
            firstWrongAt: Date.now(),
            lastWrongAt: Date.now(),
            resolved: false,
          });
        }
      } else if (a.isCorrect) {
        const existing = mistakes.find((m) => m.questionId === a.questionId);
        if (existing) {
          existing.timesAttempted++;
          existing.resolved = true;
        }
      }
    });
    saveMistakes(mistakes);
  }

  // ============================================================
  // EXIT
  // ============================================================

  function confirmExit() {
    showModal({
      title: "Pause Exam?",
      content: "Choose how you want to exit:",
      customContent: `
        <button class="exit-option" onclick="saveAndExit()">
          <span class="exit-icon">💾</span>
          <span class="exit-info">
            <span class="exit-title">Save & Exit</span>
            <span class="exit-sub">Progress save hoga. Baad mein continue kar sakte ho.</span>
          </span>
        </button>
        <button class="exit-option danger" onclick="discardAndExit()">
          <span class="exit-icon">✕</span>
          <span class="exit-info">
            <span class="exit-title">Exit Without Saving</span>
            <span class="exit-sub">Attempt discard ho jayega.</span>
          </span>
        </button>
      `,
      actions: [
        { label: "Cancel", style: "outline", onClick: "closeModal()" },
      ],
    });
  }

  window.saveAndExit = function () {
    closeCurrentTiming();
    const progressData = {
      config,
      savedAt: Date.now(),
      startedAt: state.startedAt,
      remainingSec: state.remainingSec,
      currentIndex: state.currentIndex,
      questions: state.questions.map((q) => ({
        id: q.id,
        selectedOption: q.selectedOption,
        marked: q.marked,
        visited: q.visited,
        timespent: q.timespent,
      })),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));
    state.submitted = true;
    showToast("Progress saved", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 800);
  };

  window.discardAndExit = function () {
    showModal({
      title: "Discard Attempt?",
      content: "This attempt will be lost forever. Are you sure?",
      actions: [
        { label: "No, Keep", style: "outline", onClick: "closeModal()" },
        { label: "Yes, Discard", style: "danger", onClick: "window.__doDiscard()" },
      ],
    });
  };

  window.__doDiscard = function () {
    closeModal();
    setTimeout(() => {
      localStorage.removeItem(PROGRESS_KEY);
      state.submitted = true;
      window.location.href = "dashboard.html";
    }, 200);
  };

  // ============================================================
  // RESUME
  // ============================================================

  function checkForSavedExam() {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      const age = Date.now() - data.savedAt;
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PROGRESS_KEY);
        return;
      }

      showModal({
        title: "Resume Test?",
        content: "You have a saved test. Continue from where you left?",
        stats: [
          { value: `${data.questions.filter((q) => q.selectedOption).length}/${data.questions.length}`, label: "Answered" },
          { value: `${Math.floor(data.remainingSec / 60)}m`, label: "Remaining" },
        ],
        actions: [
          { label: "Discard", style: "outline", onClick: "window.__discardSaved()" },
          { label: "Resume", style: "primary", onClick: "window.__resumeSaved()" },
        ],
      });

      window.__resumeSaved = function () {
        data.questions.forEach((savedQ) => {
          const q = state.questions.find((x) => x.id === savedQ.id);
          if (q) {
            q.selectedOption = savedQ.selectedOption;
            q.marked = savedQ.marked;
            q.visited = savedQ.visited;
            q.timespent = savedQ.timespent;
            q.openedAt = null;
          }
        });
        state.currentIndex = data.currentIndex;
        state.startedAt = data.startedAt;
        state.remainingSec = data.remainingSec;
        localStorage.removeItem(PROGRESS_KEY);
        closeModal();
        renderQuestion();
        updateTimer();
      };

      window.__discardSaved = function () {
        localStorage.removeItem(PROGRESS_KEY);
        closeModal();
        window.location.href = "dashboard.html";
      };
    } catch (e) {
      console.error("Resume error:", e);
      localStorage.removeItem(PROGRESS_KEY);
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getTestTitle(cfg) {
    if (cfg.type === "chapter") return `Chapter: ${getChapterName(cfg.chapterId)}`;
    if (cfg.type === "subject") return `Full ${getSubjectName(cfg.subjectId)} Test`;
    return "Full MCQ Test";
  }

  window.nextQuestion = nextQuestion;
  window.prevQuestion = prevQuestion;
  window.toggleMark = toggleMark;
  window.clearAnswer = clearAnswer;
  window.confirmSubmit = confirmSubmit;
  window.confirmExit = confirmExit;
  window.togglePalette = togglePalette;

  renderQuestion();
  updateTimer();
  tick();
  setTimeout(checkForSavedExam, 300);

  window.addEventListener("beforeunload", (e) => {
    if (!state.submitted && !localStorage.getItem(PROGRESS_KEY)) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
})();