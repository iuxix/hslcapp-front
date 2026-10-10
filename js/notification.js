// ============================================================
// NOTIFICATION — Update popup (placeholder until backend)
// ============================================================

(function () {
  // Only on student pages, not on admin
  if (!API.isLoggedIn()) return;
  if (window.location.pathname.includes("/admin/")) return;

  // Check if we already showed a notification this session
  if (sessionStorage.getItem("notificationChecked")) return;
  sessionStorage.setItem("notificationChecked", "1");

  // Placeholder — will be activated when backend notification API is ready
  checkForUpdates();
})();

async function checkForUpdates() {
  try {
    // Future: fetch from /api/notifications/unread
    // For now, this is a no-op placeholder
    const response = await fetch(`${CONFIG.API_URL}/api/notifications/unread`, {
      headers: {
        "Authorization": `Bearer ${API.getToken()}`,
      },
    });

    if (!response.ok) return; // API not ready yet — silent fail
    const notifications = await response.json();

    if (notifications && notifications.length > 0) {
      showUpdateNotification(notifications[0]);
    }
  } catch (e) {
    // Silent fail — API not ready
  }
}

function showUpdateNotification(notif) {
  if (typeof showModal !== "function") return;

  showModal({
    title: `🎉 ${notif.title}`,
    customContent: `
      <div style="
        background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 16px;
        text-align: center;
      ">
        <div style="font-size: 32px; margin-bottom: 4px;">✨</div>
        <div style="font-size: 13px; font-weight: 800; color: #4F46E5; letter-spacing: 0.05em;">
          ${notif.version ? "UPDATE " + notif.version : "NEW UPDATE"}
        </div>
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #0F172A; white-space: pre-wrap;">${escapeHtml(notif.content)}</div>
    `,
    actions: [
      { label: "Got it!", style: "primary", onClick: "closeModal()" },
    ],
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
