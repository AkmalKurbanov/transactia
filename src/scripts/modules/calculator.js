/**************************************************************
 * 1. API И КУРСЫ
 **************************************************************/
const API_CONFIG = {
  key: '22cc9d3ab02842c4b89b8546efdd9f91',
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
  round(v, d = 2) {
    return Math.ceil(Number(v) * (10 ** d)) / (10 ** d);
  },
  convert(amount, from, to) {
    if (!RATES[from] || !RATES[to]) return 0;
    return amount * (Number(RATES[to]) / Number(RATES[from]));
  },
  getFiatRate(from, to) {
    const base = 'RUB';
    const foreign = from === base ? to : from;
    const market = this.convert(1, foreign, base);
    return market * (from === base ? 1.05 : 0.95);
  },
  getCryptoRate(from, to, isCr) {
    const market = this.convert(1, from, to);
    if (isCr(from) && !isCr(to)) return market * 0.95;
    if (!isCr(from) && isCr(to)) return market * 1.05;
    return market;
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
    // Находим селекты заново, так как Swap меняет их положение
    const currentSelects = panel.querySelectorAll('.cselect-js');
    if (currentSelects.length < 2) return;

    const from = currentSelects[0].querySelector('.cselect__code')?.textContent.trim();
    const to = currentSelects[1].querySelector('.cselect__code')?.textContent.trim();

    if (!from || !to || !Object.keys(RATES).length) return;
    onRecalc({ els, from, to, mode: LAST_MODE });
  };

  // Слушатели ввода
  els.sendInput?.addEventListener('input', (e) => { applyMask(e.target); run('send'); });
  els.receiveInput?.addEventListener('input', (e) => { applyMask(e.target); run('receive'); });

  // Слушаем событие changeCurrency на уровне панели (делегирование)
  panel.addEventListener('changeCurrency', (e) => {
    run();
  });

  // РЕВЕРС (Swap) - Исправленная логика
  els.swap?.addEventListener('click', () => {
    const currentSelects = panel.querySelectorAll('.cselect-js');
    if (currentSelects.length < 2) return;

    const s1 = currentSelects[0];
    const s2 = currentSelects[1];

    // Чтобы не было ошибки NotFoundError, работаем через родителей каждого элемента
    const parent1 = s1.parentNode;
    const parent2 = s2.parentNode;

    // Используем временный маркер (как в вашем оригинале)
    const tempMarker = document.createComment('swap-marker');
    parent1.replaceChild(tempMarker, s1);
    parent2.replaceChild(s1, s2);
    parent1.replaceChild(s2, tempMarker);

    run();
  });

  const timer = setInterval(() => {
    if (Object.keys(RATES).length) { run('send'); clearInterval(timer); }
  }, 100);
}

/**************************************************************
 * 4. ИНИЦИАЛИЗАЦИЯ (ФИАТ И КРИПТО)
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
    const rate = CalcCore.getFiatRate(from, to);
    const send = getRaw(els.sendInput);

    if (els.rate) els.rate.textContent = `1 ${from === 'RUB' ? to : from} = ${formatNum(rate)} RUB`;

    const sendInBase = from === 'RUB' ? send : CalcCore.convert(send, from, 'RUB');
    const feeInBase = sendInBase < 5000 ? 499 : CalcCore.round(sendInBase * 0.1);
    const fee = from === 'RUB' ? feeInBase : CalcCore.convert(feeInBase, 'RUB', from);

    if (els.commission) els.commission.textContent = `${formatNum(fee)} ${from}`;

    if (mode === 'send') {
      if (!send) { els.receiveInput.value = ''; els.button.textContent = 'Перевести'; return; }
      const res = from === 'RUB' ? send / rate : send * rate;
      setVal(els.receiveInput, res);
    } else {
      const recv = getRaw(els.receiveInput);
      const res = from === 'RUB' ? recv * rate : recv / rate;
      setVal(els.sendInput, res);
    }
    const totalSend = getRaw(els.sendInput);
    if (els.button) els.button.textContent = `Перевести ${formatNum(totalSend + fee)} ${from}`;
  }
});

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
    const rate = CalcCore.getCryptoRate(from, to, isCr);

    if (els.rate) {
      if (!isCr(from) && isCr(to)) els.rate.textContent = `1 ${to} = ${formatNum(1 / rate, 2)} ${from}`;
      else els.rate.textContent = `1 ${from} = ${formatNum(rate, isCr(to) ? 8 : 2)} ${to}`;
    }

    if (els.commission) els.commission.textContent = `0 ${from}`;

    const send = getRaw(els.sendInput);
    if (!send && mode === 'send') { els.receiveInput.value = ''; els.button.textContent = 'Перевести'; return; }

    if (mode === 'send') {
      setVal(els.receiveInput, send * rate, isCr(to) ? 8 : 2);
    } else {
      const recv = getRaw(els.receiveInput);
      setVal(els.sendInput, recv / rate, isCr(from) ? 8 : 2);
    }
    if (els.button) els.button.textContent = `Перевести ${formatNum(getRaw(els.sendInput))} ${from}`;
  }
});

/**************************************************************
 * 5. УТИЛИТЫ
 **************************************************************/
function getRaw(el) { return el ? (Number(el.value.replace(/\s/g, '').replace(',', '.')) || 0) : 0; }
function formatNum(v, d = 2) { return CalcCore.round(v, d).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function setVal(el, v, d = 2) { if (el) el.value = formatNum(v, d); }

function applyMask(el) {
  let cursor = el.selectionStart, oldLen = el.value.length;
  let raw = el.value.replace(/[^\d]/g, '');
  if (!raw) { el.value = ''; return; }
  el.value = Number(raw).toLocaleString('ru-RU');
  el.setSelectionRange(cursor + (el.value.length - oldLen), cursor + (el.value.length - oldLen));
}

document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'));
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'));
});