const avatar = document.querySelector('.avatar-js');
const profileControl = document.querySelector('.profile-control');
const closeBtn = document.querySelector('.profile-control__close');


avatar.addEventListener('click', () => {
  profileControl.classList.add('is-open');
});


closeBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // чтобы клик по кнопке не срабатывал как клик по .avatar-js
  profileControl.classList.remove('is-open');
});
