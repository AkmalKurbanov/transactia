const API_CONFIG = {
  key: '557e55cf33ce4ba9983b55b771d0b44b',
  get url() { return `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${this.key}`; }
};

let RATES = {};
fetch(API_CONFIG.url)
  .then(r => r.json())
  .then(d => { RATES = d.rates || {}; })
  .catch(err => console.error("API Error:", err));

const CalcCore = {
  convert(amount, from, to) {
    if (!RATES[from] || !RATES[to]) return 0;
    return amount * (Number(RATES[to]) / Number(RATES[from]));
  },
  getFiatRate(from, to) {
    const isRubSend = from === 'RUB';
    const foreign = isRubSend ? to : from;
    const marketPrice = this.convert(1, foreign, 'RUB');
    const markup = isRubSend ? 1.06 : 0.94; 
    let finalRate = Math.round((marketPrice * markup) * 100) / 100;
    return { final: finalRate };
  }
};

function syncToOtherTab(currentPanel, mode, value) {
  if (window._isSyncing) return;
  window._isSyncing = true;
  const otherPanel = document.querySelector(`.tabs__panel:not([data-name="${currentPanel.dataset.name}"])`);
  if (otherPanel) {
    const target = mode === 'send' ? '.js-fiat-send-amount, .js-crypto-send-amount' : '.js-fiat-receive-amount, .js-crypto-receive-amount';
    const input = otherPanel.querySelector(target);
    if (input) {
      input.value = value;
      input.dispatchEvent(new CustomEvent('input', { detail: { isSync: true } }));
    }
  }
  window._isSyncing = false;
}

function createCalculator({ panel, selectors, onRecalc }) {
  if (!panel) return;
  const els = {
    sendInput: panel.querySelector(selectors.sendInput),
    receiveInput: panel.querySelector(selectors.receiveInput),
    rate: panel.querySelector(selectors.rate),
    commission: panel.querySelector(selectors.commission),
    button: panel.querySelector(selectors.button),
    swap: panel.querySelector('.currency-transfer__icon')
  };

  let LAST_MODE = 'send';

  const run = (mode) => {
    if (mode) LAST_MODE = mode;
    const selects = panel.querySelectorAll('.cselect-js');
    if (selects.length < 2) return;
    const from = selects[0].querySelector('.cselect__code')?.textContent.trim();
    const to = selects[1].querySelector('.cselect__code')?.textContent.trim();
    if (!from || !to || !Object.keys(RATES).length) return;
    onRecalc({ els, from, to, mode: LAST_MODE });
  };

  els.sendInput?.addEventListener('input', (e) => {
    applyMask(e.target); run('send');
    if (!e.detail?.isSync) syncToOtherTab(panel, 'send', e.target.value);
  });
  els.receiveInput?.addEventListener('input', (e) => {
    applyMask(e.target); run('receive');
    if (!e.detail?.isSync) syncToOtherTab(panel, 'receive', e.target.value);
  });

  // Убрано зеркалирование: теперь свап меняет местами селекторы только в текущей панели
  els.swap?.addEventListener('click', () => {
    const selects = panel.querySelectorAll('.cselect-js');
    if (selects.length < 2) return;
    
    const fromCode = selects[0].querySelector('.cselect__code')?.textContent.trim();
    const isRubTop = fromCode === 'RUB';
    const rubValue = isRubTop ? els.sendInput.value : els.receiveInput.value;

    const s1 = selects[0], s2 = selects[1], p1 = s1.parentNode, p2 = s2.parentNode;
    const marker = document.createComment('swap');
    p1.replaceChild(marker, s1); p2.replaceChild(s1, s2); p1.replaceChild(s2, marker);
    
    if (isRubTop) {
      els.receiveInput.value = rubValue;
      run('receive');
    } else {
      els.sendInput.value = rubValue;
      run('send');
    }
  });

  const timer = setInterval(() => { 
    if (Object.keys(RATES).length) { 
      run('send'); 
      clearInterval(timer); 
    } 
  }, 200);
}

