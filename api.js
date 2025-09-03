const api = {
  async request(method, url, data = null, token = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };
    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Something went wrong');
    }
    try {
      // Some endpoints might not return JSON (e.g., successful exports)
      return await response.json();
    } catch (e) {
      return response; // Return the response object directly if no JSON
    }
  },

  async login(username, password, API_BASE_URL) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
    return response.json();
  },

  async register(username, email, password, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/register`, { username, email, password });
  },

  // --- NEW: Password Reset Functions ---
  async forgotPassword(email, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/forgot-password`, { email });
  },

  async resetPassword(token, newPassword, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/reset-password`, { token, new_password: newPassword });
  },

  async getDomains(token, API_BASE_URL) {
    return this.request('GET', `${API_BASE_URL}/domains`, null, token);
  },

  async generateData(domain, rows, custom_prompt, constraints, token, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/generate`, { domain, rows, custom_prompt, constraints }, token);
  },

  async generateRelationalData(tables, global_constraints, token, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/generate/relational`, { tables, global_constraints }, token);
  },

  async getHistory(token, API_BASE_URL) {
    return this.request('GET', `${API_BASE_URL}/history`, null, token);
  },

  async augmentData(augmentRequest, token, API_BASE_URL) {
    return this.request('POST', `${API_BASE_URL}/augment`, augmentRequest, token);
  },

  // --- UPDATED: Export function
  async exportData(format, domain, rows, custom_prompt, token, API_BASE_URL) {
    let url = `${API_BASE_URL}/export/${format}?domain=${domain}&rows=${rows}`;
    if (custom_prompt) {
      url += `&custom_prompt=${encodeURIComponent(custom_prompt)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Something went wrong during export');
    }

    return response;
  }
};

export { api };
