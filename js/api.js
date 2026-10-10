// ============================================================
// API — Fetch wrapper with auth
// ============================================================

const API = {
  getToken() { return localStorage.getItem(CONFIG.TOKEN_KEY); },
  setToken(token) { localStorage.setItem(CONFIG.TOKEN_KEY, token); },
  clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.SESSION_KEY);
  },
  getUser() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setUser(user) { localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(user)); },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin() {
    const user = this.getUser();
    return user && user.role === "admin";
  },

  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        this.clearSession();
        showToast("Session expired. Please login again.", "error");
        const isAdmin = window.location.pathname.includes("/admin/");
        const target = isAdmin ? "../index.html" : "index.html";
        setTimeout(() => (window.location.href = target), 1500);
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e) => e.msg).join(", ");
          }
        } catch {}
        throw new Error(errorMessage);
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Network error. Check internet connection.");
      }
      throw error;
    }
  },

  get(endpoint) { return this.request(endpoint, { method: "GET" }); },
  post(endpoint, body) {
    return this.request(endpoint, { method: "POST", body: JSON.stringify(body) });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: "PUT", body: JSON.stringify(body) });
  },
  patch(endpoint, body) {
    return this.request(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
  },
  delete(endpoint) { return this.request(endpoint, { method: "DELETE" }); },
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
  async getMe() { return API.get("/api/auth/me"); },
  logout() {
    API.clearSession();
    showToast("Logged out", "info", 1000);
    const isAdmin = window.location.pathname.includes("/admin/");
    const target = isAdmin ? "../index.html" : "index.html";
    setTimeout(() => (window.location.href = target), 500);
  },
};

// ============================================================
// PUBLIC API
// ============================================================

const PublicAPI = {
  listSubjects() { return API.get("/api/public/subjects"); },
  getSubject(id) { return API.get(`/api/public/subjects/${id}`); },
  listSections(subjectId) { return API.get(`/api/public/subjects/${subjectId}/sections`); },
  getChapter(id) { return API.get(`/api/public/chapters/${id}`); },
};

// ============================================================
// STUDENT API
// ============================================================

const StudentAPI = {
  getDashboard() { return API.get("/api/student/dashboard"); },
  getHistory(limit = 50) { return API.get(`/api/student/history?limit=${limit}`); },
  getMistakes(limit = 100) { return API.get(`/api/student/mistakes?limit=${limit}`); },
  getWeakAreas() { return API.get("/api/student/weak-areas"); },
  getProgress(limit = 20) { return API.get(`/api/student/progress?limit=${limit}`); },
  getLeaderboard(limit = 20) { return API.get(`/api/student/leaderboard?limit=${limit}`); },
};

// ============================================================
// EXAM API
// ============================================================

const ExamAPI = {
  async start(payload) { return API.post("/api/exam/start", payload); },
  async getState(testId) { return API.get(`/api/exam/${testId}/state`); },
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
  async submit(testId) { return API.post(`/api/exam/${testId}/submit`); },
  async getResult(testId) { return API.get(`/api/exam/${testId}/result`); },
};

// ============================================================
// ADMIN API
// ============================================================

const AdminAPI = {
  listUsers(includeInactive = false) { return API.get(`/api/admin/users?include_inactive=${includeInactive}`); },
  createUser(data) { return API.post("/api/admin/users", data); },
  getUser(id) { return API.get(`/api/admin/users/${id}`); },
  changeUserRole(id, role) { return API.patch(`/api/admin/users/${id}/role`, { role }); },
  deactivateUser(id) { return API.patch(`/api/admin/users/${id}/deactivate`); },
  activateUser(id) { return API.patch(`/api/admin/users/${id}/activate`); },
  deleteUser(id) { return API.delete(`/api/admin/users/${id}`); },

  listSubjects() { return API.get("/api/admin/subjects"); },
  createSubject(data) { return API.post("/api/admin/subjects", data); },
  getSubject(id) { return API.get(`/api/admin/subjects/${id}`); },
  updateSubject(id, data) { return API.put(`/api/admin/subjects/${id}`, data); },
  deleteSubject(id) { return API.delete(`/api/admin/subjects/${id}`); },

  listSections(subjectId) { return API.get(`/api/admin/subjects/${subjectId}/sections`); },
  createSection(data) { return API.post("/api/admin/sections", data); },
  updateSection(id, data) { return API.put(`/api/admin/sections/${id}`, data); },
  deleteSection(id) { return API.delete(`/api/admin/sections/${id}`); },

  listChapters(sectionId) { return API.get(`/api/admin/sections/${sectionId}/chapters`); },
  createChapter(data) { return API.post("/api/admin/chapters", data); },
  getChapter(id) { return API.get(`/api/admin/chapters/${id}`); },
  updateChapter(id, data) { return API.put(`/api/admin/chapters/${id}`, data); },
  deleteChapter(id) { return API.delete(`/api/admin/chapters/${id}`); },

  listTopics(chapterId) { return API.get(`/api/admin/chapters/${chapterId}/topics`); },
  createTopic(data) { return API.post("/api/admin/topics", data); },
  updateTopic(id, data) { return API.put(`/api/admin/topics/${id}`, data); },
  deleteTopic(id) { return API.delete(`/api/admin/topics/${id}`); },

  listQuestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return API.get(`/api/admin/questions${query ? "?" + query : ""}`);
  },
  createQuestion(data) { return API.post("/api/admin/questions", data); },
  bulkCreateQuestions(questions) { return API.post("/api/admin/questions/bulk", { questions }); },
  getQuestion(id) { return API.get(`/api/admin/questions/${id}`); },
  updateQuestion(id, data) { return API.put(`/api/admin/questions/${id}`, data); },
  deleteQuestion(id) { return API.delete(`/api/admin/questions/${id}`); },
  getQuestionStats() { return API.get("/api/admin/questions/stats"); },
};

window.API = API;
window.AuthAPI = AuthAPI;
window.PublicAPI = PublicAPI;
window.StudentAPI = StudentAPI;
window.ExamAPI = ExamAPI;
window.AdminAPI = AdminAPI;
