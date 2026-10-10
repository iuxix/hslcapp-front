// ============================================================
// MODAL — Custom Modal System (replaces alert/confirm/prompt)
// ============================================================

(function () {
  // Ensure root container exists
  function getRoot() {
    let root = document.getElementById("modalRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "modalRoot";
      document.body.appendChild(root);
    }
    return root;
  }

  /**
   * Show a modal
   * @param {Object} opts
   * @param {string} [opts.title] - Modal heading
   * @param {string} [opts.content] - Body text
   * @param {string} [opts.customContent] - Raw HTML inside body
   * @param {Array}  [opts.stats] - [{value, label, color}]
   * @param {Array}  [opts.actions] - [{label, style, onClick}]
   */
  window.showModal = function (opts) {
    const root = getRoot();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const {
      title = "",
      content = "",
      customContent = "",
      stats = [],
      actions = [],
      closable = true,
    } = opts;

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
        <button
          type="button"
          class="btn btn-${a.style || "outline"}"
          onclick="${a.onClick || "closeModal()"}"
        >${a.label}</button>
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

    if (closable) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeModal();
      };
    }

    root.innerHTML = "";
    root.appendChild(backdrop);

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  };

  window.closeModal = function () {
    const root = getRoot();
    const backdrop = root.querySelector(".modal-backdrop");
    const modal = root.querySelector(".modal");

    if (!backdrop) return;

    backdrop.classList.add("closing");
    if (modal) modal.classList.add("closing");

    document.body.style.overflow = "";

    setTimeout(() => {
      root.innerHTML = "";
    }, 200);
  };

  // Close on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();