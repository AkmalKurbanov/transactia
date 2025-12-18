/**************************************************************
 * API
 **************************************************************/
const API_KEY = '557e55cf33ce4ba9983b55b771d0b44b';
const API_URL = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${API_KEY}`;

const CRYPTO = {
  USDT: true,
  BTC: true,
  ETH: true,
  TON: true,
  BNB: true,
  TRX: true,
};

const CRYPTO_MARKUP = 1.05;
const MIN_COMMISSION_RUB = 500;

let RATES = {};

/**************************************************************
 * LOAD RATES
 **************************************************************/
fetch(API_URL)
  .then(r => r.json())
  .then(d => {
    RATES = d.rates || {};
  });

/**************************************************************
 * FORMAT / MASK
 **************************************************************/
function roundUp(v, d = 2) {
  const f = 10 ** d;
  return Math.ceil(Number(v) * f) / f;
}

function maskValue(v, d = 2) {
  if (!v) return '0';
  let [i, f] = roundUp(v, d).toString().split('.');
  let res = '';
  let c = 0;

  for (let x = i.length - 1; x >= 0; x--) {
    res = i[x] + res;
    c++;
    if (c % 3 === 0 && x !== 0) res = ' ' + res;
  }

  return d && f ? res + '.' + f.padEnd(d, '0') : res;
}

function maskNumberInput(input, decimals = 2) {
  input.addEventListener('input', () => {
    let value = input.value.replace(/[^0-9.,]/g, '');
    let [intPart, fracPart] = value.split(/[.,]/);

    let formattedInt = '';
    let count = 0;

    for (let i = intPart.length - 1; i >= 0; i--) {
      formattedInt = intPart[i] + formattedInt;
      count++;
      if (count % 3 === 0 && i !== 0) formattedInt = ' ' + formattedInt;
    }

    let formattedFrac = '';
    if (decimals > 0 && fracPart !== undefined) {
      formattedFrac = '.' + fracPart.slice(0, decimals);
    }

    input.value = formattedInt + formattedFrac;
  });
}

/**************************************************************
 * HELPERS
 **************************************************************/
function getCurrency(select) {
  return select?.querySelector('.cselect__code')?.textContent.trim() || null;
}

function getValue(input) {
  return Number(input.value.replace(/\s/g, '').replace(',', '.')) || 0;
}

function setValue(input, v, d = 2) {
  input.value = maskValue(v, d);
}

function toRUB(amount, currency) {
  if (currency === 'RUB') return amount;
  return amount * (Number(RATES.RUB) / Number(RATES[currency]));
}

/**************************************************************
 * COMMISSION (FIAT, С МИНИМУМОМ 500 RUB)
 **************************************************************/
function getFiatCommission(send, from) {
  if (!send || CRYPTO[from]) return 0;

  let percent = 10;
  if (send >= 2000) percent = 3;
  else if (send >= 1000) percent = 5;
  else if (send >= 500) percent = 7;

  const commissionPercent = send * percent / 100;

  // минимум 500 RUB → переводим в валюту отправителя
  const minInFrom = MIN_COMMISSION_RUB / (Number(RATES.RUB) / Number(RATES[from]));

  return roundUp(Math.max(commissionPercent, minInFrom), 2);
}

/**************************************************************
 * RATES
 **************************************************************/
function getFiatRate(from, to) {
  const base = Number(RATES[to]) / Number(RATES[from]);

  if (from === 'RUB' && to !== 'RUB') return base * 1.05;
  if (from !== 'RUB' && to === 'RUB') return base * 0.95;

  return base;
}

function getCryptoRate(from, to) {
  return (Number(RATES[to]) / Number(RATES[from])) * CRYPTO_MARKUP;
}

/**************************************************************
 * INIT FIAT
 **************************************************************/
function initFiat(panel) {
  const calc = panel.querySelector('.currency-transfer');
  if (!calc) return;

  const sendInput = calc.querySelector('.js-fiat-send-amount');
  const receiveInput = calc.querySelector('.js-fiat-receive-amount');
  const selects = calc.querySelectorAll('.cselect-js');
  const swapBtn = calc.querySelector('.currency-transfer__icon');

  let [sendSelect, receiveSelect] = selects;

  const rateEl = panel.querySelector('.js-fiat-rate');
  const commissionEl = panel.querySelector('.js-fiat-commission');
  const button = panel.querySelector('.js-fiat-button');

  let LOCK = false;
  let LAST = 'send';

  function renderRate(from, to) {
    const base = from === 'RUB' ? to : from;
    if (!base || base === 'RUB') return;
    rateEl.textContent = `1 ${base} = ${maskValue(toRUB(1, base), 2)} RUB`;
  }

  function calcSend() {
    if (LOCK) return;
    LOCK = true;

    const send = getValue(sendInput);
    if (!send) {
      receiveInput.value = '';
      commissionEl.textContent = '';
      button.textContent = 'Перевести';
      LOCK = false;
      return;
    }

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    const rate = getFiatRate(from, to);

    setValue(receiveInput, send * rate, 2);

    const commission = getFiatCommission(send, from);
    commissionEl.textContent = `${maskValue(commission, 2)} ${from}`;

    renderRate(from, to);

    const total = send + commission;
    button.textContent = `Перевести ${maskValue(total, 2)} ${from}`;

    LOCK = false;
  }

  function calcReceive() {
    if (LOCK) return;
    LOCK = true;

    const receive = getValue(receiveInput);
    const rate = getFiatRate(
      getCurrency(sendSelect),
      getCurrency(receiveSelect)
    );

    setValue(sendInput, receive / rate, 2);
    calcSend();

    LOCK = false;
  }

  sendInput.addEventListener('input', () => {
    LAST = 'send';
    calcSend();
  });

  receiveInput.addEventListener('input', () => {
    LAST = 'receive';
    calcReceive();
  });

  document.addEventListener('click', e => {
    if (panel.contains(e.target) && e.target.closest('.cselect__option')) {
      LAST === 'send' ? calcSend() : calcReceive();
    }
  });

  swapBtn?.addEventListener('click', () => {
    const m = document.createComment('');
    sendSelect.parentNode.replaceChild(m, sendSelect);
    receiveSelect.parentNode.replaceChild(sendSelect, receiveSelect);
    m.parentNode.replaceChild(receiveSelect, m);
    [sendSelect, receiveSelect] = [receiveSelect, sendSelect];
    sendInput.value = '';
    receiveInput.value = '';
    commissionEl.textContent = '';
    button.textContent = 'Перевести';
  });
}

/**************************************************************
 * INIT CRYPTO
 **************************************************************/
function initCrypto(panel) {
  const calc = panel.querySelector('.currency-transfer');
  if (!calc) return;

  const sendInput = calc.querySelector('.js-crypto-send-amount');
  const receiveInput = calc.querySelector('.js-crypto-receive-amount');
  const selects = calc.querySelectorAll('.cselect-js');
  const swapBtn = calc.querySelector('.currency-transfer__icon');

  let [sendSelect, receiveSelect] = selects;

  const rateEl = panel.querySelector('.js-crypto-rate');
  const commissionEl = panel.querySelector('.js-crypto-commission');
  const button = panel.querySelector('.js-crypto-button');

  let LOCK = false;
  let LAST = 'send';

  commissionEl.textContent = '0';

  function renderRate(from, to) {
    const base = from === 'RUB' ? to : from;
    if (!base || base === 'RUB') return;

    const rub =
      (Number(RATES.RUB) / Number(RATES[base])) * CRYPTO_MARKUP;

    rateEl.textContent = `1 ${base} = ${maskValue(rub, 2)} RUB`;
  }

  function calcSend() {
    if (LOCK) return;
    LOCK = true;

    const send = getValue(sendInput);
    if (!send) {
      receiveInput.value = '';
      button.textContent = 'Перевести';
      LOCK = false;
      return;
    }

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    const rate = getCryptoRate(from, to);

    setValue(receiveInput, send * rate, 6);
    renderRate(from, to);
    button.textContent = `Перевести ${maskValue(send, 6)} ${from}`;

    LOCK = false;
  }

  function calcReceive() {
    if (LOCK) return;
    LOCK = true;

    const receive = getValue(receiveInput);
    const rate = getCryptoRate(
      getCurrency(sendSelect),
      getCurrency(receiveSelect)
    );

    setValue(sendInput, receive / rate, 6);
    calcSend();

    LOCK = false;
  }

  sendInput.addEventListener('input', () => {
    LAST = 'send';
    calcSend();
  });

  receiveInput.addEventListener('input', () => {
    LAST = 'receive';
    calcReceive();
  });

  document.addEventListener('click', e => {
    if (panel.contains(e.target) && e.target.closest('.cselect__option')) {
      LAST === 'send' ? calcSend() : calcReceive();
    }
  });

  swapBtn?.addEventListener('click', () => {
    const m = document.createComment('');
    sendSelect.parentNode.replaceChild(m, sendSelect);
    receiveSelect.parentNode.replaceChild(sendSelect, receiveSelect);
    m.parentNode.replaceChild(receiveSelect, m);
    [sendSelect, receiveSelect] = [receiveSelect, sendSelect];
    sendInput.value = '';
    receiveInput.value = '';
    button.textContent = 'Перевести';
  });
}

/**************************************************************
 * MASK INIT
 **************************************************************/
maskNumberInput(document.querySelector('.js-fiat-send-amount'), 2);
maskNumberInput(document.querySelector('.js-fiat-receive-amount'), 2);
maskNumberInput(document.querySelector('.js-crypto-send-amount'), 6);
maskNumberInput(document.querySelector('.js-crypto-receive-amount'), 6);

/**************************************************************
 * BOOT
 **************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'));
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'));
});
