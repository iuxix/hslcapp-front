// ============================================================
// HISTORY — Pagination Support
// ============================================================

let historyState = {
  allAttempts: [],
  currentPage: 0,
  pageSize: 20,
  hasMore: false,
  totalTests: 0,
};

(async function () {
  if (!requireLogin()) return;
  loadHistoryPage(0);
})();

async function loadHistoryPage(skip) {
  const main = document.getElementById("historyMain");

  if (skip === 0) {
    main.innerHTML = `
      <div class="admin-loading">
        <div class="admin-spinner"></div>
        <div class="admin-loading-text">Loading history...</div>
      </div>`;
  }

  try {
    const history = await StudentAPI.getHistory(historyState.pageSize, skip);

    historyState.totalTests = history.total_tests;
    historyState.hasMore = history.has_more;

    if (skip === 0) {
      historyState.allAttempts = history.attempts || [];
      renderFullPage(history);
    } else {
      historyState.allAttempts = historyState.allAttempts.concat(history.attempts || []);
      appendAttempts(history.attempts || []);
      updateLoadMoreButton();
    }
  } catch (e) {
    console.error(e);
    if (skip === 0) {
      main.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">❌</div>
          <div class="admin-empty-title">Failed to load</div>
          <div class="admin-empty-text">${escapeHtml(e.message)}</div>
        </div>`;
    }
  }
}

function renderFullPage(h) {
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

  main.innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-box"><div class="v">${h.total_tests}</div><div class="l">Tests Taken</div></div>
      <div class="stat-box success"><div class="v">${h.average_percentage}%</div><div class="l">Average</div></div>
      <div class="stat-box"><div class="v">${h.best_percentage}%</div><div class="l">Best Score</div></div>
      <div class="stat-box"><div class="v">${h.average_time_per_question}s</div><div class="l">Avg / Q</div></div>
    </div>

    <section class="section">
      <h3 class="section-title">📈 Recent Performance</h3>
      <div class="info-card" id="progressChart">
        ${renderMiniChart(h.attempts.slice(0, 10))}
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">🕐 All Tests (${h.total_tests})</h3>
      <div id="historyList">
        ${h.attempts.map((a) => renderHistoryItem(a)).join("")}
      </div>
      <div id="loadMoreWrap"></div>
    </section>
  `;

  updateLoadMoreButton();
}

function appendAttempts(attempts) {
  const list = document.getElementById("historyList");
  if (!list) return;
  attempts.forEach((a) => {
    const div = document.createElement("div");
    div.innerHTML = renderHistoryItem(a);
    list.appendChild(div.firstElementChild);
  });
}

function updateLoadMoreButton() {
  const wrap = document.getElementById("loadMoreWrap");
  if (!wrap) return;

  if (historyState.hasMore) {
    wrap.innerHTML = `
      <button class="btn btn-outline btn-block" style="margin-top:12px" onclick="loadMoreHistory()">
        Load More (${historyState.allAttempts.length}/${historyState.totalTests})
      </button>`;
  } else {
    wrap.innerHTML = `
      <div style="text-align:center;padding:12px;font-size:12px;color:var(--color-text-muted);font-weight:600">
        — All ${historyState.totalTests} tests loaded —
      </div>`;
  }
}

window.loadMoreHistory = function () {
  historyState.currentPage++;
  loadHistoryPage(historyState.currentPage * historyState.pageSize);
};

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
  const sorted = [...attempts].reverse();

  return `
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding:8px 0">
      ${sorted.map((a) => {
        const h = Math.max(4, (a.percentage / 100) * 70);
        const color = a.percentage >= 70 ? "#10B981" : a.percentage >= 40 ? "#F59E0B" : "#F43F5E";
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="font-size:9px;font-weight:700;color:var(--color-text-muted)">${a.percentage}%</div>
            <div style="background:${color};width:100%;height:${h}px;border-radius:4px 4px 0 0"></div>
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
