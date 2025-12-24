/**************************************************************
 * 1. API И КУРСЫ
 **************************************************************/
const API_CONFIG = {
  key: '557e55cf33ce4ba9983b55b771d0b44b',
  get url() { return `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${this.key}`; }
};

let RATES = {};

fetch(API_CONFIG.url)
  .then(r => r.json())
  .then(d => { RATES = d.rates || {}; })
  .catch(err => console.error("Ошибка API:", err));

/**************************************************************
 * 2. ЯДРО РАСЧЕТОВ
 **************************************************************/
const CalcCore = {
  _t(v, d = 0) {
    const multiplier = 10 ** d;
    return Math.ceil(Number(v) * multiplier) / multiplier;
  },
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
    return { market: marketPrice, final: finalRate };
  },
  getCryptoRate(from, to, isCrFunc) {
    const fiat = isCrFunc(from) ? to : from;
    const usdToFiat = this.convert(1, 'USD', fiat);
    const final = usdToFiat * 1.05;
    return { market: usdToFiat, final };
  }
};

/**************************************************************
 * 3. СИНХРОНИЗАЦИЯ (ЗЕРКАЛО)
 **************************************************************/
function syncToOtherTab(currentPanel, mode, value) {
  if (window._isSyncing) return;
  window._isSyncing = true;

  const otherPanel = document.querySelector(`.tabs__panel:not([data-name="${currentPanel.dataset.name}"])`);
  if (!otherPanel) { window._isSyncing = false; return; }

  const targetSelector = mode === 'send' 
    ? '.js-fiat-send-amount, .js-crypto-send-amount' 
    : '.js-fiat-receive-amount, .js-crypto-receive-amount';

  const otherInput = otherPanel.querySelector(targetSelector);
  if (otherInput) {
    otherInput.value = value;
    otherInput.dispatchEvent(new CustomEvent('input', { detail: { isSync: true } }));
  }
  window._isSyncing = false;
}

/**************************************************************
 * 4. УНИВЕРСАЛЬНЫЙ КОНСТРУКТОР
 **************************************************************/
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
    applyMask(e.target);
    run('send');
    if (!e.detail?.isSync) syncToOtherTab(panel, 'send', e.target.value);
  });

  els.receiveInput?.addEventListener('input', (e) => {
    applyMask(e.target);
    run('receive');
    if (!e.detail?.isSync) syncToOtherTab(panel, 'receive', e.target.value);
  });

  els.swap?.addEventListener('click', () => {
    const selects = panel.querySelectorAll('.cselect-js');
    if (selects.length < 2) return;
    const v1 = els.sendInput.value, v2 = els.receiveInput.value;
    els.sendInput.value = v2; els.receiveInput.value = v1;
    const s1 = selects[0], s2 = selects[1], p1 = s1.parentNode, p2 = s2.parentNode;
    const marker = document.createComment('swap');
    p1.replaceChild(marker, s1); p2.replaceChild(s1, s2); p1.replaceChild(s2, marker);
    run('send');
    if (!window._isSwapping) {
      window._isSwapping = true;
      const otherSwap = document.querySelector(`.tabs__panel:not([data-name="${panel.dataset.name}"]) .currency-transfer__icon`);
      if (otherSwap) otherSwap.click();
      window._isSwapping = false;
    }
  });

  const timer = setInterval(() => { 
    if (Object.keys(RATES).length) { run('send'); clearInterval(timer); } 
  }, 200);
}

/**************************************************************
 * 5. ФИАТНЫЙ КАЛЬКУЛЯТОР
 **************************************************************/
