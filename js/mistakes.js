// ============================================================
// MISTAKES — Redesigned
// ============================================================

let allMistakes = [];

(async function () {
  if (!requireLogin()) return;

  try {
    const data = await StudentAPI.getMistakes(200);
    allMistakes = data.mistakes || [];
    renderPage();
  } catch (e) {
    console.error(e);
    document.getElementById("mistakesMain").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div class="empty-text">Failed to load</div>
      </div>`;
  }
})();

function renderPage() {
  const main = document.getElementById("mistakesMain");

  if (allMistakes.length === 0) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">No mistakes yet!<br>Take a test and wrong answers will appear here.</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='exam-start.html'">Start Exam</button>
      </div>`;
    return;
  }

  // Group by chapter
  const byChapter = {};
  allMistakes.forEach((m) => {
    if (!byChapter[m.chapter_id]) byChapter[m.chapter_id] = [];
    byChapter[m.chapter_id].push(m);
  });

  main.innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-box danger">
        <div class="v">${allMistakes.length}</div>
        <div class="l">Total Mistakes</div>
      </div>
      <div class="stat-box">
        <div class="v">${Object.keys(byChapter).length}</div>
        <div class="l">Chapters</div>
      </div>
    </div>

    <div class="action-row" style="margin-bottom:20px">
      <button class="btn btn-primary btn-block" onclick="practiceMistakes()">
        📖 Practice All Mistakes
      </button>
    </div>

    <div class="chips" id="chapterChips" style="margin-bottom:16px">
      <button class="chip active" onclick="filterMistakes(this, 'all')">All (${allMistakes.length})</button>
      ${Object.entries(byChapter).map(([chId, list]) => `
        <button class="chip" onclick="filterMistakes(this, '${chId}')">
          Chapter ${chId} (${list.length})
        </button>
      `).join("")}
    </div>

    <div id="mistakesList"></div>
  `;

  renderMistakes(allMistakes);
}

function renderMistakes(list) {
  const el = document.getElementById("mistakesList");

  if (list.length === 0) {
    el.innerHTML = `
      <div class="info-card" style="text-align:center;padding:24px">
        <div style="font-size:13px;color:var(--color-text-muted)">No mistakes in this chapter</div>
      </div>`;
    return;
  }

  el.innerHTML = list.map((m) => `
    <div class="mistake-card">
      <div class="mistake-header">
        <span class="mistake-tag">✗ Wrong</span>
        <span class="badge badge-${m.difficulty === 'easy' ? 'success' : 'danger'}" style="font-size:10px">${m.difficulty}</span>
      </div>

      <div class="mistake-q">${escapeHtml(m.question_text)}</div>

      <div class="mistake-answers">
        <span class="mistake-answer-pill wrong">Your: ${m.your_last_answer || "—"}</span>
        <span class="mistake-answer-pill right">Correct: ${m.correct_option}</span>
      </div>

      ${m.explanation ? `<div class="mistake-explanation">${escapeHtml(m.explanation)}</div>` : ""}

      <div class="mistake-meta">
        <span class="mistake-meta-item">📚 Chapter ${m.chapter_id}</span>
        ${m.topic_id ? `<span class="mistake-meta-item">🎯 Topic ${m.topic_id}</span>` : ""}
        <span class="mistake-meta-item">❌ Wrong ${m.times_wrong}x</span>
      </div>
    </div>
  `).join("");
}

function filterMistakes(btn, chapterId) {
  document.querySelectorAll("#chapterChips .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");

  const filtered = chapterId === "all"
    ? allMistakes
    : allMistakes.filter((m) => m.chapter_id === parseInt(chapterId));

  renderMistakes(filtered);
}

async function practiceMistakes() {
  if (allMistakes.length === 0) {
    showToast("No mistakes to practice", "error");
    return;
  }

  const chapterIds = [...new Set(allMistakes.map((m) => m.chapter_id))];

  const payload = {
    exam_type: "chapter",
    subject_id: allMistakes[0].subject_id,
    chapter_ids: chapterIds,
    difficulty: "mixed",
    count: Math.min(allMistakes.length, 30),
    duration_minutes: Math.min(allMistakes.length, 30),
  };

  showToast("Starting practice...", "info", 1000);

  try {
    const response = await ExamAPI.start(payload);
    localStorage.setItem("currentTestId", response.test_id);
    localStorage.setItem("currentTestData", JSON.stringify(response));
    setTimeout(() => (window.location.href = "exam.html"), 500);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to start practice", "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.filterMistakes = filterMistakes;
window.practiceMistakes = practiceMistakes;
