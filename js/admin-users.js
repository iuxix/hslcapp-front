// ============================================================
// ADMIN — Users Management
// ============================================================

let roleSelector = null;

(function () {
  if (!requireAdmin()) return;
  loadUsers();
})();

async function loadUsers() {
  const listEl = document.getElementById("usersList");

  listEl.innerHTML = `
    <div class="admin-loading">
      <div class="admin-spinner"></div>
      <div class="admin-loading-text">Loading users...</div>
    </div>`;

  try {
    const users = await AdminAPI.listUsers(true);
    const session = API.getUser();

    if (users.length === 0) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">👥</div>
          <div class="admin-empty-title">No users yet</div>
          <div class="admin-empty-text">Add your first user to get started</div>
        </div>`;
      return;
    }

    listEl.innerHTML = users.map((u) => {
      const initials = (u.full_name || u.username).charAt(0).toUpperCase();
      const isSelf = u.id === session.id;
      const isAdmin = u.role === "admin";

      return `
        <div class="admin-user-card">
          <div class="admin-user-avatar ${isAdmin ? "admin-role" : ""}">${initials}</div>
          <div class="admin-user-info">
            <div class="admin-user-name">${escapeHtml(u.full_name || u.username)}</div>
            <div class="admin-user-meta">@${escapeHtml(u.username)} · ${escapeHtml(u.email)}</div>
            <div class="admin-user-badges">
              <span class="badge badge-${isAdmin ? "warning" : "muted"}">${u.role}</span>
              <span class="badge badge-${u.is_active ? "success" : "danger"}">
                ${u.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div class="admin-user-actions">
            <button class="admin-btn-icon" onclick="openUserMenu(${u.id}, '${escapeHtml(u.username)}', '${u.role}', ${u.is_active}, ${isSelf})">
              ⋯
            </button>
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <div class="admin-empty-icon">❌</div>
        <div class="admin-empty-title">Failed to load</div>
        <div class="admin-empty-text">${escapeHtml(error.message)}</div>
      </div>`;
  }
}

// ============================================================
// USER MENU — Actions in modal
// ============================================================

function openUserMenu(userId, username, role, isActive, isSelf) {
  if (isSelf) {
    showToast("Cannot modify your own account", "error");
    return;
  }

  const options = [];

  if (role !== "admin") {
    options.push({
      icon: "🛡️",
      label: "Make Admin",
      subtitle: "Grant full admin access",
      onClick: `window.__changeRole(${userId}, 'admin')`,
    });
  } else {
    options.push({
      icon: "👤",
      label: "Make Student",
      subtitle: "Remove admin privileges",
      onClick: `window.__changeRole(${userId}, 'student')`,
    });
  }

  if (isActive) {
    options.push({
      icon: "⏸️",
      label: "Deactivate",
      subtitle: "User cannot login",
      onClick: `window.__deactivate(${userId})`,
    });
  } else {
    options.push({
      icon: "▶️",
      label: "Activate",
      subtitle: "Restore user access",
      onClick: `window.__activate(${userId})`,
    });
  }

  if (role !== "admin") {
    options.push({
      icon: "🗑️",
      label: "Delete User",
      subtitle: "Permanently remove",
      danger: true,
      onClick: `window.__confirmDelete(${userId}, '${username}')`,
    });
  }

  const customContent = options.map((o) => `
    <button class="admin-sheet-option ${o.danger ? "danger" : ""}" onclick="${o.onClick}">
      <span class="admin-sheet-option-icon">${o.icon}</span>
      <span class="admin-sheet-option-content">
        <span class="admin-sheet-option-title">${o.label}</span>
        <span class="admin-sheet-option-sub">${o.subtitle}</span>
      </span>
    </button>
  `).join("");

  showModal({
    title: `Actions: ${username}`,
    customContent,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
    ],
  });
}

// ============================================================
// ACTIONS
// ============================================================

window.__changeRole = async function (userId, role) {
  closeModal();
  try {
    await AdminAPI.changeUserRole(userId, role);
    showToast(`Role updated to ${role}`, "success");
    setTimeout(() => loadUsers(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

window.__deactivate = async function (userId) {
  closeModal();
  try {
    await AdminAPI.deactivateUser(userId);
    showToast("User deactivated", "success");
    setTimeout(() => loadUsers(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

window.__activate = async function (userId) {
  closeModal();
  try {
    await AdminAPI.activateUser(userId);
    showToast("User activated", "success");
    setTimeout(() => loadUsers(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

window.__confirmDelete = function (userId, username) {
  closeModal();
  setTimeout(() => {
    showModal({
      title: "Delete User?",
      content: `"${username}" will be permanently removed. This cannot be undone.`,
      actions: [
        { label: "Cancel", style: "outline", onClick: "closeModal()" },
        { label: "Delete", style: "danger", onClick: `window.__doDelete(${userId})` },
      ],
    });
  }, 250);
};

window.__doDelete = async function (userId) {
  closeModal();
  try {
    await AdminAPI.deleteUser(userId);
    showToast("User deleted", "success");
    setTimeout(() => loadUsers(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

// ============================================================
// CREATE USER MODAL
// ============================================================

function openCreateUserModal() {
  showModal({
    title: "Create New User",
    customContent: `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Username *</label>
        <input type="text" id="newUsername" class="input-full" placeholder="e.g. student1" autocomplete="off" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Email *</label>
        <input type="email" id="newEmail" class="input-full" placeholder="student@example.com" autocomplete="off" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Full Name</label>
        <input type="text" id="newFullName" class="input-full" placeholder="Optional" autocomplete="off" />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Password *</label>
        <input type="password" id="newPassword" class="input-full" placeholder="Min 6 characters" autocomplete="new-password" />
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:6px">Role</label>
        <div id="userRoleSelectWrapper"></div>
      </div>
    `,
    actions: [
      { label: "Cancel", style: "outline", onClick: "closeModal()" },
      { label: "Create User", style: "primary", onClick: "window.__doCreate()" },
    ],
  });

  // Bind custom selector
  setTimeout(() => {
    const wrapper = document.getElementById("userRoleSelectWrapper");
    if (wrapper) {
      wrapper.innerHTML = buildCustomSelectHTML("userRoleSelect", "Select role");
      roleSelector = bindCustomSelect(
        "userRoleSelect",
        [
          { value: "student", label: "Student" },
          { value: "admin", label: "Admin" },
        ],
        null,
        "student"
      );
    }
  }, 100);
}

window.__doCreate = async function () {
  const username = document.getElementById("newUsername").value.trim();
  const email = document.getElementById("newEmail").value.trim();
  const fullName = document.getElementById("newFullName").value.trim();
  const password = document.getElementById("newPassword").value;
  const role = roleSelector ? roleSelector.getValue() : "student";

  if (!username || !email || !password) {
    showToast("Username, email and password required", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  try {
    await AdminAPI.createUser({
      username,
      email,
      password,
      full_name: fullName || null,
      role,
    });
    closeModal();
    showToast(`User "${username}" created`, "success");
    setTimeout(() => loadUsers(), 400);
  } catch (error) {
    showToast(error.message, "error");
  }
};

window.openCreateUserModal = openCreateUserModal;
window.openUserMenu = openUserMenu;