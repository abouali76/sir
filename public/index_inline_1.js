const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');

    // إذا كان المستخدم مسجل دخوله مسبقًا، انتقل مباشرة للوحة التحكم
    api.get('/auth/me').then(() => {
      window.location.href = '/pages/dashboard.html';
    }).catch(() => {});

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.remove('show');
      loginBtn.disabled = true;
      loginBtn.textContent = 'جاري الدخول...';

      try {
        await api.post('/auth/login', {
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
        });
        window.location.href = '/pages/dashboard.html';
      } catch (err) {
        errorMsg.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول';
        errorMsg.classList.add('show');
        loginBtn.disabled = false;
        loginBtn.textContent = 'تسجيل الدخول';
      }
    });