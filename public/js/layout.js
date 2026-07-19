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
    const res = await api.get('/auth/me');
    me = res.data;
  } catch {
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
          <div class="icon">ص</div>
          <div>
            <h2>نظام الصيرفة</h2>
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
    await api.post('/auth/logout');
    window.location.href = '/index.html';
  });

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  return me;
}
