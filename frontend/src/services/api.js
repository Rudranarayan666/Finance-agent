const API_BASE = '/api/v1';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      ...(options.headers || {})
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network error occurred' }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(email, password, fullName, role = 'analyst') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role })
    });
  }

  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await this.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Documents
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/documents/upload', {
      method: 'POST',
      body: formData
    });
  }

  async listDocuments() {
    return this.request('/documents');
  }

  async shareDocument(docId, userEmail, permission = 'view') {
    return this.request(`/documents/${docId}/share`, {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail, permission })
    });
  }

  async deleteDocument(docId) {
    return this.request(`/documents/${docId}`, {
      method: 'DELETE'
    });
  }

  // Analysis
  async triggerAnalysis(docId) {
    return this.request(`/analyze/${docId}`, {
      method: 'POST'
    });
  }

  async getAnalysis(docId) {
    return this.request(`/analyze/${docId}`);
  }

  async askQuestion(docId, question) {
    return this.request(`/analyze/${docId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  }

  // Admin
  async listUsers() {
    return this.request('/admin/users');
  }

  async updateUserRole(userId, newRole) {
    return this.request(`/admin/users/${userId}/role?new_role=${newRole}`, {
      method: 'PUT'
    });
  }

  async getAuditLogs(limit = 50) {
    return this.request(`/admin/audit-logs?limit=${limit}`);
  }
}

export const api = new ApiService();
