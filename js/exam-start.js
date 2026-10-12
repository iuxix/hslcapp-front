// ============================================================
// EXAM START — Full, Chapter, HOTS, Theory, PYQ (No AI)
// ============================================================

let state = {
  examType: null,
  subjects: [],
  subjectId: null,
  sections: [],
  chapters: [],
  chapterIds: [],
  difficulty: "mixed",
  count: 30,
};

const subjectCache = {};

(function () {
  if (!requireLogin()) return;
  loadSubjectsAndRender();
  updateStepper(1);
})();

async function loadSubjectsAndRender() {
  try {
    const subjects = await PublicAPI.listSubjects();
    state.subjects = subjects || [];
  } catch (e) {
    console.error("Load subjects error:", e);
    showToast("Failed to load subjects", "error");
    state.subjects = [];
  }
  renderExamTypes();
}

// ============================================================
// EXAM TYPES
// ============================================================

function renderExamTypes() {
  const types = [
    { id: "full", icon: "📝", title: "Full Test", sub: "All chapters, mixed", bg: "#EEF2FF" },
    { id: "chapter", icon: "📖", title: "Chapter Test", sub: "Pick specific chapters", bg: "#CCFBF1" },
    { id: "hots", icon: "💡", title: "HOTS", sub: "Coming soon", bg: "#FEF3C7", disabled: true },
    { id: "theory", icon: "📚", title: "Theory Test", sub: "Coming soon", bg: "#F3E8FF", disabled: true },
    { id: "pyq", icon: "📜", title: "PYQ", sub: "Coming soon", bg: "#FCE7F3", disabled: true },
  ];

  const grid = document.getElementById("examTypeGrid");
  grid.innerHTML = "";

  types.forEach((t) => {
    const card = document.createElement("button");
    card.className = "exam-type-card";
    card.dataset.type = t.id;
    card.style.position = "relative";
    card.onclick = () => {
      if (t.disabled) {
        showToast(`${t.title} — coming in next update!`, "info", 2500);
        return;
      }
      selectExamType(t.id);
    };
    card.innerHTML = `
      <div class="exam-type-icon" style="background:${t.bg}">${t.icon}</div>
      <div class="exam-type-title">${t.title}</div>
      <div class="exam-type-sub">${t.sub}</div>
      ${t.disabled ? '<div class="badge badge-warning" style="position:absolute;top:8px;right:8px;font-size:9px">SOON</div>' : ""}
    `;
    grid.appendChild(card);
  });
}

function selectExamType(type) {
  state.examType = type;
  document.querySelectorAll(".exam-type-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.type === type);
  });
  updateStepper(2);
  showSubjectSection();
  updateFooter();
}

