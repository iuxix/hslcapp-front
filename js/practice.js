// ============================================================
// WEAK AREAS PRACTICE — Real API
// ============================================================

let weakData = null;

(async function () {
  if (!requireLogin()) return;

  try {
    weakData = await StudentAPI.getWeakAreas();
    renderPractice();
  } catch (e) {
    console.error(e);
    document.getElementById("practiceMain").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(e.message)}</div>
      </div>`;
  }
})();

function renderPractice() {
  const main = document.getElementById("practiceMain");
  const weakest = weakData.weakest_chapters || [];

  if (weakest.length === 0) {
    main.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">🎯</div>
        <div class="admin-empty-title">No weak areas yet</div>
        <div class="admin-empty-text">Take a few tests and we'll identify weak chapters for you</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='exam-start.html'">Take a Test</button>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="info-card" style="margin-bottom:20px;background:linear-gradient(135deg,#EEF2FF,#E0E7FF);border:none">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:32px">🎯</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--color-primary)">Focus on these chapters</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">Targeted practice based on your performance</div>
        </div>
      </div>
    </div>

    <section class="section">
      <h3 class="section-title">🎯 Weakest Chapters</h3>
      <div id="weakList">
        ${weakest.map((c, i) => {
          const cls = c.accuracy >= 70 ? "good" : c.accuracy >= 40 ? "mid" : "bad";
          return `
            <div class="info-card" style="margin-bottom:12px">
              <div class="info-row">
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:800;margin-bottom:4px">${i + 1}. ${escapeHtml(c.chapter_name)}</div>
                  <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">
                    ${c.correct}/${c.total_attempted} correct · ${Math.round(c.accuracy)}% accuracy
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill ${cls}" style="width:${c.accuracy}%"></div>
                  </div>
                </div>
              </div>
              <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="practiceChapter(${c.chapter_id})">
                📖 Practice ${escapeHtml(c.chapter_name)}
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </section>

    <section class="section">
      <button class="btn btn-outline btn-block" onclick="practiceAll()">
        ⚡ Practice All Weak Chapters
      </button>
    </section>
  `;
}

async function practiceChapter(chapterId) {
  showToast("Starting practice...", "info", 1000);

  // We need the subject_id for this chapter — get from chapters API
  try {
    const chapter = await PublicAPI.getChapter(chapterId);

    // Find subject_id — chapter has section, section has subject
    // For simplicity, we need to fetch it differently
    // Let's use first subject as fallback
    const subjects = await PublicAPI.listSubjects();

    // Try each subject to find which has this chapter
    let foundSubjectId = null;
    for (const s of subjects) {
      try {
        const full = await PublicAPI.getSubject(s.id);
        for (const sec of full.sections || []) {
          for (const ch of sec.chapters || []) {
            if (ch.id === chapterId) {
              foundSubjectId = s.id;
              break;
            }
          }
          if (foundSubjectId) break;
        }
        if (foundSubjectId) break;
      } catch (e) {
        continue;
      }
    }

    if (!foundSubjectId) {
      showToast("Could not find subject for this chapter", "error");
      return;
    }

    const payload = {
      exam_type: "chapter",
      subject_id: foundSubjectId,
      chapter_ids: [chapterId],
      difficulty: "mixed",
      count: 15,
      duration_minutes: 15,
    };

    const response = await ExamAPI.start(payload);
    localStorage.setItem("currentTestId", response.test_id);
    localStorage.setItem("currentTestData", JSON.stringify(response));
    window.location.href = "exam.html";
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to start", "error");
  }
}

async function practiceAll() {
  const chapters = weakData.weakest_chapters || [];
  if (chapters.length === 0) { showToast("No weak chapters", "error"); return; }

  // Find subject for first chapter
  const chapterIds = chapters.map((c) => c.chapter_id);

  try {
    const subjects = await PublicAPI.listSubjects();
    let foundSubjectId = null;

    for (const s of subjects) {
      try {
        const full = await PublicAPI.getSubject(s.id);
        for (const sec of full.sections || []) {
          for (const ch of sec.chapters || []) {
            if (chapterIds.includes(ch.id)) {
              foundSubjectId = s.id;
              break;
            }
          }
          if (foundSubjectId) break;
        }
        if (foundSubjectId) break;
      } catch (e) {
        continue;
      }
    }

    if (!foundSubjectId) {
      showToast("Could not find subjects", "error");
      return;
    }

    showToast("Starting practice...", "info", 1000);

    const payload = {
      exam_type: "chapter",
      subject_id: foundSubjectId,
      chapter_ids: chapterIds,
      difficulty: "mixed",
      count: 30,
      duration_minutes: 30,
    };

    const response = await ExamAPI.start(payload);
    localStorage.setItem("currentTestId", response.test_id);
    localStorage.setItem("currentTestData", JSON.stringify(response));
    setTimeout(() => (window.location.href = "exam.html"), 400);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to start", "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.practiceChapter = practiceChapter;
window.practiceAll = practiceAll;
