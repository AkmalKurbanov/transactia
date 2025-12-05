/**************************************************************
 * 1. ЗАГРУЗКА СТРАН
 **************************************************************/
async function loadCurrencies() {
  const dropdowns = document.querySelectorAll('.js-select-options');
  if (!dropdowns.length) return;

  const res = await fetch('./js/data.json');
  const { countries } = await res.json();
  const fragment = document.createDocumentFragment();

  countries.forEach(c => {
    if (!c.currencies?.length) return;

    const li = document.createElement('li');
    li.className = 'cselect__option';
    li.dataset.code = c.code;
    li.dataset.currencies = JSON.stringify(c.currencies);

    li.innerHTML = `
      <div class="cselect__option-left">
        <span class="cselect__img"><img src="./${c.flag}" alt="${c.name}" loading="lazy"></span>
        <span class="cselect__label">${c.name}</span>
      </div>
      <div class="cselect__option-right">
        <span>${c.currencies[0].code}</span>
        ${
          c.currencies[0].symbol &&
          c.currencies[0].symbol !== c.currencies[0].code
            ? `<span>${c.currencies[0].symbol}</span>`
            : ''
        }
      </div>
    `;

    fragment.appendChild(li);
  });

  dropdowns.forEach(drop => {
    const ul = drop.querySelector('ul');
    if (!ul) return;
    ul.innerHTML = '';
    ul.appendChild(fragment.cloneNode(true));
  });
}


/**************************************************************
 * 2. УТИЛИТЫ
 **************************************************************/
function markDisabledSelects() {
  document.querySelectorAll('.cselect-js').forEach(select => {
    const dropdown = select.querySelector('.cselect__dropdown.js-select-options');
    select.classList.toggle('is-disabled', !dropdown);
  });
}

function getCurrencies(option) {
  try {
    return JSON.parse(option.dataset.currencies || '[]');
  } catch {
    return [];
  }
}

function hasMultiple(option) {
  return getCurrencies(option).length > 1;
}


/**************************************************************
 * 3. ПЕРЕЗАПОЛНЕНИЕ SUBMENU
 **************************************************************/
function fillSubmenu(select, option) {
  const submenu = select.querySelector('.cselect__submenu');

  const countryName = option.querySelector('.cselect__label')?.textContent || '';
  const currencies = getCurrencies(option);

  submenu.dataset.countryCode = option.dataset.code;
  submenu.querySelector('.cselect__submenu-country').textContent = countryName;

  const list = submenu.querySelector('.cselect__submenu-list');
  list.innerHTML = currencies
    .map(
      c => `
      <div class="cselect__submenu-option" data-currency="${c.code}">
        <span>${c.name}</span>
        <span>${c.code}</span>
      </div>`
    )
    .join('');
}


/**************************************************************
 * 5. ПОКАЗАТЬ SUBMENU
 **************************************************************/
function showSubmenu(select, option) {
  fillSubmenu(select, option);
  const submenu = select.querySelector('.cselect__submenu');
  submenu.classList.add('show');
}


/**************************************************************
 * 6. СКРЫТЬ ВСЕ SUBMENU
 **************************************************************/
function hideSubmenus() {
  document.querySelectorAll('.cselect__submenu.show')
    .forEach(s => s.classList.remove('show'));
}


/**************************************************************
 * 7. ОБНОВЛЕНИЕ SELECTED ЭЛЕМЕНТА
 **************************************************************/
function renderSelected(select, option, forced = null) {
  const block = select.querySelector('.cselect__selected-left');
  if (!block) return;

  block.innerHTML = '';

  const img = option.querySelector('img')?.cloneNode(true);
  const wrap = document.createElement('span');
  wrap.className = 'cselect__img';
  if (img) wrap.appendChild(img);

  block.appendChild(wrap);

  const currencies = getCurrencies(option);
  const code = forced || currencies?.[0]?.code || '';

  const span = document.createElement('span');
  span.className = 'cselect__code';
  span.textContent = code;

  block.appendChild(span);
}


/**************************************************************
 * 8. CLICK HANDLER
 **************************************************************/
document.addEventListener('click', e => {
  const select = e.target.closest('.cselect-js');
  const submenu = e.target.closest('.cselect__submenu');

  // клик вне select — закрыть всё
  if (!select) {
    hideSubmenus();
    document.querySelectorAll('.cselect-js').forEach(s => s.classList.remove('open'));
    return;
  }

  // закрытие submenu
  if (e.target.closest('.cselect__submenu-close')) {
    hideSubmenus();
    return;
  }

  // выбор валюты
  const subOption = e.target.closest('.cselect__submenu-option');
  if (subOption) {
    const currency = subOption.dataset.currency;
    const code = submenu.dataset.countryCode;
    const countryOption = select.querySelector(`.cselect__option[data-code="${code}"]`);

    renderSelected(select, countryOption, currency);
    hideSubmenus();
    select.classList.remove('open');
    return;
  }

  // выбор страны
  const option = e.target.closest('.cselect__option');
  if (option) {
    if (hasMultiple(option)) {
      showSubmenu(select, option);
    } else {
      hideSubmenus();
      renderSelected(select, option);
      select.classList.remove('open');
    }
    return;
  }

  // открыть dropdown
  if (!e.target.closest('.js-select-options')) {
    select.classList.toggle('open');
    hideSubmenus();
  }
});


/**************************************************************
 * 9. ПОИСК
 **************************************************************/
function updateDropdownHeight(select) {
  const dd = select.querySelector('.cselect__dropdown.js-select-options');
  if (!dd) return;

  const ul = dd.querySelector('ul');
  const search = dd.querySelector('.cselect__search');

  const listHeight = ul.scrollHeight;
  const searchHeight = search ? search.offsetHeight : 0;

  dd.style.height = Math.max(searchHeight, listHeight + searchHeight) + 'px';

}


function initCountrySearch() {
  document.querySelectorAll('.cselect-js').forEach(select => {
    const dropdown = select.querySelector('.cselect__dropdown.js-select-options');
    if (!dropdown) return;

    const input = dropdown.querySelector('.cselect__search input');
    const ul = dropdown.querySelector('ul');
    if (!input || !ul) return;

    input.addEventListener('input', () => {
      const value = input.value.trim().toLowerCase();

      ul.querySelectorAll('.cselect__option').forEach(option => {
        const label = option.querySelector('.cselect__label')?.textContent.toLowerCase() || '';
        const code = option.dataset.code?.toLowerCase() || '';
        option.style.display = label.includes(value) || code.includes(value) ? '' : 'none';
      });

      updateDropdownHeight(select);
    });
  });
}


/**************************************************************
 * 10. ИНИЦИАЛИЗАЦИЯ
 **************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  loadCurrencies().then(() => {
    initCountrySearch();
    markDisabledSelects();
  });
});
/**************************************************************
 * 11. СИНХРОН ШИРИНЫ
 **************************************************************/
function syncCselectWidths() {
  document.querySelectorAll('.cselect-js').forEach(select => {
    const wrapper = select.closest('.input--with-select');
    if (!wrapper) return;

    const width = wrapper.getBoundingClientRect().width + 'px';

    const dd = select.querySelector('.cselect__dropdown.js-select-options');
    if (dd) dd.style.width = width;

    const submenu = select.querySelector('.cselect__submenu');
    if (submenu) submenu.style.width = width;
  });
}

window.addEventListener('load', syncCselectWidths);
window.addEventListener('resize', () => {
  syncCselectWidths();
});
document.addEventListener('click', () => {
  setTimeout(() => {
    syncCselectWidths();
  }, 0);
});
