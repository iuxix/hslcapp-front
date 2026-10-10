// ============================================================
// HISTORY — Real API
// ============================================================

(async function () {
  if (!requireLogin()) return;

  try {
    const history = await StudentAPI.getHistory(100);
    renderHistory(history);
  } catch (e) {
    console.error(e);
    document.getElementById("historyMain").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(e.message)}</div>
      </div>`;
  }
})();

function renderHistory(h) {
  const main = document.getElementById("historyMain");

  if (!h.attempts || h.attempts.length === 0) {
    main.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">📜</div>
        <div class="admin-empty-title">No tests yet</div>
        <div class="admin-empty-text">Start your first exam to see history here</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='exam-start.html'">Start Exam</button>
      </div>`;
    return;
  }

  // Stats row
  const totalTests = h.total_tests || 0;
  const avgPct = h.average_percentage || 0;
  const bestPct = h.best_percentage || 0;
  const avgTime = h.average_time_per_question || 0;

  main.innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-box"><div class="v">${totalTests}</div><div class="l">Tests Taken</div></div>
      <div class="stat-box success"><div class="v">${avgPct}%</div><div class="l">Average</div></div>
      <div class="stat-box"><div class="v">${bestPct}%</div><div class="l">Best Score</div></div>
      <div class="stat-box"><div class="v">${avgTime}s</div><div class="l">Avg / Q</div></div>
    </div>

    <section class="section">
      <h3 class="section-title">📈 Recent Performance</h3>
      <div class="info-card" id="progressChart">
        ${renderMiniChart(h.attempts.slice(0, 10))}
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">🕐 All Tests (${totalTests})</h3>
      <div id="historyList">
        ${h.attempts.map((a) => renderHistoryItem(a)).join("")}
      </div>
    </section>
  `;
}

function renderHistoryItem(a) {
  const cls = a.percentage >= 70 ? "score-good" : a.percentage >= 40 ? "score-mid" : "score-bad";
  const date = new Date(a.submitted_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div class="history-item" onclick="viewResult(${a.test_id})">
      <div class="history-item-left">
        <div class="history-item-title">${escapeHtml(a.test_title)}</div>
        <div class="history-item-meta">
          ${a.correct_count}/${a.total_marks} correct · ${formatTime(a.total_time_seconds)} · ${date}
        </div>
      </div>
      <div class="history-item-score ${cls}">${a.percentage}%</div>
    </div>
  `;
}

function renderMiniChart(attempts) {
  if (attempts.length === 0) return "";

  // Reverse — oldest first for chart
  const sorted = [...attempts].reverse();

  return `
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding:8px 0">
      ${sorted.map((a) => {
        const h = Math.max(4, (a.percentage / 100) * 70);
        const color = a.percentage >= 70 ? "#10B981" : a.percentage >= 40 ? "#F59E0B" : "#F43F5E";
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" title="${a.percentage}%">
            <div style="font-size:9px;font-weight:700;color:var(--color-text-muted)">${a.percentage}%</div>
            <div style="background:${color};width:100%;height:${h}px;border-radius:4px 4px 0 0;transition:height 400ms ease"></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function viewResult(testId) {
  window.location.href = `results.html?test_id=${testId}`;
}

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

window.viewResult = viewResult;
