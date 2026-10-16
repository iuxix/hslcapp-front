// ============================================================
// ADMIN — Questions (Search + Edit + Delete + Bulk)
// ============================================================

let currentSubjects = [];
let currentChapters = [];
let parsedQuestions = [];
let allQuestionsList = [];
let editingQuestionId = null;

let roleSelector = null;

(function () {
  if (!requireAdmin()) return;
  loadQuestions();
  loadStats();
})();

// ============================================================
// STATS BAR
// ============================================================

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
  } catch (e) { console.error(e); }
}

// ============================================================
// LOAD & RENDER QUESTIONS
// ============================================================

async function loadQuestions() {
  const listEl = document.getElementById("questionsList");
  listEl.innerHTML = `
    <div class="admin-loading">
      <div class="admin-spinner"></div>
      <div class="admin-loading-text">Loading...</div>
    </div>`;

  try {
    const questions = await AdminAPI.listQuestions({ limit: 200 });
    allQuestionsList = questions || [];
    renderQuestionsList(allQuestionsList);
  } catch (error) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(error.message)}</div>
      </div>`;
  }
}

function renderQuestionsList(questions) {
  const listEl = document.getElementById("questionsList");

  if (questions.length === 0) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❓</div>
        <div class="admin-empty-title">No questions found</div>
        <div class="admin-empty-text">Try different search</div>
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
        <div style="display:flex;gap:6px">
          <button class="admin-btn-icon" onclick="editQuestion(${q.id})" title="Edit">✎</button>
          <button class="admin-btn-icon danger" onclick="deleteQuestion(${q.id})" title="Delete">✕</button>
        </div>
      </div>
      <div class="admin-question-text">${escapeHtml(q.question_text)}</div>
      <div class="admin-question-answer">
        ✓ Correct: <strong>${q.correct_option}</strong>
      </div>
    </div>
  `).join("");
}

// ============================================================
// SEARCH
// ============================================================

window.filterQuestionsBySearch = function () {
  const searchInput = document.getElementById("questionSearch");
  if (!searchInput) return;
  const term = searchInput.value.trim().toLowerCase();
  if (!term) { renderQuestionsList(allQuestionsList); return; }

  const filtered = allQuestionsList.filter((q) =>
    q.question_text.toLowerCase().includes(term)
  );
  renderQuestionsList(filtered);
};

// ============================================================
// EDIT QUESTION
// ============================================================

