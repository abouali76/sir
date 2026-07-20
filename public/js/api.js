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

const TAFQEET_UNITS = ["", "ألف", "مليون", "مليار", "ترليون"];
const TAFQEET_ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TAFQEET_TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const TAFQEET_HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function numberToArabicWords(number) {
  if (number === 0) return "صفر";
  let numStr = Math.floor(Math.abs(number)).toString();
  let parts = [];
  while (numStr.length > 0) {
    parts.push(numStr.slice(-3));
    numStr = numStr.slice(0, -3);
  }
  let words = [];
  for (let i = 0; i < parts.length; i++) {
    let p = parseInt(parts[i], 10);
    if (p === 0) continue;
    let partWords = [];
    let h = Math.floor(p / 100);
    let rem = p % 100;
    if (h > 0) partWords.push(TAFQEET_HUNDREDS[h]);
    if (rem > 0) {
      if (rem < 20) partWords.push(TAFQEET_ONES[rem]);
      else {
        let t = Math.floor(rem / 10);
        let o = rem % 10;
        if (o > 0) partWords.push(TAFQEET_ONES[o] + " و" + TAFQEET_TENS[t]);
        else partWords.push(TAFQEET_TENS[t]);
      }
    }
    let pStr = partWords.join(" و");
    if (i > 0) {
      if (p === 1) pStr = TAFQEET_UNITS[i];
      else if (p === 2) pStr = (i === 1 ? "ألفان" : TAFQEET_UNITS[i] + "ان");
      else if (p >= 3 && p <= 10) pStr += " " + (i === 1 ? "آلاف" : TAFQEET_UNITS[i] + "ات");
      else pStr += " " + TAFQEET_UNITS[i];
    }
    words.unshift(pStr);
  }
  return words.join(" و");
}

function renderMoneyWithTafqeet(amount, currency = 'دينار', align = 'flex-start') {
  if (amount === undefined || amount === null || isNaN(amount)) return '-';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = formatMoney(absAmount);
  const text = numberToArabicWords(absAmount) + " " + currency;
  return `
    <div style="display: flex; flex-direction: column; align-items: ${align}; gap: 2px; width: 100%;">
      <span style="direction: ltr;">${isNegative ? '-' : ''}${currency === 'دولار' ? '$' : ''}${formatted}</span>
      <small style="color: #666; font-size: 11px; font-weight: normal; line-height: 1.2; text-align: center;">
        ${isNegative ? 'سالب ' : ''}${text}
      </small>
    </div>
  `;
}
