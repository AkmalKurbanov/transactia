const avatar = document.querySelector('.avatar-js');
const profileControl = document.querySelector('.profile-control');
const profileBlock = document.querySelector('.profile-control__block');
const closeBtn = document.querySelector('.profile-control__close');

avatar.addEventListener('click', (e) => {
  e.stopPropagation();
  profileControl.classList.add('is-open');
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileControl.classList.remove('is-open');
});

document.addEventListener('click', (e) => {
  const t = e.target;

  // Клик по аватару — НЕ закрываем
  if (avatar.contains(t)) return;

  // Клик внутри блока — НЕ закрываем
  if (profileBlock.contains(t)) return;

  // Все остальные клики — закрываем
  profileControl.classList.remove('is-open');
});
