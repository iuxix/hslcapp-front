// ============================================================
// PROFILE — Redesigned
// ============================================================

(async function () {
  if (!requireLogin()) return;

  const session = API.getUser();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  try {
    const [dashboard, me] = await Promise.all([
      StudentAPI.getDashboard(),
      AuthAPI.getMe(),
    ]);
    renderProfile(me, dashboard);
  } catch (e) {
    console.error(e);
    renderProfile(session, { total_tests: 0, average_accuracy: 0, best_score: 0, streak_days: 0 });
  }
})();

function renderProfile(user, stats) {
  const main = document.getElementById("profileMain");
  const initials = (user.full_name || user.username).charAt(0).toUpperCase();

  main.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${initials}</div>
      <div class="profile-name">${escapeHtml(user.full_name || user.username)}</div>
      <div class="profile-role">@${escapeHtml(user.username)} · Class 10</div>
      ${user.role === "admin" ? '<div class="profile-badge">Admin</div>' : ""}
    </div>

    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-box">
        <div class="v">${stats.total_tests || 0}</div>
        <div class="l">Tests</div>
      </div>
      <div class="stat-box success">
        <div class="v">${Math.round(stats.average_accuracy || 0)}%</div>
        <div class="l">Accuracy</div>
      </div>
      <div class="stat-box">
        <div class="v">${Math.round(stats.best_score || 0)}%</div>
        <div class="l">Best</div>
      </div>
      <div class="stat-box warning">
        <div class="v">${stats.streak_days || 0}🔥</div>
        <div class="l">Streak</div>
      </div>
    </div>

    <section class="section">
      <h3 class="section-title">⚙️ Account</h3>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Username</span>
          <span class="info-value">${escapeHtml(user.username)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value" style="font-size:12px">${escapeHtml(user.email || "—")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Role</span>
          <span class="info-value">${escapeHtml(user.role || "student")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Joined</span>
          <span class="info-value" style="font-size:12px">${user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—"}</span>
        </div>
      </div>
    </section>

    ${user.role === "admin" ? `
      <section class="section">
        <button class="action-box action-box-primary action-box-medium" onclick="window.location.href='admin/dashboard.html'">
          <div class="box-icon">🛡️</div>
          <div class="box-content">
            <div class="box-title">Admin Panel</div>
            <div class="box-sub">Manage users & content</div>
          </div>
          <div class="box-arrow">→</div>
        </button>
      </section>
    ` : ""}

    <section class="section">
      <button class="btn btn-outline btn-block" onclick="showAbout()" style="margin-bottom:12px">
        ℹ️ About This App
      </button>
      <button class="btn btn-outline btn-block" onclick="logout()" style="color:var(--color-danger);border-color:var(--color-danger)">
        Logout
      </button>
    </section>

    <p style="text-align:center;font-size:11px;color:var(--color-text-light);margin-top:24px;font-weight:600">
      SEBA HSLC · v1.0 · Made with ❤️
    </p>
  `;
}

function showAbout() {
  showModal({
    title: "About SEBA HSLC",
    customContent: `
      <p style="font-size:14px;line-height:1.6;color:var(--color-text-muted);margin-bottom:16px">
        A private exam-training platform for SEBA HSLC Class 10 students. Practice with realistic mock tests, chapter-wise quizzes, and detailed analytics.
      </p>
      <div style="background:var(--color-bg);padding:12px;border-radius:8px;font-size:12px;color:var(--color-text-muted);line-height:1.6">
        <div><strong>Version:</strong> 1.0</div>
        <div><strong>Purpose:</strong> Class 10 exam preparation</div>
        <div><strong>Features:</strong> MCQ tests, analytics, mistake tracking</div>
      </div>
    `,
    actions: [
      { label: "Close", style: "primary", onClick: "closeModal()" },
    ],
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.showAbout = showAbout;
