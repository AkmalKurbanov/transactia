// stars-input.js
document.addEventListener('DOMContentLoaded', () => {
  const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

  function ensureHiddenInput(root) {
    const byId = root.dataset.inputId && document.getElementById(root.dataset.inputId);
    if (byId) return byId;

    const name = root.dataset.inputName || 'rating';
    let input = root.querySelector(`input[type="hidden"][name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      root.appendChild(input);
    }
    return input;
  }

  function ensureStars(root) {
    if (root.querySelector('.stars-input__item')) return; // уже отрисованы
    const max = Math.max(1, parseInt(root.dataset.max || '5', 10));
    root.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const item = document.createElement('div');
      item.className = 'stars-input__item';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.classList.add('stars-input__svg');

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bg.setAttribute('d', STAR_PATH);
      bg.classList.add('stars-input__bg');

      const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fill.setAttribute('d', STAR_PATH);
      fill.classList.add('stars-input__fill');

      svg.appendChild(bg);
      svg.appendChild(fill);
      item.appendChild(svg);
      root.appendChild(item);
    }
  }

  function paint(root, val) {
    const items = Array.from(root.querySelectorAll('.stars-input__item'));
    items.forEach((it, idx) => it.classList.toggle('is-active', idx < val));
  }

  function init(root) {
    if (!root.classList.contains('stars-input')) return;

    ensureStars(root);
    const input = ensureHiddenInput(root);

    const items = Array.from(root.querySelectorAll('.stars-input__item'));
    if (!items.length) return;

    // старт: сначала из input.value, потом из data-value
    let selected = Math.max(
      0,
      Math.min(items.length, Math.round(parseFloat(input.value || root.dataset.value || '0')))
    );
    input.value = String(selected);
    paint(root, selected);

    root.addEventListener('mousemove', (e) => {
      const it = e.target.closest('.stars-input__item');
      if (!it || !root.contains(it)) return;
      paint(root, items.indexOf(it) + 1);
    });

    root.addEventListener('mouseleave', () => paint(root, selected));

    root.addEventListener('click', (e) => {
      const it = e.target.closest('.stars-input__item');
      if (!it || !root.contains(it)) return;
      selected = items.indexOf(it) + 1;
      input.value = String(selected);
      root.dataset.value = String(selected);
      paint(root, selected);
      // чтобы формы/валидация подхватили
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  document.querySelectorAll('.stars-input').forEach(init);
});
