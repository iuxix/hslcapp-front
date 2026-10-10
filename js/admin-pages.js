// ============================================================
// ADMIN SUB-PAGES — Phase 2F
// ============================================================

function requireAdmin() {
  const s = getSession();
  if (!s || s.role !== "admin") { window.location.href = "login.html"; return null; }
  return s;
}

// -------- Users Page --------
function renderAdminUsers() {
  if (!requireAdmin()) return;
  const attempts = getAttempts();
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = MOCK.users.map((u) => {
    const userAttempts = attempts.filter((a) => a.userId === u.id);
    const avgAcc = userAttempts.length > 0
      ? (userAttempts.reduce((s, a) => s + a.percentage, 0) / userAttempts.length).toFixed(0) + "%"
      : "--";
    return `<tr>
      <td><strong>${u.username}</strong></td>
      <td><span class="badge badge-${u.role === "admin" ? "warning" : "muted"}">${u.role}</span></td>
      <td>${userAttempts.length}</td>
      <td>${avgAcc}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" onclick="alert('View user — backend ke baad')">View</button>
          <button class="icon-btn danger" onclick="alert('Delete user — backend ke baad')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// -------- Curriculum Page --------
function renderAdminCurriculum() {
  if (!requireAdmin()) return;
  const main = document.getElementById("curriculumMain");
  main.innerHTML = `
    <div class="action-row">
      <button class="btn btn-admin" onclick="alert('Add subject — backend ke baad')">+ Subject</button>
    </div>
    ${MOCK.subjects.map((s) => `
      <div class="info-card" style="margin-bottom:12px">
        <div class="info-row">
          <span class="info-label"><strong>${s.name}</strong> (${s.code})</span>
          <span class="badge badge-muted">${s.exam_pattern}</span>
        </div>
        ${s.sections.map((sec) => `
          <div style="margin-top:12px;padding-left:12px;border-left:3px solid var(--color-primary)">
            <div class="info-row">
              <span class="info-label"><strong>${sec.name}</strong></span>
              <span class="badge badge-muted">${sec.chapters.length} chapters</span>
            </div>
            ${sec.chapters.map((c) => `
              <div style="margin-top:8px;padding-left:12px;font-size:13px">
                📖 ${c.name} <span style="color:var(--color-text-muted)">(${c.topics ? c.topics.length : 0} topics)</span>
              </div>
            `).join("")}
          </div>
        `).join("")}
      </div>
    `).join("")}
  `;
}

// -------- Questions Page --------
function renderAdminQuestions() {
  if (!requireAdmin()) return;

  const chipsEl = document.getElementById("qChips");
  const allSubjects = MOCK.subjects;
  chipsEl.innerHTML = `<button class="chip active" onclick="filterQuestions(this,0)">All (${MOCK.questions.length})</button>` +
    allSubjects.map((s) => {
      const cnt = MOCK.questions.filter((q) => q.subject_id === s.id).length;
      return `<button class="chip" onclick="filterQuestions(this,${s.id})">${s.name} (${cnt})</button>`;
    }).join("");

  renderQuestionList(MOCK.questions);
}

function filterQuestions(btn, subjectId) {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  const list = subjectId === 0 ? MOCK.questions : MOCK.questions.filter((q) => q.subject_id === subjectId);
  renderQuestionList(list);
}

function renderQuestionList(list) {
  const el = document.getElementById("questionList");
  el.innerHTML = list.map((q) => `
    <div class="info-card" style="margin-bottom:12px">
      <div class="info-row" style="border:none;padding:0;margin-bottom:8px">
        <span class="badge badge-${q.difficulty === "easy" ? "success" : "danger"}">${q.difficulty}</span>
        <span class="badge badge-muted">${getChapterName(q.chapter_id)}</span>
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;line-height:1.5">${q.text}</div>
      <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px">Correct: <strong style="color:var(--color-success)">${q.correct}</strong></div>
      <div class="table-actions" style="margin-top:8px">
        <button class="icon-btn" onclick="alert('Edit — backend ke baad')">Edit</button>
        <button class="icon-btn danger" onclick="alert('Delete — backend ke baad')">Delete</button>
      </div>
    </div>
  `).join("");
}

// -------- Material Page --------
function renderAdminMaterial() {
  if (!requireAdmin()) return;

  // Populate chapter dropdown
  const sel = document.getElementById("matChapter");
  const allChapters = [];
  MOCK.subjects.forEach((s) => s.sections.forEach((sec) =>
    sec.chapters.forEach((c) => allChapters.push({ id: c.id, name: c.name }))
  ));
  sel.innerHTML = `<option value="">-- Choose chapter --</option>` +
    allChapters.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

  // Load existing material
  let materials = [];
  try { materials = JSON.parse(localStorage.getItem("seba_materials")) || []; } catch {}
  renderMaterialList(materials);
}

function renderMaterialList(list) {
  const el = document.getElementById("materialList");
  if (list.length === 0) {
    el.innerHTML = `<div class="info-card"><div class="empty-text" style="text-align:center;padding:16px;color:var(--color-text-muted)">No material yet. Add trusted content above.</div></div>`;
    return;
  }
  el.innerHTML = list.map((m) => `
    <div class="material-card">
      <h4>${m.title}</h4>
      <div class="content-preview">${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}</div>
      <div class="mistake-meta">
        <span>📖 ${getChapterName(m.chapterId)}</span>
        <span>📅 ${new Date(m.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join("");
}

function saveMaterial() {
  const chapterId = parseInt(document.getElementById("matChapter").value);
  const title = document.getElementById("matTitle").value.trim();
  const content = document.getElementById("matContent").value.trim();

  if (!chapterId || !title || !content) {
    alert("Please fill all fields");
    return;
  }

  let materials = [];
  try { materials = JSON.parse(localStorage.getItem("seba_materials")) || []; } catch {}

  materials.unshift({
    id: "mat_" + Date.now(),
    chapterId, title, content,
    createdAt: Date.now(),
  });
  localStorage.setItem("seba_materials", JSON.stringify(materials));

  document.getElementById("matTitle").value = "";
  document.getElementById("matContent").value = "";

  renderMaterialList(materials);
  alert("Material saved!");
}