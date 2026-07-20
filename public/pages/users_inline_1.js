(async function init() {
      const me = await renderLayout('users', 'إدارة المستخدمين');
      if (!me) return;
      if (me.role !== 'ADMIN') {
        document.getElementById('pageBody').innerHTML = `<div class="error-msg show">هذه الصفحة مخصصة للمدير فقط</div>`;
        return;
      }

      const body = document.getElementById('pageBody');
      body.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <h3>قائمة المستخدمين</h3>
            <button class="btn btn-primary btn-sm" id="addUserBtn">+ مستخدم جديد</button>
          </div>
          <div class="table-wrap" id="usersContainer"><div class="loading">جاري التحميل...</div></div>
        </div>

        <div class="modal-overlay" id="userModal">
          <div class="modal">
            <div class="modal-header">
              <h3 id="modalTitle">مستخدم جديد</h3>
              <button class="close-btn" id="closeUserModal">×</button>
            </div>
            <div class="error-msg" id="userFormError"></div>
            <form id="userForm">
              <input type="hidden" id="userId" />
              <div class="form-group">
                <label>اسم المستخدم</label>
                <input type="text" id="username" required autocomplete="username" />
              </div>
              <div class="form-group">
                <label>الاسم الكامل</label>
                <input type="text" id="fullName" required autocomplete="name" />
              </div>
              <div class="form-group" id="passwordGroup">
                <label>كلمة المرور</label>
                <input type="password" id="password" autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label>الصلاحية</label>
                <select id="role">
                  <option value="EMPLOYEE">موظف</option>
                  <option value="ADMIN">مدير</option>
                </select>
              </div>
              <div class="form-group" id="statusGroup" style="display:none;">
                <label style="display:flex;align-items:center;gap:8px;font-weight:normal;">
                  <input type="checkbox" id="isActive" style="width:auto;" /> الحساب مفعّل
                </label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-outline" id="cancelUser">إلغاء</button>
                <button type="submit" class="btn btn-primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      `;

      function loadUsers() {
        const container = document.getElementById('usersContainer');
        api.get('/users').then(({ data }) => {
          container.innerHTML = `
            <table>
              <thead><tr><th>اسم المستخدم</th><th>الاسم الكامل</th><th>الصلاحية</th><th>الحالة</th><th>آخر دخول</th><th>إجراءات</th></tr></thead>
              <tbody>
                ${data.map((u) => `
                  <tr>
                    <td>${u.username}</td>
                    <td>${u.fullName}</td>
                    <td>${u.role.name === 'ADMIN' ? 'مدير' : 'موظف'}</td>
                    <td><span class="badge ${u.isActive ? 'badge-active' : 'badge-inactive'}">${u.isActive ? 'مفعّل' : 'معطّل'}</span></td>
                    <td>${u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick='openEditUser(${JSON.stringify(u)})'>تعديل</button>
                      ${u.isActive ? `<button class="btn btn-danger btn-sm" style="background:#e74c3c;border:none;" onclick="deactivateUser(${u.id})">حذف</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }).catch(err => {
          container.innerHTML = `<div class="error-msg show">${err.message}</div>`;
        });
      }

      function openModal(isEdit) {
        document.getElementById('modalTitle').textContent = isEdit ? 'تعديل مستخدم' : 'مستخدم جديد';
        document.getElementById('passwordGroup').style.display = 'block';
        document.getElementById('passwordGroup').querySelector('label').textContent = isEdit ? 'كلمة المرور الجديدة (اتركه فارغاً لعدم التغيير)' : 'كلمة المرور';
        document.getElementById('password').required = !isEdit;
        document.getElementById('password').value = '';
        document.getElementById('username').disabled = isEdit;
        document.getElementById('statusGroup').style.display = isEdit ? 'block' : 'none';
        document.getElementById('userFormError').classList.remove('show');
        document.getElementById('userModal').classList.add('show');
      }

      document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        openModal(false);
      });

      window.openEditUser = (u) => {
        document.getElementById('userId').value = u.id;
        document.getElementById('username').value = u.username;
        document.getElementById('fullName').value = u.fullName;
        document.getElementById('role').value = u.role.name;
        document.getElementById('isActive').checked = u.isActive;
        openModal(true);
      };

      window.deactivateUser = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
          await api.delete(`/users/${id}`);
          loadUsers();
        } catch (err) {
          alert(err.message);
        }
      };

      document.getElementById('closeUserModal').addEventListener('click', () => document.getElementById('userModal').classList.remove('show'));
      document.getElementById('cancelUser').addEventListener('click', () => document.getElementById('userModal').classList.remove('show'));

      document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('userId').value;
        const errBox = document.getElementById('userFormError');
        const passVal = document.getElementById('password').value;
        errBox.classList.remove('show');

        try {
          if (id) {
            const payload = {
              fullName: document.getElementById('fullName').value.trim(),
              role: document.getElementById('role').value,
              isActive: document.getElementById('isActive').checked,
            };
            if (passVal) payload.password = passVal;
            await api.patch(`/users/${id}`, payload);
          } else {
            await api.post('/users', {
              username: document.getElementById('username').value.trim(),
              fullName: document.getElementById('fullName').value.trim(),
              password: passVal,
              role: document.getElementById('role').value,
            });
          }
          document.getElementById('userModal').classList.remove('show');
          loadUsers();
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.add('show');
        }
      });

      loadUsers();
    })();