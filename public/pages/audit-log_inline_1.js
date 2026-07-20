(async function init() {
      const me = await renderLayout('audit', 'سجل التدقيق');
      if (!me) return;
      if (me.role !== 'ADMIN') {
        document.getElementById('pageBody').innerHTML = `<div class="error-msg show">هذه الصفحة مخصصة للمدير فقط</div>`;
        return;
      }

      const actionLabels = {
        LOGIN: 'تسجيل دخول', LOGOUT: 'تسجيل خروج', LOGIN_FAILED: 'محاولة دخول فاشلة',
        PRICE_UPDATE: 'تحديث سعر', TRANSACTION_CREATE: 'إنشاء عملية', TRANSACTION_UPDATE: 'تعديل عملية',
        TRANSACTION_DELETE: 'حذف عملية', USER_CREATE: 'إنشاء مستخدم', USER_UPDATE: 'تعديل مستخدم',
        USER_DELETE: 'تعطيل مستخدم', SETTINGS_UPDATE: 'تحديث إعدادات',
      };

      const body = document.getElementById('pageBody');
      let page = 1;

      body.innerHTML = `
        <div class="panel">
          <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>سجل جميع العمليات الحساسة في النظام</h3>
            <div style="display: flex; gap: 10px;">
              <button id="printAuditBtn" class="btn btn-outline" style="padding: 6px 12px; font-size: 14px;" onclick="window.print()">
                🖨️ طباعة السجل
              </button>
              <button id="clearAuditBtn" class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); padding: 6px 12px; font-size: 14px;">
                🗑️ مسح السجل
              </button>
            </div>
          </div>
          <div class="table-wrap" id="auditContainer"><div class="loading">جاري التحميل...</div></div>
          <div class="pagination" id="pagination"></div>
        </div>
      `;

      async function loadLogs() {
        const container = document.getElementById('auditContainer');
        try {
          const res = await api.get(`/audit-logs?page=${page}&limit=25`);
          const { data, pagination } = res;

          if (data.length === 0) {
            container.innerHTML = `<div class="empty-state">لا يوجد سجل بعد</div>`;
          } else {
            container.innerHTML = `
              <table>
                <thead><tr><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th><th>عنوان IP</th><th>الوقت</th></tr></thead>
                <tbody>
                  ${data.map((log) => `
                    <tr>
                      <td>${log.user ? log.user.fullName : 'غير معروف'}</td>
                      <td>${actionLabels[log.action] || log.action}</td>
                      <td>${log.details || '-'}</td>
                      <td>${log.ipAddress || '-'}</td>
                      <td>${formatDate(log.createdAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }

          const pagEl = document.getElementById('pagination');
          if (pagination.totalPages > 1) {
            let html = '';
            for (let i = 1; i <= pagination.totalPages; i++) {
              html += `<button class="${i === page ? 'active' : ''}" onclick="changeAuditPage(${i})">${i}</button>`;
            }
            pagEl.innerHTML = html;
          }
        } catch (err) {
          container.innerHTML = `<div class="error-msg show">${err.message}</div>`;
        }
      }

      window.changeAuditPage = (p) => { page = p; loadLogs(); };

      document.getElementById('clearAuditBtn').addEventListener('click', async () => {
        if (!confirm('هل أنت متأكد من مسح جميع سجلات العمليات الحساسة؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
        
        try {
          await api.delete('/audit-logs');
          page = 1;
          loadLogs();
        } catch (err) {
          alert('حدث خطأ أثناء محاولة مسح السجل: ' + err.message);
        }
      });

      loadLogs();
    })();