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
      return await response.json();
    } catch (e) {
      return response;
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

  // UPDATED EXPORT FUNCTION with better error handling and debugging
  async exportData(format, domain, rows, custom_prompt, token, API_BASE_URL) {
    let url = `${API_BASE_URL}/export/${format}?domain=${domain}&rows=${rows}`;
    if (custom_prompt) {
      url += `&custom_prompt=${encodeURIComponent(custom_prompt)}`;
    }

    console.log('🔍 Export URL:', url);
    console.log('🔍 Export format:', format);
    console.log('🔍 Export token:', token ? 'Present' : 'Missing');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔍 Export response status:', response.status);
      console.log('🔍 Export response headers:', Object.fromEntries(response.headers.entries()));

      // CHECK CONTENT TYPE
      const contentType = response.headers.get('content-type');
      console.log('🔍 Content-Type:', contentType);
    
      // CHECK CONTENT LENGTH  
      const contentLength = response.headers.get('content-length');
      console.log('🔍 Content-Length:', contentLength);
    
      // CHECK CONTENT DISPOSITION
      const contentDisposition = response.headers.get('content-disposition');
      console.log('🔍 Content-Disposition:', contentDisposition);


      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
          console.error('🔍 Export error data:', errorData);
        } catch {
          // Response might not be JSON for binary data
          console.log('🔍 Export error: Response not JSON (possibly binary data error)');
        }
        throw new Error(errorDetail);
      }

      // PEEK AT THE RESPONSE CONTENT (first 100 characters)
      const responseClone = response.clone();
      try {
        const text = await responseClone.text();
        console.log('🔍 Response preview (first 100 chars):', text.substring(0, 100));
      } catch (e) {
        console.log('🔍 Could not preview response content');
      }

      console.log('🔍 Export response successful');
      return response; // Return the response for blob handling
    } catch (error) {
      console.error('🔍 Export API error:', error);
      throw error;
    }
  }
};

export { api };


