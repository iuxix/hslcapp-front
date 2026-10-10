// ============================================================
// RESULTS — Detailed analysis
// ============================================================

(function () {
  const session = getSession();
  if (!session) { window.location.href = "index.html"; return; }

  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("id");
  const attempts = getAttempts();
  const attempt = attempts.find((a) => a.id === attemptId);

  if (!attempt) {
    document.getElementById("resultMain").innerHTML =
      `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-text">Result not found</div></div>`;
    return;
  }

  const main = document.getElementById("resultMain");
  const pass = attempt.percentage >= 70;
  const mid = attempt.percentage >= 40 && attempt.percentage < 70;

  // ========== CHAPTER STATS ==========
  const chapterStats = {};
  attempt.answers.forEach((a) => {
    if (!chapterStats[a.chapterId]) {
      chapterStats[a.chapterId] = {
        correct: 0,
        total: 0,
        name: getChapterName(a.chapterId),
        totalTime: 0,
      };
    }
    chapterStats[a.chapterId].total++;
    chapterStats[a.chapterId].totalTime += a.timespent;
    if (a.isCorrect) chapterStats[a.chapterId].correct++;
  });

  // ========== DIFFICULTY STATS ==========
  const diffStats = { easy: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
  attempt.answers.forEach((a) => {
    if (diffStats[a.difficulty]) {
      diffStats[a.difficulty].total++;
      if (a.isCorrect) diffStats[a.difficulty].correct++;
    }
  });

  // ========== TIME ANALYSIS ==========
  const times = attempt.answers.map((a) => a.timespent).filter((t) => t > 0);
  const avgTime = times.length > 0 ? (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;

  const fastestQ = attempt.answers.find((a) => a.timespent === minTime && a.timespent > 0);
  const slowestQ = attempt.answers.find((a) => a.timespent === maxTime);

  // ========== CLASSIFY QUESTIONS ==========
  const classifications = { fastCorrect: 0, slowCorrect: 0, fastWrong: 0, slowWrong: 0, skipped: 0 };
  attempt.answers.forEach((a) => {
    if (!a.selected) { classifications.skipped++; return; }
    const fast = a.timespent <= parseFloat(avgTime);
    if (a.isCorrect && fast) classifications.fastCorrect++;
    else if (a.isCorrect && !fast) classifications.slowCorrect++;
    else if (!a.isCorrect && fast) classifications.fastWrong++;
    else classifications.slowWrong++;
  });

  // ========== RENDER ==========
  main.innerHTML = `
    <!-- SCORE CARD -->
    <div class="score-card ${pass ? "pass" : mid ? "mid" : "fail"}">
      <div class="score-big">${attempt.percentage}%</div>
      <div class="score-label">${pass ? "Excellent" : mid ? "Good Try" : "Keep Practicing"}</div>
      <div class="score-sub">${attempt.correct} out of ${attempt.totalQuestions} correct</div>
    </div>

    <!-- OVERALL STATS -->
    <div class="stat-grid">
      <div class="stat-box success"><div class="v">${attempt.correct}</div><div class="l">Correct</div></div>
      <div class="stat-box danger"><div class="v">${attempt.wrong}</div><div class="l">Wrong</div></div>
      <div class="stat-box warning"><div class="v">${attempt.unanswered}</div><div class="l">Skipped</div></div>
      <div class="stat-box"><div class="v">${formatTime(attempt.totalTimeSec)}</div><div class="l">Total Time</div></div>
    </div>

    <!-- TIME ANALYSIS -->
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
          <div class="time-value">${(attempt.totalTimeSec / attempt.totalQuestions).toFixed(1)}s</div>
          <div class="time-label">Per Question</div>
        </div>
      </div>
      ${slowestQ ? `
        <div class="time-card danger" style="margin-top:12px">
          <div class="time-label" style="margin-bottom:8px">⚠️ Longest question</div>
          <div style="font-size:13px;color:var(--color-text);line-height:1.5;font-weight:500">
            ${slowestQ.questionText}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:6px;font-weight:600">
            Took ${slowestQ.timespent}s ${slowestQ.isCorrect ? "· Correct ✓" : "· Wrong ✗"}
          </div>
        </div>` : ""}
    </section>

    <!-- CHAPTER-WISE ACCURACY -->
    <section class="section">
      <h3 class="section-title">📊 Chapter-wise Performance</h3>
      <div class="analysis-card">
        ${Object.values(chapterStats).map((c) => {
          const pct = Math.round((c.correct / c.total) * 100);
          const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
          const avgChTime = (c.totalTime / c.total).toFixed(1);
          return `
            <div class="analysis-row">
              <div class="analysis-row-left">
                <div class="name">${c.name}</div>
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

    <!-- DIFFICULTY PERFORMANCE -->
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

    <!-- SPEED CLASSIFICATION -->
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

    <!-- QUESTION REVIEW -->
    <section class="section">
      <h3 class="section-title">📝 Question Review</h3>
      <div id="qReview"></div>
    </section>

    <!-- ACTIONS -->
    <div class="action-row">
      <button class="btn btn-outline" onclick="window.location.href='history.html'">View History</button>
      <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Back Home</button>
    </div>
  `;

  // Question review
  const review = document.getElementById("qReview");
  attempt.answers.forEach((a, i) => {
    const status = !a.selected ? "skipped" : a.isCorrect ? "correct" : "wrong";
    const statusText = status === "correct" ? "✓ Correct" : status === "wrong" ? "✗ Wrong" : "— Skipped";
    const slow = a.timespent > parseFloat(avgTime) * 1.5;

    const card = document.createElement("div");
    card.className = `review-card ${status}`;
    card.innerHTML = `
      <div class="review-header">
        <span class="review-status ${status}">${statusText}</span>
        <span class="review-time ${slow ? "slow" : ""}">${a.timespent}s ${slow ? "🐢" : ""}</span>
      </div>
      <div class="review-q">${i + 1}. ${a.questionText}</div>
      ${a.selected ? `<div class="review-answer">Your answer: <strong class="${a.isCorrect ? "good" : "bad"}">${a.selected}</strong></div>` : ""}
      <div class="review-answer">Correct: <strong class="good">${a.correct}</strong></div>
      ${!a.isCorrect ? `<div class="review-explanation">${a.explanation}</div>` : ""}
    `;
    review.appendChild(card);
  });
})();

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}