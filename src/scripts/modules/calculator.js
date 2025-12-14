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
let READY = false;

fetch(API_URL)
  .then(r => r.json())
  .then(d => {
    RATES = d.rates || {};
    READY = true;
  });

function getCommissionPercent(eur) {
  if (eur < 500) return 10;
  if (eur < 1000) return 5;
  return 3;
}

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

function initCalculator(calc) {
  const sendInput = calc.querySelector('.js-send-amount');
  const receiveInput = calc.querySelector('.js-receive-amount');
  const selects = calc.querySelectorAll('.cselect-js');
  const swapBtn = calc.querySelector('.currency-transfer__icon');

  if (!sendInput || !receiveInput || selects.length < 2) return;

  let sendSelect = selects[0];
  let receiveSelect = selects[1];

  receiveInput.readOnly = true;

  const panel = calc.closest('.tabs__panel') || calc;

  const commissionEl = panel.querySelector('.js-fiat-commission, .js-crypto-commission');
  const rateEl = panel.querySelector('.js-fiat-rate, .js-crypto-rate');
  const button = panel.querySelector('.js-fiat-button, .js-crypto-button');

  function getRate(from, to) {
    if (!READY) return null;

    const isCryptoFrom = CRYPTO_RATES[from];
    const isCryptoTo = CRYPTO_RATES[to];

    if (isCryptoFrom && isCryptoTo) {
      return from === 'RUB' ? 1 / 1.05 : 1;
    }

    let rf = Number(RATES[from]);
    let rt = Number(RATES[to]);

    if (!rf || !rt) return null;

    if (from === 'RUB') {
      rf *= 1.05;
    }

    return rt / rf;
  }

  function updateButton() {
    if (!button) return;
    const v = parseFloat(sendInput.value);
    const c = getCurrency(sendSelect);
    button.textContent =
      v && c ? `Перевести ${format(v)} ${c}` : 'Перевести';
  }

  function recalc() {
    const send = parseFloat(sendInput.value);

    if (!send) {
      receiveInput.value = '';
      commissionEl && (commissionEl.textContent = '');
      rateEl && (rateEl.textContent = '');
      updateButton();
      return;
    }

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    if (!from || !to) return;

    const rate = getRate(from, to);
    if (!rate) return;

    const gross = send * rate;

    let net = gross;
    let percent = 0;
    let fee = 0;

    const isCryptoTo = CRYPTO_RATES[to];

    if (!isCryptoTo) {
      const eur = toEUR(gross, to);
      if (!eur) return;

      percent = getCommissionPercent(eur);
      fee = gross * (percent / 100);
      net = gross - fee;
    }

    receiveInput.value = net.toFixed(2);

    commissionEl &&
      (commissionEl.textContent =
        percent ? `${percent}% (${fee.toFixed(2)} ${to})` : '');

    rateEl && (rateEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`);

    updateButton();
  }

  sendInput.addEventListener('input', recalc);

  document.addEventListener('click', e => {
    if (
      panel.contains(e.target) &&
      (e.target.closest('.cselect__option') ||
        e.target.closest('.cselect__submenu-option'))
    ) {
      recalc();
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
      commissionEl && (commissionEl.textContent = '');
      rateEl && (rateEl.textContent = '');
      updateButton();
    });

  updateButton();
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('.currency-transfer')
    .forEach(initCalculator);
});
