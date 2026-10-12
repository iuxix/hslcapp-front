// ============================================================
// ADMIN — Questions Management + KaTeX
// ============================================================

let currentSubjects = [];
let currentChapters = [];

(function () {
  if (!requireAdmin()) return;
  loadQuestions();
  loadStats();
})();

async function loadStats() {
  try {
    const stats = await AdminAPI.getQuestionStats();
    const bar = document.getElementById("statsBar");
    bar.innerHTML = `
      <div class="box-grid-2" style="grid-template-columns:repeat(3,1fr)">
        <div class="admin-stat" style="background:var(--color-primary-bg)">
          <div class="v" style="color:var(--color-primary)">${stats.total}</div>
          <div class="l" style="color:var(--color-primary)">Total</div>
        </div>
        <div class="admin-stat" style="background:var(--color-success-bg)">
          <div class="v" style="color:var(--color-success)">${stats.manual}</div>
          <div class="l" style="color:var(--color-success)">Manual</div>
        </div>
        <div class="admin-stat" style="background:var(--color-warning-bg)">
          <div class="v" style="color:var(--color-warning)">${stats.ai}</div>
          <div class="l" style="color:var(--color-warning)">AI</div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
  }
}

async function loadQuestions() {
  const listEl = document.getElementById("questionsList");
  listEl.innerHTML = `
    <div class="admin-loading">
      <div class="admin-spinner"></div>
      <div class="admin-loading-text">Loading...</div>
    </div>`;

  try {
    const questions = await AdminAPI.listQuestions({ limit: 50 });

    if (questions.length === 0) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">❓</div>
          <div class="admin-empty-title">No questions yet</div>
          <div class="admin-empty-text">Click "+ Add" to create one</div>
        </div>`;
      return;
    }

    listEl.innerHTML = questions.map(q => `
      <div class="admin-question-card">
        <div class="admin-question-header">
          <div class="admin-question-tags">
            <span class="badge badge-${q.difficulty === 'easy' ? 'success' : 'danger'}">${q.difficulty}</span>
            <span class="badge badge-muted">${q.source}</span>
            <span class="badge badge-muted">Ch ${q.chapter_id}</span>
          </div>
          <button class="admin-btn-icon danger" onclick="deleteQuestion(${q.id})">✕</button>
        </div>
        <div class="admin-question-text">${escapeHtml(q.question_text)}</div>
        <div class="admin-question-answer">
          ✓ Correct: <strong>${q.correct_option}</strong>
        </div>
      </div>
    `).join("");

    // Render math
    listEl.querySelectorAll(".admin-question-text").forEach((el) => {
      renderMathIn(el);
    });
  } catch (error) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(error.message)}</div>
      </div>`;
  }
}

// ============================================================
// CREATE QUESTION
// ============================================================

async function openCreateQuestion() {
  try {
    currentSubjects = await AdminAPI.listSubjects();
    if (currentSubjects.length === 0) {
      showToast("Add a subject first from Curriculum", "error");
      return;
    }
  } catch (e) {
    showToast("Failed to load subjects", "error");
    return;
  }

  showModal({
    title: "Add Question",
    customContent: `
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Subject</label>
        <select id="qSubject" class="select-full" onchange="window.__loadChapters()">
          ${currentSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Chapter</label>
        <select id="qChapter" class="select-full"><option>Loading...</option></select>
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Question</label>
        <textarea id="qText" class="textarea-full" placeholder="Question text... use $x^2$ for math" style="min-height:70px"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">A</label><input type="text" id="qA" class="input-full" /></div>
        <div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">B</label><input type="text" id="qB" class="input-full" /></div>
        <div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">C</label><input type="text" id="qC" class="input-full" /></div>
        <div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">D</label><input type="text" id="qD" class="input-full" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">Correct</label>
          <select id="qCorrect" class="select-full">
            <option value="A">A</option><option value="B">B</option>
            <option value="C">C</option><option value="D">D</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">Difficulty</label>
          <select id="qDiff" class="select-full">
            <option value="easy">Easy</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">Explanation (optional)</label>
        <textarea id="qExplanation" class="textarea-full" placeholder="Explanation..." style="min-height:50px"></textarea>
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Save Question", style: "primary", onClick: "window.__doCreateQuestion()" },
    ],
  });

  setTimeout(() => window.__loadChapters(), 100);
}

window.__loadChapters = async function () {
  const subjId = parseInt(document.getElementById("qSubject").value);
  const chapSel = document.getElementById("qChapter");
  chapSel.innerHTML = `<option>Loading...</option>`;

  try {
    const fullSubject = await AdminAPI.getSubject(subjId);
    currentChapters = [];
    (fullSubject.sections || []).forEach(sec => {
      (sec.chapters || []).forEach(ch => currentChapters.push(ch));
    });

    if (currentChapters.length === 0) {
      chapSel.innerHTML = `<option value="">No chapters</option>`;
      return;
    }

    chapSel.innerHTML = currentChapters.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("");
  } catch (e) {
    chapSel.innerHTML = `<option>Error</option>`;
  }
};

window.__doCreateQuestion = async function () {
  const subjectId = parseInt(document.getElementById("qSubject").value);
  const chapterId = parseInt(document.getElementById("qChapter").value);
  const text = document.getElementById("qText").value.trim();
  const optA = document.getElementById("qA").value.trim();
  const optB = document.getElementById("qB").value.trim();
  const optC = document.getElementById("qC").value.trim();
  const optD = document.getElementById("qD").value.trim();
  const correct = document.getElementById("qCorrect").value;
  const difficulty = document.getElementById("qDiff").value;
  const explanation = document.getElementById("qExplanation").value.trim();

  if (!text || !optA || !optB || !optC || !optD) {
    showToast("All fields required", "error");
    return;
  }
  if (!chapterId) {
    showToast("Select a chapter", "error");
    return;
  }

  try {
    await AdminAPI.createQuestion({
      subject_id: subjectId,
      chapter_id: chapterId,
      question_text: text,
      correct_option: correct,
      explanation: explanation || null,
      difficulty,
      question_type: "mcq",
      options: [
        { option_label: "A", option_text: optA },
        { option_label: "B", option_text: optB },
        { option_label: "C", option_text: optC },
        { option_label: "D", option_text: optD },
      ],
    });
    closeModal();
    showToast("Question created!", "success");
    setTimeout(() => { loadQuestions(); loadStats(); }, 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

// ============================================================
// DELETE
// ============================================================

function deleteQuestion(id) {
  showModal({
    title: "Delete Question?",
    content: "This action cannot be undone.",
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Delete", style: "danger", onClick: `window.__doDeleteQ(${id})` },
    ],
  });
}

window.__doDeleteQ = async function (id) {
  closeModal();
  try {
    await AdminAPI.deleteQuestion(id);
    showToast("Question deleted", "success");
    setTimeout(() => { loadQuestions(); loadStats(); }, 400);
  } catch (error) { showToast(error.message, "error"); }
};

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// KATEX
// ============================================================

function renderMathIn(element) {
  if (typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch (e) {
    console.error("KaTeX render error:", e);
  }
}

window.openCreateQuestion = openCreateQuestion;
window.loadQuestions = loadQuestions;
window.deleteQuestion = deleteQuestion;
