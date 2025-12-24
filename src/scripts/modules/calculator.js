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
    const base = 'RUB';
    const foreign = from === base ? to : from;
    const market = this.convert(1, foreign, base);
    const markup = from === base ? 1.05 : 0.95;
    return { 
      market, 
      final: market * markup, 
      label: from === base ? "+5% (Покупка)" : "-5% (Продажа)" 
    };
  },
  // Крипта привязана к доллару + 5%
  getCryptoRate(from, to, isCrFunc) {
    const fiat = isCrFunc(from) ? to : from;
    // Берем курс USD к фиату (например, рублю)
    const usdToFiat = this.convert(1, 'USD', fiat);
    // Всегда +5% к доллару для крипты
    const final = usdToFiat * 1.05; 
    
    return { market: usdToFiat, final, label: "+5% (Привязка к USD)" };
  }
};

/**************************************************************
 * 3. УНИВЕРСАЛЬНЫЙ КОНСТРУКТОР
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
    const currentSelects = panel.querySelectorAll('.cselect-js');
    if (currentSelects.length < 2) return;
    const from = currentSelects[0].querySelector('.cselect__code')?.textContent.trim();
    const to = currentSelects[1].querySelector('.cselect__code')?.textContent.trim();
    if (!from || !to || !Object.keys(RATES).length) return;
    onRecalc({ els, from, to, mode: LAST_MODE });
  };

  els.sendInput?.addEventListener('input', (e) => { applyMask(e.target); run('send'); });
  els.receiveInput?.addEventListener('input', (e) => { applyMask(e.target); run('receive'); });
  panel.addEventListener('changeCurrency', () => run());

  els.swap?.addEventListener('click', () => {
    const currentSelects = panel.querySelectorAll('.cselect-js');
    if (currentSelects.length < 2) return;
    const val1 = els.sendInput.value;
    const val2 = els.receiveInput.value;
    els.sendInput.value = val2;
    els.receiveInput.value = val1;
    const s1 = currentSelects[0], s2 = currentSelects[1];
    const p1 = s1.parentNode, p2 = s2.parentNode;
    const tempMarker = document.createComment('swap');
    p1.replaceChild(tempMarker, s1); p2.replaceChild(s1, s2); p1.replaceChild(s2, tempMarker);
    run('send');
  });

  const timer = setInterval(() => {
    if (Object.keys(RATES).length) { run('send'); clearInterval(timer); }
  }, 100);
}

/**************************************************************
 * 4. ФИАТНЫЙ КАЛЬКУЛЯТОР
 **************************************************************/
const initFiat = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-fiat-send-amount',
    receiveInput: '.js-fiat-receive-amount',
    rate: '.js-fiat-rate',
    commission: '.js-fiat-commission',
    button: '.js-fiat-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const rateData = CalcCore.getFiatRate(from, to);
    const rate = rateData.final;
    const val = mode === 'send' ? getRaw(els.sendInput) : getRaw(els.receiveInput);
    
    let currentSend = mode === 'send' ? val : (from === 'RUB' ? val * rate : val / rate);
    const amountInRUB = from === 'RUB' ? currentSend : CalcCore.convert(currentSend, from, 'RUB');
    
    let fee = 0;
    if (amountInRUB === 0 || amountInRUB < 5000) { 
        fee = from === 'RUB' ? 499 : CalcCore.convert(499, 'RUB', from); 
    } else if (amountInRUB < 50000) { fee = currentSend * 0.10; }
    else if (amountInRUB < 100000) { fee = currentSend * 0.07; }
    else if (amountInRUB < 200000) { fee = currentSend * 0.05; }
    else { fee = currentSend * 0.03; }

    const feeFinal = CalcCore._t(fee, 0); 

    if (els.commission) els.commission.textContent = `${formatNum(feeFinal, 0)} ${from}`;
    if (els.rate) els.rate.textContent = `1 ${from === 'RUB' ? to : from} = ${formatNum(rate, 2)} RUB`;

    if (mode === 'send') {
      const res = from === 'RUB' ? val / rate : val * rate;
      setVal(els.receiveInput, val ? res : '', 2); 
    } else {
      setVal(els.sendInput, val ? currentSend : '', 2);
    }
    
    const total = CalcCore._t(currentSend + feeFinal, 0);
    if (els.button) els.button.textContent = val > 0 ? `Перевести ${formatNum(total, 0)} ${from}` : 'Перевести';
  }
});

/**************************************************************
 * 5. КРИПТО КАЛЬКУЛЯТОР
 **************************************************************/
const isCr = (c) => ['USDT', 'BTC', 'ETH', 'TON', 'BNB', 'TRX', 'SOL', 'LTC'].includes(c);
const initCrypto = (panel) => createCalculator({
  panel,
  selectors: {
    sendInput: '.js-crypto-send-amount',
    receiveInput: '.js-crypto-receive-amount',
    rate: '.js-crypto-rate',
    commission: '.js-crypto-commission',
    button: '.js-crypto-button'
  },
  onRecalc: ({ els, from, to, mode }) => {
    const cRate = CalcCore.getCryptoRate(from, to, isCr);
    const finalRate = cRate.final; 
    
    if (els.rate) {
      const cryptoName = isCr(from) ? from : to;
      const fiatName = isCr(from) ? to : from;
      els.rate.textContent = `1 ${cryptoName} = ${formatNum(finalRate, 2)} ${fiatName}`;
    }
    if (els.commission) els.commission.textContent = `0 ${from}`;

    const val = mode === 'send' ? getRaw(els.sendInput) : getRaw(els.receiveInput);
    const rateForCalc = isCr(from) ? finalRate : (1 / finalRate);
    let currentSend = mode === 'send' ? val : val / rateForCalc;

    if (mode === 'send') setVal(els.receiveInput, val ? val * rateForCalc : '', 2);
    else setVal(els.sendInput, val ? currentSend : '', 2);

    const totalBtn = CalcCore._t(currentSend, 0);
    if (els.button) els.button.textContent = val > 0 ? `Перевести ${formatNum(totalBtn, 0)} ${from}` : 'Перевести';

    console.log(`--- [КРИПТО: ПРИВЯЗКА К USD + 5%] ---`);
    console.log(`Курс API (USD): ${cRate.market.toFixed(2)} | Итог (+5%): ${finalRate.toFixed(2)}`);
  }
});

/**************************************************************
 * 6. УТИЛИТЫ (ПОЛНЫЙ КОМПЛЕКТ)
 **************************************************************/
function getRaw(el) { return el ? (Number(el.value.replace(/\s/g, '').replace(',', '.')) || 0) : 0; }

function formatNum(v, d = 0) { 
  if (v === '' || v === 0) return '';
  return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: d }); 
}

function setVal(el, v, d = 0) { 
  if (el) el.value = formatNum(v, d); 
}

function applyMask(el) {
  let cursor = el.selectionStart, oldLen = el.value.length;
  let raw = el.value.replace(/[^\d.,]/g, '').replace(',', '.'); 
  if (!raw) { el.value = ''; return; }
  const parts = raw.split('.');
  let formatted = Number(parts[0]).toLocaleString('ru-RU');
  if (parts.length > 1) formatted += ',' + parts[1].substring(0, 2);
  el.value = formatted;
  el.setSelectionRange(cursor + (el.value.length - oldLen), cursor + (el.value.length - oldLen));
}

document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'));
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'));
});