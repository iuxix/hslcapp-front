// ============================================================
// ADMIN DASHBOARD — Phase 2B
// ============================================================

(function () {
  // -------- Auth Check --------
  const session = getSession();
  if (!session || session.role !== "admin") {
    window.location.href = "login.html";
    return;
  }

  // -------- Render Header --------
  document.getElementById("adminName").textContent =
    `Welcome, ${session.full_name || session.username}`;
  document.getElementById("adminAvatar").textContent =
    (session.full_name || session.username).charAt(0).toUpperCase();

  // -------- Mock Stats --------
  const totalUsers = MOCK.users.length;
  const totalQuestions = MOCK.questions.length;
  const totalSubjects = MOCK.subjects.length;

  // Header stats
  document.getElementById("statUsers").textContent = totalUsers;
  document.getElementById("statQuestions").textContent = totalQuestions;
  document.getElementById("statSubjects").textContent = totalSubjects;

  // Cards
  document.getElementById("cardUsers").textContent = totalUsers;
  document.getElementById("cardQuestions").textContent = totalQuestions;
  document.getElementById("cardSubjects").textContent = totalSubjects;
  document.getElementById("cardTests").textContent = 0;

  // -------- Users Table --------
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = MOCK.users
    .map(
      (u) => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td><span class="badge badge-${u.role === "admin" ? "warning" : "muted"}">${u.role}</span></td>
      <td>0</td>
      <td>--</td>
      <td>Never</td>
    </tr>`
    )
    .join("");

  // -------- Subjects List --------
  const subjEl = document.getElementById("adminSubjects");
  subjEl.innerHTML = MOCK.subjects
    .map(
      (s) => `
    <div class="info-card">
      <div class="info-row">
        <span class="info-label"><strong>${s.name}</strong></span>
        <span class="badge badge-muted">${s.code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Pattern</span>
        <span class="info-value">${s.exam_pattern}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sections</span>
        <span class="info-value">${s.sections.length}</span>
      </div>
    </div>`
    )
    .join("");
})();

// -------- Admin Logout --------
function adminLogout() {
  if (confirm("Logout from admin panel?")) {
    localStorage.removeItem("seba_session");
    window.location.href = "login.html";
  }
}