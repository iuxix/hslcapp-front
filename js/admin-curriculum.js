// ============================================================
// ADMIN — Curriculum (Lightweight)
// ============================================================

let patternSelector = null;

(function () {
  if (!requireAdmin()) return;
  loadCurriculum();
})();

async function loadCurriculum() {
  const listEl = document.getElementById("curriculumList");
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="admin-loading">
      <div class="admin-spinner"></div>
      <div class="admin-loading-text">Loading...</div>
    </div>`;

  try {
    // ✅ ONE lightweight call
    const subjects = await API.get("/api/admin/curriculum-light");

    if (!subjects || subjects.length === 0) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">📚</div>
          <div class="admin-empty-title">No subjects yet</div>
          <div class="admin-empty-text">Click "+ Subject" to add</div>
        </div>`;
      return;
    }

    let html = "";
    subjects.forEach((subj) => {
      html += `
        <div class="admin-subject-card">
          <div class="admin-subject-header">
            <div class="admin-subject-icon">📚</div>
            <div class="admin-subject-info">
              <div class="admin-subject-name">${escapeHtml(subj.name)}</div>
              <div class="admin-subject-meta">${escapeHtml(subj.code)} · ${subj.exam_pattern}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="admin-btn-icon" onclick="openAddSection(${subj.id}, '${escapeHtml(subj.name)}')">+</button>
              <button class="admin-btn-icon danger" onclick="deleteSubject(${subj.id})">✕</button>
            </div>
          </div>
          <div class="admin-subject-sections">
            ${subj.sections.length === 0 ? `<div style="font-size:12px;color:var(--color-text-muted);padding:8px 0">No sections yet — click + to add</div>` : ""}
            ${subj.sections.map((s) => `
              <div class="admin-section-row">
                <span class="admin-section-icon">📂</span>
                <span class="admin-section-name">${escapeHtml(s.name)}</span>
                <div class="admin-section-actions">
                  <button class="admin-btn-icon" onclick="openAddChapter(${s.id}, '${escapeHtml(s.name)}')">+</button>
                  <button class="admin-btn-icon danger" onclick="deleteSection(${s.id})">✕</button>
                </div>
              </div>
              ${s.chapters.map((c) => `
                <div class="admin-chapter-row" style="padding-left:28px">
                  <span class="admin-chapter-icon">📄</span>
                  <span class="admin-chapter-name">${escapeHtml(c.name)}</span>
                  <button class="admin-btn-icon danger" onclick="deleteChapter(${c.id})">✕</button>
                </div>
              `).join("")}
            `).join("")}
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;

  } catch (error) {
    console.error(error);
    listEl.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(error.message)}</div>
      </div>`;
  }
}

// ============================================================
// CREATE SUBJECT
// ============================================================

function openCreateSubject() {
  showModal({
    title: "Create Subject",
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Name *</label>
        <input type="text" id="subjName" class="input-full" placeholder="e.g. Science" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Code *</label>
        <input type="text" id="subjCode" class="input-full" placeholder="e.g. SCI" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Exam Pattern</label>
        <select id="subjPattern" class="select-full">
          <option value="standard_45">Standard (45 Q / 60 min)</option>
          <option value="mil_assamese">MIL Assamese</option>
          <option value="advanced_math">Advanced Math</option>
        </select>
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create", style: "primary", onClick: "window.__doCreateSubject()" },
    ],
  });
}

window.__doCreateSubject = async function () {
  const name = document.getElementById("subjName").value.trim();
  const code = document.getElementById("subjCode").value.trim();
  const exam_pattern = document.getElementById("subjPattern").value;

  if (!name || !code) { showToast("Name and Code required", "error"); return; }

  try {
    await AdminAPI.createSubject({
      name, code, exam_pattern,
      default_question_count: 45,
      default_duration_minutes: 60,
      display_order: 0,
    });
    closeModal();
    showToast("Subject created", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function openAddSection(subjectId, subjectName) {
  showModal({
    title: "Add Section",
    content: `To "${subjectName}"`,
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Section Name *</label>
        <input type="text" id="secName" class="input-full" placeholder="e.g. Physics" />
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create", style: "primary", onClick: `window.__doCreateSection(${subjectId})` },
    ],
  });
}

window.__doCreateSection = async function (subjectId) {
  const name = document.getElementById("secName").value.trim();
  if (!name) { showToast("Section name required", "error"); return; }
  try {
    await AdminAPI.createSection({ subject_id: subjectId, name, display_order: 0 });
    closeModal();
    showToast("Section created", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function openAddChapter(sectionId, sectionName) {
  showModal({
    title: "Add Chapter",
    content: `To "${sectionName}"`,
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Chapter Name *</label>
        <input type="text" id="chapName" class="input-full" placeholder="e.g. Electricity" />
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create", style: "primary", onClick: `window.__doCreateChapter(${sectionId})` },
    ],
  });
}

window.__doCreateChapter = async function (sectionId) {
  const name = document.getElementById("chapName").value.trim();
  if (!name) { showToast("Chapter name required", "error"); return; }
  try {
    await AdminAPI.createChapter({ section_id: sectionId, name, display_order: 0 });
    closeModal();
    showToast("Chapter created", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function deleteSubject(id) {
  showModal({
    title: "Delete Subject?",
    content: "This will delete all sections, chapters, and questions inside.",
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Delete", style: "danger", onClick: `window.__doDeleteSubject(${id})` },
    ],
  });
}
window.__doDeleteSubject = async function (id) {
  closeModal();
  try {
    await AdminAPI.deleteSubject(id);
    showToast("Subject deleted", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function deleteSection(id) {
  showModal({
    title: "Delete Section?",
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Delete", style: "danger", onClick: `window.__doDeleteSection(${id})` },
    ],
  });
}
window.__doDeleteSection = async function (id) {
  closeModal();
  try {
    await AdminAPI.deleteSection(id);
    showToast("Section deleted", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function deleteChapter(id) {
  showModal({
    title: "Delete Chapter?",
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Delete", style: "danger", onClick: `window.__doDeleteChapter(${id})` },
    ],
  });
}
window.__doDeleteChapter = async function (id) {
  closeModal();
  try {
    await AdminAPI.deleteChapter(id);
    showToast("Chapter deleted", "success");
    setTimeout(() => loadCurriculum(), 300);
  } catch (error) { showToast(error.message, "error"); }
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.openCreateSubject = openCreateSubject;
window.openAddSection = openAddSection;
window.openAddChapter = openAddChapter;
window.deleteSubject = deleteSubject;
window.deleteSection = deleteSection;
window.deleteChapter = deleteChapter;
