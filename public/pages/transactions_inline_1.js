(async function init() {
      const me = await renderLayout('transactions', 'تنفيذ عملية بيع / شراء');
      if (!me) return;

      const body = document.getElementById('pageBody');
      let currentRate = null;

      async function loadRate() {
        try {
          const { data } = await api.get('/exchange-rates/current');
          currentRate = data;
        } catch (err) {
          currentRate = null;
        }
      }

      function calcTotal(type, usdId, rateId, resultId) {
        const usd = parseFloat(document.getElementById(usdId).value) || 0;
        const rateInput = document.getElementById(rateId).value;
        
        // Show/hide negative warning
        const warningEl = document.getElementById(type === 'BUY' ? 'buyNegativeWarning' : 'sellNegativeWarning');
        if (warningEl) {
          warningEl.style.display = usd < 0 ? 'block' : 'none';
        }

        // Update live text for USD input
        const usdTextElement = document.getElementById(usdId + 'Text');
        if (usdTextElement) {
          usdTextElement.innerText = usd !== 0 ? (numberToArabicWords(Math.abs(usd)) + " دولار أمريكي " + (usd < 0 ? "(سالب)" : "")) : '';
        }

        // Update live text for Rate input
        const rateTextElement = document.getElementById(rateId + 'Text');
        if (rateTextElement) {
          const parsedRate = parseFloat(rateInput) || 0;
          rateTextElement.innerText = parsedRate > 0 ? (numberToArabicWords(parsedRate) + " دينار عراقي لكل 100$") : '';
        }

        if (!type || (!currentRate && !rateInput)) return;
        
        const defaultPrice = currentRate ? (type === 'BUY' ? currentRate.buyPrice : currentRate.sellPrice) : 0;
        const price = rateInput ? (parseFloat(rateInput) / 100) : defaultPrice;
        
        const total = usd * price;
        if (usd !== 0) {
          document.getElementById(resultId).innerHTML =
            `<div style="font-size: 16px;">المبلغ الإجمالي: <strong dir="ltr">${formatMoney(total)}</strong> دينار (بسعر ${formatMoney(price)})</div>
             <div style="font-size: 13px; font-weight: normal; margin-top: 4px; color: #555;">${total < 0 ? 'سالب ' : ''}${numberToArabicWords(Math.abs(total))} دينار عراقي</div>`;
        } else {
          document.getElementById(resultId).innerHTML = '';
        }
      }

      await loadRate();

      body.innerHTML = `
        <div style="margin-bottom: 24px;">
          ${
            !currentRate
              ? `<div class="warning-msg" id="rateWarning" style="display:block; margin-bottom:0;">
          لا يوجد سعر صرف رسمي نشط حالياً. يرجى إدخال سعر الصرف يدوياً لكل 100$ لإتمام العملية.
        </div>`
              : `<div class="success-msg show" style="text-align: center; font-size: 18px; font-weight: bold;">السعر الحالي — شراء: ${formatMoney(currentRate.buyPrice)} | بيع: ${formatMoney(currentRate.sellPrice)}</div>`
          }
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
          <!-- BUY FORM -->
          <div class="panel" style="border-top: 4px solid var(--primary);">
            <div class="panel-header"><h3 style="color: var(--primary);">شراء دولار من الزبون</h3></div>
            <div class="error-msg" id="buyFormError"></div>
            <div class="success-msg" id="buyFormSuccess"></div>

            <form id="buyForm">
              <div class="form-group">
                <label>اسم الزبون (اختياري)</label>
                <input type="text" id="buyCustomerName" placeholder="اسم الزبون" />
              </div>

              <div class="form-group">
                <label>المبلغ (دولار)</label>
                <input type="number" id="buyUsdAmount" step="0.01" required placeholder="مثال: 500 أو -500" />
                <div id="buyUsdAmountText" style="color: #666; font-size: 12px; margin-top: 4px; min-height: 18px;"></div>
                <div id="buyNegativeWarning" class="warning-msg" style="display:none; font-size:12px; margin-top:5px; padding: 6px;">تنبيه: أنت تقوم بعملية شراء بالسالب (عكسية). سيتم سحب هذا الرصيد وتعزيز الصندوق به.</div>
              </div>

              <div class="form-group">
                <label>سعر الصرف لكل 100$</label>
                <input type="number" id="buyCustomRate" step="0.01" required />
                <div id="buyCustomRateText" style="color: #666; font-size: 12px; margin-top: 4px; min-height: 18px;"></div>
              </div>

              <div class="form-group">
                <label>ملاحظات (اختياري)</label>
                <textarea id="buyNotes" rows="2" placeholder="أي ملاحظات إضافية"></textarea>
              </div>

              <div id="buyCalcResult" style="margin-bottom:16px;color:var(--primary);font-size:14px;font-weight:bold;"></div>

              <button type="submit" class="btn btn-primary" id="buySubmitBtn" style="background: var(--primary); width: 100%; border: none;">
                تنفيذ عملية الشراء
              </button>
            </form>
          </div>

          <!-- SELL FORM -->
          <div class="panel" style="border-top: 4px solid #d4af37;">
            <div class="panel-header"><h3 style="color: #d4af37;">بيع دولار للزبون</h3></div>
            <div class="error-msg" id="sellFormError"></div>
            <div class="success-msg" id="sellFormSuccess"></div>

            <form id="sellForm">
              <div class="form-group">
                <label>اسم الزبون (اختياري)</label>
                <input type="text" id="sellCustomerName" placeholder="اسم الزبون" />
              </div>

              <div class="form-group">
                <label>المبلغ (دولار)</label>
                <input type="number" id="sellUsdAmount" step="0.01" required placeholder="مثال: 500 أو -500" />
                <div id="sellUsdAmountText" style="color: #666; font-size: 12px; margin-top: 4px; min-height: 18px;"></div>
                <div id="sellNegativeWarning" class="warning-msg" style="display:none; font-size:12px; margin-top:5px; padding: 6px;">تنبيه: أنت تقوم بعملية بيع بالسالب (عكسية). سيتم إيداع هذا الرصيد لتعزيز الصندوق.</div>
              </div>

              <div class="form-group">
                <label>سعر الصرف لكل 100$</label>
                <input type="number" id="sellCustomRate" step="0.01" required />
                <div id="sellCustomRateText" style="color: #666; font-size: 12px; margin-top: 4px; min-height: 18px;"></div>
              </div>

              <div class="form-group">
                <label>ملاحظات (اختياري)</label>
                <textarea id="sellNotes" rows="2" placeholder="أي ملاحظات إضافية"></textarea>
              </div>

              <div id="sellCalcResult" style="margin-bottom:16px;color:#d4af37;font-size:14px;font-weight:bold;"></div>

              <button type="submit" class="btn btn-primary" id="sellSubmitBtn" style="background: #d4af37; color: #062b1d; width: 100%; border: none;">
                تنفيذ عملية البيع
              </button>
            </form>
          </div>
        </div>
      `;

      function showWarning() {
        currentRate = null;
        document.getElementById('rateWarning').style.display = 'block';
        buySubmitBtn.disabled = false;
        sellSubmitBtn.disabled = false;
      }

      // Set values after rate loads
      if (currentRate) {
        const buyRate100 = currentRate.buyPrice * 100;
        const sellRate100 = currentRate.sellPrice * 100;
        document.getElementById('buyCustomRate').value = buyRate100;
        document.getElementById('sellCustomRate').value = sellRate100;
        
        calcTotal('BUY', 'buyUsdAmount', 'buyCustomRate', 'buyCalcResult');
        calcTotal('SELL', 'sellUsdAmount', 'sellCustomRate', 'sellCalcResult');
      }

      // Live calculation
      document.getElementById('buyUsdAmount').addEventListener('input', () => calcTotal('BUY', 'buyUsdAmount', 'buyCustomRate', 'buyCalcResult'));
      document.getElementById('buyCustomRate').addEventListener('input', () => calcTotal('BUY', 'buyUsdAmount', 'buyCustomRate', 'buyCalcResult'));
      
      document.getElementById('sellUsdAmount').addEventListener('input', () => calcTotal('SELL', 'sellUsdAmount', 'sellCustomRate', 'sellCalcResult'));
      document.getElementById('sellCustomRate').addEventListener('input', () => calcTotal('SELL', 'sellUsdAmount', 'sellCustomRate', 'sellCalcResult'));

      // Submit Buy Form
      document.getElementById('buyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formError = document.getElementById('buyFormError');
        const formSuccess = document.getElementById('buyFormSuccess');
        formError.classList.remove('show');
        formSuccess.classList.remove('show');

        const submitBtn = document.getElementById('buySubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري التنفيذ...';

        try {
          const usdAmount = parseFloat(document.getElementById('buyUsdAmount').value);
          
          if (usdAmount < 0) {
            if (!confirm('تنبيه: أنت تقوم بعملية شراء بالسالب، هل أنت متأكد من تنفيذ هذه العملية العكسية لتعزيز الصندوق؟')) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'تنفيذ عملية الشراء';
              return;
            }
          }

          const rawRate = parseFloat(document.getElementById('buyCustomRate').value);
          if (rawRate < 50000) {
            alert('خطأ: سعر الصرف المدخل غير منطقي! يرجى التأكد من كتابة الأصفار كاملة (مثلاً 150000 وليس 1500).');
            submitBtn.disabled = false;
            submitBtn.textContent = 'تنفيذ عملية الشراء';
            return;
          }

          const payload = {
            type: 'BUY',
            usdAmount,
            customRate: rawRate / 100,
            customerName: document.getElementById('buyCustomerName').value.trim() || undefined,
            notes: document.getElementById('buyNotes').value.trim() || undefined,
          };

          const { data } = await api.post('/transactions', payload);

          formSuccess.textContent = `تم تنفيذ عملية الشراء بنجاح — رقم العملية: ${data.id} | المبلغ: ${formatMoney(data.iqdAmount)} دينار`;
          formSuccess.classList.add('show');
          document.getElementById('buyForm').reset();
          document.getElementById('buyCalcResult').innerHTML = '';
        } catch (err) {
          formError.textContent = err.message;
          formError.classList.add('show');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'تنفيذ عملية الشراء';
        }
      });

      // Submit Sell Form
      document.getElementById('sellForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formError = document.getElementById('sellFormError');
        const formSuccess = document.getElementById('sellFormSuccess');
        formError.classList.remove('show');
        formSuccess.classList.remove('show');

        const submitBtn = document.getElementById('sellSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري التنفيذ...';

        try {
          const usdAmount = parseFloat(document.getElementById('sellUsdAmount').value);
          
          if (usdAmount < 0) {
            if (!confirm('تنبيه: أنت تقوم بعملية بيع بالسالب، هل أنت متأكد من تنفيذ هذه العملية العكسية لتعزيز الصندوق؟')) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'تنفيذ عملية البيع';
              return;
            }
          }

          const rawRate = parseFloat(document.getElementById('sellCustomRate').value);
          if (rawRate < 50000) {
            alert('خطأ: سعر الصرف المدخل غير منطقي! يرجى التأكد من كتابة الأصفار كاملة (مثلاً 150000 وليس 1500).');
            submitBtn.disabled = false;
            submitBtn.textContent = 'تنفيذ عملية البيع';
            return;
          }

          const payload = {
            type: 'SELL',
            usdAmount,
            customRate: rawRate / 100,
            customerName: document.getElementById('sellCustomerName').value.trim() || undefined,
            notes: document.getElementById('sellNotes').value.trim() || undefined,
          };

          const { data } = await api.post('/transactions', payload);

          formSuccess.textContent = `تم تنفيذ عملية البيع بنجاح — رقم العملية: ${data.id} | المبلغ: ${formatMoney(data.iqdAmount)} دينار`;
          formSuccess.classList.add('show');
          document.getElementById('sellForm').reset();
          document.getElementById('sellCalcResult').innerHTML = '';
        } catch (err) {
          formError.textContent = err.message;
          formError.classList.add('show');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'تنفيذ عملية البيع';
        }
      });
    })();