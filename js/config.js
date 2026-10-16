// ============================================================
// CONFIG — API Base URL
// ============================================================

const CONFIG = {
  // Production API URL
  API_URL: "https://hslcbackend-96cef1.rivendeploy.com",

  // Local testing ke liye ye use karo:
  // API_URL: "http://localhost:8000",

  // Session storage keys
  SESSION_KEY: "seba_session",
  TOKEN_KEY: "seba_token",

  // Auto-logout if token about to expire (in seconds before)
  TOKEN_REFRESH_BUFFER: 60,
};

// Expose
window.CONFIG = CONFIG;
