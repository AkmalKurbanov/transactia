document.querySelectorAll('.tabs-js').forEach(tabs => {
  const triggers = tabs.querySelectorAll('.tabs__btn');
  const panels   = tabs.querySelectorAll('.tabs__panel');

  if (!triggers.length || !panels.length) return;

 
  triggers[0].classList.add('is-active');
  panels[0].classList.add('is-active');

  triggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;

     
      triggers.forEach(t => t.classList.remove('is-active'));
      panels.forEach(p => p.classList.remove('is-active'));

    
      btn.classList.add('is-active');
      tabs.querySelector(`.tabs__panel[data-name="${name}"]`)
          ?.classList.add('is-active');
    });
  });
});