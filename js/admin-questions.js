// ============================================================
// ADMIN — Questions Management (Custom Selectors)
// ============================================================

let currentSubjects = [];
let currentChapters = [];

let subjectSelector = null;
let chapterSelector = null;
let correctSelector = null;
let difficultySelector = null;

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
          <div class="admin-empty-text">Click "+ Add" to create your first question</div>
        </div>`;
      return;
    }

    listEl.innerHTML = questions.map(q => `
      <div class="admin-question-card">
        <div class="admin-question-header">
          <div class="admin-question-tags">
            <span class="badge badge-${q.difficulty === 'easy' ? 'success' : 'danger'}">${q.difficulty}</span>
            <span class="badge badge-muted">${q.source}</span>
          </div>
          <button class="admin-btn-icon danger" onclick="deleteQuestion(${q.id})">✕</button>
        </div>
        <div class="admin-question-text">${escapeHtml(q.question_text)}</div>
        <div class="admin-question-answer">
          ✓ Correct: <strong>${q.correct_option}</strong>
        </div>
      </div>
    `).join("");
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
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Subject *</label>
        ${buildCustomSelectHTML("qSubjectSelect", "Choose subject")}
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Chapter *</label>
        ${buildCustomSelectHTML("qChapterSelect", "Choose chapter")}
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Question *</label>
        <textarea id="qText" class="textarea-full" placeholder="Type question..." style="min-height:70px"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">A</label>
          <input type="text" id="qA" class="input-full" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">B</label>
          <input type="text" id="qB" class="input-full" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">C</label>
          <input type="text" id="qC" class="input-full" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">D</label>
          <input type="text" id="qD" class="input-full" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Correct *</label>
          ${buildCustomSelectHTML("qCorrectSelect", "Answer")}
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Difficulty *</label>
          ${buildCustomSelectHTML("qDifficultySelect", "Difficulty")}
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Explanation (optional)</label>
        <textarea id="qExplanation" class="textarea-full" placeholder="Explanation..." style="min-height:50px"></textarea>
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Save Question", style: "primary", onClick: "window.__doCreateQuestion()" },
    ],
  });

  // Bind custom selectors
  setTimeout(() => {
    subjectSelector = bindCustomSelect(
      "qSubjectSelect",
      currentSubjects.map(s => ({ value: s.id, label: s.name })),
      loadChaptersForSelector,
      currentSubjects[0]?.id
    );

    correctSelector = bindCustomSelect(
      "qCorrectSelect",
      [
        { value: "A", label: "A" },
        { value: "B", label: "B" },
        { value: "C", label: "C" },
        { value: "D", label: "D" },
      ],
      null,
      "A"
    );

    difficultySelector = bindCustomSelect(
      "qDifficultySelect",
      [
        { value: "easy", label: "Easy" },
        { value: "hard", label: "Hard" },
      ],
      null,
      "easy"
    );

    // Load chapters for first subject
    loadChaptersForSelector(currentSubjects[0]?.id);
  }, 100);
}

async function loadChaptersForSelector(subjectId) {
  if (!subjectId) return;

  try {
    const fullSubject = await AdminAPI.getSubject(subjectId);
    const chapters = [];
    (fullSubject.sections || []).forEach(sec => {
      (sec.chapters || []).forEach(ch => {
        chapters.push({ value: ch.id, label: ch.name, group: sec.name });
      });
    });

    currentChapters = chapters;

    if (chapters.length === 0) {
      chapterSelector = bindCustomSelect("qChapterSelect", [], null, null);
      showToast("No chapters in this subject", "error");
      return;
    }

    chapterSelector = bindCustomSelect(
      "qChapterSelect",
      chapters,
      null,
      chapters[0].value
    );
  } catch (e) {
    console.error(e);
    showToast("Failed to load chapters", "error");
  }
}

window.__doCreateQuestion = async function () {
  const subjectId = subjectSelector ? subjectSelector.getValue() : null;
  const chapterId = chapterSelector ? chapterSelector.getValue() : null;
  const text = document.getElementById("qText").value.trim();
  const optA = document.getElementById("qA").value.trim();
  const optB = document.getElementById("qB").value.trim();
  const optC = document.getElementById("qC").value.trim();
  const optD = document.getElementById("qD").value.trim();
  const correct = correctSelector ? correctSelector.getValue() : "A";
  const difficulty = difficultySelector ? difficultySelector.getValue() : "easy";
  const explanation = document.getElementById("qExplanation").value.trim();

  if (!text || !optA || !optB || !optC || !optD) {
    showToast("All question and option fields required", "error");
    return;
  }
  if (!chapterId) {
    showToast("Select a chapter", "error");
    return;
  }

  try {
    await AdminAPI.createQuestion({
      subject_id: parseInt(subjectId),
      chapter_id: parseInt(chapterId),
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

window.openCreateQuestion = openCreateQuestion;
window.loadQuestions = loadQuestions;
window.deleteQuestion = deleteQuestion;