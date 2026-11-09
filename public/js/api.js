/**
 * API Client Module (ES6)
 * Handles REST API communication with Express Backend and manages JWT Authentication
 */

const API_BASE_URL = window.location.origin + '/api';

const API = {
  // --- Token and Auth Storage ---
  getToken() {
    return localStorage.getItem('smart_parking_token') || null;
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('smart_parking_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setAuth(token, user) {
    localStorage.setItem('smart_parking_token', token);
    localStorage.setItem('smart_parking_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('smart_parking_token');
    localStorage.removeItem('smart_parking_user');
  },

  // Base request wrapper with JWT header support
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  },

  // --- Auth Endpoints ---
  auth: {
    async register(userData) {
      const data = await API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (data.token) {
        API.setAuth(data.token, data.user);
      }
      return data;
    },

    async login(email, password) {
      const data = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        API.setAuth(data.token, data.user);
      }
      return data;
    },

    async getProfile() {
      return await API.request('/auth/profile', { method: 'GET' });
    },

    async updateProfile(userData) {
      return await API.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },

    logout() {
      API.clearAuth();
    },
  },

  // --- Locations Endpoints ---
  locations: {
    async getAll() {
      return await API.request('/locations', { method: 'GET' });
    },

    async getById(id) {
      return await API.request(`/locations/${id}`, { method: 'GET' });
    },

    async create(locationData) {
      return await API.request('/locations', {
        method: 'POST',
        body: JSON.stringify(locationData),
      });
    },

    async update(id, locationData) {
      return await API.request(`/locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(locationData),
      });
    },

    async delete(id) {
      return await API.request(`/locations/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // --- Slots Endpoints ---
  slots: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/slots?${query}` : '/slots';
      return await API.request(endpoint, { method: 'GET' });
    },

    async getById(id) {
      return await API.request(`/slots/${id}`, { method: 'GET' });
    },

    async create(slotData) {
      return await API.request('/slots', {
        method: 'POST',
        body: JSON.stringify(slotData),
      });
    },

    async update(id, slotData) {
      return await API.request(`/slots/${id}`, {
        method: 'PUT',
        body: JSON.stringify(slotData),
      });
    },

    async delete(id) {
      return await API.request(`/slots/${id}`, {
        method: 'DELETE',
      });
    },

    async toggleStatus(id) {
      return await API.request(`/slots/${id}/toggle`, {
        method: 'PUT',
      });
    },
  },

  // --- Bookings Endpoints ---
  bookings: {
    async create(bookingData) {
      return await API.request('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
    },

    async getMy() {
      return await API.request('/bookings/my', { method: 'GET' });
    },

    async getById(id) {
      return await API.request(`/bookings/${id}`, { method: 'GET' });
    },

    async updateStatus(id, status) {
      return await API.request(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },

    async cancel(id, reason = 'Cancelled by user') {
      return await API.request(`/bookings/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    async getAllAdmin() {
      return await API.request('/bookings', { method: 'GET' });
    },
  },

  // --- Admin Analytics & Hardware Simulation ---
  admin: {
    async getStats() {
      return await API.request('/admin/stats', { method: 'GET' });
    },

    async simulateSensor(slotId, event) {
      return await API.request('/admin/simulate-sensor', {
        method: 'POST',
        body: JSON.stringify({ slotId, event }),
      });
    },
  },

  // --- Database Reseed Tool ---
  async reseed() {
    return await API.request('/seed', { method: 'POST' });
  },
};

window.API = API;
