(function () {
  const session = getSession();
  if (!session) { window.location.href = "index.html"; return; }

  const mistakes = getMistakes();
  const main = document.getElementById("mistakesMain");

  if (mistakes.length === 0) {
    main.innerHTML = `
      <div class="info-card"><div class="empty-state">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">No mistakes yet! Take a test and wrong answers will appear here for review.</div>
      </div></div>`;
    return;
  }

  // Group by chapter
  const byChapter = {};
  mistakes.forEach((m) => {
    if (!byChapter[m.chapterId]) byChapter[m.chapterId] = [];
    byChapter[m.chapterId].push(m);
  });

  main.innerHTML = `
    <div class="stat-grid">
      <div class="stat-box danger"><div class="v">${mistakes.length}</div><div class="l">Total Mistakes</div></div>
      <div class="stat-box"><div class="v">${Object.keys(byChapter).length}</div><div class="l">Chapters Affected</div></div>
    </div>
    <div class="action-row">
      <button class="btn btn-primary" onclick="practiceAllMistakes()">Practice All Mistakes</button>
    </div>
    <div class="chips" id="chapterChips"></div>
    <div id="mistakesList"></div>
  `;

  // Chips
  const chipsEl = document.getElementById("chapterChips");
  const allChip = `<button class="chip active" data-ch="all" onclick="filterMistakes(this,'all')">All (${mistakes.length})</button>`;
  chipsEl.innerHTML = allChip + Object.entries(byChapter).map(([chId, list]) =>
    `<button class="chip" data-ch="${chId}" onclick="filterMistakes(this,'${chId}')">${getChapterName(parseInt(chId))} (${list.length})</button>`
  ).join("");

  renderMistakes(mistakes);
})();

function renderMistakes(list) {
  const el = document.getElementById("mistakesList");
  if (list.length === 0) {
    el.innerHTML = `<div class="info-card"><div class="empty-text" style="text-align:center;padding:20px">No mistakes in this chapter.</div></div>`;
    return;
  }
  el.innerHTML = list.map((m) => `
    <div class="mistake-card">
      <div class="mistake-q">${m.questionText}</div>
      <div class="mistake-answers">
        <span class="wrong">Your answer: ${m.lastWrongAnswer}</span>
        <span class="right">Correct: ${m.correctAnswer}</span>
      </div>
      <div class="mistake-explanation">${m.explanation || "No explanation available."}</div>
      <div class="mistake-meta">
        <span>📚 ${getChapterName(m.chapterId)}</span>
        <span>🎯 ${m.topic}</span>
        <span>❌ Wrong ${m.timesWrong}x</span>
        ${m.resolved ? `<span class="badge badge-success" style="font-size:10px">Resolved</span>` : ""}
      </div>
    </div>
  `).join("");
}

function filterMistakes(btn, chapterId) {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  const all = getMistakes();
  const filtered = chapterId === "all" ? all : all.filter((m) => m.chapterId === parseInt(chapterId));
  renderMistakes(filtered);
}

function practiceAllMistakes() {
  alert("Mistake practice mode — Phase 9 mein banega (weakness practice)");
}