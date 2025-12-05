const description = document.querySelector('.decription');
const btn = document.querySelector('.decription .more-btn');
const more = document.querySelector('.decription__more');

let isActive = false;

if (description) {
  btn.onclick = () => {
    description.classList.toggle('show');
  }
}