function showSubjectSection() {
  document.getElementById("section2").style.display = "block";
  const grid = document.getElementById("subjectGrid");
  grid.innerHTML = "";

  if (state.subjects.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1" class="admin-empty">
        <div class="admin-empty-icon">📚</div>
        <div class="admin-empty-title">No subjects</div>
        <div class="admin-empty-text">Ask admin to add subjects</div>
      </div>`;
    return;
  }

  state.subjects.forEach((s) => {
    const icon = getSubjectIcon(s.code);
    const btn = document.createElement("button");
    btn.className = "subject-card";
    btn.dataset.subject = s.id;
    btn.onclick = () => selectSubject(s.id, btn);
    btn.innerHTML = `
      <div class="subject-icon">${icon}</div>
      <div class="subject-name">${escapeHtml(s.name)}</div>
      <div class="subject-meta">${escapeHtml(s.code)}</div>
    `;
    grid.appendChild(btn);
  });
}

function getSubjectIcon(code) {
  const icons = { SCI: "🔬", MATH: "📐", ADVMATH: "🧮", ASM: "📖", ENG: "📘", SOC: "🌍" };
  return icons[code] || "📚";
}

async function selectSubject(subjectId, clickedCard) {
  state.subjectId = subjectId;
  state.chapterIds = [];

  document.querySelectorAll(".subject-card").forEach((c) => {
    c.classList.toggle("selected", parseInt(c.dataset.subject) === subjectId);
  });

  if (subjectCache[subjectId]) {
    state.sections = subjectCache[subjectId].sections;
    state.chapters = subjectCache[subjectId].chapters;
    updateStepper(3);
    showDetailsSection();
    updateFooter();
    return;
  }

  if (clickedCard) {
    clickedCard.style.pointerEvents = "none";
    const meta = clickedCard.querySelector(".subject-meta");
    if (meta) meta.textContent = "Loading...";
  }

  updateStepper(3);
  showDetailsSectionSkeleton();
  updateFooter();

  try {
    const fullSubject = await PublicAPI.getSubject(subjectId);
    const sections = fullSubject.sections || [];
    const chapters = [];
    sections.forEach((sec) => {
      (sec.chapters || []).forEach((ch) => {
        chapters.push({ ...ch, sectionName: sec.name });
      });
    });

    subjectCache[subjectId] = { sections, chapters };
    state.sections = sections;
    state.chapters = chapters;

    if (clickedCard) {
      clickedCard.style.pointerEvents = "auto";
      const meta = clickedCard.querySelector(".subject-meta");
      const subject = state.subjects.find((s) => s.id === subjectId);
      if (meta && subject) meta.textContent = subject.code;
    }

    showDetailsSection();
    updateFooter();
  } catch (error) {
    console.error(error);
    showToast("Failed to load chapters", "error");

    if (clickedCard) {
      clickedCard.style.pointerEvents = "auto";
      const meta = clickedCard.querySelector(".subject-meta");
      const subject = state.subjects.find((s) => s.id === subjectId);
      if (meta && subject) meta.textContent = subject.code;
    }

    document.getElementById("section3").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load chapters</div>
      </div>`;
  }
}

function showDetailsSectionSkeleton() {
  document.getElementById("section3").style.display = "block";

  if (state.examType === "chapter") {
    document.getElementById("chapterBlock").style.display = "block";
    document.getElementById("chapterSelectWrapper").innerHTML = `
      <div style="background:var(--color-card);border:1.5px solid var(--color-border);border-radius:var(--radius-md);padding:24px;text-align:center">
        <div class="admin-spinner" style="margin:0 auto 12px"></div>
        <div style="font-size:13px;color:var(--color-text-muted);font-weight:600">Loading chapters...</div>
      </div>`;
  } else {
    document.getElementById("chapterBlock").style.display = "none";
  }
}

function showDetailsSection() {
  document.getElementById("section3").style.display = "block";

  if (state.examType === "chapter") {
    document.getElementById("chapterBlock").style.display = "block";
    renderChapterSelector();
  } else {
    document.getElementById("chapterBlock").style.display = "none";
  }
}

