// ============================================================
// AUTH — Real API-based authentication
// ============================================================

(function () {
  // ============================================================
  // PASSWORD TOGGLE
  // ============================================================
  window.togglePassword = function () {
    const input = document.getElementById("password");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  };

  // ============================================================
  // STUDENT LOGIN
  // ============================================================
  const studentForm = document.getElementById("studentLoginForm");
  if (studentForm) {
    studentForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const errorBox = document.getElementById("loginError");
      const submitBtn = studentForm.querySelector("button[type=submit]");

      errorBox.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";

      try {
        await AuthAPI.login(username, password);
        showToast("Login successful!", "success", 1200);
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 600);
      } catch (error) {
        errorBox.textContent = error.message || "Login failed";
        errorBox.hidden = false;
        errorBox.style.animation = "none";
        setTimeout(() => (errorBox.style.animation = ""), 10);
        submitBtn.disabled = false;
        submitBtn.textContent = "Login →";
      }
    });
  }

  // ============================================================
  // ADMIN LOGIN
  // ============================================================
  const adminForm = document.getElementById("adminLoginForm");
  if (adminForm) {
    adminForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value;
      const errorBox = document.getElementById("adminLoginError");
      const submitBtn = adminForm.querySelector("button[type=submit]");

      errorBox.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";

      try {
        const data = await AuthAPI.login(username, password);

        // Verify admin role
        if (data.user.role !== "admin") {
          API.clearSession();
          errorBox.textContent = "This account is not an admin";
          errorBox.hidden = false;
          submitBtn.disabled = false;
          submitBtn.textContent = "Access Admin Panel";
          return;
        }

        showToast("Admin access granted", "success", 1200);
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 600);
      } catch (error) {
        errorBox.textContent = error.message || "Login failed";
        errorBox.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Access Admin Panel";
      }
    });
  }
})();

// ============================================================
// HELPERS — AUTH GUARDS
// ============================================================

/**
 * Require login — for student pages (root level)
 * Redirects to root index.html if not logged in
 */
function requireLogin() {
  if (!API.isLoggedIn()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/**
 * Require admin — for admin pages (inside /admin/ folder)
 * Redirects to root index.html if not logged in
 * Redirects to student dashboard if not admin
 */
function requireAdmin() {
  if (!API.isLoggedIn()) {
    window.location.href = "../index.html";
    return false;
  }
  if (!API.isAdmin()) {
    showToast("Admin access required", "error");
    setTimeout(() => {
      window.location.href = "../dashboard.html";
    }, 1500);
    return false;
  }
  return true;
}

/**
 * Logout — works from any page
 * AuthAPI.logout() handles path detection
 */
function logout() {
  AuthAPI.logout();
}

/**
 * Get current session user
 */
function getSession() {
  return API.getUser();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format time (seconds → "Xm Ys")
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ============================================================
// EXPOSE TO WINDOW
// ============================================================

window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.logout = logout;
window.getSession = getSession;
window.escapeHtml = escapeHtml;
window.formatTime = formatTime;