async function editQuestion(id) {
  try {
    currentSubjects = await AdminAPI.listSubjects();
    const question = allQuestionsList.find((q) => q.id === id);
    if (!question) { showToast("Question not found", "error"); return; }
    editingQuestionId = id;

    const subject = currentSubjects.find((s) => s.id === question.subject_id);

    let chapters = [];
    if (subject) {
      const fullSubject = await AdminAPI.getSubject(subject.id);
      (fullSubject.sections || []).forEach((sec) => {
        (sec.chapters || []).forEach((ch) => {
          chapters.push({ id: ch.id, name: ch.name, sectionName: sec.name });
        });
      });
    }

    const options = {};
    question.options.forEach((o) => { options[o.option_label] = o.option_text; });

    showModal({
      title: "Edit Question",
      customContent: `
        <style>
          .edit-label {
            display: block;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 6px;
          }
        </style>

        <div style="margin-bottom:10px">
          <label class="edit-label">Subject</label>
          <select id="editSubject" class="select-full" onchange="window.__loadEditChapters(this.value)">
            ${currentSubjects.map((s) => `<option value="${s.id}" ${s.id === question.subject_id ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}
          </select>
        </div>
        <div style="margin-bottom:10px">
          <label class="edit-label">Chapter</label>
          <select id="editChapter" class="select-full">
            ${chapters.map((c) => `<option value="${c.id}" ${c.id === question.chapter_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div style="margin-bottom:10px">
          <label class="edit-label">Question</label>
          <textarea id="editText" class="textarea-full" style="min-height:70px">${escapeHtml(question.question_text)}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div><label class="edit-label">A</label><input type="text" id="editA" class="input-full" value="${escapeHtml(options.A || '')}" /></div>
          <div><label class="edit-label">B</label><input type="text" id="editB" class="input-full" value="${escapeHtml(options.B || '')}" /></div>
          <div><label class="edit-label">C</label><input type="text" id="editC" class="input-full" value="${escapeHtml(options.C || '')}" /></div>
          <div><label class="edit-label">D</label><input type="text" id="editD" class="input-full" value="${escapeHtml(options.D || '')}" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div>
            <label class="edit-label">Correct</label>
            <select id="editCorrect" class="select-full">
              ${["A","B","C","D"].map((l) => `<option value="${l}" ${l === question.correct_option ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="edit-label">Difficulty</label>
            <select id="editDiff" class="select-full">
              <option value="easy" ${question.difficulty === "easy" ? "selected" : ""}>Easy</option>
              <option value="hard" ${question.difficulty === "hard" ? "selected" : ""}>Hard</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label class="edit-label">Explanation</label>
          <textarea id="editExplanation" class="textarea-full" style="min-height:50px">${escapeHtml(question.explanation || '')}</textarea>
        </div>
      `,
      actions: [
        { label: "Cancel", style: "outline", onClick: "closeModal()" },
        { label: "Save", style: "primary", onClick: "window.__doEditSave()" },
      ],
    });
  } catch (e) {
    console.error(e);
    showToast("Failed to load for edit", "error");
  }
}

window.__loadEditChapters = async function (subjectId) {
  try {
    const fullSubject = await AdminAPI.getSubject(subjectId);
    const sel = document.getElementById("editChapter");
    let html = "";
    (fullSubject.sections || []).forEach((sec) => {
      html += `<optgroup label="${escapeHtml(sec.name)}">`;
      (sec.chapters || []).forEach((ch) => {
        html += `<option value="${ch.id}">${escapeHtml(ch.name)}</option>`;
      });
      html += `</optgroup>`;
    });
    sel.innerHTML = html;
  } catch (e) { console.error(e); }
};

window.__doEditSave = async function () {
  if (!editingQuestionId) return;

  const subjectId = parseInt(document.getElementById("editSubject").value);
  const chapterId = parseInt(document.getElementById("editChapter").value);
  const text = document.getElementById("editText").value.trim();
  const optA = document.getElementById("editA").value.trim();
  const optB = document.getElementById("editB").value.trim();
  const optC = document.getElementById("editC").value.trim();
  const optD = document.getElementById("editD").value.trim();
  const correct = document.getElementById("editCorrect").value;
  const difficulty = document.getElementById("editDiff").value;
  const explanation = document.getElementById("editExplanation").value.trim();

  if (!text || !optA || !optB || !optC || !optD) {
    showToast("All fields required", "error");
    return;
  }

  try {
    await API.put(`/api/admin/questions/${editingQuestionId}/full`, {
      subject_id: subjectId,
      chapter_id: chapterId,
      section_id: null,
      topic_id: null,
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
    editingQuestionId = null;
    showToast("Question updated!", "success");
    setTimeout(() => loadQuestions(), 400);
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
    setTimeout(() => loadQuestions(), 400);
  } catch (error) { showToast(error.message, "error"); }
};

// ============================================================
// SINGLE QUESTION ADD
// ============================================================

async function openCreateQuestion() {
  try {
    currentSubjects = await AdminAPI.listSubjects();
    if (currentSubjects.length === 0) {
      showToast("Add a subject first", "error");
      return;
    }
  } catch (e) {
    showToast("Failed to load subjects", "error");
    return;
  }

  showModal({
    title: "Add Single Question",
    customContent: `
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Subject</label>
        <select id="qSubject" class="select-full" onchange="window.__loadChapters()">
          ${currentSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Chapter</label>
        <select id="qChapter" class="select-full"><option>Loading...</option></select>
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Question</label>
        <textarea id="qText" class="textarea-full" placeholder="Question... use $x^2$ for math" style="min-height:70px"></textarea>
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
          <select id="qCorrect" class="select-full"><option>A</option><option>B</option><option>C</option><option>D</option></select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">Difficulty</label>
          <select id="qDiff" class="select-full"><option value="easy">Easy</option><option value="hard">Hard</option></select>
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px">Explanation</label>
        <textarea id="qExplanation" class="textarea-full" style="min-height:50px"></textarea>
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Save", style: "primary", onClick: "window.__doCreateQuestion()" },
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
    showToast("Select chapter", "error");
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
// BULK IMPORT
// ============================================================

async function openBulkImport() {
  try {
    currentSubjects = await AdminAPI.listSubjects();
    if (currentSubjects.length === 0) {
      showToast("Add a subject first", "error");
      return;
    }
  } catch (e) {
    showToast("Failed to load subjects", "error");
    return;
  }

  parsedQuestions = [];

  showModal({
    title: "📦 Bulk Import MCQ",
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Subject *</label>
        <select id="bulkSubject" class="select-full" onchange="window.__loadBulkChapters()">
          ${currentSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Chapter *</label>
        <select id="bulkChapter" class="select-full"><option>Loading...</option></select>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Paste Questions *</label>
        <textarea id="bulkText" class="textarea-full" placeholder="Q: Question text
A) Option A
B) Option B
C) Option C
D) Option D
Correct: C
Difficulty: easy
Explanation: ...
---
Q: Next question..." style="min-height:220px;font-family:monospace;font-size:12px"></textarea>
      </div>
      <div style="background:var(--color-bg);padding:12px;border-radius:8px;font-size:11px;color:var(--color-text-muted);line-height:1.6;margin-bottom:12px;font-family:monospace">
        <strong>📋 Format:</strong><br>
        <strong>Q:</strong> Question text<br>
        <strong>A)</strong> Option A<br>
        <strong>B)</strong> Option B<br>
        <strong>C)</strong> Option C<br>
        <strong>D)</strong> Option D<br>
        <strong>Correct:</strong> C &nbsp;(A/B/C/D)<br>
        <strong>Difficulty:</strong> easy &nbsp;(easy/hard)<br>
        <strong>Explanation:</strong> optional<br>
        <strong>---</strong> (separator between questions)
      </div>
      <button class="btn btn-outline btn-block" onclick="window.__parseBulk()" style="margin-bottom:12px">
        🔍 Parse & Preview
      </button>
      <div id="bulkPreview"></div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Import All", style: "primary", onClick: "window.__doBulkImport()" },
    ],
  });

  setTimeout(() => window.__loadBulkChapters(), 100);
}

