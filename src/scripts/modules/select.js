const selects = document.querySelectorAll('.input--select');

selects.forEach(select => {
  const trigger = select.querySelector('.input__field');
  const input = select.querySelector('input');
  const options = select.querySelectorAll('.input__option');
  const selected = select.querySelector('.input__selected');


  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    select.classList.toggle('open');
  });


  options.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();

      const value = opt.getAttribute('data-value');

      input.value = value;
      selected.textContent = value;

      select.classList.remove('open');
    });
  });
});


document.addEventListener('click', () => {
  selects.forEach(s => s.classList.remove('open'));
});
