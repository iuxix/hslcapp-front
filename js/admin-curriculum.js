// ============================================================
// ADMIN — Curriculum Management
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
    const subjects = await AdminAPI.listSubjects();

    if (subjects.length === 0) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">📚</div>
          <div class="admin-empty-title">No subjects yet</div>
          <div class="admin-empty-text">Click "+ Subject" to add your first one</div>
        </div>`;
      return;
    }

    let html = "";
    for (const subj of subjects) {
      const sections = await AdminAPI.listSections(subj.id);

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
            ${sections.length === 0 ? `<div style="font-size:12px;color:var(--color-text-muted);padding:8px 0">No sections yet — click + to add</div>` : ""}
            ${sections.map(s => `
              <div class="admin-section-row">
                <span class="admin-section-icon">📂</span>
                <span class="admin-section-name">${escapeHtml(s.name)}</span>
                <div class="admin-section-actions">
                  <button class="admin-btn-icon" onclick="openAddChapter(${s.id}, '${escapeHtml(s.name)}')">+</button>
                  <button class="admin-btn-icon danger" onclick="deleteSection(${s.id})">✕</button>
                </div>
              </div>
              <div id="chapters-${s.id}" class="admin-chapters-list"></div>
            `).join("")}
          </div>
        </div>
      `;
    }
    listEl.innerHTML = html;

    for (const subj of subjects) {
      const sections = await AdminAPI.listSections(subj.id);
      for (const s of sections) {
        loadChapters(s.id);
      }
    }
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

async function loadChapters(sectionId) {
  const el = document.getElementById(`chapters-${sectionId}`);
  if (!el) return;

  try {
    const chapters = await AdminAPI.listChapters(sectionId);
    if (chapters.length === 0) {
      el.innerHTML = `<div style="font-size:12px;color:var(--color-text-muted);padding:4px 0 4px 16px">No chapters</div>`;
      return;
    }
    el.innerHTML = chapters.map(c => `
      <div class="admin-chapter-row">
        <span class="admin-chapter-icon">📄</span>
        <span class="admin-chapter-name">${escapeHtml(c.name)}</span>
        <button class="admin-btn-icon" onclick="openAddTopic(${c.id}, '${escapeHtml(c.name)}')">+</button>
        <button class="admin-btn-icon danger" onclick="deleteChapter(${c.id})">✕</button>
      </div>
    `).join("");
  } catch (error) {
    el.innerHTML = `<div style="font-size:12px;color:var(--color-danger);padding:4px 0 4px 16px">Error: ${escapeHtml(error.message)}</div>`;
  }
}

// ============================================================
// CREATE SUBJECT — with custom exam pattern selector
// ============================================================

function openCreateSubject() {
  showModal({
    title: "Create Subject",
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Name *</label>
        <input type="text" id="subjName" class="input-full" placeholder="e.g. Science" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Code *</label>
        <input type="text" id="subjCode" class="input-full" placeholder="e.g. SCI" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Exam Pattern</label>
        ${buildCustomSelectHTML("patternSelect", "Choose exam pattern")}
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create", style: "primary", onClick: "window.__doCreateSubject()" },
    ],
  });

  // Bind custom selector
  setTimeout(() => {
    patternSelector = bindCustomSelect(
      "patternSelect",
      [
        { value: "standard_45", label: "Standard 45 Q / 60 min" },
        { value: "mil_assamese", label: "MIL Assamese" },
        { value: "advanced_math", label: "Advanced Math" },
      ],
      null,
      "standard_45"
    );
  }, 100);
}

window.__doCreateSubject = async function () {
  const name = document.getElementById("subjName").value.trim();
  const code = document.getElementById("subjCode").value.trim();
  const exam_pattern = patternSelector ? patternSelector.getValue() : "standard_45";

  if (!name || !code) {
    showToast("Name and Code are required", "error");
    return;
  }

  try {
    await AdminAPI.createSubject({
      name, code, exam_pattern,
      default_question_count: 45,
      default_duration_minutes: 60,
      display_order: 0,
    });
    closeModal();
    showToast("Subject created", "success");
    setTimeout(() => loadCurriculum(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

// ============================================================
// SECTION / CHAPTER / TOPIC (same as before)
// ============================================================

function openAddSection(subjectId, subjectName) {
  showModal({
    title: "Add Section",
    content: `To "${subjectName}"`,
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Section Name *</label>
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
    setTimeout(() => loadCurriculum(), 400);
  } catch (error) { showToast(error.message, "error"); }
};

function openAddChapter(sectionId, sectionName) {
  showModal({
    title: "Add Chapter",
    content: `To "${sectionName}"`,
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Chapter Name *</label>
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
    setTimeout(() => loadCurriculum(), 400);
  } catch (error) { showToast(error.message, "error"); }
};

function openAddTopic(chapterId, chapterName) {
  showModal({
    title: "Add Topic",
    content: `To "${chapterName}"`,
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Topic Name *</label>
        <input type="text" id="topName" class="input-full" placeholder="e.g. Ohm's Law" />
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create", style: "primary", onClick: `window.__doCreateTopic(${chapterId})` },
    ],
  });
}

window.__doCreateTopic = async function (chapterId) {
  const name = document.getElementById("topName").value.trim();
  if (!name) { showToast("Topic name required", "error"); return; }
  try {
    await AdminAPI.createTopic({ chapter_id: chapterId, name, display_order: 0 });
    closeModal();
    showToast("Topic created", "success");
    setTimeout(() => loadCurriculum(), 400);
  } catch (error) { showToast(error.message, "error"); }
};

// ============================================================
// DELETES
// ============================================================

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
    setTimeout(() => loadCurriculum(), 400);
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
    setTimeout(() => loadCurriculum(), 400);
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
    setTimeout(() => loadCurriculum(), 400);
  } catch (error) { showToast(error.message, "error"); }
};

// ============================================================
// EXPOSE
// ============================================================

window.loadCurriculum = loadCurriculum;
window.loadChapters = loadChapters;
window.openCreateSubject = openCreateSubject;
window.openAddSection = openAddSection;
window.openAddChapter = openAddChapter;
window.openAddTopic = openAddTopic;
window.deleteSubject = deleteSubject;
window.deleteSection = deleteSection;
window.deleteChapter = deleteChapter;
