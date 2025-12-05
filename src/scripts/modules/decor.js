const elems = document.querySelectorAll('.hero__decor-item');

// каждому элементу задаём случайные коэффициенты движения + вращения
elems.forEach(el => {
  el.dataset.fx = (Math.random() * 50 - 25) / 100; // -0.2..0.2
  el.dataset.fy = (Math.random() * 50 - 25) / 100;
  el.dataset.fr = (Math.random() * 10 - 3) / 100; // -0.05..0.05 → плавный угол
});

// наблюдатель видимости
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    entry.target.classList.toggle('in-view', entry.isIntersecting);
  });
}, { threshold: 0.1 });

elems.forEach(el => observer.observe(el));

// scroll-эффект
window.addEventListener('scroll', () => {
  const s = window.scrollY;

  elems.forEach(el => {
    if (!el.classList.contains('in-view')) return;

    // ограничение движения
    const x = Math.max(Math.min(s * el.dataset.fx, 50), -25);
    const y = Math.max(Math.min(s * el.dataset.fy, 50), -25);

    // ограничение вращения (max ±6°)
    const r = Math.max(Math.min(s * el.dataset.fr, 6), -6);

    el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
  });
});
