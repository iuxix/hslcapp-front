// ============================================================
// TOAST — Custom Notifications
// ============================================================

(function () {
  console.log("toast.js loaded");

  function getContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  window.showToast = function (message, type = "info", duration = 3000) {
    try {
      const container = getContainer();
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;

      const icons = { success: "✓", error: "✕", info: "ℹ" };
      toast.innerHTML = `
        <span class="toast-icon">${icons[type] || "•"}</span>
        <span class="toast-message">${message}</span>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add("closing");
        setTimeout(() => toast.remove(), 250);
      }, duration);
    } catch (err) {
      console.error("showToast error:", err);
    }
  };

  document.addEventListener("click", (e) => {
    const toast = e.target.closest(".toast");
    if (toast) {
      toast.classList.add("closing");
      setTimeout(() => toast.remove(), 250);
    }
  });
})();
