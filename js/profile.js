// ============================================================
// PROFILE — Redesigned Info Rows
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
      <div class="profile-role">@${escapeHtml(user.username)}</div>
      <div class="profile-badge">Class 10 · SEBA HSLC</div>
      ${user.role === "admin" ? '<div class="profile-badge" style="margin-left:6px;background:linear-gradient(135deg,#F59E0B,#D97706)">🛡️ Admin</div>' : ""}
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
        <div class="l">Best Score</div>
      </div>
      <div class="stat-box warning">
        <div class="v">${stats.streak_days || 0}🔥</div>
        <div class="l">Day Streak</div>
      </div>
    </div>

    <section class="section">
      <h3 class="section-title">⚙️ Account Info</h3>
      <div class="info-card" style="padding:0">
        <div class="profile-info-row">
          <div class="profile-info-icon">👤</div>
          <div class="profile-info-content">
            <div class="profile-info-label">Username</div>
            <div class="profile-info-value">${escapeHtml(user.username)}</div>
          </div>
        </div>
        <div class="profile-info-row">
          <div class="profile-info-icon">📧</div>
          <div class="profile-info-content">
            <div class="profile-info-label">Email</div>
            <div class="profile-info-value">${escapeHtml(user.email || "Not set")}</div>
          </div>
        </div>
        <div class="profile-info-row">
          <div class="profile-info-icon">🎓</div>
          <div class="profile-info-content">
            <div class="profile-info-label">Class</div>
            <div class="profile-info-value">Class 10 (SEBA HSLC)</div>
          </div>
        </div>
        <div class="profile-info-row">
          <div class="profile-info-icon">🛡️</div>
          <div class="profile-info-content">
            <div class="profile-info-label">Role</div>
            <div class="profile-info-value">${user.role === "admin" ? "Administrator" : "Student"}</div>
          </div>
        </div>
        <div class="profile-info-row" style="border-bottom:none">
          <div class="profile-info-icon">📅</div>
          <div class="profile-info-content">
            <div class="profile-info-label">Joined</div>
            <div class="profile-info-value">${user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</div>
          </div>
        </div>
      </div>
    </section>

    ${user.role === "admin" ? `
      <section class="section">
        <button class="action-box action-box-primary action-box-medium" onclick="window.location.href='admin/dashboard.html'">
          <div class="box-icon">🛡️</div>
          <div class="box-content">
            <div class="box-title">Open Admin Panel</div>
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
