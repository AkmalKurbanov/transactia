// scripts/build-entities.mjs   ← нейтральное название
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Плагины остаются — они дают исходные данные
const countries = require('world-countries');
const iso = require('i18n-iso-countries');
const ru = require('i18n-iso-countries/langs/ru.json');

iso.registerLocale(ru);

// Итоговый файл
const DATA_FILE = 'src/pug/_data/entities.json';

// Путь к иконкам (флагам раньше)
const ICON_PATH = 'images/currencies/flags';

// Универсальный символ для значений
function getSymbol(code, locale = 'ru') {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(1);
    return parts.find(p => p.type === 'currency')?.value || code;
  } catch { return code; }
}

// Нейминг для значений
const valueNames = new Intl.DisplayNames(['ru'], { type: 'currency' });

// СОБИРАЕМ СПИСОК ОБЪЕКТОВ — НЕ СТРАН!
const list = countries.map(c => {
  const id = c.cca2; // был code
  const label = iso.getName(id, 'ru') || c.name?.common || id;

  const valuesRaw = Object.keys(c.currencies || {}); // был curr

  return {
    id,                     // вместо code
    label,                  // вместо name
    icon: `${ICON_PATH}/${id.toLowerCase()}.svg`,  // вместо flag
    values: valuesRaw.map(code => ({
      code,
      symbol: getSymbol(code),
      name: valueNames.of(code) || code
    })),
  };
}).filter(x => x.label)
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

// Пишем в JSON
let out = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    out = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } else {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
} catch { }

out.entities = list;  // вместо out.countries

fs.writeFileSync(DATA_FILE, JSON.stringify(out, null, 2), 'utf8');
console.log(`[entities] ${list.length} элементов -> ${DATA_FILE}`);
