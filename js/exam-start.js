// ============================================================
// EXAM START — Full Page Flow
// ============================================================

(function () {
  const session = getSession();
  if (!session || session.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  const state = {
    examType: null,
    subjectId: null,
    chapterId: null,
    difficulty: "mixed",
    count: 45,
  };

  const examTypes = [
    { id: "full", icon: "📝", title: "Full MCQ Test", sub: "All chapters, mixed", bg: "#EEF2FF" },
    { id: "chapter", icon: "📖", title: "Chapter Test", sub: "Pick a chapter", bg: "#CCFBF1" },
    { id: "ai", icon: "🤖", title: "AI Generated", sub: "Fresh questions", bg: "#F3E8FF", disabled: true },
    { id: "hots", icon: "💡", title: "HOTS", sub: "Higher order thinking", bg: "#FEF3C7", disabled: true },
    { id: "theory", icon: "📚", title: "Theory Test", sub: "Long answers", bg: "#EEF2F7", disabled: true },
  ];

  const typeGrid = document.getElementById("examTypeGrid");
  examTypes.forEach((t) => {
    const card = document.createElement("button");
    card.className = "exam-type-card";
    card.dataset.type = t.id;
    card.onclick = () => {
      if (t.disabled) {
        alert(`${t.title} — coming soon in future phase!`);
        return;
      }
      selectExamType(t.id);
    };
    card.innerHTML = `
      <div class="exam-type-icon" style="background:${t.bg}">${t.icon}</div>
      <div class="exam-type-title">${t.title}</div>
      <div class="exam-type-sub">${t.sub}</div>
    `;
    typeGrid.appendChild(card);
  });

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

  function selectExamType(type) {
    state.examType = type;
    document.querySelectorAll(".exam-type-card").forEach((c) => {
      c.classList.toggle("selected", c.dataset.type === type);
    });

    if (type === "full" || type === "chapter") {
      updateStepper(2);
      showSubjectSection();
    } else {
      updateStepper(3);
      document.getElementById("section3").style.display = "block";
      document.getElementById("countBlock").style.display = "block";
    }
    updateFooter();
  }

  function showSubjectSection() {
    const section = document.getElementById("section2");
    section.style.display = "block";

    const grid = document.getElementById("subjectGrid");
    grid.innerHTML = "";
    MOCK.subjects.forEach((s) => {
      const totalQ = MOCK.questions.filter((q) => q.subject_id === s.id).length;
      const icon = s.name === "Science" ? "🔬" : s.name === "Mathematics" ? "📐" : "📚";
      const btn = document.createElement("button");
      btn.className = "subject-card";
      btn.dataset.subject = s.id;
      btn.onclick = () => selectSubject(s.id);
      btn.innerHTML = `
        <div class="subject-icon">${icon}</div>
        <div class="subject-name">${s.name}</div>
        <div class="subject-meta">${totalQ} questions</div>
      `;
      grid.appendChild(btn);
    });
  }

  function selectSubject(subjectId) {
    state.subjectId = subjectId;
    document.querySelectorAll(".subject-card").forEach((c) => {
      c.classList.toggle("selected", parseInt(c.dataset.subject) === subjectId);
    });
    updateStepper(3);
    showDetailsSection();
    updateFooter();
  }

  function showDetailsSection() {
    const section = document.getElementById("section3");
    section.style.display = "block";

    // Chapter block — only for chapter test
    if (state.examType === "chapter") {
      document.getElementById("chapterBlock").style.display = "block";
      renderChapterList();
    } else {
      document.getElementById("chapterBlock").style.display = "none";
    }

    // Count block — ALWAYS show (fix)
    document.getElementById("countBlock").style.display = "block";
  }

  window.toggleChapterList = function () {
    const list = document.getElementById("chapterList");
    const trigger = document.getElementById("chapterTrigger");
    const isOpen = list.classList.contains("open");
    list.classList.toggle("open", !isOpen);
    trigger.classList.toggle("open", !isOpen);
  };

  function renderChapterList() {
    const list = document.getElementById("chapterList");
    const subject = MOCK.subjects.find((s) => s.id === state.subjectId);
    if (!subject) return;

    list.innerHTML = "";
    subject.sections.forEach((sec) => {
      const label = document.createElement("div");
      label.className = "chapter-group-label";
      label.textContent = sec.name;
      list.appendChild(label);

      sec.chapters.forEach((c) => {
        const qCount = MOCK.questions.filter((q) => q.chapter_id === c.id).length;
        const item = document.createElement("button");
        item.className = "chapter-item";
        item.dataset.chapter = c.id;
        if (qCount === 0) item.disabled = true;
        item.onclick = () => selectChapter(c.id, c.name, qCount);
        item.innerHTML = `
          <span>${c.name}</span>
          <span class="chapter-item-count">${qCount}Q</span>
        `;
        list.appendChild(item);
      });
    });
  }

  function selectChapter(chapterId, chapterName, qCount) {
    if (qCount === 0) return;
    state.chapterId = chapterId;

    const trigger = document.getElementById("chapterTrigger");
    document.getElementById("chapterTriggerText").textContent = chapterName;
    trigger.classList.remove("placeholder");

    document.querySelectorAll(".chapter-item").forEach((c) => {
      c.classList.toggle("selected", parseInt(c.dataset.chapter) === chapterId);
    });

    window.toggleChapterList();
    updateFooter();
  }

  document.addEventListener("click", (e) => {
    const selector = document.getElementById("chapterSelector");
    const list = document.getElementById("chapterList");
    if (selector && list && list.classList.contains("open") && !selector.contains(e.target)) {
      list.classList.remove("open");
      document.getElementById("chapterTrigger").classList.remove("open");
    }
  });

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

  function updateFooter() {
    const footer = document.getElementById("footerCta");
    if (!state.examType) {
      footer.style.display = "none";
      return;
    }
    footer.style.display = "flex";
    const duration = state.count;
    document.getElementById("footerInfo").textContent =
      `${state.count} Q • ${duration} min • ${capitalize(state.difficulty)}`;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function highlightSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.classList.add("section-highlight");
    setTimeout(() => section.classList.remove("section-highlight"), 1600);
  }

  window.beginExam = function () {
    if (!state.examType) {
      highlightSection("section1");
      return;
    }
    if ((state.examType === "full" || state.examType === "chapter") && !state.subjectId) {
      highlightSection("section2");
      return;
    }
    if (state.examType === "chapter" && !state.chapterId) {
      highlightSection("chapterBlock");
      return;
    }

    const params = new URLSearchParams({
      type: state.examType,
      subject: state.subjectId || 1,
      difficulty: state.difficulty,
      count: state.count,
      duration: state.count,
    });
    if (state.chapterId) params.set("chapter", state.chapterId);

    window.location.href = `exam.html?${params.toString()}`;
  };

  updateStepper(1);
})();