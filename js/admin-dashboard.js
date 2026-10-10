// ============================================================
// ADMIN DASHBOARD
// ============================================================

(function () {
  if (!requireAdmin()) return;

  const session = API.getUser();
  document.getElementById("adminName").textContent =
    `Welcome, ${session.full_name || session.username}`;

  loadStats();
})();

async function loadStats() {
  const usersEl = document.getElementById("statUsers");
  const subjEl = document.getElementById("statSubjects");
  const qEl = document.getElementById("statQuestions");

  // Loading state
  usersEl.textContent = "...";
  subjEl.textContent = "...";
  qEl.textContent = "...";

  // Load each individually
  try {
    const users = await AdminAPI.listUsers();
    usersEl.textContent = users.length;
  } catch (e) {
    console.error("Users error:", e);
    usersEl.textContent = "?";
  }

  try {
    const subjects = await AdminAPI.listSubjects();
    subjEl.textContent = subjects.length;
  } catch (e) {
    console.error("Subjects error:", e);
    subjEl.textContent = "?";
  }

  try {
    const qStats = await AdminAPI.getQuestionStats();
    qEl.textContent = qStats.total || 0;
  } catch (e) {
    console.error("Questions error:", e);
    qEl.textContent = "?";
  }
}

function goTo(page) {
  window.location.href = page;
}

window.goTo = goTo;