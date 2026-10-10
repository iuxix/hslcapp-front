// ============================================================
// PRACTICE — Phase 2C (FINAL)
// Subject → Chapter → Difficulty → Count → Start
// ============================================================

(function () {
  let session = null;
  try { session = getSession(); } catch (e) { console.error(e); }
  if (!session || session.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  const main = document.getElementById("practiceMain");
  if (!main) return;

  main.innerHTML = `
    <section class="section">
      <h3 class="section-title">📚 Full Subject Test</h3>
      <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:12px">
        Complete syllabus test for a subject
      </p>
      <div class="action-grid" id="subjectGrid"></div>
    </section>

    <section class="section">
      <h3 class="section-title">⚡ Quick Practice</h3>
      <div class="action-grid">
        <div class="action-card" onclick="quickPractice('science', 10, 15)">
          <span class="action-icon">⚡</span>
          <span class="action-title">Quick 10</span>
          <span class="action-sub">Science • 10Q • 15min</span>
        </div>
        <div class="action-card" onclick="quickPractice('science', 20, 30)">
          <span class="action-icon">📝</span>
          <span class="action-title">Medium 20</span>
          <span class="action-sub">Science • 20Q • 30min</span>
        </div>
        <div class="action-card" onclick="quickPractice('science', 30, 45)">
          <span class="action-icon">🔥</span>
          <span class="action-title">Full 30</span>
          <span class="action-sub">Science • 30Q • 45min</span>
        </div>
        <div class="action-card" onclick="startEasyOnly()">
          <span class="action-icon">🌱</span>
          <span class="action-title">Easy Only</span>
          <span class="action-sub">Build confidence</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">📖 Chapter-wise Test</h3>
      <div class="info-card">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Subject</label>
        <select class="select-full" id="subjectSelect" onchange="updateChapterDropdown()">
          <option value="">-- Choose subject --</option>
          ${MOCK.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
        </select>

        <label style="font-size:13px;font-weight:600;display:block;margin:12px 0 8px">Chapter</label>
        <select class="select-full" id="chapterSelect">
          <option value="">-- First choose subject --</option>
        </select>

        <label style="font-size:13px;font-weight:600;display:block;margin:12px 0 8px">Difficulty</label>
        <select class="select-full" id="difficultySelect">
          <option value="mixed">Mixed (Easy + Hard)</option>
          <option value="easy">All Easy</option>
          <option value="hard">All Hard</option>
        </select>

        <label style="font-size:13px;font-weight:600;display:block;margin:12px 0 8px">Question Count</label>
        <select class="select-full" id="countSelect">
          <option value="5">5 Questions</option>
          <option value="10" selected>10 Questions</option>
          <option value="15">15 Questions</option>
          <option value="30">30 Questions</option>
        </select>

        <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="startChapterPractice()">
          Start Chapter Test
        </button>
      </div>
    </section>
  `;

  // Render subject cards
  const subjGrid = document.getElementById("subjectGrid");
  MOCK.subjects.forEach((s) => {
    const totalQ = MOCK.questions.filter((q) => q.subject_id === s.id).length;
    const icon = s.name === "Science" ? "🔬" : s.name === "Mathematics" ? "📐" : "📚";

    const card = document.createElement("div");
    card.className = "action-card";
    card.onclick = () => startSubjectTest(s.id);
    card.innerHTML = `
      <span class="action-icon">${icon}</span>
      <span class="action-title">${s.name}</span>
      <span class="action-sub">${totalQ}Q • Full syllabus</span>
    `;
    subjGrid.appendChild(card);
  });
})();

// -------- Update chapters based on subject --------
function updateChapterDropdown() {
  const subjectId = parseInt(document.getElementById("subjectSelect").value);
  const chapterSel = document.getElementById("chapterSelect");

  if (!subjectId) {
    chapterSel.innerHTML = `<option value="">-- First choose subject --</option>`;
    return;
  }

  const subject = MOCK.subjects.find((s) => s.id === subjectId);
  if (!subject) return;

  let html = `<option value="">-- Choose chapter --</option>`;
  subject.sections.forEach((sec) => {
    html += `<optgroup label="— ${sec.name} —">`;
    sec.chapters.forEach((c) => {
      const qCount = MOCK.questions.filter((q) => q.chapter_id === c.id).length;
      const disabled = qCount === 0 ? "disabled" : "";
      const label = qCount === 0 ? `${c.name} (no questions)` : `${c.name} (${qCount}Q)`;
      html += `<option value="${c.id}" ${disabled}>${label}</option>`;
    });
    html += `</optgroup>`;
  });
  chapterSel.innerHTML = html;
}

// -------- Start Chapter Test --------
function startChapterPractice() {
  const subjectId = document.getElementById("subjectSelect").value;
  const chapterId = document.getElementById("chapterSelect").value;
  const difficulty = document.getElementById("difficultySelect").value;
  const count = document.getElementById("countSelect").value;

  if (!subjectId || !chapterId) {
    alert("Please select subject and chapter");
    return;
  }

  window.location.href = `exam.html?type=chapter&subject=${subjectId}&chapter=${chapterId}&difficulty=${difficulty}&count=${count}&duration=${count}`;
}

// -------- Quick Practice (Science default) --------
function quickPractice(subjectKey, count, duration) {
  window.location.href = `exam.html?type=full&subject=1&difficulty=mixed&count=${count}&duration=${duration}`;
}

// -------- Easy Only --------
function startEasyOnly() {
  window.location.href = `exam.html?type=full&subject=1&difficulty=easy&count=10&duration=15`;
}

// -------- Full Subject Test --------
function startSubjectTest(subjectId) {
  window.location.href = `exam.html?type=subject&subject=${subjectId}&difficulty=mixed&count=30&duration=45`;
}