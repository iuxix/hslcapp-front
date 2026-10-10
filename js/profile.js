(function () {
  const session = getSession();
  if (!session) { window.location.href = "index.html"; return; }

  const attempts = getAttempts().filter((a) => a.userId === session.id);
  const mistakes = getMistakes();
  const main = document.getElementById("profileMain");

  const totalTests = attempts.length;
  const avgPct = totalTests > 0 ? (attempts.reduce((s, a) => s + a.percentage, 0) / totalTests).toFixed(1) : "--";
  const bestPct = totalTests > 0 ? Math.max(...attempts.map((a) => a.percentage)) : "--";

  main.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${(session.full_name || session.username).charAt(0).toUpperCase()}</div>
      <div class="profile-name">${session.full_name || session.username}</div>
      <div class="profile-role">@${session.username} • Class 10</div>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><div class="v">${totalTests}</div><div class="l">Tests Taken</div></div>
      <div class="stat-box success"><div class="v">${avgPct}${avgPct !== "--" ? "%" : ""}</div><div class="l">Average Score</div></div>
      <div class="stat-box"><div class="v">${bestPct}${bestPct !== "--" ? "%" : ""}</div><div class="l">Best Score</div></div>
      <div class="stat-box danger"><div class="v">${mistakes.length}</div><div class="l">Mistakes</div></div>
    </div>
    <section class="section">
      <h3 class="section-title">⚙️ Account</h3>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Username</span><span class="info-value">${session.username}</span></div>
        <div class="info-row"><span class="info-label">Role</span><span class="info-value">${session.role}</span></div>
        <div class="info-row"><span class="info-label">Class</span><span class="info-value">10</span></div>
      </div>
    </section>
    <section class="section">
      <button class="btn btn-outline btn-block" onclick="clearMyData()" style="color:var(--color-danger);border-color:var(--color-danger)">Clear All My Data</button>
      <button class="btn btn-primary btn-block" onclick="logout()" style="margin-top:12px">Logout</button>
    </section>
  `;
})();

function clearMyData() {
  if (confirm("This will delete ALL your tests and mistakes. Are you sure?")) {
    localStorage.removeItem("seba_attempts");
    localStorage.removeItem("seba_mistakes");
    alert("Data cleared.");
    window.location.reload();
  }
}