// ==============================================================================
// EDGEWFORCE - HTTP REST CLIENT WITH OFFLINE CACHING & AUTO-SYNC
// ==============================================================================

import { cacheApiResponse, getCachedApiResponse, enqueueOfflineAction } from './offline.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthToken() {
  const directToken = localStorage.getItem('ewf_token') || sessionStorage.getItem('ewf_token') || localStorage.getItem('token');
  if (directToken) return directToken;
  try {
    const rawSb = localStorage.getItem('ewf_supabase_auth');
    if (rawSb) {
      const parsed = JSON.parse(rawSb);
      const token = parsed?.access_token || parsed?.currentSession?.access_token;
      if (token) return token;
    }
  } catch {}
  return null;
}

export async function request(path, options = {}) {
  const method = options.method || 'GET';
  const requireOnline = options.requireOnline || /^\/(hr|locations|work-locations)(\/|\?|$)/.test(path) || /^\/(field\/(shifts|check-in|check-out)|employee\/(attendance|dashboard))/.test(path);
  if (requireOnline && !navigator.onLine) throw new Error('Connect to the internet to record attendance or manage staff and workplaces.');
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  // If completely offline and this is a GET request, serve directly from cache
  if (!navigator.onLine && method === 'GET') {
    const cached = await getCachedApiResponse(path);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  }

  // If offline and this is a mutation (POST/PUT), automatically queue
  if (!navigator.onLine && (method === 'POST' || method === 'PUT')) {
    let payload = {};
    if (typeof options.body === 'string') {
      try {
        payload = JSON.parse(options.body);
      } catch {
        payload = { raw: options.body };
      }
    } else if (isFormData) {
      options.body.forEach((val, key) => {
        payload[key] = val;
      });
    }

    await enqueueOfflineAction(path, method, payload, `Offline ${method} ${path}`);
    return {
      success: true,
      queued: true,
      message: 'Network offline. Action saved locally and will sync when internet returns.'
    };
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/me')) {
        if (json.error?.code === 'TOKEN_EXPIRED' || json.error?.code === 'USER_INACTIVE') {
          localStorage.removeItem('ewf_token');
          window.dispatchEvent(new CustomEvent('ewf_unauthorized'));
        }
      }
      const errorMsg = json.error?.message || json.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.code = json.error?.code || 'API_ERROR';
      err.status = res.status;
      throw err;
    }

    const data = json.data !== undefined ? json.data : json;

    // Cache successful GET responses for offline resilience
    if (method === 'GET' && !requireOnline) {
      cacheApiResponse(path, data);
    }

    return data;
  } catch (err) {
    // If network failure during GET, attempt cache fallback
    if (method === 'GET' && !requireOnline && !err.status) {
      const cached = await getCachedApiResponse(path);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }

    if (!navigator.onLine) {
      err.isOffline = true;
      err.message = 'No internet connection. Data will be synchronized when network returns.';
    }
    throw err;
  }
}

export const api = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options
  }),
  put: (path, body, options) => request(path, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options
  }),
  patch: (path, body, options) => request(path, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options
  }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options })
};

export async function apiRequest(path, method = 'GET', body = null, options = {}) {
  const upperMethod = method.toUpperCase();
  if (upperMethod === 'GET') {
    return api.get(path, options);
  }
  if (upperMethod === 'POST') {
    return api.post(path, body, options);
  }
  if (upperMethod === 'PUT') {
    return api.put(path, body, options);
  }
  if (upperMethod === 'PATCH') {
    return api.patch(path, body, options);
  }
  if (upperMethod === 'DELETE') {
    return api.delete(path, { body: body ? JSON.stringify(body) : undefined, ...options });
  }
  return request(path, { method: upperMethod, body: body ? JSON.stringify(body) : undefined, ...options });
}

