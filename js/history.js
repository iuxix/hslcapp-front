(function () {
  const session = getSession();
  if (!session) { window.location.href = "index.html"; return; }

  const attempts = getAttempts().filter((a) => a.userId === session.id);
  const main = document.getElementById("historyMain");

  if (attempts.length === 0) {
    main.innerHTML = `
      <div class="info-card"><div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">No tests yet. Start your first test!</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="window.location.href='dashboard.html'">Take a Test</button>
      </div></div>`;
    return;
  }

  const totalTests = attempts.length;
  const avgPct = (attempts.reduce((s, a) => s + a.percentage, 0) / totalTests).toFixed(1);
  const bestPct = Math.max(...attempts.map((a) => a.percentage)).toFixed(0);
  const avgTime = (attempts.reduce((s, a) => s + parseFloat(a.avgTimeSec), 0) / totalTests).toFixed(1);

  main.innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><div class="v">${totalTests}</div><div class="l">Tests Taken</div></div>
      <div class="stat-box success"><div class="v">${avgPct}%</div><div class="l">Average</div></div>
      <div class="stat-box"><div class="v">${bestPct}%</div><div class="l">Best Score</div></div>
      <div class="stat-box"><div class="v">${avgTime}s</div><div class="l">Avg per Q</div></div>
    </div>
    <section class="section">
      <h3 class="section-title">📈 Score Progression</h3>
      <div class="info-card" id="progressChart"></div>
    </section>
    <section class="section">
      <h3 class="section-title">🕐 All Tests</h3>
      <div id="historyList"></div>
    </section>
  `;

  // Simple bar chart
  const chart = document.getElementById("progressChart");
  const maxPct = 100;
  chart.innerHTML = attempts.slice(0, 10).reverse().map((a) => {
    const h = (a.percentage / maxPct) * 80;
    return `
      <div style="display:flex;align-items:flex-end;gap:6px;height:100px;margin-top:8px">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center">
          <div style="font-size:10px;color:var(--color-text-muted)">${a.percentage}%</div>
          <div style="background:var(--color-primary);width:100%;height:${h}px;border-radius:4px 4px 0 0"></div>
        </div>
      </div>`;
  }).join("");

  // List
  const list = document.getElementById("historyList");
  attempts.forEach((a) => {
    const pass = a.percentage >= 33;
    const date = new Date(a.submittedAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    const item = document.createElement("div");
    item.className = "history-item";
    item.onclick = () => window.location.href = "results.html?id=" + a.id;
    item.innerHTML = `
      <div class="history-item-top">
        <div class="history-item-title">${a.testTitle}</div>
        <span class="badge badge-${pass ? "success" : "danger"}">${a.percentage}%</span>
      </div>
      <div class="history-item-meta">
        <span>${a.correct}/${a.totalQuestions} correct</span>
        <span>${a.avgTimeSec}s per Q</span>
        <span>${date}</span>
      </div>`;
    list.appendChild(item);
  });
})();