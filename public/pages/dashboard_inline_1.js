(async function init() {
      const me = await renderLayout('dashboard', 'لوحة التحكم');
      if (!me) return;

      const body = document.getElementById('pageBody');
      body.innerHTML = `<div class="loading">جاري تحميل البيانات...</div>`;

      function tafqeet(num) {
        if (num === 0 || isNaN(num)) return "صفر";
        let prefix = num < 0 ? "سالب " : "";
        num = Math.abs(Math.floor(num));
        const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر"];
        const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
        const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

        function convertBelow100(n) {
          if (n <= 12) return ones[n];
          if (n < 20) return ones[n % 10] + " " + tens[1];
          let t = Math.floor(n / 10);
          let o = n % 10;
          if (o === 0) return tens[t];
          if (o === 1) return "واحد و" + tens[t];
          if (o === 2) return "اثنان و" + tens[t];
          return ones[o] + " و" + tens[t];
        }

        function convertBelow1000(n) {
          let h = Math.floor(n / 100);
          let rem = n % 100;
          if (h === 0) return convertBelow100(rem);
          let hStr = hundreds[h];
          if (rem === 0) return hStr;
          return hStr + " و" + convertBelow100(rem);
        }

        function convertGroup(n, unitName, unitPlural, dualName) {
          if (n === 0) return "";
          if (n === 1) return unitName;
          if (n === 2) return dualName;
          if (n >= 3 && n <= 10) return convertBelow1000(n) + " " + unitPlural;
          return convertBelow1000(n) + " " + unitName;
        }

        let result = [];
        let trillions = Math.floor(num / 1000000000000);
        num = num % 1000000000000;
        let billions = Math.floor(num / 1000000000);
        num = num % 1000000000;
        let millions = Math.floor(num / 1000000);
        num = num % 1000000;
        let thousands = Math.floor(num / 1000);
        let remainder = num % 1000;

        if (trillions > 0) result.push(convertGroup(trillions, "تريليون", "تريليونات", "تريليونان"));
        if (billions > 0) result.push(convertGroup(billions, "مليار", "مليارات", "ملياران"));
        if (millions > 0) result.push(convertGroup(millions, "مليون", "ملايين", "مليونان"));
        if (thousands > 0) result.push(convertGroup(thousands, "ألف", "آلاف", "ألفان"));
        if (remainder > 0) result.push(convertBelow1000(remainder));

        return prefix + result.join(" و");
      }

      function renderDashboard(data) {
        body.innerHTML = `
          <div class="cards-grid">
            ${me.role === 'ADMIN' ? `
            <div class="stat-card success">
              <div class="label">أرباح اليوم</div>
              <div class="value">${formatMoney(data.todayProfit)}</div>
              <div class="sub" style="font-size: 13px; font-weight: bold; margin-top: 6px; color: var(--primary);">
                ${tafqeet(data.todayProfit)} دينار عراقي
              </div>
            </div>
            ` : ''}

            <div class="stat-card">
              <div class="label">مشتريات اليوم (دولار)</div>
              <div class="value" style="font-size: 24px; color: #2ecc71;">${formatMoney(data.todayBuyUsd || 0)}</div>
            </div>
            <div class="stat-card">
              <div class="label">مبيعات اليوم (دولار)</div>
              <div class="value" style="font-size: 24px; color: #e74c3c;">${formatMoney(data.todaySellUsd || 0)}</div>
            </div>

            <div class="stat-card">
              <div class="label">رصيد الصندوق (دولار)</div>
              <div class="value" style="font-size: 24px;">$${formatMoney(data.usdBalance)}</div>
              <div class="sub" style="font-size: 13px; font-weight: bold; margin-top: 6px; color: var(--primary);">
                ${tafqeet(data.usdBalance)} دولار أمريكي
              </div>
              ${data.usdDebt > 0 ? `<div style="font-size: 12px; color: #e74c3c; font-weight: bold; margin-top: 8px;">مطلوب للخزنة: $${formatMoney(data.usdDebt)}</div>` : ''}
            </div>
            <div class="stat-card">
              <div class="label">رصيد الصندوق (دينار)</div>
              <div class="value" style="font-size: 24px;">${formatMoney(data.iqdBalance)}</div>
              <div class="sub" style="font-size: 13px; font-weight: bold; margin-top: 6px; color: var(--primary);">
                ${tafqeet(data.iqdBalance)} دينار عراقي
              </div>
              ${data.iqdDebt > 0 ? `<div style="font-size: 12px; color: #e74c3c; font-weight: bold; margin-top: 8px;">مطلوب للخزنة: ${formatMoney(data.iqdDebt)} د.ع</div>` : ''}
            </div>



            ${me.role === 'ADMIN' ? `
            <div class="stat-card danger">
              <div class="label">عمليات الشراء اليوم</div>
              <div class="value">${data.buyCountToday}</div>
              <div class="sub" style="font-size: 13px; font-weight: bold; margin-top: 6px; color: var(--primary);">
                ${tafqeet(data.buyCountToday)} عملية
              </div>
            </div>
            <div class="stat-card danger">
              <div class="label">عمليات البيع اليوم</div>
              <div class="value">${data.sellCountToday}</div>
              <div class="sub" style="font-size: 13px; font-weight: bold; margin-top: 6px; color: var(--primary);">
                ${tafqeet(data.sellCountToday)} عملية
              </div>
            </div>
            ` : ''}
          </div>
          
          <div style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-outline" style="border-color: #3498db; color: #3498db; display: flex; align-items: center; gap: 8px;" onclick="window.location.reload()">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
              تحديث البيانات
            </button>
            ${me.role === 'ADMIN' ? `
            <button class="btn btn-primary" onclick="document.getElementById('addFundsModal').classList.add('show')">
              + إضافة للصندوق
            </button>
            <button class="btn btn-outline" style="border-color: #e74c3c; color: #e74c3c;" onclick="document.getElementById('removeFundsModal').classList.add('show')">
              - سحب من الصندوق
            </button>
            ` : ''}
          </div>

          <!-- Add Funds Modal (Active Treasury) -->
          <div class="modal-overlay" id="addFundsModal">
            <div class="modal">
              <div class="modal-header">
                <h3>إضافة أموال للصندوق (الخزينة النشطة)</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('addFundsModal').classList.remove('show')">&times;</button>
              </div>
              <form id="addFundsForm">
                <div style="display:flex; gap:16px; margin-bottom: 12px;">
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ بالدولار ($)</label>
                    <input type="number" id="fundUsd" step="0.01" />
                    <div id="fundUsdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ بالدينار (د.ع)</label>
                    <input type="number" id="fundIqd" step="0.01" />
                    <div id="fundIqdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                </div>
                <div class="modal-actions">
                  <button type="submit" class="btn btn-primary">حفظ الإضافة</button>
                  <button type="button" class="btn btn-outline" onclick="document.getElementById('addFundsModal').classList.remove('show')">إلغاء</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Remove Funds Modal (Active Treasury) -->
          <div class="modal-overlay" id="removeFundsModal">
            <div class="modal">
              <div class="modal-header">
                <h3 style="color: #e74c3c;">سحب أموال من الصندوق</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('removeFundsModal').classList.remove('show')">&times;</button>
              </div>
              <form id="removeFundsForm">
                <div style="display:flex; gap:16px; margin-bottom: 12px;">
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ المراد سحبه بالدولار ($)</label>
                    <input type="number" id="removeUsd" step="0.01" />
                    <div id="removeUsdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ المراد سحبه بالدينار (د.ع)</label>
                    <input type="number" id="removeIqd" step="0.01" />
                    <div id="removeIqdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                </div>
                <div class="modal-actions">
                  <button type="submit" class="btn btn-primary" style="background: #e74c3c; border: none;">تأكيد السحب</button>
                  <button type="button" class="btn btn-outline" onclick="document.getElementById('removeFundsModal').classList.remove('show')">إلغاء</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Add Vault Modal -->
          <div class="modal-overlay" id="addVaultModal">
            <div class="modal">
              <div class="modal-header">
                <h3 style="color: #8e44ad;">إيداع في الخزنة الرئيسية</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('addVaultModal').classList.remove('show')">&times;</button>
              </div>
              <form id="addVaultForm">
                <div style="display:flex; gap:16px; margin-bottom: 12px;">
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ بالدولار ($)</label>
                    <input type="number" id="vaultFundUsd" step="0.01" />
                    <div id="vaultFundUsdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ بالدينار (د.ع)</label>
                    <input type="number" id="vaultFundIqd" step="0.01" />
                    <div id="vaultFundIqdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                </div>
                <div class="modal-actions">
                  <button type="submit" class="btn btn-primary" style="background: #8e44ad; border-color: #8e44ad;">حفظ الإيداع</button>
                  <button type="button" class="btn btn-outline" onclick="document.getElementById('addVaultModal').classList.remove('show')">إلغاء</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Remove Vault Modal -->
          <div class="modal-overlay" id="removeVaultModal">
            <div class="modal">
              <div class="modal-header">
                <h3 style="color: #8e44ad;">سحب من الخزنة الرئيسية</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('removeVaultModal').classList.remove('show')">&times;</button>
              </div>
              <form id="removeVaultForm">
                <div style="display:flex; gap:16px; margin-bottom: 12px;">
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ المراد سحبه بالدولار ($)</label>
                    <input type="number" id="vaultRemoveUsd" step="0.01" />
                    <div id="vaultRemoveUsdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                  <div class="form-group" style="flex:1; margin-bottom: 0;">
                    <label>المبلغ المراد سحبه بالدينار (د.ع)</label>
                    <input type="number" id="vaultRemoveIqd" step="0.01" />
                    <div id="vaultRemoveIqdText" style="color: #666; font-size: 11px; margin-top: 4px; min-height: 16px;"></div>
                  </div>
                </div>
                <div class="modal-actions">
                  <button type="submit" class="btn btn-primary" style="background: #8e44ad; border-color: #8e44ad;">تأكيد السحب</button>
                  <button type="button" class="btn btn-outline" onclick="document.getElementById('removeVaultModal').classList.remove('show')">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
          ` : ''}

          ${me.role === 'ADMIN' ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
            <div class="panel" style="border-top: 4px solid #2ecc71; margin-bottom: 0;">
              <div class="panel-header"><h3 style="color: #2ecc71;">آخر عمليات الشراء</h3></div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th><th>المبلغ ($)</th><th>سعر الصرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      data.lastTransactions.filter(t => t.type === 'BUY').length === 0
                        ? `<tr><td colspan="3" class="empty-state">لا توجد عمليات شراء بعد</td></tr>`
                        : data.lastTransactions
                            .filter(t => t.type === 'BUY')
                            .map(
                              (t) => `
                      <tr>
                        <td>${t.customerName || '-'}</td>
                        <td style="color: #2ecc71; font-weight: bold;">$${formatMoney(t.usdAmount)}</td>
                        <td>${formatMoney(t.unitPrice)}</td>
                      </tr>`
                            )
                            .join('')
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="panel" style="border-top: 4px solid #e74c3c; margin-bottom: 0;">
              <div class="panel-header"><h3 style="color: #e74c3c;">آخر عمليات البيع</h3></div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th><th>المبلغ ($)</th><th>سعر الصرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      data.lastTransactions.filter(t => t.type === 'SELL').length === 0
                        ? `<tr><td colspan="3" class="empty-state">لا توجد عمليات بيع بعد</td></tr>`
                        : data.lastTransactions
                            .filter(t => t.type === 'SELL')
                            .map(
                              (t) => `
                      <tr>
                        <td>${t.customerName || '-'}</td>
                        <td style="color: #e74c3c; font-weight: bold;">$${formatMoney(t.usdAmount)}</td>
                        <td>${formatMoney(t.unitPrice)}</td>
                      </tr>`
                            )
                            .join('')
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ` : ''}
        `;

        // Attach event listeners after rendering
        if (me.role === 'ADMIN') {
          const form = document.getElementById('addFundsForm');
          if (form) {
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              try {
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                await api.post('/treasury/add-funds', {
                  usdAmount: document.getElementById('fundUsd').value || 0,
                  iqdAmount: document.getElementById('fundIqd').value || 0
                });
                alert('تمت إضافة الأموال للخزينة بنجاح');
                window.location.reload();
              } catch (err) {
                alert(err.message || 'حدث خطأ');
                e.target.querySelector('button').disabled = false;
              }
            });
          }

          const removeForm = document.getElementById('removeFundsForm');
          if (removeForm) {
            removeForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              try {
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                await api.post('/treasury/remove-funds', {
                  usdAmount: document.getElementById('removeUsd').value || 0,
                  iqdAmount: document.getElementById('removeIqd').value || 0
                });
                alert('تم سحب الأموال من الصندوق بنجاح');
                window.location.reload();
              } catch (err) {
                alert(err.message || 'حدث خطأ أثناء سحب الأموال');
                e.target.querySelector('button').disabled = false;
              }
            });
          }

          const addVaultForm = document.getElementById('addVaultForm');
          if (addVaultForm) {
            addVaultForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              try {
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                await api.post('/treasury/vault/add-funds', {
                  usdAmount: document.getElementById('vaultFundUsd').value || 0,
                  iqdAmount: document.getElementById('vaultFundIqd').value || 0
                });
                alert('تم الإيداع في الخزنة بنجاح');
                window.location.reload();
              } catch (err) {
                alert(err.message || 'حدث خطأ');
                e.target.querySelector('button').disabled = false;
              }
            });
          }

          const removeVaultForm = document.getElementById('removeVaultForm');
          if (removeVaultForm) {
            removeVaultForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              try {
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                await api.post('/treasury/vault/remove-funds', {
                  usdAmount: document.getElementById('vaultRemoveUsd').value || 0,
                  iqdAmount: document.getElementById('vaultRemoveIqd').value || 0
                });
                alert('تم السحب من الخزنة بنجاح');
                window.location.reload();
              } catch (err) {
                alert(err.message || 'حدث خطأ أثناء سحب الأموال');
                e.target.querySelector('button').disabled = false;
              }
            });
          }

          // Live Tafqeet for modals
          const inputPairs = [
            { id: 'fundUsd', curr: 'دولار أمريكي' }, { id: 'fundIqd', curr: 'دينار عراقي' },
            { id: 'removeUsd', curr: 'دولار أمريكي' }, { id: 'removeIqd', curr: 'دينار عراقي' },
            { id: 'vaultFundUsd', curr: 'دولار أمريكي' }, { id: 'vaultFundIqd', curr: 'دينار عراقي' },
            { id: 'vaultRemoveUsd', curr: 'دولار أمريكي' }, { id: 'vaultRemoveIqd', curr: 'دينار عراقي' }
          ];
          inputPairs.forEach(pair => {
            const input = document.getElementById(pair.id);
            if (input) {
              input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                const textEl = document.getElementById(pair.id + 'Text');
                if (textEl) {
                  textEl.innerText = val > 0 ? (numberToArabicWords(val) + " " + pair.curr) : '';
                }
              });
            }
          });
        }
      }

      try {
        // Stale-While-Revalidate
        const cachedData = sessionStorage.getItem('dashboardData');
        if (cachedData) {
          renderDashboard(JSON.parse(cachedData));
        }

        const { data } = await api.get('/treasury/dashboard');
        sessionStorage.setItem('dashboardData', JSON.stringify(data));
        renderDashboard(data);

      } catch (err) {
        body.innerHTML = `<div class="panel"><p class="error-msg show">${err.message}</p></div>`;
      }
    })();