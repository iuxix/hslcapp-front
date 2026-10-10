// ============================================================
// API — Fetch wrapper with auth
// ============================================================

const API = {
  // Get token from storage
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  // Save token
  setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  },

  // Clear session
  clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.SESSION_KEY);
  },

  // Get current user from storage
  getUser() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Save user
  setUser(user) {
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(user));
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getToken();
  },

  // Check if admin
  isAdmin() {
    const user = this.getUser();
    return user && user.role === "admin";
  },

  // Base fetch with auth
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 — token expired
      if (response.status === 401) {
        this.clearSession();
        showToast("Session expired. Please login again.", "error");
        const isAdmin = window.location.pathname.includes("/admin/");
        const target = isAdmin ? "../index.html" : "index.html";
        setTimeout(() => {
          window.location.href = target;
        }, 1500);
        throw new Error("Unauthorized");
      }

      // Handle other errors
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;

          // FastAPI validation errors
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e) => e.msg).join(", ");
          }
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }

      // No content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Network error. Check internet connection.");
      }
      throw error;
    }
  },

  // Methods
  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },
};

// ============================================================
// AUTH API
// ============================================================

const AuthAPI = {
  async login(username, password) {
    const data = await API.post("/api/auth/login", { username, password });
    API.setToken(data.access_token);
    API.setUser(data.user);
    return data;
  },

  async adminLogin(username, password, adminCode) {
    const data = await API.post("/api/auth/admin-login", {
      username,
      password,
      admin_code: adminCode,
    });
    API.setToken(data.access_token);
    API.setUser(data.user);
    return data;
  },

  async getMe() {
    return API.get("/api/auth/me");
  },

  logout() {
    API.clearSession();
    showToast("Logged out", "info", 1000);

    // Detect if inside /admin/ folder
    const isAdmin = window.location.pathname.includes("/admin/");
    const target = isAdmin ? "../index.html" : "index.html";

    setTimeout(() => {
      window.location.href = target;
    }, 500);
  },
};

// ============================================================
// STUDENT API
// ============================================================

const StudentAPI = {
  // Dashboard
  getDashboard() {
    return API.get("/api/student/dashboard");
  },

  // History
  getHistory(limit = 50) {
    return API.get(`/api/student/history?limit=${limit}`);
  },

  // Mistakes
  getMistakes(limit = 100) {
    return API.get(`/api/student/mistakes?limit=${limit}`);
  },

  // Weak Areas
  getWeakAreas() {
    return API.get("/api/student/weak-areas");
  },

  // Progress
  getProgress(limit = 20) {
    return API.get(`/api/student/progress?limit=${limit}`);
  },

  // Leaderboard
  getLeaderboard(limit = 20) {
    return API.get(`/api/student/leaderboard?limit=${limit}`);
  },
};

// ============================================================
// EXAM API
// ============================================================

const ExamAPI = {
  async start(payload) {
    return API.post("/api/exam/start", payload);
  },

  async getState(testId) {
    return API.get(`/api/exam/${testId}/state`);
  },

  async saveAnswer(testId, testQuestionId, selectedOption) {
    return API.post(`/api/exam/${testId}/answer`, {
      test_question_id: testQuestionId,
      selected_option: selectedOption,
    });
  },

  async recordTiming(testId, testQuestionId, event, selectedDuringVisit = null) {
    return API.post(`/api/exam/${testId}/timing`, {
      test_question_id: testQuestionId,
      event,
      selected_during_visit: selectedDuringVisit,
    });
  },

  async submit(testId) {
    return API.post(`/api/exam/${testId}/submit`);
  },

  async getResult(testId) {
    return API.get(`/api/exam/${testId}/result`);
  },
};

// ============================================================
// ADMIN API
// ============================================================

const AdminAPI = {
  // ========== USERS ==========
  listUsers(includeInactive = false) {
    return API.get(`/api/admin/users?include_inactive=${includeInactive}`);
  },

  createUser(data) {
    return API.post("/api/admin/users", data);
  },

  getUser(id) {
    return API.get(`/api/admin/users/${id}`);
  },

  changeUserRole(id, role) {
    return API.patch(`/api/admin/users/${id}/role`, { role });
  },

  deactivateUser(id) {
    return API.patch(`/api/admin/users/${id}/deactivate`);
  },

  activateUser(id) {
    return API.patch(`/api/admin/users/${id}/activate`);
  },

  deleteUser(id) {
    return API.delete(`/api/admin/users/${id}`);
  },

  // ========== CURRICULUM ==========
  // Subjects
  listSubjects() {
    return API.get("/api/admin/subjects");
  },

  createSubject(data) {
    return API.post("/api/admin/subjects", data);
  },

  getSubject(id) {
    return API.get(`/api/admin/subjects/${id}`);
  },

  updateSubject(id, data) {
    return API.put(`/api/admin/subjects/${id}`, data);
  },

  deleteSubject(id) {
    return API.delete(`/api/admin/subjects/${id}`);
  },

  // Sections
  listSections(subjectId) {
    return API.get(`/api/admin/subjects/${subjectId}/sections`);
  },

  createSection(data) {
    return API.post("/api/admin/sections", data);
  },

  updateSection(id, data) {
    return API.put(`/api/admin/sections/${id}`, data);
  },

  deleteSection(id) {
    return API.delete(`/api/admin/sections/${id}`);
  },

  // Chapters
  listChapters(sectionId) {
    return API.get(`/api/admin/sections/${sectionId}/chapters`);
  },

  createChapter(data) {
    return API.post("/api/admin/chapters", data);
  },

  getChapter(id) {
    return API.get(`/api/admin/chapters/${id}`);
  },

  updateChapter(id, data) {
    return API.put(`/api/admin/chapters/${id}`, data);
  },

  deleteChapter(id) {
    return API.delete(`/api/admin/chapters/${id}`);
  },

  // Topics
  listTopics(chapterId) {
    return API.get(`/api/admin/chapters/${chapterId}/topics`);
  },

  createTopic(data) {
    return API.post("/api/admin/topics", data);
  },

  updateTopic(id, data) {
    return API.put(`/api/admin/topics/${id}`, data);
  },

  deleteTopic(id) {
    return API.delete(`/api/admin/topics/${id}`);
  },

  // ========== QUESTIONS ==========
  listQuestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return API.get(`/api/admin/questions${query ? "?" + query : ""}`);
  },

  createQuestion(data) {
    return API.post("/api/admin/questions", data);
  },

  bulkCreateQuestions(questions) {
    return API.post("/api/admin/questions/bulk", { questions });
  },

  getQuestion(id) {
    return API.get(`/api/admin/questions/${id}`);
  },

  updateQuestion(id, data) {
    return API.put(`/api/admin/questions/${id}`, data);
  },

  deleteQuestion(id) {
    return API.delete(`/api/admin/questions/${id}`);
  },

  getQuestionStats() {
    return API.get("/api/admin/questions/stats");
  },
};

// ============================================================
// EXPOSE TO WINDOW
// ============================================================

window.API = API;
window.AuthAPI = AuthAPI;
window.StudentAPI = StudentAPI;
window.ExamAPI = ExamAPI;
window.AdminAPI = AdminAPI;