/**************************************************************
 * API
 **************************************************************/
const API_KEY = '22cc9d3ab02842c4b89b8546efdd9f91';
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
 * HELPERS (UNIVERSAL)
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

function convert(amount, from, to) {
  if (!RATES[from] || !RATES[to]) return 0;
  return amount * (Number(RATES[to]) / Number(RATES[from]));
}


function getRateFactor(from, base) {
  // отправляем БАЗОВУЮ валюту → +5%
  if (from === base) return 1.05;

  // отправляем ИНОСТРАННУЮ валюту → -5%
  return 0.95;
}

function getFiatRate(from, to, base) {
  const market = convert(1, from, to);

  let final;
  if (from === base) {
    final = market * 1.05;
  } else {
    final = market * 0.95;
  }



  return final;
}





/**************************************************************
 * COMMISSION (UNIVERSAL)
 **************************************************************/
const MIN_COMMISSION_BASE = 500; // бизнес-якорь, не валюта

function getFiatCommission(send) {
  if (!send) return 0;

  let percent = 10;
  if (send >= 2000) percent = 3;
  else if (send >= 1000) percent = 5;
  else if (send >= 500) percent = 7;

  const commission = send * percent / 100;
  return roundUp(Math.max(commission, MIN_COMMISSION_BASE), 2);
}
/**************************************************************
 * RATES
 **************************************************************/
const FIAT_MARKUP_SEND = 1.05;



function getCryptoRate(from, to) {
  return convert(1, from, to) * CRYPTO_MARKUP;
}
const MIN_BASE = 500; // минимум в базовой валюте страницы
/**************************************************************
 * INIT FIAT
 **************************************************************/
function initFiat(panel) {
  const calc = panel.querySelector('.currency-transfer');
  if (!calc) return;

  const rateEl = panel.querySelector('.js-fiat-rate');
  const sendInput = calc.querySelector('.js-fiat-send-amount');
  const receiveInput = calc.querySelector('.js-fiat-receive-amount');
  const selects = calc.querySelectorAll('.cselect-js');
  const swapBtn = calc.querySelector('.currency-transfer__icon');

  let [sendSelect, receiveSelect] = selects;

  const commissionEl = panel.querySelector('.js-fiat-commission');
  const button = panel.querySelector('.js-fiat-button');

  let LOCK = false;
  let LAST = 'send';

  const MIN_BASE = 500;

  function getBaseCurrency() {
    return panel
      .querySelector('.cselect.is-disabled .cselect__selected')
      ?.dataset.currency;
  }

  function getMarketRate(from, to) {
    return convert(1, from, to);
  }


  function getPercent(amount) {
    if (amount < 500) return 10;
    if (amount < 1000) return 7;
    if (amount < 2000) return 5;
    return 3;
  }

  function getCommission(send, from, base) {
    const percentFee = send * getPercent(send) / 100;

    if (from === base) {
      return roundUp(Math.max(percentFee, MIN_BASE), 2);
    }

    const minInFrom = convert(MIN_BASE, base, from);
    return roundUp(Math.max(percentFee, minInFrom), 2);
  }


  function recalc(mode) {
    if (LOCK) return
    LOCK = true
  
    const from = getCurrency(sendSelect)
    const to = getCurrency(receiveSelect)
    const base = getBaseCurrency()
  
    if (!from || !to || !base) {
      LOCK = false
      return
    }
  
    // UI-курс (±5%)
    const uiRate = getUiRate(from, to, base)
    const foreign = from === base ? to : from
    const marketRate = convert(1, foreign, base)

    let send = getValue(sendInput)
    let receive = getValue(receiveInput)
  
    // === 1. РАСЧЁТ ===
    if (mode === 'send') {
      if (!send) {
        receiveInput.value = ''
        commissionEl.textContent = ''
        button.textContent = 'Перевести'
        LOCK = false
        return
      }
  
      receive =
        from === base
          ? send / uiRate
          : send * uiRate
  
      setValue(receiveInput, receive, 2)
    }
  
    if (mode === 'receive') {
      if (!receive) {
        sendInput.value = ''
        commissionEl.textContent = ''
        button.textContent = 'Перевести'
        LOCK = false
        return
      }
  
      send =
        from === base
          ? receive * uiRate
          : receive / uiRate
  
      setValue(sendInput, send, 2)
    }
  
    // === 2. КОМИССИЯ (ВСЕГДА ОТ SEND) ===
    const commission = getCommission(send, from, base)
    commissionEl.textContent = `${maskValue(commission, 2)} ${from}`
  
    // === 3. UI-КУРС ===
    rateEl.textContent =
      `1 ${foreign} = ${maskValue(uiRate, 2)} ${base}`
  
    // === 4. КНОПКА ===
    button.textContent =
      `Перевести ${maskValue(send + commission, 2)} ${from}`
    

      logFiatState({
        mode,
        from,
        to,
        base,
        foreign,
        marketRate,
        uiRate,
        send,
        receive,
        commission
      });

      
    LOCK = false
  }
  
  sendInput.addEventListener('input', () => {
    LAST = 'send'
    recalc('send')
  })
  
  receiveInput.addEventListener('input', () => {
    LAST = 'receive'
    recalc('receive')
  })
  

  document.addEventListener('click', e => {
    if (panel.contains(e.target) && e.target.closest('.cselect__option')) {
      recalc(LAST)

    }
  });

  swapBtn?.addEventListener('click', () => {
    const m = document.createComment('');
    sendSelect.parentNode.replaceChild(m, sendSelect);
    receiveSelect.parentNode.replaceChild(sendSelect, receiveSelect);
    m.parentNode.replaceChild(receiveSelect, m);
    [sendSelect, receiveSelect] = [receiveSelect, sendSelect];

    recalc(LAST);
  });
}

function logFiatState({
  mode,
  from,
  to,
  base,
  foreign,
  marketRate,
  uiRate,
  send,
  receive,
  commission
}) {
  console.group('%c[FIAT CALC]', 'color:#4CAF50;font-weight:bold');

  console.log('MODE:', mode);
  console.log('FROM (send):', from);
  console.log('TO (receive):', to);
  console.log('BASE:', base);
  console.log('FOREIGN:', foreign);

  console.group('RATES');
  console.log('Market (1 foreign → base):', marketRate);
  console.log('UI rate (±5%):', uiRate);
  console.groupEnd();

  console.group('AMOUNTS');
  console.log('SEND:', send);
  console.log('RECEIVE:', receive);
  console.log('COMMISSION:', commission);
  console.log('TOTAL SEND:', send + commission);
  console.groupEnd();

  console.groupEnd();
}

function getUiRate(from, to, base) {
  // определяем иностранную валюту
  const foreign = from === base ? to : from

  // рыночный курс: 1 foreign → base
  const market = convert(1, foreign, base)

  // направление операции
  const factor = from === base ? 1.05 : 0.95

  return market * factor
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
});