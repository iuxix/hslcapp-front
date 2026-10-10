// ============================================================
// EXAMS HUB — Real API
// ============================================================

(async function () {
  if (!requireLogin()) return;

  try {
    const subjects = await PublicAPI.listSubjects();
    renderSubjects(subjects || []);
  } catch (e) {
    console.error(e);
    showToast("Failed to load subjects", "error");
  }
})();

function renderSubjects(subjects) {
  const el = document.getElementById("subjectsList");

  if (subjects.length === 0) {
    el.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">📚</div>
        <div class="admin-empty-title">No subjects</div>
        <div class="admin-empty-text">Ask admin to add subjects</div>
      </div>`;
    return;
  }

  el.innerHTML = subjects.map((s) => {
    const icon = getSubjectIcon(s.code);
    return `
      <div class="info-card" onclick="startSubjectExam(${s.id}, '${escapeHtml(s.name)}')" style="cursor:pointer;margin-bottom:12px">
        <div class="info-row">
          <span class="info-label">
            <span style="font-size:20px;margin-right:8px">${icon}</span>
            <strong>${escapeHtml(s.name)}</strong>
          </span>
          <span class="box-arrow" style="font-size:16px;color:var(--color-text-light)">→</span>
        </div>
        <div class="info-row" style="margin-top:4px">
          <span class="info-label" style="font-size:12px;color:var(--color-text-muted)">${escapeHtml(s.code)} · ${s.exam_pattern}</span>
        </div>
      </div>
    `;
  }).join("");
}

function getSubjectIcon(code) {
  const icons = { SCI: "🔬", MATH: "📐", ADVMATH: "🧮", ASM: "📖", ENG: "📘", SOC: "🌍" };
  return icons[code] || "📚";
}

function startSubjectExam(subjectId, subjectName) {
  showModal({
    title: subjectName,
    content: "Choose test type",
    customContent: `
      <button class="admin-sheet-option" onclick="quickFullTest(${subjectId})">
        <span class="admin-sheet-option-icon">📝</span>
        <span class="admin-sheet-option-content">
          <span class="admin-sheet-option-title">Full Test</span>
          <span class="admin-sheet-option-sub">All chapters, 30 Q</span>
        </span>
      </button>
      <button class="admin-sheet-option" onclick="closeModal(); window.location.href='exam-start.html'">
        <span class="admin-sheet-option-icon">📖</span>
        <span class="admin-sheet-option-content">
          <span class="admin-sheet-option-title">Chapter Test</span>
          <span class="admin-sheet-option-sub">Pick specific chapters</span>
        </span>
      </button>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
    ],
  });
}

async function quickFullTest(subjectId) {
  closeModal();
  showToast("Starting...", "info", 1000);

  const payload = {
    exam_type: "full",
    subject_id: subjectId,
    chapter_ids: null,
    difficulty: "mixed",
    count: 30,
    duration_minutes: 30,
  };

  try {
    const response = await ExamAPI.start(payload);
    localStorage.setItem("currentTestId", response.test_id);
    localStorage.setItem("currentTestData", JSON.stringify(response));
    setTimeout(() => (window.location.href = "exam.html"), 400);
  } catch (error) {
    showToast(error.message || "Failed to start", "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.startSubjectExam = startSubjectExam;
window.quickFullTest = quickFullTest;
