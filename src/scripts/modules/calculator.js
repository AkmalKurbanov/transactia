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

  function getBase() {
    return panel
      .querySelector('.cselect.is-disabled .cselect__selected')
      ?.dataset.currency
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

    const rate = getRate(from, to, base)
    const foreign = from === base ? to : from


    let send = getValue(sendInput)
    let receive = getValue(receiveInput)

    if (mode === 'send') {
      if (!send) {
        receiveInput.value = ''
        commissionEl.textContent = ''
        button.textContent = 'Перевести'
        LOCK = false
        return
      }
      receive = from === base ? send / rate : send * rate
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
      send = from === base ? receive * rate : receive / rate
      setValue(sendInput, send, 2)
    }

    // комиссия ВСЕГДА от суммы отправки в RUB
    const sendRub =
      from === base ? send : convert(send, from, base)

    const feeRub = calcCommissionRub(sendRub)
    const fee =
      from === base ? feeRub : convert(feeRub, base, from)

    commissionEl.textContent = `${format(fee, 2)} ${from}`
    rateEl.textContent = `1 ${foreign} = ${format(rate, 2)} ${base}`
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
    recalc(LAST)
  })
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
  const calc = panel.querySelector('.currency-transfer')
  if (!calc) return

  const sendInput = calc.querySelector('.js-crypto-send-amount')
  const receiveInput = calc.querySelector('.js-crypto-receive-amount')

  applyMoneyMask(sendInput)
  applyMoneyMask(receiveInput)

  const selects = calc.querySelectorAll('.cselect-js')
  const swapBtn = calc.querySelector('.currency-transfer__icon')

  let [sendSelect, receiveSelect] = selects

  const rateEl = panel.querySelector('.js-crypto-rate')
  const button = panel.querySelector('.js-crypto-button')

  let LOCK = false
  let LAST = 'send'

  function recalc(mode) {
    if (LOCK) return

    

    LOCK = true

    const from = getCurrency(sendSelect)
    const to = getCurrency(receiveSelect)

    if (!from || !to) {
      LOCK = false
      return
    }

    const rate = getCryptoRate(from, to)

    let send = getValue(sendInput)
    let receive = getValue(receiveInput)

    if (mode === 'send') {
      if (!send) {
        receiveInput.value = ''
        button.textContent = 'Перевести'
        LOCK = false
        return
      }
      receive = send * rate
      setValue(receiveInput, receive, 8)
    }

    if (mode === 'receive') {
      if (!receive) {
        sendInput.value = ''
        button.textContent = 'Перевести'
        LOCK = false
        return
      }
      send = receive / rate
      setValue(sendInput, send, 2)
    }

    function renderCryptoRate(rateEl, from, to, rate) {
      const fromCrypto = isCrypto(from)
      const toCrypto = isCrypto(to)
    
      // crypto → fiat
      if (fromCrypto && !toCrypto) {
        rateEl.textContent = `1 ${from} = ${format(rate, 2)} ${to}`
        return
      }
    
      // fiat → crypto
      if (!fromCrypto && toCrypto) {
        rateEl.textContent = `1 ${to} = ${format(1 / rate, 2)} ${from}`
        return
      }
    
      // crypto → crypto
      rateEl.textContent = `1 ${from} = ${format(rate, 8)} ${to}`
    }
    
    button.textContent = `Перевести ${format(send, 2)} ${from}`

    LOCK = false
    renderCryptoRate(from, to, rate)
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
    recalc(LAST)
  })
}


/**************************************************************
 * BOOT
 **************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  initFiat(document.querySelector('.tabs__panel[data-name="tab1"]'))
  initCrypto(document.querySelector('.tabs__panel[data-name="tab2"]'))
})
