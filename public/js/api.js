// ==================== طبقة الاتصال بالـ API ====================
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // إرسال الكوكيز (JWT) تلقائيًا
  };
  if (options.body) config.body = JSON.stringify(options.body);

  let response = await fetch(`${API_BASE}${endpoint}`, config);

  // محاولة تحديث الجلسة تلقائيًا عند انتهاء صلاحية التوكن
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      response = await fetch(`${API_BASE}${endpoint}`, config);
    } else {
      if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = '/index.html';
      }
      return Promise.reject(new Error('انتهت الجلسة'));
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw { status: response.status, message: data.message || 'حدث خطأ غير متوقع', details: data.details };
  }
  return data;
}

const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

function formatMoney(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('ar-IQ', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}