window.__loadBulkChapters = async function () {
  const subjId = parseInt(document.getElementById("bulkSubject").value);
  const chapSel = document.getElementById("bulkChapter");
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

window.__parseBulk = function () {
  const text = document.getElementById("bulkText").value.trim();
  if (!text) {
    showToast("Paste questions first", "error");
    return;
  }

  const blocks = text.split(/\n?-{3,}\n?/).map(b => b.trim()).filter(b => b);
  const parsed = [];
  const errors = [];

  blocks.forEach((block, idx) => {
    try {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l);

      const q = { options: {}, difficulty: "easy" };
      let optionCount = 0;

      lines.forEach(line => {
        let m;
        if ((m = line.match(/^Q:\s*(.+)/i))) q.question = m[1].trim();
        else if ((m = line.match(/^A[\)\.]\s*(.+)/i))) { q.options.A = m[1].trim(); optionCount++; }
        else if ((m = line.match(/^B[\)\.]\s*(.+)/i))) { q.options.B = m[1].trim(); optionCount++; }
        else if ((m = line.match(/^C[\)\.]\s*(.+)/i))) { q.options.C = m[1].trim(); optionCount++; }
        else if ((m = line.match(/^D[\)\.]\s*(.+)/i))) { q.options.D = m[1].trim(); optionCount++; }
        else if ((m = line.match(/^Correct:\s*(.+)/i))) q.correct = m[1].trim().toUpperCase();
        else if ((m = line.match(/^Difficulty:\s*(.+)/i))) {
          const d = m[1].trim().toLowerCase();
          if (["easy", "hard"].includes(d)) q.difficulty = d;
        }
        else if ((m = line.match(/^Explanation:\s*(.+)/i))) q.explanation = m[1].trim();
      });

      if (!q.question) throw new Error("Missing Q:");
      if (optionCount !== 4) throw new Error(`Need 4 options, got ${optionCount}`);
      if (!q.correct || !["A", "B", "C", "D"].includes(q.correct)) throw new Error("Invalid Correct");

      parsed.push(q);
    } catch (e) {
      errors.push(`Q${idx + 1}: ${e.message}`);
    }
  });

  parsedQuestions = parsed;

  const previewEl = document.getElementById("bulkPreview");
  previewEl.innerHTML = `
    <div class="info-card" style="background:${parsed.length > 0 ? "var(--color-success-bg)" : "var(--color-danger-bg)"};border:none;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:800;color:${parsed.length > 0 ? "var(--color-success)" : "var(--color-danger)"}">
          ${parsed.length > 0 ? `✅ ${parsed.length} valid` : "❌ No valid questions"}
        </span>
        ${errors.length > 0 ? `<span style="font-size:12px;color:var(--color-danger);font-weight:700">${errors.length} errors</span>` : ""}
      </div>
    </div>

    ${errors.length > 0 ? `
      <div class="info-card" style="margin-bottom:12px;background:var(--color-danger-bg);border:none;max-height:120px;overflow-y:auto">
        ${errors.map(e => `<div style="font-size:12px;color:var(--color-danger);font-weight:600;margin-bottom:4px">⚠️ ${escapeHtml(e)}</div>`).join("")}
      </div>
    ` : ""}

    ${parsed.slice(0, 5).map((q, i) => `
      <div class="info-card" style="margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;line-height:1.5;margin-bottom:6px">${i + 1}. ${escapeHtml(q.question)}</div>
        <div style="font-size:11px;color:var(--color-text-muted);line-height:1.5">
          A) ${escapeHtml(q.options.A)}<br>
          B) ${escapeHtml(q.options.B)}<br>
          C) ${escapeHtml(q.options.C)}<br>
          D) ${escapeHtml(q.options.D)}
        </div>
        <div style="margin-top:6px;font-size:11px;font-weight:800;color:var(--color-success)">
          ✓ Correct: ${q.correct} · ${q.difficulty}
        </div>
      </div>
    `).join("")}

    ${parsed.length > 5 ? `<div style="text-align:center;padding:8px;font-size:12px;color:var(--color-text-muted);font-weight:600">... and ${parsed.length - 5} more</div>` : ""}
  `;

  if (parsed.length > 0) showToast(`Parsed ${parsed.length} questions`, "success");
};

