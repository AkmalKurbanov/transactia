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

let filtered = [];
let visibleCount = 45;
const STEP = 45;

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

  moreBtn.classList.toggle("show", visibleCount >= filtered.length);
}

/* ------------------ ЗАГРУЗКА ------------------ */
async function loadCountries() {
  try {
    const res = await fetch("js/entities.json");
    const data = await res.json();

    // тут ИЗМЕНЕНО
    filtered = data.entities.filter(c => NEEDED.includes(c.id));

    render();
  } catch (err) {
    console.error("Ошибка загрузки:", err);
  }
}

loadCountries();

/* ------------------ КНОПКА MORE ------------------ */
moreBtn.addEventListener("click", () => {
  if (visibleCount >= filtered.length) {
    visibleCount = STEP; // вернуть в начало
    render();
    countriesSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    visibleCount += STEP;
    render();
  }
});
