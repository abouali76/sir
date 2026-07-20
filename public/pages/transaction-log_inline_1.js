(async function init() {
      const me = await renderLayout('log', 'سجل العمليات');
      if (!me) return;

      const isAdmin = me.role === 'ADMIN';
      const body = document.getElementById('pageBody');
      let state = { page: 1, limit: 15, type: '', search: '', sortBy: 'transactionDate', sortOrder: 'desc' };

      body.innerHTML = `
        <div class="panel">
          <div class="toolbar">
            <input type="text" id="searchInput" placeholder="بحث باسم الزبون أو الملاحظات..." style="min-width:220px;" />
            <select id="typeFilter">
              <option value="">كل الأنواع</option>
              <option value="BUY">شراء</option>
              <option value="SELL">بيع</option>
            </select>
            <select id="sortBySelect">
              <option value="transactionDate">التاريخ</option>
              <option value="usdAmount">الكمية</option>
              <option value="profit">الربح</option>
            </select>
            <select id="sortOrderSelect">
              <option value="desc">تنازلي</option>
              <option value="asc">تصاعدي</option>
            </select>
            ${isAdmin ? `<button class="btn btn-danger" style="margin-right: auto;" onclick="wipeAllTransactions()">تصفير السجل والصندوق بالكامل</button>` : ''}
          </div>
          <div id="tableContainer" class="table-wrap"><div class="loading">جاري التحميل...</div></div>
          <div class="pagination" id="pagination"></div>
        </div>

        <div class="modal-overlay" id="editModal">
          <div class="modal">
            <div class="modal-header">
              <h3>تعديل العملية</h3>
              <button class="close-btn" id="closeEditModal">×</button>
            </div>
            <form id="editForm">
              <input type="hidden" id="editId" />
              <div class="form-group">
                <label>اسم الزبون</label>
                <input type="text" id="editCustomerName" />
              </div>
              <div class="form-group">
                <label>ملاحظات</label>
                <textarea id="editNotes" rows="3"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-outline" id="cancelEdit">إلغاء</button>
                <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      `;

      async function loadData() {
        const container = document.getElementById('tableContainer');
        container.innerHTML = `<div class="loading">جاري التحميل...</div>`;

        const params = new URLSearchParams({
          page: state.page, limit: state.limit, sortBy: state.sortBy, sortOrder: state.sortOrder,
          ...(state.type ? { type: state.type } : {}),
          ...(state.search ? { search: state.search } : {}),
        });

        try {
          const res = await api.get(`/transactions?${params}`);
          const { data, pagination } = res;

          if (data.length === 0) {
            container.innerHTML = `<div class="empty-state">لا توجد عمليات مطابقة</div>`;
          } else {
            container.innerHTML = `
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>النوع</th><th>الزبون</th><th>الكمية ($)</th><th>السعر</th>
                    <th>المبلغ (د.ع)</th><th>الربح</th><th>الموظف</th><th>التاريخ</th><th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map((t, i) => `
                    <tr>
                      <td>${(state.page - 1) * state.limit + i + 1}</td>
                      <td><span class="badge ${t.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.type === 'BUY' ? 'شراء' : 'بيع'}</span></td>
                      <td>${t.customerName || '-'}</td>
                      <td>${renderMoneyWithTafqeet(t.usdAmount, 'دولار')}</td>
                      <td>${formatMoney(t.unitPrice)}</td>
                      <td>${renderMoneyWithTafqeet(t.iqdAmount, 'دينار')}</td>
                      <td>${t.type === 'SELL' ? renderMoneyWithTafqeet(t.profit, 'دينار') : '-'}</td>
                      <td>${t.employee ? t.employee.fullName : '<span style="color:#e74c3c">مستخدم محذوف</span>'}</td>
                      <td>${formatDate(t.transactionDate)}</td>
                      <td>
                        <button class="btn btn-outline btn-sm" onclick='openEdit(${JSON.stringify({ id: t.id, customerName: t.customerName, notes: t.notes })})'>تعديل</button>
                        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteTx(${t.id})">حذف</button>` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }

          renderPagination(pagination);
        } catch (err) {
          container.innerHTML = `<div class="error-msg show">${err.message}</div>`;
        }
      }

      function renderPagination(pagination) {
        const el = document.getElementById('pagination');
        if (!pagination || pagination.totalPages <= 1) { el.innerHTML = ''; return; }
        let html = '';
        for (let i = 1; i <= pagination.totalPages; i++) {
          html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        }
        el.innerHTML = html;
      }

      window.changePage = (p) => { state.page = p; loadData(); };

      window.openEdit = (tx) => {
        document.getElementById('editId').value = tx.id;
        document.getElementById('editCustomerName').value = tx.customerName || '';
        document.getElementById('editNotes').value = tx.notes || '';
        document.getElementById('editModal').classList.add('show');
      };

      window.deleteTx = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم عكس تأثيرها على الخزينة تلقائيًا.')) return;
        try {
          await api.delete(`/transactions/${id}`);
          loadData();
        } catch (err) {
          alert(err.message);
        }
      };

      window.wipeAllTransactions = async () => {
        const password = prompt('تحذير خطير!\nهذا الإجراء سيقوم بمسح جميع العمليات وتصفير الصندوق (الخزينة النشطة) والأرباح بالكامل.\n(لن يتم تصفير الخزنة الرئيسية).\n\nإذا كنت متأكداً، اكتب "تصفير" للتأكيد:');
        if (password !== 'تصفير') {
          if (password !== null) alert('تم إلغاء العملية، الكلمة غير صحيحة.');
          return;
        }
        
        if (!confirm('تأكيد نهائي: هل أنت متأكد بنسبة 100% أنك تريد تصفير السجل؟ لا يمكن التراجع عن هذا الإجراء!')) return;
        
        try {
          await api.post(`/transactions/wipe`, {});
          alert('تم تصفير السجل والصندوق بنجاح.');
          window.location.reload();
        } catch (err) {
          alert(err.message || 'حدث خطأ أثناء التصفير');
        }
      };

      document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editModal').classList.remove('show'));
      document.getElementById('cancelEdit').addEventListener('click', () => document.getElementById('editModal').classList.remove('show'));

      document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        try {
          await api.patch(`/transactions/${id}`, {
            customerName: document.getElementById('editCustomerName').value.trim() || undefined,
            notes: document.getElementById('editNotes').value.trim() || undefined,
          });
          document.getElementById('editModal').classList.remove('show');
          loadData();
        } catch (err) {
          alert(err.message);
        }
      });

      let searchTimeout;
      document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { state.search = e.target.value; state.page = 1; loadData(); }, 400);
      });
      document.getElementById('typeFilter').addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; loadData(); });
      document.getElementById('sortBySelect').addEventListener('change', (e) => { state.sortBy = e.target.value; loadData(); });
      document.getElementById('sortOrderSelect').addEventListener('change', (e) => { state.sortOrder = e.target.value; loadData(); });

      loadData();
    })();