// ============================================================
// ANALYSE — Real API
// ============================================================

(async function () {
  if (!requireLogin()) return;

  try {
    const [dashboard, weakAreas, progress, leaderboard] = await Promise.all([
      StudentAPI.getDashboard(),
      StudentAPI.getWeakAreas(),
      StudentAPI.getProgress(20),
      StudentAPI.getLeaderboard(10),
    ]);

    renderAnalyse(dashboard, weakAreas, progress, leaderboard);
  } catch (e) {
    console.error(e);
    document.getElementById("analyseMain").innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(e.message)}</div>
      </div>`;
  }
})();

function renderAnalyse(d, weak, prog, lb) {
  const main = document.getElementById("analyseMain");

  main.innerHTML = `
    <!-- OVERALL STATS -->
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-box"><div class="v">${d.total_tests}</div><div class="l">Tests</div></div>
      <div class="stat-box success"><div class="v">${Math.round(d.average_accuracy)}%</div><div class="l">Accuracy</div></div>
      <div class="stat-box"><div class="v">${Math.round(d.best_score)}%</div><div class="l">Best</div></div>
      <div class="stat-box"><div class="v">${d.streak_days}🔥</div><div class="l">Streak</div></div>
    </div>

    ${renderProgress(prog)}

    ${renderWeakAreas(weak)}

    ${renderLeaderboard(lb)}

    <!-- OVERALL BREAKDOWN -->
    <section class="section">
      <h3 class="section-title">📊 Overall Breakdown</h3>
      <div class="info-card">
        <div class="analysis-row">
          <span class="name">Total Questions</span>
          <span class="pct">${d.total_questions_attempted}</span>
        </div>
        <div class="analysis-row">
          <span class="name" style="color:var(--color-success)">✓ Correct</span>
          <span class="pct good">${d.total_correct}</span>
        </div>
        <div class="analysis-row">
          <span class="name" style="color:var(--color-danger)">✗ Wrong</span>
          <span class="pct bad">${d.total_wrong}</span>
        </div>
        <div class="analysis-row">
          <span class="name" style="color:var(--color-text-muted)">⬜ Skipped</span>
          <span class="pct">${d.total_unanswered}</span>
        </div>
        <div class="analysis-row">
          <span class="name">⏱️ Total Time Spent</span>
          <span class="pct">${d.total_time_spent_minutes} min</span>
        </div>
        <div class="analysis-row">
          <span class="name">⚡ Avg per Question</span>
          <span class="pct">${d.avg_time_per_question}s</span>
        </div>
      </div>
    </section>
  `;
}

function renderProgress(prog) {
  if (!prog.points || prog.points.length === 0) return "";

  const trendClass = prog.trend === "improving" ? "success" : prog.trend === "declining" ? "danger" : "warning";
  const trendIcon = prog.trend === "improving" ? "📈" : prog.trend === "declining" ? "📉" : "➡️";
  const trendText = prog.trend === "improving" ? "Improving" : prog.trend === "declining" ? "Declining" : "Stable";

  // Mini chart
  const maxPct = 100;
  const sorted = prog.points.slice(-10);

  return `
    <section class="section">
      <h3 class="section-title">📈 Progress Trend</h3>
      <div class="info-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:13px;font-weight:700;color:var(--color-text)">Last ${sorted.length} tests</span>
          <span class="badge badge-${trendClass}">${trendIcon} ${trendText}</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding-top:8px">
          ${sorted.map((p) => {
            const h = Math.max(4, (p.percentage / maxPct) * 80);
            const color = p.percentage >= 70 ? "#10B981" : p.percentage >= 40 ? "#F59E0B" : "#F43F5E";
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="font-size:9px;font-weight:700;color:var(--color-text-muted)">${Math.round(p.percentage)}%</div>
                <div style="background:${color};width:100%;height:${h}px;border-radius:4px 4px 0 0"></div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderWeakAreas(weak) {
  if (!weak.weakest_chapters || weak.weakest_chapters.length === 0) return "";

  return `
    <section class="section">
      <h3 class="section-title">🎯 Weak Chapters</h3>
      <div class="info-card">
        ${weak.weakest_chapters.map((c) => {
          const cls = c.accuracy >= 70 ? "good" : c.accuracy >= 40 ? "mid" : "bad";
          return `
            <div class="analysis-row">
              <div class="analysis-row-left">
                <div class="name">${escapeHtml(c.chapter_name)}</div>
                <div class="sub">${c.correct}/${c.total_attempted} correct</div>
                <div class="bar-track">
                  <div class="bar-fill ${cls}" style="width:${c.accuracy}%"></div>
                </div>
              </div>
              <div class="pct ${cls}">${Math.round(c.accuracy)}%</div>
            </div>
          `;
        }).join("")}
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">💪 Strong Chapters</h3>
      <div class="info-card">
        ${weak.strongest_chapters.map((c) => {
          const cls = c.accuracy >= 70 ? "good" : c.accuracy >= 40 ? "mid" : "bad";
          return `
            <div class="analysis-row">
              <div class="analysis-row-left">
                <div class="name">${escapeHtml(c.chapter_name)}</div>
                <div class="sub">${c.correct}/${c.total_attempted} correct</div>
                <div class="bar-track">
                  <div class="bar-fill ${cls}" style="width:${c.accuracy}%"></div>
                </div>
              </div>
              <div class="pct ${cls}">${Math.round(c.accuracy)}%</div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderLeaderboard(lb) {
  if (!lb.entries || lb.entries.length === 0) return "";

  return `
    <section class="section">
      <h3 class="section-title">🏆 Leaderboard</h3>
      <div class="info-card">
        ${lb.entries.map((e) => {
          const isYou = lb.user_rank && e.rank === lb.user_rank;
          const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`;
          return `
            <div class="analysis-row" style="${isYou ? "background:var(--color-primary-bg);border-radius:8px;padding:8px" : ""}">
              <div class="analysis-row-left">
                <div class="name">${medal} ${escapeHtml(e.full_name || e.username)} ${isYou ? "(You)" : ""}</div>
                <div class="sub">${e.total_tests} tests · ${e.best_percentage}% best</div>
              </div>
              <div class="pct good">${Math.round(e.average_percentage)}%</div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