const initFiat = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-fiat-send-amount', receiveInput: '.js-fiat-receive-amount',
    rate: '.js-fiat-rate', commission: '.js-fiat-commission', button: '.js-fiat-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const { final: rate } = CalcCore.getFiatRate(from, to);
    const val = getRaw(mode === 'send' ? els.sendInput : els.receiveInput);

    let pureSend, pureReceive;
    if (from === 'RUB') {
        pureSend = mode === 'send' ? val : val * rate;
        pureReceive = mode === 'send' ? val / rate : val;
    } else {
        pureSend = mode === 'send' ? val : val / rate;
        pureReceive = mode === 'send' ? val * rate : val;
    }

    if (mode === 'send') setVal(els.receiveInput, pureReceive, 2);
    else setVal(els.sendInput, pureSend, 2);

    // ИСПРАВЛЕНО: Комиссия по умолчанию не 0
    const rubAmount = from === 'RUB' ? pureSend : pureReceive;
    let fee = 0;
    
    // Если сумма не введена, показываем минимальную комиссию 499
    if (rubAmount < 5000) {
        fee = from === 'RUB' ? 499 : CalcCore.convert(499, 'RUB', from);
    } else if (rubAmount < 50000) {
        fee = pureSend * 0.10;
    } else if (rubAmount < 100000) {
        fee = pureSend * 0.07;
    } else {
        fee = pureSend * 0.05;
    }

    const feeFinal = Math.ceil(fee);
    if (els.commission) {
        els.commission.textContent = `${formatNum(feeFinal, 0)} ${from}`;
    }

    if (els.rate) els.rate.textContent = val > 0 ? `1 ${from === 'RUB' ? to : from} = ${formatNum(rate, 2)} RUB` : '';

    const total = Math.ceil(pureSend + feeFinal);
    if (els.button) els.button.textContent = val > 0 ? `Перевести ${formatNum(total, 0)} ${from}` : 'Перевести';
  }
});

/**************************************************************
 * 6. КРИПТО КАЛЬКУЛЯТОР
 **************************************************************/
const isCr = (c) => ['USDT', 'BTC', 'ETH', 'TON', 'BNB', 'TRX', 'SOL', 'LTC'].includes(c);
const initCrypto = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-crypto-send-amount', receiveInput: '.js-crypto-receive-amount',
    rate: '.js-crypto-rate', commission: '.js-crypto-commission', button: '.js-crypto-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const { final: rate } = CalcCore.getCryptoRate(from, to, isCr);
    const val = getRaw(mode === 'send' ? els.sendInput : els.receiveInput);
    const rateCalc = isCr(from) ? rate : (1 / rate);

    let pS, pR;
    if (mode === 'send') {
        pS = val; pR = val * rateCalc;
        setVal(els.receiveInput, pR, isCr(to) ? 6 : 2);
    } else {
        pR = val; pS = val / rateCalc;
        setVal(els.sendInput, pS, isCr(from) ? 6 : 2);
    }

    if (els.commission) els.commission.textContent = `0 ${from}`;
    
    // ИСПРАВЛЕНО: Скрываем курс при загрузке (если val === 0)
    if (els.rate) {
        if (val > 0) {
            const crName = isCr(from) ? from : to, fiName = isCr(from) ? to : from;
            els.rate.textContent = `1 ${crName} = ${formatNum(rate, 2)} ${fiName}`;
        } else {
            els.rate.textContent = ''; 
        }
    }
    
    const total = Math.ceil(pS);
    if (els.button) els.button.textContent = val > 0 ? `Перевести ${formatNum(total, 0)} ${from}` : 'Перевести';
  }
});

/**************************************************************
 * 7. УТИЛИТЫ (МАСКИ И ФОРМАТИРОВАНИЕ)
 **************************************************************/
function getRaw(el) { 
  return el ? (Number(el.value.replace(/\s/g, '').replace(',', '.')) || 0) : 0; 
}

function formatNum(v, d = 0) {
  if (v === '' || v === 0 || isNaN(v)) return ''; 
  return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

function setVal(el, v, d = 0) { 
    if (el && document.activeElement !== el) {
        const f = formatNum(v, d);
        el.value = f === '0' ? '' : f; 
    }
}

function applyMask(el) {
  let cursor = el.selectionStart, oldLen = el.value.length;
  let raw = el.value.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!raw) { el.value = ''; return; }
  const parts = raw.split('.');
  let formatted = Number(parts[0]).toLocaleString('ru-RU');
  if (parts.length > 1) {
    formatted += ',' + parts[1].substring(0, 6);
  }
  el.value = formatted;
  let newPos = cursor + (el.value.length - oldLen);
  el.setSelectionRange(newPos, newPos);
}

document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'));
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'));
});