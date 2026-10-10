// ============================================================
// MODAL — Custom Modal System
// ============================================================

(function () {
  console.log("modal.js loaded");

  function getRoot() {
    let root = document.getElementById("modalRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "modalRoot";
      document.body.appendChild(root);
    }
    return root;
  }

  window.showModal = function (opts) {
    try {
      const root = getRoot();
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";

      const { title = "", content = "", customContent = "", stats = [], actions = [] } = opts || {};

      let statsHtml = "";
      if (stats.length > 0) {
        statsHtml = `<div class="modal-stats">${stats.map((s) => `
          <div class="modal-stat">
            <div class="v" style="color:${s.color || "var(--color-text)"}">${s.value}</div>
            <div class="l">${s.label}</div>
          </div>`).join("")}</div>`;
      }

      let actionsHtml = "";
      if (actions.length > 0) {
        actionsHtml = `<div class="modal-actions">${actions.map((a) => `
          <button type="button" class="btn btn-${a.style || "outline"}" onclick="${a.onClick || "closeModal()"}">${a.label}</button>
        `).join("")}</div>`;
      }

      backdrop.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()">
          ${title ? `<h3>${title}</h3>` : ""}
          ${content ? `<p>${content}</p>` : ""}
          ${customContent}
          ${statsHtml}
          ${actionsHtml}
        </div>
      `;

      backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
      root.innerHTML = "";
      root.appendChild(backdrop);
      document.body.style.overflow = "hidden";
    } catch (err) {
      console.error("showModal error:", err);
      alert("Modal Error: " + err.message);
    }
  };

  window.closeModal = function () {
    try {
      const root = getRoot();
      const backdrop = root.querySelector(".modal-backdrop");
      if (!backdrop) return;
      backdrop.classList.add("closing");
      const modal = root.querySelector(".modal");
      if (modal) modal.classList.add("closing");
      document.body.style.overflow = "";
      setTimeout(() => { root.innerHTML = ""; }, 200);
    } catch (err) {
      console.error("closeModal error:", err);
    }
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();
