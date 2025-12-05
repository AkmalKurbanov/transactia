document.addEventListener("click", (e) => {
  const trigger = e.target.closest('.footer__nav-trigger');
  if (!trigger) return;

  const column = trigger.closest('.footer__flex-column');
  const nav = column.querySelector('.footer__nav');

  nav.classList.toggle('is-open');
});
