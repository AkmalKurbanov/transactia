const countriesWrap = document.querySelector('.countries__wrap ul');
const moreBtn = document.querySelector('.more-btn');
const countriesSection = document.querySelector('.countries');

const needed = ["AT","KZ","SV","AZ","KH","HK","DZ","CM","SA","AO","CA","MK","AD","KE","SN",
"AG","CY","KN","AR","CN","RS","AM","CO","SG","AW","KM","SK","BS","CR","SI",
"BD","CI","SR","BH","KW","US","BY","KG","SL","BZ","LV","TJ","BE","LS","TH",
"BJ","LR","TZ","BG","LB","TG","BO","LT","TN","BW","LI","TR","BR","LU","UG",
"BI","MR","UZ","BT","MG","UA","GB","MO","UY","HU","MW","FJ","VN","MY","PH",
"GA","MT","FI","GY","MA","FR","GT","MX","HR","GN","MZ","TD","DE","MD","ME",
"HN","MN","CZ","GR","NP","CL","GE","NE","CH","DK","NG","SE","CD","NL","LK",
"DJ","NZ","EC","DM","NO","GQ","DO","AE","EE","EG","OM","ET","ZM","PA","ZA",
"IL","PG","KR","IN","PE","JM","ID","PL","JP","JO","PT","IE","HT","IS","CG",
"ES","RW","IT","RO"];

let allFiltered = [];
let visibleCount = 45;
const step = 45;


// РЕНДЕР
function renderCountries() {
  if (!countriesWrap) return; 
  countriesWrap.innerHTML = "";

  const slice = allFiltered.slice(0, visibleCount);

  slice.forEach(({ name, flag }) => {
    countriesWrap.innerHTML += `
      <li>
        <div class="country">
          <div class="country__flag">
            <img src="../${flag}" alt="${name}">
          </div>
          <div class="country__name">${name}</div>
        </div>
      </li>
    `;
  });

  if (visibleCount >= allFiltered.length) {
    moreBtn.classList.add("show");
  } else {
    moreBtn.classList.remove("show");
  }
}


const getCountries = async () => {
  try {
    const response = await fetch("js/data.json");
    const { countries } = await response.json();

    allFiltered = countries.filter(({ code }) => needed.includes(code));

    renderCountries();

  } catch (err) {
    console.error("Fetch error:", err);
  }
};

getCountries();


moreBtn.addEventListener("click", () => {
  if (visibleCount >= allFiltered.length) {
    visibleCount = 45;
    renderCountries();

    countriesSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } else {
    visibleCount += step;
    renderCountries();
  }
});


