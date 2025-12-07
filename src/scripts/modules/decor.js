const wrapper = document.querySelector('.decor-wrapper');
const elems = document.querySelectorAll('.hero__decor-item');

// Настройки движения для разных экранов
const maxMove = window.innerWidth <= 991 ? 10 : 30; 
const minDuration = 3;
const maxDuration = 7;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function animateElem(el) {
    const x = random(-maxMove, maxMove);
    const y = random(-maxMove, maxMove);
    const duration = random(minDuration, maxDuration);

    el.style.transition = `transform ${duration}s ease-in-out`;
    el.style.transform = `translate(${x}px, ${y}px)`;

    setTimeout(() => animateElem(el), duration * 1000);
}

elems.forEach(el => animateElem(el));
