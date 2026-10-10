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

  async googleLogin(email = 'google.analyst@finance.corp', name = 'Google Workspace Analyst', role = 'analyst') {
    const res = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, role })
    });

    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
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

  async shareDocument(docId, userEmail = null, permission = 'view', shareWithOrg = false) {
    return this.request(`/documents/${docId}/share`, {
      method: 'POST',
      body: JSON.stringify({
        user_email: userEmail,
        permission,
        share_with_org: shareWithOrg
      })
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

  // DuckDB Analytics & SQL
  async queryDuckDB(docId, query) {
    return this.request(`/analyze/${docId}/duckdb/query`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  async getDuckDBAnalytics(docId) {
    return this.request(`/analyze/${docId}/duckdb/analytics`);
  }

  // Page inspection & PDF stream
  async getDocumentStatus(docId) {
    return this.request(`/documents/${docId}/status`);
  }

  async getDocumentPage(docId, pageNumber) {
    return this.request(`/documents/${docId}/page/${pageNumber}`);
  }

  async getDocumentPageEvidence(docId, pageNumber) {
    return this.request(`/documents/${docId}/page/${pageNumber}/evidence`);
  }

  getDocumentPageImageUrl(docId, pageNumber, dpi = 150) {
    const token = this.token;
    return `${API_BASE}/documents/${docId}/page/${pageNumber}/image?dpi=${dpi}${token ? `&token=${token}` : ''}`;
  }

  async reindexDocument(docId) {
    return this.request(`/documents/${docId}/reindex`, {
      method: 'POST'
    });
  }

  getDocumentPdfUrl(docId) {
    return `${API_BASE}/documents/${docId}/file`;
  }

  // Chatbot Security Feed for Admin
  async getSecurityChatFeed() {
    return this.request('/chat/security/feed');
  }

  // SaaS Plans & Subscriptions
  async getPlans() {
    return this.request('/plans');
  }

  async getCurrentSubscription() {
    return this.request('/subscriptions/me');
  }

  async selectPlan(planKey) {
    const cleanKey = (planKey || 'basic').toLowerCase();
    if (cleanKey === 'basic') {
      return this.request('/subscriptions/select-plan', {
        method: 'POST',
        body: JSON.stringify({ plan_key: cleanKey })
      });
    }
    return this.request('/subscriptions/activate-tier', {
      method: 'POST',
      body: JSON.stringify({ plan_key: cleanKey })
    });
  }

  async activateTierDirect(planKey) {
    return this.request('/subscriptions/activate-tier', {
      method: 'POST',
      body: JSON.stringify({ plan_key: (planKey || 'basic').toLowerCase() })
    });
  }

  async checkoutSubscription(planKey) {
    return this.request('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_key: planKey })
    });
  }

  async verifyPayment(orderId, paymentId, signature, planKey) {
    return this.request('/subscriptions/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        signature,
        plan_key: planKey
      })
    });
  }

  async cancelSubscription() {
    return this.request('/subscriptions/cancel', {
      method: 'POST'
    });
  }

  // SaaS Credits & Usage
  async getCreditStatus() {
    return this.request('/credits/me');
  }

  async getCreditTransactions(limit = 50) {
    return this.request(`/credits/transactions?limit=${limit}`);
  }

  async getUserUsage(limit = 50) {
    return this.request(`/usage/me?limit=${limit}`);
  }

  // Report Download (Pro & Premium)
  async downloadReport(docId, filename = 'report.pdf') {
    const url = `${API_BASE}/documents/${docId}/report/download`;
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to download report' }));
      throw new Error(err.detail?.message || err.detail || 'Download failed');
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }

  // Admin Operations
  async getAdminOverview() {
    return this.request('/admin/overview');
  }

  async getAdminUsers(query = '', planKey = '') {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (planKey) params.append('plan_key', planKey);
    return this.request(`/admin/users?${params.toString()}`);
  }

  async getAdminUserDetails(userId) {
    return this.request(`/admin/users/${userId}`);
  }

  async adjustUserCredits(userId, amount, reason) {
    return this.request(`/admin/users/${userId}/credits/adjust`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), reason })
    });
  }

  async changeUserPlanAdmin(userId, planKey) {
    return this.request(`/admin/users/${userId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan_key: planKey })
    });
  }

  async suspendUser(userId) {
    return this.request(`/admin/users/${userId}/suspend`, {
      method: 'POST'
    });
  }

  async activateUser(userId) {
    return this.request(`/admin/users/${userId}/activate`, {
      method: 'POST'
    });
  }

  async getAdminDocuments(query = '', statusFilter = '') {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (statusFilter) params.append('status_filter', statusFilter);
    return this.request(`/admin/documents?${params.toString()}`);
  }

  async adminReindexDocument(docId) {
    return this.request(`/admin/documents/${docId}/reindex`, {
      method: 'POST'
    });
  }

  async adminDeleteDocument(docId) {
    return this.request(`/admin/documents/${docId}`, {
      method: 'DELETE'
    });
  }

  async listUsers() {
    return this.request('/admin/users');
  }

  async inviteUser(email, role = 'analyst', fullName = null) {
    return this.request('/admin/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, full_name: fullName })
    });
  }

  async updateUserRole(userId, newRole) {
    return this.request(`/admin/users/${userId}/role?new_role=${newRole}`, {
      method: 'PUT'
    });
  }

  async getAuditLogs({ limit = 100, action = '', userEmail = '', documentId = '' } = {}) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (action) params.append('action', action);
    if (userEmail) params.append('user_email', userEmail);
    if (documentId) params.append('document_id', documentId);
    return this.request(`/admin/audit-logs?${params.toString()}`);
  }
}

export const api = new ApiService();

