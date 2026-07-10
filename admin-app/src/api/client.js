async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function api(path, options = {}) {
  const opts = {
    credentials: 'include',
    ...options,
    headers: { ...(options.headers || {}) },
  };
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === 'object') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(path, opts).then(parseJson);
}

function formPost(path, formData, method = 'POST') {
  return fetch(path, { method, body: formData, credentials: 'include' }).then(parseJson);
}

export const adminApi = {
  me: () => api('/api/admin/me'),
  login: (password) => api('/api/admin/login', { method: 'POST', body: { password } }),
  loginGoogle: (idToken) =>
    api('/api/admin/login-google', { method: 'POST', body: { idToken } }),
  firebaseConfig: () => api('/api/admin/firebase-config'),
  logout: () => api('/api/admin/logout', { method: 'POST' }),
  changePassword: (current, next) =>
    api('/api/admin/password', { method: 'POST', body: { current, next } }),

  products: () => api('/api/admin/products'),
  product: (id) => api(`/api/admin/products/${encodeURIComponent(id)}`),
  createProduct: (fd) => formPost('/api/products', fd),
  updateProduct: (id, fd) => formPost(`/api/products/${encodeURIComponent(id)}`, fd, 'PUT'),
  deleteProduct: (id) => api(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  orderProducts: (ids) => api('/api/products/order', { method: 'PUT', body: { ids } }),

  categories: () => api('/api/categories'),
  addCategory: (name) => api('/api/categories', { method: 'POST', body: { name } }),
  deleteCategory: (name) =>
    api(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  newsList: () => api('/api/admin/news'),
  newsOne: (id) => api(`/api/admin/news/${encodeURIComponent(id)}`),
  createNews: (fd) => formPost('/api/news', fd),
  updateNews: (id, fd) => formPost(`/api/news/${encodeURIComponent(id)}`, fd, 'PUT'),
  deleteNews: (id) => api(`/api/news/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  resources: () => api('/api/admin/resources'),
  resource: (id) => api(`/api/admin/resources/${encodeURIComponent(id)}`),
  createResource: (fd) => formPost('/api/resources', fd),
  updateResource: (id, fd) => formPost(`/api/resources/${encodeURIComponent(id)}`, fd, 'PUT'),
  deleteResource: (id) => api(`/api/resources/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  inquiries: () => api('/api/inquiries'),
  inquiryRead: (id) => api(`/api/inquiries/${encodeURIComponent(id)}/read`, { method: 'PUT' }),
  updateInquiry: (id, body) =>
    api(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteInquiry: (id) =>
    api(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return formPost('/api/upload', fd);
  },
};

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return '';
  }
}

export function sizeStr(b) {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < 3) {
    n /= 1024;
    i++;
  }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + u[i];
}
