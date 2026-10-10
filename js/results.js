// ============================================================
// RESULTS — Real API + Detailed Analysis
// ============================================================

(async function () {
  if (!requireLogin()) return;

  const params = new URLSearchParams(window.location.search);
  const testId = parseInt(params.get("test_id")) || parseInt(localStorage.getItem("lastTestId"));

  if (!testId) {
    document.getElementById("resultMain").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">😕</div>
        <div class="admin-empty-title">No result found</div>
        <div class="admin-empty-text">Go back and take a test</div>
      </div>`;
    return;
  }

  let result;
  try {
    result = await ExamAPI.getResult(testId);
  } catch (e) {
    console.error(e);
    document.getElementById("resultMain").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(e.message)}</div>
      </div>`;
    return;
  }

  renderResult(result);
})();

// ============================================================
// RENDER
// ============================================================

function renderResult(r) {
  const main = document.getElementById("resultMain");
  const pass = r.percentage >= 70;
  const mid = r.percentage >= 40 && r.percentage < 70;

  // ========== CHAPTER STATS ==========
  const chapterStats = {};
  r.questions.forEach((q) => {
    if (!chapterStats[q.chapter_id]) {
      chapterStats[q.chapter_id] = { correct: 0, total: 0, totalTime: 0 };
    }
    chapterStats[q.chapter_id].total++;
    chapterStats[q.chapter_id].totalTime += q.time_spent_seconds || 0;
    if (q.is_correct) chapterStats[q.chapter_id].correct++;
  });

  // ========== DIFFICULTY STATS ==========
  const diffStats = { easy: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
  r.questions.forEach((q) => {
    const d = q.difficulty || "easy";
    if (diffStats[d]) {
      diffStats[d].total++;
      if (q.is_correct) diffStats[d].correct++;
    }
  });

  // ========== TIME STATS ==========
  const times = r.questions.map((q) => q.time_spent_seconds || 0).filter((t) => t > 0);
  const avgTime = times.length > 0 ? (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const slowestQ = r.questions.find((q) => (q.time_spent_seconds || 0) === maxTime);

  // ========== CLASSIFY ==========
  const avgNum = parseFloat(avgTime);
  const classifications = { fastCorrect: 0, slowCorrect: 0, fastWrong: 0, slowWrong: 0, skipped: 0 };
  r.questions.forEach((q) => {
    if (!q.selected_option) { classifications.skipped++; return; }
    const fast = (q.time_spent_seconds || 0) <= avgNum;
    if (q.is_correct && fast) classifications.fastCorrect++;
    else if (q.is_correct && !fast) classifications.slowCorrect++;
    else if (!q.is_correct && fast) classifications.fastWrong++;
    else classifications.slowWrong++;
  });

  // ========== RENDER ==========
  main.innerHTML = `
    <div class="score-card ${pass ? "pass" : mid ? "mid" : "fail"}">
      <div class="score-big">${r.percentage}%</div>
      <div class="score-label">${pass ? "Excellent" : mid ? "Good Try" : "Keep Practicing"}</div>
      <div class="score-sub">${r.correct_count} out of ${r.total_marks} correct</div>
    </div>

    <div class="stat-grid">
      <div class="stat-box success"><div class="v">${r.correct_count}</div><div class="l">Correct</div></div>
      <div class="stat-box danger"><div class="v">${r.wrong_count}</div><div class="l">Wrong</div></div>
      <div class="stat-box warning"><div class="v">${r.unanswered_count}</div><div class="l">Skipped</div></div>
      <div class="stat-box"><div class="v">${formatTime(r.total_time_seconds)}</div><div class="l">Total Time</div></div>
    </div>

    <section class="section">
      <h3 class="section-title">⏱️ Time Analysis</h3>
      <div class="time-grid">
        <div class="time-card success">
          <div class="time-value">${minTime}s</div>
          <div class="time-label">Fastest</div>
        </div>
        <div class="time-card accent">
          <div class="time-value">${avgTime}s</div>
          <div class="time-label">Average</div>
        </div>
        <div class="time-card danger">
          <div class="time-value">${maxTime}s</div>
          <div class="time-label">Longest</div>
        </div>
        <div class="time-card">
          <div class="time-value">${r.avg_time_per_question.toFixed(1)}s</div>
          <div class="time-label">Per Question</div>
        </div>
      </div>
      ${slowestQ ? `
        <div class="time-card danger" style="margin-top:12px">
          <div class="time-label" style="margin-bottom:8px">⚠️ Longest question</div>
          <div style="font-size:13px;color:var(--color-text);line-height:1.5;font-weight:500">
            ${escapeHtml(slowestQ.question_text)}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:6px;font-weight:600">
            Took ${slowestQ.time_spent_seconds}s ${slowestQ.is_correct ? "· Correct ✓" : "· Wrong ✗"}
          </div>
        </div>` : ""}
    </section>

    <section class="section">
      <h3 class="section-title">📊 Chapter-wise Performance</h3>
      <div class="analysis-card">
        ${Object.entries(chapterStats).map(([chId, c]) => {
          const pct = Math.round((c.correct / c.total) * 100);
          const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
          const avgChTime = (c.totalTime / c.total).toFixed(1);
          return `
            <div class="analysis-row">
              <div class="analysis-row-left">
                <div class="name">Chapter ${chId}</div>
                <div class="sub">${c.correct}/${c.total} correct · ${avgChTime}s avg</div>
                <div class="bar-track">
                  <div class="bar-fill ${cls}" style="width:${pct}%"></div>
                </div>
              </div>
              <div class="pct ${cls}">${pct}%</div>
            </div>`;
        }).join("")}
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">🎚️ Difficulty Performance</h3>
      <div class="analysis-card">
        ${Object.entries(diffStats).map(([d, s]) => {
          if (s.total === 0) return "";
          const pct = Math.round((s.correct / s.total) * 100);
          const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
          return `
            <div class="analysis-row">
              <div class="analysis-row-left">
                <div class="name" style="text-transform:capitalize">${d} Questions</div>
                <div class="sub">${s.correct}/${s.total} correct</div>
                <div class="bar-track">
                  <div class="bar-fill ${cls}" style="width:${pct}%"></div>
                </div>
              </div>
              <div class="pct ${cls}">${pct}%</div>
            </div>`;
        }).join("")}
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">⚡ Speed & Accuracy</h3>
      <div class="speed-list">
        <div class="speed-item">
          <span class="speed-label">⚡ Fast + Correct</span>
          <span class="speed-value good">${classifications.fastCorrect}</span>
        </div>
        <div class="speed-item">
          <span class="speed-label">🐢 Slow + Correct</span>
          <span class="speed-value muted">${classifications.slowCorrect}</span>
        </div>
        <div class="speed-item">
          <span class="speed-label">⚠️ Fast + Wrong (careless)</span>
          <span class="speed-value warn">${classifications.fastWrong}</span>
        </div>
        <div class="speed-item">
          <span class="speed-label">🐌 Slow + Wrong</span>
          <span class="speed-value bad">${classifications.slowWrong}</span>
        </div>
        <div class="speed-item">
          <span class="speed-label">⬜ Skipped</span>
          <span class="speed-value muted">${classifications.skipped}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">📝 Question Review</h3>
      <div id="qReview"></div>
    </section>

    <div class="action-row">
      <button class="btn btn-outline" onclick="window.location.href='history.html'">View History</button>
      <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Back Home</button>
    </div>
  `;

  // ========== QUESTION REVIEW ==========
  const review = document.getElementById("qReview");
  r.questions.forEach((q, i) => {
    const status = !q.selected_option ? "skipped" : q.is_correct ? "correct" : "wrong";
    const statusText = status === "correct" ? "✓ Correct" : status === "wrong" ? "✗ Wrong" : "— Skipped";
    const slow = (q.time_spent_seconds || 0) > avgNum * 1.5;

    const card = document.createElement("div");
    card.className = `review-card ${status}`;
    card.innerHTML = `
      <div class="review-header">
        <span class="review-status ${status}">${statusText}</span>
        <span class="review-time ${slow ? "slow" : ""}">${q.time_spent_seconds || 0}s ${slow ? "🐢" : ""}</span>
      </div>
      <div class="review-q">${i + 1}. ${escapeHtml(q.question_text)}</div>
      ${q.selected_option ? `<div class="review-answer">Your answer: <strong class="${q.is_correct ? "good" : "bad"}">${q.selected_option}</strong></div>` : ""}
      <div class="review-answer">Correct: <strong class="good">${q.correct_option}</strong></div>
      ${!q.is_correct && q.explanation ? `<div class="review-explanation">${escapeHtml(q.explanation)}</div>` : ""}
    `;
    review.appendChild(card);
  });
}

// ============================================================
// HELPERS
// ============================================================

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
