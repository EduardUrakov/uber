const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Лёгкий параллакс фона от курсора (только точные указатели, не при reduced-motion)
if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * -14;
        const y = (e.clientY / window.innerHeight - 0.5) * -10;
        hero.style.setProperty('--px', x.toFixed(1) + 'px');
        hero.style.setProperty('--py', y.toFixed(1) + 'px');
    }, { passive: true });
}

// Мобильное меню
const burger = document.getElementById('nav-burger');
const links = document.getElementById('nav-links');
burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('nav__links--open', !open);
});
links.addEventListener('click', (e) => {
    if (e.target.matches('.nav__link')) {
        links.classList.remove('nav__links--open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

// Появление блоков при скролле
const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    }
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

// Форма (демо: без отправки на сервер)
const form = document.getElementById('apply-form');
const status = document.getElementById('apply-status');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    if (!name || !phone) {
        status.textContent = 'Заполните имя и телефон.';
        status.classList.add('apply__status--error');
        return;
    }
    status.classList.remove('apply__status--error');
    status.textContent = `Заявка принята (демо). ${name}, мы позвоним на ${phone}.`;
    form.reset();
});