window.__doBulkImport = async function () {
  if (!parsedQuestions || parsedQuestions.length === 0) {
    showToast("Click 'Parse & Preview' first", "error");
    return;
  }

  const subjectId = parseInt(document.getElementById("bulkSubject").value);
  const chapterId = parseInt(document.getElementById("bulkChapter").value);

  if (!chapterId) {
    showToast("Select a chapter", "error");
    return;
  }

  const importBtn = document.querySelector(".modal-actions .btn-primary");
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.textContent = `Importing 0/${parsedQuestions.length}...`;
  }

  let created = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < parsedQuestions.length; i++) {
    const q = parsedQuestions[i];
    try {
      await AdminAPI.createQuestion({
        subject_id: subjectId,
        chapter_id: chapterId,
        question_text: q.question,
        correct_option: q.correct,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        question_type: "mcq",
        options: [
          { option_label: "A", option_text: q.options.A },
          { option_label: "B", option_text: q.options.B },
          { option_label: "C", option_text: q.options.C },
          { option_label: "D", option_text: q.options.D },
        ],
      });
      created++;
      if (importBtn) importBtn.textContent = `Importing ${created}/${parsedQuestions.length}...`;
    } catch (e) {
      failed++;
      errors.push(`Q${i + 1}: ${e.message}`);
    }
  }

  if (importBtn) {
    importBtn.disabled = false;
    importBtn.textContent = "Import All";
  }

  if (created > 0) showToast(`✅ ${created} imported, ${failed} failed`, "success", 4000);
  else showToast(`❌ Import failed`, "error", 4000);

  if (failed === 0) {
    closeModal();
    setTimeout(() => { loadQuestions(); loadStats(); }, 400);
  } else {
    document.getElementById("bulkPreview").innerHTML = `
      <div class="info-card" style="background:var(--color-danger-bg);border:none">
        <div style="font-size:13px;font-weight:800;color:var(--color-danger);margin-bottom:8px">${created} imported, ${failed} failed</div>
        ${errors.slice(0, 10).map(e => `<div style="font-size:11px;color:var(--color-danger)">⚠️ ${escapeHtml(e)}</div>`).join("")}
      </div>
    `;
  }
};

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.openCreateQuestion = openCreateQuestion;
window.openBulkImport = openBulkImport;
window.loadQuestions = loadQuestions;
window.deleteQuestion = deleteQuestion;
window.editQuestion = editQuestion;
