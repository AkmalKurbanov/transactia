const countriesWrap = document.querySelector('.countries__wrap ul');
const moreBtn = document.querySelector('.more-btn');
const countriesSection = document.querySelector('.countries');

const NEEDED = [
  "AT","KZ","SV","AZ","KH","HK","DZ","CM","SA","AO","CA","MK","AD","KE","SN",
  "AG","CY","KN","AR","CN","RS","AM","CO","SG","AW","KM","SK","BS","CR","SI",
  "BD","CI","SR","BH","KW","US","BY","KG","SL","BZ","LV","TJ","BE","LS","TH",
  "BJ","LR","TZ","BG","LB","TG","BO","LT","TN","BW","LI","TR","BR","LU","UG",
  "BI","MR","UZ","BT","MG","UA","GB","MO","UY","HU","MW","FJ","VN","MY","PH",
  "GA","MT","FI","GY","MA","FR","GT","MX","HR","GN","MZ","TD","DE","MD","ME",
  "HN","MN","CZ","GR","NP","CL","GE","NE","CH","DK","NG","SE","CD","NL","LK",
  "DJ","NZ","EC","DM","NO","GQ","DO","AE","EE","EG","OM","ET","ZM","PA","ZA",
  "IL","PG","KR","IN","PE","JM","ID","PL","JP","JO","PT","IE","HT","IS","CG",
  "ES","RW","IT","RO"
];

const DESKTOP_STEP = 45;
const MOBILE_STEP = 11;
const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;

let filtered = [];
let visibleCount = IS_MOBILE ? MOBILE_STEP : DESKTOP_STEP;

/* ------------------ РЕНДЕР ------------------ */
function render() {
  countriesWrap.innerHTML = filtered
    .slice(0, visibleCount)
    .map(({ label, icon }) => `
      <li>
        <div class="country">
          <div class="country__flag">
            <img src="./${icon}" alt="${label}">
          </div>
          <div class="country__name">${label}</div>
        </div>
      </li>
    `)
    .join('');

  // кнопка только если есть что раскрывать
  moreBtn.classList.toggle('is-open', filtered.length > visibleCount);
  // состояние "Закрыть"
  moreBtn.classList.toggle('show', visibleCount >= filtered.length);
}

/* ------------------ ЗАГРУЗКА ------------------ */
async function loadCountries() {
  try {
    const res = await fetch('js/entities.json');
    const data = await res.json();
    filtered = data.entities.filter(c => NEEDED.includes(c.id));
    render();
  } catch (e) {
    console.error(e);
  }
}

loadCountries();

/* ------------------ КНОПКА MORE ------------------ */
moreBtn.addEventListener('click', () => {
  if (visibleCount >= filtered.length) {
    visibleCount = IS_MOBILE ? MOBILE_STEP : DESKTOP_STEP;
    render();
    countriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    visibleCount = filtered.length;
    render();
  }
});