const initFiat = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-fiat-send-amount', receiveInput: '.js-fiat-receive-amount',
    rate: '.js-fiat-rate', commission: '.js-fiat-commission', button: '.js-fiat-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const { final: rate } = CalcCore.getFiatRate(from, to);
    const rawSend = getRaw(els.sendInput);
    const rawReceive = getRaw(els.receiveInput);
    const isRubSend = from === 'RUB';

    // Если пусто: считаем комиссию, скрываем курс, очищаем кнопку
    if (rawSend === 0 && rawReceive === 0) {
      let defaultFee = isRubSend ? 499 : (499 / rate);
      if (els.commission) els.commission.textContent = `${formatNum(defaultFee, isRubSend ? 0 : 2, true)} ${from}`;
      if (els.rate) els.rate.textContent = '';
      if (els.button) els.button.textContent = 'Перевести';
      return;
    }

    const val = getRaw(mode === 'send' ? els.sendInput : els.receiveInput);
    let pS, pR;
    if (mode === 'receive') {
      pR = val;
      pS = isRubSend ? val * rate : val / rate;
      setVal(els.sendInput, pS, 2);
    } else {
      pS = val;
      pR = isRubSend ? val / rate : val * rate;
      setVal(els.receiveInput, pR, 2);
    }

    const currentSend = getRaw(els.sendInput);
    const rubAmt = isRubSend ? currentSend : getRaw(els.receiveInput);
    
    let fee = 0;
    if (rubAmt < 5000) fee = isRubSend ? 499 : (499 / rate);
    else fee = currentSend * 0.10; 

    const feeF = Math.ceil(fee * 100) / 100;
    
    if (els.commission) els.commission.textContent = `${formatNum(feeF, isRubSend ? 0 : 2, true)} ${from}`;
    if (els.rate) els.rate.textContent = `1 ${isRubSend ? to : from} = ${formatNum(rate, 2, true)} RUB`;
    
    const total = Math.ceil(currentSend + feeF);
    if (els.button) els.button.textContent = `Перевести ${formatNum(total, 0, true)} ${from}`;
  }
});

const isCr = (c) => ['USDT', 'BTC', 'ETH', 'TON', 'BNB', 'TRX', 'SOL', 'LTC'].includes(c);
const initCrypto = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-crypto-send-amount', receiveInput: '.js-crypto-receive-amount',
    rate: '.js-crypto-rate', commission: '.js-crypto-commission', button: '.js-crypto-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const rawSend = getRaw(els.sendInput);
    const rawReceive = getRaw(els.receiveInput);
    
    if (rawSend === 0 && rawReceive === 0) {
      if (els.commission) els.commission.textContent = `0 ${from}`;
      if (els.rate) els.rate.textContent = '';
      if (els.button) els.button.textContent = 'Перевести';
      return;
    }

    // ВАЖНО: Вызываем твой метод, который сам решит: +6% или -6%
    // Если меняем RUB на USDT -> вернет рыночный * 1.06
    // Если меняем USDT на RUB -> вернет рыночный * 0.94
    const { final: rateWithMarkup } = CalcCore.getFiatRate(from, to);
    
    const val = getRaw(mode === 'send' ? els.sendInput : els.receiveInput);
    const isRubSend = from === 'RUB';

    let pS, pR;
    // Логика расчета:
    // Если шлем RUB: получаем USDT (RUB / курс)
    // Если шлем USDT: получаем RUB (USDT * курс)
    if (mode === 'send') {
      pS = val;
      pR = isRubSend ? (val / rateWithMarkup) : (val * rateWithMarkup);
      setVal(els.receiveInput, pR, isCr(to) ? 2 : 2);
    } else {
      pR = val;
      pS = isRubSend ? (val * rateWithMarkup) : (val / rateWithMarkup);
      setVal(els.sendInput, pS, isCr(from) ? 2 : 2);
    }

    if (els.commission) els.commission.textContent = `0 ${from}`;
    
    if (els.rate) {
      const crCode = isCr(from) ? from : to;
      const ftCode = isCr(from) ? to : from;
      // Всегда показываем курс 1 единицы крипты с учетом текущей наценки/уценки
      els.rate.textContent = `1 ${crCode} = ${formatNum(rateWithMarkup, 2, true)} ${ftCode}`;
    }

    const totalSend = Math.ceil(getRaw(els.sendInput));
    if (els.button) els.button.textContent = `Перевести ${formatNum(totalSend, 0, true)} ${from}`;
  }
});
function getRaw(el) { return el ? (Number(el.value.replace(/\s/g, '').replace(',', '.')) || 0) : 0; }

// Добавлен аргумент keepZero для возможности вывода "0" в тексте (комиссия), но не в инпутах
function formatNum(v, d = 2, keepZero = false) {
  if (v === '' || v === null || isNaN(v) || (v === 0 && !keepZero)) return ''; 
  return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function setVal(el, v, d = 2) { 
  if (el && document.activeElement !== el) {
    const formatted = formatNum(v, d, false); // В инпутах нули скрываем
    el.value = formatted; 
  }
}

function applyMask(el) {
  let cursor = el.selectionStart, oldLen = el.value.length;
  let raw = el.value.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!raw || raw === '0') { el.value = ''; return; }
  const parts = raw.split('.');
  let formatted = Number(parts[0]).toLocaleString('ru-RU');
  if (parts.length > 1) {
    const isCrF = el.classList.contains('js-crypto-send-amount') || el.classList.contains('js-crypto-receive-amount');
    formatted += ',' + parts[1].substring(0, isCrF ? 2 : 2);
  }
  el.value = formatted;
  let newPos = cursor + (el.value.length - oldLen);
  el.setSelectionRange(newPos, newPos);
}

document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'));
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'));
});