function renderChapterSelector() {
  const wrapper = document.getElementById("chapterSelectWrapper");

  if (state.chapters.length === 0) {
    wrapper.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">📄</div>
        <div class="admin-empty-title">No chapters</div>
        <div class="admin-empty-text">No chapters in this subject yet</div>
      </div>`;
    return;
  }

  const grouped = {};
  state.chapters.forEach((ch) => {
    if (!grouped[ch.sectionName]) grouped[ch.sectionName] = [];
    grouped[ch.sectionName].push(ch);
  });

  wrapper.innerHTML = `
    <div style="background:var(--color-card);border:1.5px solid var(--color-border);border-radius:var(--radius-md);max-height:320px;overflow-y:auto;padding:6px">
      ${Object.entries(grouped).map(([sectionName, chapters]) => `
        <div style="padding:8px 10px 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted)">${escapeHtml(sectionName)}</div>
        ${chapters.map((ch) => `
          <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;cursor:pointer">
            <input type="checkbox" data-chapter-id="${ch.id}" onchange="toggleChapter(${ch.id}, this.checked)" style="width:18px;height:18px;accent-color:var(--color-primary);cursor:pointer;flex-shrink:0" />
            <span style="flex:1;font-size:14px;font-weight:600;color:var(--color-text)">${escapeHtml(ch.name)}</span>
          </label>
        `).join("")}
      `).join("")}
    </div>
    <div style="font-size:12px;color:var(--color-text-muted);margin-top:6px;font-weight:500">
      Select one or more chapters
    </div>
  `;
}

function toggleChapter(chapterId, checked) {
  if (checked) {
    if (!state.chapterIds.includes(chapterId)) state.chapterIds.push(chapterId);
  } else {
    state.chapterIds = state.chapterIds.filter((id) => id !== chapterId);
  }
  updateFooter();
}

window.selectDifficulty = function (btn) {
  document.querySelectorAll("#difficultyChips .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.difficulty = btn.dataset.diff;
  updateFooter();
};

window.selectCount = function (btn) {
  document.querySelectorAll("#countChips .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.count = parseInt(btn.dataset.count);
  updateFooter();
};

function updateStepper(step) {
  document.querySelectorAll(".step").forEach((s) => {
    const num = parseInt(s.dataset.step);
    s.classList.remove("active", "done");
    if (num === step) s.classList.add("active");
    else if (num < step) s.classList.add("done");
  });
  document.querySelectorAll(".step-line").forEach((line, i) => {
    line.classList.toggle("done", i < step - 1);
  });
}

function updateFooter() {
  const footer = document.getElementById("footerCta");
  if (!state.examType) { footer.style.display = "none"; return; }
  footer.style.display = "flex";
  const duration = state.count;
  document.getElementById("footerInfo").textContent =
    `${state.count} Q • ${duration} min • ${capitalize(state.difficulty)}`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function highlightSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "center" });
  section.classList.add("section-highlight");
  setTimeout(() => section.classList.remove("section-highlight"), 1600);
}

window.beginExam = async function () {
  if (!state.examType) { highlightSection("section1"); showToast("Select exam type", "error"); return; }
  if (!state.subjectId) { highlightSection("section2"); showToast("Select a subject", "error"); return; }
  if (state.examType === "chapter" && state.chapterIds.length === 0) {
    highlightSection("chapterBlock"); showToast("Select at least one chapter", "error"); return;
  }

  const payload = {
    exam_type: state.examType,
    subject_id: state.subjectId,
    chapter_ids: state.examType === "chapter" ? state.chapterIds : null,
    difficulty: state.difficulty,
    count: state.count,
    duration_minutes: state.count,
  };

  const btn = document.querySelector("#footerCta button");
  if (btn) { btn.disabled = true; btn.textContent = "Starting..."; }

  let retries = 0;
  const maxRetries = 2;

  async function attemptStart() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${CONFIG.API_URL}/api/exam/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      localStorage.setItem("currentTestId", data.test_id);
      localStorage.setItem("currentTestData", JSON.stringify(data));
      window.location.href = "exam.html";
      return;

    } catch (error) {
      console.error("Begin exam error:", error);

      const isRetryable = error.name === "AbortError" || 
                          error.message.includes("Network") || 
                          error.message.includes("fetch") ||
                          error.message.includes("Load failed");

      if (isRetryable && retries < maxRetries) {
        retries++;
        showToast(`Backend waking up... retry ${retries}/${maxRetries}`, "info", 2000);
        await new Promise((r) => setTimeout(r, 3000));
        return attemptStart();
      }

      showToast(error.message || "Failed to start exam", "error", 4000);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Begin →";
      }
    }
  }

  await attemptStart();
};

window.selectDifficulty = window.selectDifficulty;
window.selectCount = window.selectCount;
window.toggleChapter = toggleChapter;
window.beginExam = window.beginExam;
