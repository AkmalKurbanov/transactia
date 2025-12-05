// const countriesWrap = document.querySelector('.countries__wrap ul');
// const moreBtn = document.querySelector('.more-btn');
// const countriesSection = document.querySelector('.countries');

// let allCountries = [];
// let visibleCount = 100; 
// const step = 100;

// // РЕНДЕР
// function renderCountries() {
//   countriesWrap.innerHTML = "";

//   const slice = allCountries.slice(0, visibleCount);

//   slice.forEach(({ name, flag }) => {
//     countriesWrap.innerHTML += `
//       <li>
//         <div class="country">
//           <div class="country__flag">
//             <img src="../${flag}" alt="${name}">
//           </div>
//           <div class="country__name">${name}</div>
//         </div>
//       </li>
//     `;
//   });

//   if (visibleCount >= allCountries.length) {
//     moreBtn.classList.add("show");
//   } else {
//     moreBtn.classList.remove("show");
//   }
// }

// // ГРУЗИМ
// const getCountries = async () => {
//   try {
//     const response = await fetch("js/data.json");
//     const data = await response.json();

//     allCountries = data.countries;

//     renderCountries();

//   } catch (err) {
//     console.error("Fetch error:", err);
//   }
// };

// getCountries();

// // КНОПКА
// moreBtn.addEventListener("click", () => {
//   if (visibleCount >= allCountries.length) {
//     visibleCount = 100;
//     renderCountries();

//     countriesSection.scrollIntoView({
//       behavior: "smooth",
//       block: "start"
//     });

//   } else {
//     visibleCount += step;
//     renderCountries();
//   }
// });
