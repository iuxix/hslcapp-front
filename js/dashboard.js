// ============================================================
// DASHBOARD — Real API
// ============================================================

(function () {
  if (!requireLogin()) return;

  const session = API.getUser();
  if (!session) { window.location.href = "index.html"; return; }

  document.getElementById("greetingName").textContent =
    `Hi, ${session.full_name || session.username} 👋`;
  document.getElementById("userAvatar").textContent =
    (session.full_name || session.username).charAt(0).toUpperCase();

  loadDashboard();
})();

async function loadDashboard() {
  try {
    const [stats, history] = await Promise.all([
      StudentAPI.getDashboard(),
      StudentAPI.getHistory(3),
    ]);

    renderStats(stats);
    renderRecentTests(history);
    renderWeakChapters(stats.weak_chapters || []);
  } catch (error) {
    console.error("Dashboard error:", error);
    showToast(error.message || "Failed to load dashboard", "error");
    document.getElementById("statTests").textContent = "—";
    document.getElementById("statAccuracy").textContent = "—";
    document.getElementById("statAvg").textContent = "—";
  }
}

function renderStats(stats) {
  const statTestsEl = document.getElementById("statTests");
  animateValue(statTestsEl, 0, stats.total_tests || 0, 600);

  document.getElementById("statAccuracy").textContent =
    stats.total_tests > 0 ? `${Math.round(stats.average_accuracy)}%` : "--";
  document.getElementById("statAvg").textContent =
    stats.total_tests > 0 ? `${Math.round(stats.avg_time_per_question)}s` : "--";
}

function animateValue(el, start, end, duration) {
  if (start === end) { el.textContent = end; return; }
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    el.textContent = Math.floor(start + range * progress);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderRecentTests(history) {
  const recentEl = document.getElementById("recentTests");
  const attempts = history.attempts || [];

  if (attempts.length === 0) {
    recentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">No tests yet.<br>Start your first exam!</div>
      </div>`;
    return;
  }

  recentEl.innerHTML = attempts.map((t) => {
    const cls = t.percentage >= 70 ? "score-good" : t.percentage >= 40 ? "score-mid" : "score-bad";
    return `
      <div class="history-item" onclick="viewResult(${t.test_id})">
        <div class="history-item-left">
          <div class="history-item-title">${escapeHtml(t.test_title)}</div>
          <div class="history-item-meta">${t.correct_count}/${t.total_marks} correct · ${formatTime(t.total_time_seconds)}</div>
        </div>
        <div class="history-item-score ${cls}">${t.percentage}%</div>
      </div>
    `;
  }).join("");
}

function renderWeakChapters(weakChapters) {
  const weakEl = document.getElementById("weakChapters");

  if (!weakChapters || weakChapters.length === 0) {
    weakEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <div class="empty-text">Take a few tests to see your weak areas.</div>
      </div>`;
    return;
  }

  weakEl.innerHTML = weakChapters.map((c) => {
    const cls = c.accuracy >= 70 ? "success" : c.accuracy >= 40 ? "warning" : "danger";
    return `
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">${escapeHtml(c.chapter_name)}</div>
          <span class="badge badge-${cls}">${Math.round(c.accuracy)}%</span>
        </div>
        <div class="info-row" style="margin-top:4px">
          <span class="info-label" style="font-size:12px;color:var(--color-text-muted)">
            ${c.correct}/${c.total_attempted} correct
          </span>
        </div>
      </div>
    `;
  }).join("");
}

function viewResult(testId) {
  window.location.href = `results.html?test_id=${testId}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function startExam() {
  window.location.href = "exam-start.html";
}

function goTo(page) {
  window.location.href = page;
}

window.startExam = startExam;
window.goTo = goTo;
window.viewResult = viewResult;
