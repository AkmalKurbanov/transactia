const API_KEY = '557e55cf33ce4ba9983b55b771d0b44b';
const API_URL = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${API_KEY}`;

const CRYPTO_RATES = {
  USDT: 1,
  BTC: 1,
  ETH: 1,
  TON: 1,
  BNB: 1,
  TRX: 1,
};

let RATES = {};


/* ======================
   LOAD RATES
====================== */
fetch(API_URL)
  .then(r => r.json())
  .then(d => {
    RATES = d.rates || {};

  });

/* ======================
   COMMISSION RULES (EUR)
====================== */
function getCommissionPercent(eur) {
  if (eur < 500) return 10;
  if (eur < 1000) return 7;
  if (eur < 2000) return 5;
  return 3;
}

/* ======================
   HELPERS
====================== */
function format(v) {
  return Number(v).toLocaleString('ru-RU');
}

function getCurrency(select) {
  return select?.querySelector('.cselect__code')?.textContent.trim() || null;
}

function toEUR(amount, currency) {
  if (currency === 'EUR') return amount;
  if (!RATES[currency] || !RATES.EUR) return null;
  return amount * (Number(RATES.EUR) / Number(RATES[currency]));
}

// минимальная комиссия 500 RUB
function applyMinCommission(fee, currency) {
  if (currency !== 'RUB') return fee;
  return Math.max(fee, 500);
}

/* ======================
   INIT CALCULATOR
====================== */
function initCalculator(calc) {
  const sendInput = calc.querySelector('.js-send-amount');
  const receiveInput = calc.querySelector('.js-receive-amount');
  const selects = calc.querySelectorAll('.cselect-js');
  const swapBtn = calc.querySelector('.currency-transfer__icon');

  if (!sendInput || !receiveInput || selects.length < 2) return;

  let sendSelect = selects[0];
  let receiveSelect = selects[1];

  const panel = calc.closest('.tabs__panel') || calc;
  const commissionEl = panel.querySelector('.js-fiat-commission, .js-crypto-commission');
  const rateEl = panel.querySelector('.js-fiat-rate, .js-crypto-rate');
  const button = panel.querySelector('.js-fiat-button, .js-crypto-button');

  let LOCK = false;
  let LAST_INPUT = 'send'; // ← КЛЮЧЕВО

  /* ======================
     RATE
  ====================== */
  function getRate(from, to) {
    if (!RATES[from] || !RATES[to]) return null;
  
    const isCryptoFrom = CRYPTO_RATES[from];
    const isCryptoTo = CRYPTO_RATES[to];
    if (isCryptoFrom && isCryptoTo) return 1;
  
    let rf = Number(RATES[from]);
    let rt = Number(RATES[to]);
  
    if (from === 'RUB') rf *= 1.05; // +5%
  
    return rt / rf;
  }
  

  /* ======================
     UI
  ====================== */
  function updateButton() {
    if (!button) return;
    const v = parseFloat(sendInput.value);
    const c = getCurrency(sendSelect);
    button.textContent = v && c ? `Перевести ${format(v)} ${c}` : 'Перевести';
  }

  function renderMeta(percent, fee, rate, from, to) {
    commissionEl &&
      (commissionEl.textContent =
        percent ? `${percent}% (${fee.toFixed(2)} ${to})` : '');

    rateEl &&
      (rateEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`);

    updateButton();
  }

  function clear() {
    commissionEl && (commissionEl.textContent = '');
    rateEl && (rateEl.textContent = '');
    updateButton();
  }

  /* ======================
     CALC FROM SEND
  ====================== */
  function calcFromSend() {
    if (LOCK) return;
    LOCK = true;

    const send = parseFloat(sendInput.value);
    if (!send) {
      receiveInput.value = '';
      clear();
      LOCK = false;
      return;
    }

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    const rate = getRate(from, to);
    if (!rate) return (LOCK = false);

    const gross = send * rate;

    let net = gross;
    let percent = 0;
    let fee = 0;

    if (!CRYPTO_RATES[to]) {
      const eurBase =
        from === 'EUR'
          ? send
          : toEUR(gross, to);

      percent = getCommissionPercent(eurBase);
      fee = gross * (percent / 100);
      fee = applyMinCommission(fee, to);
      net = gross - fee;
    }

    receiveInput.value = net.toFixed(2);
    renderMeta(percent, fee, rate, from, to);
    LOCK = false;
  }

  /* ======================
     CALC FROM RECEIVE
  ====================== */
  function calcFromReceive() {
    if (LOCK) return;
    LOCK = true;

    const net = parseFloat(receiveInput.value);
    if (!net) {
      sendInput.value = '';
      clear();
      LOCK = false;
      return;
    }

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    const rate = getRate(from, to);
    if (!rate) return (LOCK = false);

    let gross = net;
    let percent = 0;
    let fee = 0;

    if (!CRYPTO_RATES[to]) {
      const eurBase =
        to === 'EUR'
          ? net
          : toEUR(net, to);

      percent = getCommissionPercent(eurBase);

      gross = net / (1 - percent / 100);
      fee = gross - net;
      fee = applyMinCommission(fee, to);
      gross = net + fee;
    }

    const send = gross / rate;
    sendInput.value = send.toFixed(2);

    renderMeta(percent, fee, rate, from, to);
    LOCK = false;
  }

  /* ======================
     EVENTS
  ====================== */
  sendInput.addEventListener('input', () => {
    LAST_INPUT = 'send';
    calcFromSend();
  });

  receiveInput.addEventListener('input', () => {
    LAST_INPUT = 'receive';
    calcFromReceive();
  });

  document.addEventListener('click', e => {
    if (
      panel.contains(e.target) &&
      (e.target.closest('.cselect__option') ||
        e.target.closest('.cselect__submenu-option'))
    ) {
      if (LAST_INPUT === 'send') {
        calcFromSend();
      } else {
        calcFromReceive();
      }
    }
  });

  swapBtn &&
    swapBtn.addEventListener('click', () => {
      const p1 = sendSelect.parentNode;
      const p2 = receiveSelect.parentNode;
      if (!p1 || !p2) return;

      const mark = document.createComment('');
      p1.replaceChild(mark, sendSelect);
      p2.replaceChild(sendSelect, receiveSelect);
      mark.parentNode.replaceChild(receiveSelect, mark);

      [sendSelect, receiveSelect] = [receiveSelect, sendSelect];

      sendInput.value = '';
      receiveInput.value = '';
      clear();
    });

  updateButton();
}

/* ======================
   BOOT
====================== */
document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('.currency-transfer')
    .forEach(initCalculator);
});
