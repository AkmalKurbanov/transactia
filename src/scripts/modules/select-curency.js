/**************************************************************
 * 1. УНИВЕРСАЛЬНАЯ ЗАГРУЗКА ДАННЫХ ЧЕРЕЗ data-src
 **************************************************************/
async function loadOptions(select) {
  const src = select.dataset.src;  // ← ВАЖНО: путь берём отсюда
  if (!src) return;

  const dropdown = select.querySelector('.js-select-options');
  if (!dropdown) return;

  const ul = dropdown.querySelector('ul');
  if (!ul) return;

  const res = await fetch(src);
  const json = await res.json();

  // Универсальные форматы
  const items =
    json.items ||
    json.entities ||
    json.data ||
    json.list ||
    json.countries || // поддержка старого
    [];

  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const values = item.values || item.currencies || [];
    if (!values.length) return;

    const li = document.createElement('li');
    li.className = 'cselect__option';

    const id = item.id || item.code || '';
    const label = item.label || item.name || id;
    const icon = item.icon || item.flag || '';
    const defaultValue = values[0].code || id;

    li.dataset.code = id;
    li.dataset.values = JSON.stringify(values);

    li.innerHTML = `
      <div class="cselect__option-left">
        ${icon ? `<span class="cselect__img"><img src="${icon}" loading="lazy"></span>` : ''}
        <span class="cselect__label">${label}</span>
      </div>
      <div class="cselect__option-right">
        <span>${defaultValue}</span>
        ${
          values[0].symbol && values[0].symbol !== values[0].code
            ? `<span>${values[0].symbol}</span>`
            : ''
        }
      </div>
    `;

    fragment.appendChild(li);
  });

  ul.innerHTML = '';
  ul.appendChild(fragment);
}


/**************************************************************
 * 2. УТИЛИТЫ
 **************************************************************/
function getValues(option) {
  try {
    return JSON.parse(option.dataset.values || '[]');
  } catch { return []; }
}

function hasMultiple(option) {
  return getValues(option).length > 1;
}

function markDisabledSelects() {
  document.querySelectorAll('.cselect-js').forEach(select => {
    const dropdown = select.querySelector('.cselect__dropdown.js-select-options');
    select.classList.toggle('is-disabled', !dropdown);
  });
}


/**************************************************************
 * 3. SUBMENU
 **************************************************************/
function fillSubmenu(select, option) {
  const submenu = select.querySelector('.cselect__submenu');

  const label = option.querySelector('.cselect__label')?.textContent || '';
  const values = getValues(option);

  submenu.dataset.itemCode = option.dataset.code;
  submenu.querySelector('.cselect__submenu-country').textContent = label;

  const list = submenu.querySelector('.cselect__submenu-list');
  list.innerHTML = values
    .map(v => `
      <div class="cselect__submenu-option" data-value="${v.code}">
        <span>${v.name}</span>
        <span>${v.code}</span>
      </div>
    `)
    .join('');
}

function showSubmenu(select, option) {
  fillSubmenu(select, option);
  select.querySelector('.cselect__submenu').classList.add('show');
}

function hideSubmenus() {
  document.querySelectorAll('.cselect__submenu.show')
    .forEach(s => s.classList.remove('show'));
}


/**************************************************************
 * 4. SELECTED
 **************************************************************/
export function renderSelected(select, option, forced = null) {
  const block = select.querySelector('.cselect__selected-left');
  if (!block) return;

  block.innerHTML = '';

  const img = option.querySelector('img')?.cloneNode(true);
  const wrap = document.createElement('span');
  wrap.className = 'cselect__img';
  if (img) wrap.appendChild(img);
  block.appendChild(wrap);

  const values = getValues(option);
  const code =
    forced ||
    values?.[0]?.code ||
    option.dataset.code;

  const span = document.createElement('span');
  span.className = 'cselect__code';
  span.textContent = code;

  block.appendChild(span);
}


/**************************************************************
 * 5. CLICK HANDLER
 **************************************************************/
document.addEventListener('click', e => {
  const select = e.target.closest('.cselect-js');
  const submenu = e.target.closest('.cselect__submenu');

  if (!select) {
    hideSubmenus();
    document.querySelectorAll('.cselect-js').forEach(s => s.classList.remove('open'));
    return;
  }

  if (e.target.closest('.cselect__submenu-close')) {
    hideSubmenus();
    return;
  }

  const subOption = e.target.closest('.cselect__submenu-option');
  if (subOption) {
    const value = subOption.dataset.value;
    const code = submenu.dataset.itemCode;
    const parentOption = select.querySelector(`.cselect__option[data-code="${code}"]`);

    renderSelected(select, parentOption, value);
    hideSubmenus();
    select.classList.remove('open');
    return;
  }

  const option = e.target.closest('.cselect__option');
  if (option) {
    if (hasMultiple(option)) showSubmenu(select, option);
    else {
      hideSubmenus();
      renderSelected(select, option);
      select.classList.remove('open');
    }
    return;
  }

  // открыть
  if (!e.target.closest('.js-select-options')) {
    select.classList.toggle('open');
    hideSubmenus();
  }
});


/**************************************************************
 * 6. ПОИСК
 **************************************************************/
function initSearch() {
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
    });
  });
}


/**************************************************************
 * 7. ИНИЦИАЛИЗАЦИЯ
 **************************************************************/
document.addEventListener('DOMContentLoaded', async () => {
  const selects = document.querySelectorAll('.cselect-js');

  for (const select of selects) {
    await loadOptions(select);
  }

  initSearch();
  markDisabledSelects();
});


/**************************************************************
 * 8. СИНХРОН ШИРИНЫ
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
window.addEventListener('resize', syncCselectWidths);
document.addEventListener('click', () => setTimeout(syncCselectWidths, 0));
