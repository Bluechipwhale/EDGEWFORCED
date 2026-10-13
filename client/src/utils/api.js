import { api, request } from '../lib/api';

export async function apiRequest(path, method = 'GET', body = null) {
  const isFormData = body instanceof FormData;
  const options = {
    method,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
  };
  return request(path, options);
}

export { api, request };
export default api;
