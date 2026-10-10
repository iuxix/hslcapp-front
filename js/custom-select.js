// ============================================================
// CUSTOM SELECT — Replaces browser dropdowns
// ============================================================

(function () {
  console.log("custom-select.js loaded");

  /**
   * Create a custom select
   * @param {HTMLElement} container - the .custom-select container
   * @param {Array} options - [{value, label, meta, group}]
   * @param {Function} onChange - callback (value, label)
   * @param {String} placeholder - text when nothing selected
   * @param {String} defaultValue - initial selected value
   */
  window.createCustomSelect = function (container, options, onChange, placeholder = "Select...", defaultValue = null) {
    const trigger = container.querySelector(".custom-select-trigger");
    const list = container.querySelector(".custom-select-list");
    const triggerText = trigger.querySelector(".custom-select-trigger-text");

    let currentValue = defaultValue;

    // Render list
    function renderList() {
      list.innerHTML = "";

      let currentGroup = null;
      options.forEach((opt) => {
        if (opt.group && opt.group !== currentGroup) {
          currentGroup = opt.group;
          const groupEl = document.createElement("div");
          groupEl.className = "custom-select-group";
          groupEl.textContent = opt.group;
          list.appendChild(groupEl);
        }

        const item = document.createElement("button");
        item.type = "button";
        item.className = "custom-select-option";
        item.dataset.value = opt.value;

        if (currentValue == opt.value) {
          item.classList.add("selected");
        }

        item.innerHTML = `
          <span>${opt.label}</span>
          ${opt.meta ? `<span class="custom-select-option-meta">${opt.meta}</span>` : ""}
        `;

        item.onclick = (e) => {
          e.stopPropagation();
          selectValue(opt.value, opt.label);
        };

        list.appendChild(item);
      });
    }

    function selectValue(value, label) {
      currentValue = value;
      triggerText.textContent = label;
      trigger.classList.remove("placeholder");

      // Update selected state in list
      list.querySelectorAll(".custom-select-option").forEach((el) => {
        el.classList.toggle("selected", el.dataset.value == value);
      });

      closeList();
      if (onChange) onChange(value, label);
    }

    function openList() {
      // Close other open selects
      document.querySelectorAll(".custom-select-list.open").forEach((el) => {
        if (el !== list) {
          el.classList.remove("open");
          el.parentElement.querySelector(".custom-select-trigger").classList.remove("open");
        }
      });

      trigger.classList.add("open");
      list.classList.add("open");
    }

    function closeList() {
      trigger.classList.remove("open");
      list.classList.remove("open");
    }

    function toggleList() {
      if (list.classList.contains("open")) {
        closeList();
      } else {
        openList();
      }
    }

    // Attach events
    trigger.onclick = (e) => {
      e.stopPropagation();
      toggleList();
    };

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        closeList();
      }
    });

    // Initial render
    renderList();

    // Set default value
    if (defaultValue !== null) {
      const defOpt = options.find((o) => o.value == defaultValue);
      if (defOpt) {
        triggerText.textContent = defOpt.label;
        trigger.classList.remove("placeholder");
      }
    } else {
      triggerText.textContent = placeholder;
      trigger.classList.add("placeholder");
    }

    // Return API
    return {
      getValue: () => currentValue,
      setValue: (val) => {
        const opt = options.find((o) => o.value == val);
        if (opt) {
          selectValue(opt.value, opt.label);
        }
      },
      setOptions: (newOptions) => {
        options = newOptions;
        renderList();
      },
    };
  };

  /**
   * Build HTML for a custom select
   * @param {String} id - unique id
   * @param {String} placeholder
   */
  window.buildCustomSelectHTML = function (id, placeholder = "Select...") {
    return `
      <div class="custom-select" id="${id}">
        <button type="button" class="custom-select-trigger placeholder">
          <span class="custom-select-trigger-text">${placeholder}</span>
          <span class="custom-select-arrow">▾</span>
        </button>
        <div class="custom-select-list"></div>
      </div>
    `;
  };

  /**
   * Bind an existing custom select container
   */
  window.bindCustomSelect = function (containerId, options, onChange, defaultValue = null) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Custom select container not found:", containerId);
      return null;
    }
    return window.createCustomSelect(container, options, onChange, "Select...", defaultValue);
  };
})();