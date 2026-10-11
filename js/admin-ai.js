// ============================================================
// ADMIN — AI Generation
// ============================================================

let state = {
  subjects: [],
  subjectId: null,
  chapters: [],
  chapterId: null,
  difficulty: "easy",
  count: 10,
};

let subjectSelector = null;
let chapterSelector = null;

(function () {
  if (!requireAdmin()) return;
  checkStatus();
  loadSubjects();
})();

async function checkStatus() {
  try {
    const status = await API.get("/api/admin/ai/status");
    const card = document.getElementById("statusCard");
    const statusText = document.getElementById("statusText");

    if (status.status === "ready") {
      statusText.textContent = `Ready · ${status.model}`;
      card.innerHTML = `
        <div class="info-card" style="background:linear-gradient(135deg,#D1FAE5,#A7F3D0);border:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">✅</span>
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--color-success)">AI is Ready</div>
              <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">Model: ${status.model}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      statusText.textContent = "AI not configured";
      card.innerHTML = `
        <div class="info-card" style="background:linear-gradient(135deg,#FFE4E6,#FECDD3);border:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">⚠️</span>
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--color-danger)">AI not configured</div>
              <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">Check Gemini API key on Render</div>
            </div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.error(e);
    document.getElementById("statusText").textContent = "Connection error";
  }
}

async function loadSubjects() {
  try {
    const subjects = await AdminAPI.listSubjects();
    state.subjects = subjects || [];

    if (state.subjects.length === 0) {
      showToast("No subjects — add curriculum first", "error");
      return;
    }

    // Bind subject selector
    setTimeout(() => {
      const wrapper = document.getElementById("subjectSelectWrapper");
      wrapper.innerHTML = buildCustomSelectHTML("subjectSelect", "Choose subject");
      subjectSelector = bindCustomSelect(
        "subjectSelect",
        state.subjects.map((s) => ({ value: s.id, label: s.name })),
        loadChaptersForSubject,
        state.subjects[0].id
      );
      // Load chapters for first subject
      loadChaptersForSubject(state.subjects[0].id);
    }, 100);

  } catch (e) {
    console.error(e);
    showToast("Failed to load subjects", "error");
  }
}

async function loadChaptersForSubject(subjectId) {
  state.subjectId = subjectId;
  state.chapterId = null;

  try {
    const fullSubject = await AdminAPI.getSubject(subjectId);
    const chapters = [];
    (fullSubject.sections || []).forEach((sec) => {
      (sec.chapters || []).forEach((ch) => {
        chapters.push({ value: ch.id, label: ch.name, group: sec.name });
      });
    });

    state.chapters = chapters;

    if (chapters.length === 0) {
      showToast("No chapters in this subject", "error");
      return;
    }

    // Re-bind chapter selector
    const chapWrapper = document.getElementById("chapterSelectWrapper");
    chapWrapper.innerHTML = buildCustomSelectHTML("chapterSelect", "Choose chapter");
    chapterSelector = bindCustomSelect(
      "chapterSelect",
      chapters,
      (val) => { state.chapterId = val; },
      chapters[0].value
    );
    state.chapterId = chapters[0].value;

  } catch (e) {
    console.error(e);
    showToast("Failed to load chapters", "error");
  }
}

window.selectDifficulty = function (btn) {
  document.querySelectorAll("#difficultyChips .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.difficulty = btn.dataset.diff;
};

window.selectCount = function (btn) {
  document.querySelectorAll("#countChips .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.count = parseInt(btn.dataset.count);
};

async function generateQuestions() {
  if (!state.chapterId) {
    showToast("Select a chapter", "error");
    return;
  }

  const btn = document.getElementById("generateBtn");
  const material = document.getElementById("materialInput").value.trim() || null;

  btn.disabled = true;
  btn.textContent = "⏳ Generating... this may take 20-40 sec";

  const resultArea = document.getElementById("resultArea");
  resultArea.innerHTML = `
    <div class="info-card" style="text-align:center;padding:32px">
      <div class="admin-spinner" style="margin:0 auto 12px"></div>
      <div style="font-size:13px;color:var(--color-text-muted);font-weight:600">
        Asking Gemini to generate ${state.count} questions...
      </div>
      <div style="font-size:11px;color:var(--color-text-light);margin-top:6px">
        Please wait up to 30 seconds
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${CONFIG.API_URL}/api/admin/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API.getToken()}`,
      },
      body: JSON.stringify({
        chapter_id: state.chapterId,
        difficulty: state.difficulty,
        count: state.count,
        material: material,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.created > 0) {
      showToast(`✅ ${data.created} questions generated!`, "success", 3000);
    } else {
      showToast("No questions could be generated", "error");
    }

    resultArea.innerHTML = `
      <div class="info-card" style="background:linear-gradient(135deg,#D1FAE5,#A7F3D0);border:none">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:32px">🎉</span>
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--color-success)">Generation Complete</div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">Saved to question bank</div>
          </div>
        </div>

        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
          <div class="stat-box success">
            <div class="v">${data.created}</div>
            <div class="l">Created</div>
          </div>
          <div class="stat-box warning">
            <div class="v">${data.skipped}</div>
            <div class="l">Skipped</div>
          </div>
          <div class="stat-box">
            <div class="v">${(data.errors || []).length}</div>
            <div class="l">Errors</div>
          </div>
        </div>
      </div>

      ${data.questions && data.questions.length > 0 ? `
        <h3 class="section-title" style="margin-top:24px">📝 Generated Questions</h3>
        ${data.questions.map((q, i) => `
          <div class="info-card" style="margin-bottom:8px">
            <div style="font-size:13px;font-weight:600;line-height:1.5;color:var(--color-text)">
              <span style="color:var(--color-primary);font-weight:800">${i + 1}.</span> ${escapeHtml(q.question)}
            </div>
          </div>
        `).join("")}
      ` : ""}

      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="window.location.href='questions.html'">
        View in Question Bank →
      </button>
    `;

  } catch (error) {
    console.error("AI generation error:", error);
    showToast(error.message || "Generation failed", "error", 4000);

    resultArea.innerHTML = `
      <div class="info-card" style="background:linear-gradient(135deg,#FFE4E6,#FECDD3);border:none">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:32px">❌</span>
          <div>
            <div style="font-size:16px;font-weight:800;color:var(--color-danger)">Generation Failed</div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">${escapeHtml(error.message)}</div>
          </div>
        </div>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Generate with AI";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.generateQuestions = generateQuestions;
