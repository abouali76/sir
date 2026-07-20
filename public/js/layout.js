// ==================== بناء التخطيط المشترك (Sidebar + Navbar) ====================
const NAV_ITEMS = [
  { href: '/pages/dashboard.html', icon: '📊', label: 'لوحة التحكم', key: 'dashboard' },
  { href: '/pages/transactions.html', icon: '💵', label: 'بيع / شراء', key: 'transactions' },
  { href: '/pages/transaction-log.html', icon: '📒', label: 'سجل العمليات', key: 'log' },
  { href: '/pages/users.html', icon: '👥', label: 'إدارة المستخدمين', key: 'users', adminOnly: true },
  { href: '/pages/audit-log.html', icon: '🛡️', label: 'سجل التدقيق', key: 'audit', adminOnly: true },
];

async function renderLayout(activeKey, pageTitle) {
  let me;
  try {
    const cachedUser = sessionStorage.getItem('currentUser');
    if (cachedUser) {
      me = JSON.parse(cachedUser);
      // Validate in background
      api.get('/auth/me').then(res => {
        sessionStorage.setItem('currentUser', JSON.stringify(res.data));
      }).catch(() => {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/index.html';
      });
    } else {
      const res = await api.get('/auth/me');
      me = res.data;
      sessionStorage.setItem('currentUser', JSON.stringify(me));
    }
  } catch {
    sessionStorage.removeItem('currentUser');
    window.location.href = '/index.html';
    return null;
  }

  const isAdmin = me.role === 'ADMIN';
  const navHtml = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
    .map(
      (item) => `
      <a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}">
        <span>${item.icon}</span><span>${item.label}</span>
      </a>`
    )
    .join('');

  document.getElementById('app-shell').innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="icon" style="background: none; color: #f1c40f; font-size: 24px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2h4"/>
              <path d="M12 2v4"/>
              <path d="M8 22h8"/>
              <path d="M12 22v-4"/>
              <path d="M6.3 12c0-3.3 2.5-6 5.7-6h0c3.2 0 5.7 2.7 5.7 6 0 1.9-1 3.5-2.3 4.5l-.7.5V18h-6v-1l-.7-.5C6.7 15.5 6.3 13.9 6.3 12z"/>
              <path d="M9.5 12a2.5 2.5 0 0 1 5 0"/>
            </svg>
          </div>
          <div>
            <h2>السراج المنير</h2>
            <span>إدارة بيع وشراء العملة</span>
          </div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          <button id="logoutBtn">🚪 تسجيل الخروج</button>
        </div>
      </aside>
      <div class="main-content">
        <header class="navbar">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="menu-toggle" id="menuToggle">☰</button>
            <h1>${pageTitle}</h1>
          </div>
          <div class="user-badge">
            <div>
              <div style="font-weight:700;">${me.username}</div>
              <span class="role-tag">${isAdmin ? 'مدير' : 'موظف'}</span>
            </div>
            <div class="avatar" title="${isAdmin ? 'حساب مدير' : 'حساب موظف'}">
              ${me.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main class="page-body" id="pageBody"></main>
      </div>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    sessionStorage.removeItem('currentUser');
    await api.post('/auth/logout');
    window.location.href = '/index.html';
  });

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  return me;
}
