document.querySelectorAll('[data-modal]').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const name  = trigger.dataset.modal;
    const modal = document.querySelector(`.modal[data-modal-name="${name}"]`);

    if (!modal) return;

    modal.classList.add('open');
    document.documentElement.style.overflow = "hidden";
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  const close = modal.querySelector('.modal__close');

  close?.addEventListener('click', () => {
    modal.classList.remove('open');
    document.documentElement.style.overflow = "";
  });
});
