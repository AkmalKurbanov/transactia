/**************************************************************
 * API
 **************************************************************/
const API_KEY = '22cc9d3ab02842c4b89b8546efdd9f91'
const API_URL = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${API_KEY}`

let RATES = {}

/**************************************************************
 * LOAD RATES
 **************************************************************/
fetch(API_URL)
  .then(r => r.json())
  .then(d => {
    RATES = d.rates || {}
  })

/**************************************************************
 * HELPERS
 **************************************************************/
function roundUp(v, d = 2) {
  const f = 10 ** d
  return Math.ceil(Number(v) * f) / f
}

function format(v, d = 2) {
  return roundUp(v, d).toLocaleString('ru-RU', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  })
}

function getValue(input) {
  return Number(input.value.replace(/\s/g, '').replace(',', '.')) || 0
}

function setValue(input, v, d = 2) {
  input.value = format(v, d)
}

function getCurrency(select) {
  return select?.querySelector('.cselect__code')?.textContent.trim()
}

function convert(amount, from, to) {
  if (!RATES[from] || !RATES[to]) return 0
  return amount * (Number(RATES[to]) / Number(RATES[from]))
}


/**************************************************************
 * MONEY INPUT MASK
 **************************************************************/
function applyMoneyMask(input) {
  input.addEventListener('input', () => {
    const caret = input.selectionStart

    // оставляем только цифры
    const raw = input.value.replace(/[^\d]/g, '')

    if (!raw) {
      input.value = ''
      return
    }

    const formatted = Number(raw).toLocaleString('ru-RU')

    input.value = formatted

    // ставим курсор в конец (самый стабильный вариант)
    input.setSelectionRange(input.value.length, input.value.length)
  })
}



/**************************************************************
 * RATE (+5% / -5%)
 **************************************************************/
function getRate(from, to, base) {
  const foreign = from === base ? to : from
  const market = convert(1, foreign, base)
  return market * (from === base ? 1.05 : 0.95)
}

/**************************************************************
 * COMMISSION (ТОЛЬКО РУБЛИ)
 **************************************************************/
function calcCommissionRub(sendAmountRub) {
  if (sendAmountRub < 5000) return 499
  return roundUp(sendAmountRub * 0.10, 2)
}


/**************************************************************
 * INIT FIAT
 **************************************************************/
function initFiat(panel) {
  const calc = panel.querySelector('.currency-transfer')
  if (!calc) return

  const sendInput = calc.querySelector('.js-fiat-send-amount')
  const receiveInput = calc.querySelector('.js-fiat-receive-amount')

  applyMoneyMask(sendInput)
  applyMoneyMask(receiveInput)
  const selects = calc.querySelectorAll('.cselect-js')
  const swapBtn = calc.querySelector('.currency-transfer__icon')

  let [sendSelect, receiveSelect] = selects

  const rateEl = panel.querySelector('.js-fiat-rate')
  const commissionEl = panel.querySelector('.js-fiat-commission')
  const button = panel.querySelector('.js-fiat-button')

  let LOCK = false
  let LAST = 'send'

  // Получаем базовую валюту (например, RUB)
  function getBase() {
    return panel
      .querySelector('.cselect.is-disabled .cselect__selected')
      ?.dataset.currency || 'RUB'
  }

  // Общая функция обновления текста курса
  // Всегда пишет: 1 [ИН. ВАЛЮТА] = [КУРС] [БАЗА]
  function renderRateText(from, to, base, rate) {
    if (!rate) return
    // foreign - это валюта, которая НЕ является базовой.
    // Если base=RUB, а пара RUB-EUR, то foreign=EUR.
    const foreign = from === base ? to : from
    rateEl.textContent = `1 ${foreign} = ${format(rate, 2)} ${base}`
  }

  // Функция для состояния "нет данных" (пустые поля)
  function showDefaultInfo(from, to, base) {
    const rate = getRate(from, to, base)

    // 1. Рисуем курс
    renderRateText(from, to, base, rate)

    // 2. Считаем минимальную комиссию (499 базовых единиц -> в валюту отправления)
    const MIN_FEE_BASE = 499
    const minFee = from === base ? MIN_FEE_BASE : convert(MIN_FEE_BASE, base, from)

    commissionEl.textContent = `${format(minFee, 2)} ${from}`
    button.textContent = 'Перевести'
  }

  function initDisplay() {
    // Ждем, пока загрузятся курсы API
    if (Object.keys(RATES).length === 0) {
      setTimeout(initDisplay, 100)
      return
    }

    const from = getCurrency(sendSelect)
    const to = getCurrency(receiveSelect)
    const base = getBase()

    if (!from || !to || !base) return

    showDefaultInfo(from, to, base)
  }

  function recalc(mode) {
    if (LOCK) return
    LOCK = true

    const from = getCurrency(sendSelect)
    const to = getCurrency(receiveSelect)
    const base = getBase()

    if (!from || !to || !base) {
      LOCK = false
      return
    }

    // Получаем курс (он уже содержит +5% или -5% в зависимости от направления)
    const rate = getRate(from, to, base)

    // 1. ВСЕГДА обновляем отображение курса
    renderRateText(from, to, base, rate)

    let send = getValue(sendInput)
    let receive = getValue(receiveInput)

    // Если поля пустые — показываем дефолтную инфу (мин. комиссия)
    if (mode === 'send' && !send) {
      receiveInput.value = ''
      showDefaultInfo(from, to, base)
      LOCK = false
      return
    }

    if (mode === 'receive' && !receive) {
      sendInput.value = ''
      showDefaultInfo(from, to, base)
      LOCK = false
      return
    }

    // 2. Расчет сумм (Математику НЕ меняем)
    if (mode === 'send') {
      // Если отправляем Базу (RUB), то делим. Если отправляем Валюту, то умножаем.
      receive = from === base ? send / rate : send * rate
      setValue(receiveInput, receive, 2)
    }

    if (mode === 'receive') {
      send = from === base ? receive * rate : receive / rate
      setValue(sendInput, send, 2)
    }

    // 3. Расчет комиссии (Считаем всегда от базовой суммы)
    const sendInBase = from === base ? send : convert(send, from, base)
    const feeInBase = calcCommissionRub(sendInBase) // вернет 499 или 10%
    const fee = from === base ? feeInBase : convert(feeInBase, base, from)

    commissionEl.textContent = `${format(fee, 2)} ${from}`
    button.textContent = `Перевести ${format(send + fee, 2)} ${from}`

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

  swapBtn.addEventListener('click', () => {
    const m = document.createComment('')
    sendSelect.parentNode.replaceChild(m, sendSelect)
    receiveSelect.parentNode.replaceChild(sendSelect, receiveSelect)
    m.parentNode.replaceChild(receiveSelect, m)
      ;[sendSelect, receiveSelect] = [receiveSelect, sendSelect]

    // При свапе обновляем курс и комиссию
    const sendVal = getValue(sendInput)
    if (!sendVal) {
      initDisplay()
    } else {
      recalc(LAST)
    }
  })

  // Слушаем событие смены валюты в селектах
  selects.forEach(select => {
    select.addEventListener('changeCurrency', () => {
      // Вызываем пересчет. 
      // Если в инпуте есть число — пересчитает суммы.
      // Если инпут пустой — пересчитает минимальную комиссию и курс под новую валюту.
      recalc(LAST);
    });
  });

  initDisplay()
}
/**************************************************************
 * CRYPTO CONFIG
 **************************************************************/
const CRYPTO = {
  USDT: true,
  BTC: true,
  ETH: true,
  TON: true,
  BNB: true,
  TRX: true,
}

function isCrypto(code) {
  return !!CRYPTO[code]
}


/**************************************************************
 * CRYPTO RATE (BASE = USD)
 **************************************************************/
function getCryptoRate(from, to) {
  if (!RATES[from] || !RATES[to]) return 0

  const market = Number(RATES[to]) / Number(RATES[from])

  const fromCrypto = isCrypto(from)
  const toCrypto = isCrypto(to)

  // crypto <-> crypto → чистый рынок
  if (fromCrypto && toCrypto) {
    return market
  }

  // crypto → fiat → МЫ ПРОДАЁМ крипту → курс хуже
  if (fromCrypto && !toCrypto) {
    return market * 0.95
  }

  // fiat → crypto → МЫ ПРОДАЁМ фиат → курс хуже
  if (!fromCrypto && toCrypto) {
    return market * 1.05
  }

  // fiat → fiat (на будущее)
  return market
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
  
  // Элементы вывода информации
  const rateEl = panel.querySelector('.js-crypto-rate');
  const commissionEl = panel.querySelector('.js-crypto-commission'); // Тот самый элемент комиссии
  const button = panel.querySelector('.js-crypto-button'); // Убедитесь, что класс в HTML именно такой

  let [sendSelect, receiveSelect] = selects;
  let LOCK = false;
  let LAST = 'send';

  applyMoneyMask(sendInput);
  applyMoneyMask(receiveInput);

  // Функция отображения курса: Всегда 1 КРИПТО = X ДРУГАЯ ВАЛЮТА
  function renderCryptoRateText(from, to, rate) {
    if (!rateEl || !rate) return;
    const fromCrypto = isCrypto(from);
    const toCrypto = isCrypto(to);

    if (!fromCrypto && toCrypto) {
      // fiat -> crypto: показываем цену 1 крипты в фиате
      rateEl.textContent = `1 ${to} = ${format(1 / rate, 2)} ${from}`;
    } else {
      // crypto -> fiat или crypto -> crypto
      rateEl.textContent = `1 ${from} = ${format(rate, isCrypto(to) ? 8 : 2)} ${to}`;
    }
  }

  function recalc(mode) {
    if (LOCK) return;
    LOCK = true;

    const from = getCurrency(sendSelect);
    const to = getCurrency(receiveSelect);
    if (!from || !to) { LOCK = false; return; }

    const rate = getCryptoRate(from, to);
    
    // Обновляем курс
    renderCryptoRateText(from, to, rate);

    // УСТАНАВЛИВАЕМ КОМИССИЮ 0 ВСЕГДА
    if (commissionEl) {
      commissionEl.textContent = `0 ${from}`;
    }

    let send = getValue(sendInput);
    let receive = getValue(receiveInput);

    // Если поля пустые
    if ((mode === 'send' && !send) || (mode === 'receive' && !receive)) {
      if (mode === 'send') receiveInput.value = '';
      else sendInput.value = '';
      if (button) button.textContent = 'Перевести';
      LOCK = false;
      return;
    }

    // Расчет сумм
    if (mode === 'send') {
      receive = send * rate;
      setValue(receiveInput, receive, isCrypto(to) ? 8 : 2);
    } else {
      send = receive / rate;
      setValue(sendInput, send, isCrypto(from) ? 8 : 2);
    }

    if (button) {
      button.textContent = `Перевести ${format(send, 2)} ${from}`;
    }

    LOCK = false;
  }

  // Слушатели ввода
  sendInput.addEventListener('input', () => { LAST = 'send'; recalc('send'); });
  receiveInput.addEventListener('input', () => { LAST = 'receive'; recalc('receive'); });

  // Слушатель смены валюты из select-curency.js
  selects.forEach(select => {
    select.addEventListener('changeCurrency', () => {
      recalc(LAST);
    });
  });

  swapBtn.addEventListener('click', () => {
    const m = document.createComment('');
    sendSelect.parentNode.replaceChild(m, sendSelect);
    receiveSelect.parentNode.replaceChild(sendSelect, receiveSelect);
    m.parentNode.replaceChild(receiveSelect, m);
    [sendSelect, receiveSelect] = [receiveSelect, sendSelect];
    recalc(LAST);
  });

  // Инициализация при загрузке
  function initDisplay() {
    if (Object.keys(RATES).length === 0) {
      setTimeout(initDisplay, 100);
      return;
    }
    recalc('send');
  }
  initDisplay();
}
/**************************************************************
 * BOOT
 **************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'))
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'))
})
