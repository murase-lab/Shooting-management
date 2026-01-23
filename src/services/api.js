// API Client for Cloudflare D1/R2

const API_BASE = '/api';

// Helper to get auth headers
const getAuthHeaders = (userId) => ({
  'Content-Type': 'application/json',
  'X-User-Id': userId || 'anonymous',
});

// Generic fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(options.userId),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Projects API
export const projectsApi = {
  getAll: (userId) => apiFetch('/projects', { userId }),

  getById: (userId, id) => apiFetch(`/projects/${id}`, { userId }),

  create: (userId, project) => apiFetch('/projects', {
    method: 'POST',
    userId,
    body: JSON.stringify(project),
  }),

  update: (userId, id, project) => apiFetch(`/projects/${id}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify(project),
  }),

  delete: (userId, id) => apiFetch(`/projects/${id}`, {
    method: 'DELETE',
    userId,
  }),
};

// Models API
export const modelsApi = {
  getAll: (userId) => apiFetch('/models', { userId }),

  getById: (userId, id) => apiFetch(`/models/${id}`, { userId }),

  create: (userId, model) => apiFetch('/models', {
    method: 'POST',
    userId,
    body: JSON.stringify(model),
  }),

  update: (userId, id, model) => apiFetch(`/models/${id}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify(model),
  }),

  delete: (userId, id) => apiFetch(`/models/${id}`, {
    method: 'DELETE',
    userId,
  }),
};

// Sync API
export const syncApi = {
  syncAll: (userId, data) => apiFetch('/sync', {
    method: 'POST',
    userId,
    body: JSON.stringify(data),
  }),
};

// Image upload API
export const imagesApi = {
  upload: async (userId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/images/upload`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId || 'anonymous',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  },
};

export default {
  projects: projectsApi,
  models: modelsApi,
  sync: syncApi,
  images: imagesApi,
};
